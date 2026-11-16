import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { addDays, addMonths, monthGrid, startOfMonth, weekKeys, weekdayOf } from '../../lib/dates'
import { fmtDay, weekdayLabel } from '../../lib/format'
import { useLang, useT } from '../../lib/i18n'
import { doneOn, isDueOn, progressOf } from '../../lib/schedule'
import { dayProgress, remindersOn, tasksOn } from '../../lib/select'
import { useStore, useToday } from '../../store/store'
import type { DateKey, Habit } from '../../store/types'
import { toast, useUi } from '../../store/ui'
import { habitIcon } from '../../ui/icons'
import { CheckGlyph, IconButton, PageHeader, ProgressRing, SectionHead, Segmented, cx, tint } from '../../ui/kit'
import { DayAgenda } from '../day/DayAgenda'

type Mode = 'month' | 'week'

interface DayMark {
  /** Habit completion 0…1, null when no habits were due or the day is in the future. */
  habits: number | null
  tasks: number
  tasksOpen: number
  reminders: number
}

function HabitCell({ habit, date }: { habit: Habit; date: DateKey }) {
  const t = useT()
  const lang = useLang()
  const today = useToday((s) => s.today)
  const entry = useStore((s) => s.logs[habit.id]?.[date])
  const logs = useStore((s) => s.logs)
  const weekStart = useStore((s) => s.settings.weekStart)
  const toggleHabit = useStore((s) => s.toggleHabit)
  const openSheet = useUi((s) => s.openSheet)
  const p = progressOf(habit, entry)
  const due = isDueOn(habit, logs, date, weekStart)
  if (!due && p === 0) return <span className="matrix__cell is-off" />
  return (
    <button
      type="button"
      className={cx('matrix__cell', p >= 1 ? 'is-done' : p > 0 && 'is-partial', date > today && 'is-future')}
      aria-pressed={p >= 1}
      aria-label={`${habit.name}, ${fmtDay(date, lang, 'medium')}`}
      onClick={() => {
        if (date > today) return toast(t.habit.futureLocked)
        if (habit.type === 'boolean') toggleHabit(habit.id, date)
        else openSheet({ type: 'log', habitId: habit.id, date })
      }}
    >
      {p >= 1 && <CheckGlyph size={12} />}
    </button>
  )
}

