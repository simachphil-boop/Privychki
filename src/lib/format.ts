import type { DateKey, Lang, TimeStr } from '../store/types'
import { fromKey } from './dates'

const locale = (lang: Lang) => (lang === 'ru' ? 'ru-RU' : 'en-US')

const cache = new Map<string, Intl.DateTimeFormat>()
const fmt = (lang: Lang, opts: Intl.DateTimeFormatOptions) => {
  const key = lang + JSON.stringify(opts)
  let f = cache.get(key)
  if (!f) cache.set(key, (f = new Intl.DateTimeFormat(locale(lang), opts)))
  return f
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export type DayStyle = 'full' | 'long' | 'medium' | 'short' | 'monthYear' | 'month' | 'monthShort' | 'weekday' | 'weekdayShort'

const STYLES: Record<DayStyle, Intl.DateTimeFormatOptions> = {
  full: { weekday: 'long', day: 'numeric', month: 'long' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  medium: { day: 'numeric', month: 'long' },
  short: { day: 'numeric', month: 'short' },
  monthYear: { month: 'long', year: 'numeric' },
  month: { month: 'long' },
  monthShort: { month: 'short' },
  weekday: { weekday: 'long' },
  weekdayShort: { weekday: 'short' },
}

export function fmtDay(k: DateKey, lang: Lang, style: DayStyle): string {
  let s = fmt(lang, STYLES[style]).format(fromKey(k))
  if (style === 'monthYear') s = s.replace(/\s*г\.$/, '')
  if (style === 'short' || style === 'monthShort') s = s.replace(/\.$/, '')
  return style === 'full' || style === 'monthYear' || style === 'month' || style === 'weekday' ? cap(s) : s
}

/** Weekday initials for index 0 (Sunday) … 6 (Saturday). */
export function weekdayLabel(weekday: number, lang: Lang, style: 'short' | 'narrow' | 'long' = 'short'): string {
  // 2023-01-01 was a Sunday.
  const s = fmt(lang, { weekday: style }).format(new Date(2023, 0, 1 + weekday))
  return style === 'long' ? cap(s) : lang === 'ru' ? cap(s) : s
}

export function fmtTime(t: TimeStr, timeFormat: '24' | '12'): string {
  if (timeFormat === '24') return t
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${m < 10 ? '0' : ''}${m} ${h < 12 ? 'AM' : 'PM'}`
}

export const fmtPct = (rate: number | null): string => (rate === null ? '—' : `${Math.round(rate * 100)}%`)

/** Russian plural form picker: plural(5, ['день', 'дня', 'дней']). */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b === 1) return forms[0]
  if (b >= 2 && b <= 4) return forms[1]
  return forms[2]
}
