import type { DateKey, TimeStr } from '../store/types'

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)

export const toKey = (d: Date): DateKey => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromKey = (k: DateKey): Date => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = (): DateKey => toKey(new Date())

export const addDays = (k: DateKey, n: number): DateKey => {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export const addMonths = (k: DateKey, n: number): DateKey => {
  const d = fromKey(k)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  d.setDate(Math.min(day, daysInMonth(toKey(d))))
  return toKey(d)
}

/** a − b in whole days. Rounded, so DST shifts do not matter. */
export const diffDays = (a: DateKey, b: DateKey): number =>
  Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86_400_000)

export const weekdayOf = (k: DateKey): number => fromKey(k).getDay()

export const startOfWeek = (k: DateKey, weekStart: number): DateKey =>
  addDays(k, -((weekdayOf(k) - weekStart + 7) % 7))

export const startOfMonth = (k: DateKey): DateKey => `${k.slice(0, 8)}01`

export const daysInMonth = (k: DateKey): number => {
  const [y, m] = k.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export const endOfMonth = (k: DateKey): DateKey => `${k.slice(0, 8)}${pad(daysInMonth(k))}`

/** Inclusive list of days from a to b. */
export const rangeKeys = (a: DateKey, b: DateKey): DateKey[] => {
  const out: DateKey[] = []
  for (let k = a; k <= b; k = addDays(k, 1)) out.push(k)
  return out
}

export const weekKeys = (k: DateKey, weekStart: number): DateKey[] => {
  const s = startOfWeek(k, weekStart)
  return rangeKeys(s, addDays(s, 6))
}

/** Six-row-max month grid, padded with neighbouring months' days. */
export const monthGrid = (k: DateKey, weekStart: number): DateKey[] => {
  const first = startOfWeek(startOfMonth(k), weekStart)
  const last = addDays(startOfWeek(endOfMonth(k), weekStart), 6)
  return rangeKeys(first, last)
}

export const nowTime = (): TimeStr => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const timeToMinutes = (t: TimeStr): number => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export type DayPart = 'morning' | 'day' | 'evening' | 'none'

export const dayPartOf = (t: TimeStr | null): DayPart => {
  if (!t) return 'none'
  const m = timeToMinutes(t)
  if (m < 12 * 60) return 'morning'
  if (m < 17 * 60) return 'day'
  return 'evening'
}

export const isValidKey = (k: unknown): k is DateKey =>
  typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && toKey(fromKey(k)) === k

export const isValidTime = (t: unknown): t is TimeStr =>
  typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)

/** The next full hour, as a sensible default for new reminders. */
export const nextHour = (): TimeStr => `${pad((new Date().getHours() + 1) % 24)}:00`
