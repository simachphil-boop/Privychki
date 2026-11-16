import { useSyncExternalStore } from 'react'

export type TabId = 'today' | 'habits' | 'calendar' | 'stats' | 'profile'

export type Route =
  | { name: TabId }
  | { name: 'goals' }
  | { name: 'habit'; id: string }
  | { name: 'goal'; id: string }
  | { name: 'archive' }
  | { name: 'search' }

const TABS: TabId[] = ['today', 'habits', 'calendar', 'stats', 'profile']

export function parseRoute(hash: string): Route {
  const [a, b] = hash.replace(/^#\/?/, '').split('/')
  if (a === 'habits' && b) return { name: 'habit', id: b }
  if (a === 'goals' && b) return { name: 'goal', id: b }
  if (a === 'goals' || a === 'archive' || a === 'search') return { name: a }
  return { name: (TABS as string[]).includes(a) ? (a as TabId) : 'today' }
}

/** Which bottom tab a route belongs to. */
export function tabOf(r: Route): TabId {
  switch (r.name) {
    case 'habit':
    case 'goal':
    case 'goals':
      return 'habits'
    case 'archive':
      return 'profile'
    case 'search':
      return 'today'
    default:
      return r.name
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export const useHash = (): string => useSyncExternalStore(subscribe, () => window.location.hash)

let depth = 0

export const navigate = (path: string, replace = false) => {
  const target = `#/${path}`
  if (window.location.hash === target) return
  if (replace) {
    history.replaceState(null, '', target)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    depth++
    window.location.hash = target
  }
}

/** Goes back when we navigated here in-app, otherwise to a sensible parent. */
export const goBack = (fallback: string) => {
  if (depth > 0) {
    depth--
    history.back()
  } else navigate(fallback, true)
}
