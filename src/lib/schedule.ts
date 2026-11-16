import type { DateKey, Habit, HabitLog, Logs } from '../store/types'
import { addDays, diffDays, endOfMonth, startOfMonth, startOfWeek, weekdayOf } from './dates'

/** Flexible habits have a quota per period instead of fixed days. */
export const isFlexible = (h: Habit): boolean => h.schedule.kind === 'perWeek' || h.schedule.kind === 'perMonth'

export const quotaOf = (h: Habit): number =>
  h.schedule.kind === 'perWeek' || h.schedule.kind === 'perMonth' ? Math.max(1, h.schedule.count) : 1

/** Whether the habit may be performed on this day according to its schedule. */
export function isScheduledOn(h: Habit, k: DateKey): boolean {
  if (k < h.startDate) return false
  const s = h.schedule
  switch (s.kind) {
    case 'daily':
    case 'perWeek':
    case 'perMonth':
      return true
    case 'weekdays':
      return s.days.includes(weekdayOf(k))
    case 'interval':
      return diffDays(k, h.startDate) % Math.max(1, s.every) === 0
  }
}

/** Completion of a single day, 0…1. */
export function progressOf(h: Habit, e: HabitLog | undefined): number {
  if (!e) return 0
  switch (h.type) {
    case 'boolean':
      return e.value >= 1 ? 1 : 0
    case 'numeric':
    case 'duration':
      return h.target > 0 ? Math.min(1, e.value / h.target) : e.value > 0 ? 1 : 0
    case 'checklist': {
      if (h.checklist.length === 0) return e.value >= 1 ? 1 : 0
      const ticked = h.checklist.filter((i) => e.items?.includes(i.id)).length
      return ticked / h.checklist.length
    }
  }
}

export const isDone = (h: Habit, e: HabitLog | undefined): boolean => progressOf(h, e) >= 1

export const doneOn = (h: Habit, logs: Logs, k: DateKey): boolean => isDone(h, logs[h.id]?.[k])

/** The log entry that marks the habit fully complete for a day. */
export function completeEntry(h: Habit): HabitLog {
  switch (h.type) {
    case 'boolean':
      return { value: 1 }
    case 'numeric':
    case 'duration':
      return { value: Math.max(1, h.target) }
    case 'checklist':
      return { value: 1, items: h.checklist.map((i) => i.id) }
  }
}

/** Week or month that contains `k`, for flexible habits. */
export function periodBounds(h: Habit, k: DateKey, weekStart: number): [DateKey, DateKey] {
  if (h.schedule.kind === 'perMonth') return [startOfMonth(k), endOfMonth(k)]
  const s = startOfWeek(k, weekStart)
  return [s, addDays(s, 6)]
}

/** Completed days within [from, to]. */
export function countDone(h: Habit, logs: Logs, from: DateKey, to: DateKey): number {
  const mine = logs[h.id]
  if (!mine) return 0
  let n = 0
  for (const k in mine) if (k >= from && k <= to && isDone(h, mine[k])) n++
  return n
}

/**
 * Whether the habit belongs on the list for day `k`.
 * Flexible habits stay on the list until the period quota is met.
 */
export function isDueOn(h: Habit, logs: Logs, k: DateKey, weekStart: number): boolean {
  if (h.archivedAt || !isScheduledOn(h, k)) return false
  if (!isFlexible(h)) return true
  if (doneOn(h, logs, k)) return true
  const [from] = periodBounds(h, k, weekStart)
  return countDone(h, logs, from, addDays(k, -1)) < quotaOf(h)
}

/**
 * How a day counts towards statistics.
 * Today's unfinished habits are not counted as misses yet; a flexible habit's
 * shortfall is charged to the last day of its period.
 */
export function dayLoad(
  h: Habit,
  logs: Logs,
  k: DateKey,
  today: DateKey,
  weekStart: number,
): { due: number; done: number } {
  if (k < h.startDate || k > today) return { due: 0, done: 0 }
  const done = doneOn(h, logs, k) ? 1 : 0
  if (isFlexible(h)) {
    const [from, to] = periodBounds(h, k, weekStart)
    const missed = k === to && k < today ? Math.max(0, quotaOf(h) - countDone(h, logs, from, to)) : 0
    return { due: done + missed, done }
  }
  if (k === today || !isScheduledOn(h, k)) return { due: done, done }
  return { due: 1, done }
}

export interface HabitStats {
  current: number
  best: number
  total: number
  /** Share of scheduled occasions that were completed, 0…1; null without history. */
  rate: number | null
  /** What a streak is measured in. */
  unit: 'day' | 'week' | 'month'
}

export function habitStats(h: Habit, logs: Logs, today: DateKey, weekStart: number): HabitStats {
  const mine = logs[h.id] ?? {}
  let total = 0
  for (const k in mine) if (isDone(h, mine[k])) total++

  let run = 0
  let best = 0
  let hit = 0
  let occasions = 0

  if (isFlexible(h)) {
    const unit = h.schedule.kind === 'perMonth' ? 'month' : 'week'
    const quota = quotaOf(h)
    const [, lastEnd] = periodBounds(h, today, weekStart)
    let [from, to] = periodBounds(h, h.startDate, weekStart)
    while (from <= today) {
      const n = countDone(h, logs, from, to)
      const isCurrent = to === lastEnd
      if (n >= quota) {
        run++
        best = Math.max(best, run)
      } else if (!isCurrent) run = 0
      if (!isCurrent || n >= quota) {
        hit += Math.min(n, quota)
        occasions += quota
      } else if (occasions === 0 && n > 0) {
        hit += n
        occasions += quota
      }
      ;[from, to] = periodBounds(h, addDays(to, 1), weekStart)
    }
    return { current: run, best, total, rate: occasions ? hit / occasions : null, unit }
  }

  for (let k = h.startDate; k <= today; k = addDays(k, 1)) {
    if (!isScheduledOn(h, k)) continue
    const done = isDone(h, mine[k])
    if (done) {
      run++
      hit++
      occasions++
      best = Math.max(best, run)
    } else if (k !== today) {
      run = 0
      occasions++
    }
  }
  return { current: run, best, total, rate: occasions ? hit / occasions : null, unit: 'day' }
}
