import type { AppData, DateKey, Lang } from '../store/types'
import { addDays, diffDays, startOfWeek } from './dates'
import { weekdayLabel } from './format'
import type { Dict } from './i18n'
import { habitStats } from './schedule'
import { buildDays, byWeekday, earliestDate, habitRows, taskDayparts, totalsOf, type DayPartKey } from './stats'

export interface Insight {
  id: string
  tone: 'up' | 'down' | 'neutral'
  text: string
}

/** Short observations derived from the user's own history. Nothing is shown without enough data. */
export function buildInsights(data: AppData, today: DateKey, t: Dict, lang: Lang): Insight[] {
  const out: Insight[] = []
  const ws = data.settings.weekStart
  const tracked = diffDays(today, earliestDate(data, today)) + 1

  // This week against the same days of last week.
  const weekStart = startOfWeek(today, ws)
  const span = diffDays(today, weekStart)
  const now = totalsOf(buildDays(data, weekStart, today, today))
  const before = totalsOf(buildDays(data, addDays(weekStart, -7), addDays(weekStart, -7 + span), today))
  if (before.habitDone + now.habitDone >= 3 && tracked > 7) {
    if (now.habitDone > before.habitDone) out.push({ id: 'week', tone: 'up', text: t.insight.weekUp(now.habitDone, before.habitDone) })
    else if (now.habitDone < before.habitDone) out.push({ id: 'week', tone: 'down', text: t.insight.weekDown(now.habitDone, before.habitDone) })
    else out.push({ id: 'week', tone: 'neutral', text: t.insight.weekSame(now.habitDone) })
  }

  const from30 = addDays(today, -29)
  const rows = habitRows(data, from30, today, today).filter((r) => r.due >= 5 && r.rate !== null)
  const stable = [...rows].sort((a, b) => b.rate! - a.rate! || b.done - a.done)[0]
  if (stable && stable.rate! >= 0.6) out.push({ id: 'stable', tone: 'up', text: t.insight.stable(stable.habit.name, Math.round(stable.rate! * 100)) })

  let streak: { name: string; n: number; unit: 'day' | 'week' | 'month' } | null = null
  for (const h of data.habits) {
    if (h.archivedAt) continue
    const s = habitStats(h, data.logs, today, ws)
    if (s.unit === 'day' && s.current >= 3 && (!streak || s.current > streak.n)) streak = { name: h.name, n: s.current, unit: s.unit }
  }
  if (streak && streak.name !== stable?.habit.name) out.push({ id: 'streak', tone: 'up', text: t.insight.streak(streak.name, streak.n) })

  const parts = taskDayparts(data, addDays(today, -89), today)
  const partTotal = parts.morning + parts.day + parts.evening + parts.night
  if (partTotal >= 5) {
    const top = (Object.keys(parts) as DayPartKey[]).sort((a, b) => parts[b] - parts[a])[0]
    if (parts[top] / partTotal >= 0.4) out.push({ id: 'daypart', tone: 'neutral', text: t.insight.daypart[top](Math.round((parts[top] / partTotal) * 100)) })
  }

  if (tracked >= 14) {
    const days = byWeekday(buildDays(data, addDays(today, -89), today, today), ws).filter((d) => d.due >= 4 && d.rate !== null)
    const best = [...days].sort((a, b) => b.rate! - a.rate!)[0]
    const worst = days[days.length - 1] && [...days].sort((a, b) => a.rate! - b.rate!)[0]
    if (best && worst && best.rate! - worst.rate! >= 0.1)
      out.push({ id: 'weekday', tone: 'neutral', text: t.insight.bestWeekday(weekdayLabel(best.weekday, lang, 'long'), Math.round(best.rate! * 100)) })
  }

  const skipped = [...rows].filter((r) => r.missed >= 3 && r.rate! < 0.5).sort((a, b) => b.missed - a.missed)[0]
  if (skipped) out.push({ id: 'skipped', tone: 'down', text: t.insight.skipped(skipped.habit.name, skipped.missed) })

  return out.slice(0, 4)
}
