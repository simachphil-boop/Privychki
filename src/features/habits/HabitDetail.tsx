import { ChevronLeft, ChevronRight, Pencil, Repeat } from 'lucide-react'
import { useMemo, useState } from 'react'
import { addDays, addMonths, monthGrid, startOfMonth, startOfWeek } from '../../lib/dates'
import { fmtDay, fmtPct, fmtTime, weekdayLabel } from '../../lib/format'
import { useLang, useT } from '../../lib/i18n'
import { navigate } from '../../lib/router'
import { countDone, habitStats, isFlexible, isScheduledOn, progressOf } from '../../lib/schedule'
import { useStore, useToday } from '../../store/store'
import { toast, useUi } from '../../store/ui'
import { habitIcon } from '../../ui/icons'
import { Empty, IconButton, PageHeader, ProgressBar, SectionHead, cx, tint } from '../../ui/kit'
import { HabitCheck, habitValueText } from '../day/HabitRow'
import { BarChart } from '../stats/charts'
import { scheduleText } from './Habits'

export function HabitDetail({ id }: { id: string }) {
  const t = useT()
  const lang = useLang()
  const today = useToday((s) => s.today)
  const habit = useStore((s) => s.habits.find((h) => h.id === id))
  const mine = useStore((s) => s.logs[id])
  const settings = useStore((s) => s.settings)
  const toggleHabit = useStore((s) => s.toggleHabit)
  const openSheet = useUi((s) => s.openSheet)
  const [month, setMonth] = useState(() => startOfMonth(today))
  const ws = settings.weekStart
  const logs = useMemo(() => ({ [id]: mine ?? {} }), [id, mine])
  const stats = useMemo(() => (habit ? habitStats(habit, logs, today, ws) : null), [habit, logs, today, ws])
  const weeks = useMemo(() => {
    if (!habit) return []
    const start = startOfWeek(today, ws)
    return Array.from({ length: 12 }, (_, i) => {
      const from = addDays(start, (i - 11) * 7)
      return { key: from, label: fmtDay(from, lang, 'short'), value: countDone(habit, logs, from, addDays(from, 6)) }
    })
  }, [habit, logs, today, ws, lang])

  if (!habit || !stats) {
    return (
      <main className="page">
        <PageHeader title={t.habit.notFound} back="habits" backLabel={t.nav.habits} />
        <Empty icon={Repeat} title={t.habit.notFound} text={t.habit.notFoundText} />
      </main>
    )
  }

  const Icon = habitIcon(habit.icon)
  const todayEntry = mine?.[today]
  const dueToday = isScheduledOn(habit, today) && !habit.archivedAt
  const meta = [t.cat[habit.category], scheduleText(habit, t, lang, ws), habit.reminderTime && fmtTime(habit.reminderTime, settings.timeFormat)].filter(Boolean)

  const pressDay = (k: string) => {
    if (k > today) return toast(t.habit.futureLocked)
    if (k < habit.startDate) return toast(t.habit.beforeStart)
    if (habit.type === 'boolean') toggleHabit(habit.id, k)
    else openSheet({ type: 'log', habitId: habit.id, date: k })
  }

  return (
    <main className="page" style={tint(habit.color)}>
      <PageHeader
        title={habit.name}
        back="habits"
        backLabel={t.nav.habits}
        actions={<IconButton label={t.common.edit} icon={Pencil} size={18} onClick={() => openSheet({ type: 'habit', id: habit.id })} />}
      />
      <div className="detail-meta">
        <span className="tile">
          <Icon size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <p className="detail-meta__line">{meta.join(' · ')}</p>
          {habit.description && <p className="note">{habit.description}</p>}
          {habit.archivedAt && <p className="badge">{t.archive.inArchive}</p>}
        </div>
      </div>

      {dueToday && (
        <div className="group group--spaced">
          <div className="item">
            <div className="item__body item__body--static">
              <span className="item__text">
                <span className="item__title">{t.common.today}</span>
                <span className="item__meta num">{habitValueText(habit, todayEntry, t) ?? (progressOf(habit, todayEntry) >= 1 ? t.habit.statusDone : t.habit.statusOpen)}</span>
              </span>
            </div>
            <HabitCheck habit={habit} date={today} />
          </div>
        </div>
      )}

      <section className="section">
        <div className="figures">
          <div className="figure">
            <span className="figure__value num">{stats.current}</span>
            <span className="figure__label">{t.habit.currentStreak(stats.unit)}</span>
          </div>
          <div className="figure">
            <span className="figure__value num">{stats.best}</span>
            <span className="figure__label">{t.habit.bestStreak(stats.unit)}</span>
          </div>
          <div className="figure">
            <span className="figure__value num">{stats.total}</span>
            <span className="figure__label">{t.habit.total}</span>
          </div>
          <div className="figure">
            <span className="figure__value num">{fmtPct(stats.rate)}</span>
            <span className="figure__label">{t.habit.regularity}</span>
          </div>
        </div>
        {habit.goalCount && (
          <div className="goal-line">
            <div className="goal-line__head">
              <span>{t.habit.goal}</span>
              <span className="num">{t.habit.goalProgress(Math.min(stats.total, habit.goalCount), habit.goalCount)}</span>
            </div>
            <ProgressBar value={stats.total / habit.goalCount} />
          </div>
        )}
      </section>

      <section className="section">
        <SectionHead title={t.habit.history}>
          <IconButton label={t.cal.prev} icon={ChevronLeft} size={18} onClick={() => setMonth(addMonths(month, -1))} />
          <span className="month-label">{fmtDay(month, lang, 'monthYear')}</span>
          <IconButton label={t.cal.next} icon={ChevronRight} size={18} disabled={month >= startOfMonth(today)} onClick={() => setMonth(addMonths(month, 1))} />
        </SectionHead>
        <div className="group hist">
          <div className="hist__grid hist__grid--head">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i}>{weekdayLabel((i + ws) % 7, lang, 'short')}</span>
            ))}
          </div>
          <div className="hist__grid">
            {monthGrid(month, ws).map((k) => {
              const outside = k.slice(0, 7) !== month.slice(0, 7)
              const p = progressOf(habit, mine?.[k])
              const scheduled = isScheduledOn(habit, k) && !isFlexible(habit)
              return (
                <button
                  key={k}
                  type="button"
                  disabled={outside}
                  className={cx('hist__day', outside && 'is-outside', p >= 1 ? 'is-done' : p > 0 ? 'is-partial' : scheduled && k < today ? 'is-missed' : k > today || !scheduled ? 'is-idle' : '', k === today && 'is-today')}
                  aria-label={`${fmtDay(k, lang, 'medium')}${p >= 1 ? ` — ${t.habit.statusDone}` : ''}`}
                  aria-pressed={p >= 1}
                  onClick={() => pressDay(k)}
                >
                  <span className="num">{Number(k.slice(8))}</span>
                </button>
              )
            })}
          </div>
        </div>
        <p className="note hist__hint">{t.habit.historyHint}</p>
      </section>

      <section className="section">
        <SectionHead title={t.habit.byWeek} />
        <div className="group chart-card">
          <BarChart data={weeks} format={(v) => t.habit.completions(v)} labelEvery={3} />
        </div>
      </section>
      <button type="button" className="link link--center" onClick={() => navigate('stats')}>{t.habit.allStats}</button>
    </main>
  )
}
