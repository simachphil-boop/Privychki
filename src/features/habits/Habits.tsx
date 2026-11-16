import { Flame, Plus, Repeat } from 'lucide-react'
import { useMemo, useState } from 'react'
import { addDays, rangeKeys } from '../../lib/dates'
import { weekdayLabel } from '../../lib/format'
import { useLang, useT, type Dict } from '../../lib/i18n'
import { navigate } from '../../lib/router'
import { doneOn, habitStats, isFlexible, isScheduledOn } from '../../lib/schedule'
import { useStore, useToday } from '../../store/store'
import type { CategoryId, Habit, Lang } from '../../store/types'
import { useUi } from '../../store/ui'
import { habitIcon } from '../../ui/icons'
import { Button, Chip, Empty, PageHeader, Segmented, cx, tint } from '../../ui/kit'
import { Goals } from '../goals/Goals'

export function scheduleText(h: Habit, t: Dict, lang: Lang, weekStart: number): string {
  const s = h.schedule
  switch (s.kind) {
    case 'daily':
      return t.habit.kinds.daily
    case 'weekdays':
      return s.days.length === 7
        ? t.habit.kinds.daily
        : [...s.days].sort((a, b) => ((a - weekStart + 7) % 7) - ((b - weekStart + 7) % 7)).map((d) => weekdayLabel(d, lang, 'short')).join(', ')
    case 'perWeek':
      return `${s.count} ${t.habit.timesPerWeek(s.count)}`
    case 'perMonth':
      return `${s.count} ${t.habit.timesPerMonth(s.count)}`
    case 'interval':
      return `${t.habit.every} ${s.every} ${t.habit.everyNDays(s.every)}`
  }
}

function HabitListRow({ habit }: { habit: Habit }) {
  const t = useT()
  const lang = useLang()
  const today = useToday((s) => s.today)
  const mine = useStore((s) => s.logs[habit.id])
  const weekStart = useStore((s) => s.settings.weekStart)
  const logs = useMemo(() => ({ [habit.id]: mine ?? {} }), [habit.id, mine])
  const stats = useMemo(() => habitStats(habit, logs, today, weekStart), [habit, logs, today, weekStart])
  const Icon = habitIcon(habit.icon)
  const days = rangeKeys(addDays(today, -6), today)

  return (
    <button type="button" className="item item--link" style={tint(habit.color)} onClick={() => navigate(`habits/${habit.id}`)}>
      <span className="tile">
        <Icon size={18} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="item__text">
        <span className="item__title">{habit.name}</span>
        <span className="item__meta num">
          {scheduleText(habit, t, lang, weekStart)}
          {stats.current > 0 && (
            <span className="streak">
              <Flame size={12} strokeWidth={2} aria-hidden />
              {t.habit.streak(stats.current, stats.unit)}
            </span>
          )}
        </span>
      </span>
      <span className="pips" aria-label={t.habit.last7}>
        {days.map((k) => (
          <i key={k} className={cx('pip', doneOn(habit, logs, k) ? 'is-done' : isScheduledOn(habit, k) && !isFlexible(habit) ? 'is-due' : 'is-off')} />
        ))}
      </span>
    </button>
  )
}

export function Habits({ tab }: { tab: 'habits' | 'goals' }) {
  const t = useT()
  const habits = useStore((s) => s.habits)
  const openSheet = useUi((s) => s.openSheet)
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const active = useMemo(() => habits.filter((h) => !h.archivedAt), [habits])
  const categories = useMemo(() => [...new Set(active.map((h) => h.category))], [active])
  const shown = category === 'all' || !categories.includes(category) ? active : active.filter((h) => h.category === category)

  return (
    <main className="page">
      <PageHeader title={tab === 'habits' ? t.nav.habits : t.goal.plural} eyebrow={tab === 'habits' ? t.habits.count(active.length) : t.goal.eyebrow} />
      <Segmented label={t.nav.habits} value={tab} onChange={(v) => navigate(v, true)} options={[{ value: 'habits', label: t.nav.habits }, { value: 'goals', label: t.goal.plural }]} />

      {tab === 'goals' ? (
        <Goals />
      ) : active.length === 0 ? (
        <div className="section">
          <Empty icon={Repeat} title={t.habits.emptyTitle} text={t.habits.emptyText}>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => openSheet({ type: 'create', kind: 'habit' })}>{t.day.addHabit}</Button>
          </Empty>
        </div>
      ) : (
        <>
          {categories.length > 1 && (
            <div className="chips chips--scroll filter-row">
              <Chip selected={category === 'all'} onClick={() => setCategory('all')}>{t.common.all}</Chip>
              {categories.map((c) => (
                <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>{t.cat[c]}</Chip>
              ))}
            </div>
          )}
          <div className={cx('group', categories.length <= 1 && 'group--spaced')}>
            {shown.map((h) => (
              <HabitListRow key={h.id} habit={h} />
            ))}
          </div>
          <p className="legend">
            <span><i className="pip is-done" />{t.habits.legendDone}</span>
            <span><i className="pip is-due" />{t.habits.legendMissed}</span>
            <span><i className="pip is-off" />{t.habits.legendOff}</span>
          </p>
        </>
      )}
    </main>
  )
}