export function Calendar() {
  const t = useT()
  const lang = useLang()
  const today = useToday((s) => s.today)
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const tasks = useStore((s) => s.tasks)
  const reminders = useStore((s) => s.reminders)
  const settings = useStore((s) => s.settings)
  const [mode, setMode] = useState<Mode>('month')
  const [date, setDate] = useState(today)
  const ws = settings.weekStart
  const setFocusDate = useUi((s) => s.setFocusDate)
  useEffect(() => {
    setFocusDate(date)
    return () => setFocusDate(null)
  }, [date, setFocusDate])

  const keys = useMemo(() => (mode === 'month' ? monthGrid(date, ws) : weekKeys(date, ws)), [mode, date, ws])
  const marks = useMemo(() => {
    const map = new Map<DateKey, DayMark>()
    for (const k of keys) {
      const p = dayProgress({ habits, logs, tasks, settings }, k)
      const dayTasks = tasksOn(tasks, k)
      map.set(k, {
        habits: k <= today && p.habitsTotal > 0 ? p.habitsDone / p.habitsTotal : null,
        tasks: dayTasks.length,
        tasksOpen: dayTasks.filter((x) => !x.done).length,
        // Daily reminders would mark every single day, so only occasional ones are shown.
        reminders: remindersOn(reminders, k).filter((r) => r.enabled && (r.repeat === 'none' || r.repeat === 'weekly')).length,
      })
    }
    return map
  }, [keys, habits, logs, tasks, reminders, settings, today])

  const weekHabits = useMemo(
    () => (mode === 'week' ? habits.filter((h) => !h.archivedAt && keys.some((k) => isDueOn(h, logs, k, ws) || doneOn(h, logs, k))) : []),
    [mode, habits, logs, keys, ws],
  )

  const step = (dir: 1 | -1) => setDate(mode === 'month' ? addMonths(date, dir) : addDays(date, dir * 7))
  const title = mode === 'month' ? fmtDay(date, lang, 'monthYear') : `${fmtDay(keys[0], lang, 'short')} – ${fmtDay(keys[6], lang, 'short')}`
  const inMonth = (k: DateKey) => mode === 'week' || k.slice(0, 7) === date.slice(0, 7)

  return (
    <main className="page">
      <PageHeader
        title={title}
        eyebrow={t.nav.calendar}
        actions={
          <>
            {(mode === 'month' ? startOfMonth(date) !== startOfMonth(today) : !keys.includes(today)) || date !== today ? (
              <button type="button" className="link" onClick={() => setDate(today)}>{t.common.today}</button>
            ) : null}
            <IconButton label={t.cal.prev} icon={ChevronLeft} onClick={() => step(-1)} />
            <IconButton label={t.cal.next} icon={ChevronRight} onClick={() => step(1)} />
          </>
        }
      />
      <Segmented<Mode> label={t.cal.mode} value={mode} onChange={setMode} options={[{ value: 'month', label: t.cal.month }, { value: 'week', label: t.cal.week }]} />

      <div className="cal">
        <div className="cal__grid cal__grid--head" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i}>{weekdayLabel((i + ws) % 7, lang, 'short')}</span>
          ))}
        </div>
        <div className="cal__grid">
          {keys.map((k) => {
            const m = marks.get(k)!
            return (
              <button
                key={k}
                type="button"
                className={cx('cal__day', k === date && 'is-selected', k === today && 'is-today', !inMonth(k) && 'is-outside')}
                aria-pressed={k === date}
                aria-label={fmtDay(k, lang, 'full')}
                onClick={() => setDate(k)}
              >
                <ProgressRing value={m.habits ?? 0} size={36} stroke={2.5} className={cx(m.habits === null && 'ring--bare')}>
                  <span className="cal__num num">{Number(k.slice(8))}</span>
                </ProgressRing>
                <span className="cal__marks">
                  {m.tasks > 0 && <i className={cx('mark mark--task', m.tasksOpen === 0 && 'is-done')} />}
                  {m.reminders > 0 && <i className="mark mark--reminder" />}
                </span>
              </button>
            )
          })}
        </div>
        <p className="legend">
          <span><i className="mark mark--ring" />{t.cal.legendHabits}</span>
          <span><i className="mark mark--task" />{t.cal.legendTasks}</span>
          <span><i className="mark mark--task is-done" />{t.cal.legendTasksDone}</span>
          <span><i className="mark mark--reminder" />{t.cal.legendReminders}</span>
        </p>
      </div>

      {mode === 'week' && weekHabits.length > 0 && (
        <section className="section">
          <SectionHead title={t.cal.weekHabits} />
          <div className="group matrix">
            {weekHabits.map((h) => {
              const Icon = habitIcon(h.icon)
              return (
                <div key={h.id} className="matrix__row" style={tint(h.color)}>
                  <span className="matrix__name">
                    <Icon size={15} strokeWidth={1.75} aria-hidden />
                    <span>{h.name}</span>
                  </span>
                  <span className="matrix__cells">
                    {keys.map((k) => (
                      <HabitCell key={k} habit={h} date={k} />
                    ))}
                  </span>
                </div>
              )
            })}
            <div className="matrix__row matrix__row--head" aria-hidden>
              <span className="matrix__name" />
              <span className="matrix__cells">
                {keys.map((k) => (
                  <span key={k} className={cx(k === today && 'is-today')}>{weekdayLabel(weekdayOf(k), lang, 'narrow')}</span>
                ))}
              </span>
            </div>
          </div>
        </section>
      )}

      <h2 className="day-title">
        {fmtDay(date, lang, 'full')}
        {date === today && <span className="badge">{t.common.today}</span>}
      </h2>
      <DayAgenda date={date} />
    </main>
  )
}
