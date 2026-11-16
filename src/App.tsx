import { CalendarDays, ChartNoAxesColumn, Plus, Repeat, Sun, User, type LucideIcon } from 'lucide-react'
import { Component, useEffect, type ReactNode } from 'react'
import { Calendar } from './features/calendar/Calendar'
import { SheetHost } from './features/forms/SheetHost'
import { GoalDetail } from './features/goals/GoalDetail'
import { HabitDetail } from './features/habits/HabitDetail'
import { Habits } from './features/habits/Habits'
import { Onboarding } from './features/onboarding/Onboarding'
import { Archive } from './features/profile/Archive'
import { Profile } from './features/profile/Profile'
import { Search } from './features/search/Search'
import { Stats } from './features/stats/Stats'
import { Today } from './features/today/Today'
import { saveBackup } from './lib/backup'
import { getT, useT } from './lib/i18n'
import { startReminderLoop } from './lib/notifications'
import { navigate, parseRoute, tabOf, useHash, type Route, type TabId } from './lib/router'
import { getData, useStore } from './store/store'
import { useUi, type CreateKind } from './store/ui'
import { Button, cx } from './ui/kit'
import { ConfirmHost, Toasts } from './ui/Overlays'

const TABS: { id: TabId; icon: LucideIcon }[] = [
  { id: 'today', icon: Sun },
  { id: 'habits', icon: Repeat },
  { id: 'calendar', icon: CalendarDays },
  { id: 'stats', icon: ChartNoAxesColumn },
  { id: 'profile', icon: User },
]

/** Applies the theme to <html> and follows the system setting when asked to. */
function useTheme() {
  const pref = useStore((s) => s.settings.theme)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const root = document.documentElement
    const apply = () => {
      const theme = pref === 'system' ? (media.matches ? 'dark' : 'light') : pref
      if (root.dataset.theme === theme) return
      root.classList.add('theme-switching')
      root.dataset.theme = theme
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#131312' : '#f5f3ee')
      setTimeout(() => root.classList.remove('theme-switching'), 280)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [pref])
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'today':
      return <Today />
    case 'habits':
      return <Habits tab="habits" />
    case 'goals':
      return <Habits tab="goals" />
    case 'habit':
      return <HabitDetail key={route.id} id={route.id} />
    case 'goal':
      return <GoalDetail key={route.id} id={route.id} />
    case 'calendar':
      return <Calendar />
    case 'stats':
      return <Stats />
    case 'profile':
      return <Profile />
    case 'archive':
      return <Archive />
    case 'search':
      return <Search />
  }
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error(error)
  }
  render() {
    if (!this.state.failed) return this.props.children
    const t = getT()
    return (
      <main className="onb">
        <div className="onb__inner">
          <div className="onb__step">
            <h1 className="onb__title">{t.error.title}</h1>
            <p className="onb__text">{t.error.text}</p>
            <div className="onb__actions">
              <Button variant="primary" block onClick={() => window.location.reload()}>{t.error.reload}</Button>
            </div>
          </div>
        </div>
      </main>
    )
  }
}

function Shell() {
  const t = useT()
  const hash = useHash()
  const route = parseRoute(hash)
  const tab = tabOf(route)
  const openSheet = useUi((s) => s.openSheet)
  const focusDate = useUi((s) => s.focusDate)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [hash])
  useEffect(() => startReminderLoop(), [])
  useEffect(() => {
    saveBackup(getData())
  }, [])

  const createKind: CreateKind = route.name === 'habits' ? 'habit' : route.name === 'goals' || route.name === 'goal' ? 'goal' : 'task'
  const showFab = route.name !== 'search' && route.name !== 'archive' && route.name !== 'profile'

  return (
    <div className="app">
      <nav className="tabbar" aria-label={t.nav.label}>
        <span className="brand">Dayflow</span>
        <div className="tabbar__inner">
          {TABS.map(({ id, icon: Icon }) => (
            <button key={id} type="button" className={cx('tab', tab === id && 'is-on')} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}>
              <Icon size={22} strokeWidth={tab === id ? 2 : 1.6} aria-hidden />
              <span>{t.nav[id]}</span>
            </button>
          ))}
        </div>
      </nav>
      <Screen route={route} />
      {showFab && (
        <button type="button" className="fab" aria-label={t.create.title} onClick={() => openSheet({ type: 'create', kind: createKind, date: focusDate ?? undefined, goalId: route.name === 'goal' ? route.id : undefined })}>
          <Plus size={24} strokeWidth={2} aria-hidden />
          <span className="fab__label">{t.create.title}</span>
        </button>
      )}
    </div>
  )
}

export function App() {
  const lang = useStore((s) => s.settings.lang)
  const onboarded = useStore((s) => s.settings.onboarded)
  useTheme()
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <ErrorBoundary>
      {onboarded ? <Shell /> : <Onboarding />}
      <SheetHost />
      <ConfirmHost />
      <Toasts />
    </ErrorBoundary>
  )
}
