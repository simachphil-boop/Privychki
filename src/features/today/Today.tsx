import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { weekKeys, weekdayOf } from '../../lib/dates'
import { fmtDay, weekdayLabel } from '../../lib/format'
import { useLang, useT } from '../../lib/i18n'
import { navigate } from '../../lib/router'
import { dayProgress } from '../../lib/select'
import { useStore, useToday } from '../../store/store'
import type { DateKey } from '../../store/types'
import { useUi } from '../../store/ui'
import { Avatar, IconButton, ProgressBar, ProgressRing, cx } from '../../ui/kit'
import { DayAgenda } from '../day/DayAgenda'

function useDayProgress(date: DateKey) {
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const tasks = useStore((s) => s.tasks)
  const settings = useStore((s) => s.settings)
  return useMemo(() => dayProgress({ habits, logs, tasks, settings }, date), [habits, logs, tasks, settings, date])
}

function WeekDay({ date, selected, onSelect }: { date: DateKey; selected: boolean; onSelect: () => void }) {
  const lang = useLang()
  const today = useToday((s) => s.today)
  const p = useDayProgress(date)
  return (
    <button type="button" className={cx('wday', selected && 'is-selected', date === today && 'is-today')} aria-pressed={selected} aria-label={fmtDay(date, lang, 'full')} onClick={onSelect}>
      <span className="wday__name">{weekdayLabel(weekdayOf(date), lang, 'short')}</span>
      <span className="wday__num num">{Number(date.slice(8))}</span>
      <span className="wday__bar">{p.rate !== null && date <= today && <span style={{ transform: `scaleX(${p.rate})` }} />}</span>
    </button>
  )
}

export function Today() {
  const t = useT()
  const lang = useLang()
  const today = useToday((s) => s.today)
  const name = useStore((s) => s.settings.name)
  const weekStart = useStore((s) => s.settings.weekStart)
  const [date, setDate] = useState(today)
  useEffect(() => {
    setDate(today)
  }, [today])
  const p = useDayProgress(date)
  const setFocusDate = useUi((s) => s.setFocusDate)
  useEffect(() => {
    setFocusDate(date)
    return () => setFocusDate(null)
  }, [date, setFocusDate])
  const isToday = date === today

  const hour = new Date().getHours()
  const greeting = t.today.greeting[hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'day' : 'evening']
  const left = p.habitsTotal - p.habitsDone + (p.tasksTotal - p.tasksDone)
  const status = p.rate === null ? t.today.nothingPlanned : left === 0 ? t.today.allDone : t.today.left(p.habitsTotal - p.habitsDone, p.tasksTotal - p.tasksDone)

  return (
    <main className="page">
      <header className="page-header">
        <div className="page-header__bar">
          {isToday ? (
            <span className="page-header__eyebrow">{fmtDay(today, lang, 'full')}</span>
          ) : (
            <button type="button" className="link" onClick={() => setDate(today)}>{t.today.backToToday}</button>
          )}
          <div className="page-header__actions">
            <IconButton label={t.search.title} icon={Search} onClick={() => navigate('search')} />
            <button type="button" className="avatar-btn" aria-label={t.nav.profile} onClick={() => navigate('profile')}>
              <Avatar size={32} />
            </button>
          </div>
        </div>
        <h1 className="page-header__title">{isToday ? (name ? `${greeting}, ${name}` : greeting) : fmtDay(date, lang, 'full')}</h1>
        <p className="page-header__status">{status}</p>
      </header>

      <nav className="wstrip" aria-label={t.today.week}>
        {weekKeys(date, weekStart).map((k) => (
          <WeekDay key={k} date={k} selected={k === date} onSelect={() => setDate(k)} />
        ))}
      </nav>

      <section className="overview" aria-label={t.today.overview}>
        <ProgressRing value={p.rate ?? 0} size={84} stroke={7}>
          <span className="overview__pct num">{p.rate === null ? '—' : Math.round(p.rate * 100)}{p.rate !== null && <small>%</small>}</span>
        </ProgressRing>
        <div className="overview__stats">
          <div className="overview__stat">
            <span className="overview__label">{t.day.habits}</span>
            <span className="overview__value num">{p.habitsDone}<i>/{p.habitsTotal}</i></span>
            <ProgressBar value={p.habitsTotal ? p.habitsDone / p.habitsTotal : 0} />
          </div>
          <div className="overview__stat">
            <span className="overview__label">{t.day.tasks}</span>
            <span className="overview__value num">{p.tasksDone}<i>/{p.tasksTotal}</i></span>
            <ProgressBar value={p.tasksTotal ? p.tasksDone / p.tasksTotal : 0} />
          </div>
        </div>
      </section>

      <DayAgenda date={date} />
    </main>
  )
}
