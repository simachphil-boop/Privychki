import { Flame, ListChecks, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { fmtTime } from '../../lib/format'
import { useT, type Dict } from '../../lib/i18n'
import { navigate } from '../../lib/router'
import { habitStats, isDone, progressOf } from '../../lib/schedule'
import { useStore, useToday } from '../../store/store'
import type { DateKey, Habit, HabitLog } from '../../store/types'
import { toast, useUi } from '../../store/ui'
import { habitIcon } from '../../ui/icons'
import { CheckGlyph, ProgressRing, cx, tint } from '../../ui/kit'

/** "3 / 8 стаканов", "10 / 30 мин", "2 / 4" — or null for yes/no habits. */
export function habitValueText(h: Habit, e: HabitLog | undefined, t: Dict): string | null {
  switch (h.type) {
    case 'boolean':
      return null
    case 'numeric':
      return `${e?.value ?? 0} / ${h.target}${h.unit ? ` ${h.unit}` : ''}`
    case 'duration':
      return `${e?.value ?? 0} / ${h.target} ${t.common.min}`
    case 'checklist':
      return `${h.checklist.filter((i) => e?.items?.includes(i.id)).length} / ${h.checklist.length}`
  }
}

/** One-tap completion with the right behaviour for each habit type. */
export function useHabitCheck(habit: Habit, date: DateKey) {
  const t = useT()
  const today = useToday((s) => s.today)
  const entry = useStore((s) => s.logs[habit.id]?.[date])
  const setLog = useStore((s) => s.setLog)
  const toggleHabit = useStore((s) => s.toggleHabit)
  const openSheet = useUi((s) => s.openSheet)
  const done = isDone(habit, entry)
  const locked = date > today

  const press = () => {
    if (locked) return toast(t.habit.futureLocked)
    if (done) {
      setLog(habit.id, date, null)
      if (habit.type !== 'boolean')
        toast(t.habit.cleared, { label: t.common.undo, run: () => setLog(habit.id, date, entry ?? null) })
      return
    }
    navigator.vibrate?.(8)
    if (habit.type === 'checklist') openSheet({ type: 'log', habitId: habit.id, date })
    else if (habit.type === 'numeric' && habit.target <= 20) setLog(habit.id, date, { value: (entry?.value ?? 0) + 1 })
    else if (habit.type === 'numeric') openSheet({ type: 'log', habitId: habit.id, date })
    else toggleHabit(habit.id, date)
  }
  return { entry, done, locked, press, progress: progressOf(habit, entry) }
}

export function HabitCheck({ habit, date }: { habit: Habit; date: DateKey }) {
  const t = useT()
  const { done, locked, press, progress } = useHabitCheck(habit, date)
  const stepped = habit.type !== 'boolean'
  return (
    <button
      type="button"
      className={cx('hcheck', stepped && 'hcheck--ring', done && 'is-done', locked && 'is-locked')}
      style={tint(habit.color)}
      aria-pressed={done}
      aria-label={`${done ? t.habit.unmark : t.habit.mark}: ${habit.name}`}
      onClick={(e) => {
        e.stopPropagation()
        press()
      }}
    >
      {done ? (
        <CheckGlyph size={18} />
      ) : stepped ? (
        <ProgressRing value={progress} size={36} stroke={2.5}>
          {habit.type === 'checklist' ? <ListChecks size={15} aria-hidden /> : habit.type === 'numeric' ? <Plus size={16} aria-hidden /> : null}
        </ProgressRing>
      ) : null}
    </button>
  )
}

export function HabitRow({ habit, date }: { habit: Habit; date: DateKey }) {
  const t = useT()
  const today = useToday((s) => s.today)
  const mine = useStore((s) => s.logs[habit.id])
  const weekStart = useStore((s) => s.settings.weekStart)
  const timeFormat = useStore((s) => s.settings.timeFormat)
  const openSheet = useUi((s) => s.openSheet)
  const stats = useMemo(() => habitStats(habit, { [habit.id]: mine ?? {} }, today, weekStart), [habit, mine, today, weekStart])
  const entry = mine?.[date]
  const done = isDone(habit, entry)
  const Icon = habitIcon(habit.icon)
  const value = habitValueText(habit, entry, t)
  const meta = [value, t.cat[habit.category], habit.reminderTime && fmtTime(habit.reminderTime, timeFormat)].filter(Boolean)

  const open = () =>
    habit.type === 'boolean' ? navigate(`habits/${habit.id}`) : openSheet({ type: 'log', habitId: habit.id, date })

  return (
    <div className={cx('item', done && 'is-done')} style={tint(habit.color)}>
      <button type="button" className="item__body" onClick={open}>
        <span className="tile">
          <Icon size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="item__text">
          <span className="item__title">{habit.name}</span>
          <span className="item__meta num">
            <span className="item__notes item__notes--strong">{meta.join(' · ')}</span>
          </span>
        </span>
        {stats.current > 1 && (
          <span className="streak streak--trail num" title={t.habit.currentStreak(stats.unit)}>
            <Flame size={13} strokeWidth={2} aria-hidden />
            {stats.unit === 'day' ? stats.current : t.habit.streak(stats.current, stats.unit)}
          </span>
        )}
      </button>
      <HabitCheck habit={habit} date={date} />
    </div>
  )
}
