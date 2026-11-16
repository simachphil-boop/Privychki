import type { AppData, DateKey, Habit } from '../store/types'
import { addDays, addMonths, endOfMonth, fromKey, rangeKeys, startOfMonth, startOfWeek, toKey, weekdayOf } from './dates'
import { dayLoad } from './schedule'

export type Period = '7' | '30' | '90' | 'all'

export interface DayStat {
  date: DateKey
  habitDue: number
  habitDone: number
  taskTotal: number
  taskDone: number
}

export const doneOf = (d: DayStat) => d.habitDone + d.taskDone
export const dueOf = (d: DayStat) => d.habitDue + d.taskTotal
export const rateOf = (done: number, due: number): number | null => (due > 0 ? done / due : null)

/** The first day anything was tracked. */
export function earliestDate(data: AppData, today: DateKey): DateKey {
  let min = today
  for (const h of data.habits) if (h.startDate < min) min = h.startDate
  for (const id in data.logs) for (const k in data.logs[id]) if (k < min) min = k
  for (const t of data.tasks) {
    if (t.date && t.date < min) min = t.date
    if (t.doneAt) {
      const k = toKey(new Date(t.doneAt))
      if (k < min) min = k
    }
  }
  return min
}

export function periodRange(period: Period, data: AppData, today: DateKey): [DateKey, DateKey] {
  if (period === 'all') return [earliestDate(data, today), today]
  return [addDays(today, -(Number(period) - 1)), today]
}

/** Per-day totals for [from, to]. Days after today are empty. */
export function buildDays(data: AppData, from: DateKey, to: DateKey, today: DateKey): DayStat[] {
  const ws = data.settings.weekStart
  const map = new Map<DateKey, DayStat>()
  for (const date of rangeKeys(from, to)) {
    const d: DayStat = { date, habitDue: 0, habitDone: 0, taskTotal: 0, taskDone: 0 }
    if (date <= today)
      for (const h of data.habits) {
        const l = dayLoad(h, data.logs, date, today, ws)
        d.habitDue += l.due
        d.habitDone += l.done
      }
    map.set(date, d)
  }
  for (const t of data.tasks) {
    // A dated task counts on its day; an undated one on the day it was finished.
    const k = t.date ?? (t.doneAt ? toKey(new Date(t.doneAt)) : null)
    const d = k ? map.get(k) : undefined
    if (!d || d.date > today) continue
    // Like habits, today's open tasks are not misses yet.
    if (t.done) {
      d.taskDone++
      d.taskTotal++
    } else if (d.date < today) d.taskTotal++
  }
  return [...map.values()]
}

export interface Totals {
  habitDone: number
  habitDue: number
  taskDone: number
  taskTotal: number
  rate: number | null
  habitRate: number | null
  taskRate: number | null
}

export function totalsOf(days: DayStat[]): Totals {
  const t = { habitDone: 0, habitDue: 0, taskDone: 0, taskTotal: 0 }
  for (const d of days) {
    t.habitDone += d.habitDone
    t.habitDue += d.habitDue
    t.taskDone += d.taskDone
    t.taskTotal += d.taskTotal
  }
  return {
    ...t,
    rate: rateOf(t.habitDone + t.taskDone, t.habitDue + t.taskTotal),
    habitRate: rateOf(t.habitDone, t.habitDue),
    taskRate: rateOf(t.taskDone, t.taskTotal),
  }
}

export interface Bucket {
  /** First day of the bucket. */
  from: DateKey
  to: DateKey
  done: number
  due: number
  rate: number | null
}

export type Grain = 'day' | 'week' | 'month'

export const grainFor = (dayCount: number): Grain => (dayCount <= 45 ? 'day' : dayCount <= 200 ? 'week' : 'month')

/** Groups days so a chart never has to draw hundreds of points. */
export function bucketize(days: DayStat[], grain: Grain, weekStart: number): Bucket[] {
  const out: Bucket[] = []
  const keyOf = (k: DateKey) => (grain === 'day' ? k : grain === 'week' ? startOfWeek(k, weekStart) : startOfMonth(k))
  let cur: Bucket | null = null
  let curKey = ''
  for (const d of days) {
    const key = keyOf(d.date)
    if (!cur || key !== curKey) {
      cur = { from: d.date, to: d.date, done: 0, due: 0, rate: null }
      curKey = key
      out.push(cur)
    }
    cur.to = d.date
    cur.done += doneOf(d)
    cur.due += dueOf(d)
    cur.rate = rateOf(cur.done, cur.due)
  }
  return out
}

export interface WeekdayStat {
  weekday: number
  done: number
  due: number
  rate: number | null
}

/** Totals per weekday, ordered from the user's first day of week. */
export function byWeekday(days: DayStat[], weekStart: number): WeekdayStat[] {
  const acc = Array.from({ length: 7 }, (_, weekday) => ({ weekday, done: 0, due: 0 }))
  for (const d of days) {
    const w = weekdayOf(d.date)
    acc[w].done += doneOf(d)
    acc[w].due += dueOf(d)
  }
  return Array.from({ length: 7 }, (_, i) => acc[(i + weekStart) % 7]).map((x) => ({ ...x, rate: rateOf(x.done, x.due) }))
}

/** Calendar months ending with the current one; never earlier than the first tracked day. */
export function byMonth(data: AppData, today: DateKey, count: number): Bucket[] {
  const first = startOfMonth(earliestDate(data, today))
  let from = startOfMonth(addMonths(startOfMonth(today), -(count - 1)))
  if (from < first) from = first
  return bucketize(buildDays(data, from, endOfMonth(today), today), 'month', 0).map((b) => ({
    ...b,
    from: startOfMonth(b.from),
  }))
}

export interface HabitRow {
  habit: Habit
  done: number
  due: number
  missed: number
  rate: number | null
  /** Completion per cell for the consistency strip; null = nothing was due. */
  cells: (number | null)[]
}

export function habitRows(data: AppData, from: DateKey, to: DateKey, today: DateKey, maxCells = 30): HabitRow[] {
  const ws = data.settings.weekStart
  const keys = rangeKeys(from, to)
  const per = Math.ceil(keys.length / maxCells)
  return data.habits
    .filter((h) => !h.archivedAt && h.startDate <= to)
    .map((habit) => {
      let done = 0
      let due = 0
      const cells: (number | null)[] = []
      for (let i = 0; i < keys.length; i += per) {
        let cd = 0
        let cu = 0
        for (const k of keys.slice(i, i + per)) {
          const l = dayLoad(habit, data.logs, k, today, ws)
          cd += l.done
          cu += l.due
        }
        done += cd
        due += cu
        cells.push(cu > 0 ? cd / cu : null)
      }
      return { habit, done, due, missed: due - done, rate: rateOf(done, due), cells }
    })
}

export interface HeatCell {
  date: DateKey
  count: number
  future: boolean
}

/** Whole weeks ending with the current one, column by column. */
export function heatmap(data: AppData, today: DateKey, weeks: number): { cells: HeatCell[]; max: number } {
  const ws = data.settings.weekStart
  const from = addDays(startOfWeek(today, ws), -(weeks - 1) * 7)
  const to = addDays(startOfWeek(today, ws), 6)
  const days = buildDays(data, from, to, today)
  let max = 0
  const cells = days.map((d) => {
    const count = doneOf(d)
    if (count > max) max = count
    return { date: d.date, count, future: d.date > today }
  })
  return { cells, max }
}

export type DayPartKey = 'morning' | 'day' | 'evening' | 'night'

/** When tasks actually get finished, by the hour they were ticked off. */
export function taskDayparts(data: AppData, from: DateKey, to: DateKey): Record<DayPartKey, number> {
  const out: Record<DayPartKey, number> = { morning: 0, day: 0, evening: 0, night: 0 }
  for (const t of data.tasks) {
    if (!t.doneAt) continue
    const at = new Date(t.doneAt)
    const k = toKey(at)
    if (k < from || k > to) continue
    const h = at.getHours()
    out[h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'day' : h >= 17 && h < 23 ? 'evening' : 'night']++
  }
  return out
}

export function bestDay(days: DayStat[]): DayStat | null {
  let best: DayStat | null = null
  for (const d of days) if (doneOf(d) > 0 && (!best || doneOf(d) > doneOf(best))) best = d
  return best
}

export const monthOf = (k: DateKey) => fromKey(k).getMonth()
