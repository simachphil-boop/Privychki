import { getData } from '../store/store'
import { toast } from '../store/ui'
import { timeToMinutes, todayKey } from './dates'
import { fmtTime } from './format'
import { getT } from './i18n'
import { isNative, nativePermission, nativeTestNotification, type Permission } from './native'
import { doneOn, isDueOn } from './schedule'
import { reminderOccursOn } from './select'

const FIRED_KEY = 'dayflow:fired'
/** A reminder still fires if the app is opened up to this many minutes late. */
const GRACE_MIN = 15

export const notificationsSupported = (): boolean => typeof window !== 'undefined' && 'Notification' in window

export const permissionState = (): Permission => (notificationsSupported() ? Notification.permission : 'unsupported')

/** Current permission; in the app shell this asks the system, in a browser the Notification API. */
export const queryPermission = (): Promise<Permission> => (isNative ? nativePermission(false) : Promise.resolve(permissionState()))

export async function requestPermission(): Promise<Permission> {
  if (isNative) return nativePermission(true)
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

async function show(title: string, body: string, tag: string) {
  if (permissionState() !== 'granted') return
  const options: NotificationOptions = { body, tag, icon: './icon-192.png', badge: './icon-192.png' }
  try {
    // Mobile browsers only allow notifications through a service worker.
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    /* Delivery is best-effort; the in-app toast still appears. */
  }
}

interface Due {
  key: string
  title: string
  body: string
}

/** Everything whose time has come in the last few minutes. Uses the device's local time zone. */
export function collectDue(now = new Date()): Due[] {
  const data = getData()
  const n = data.settings.notifications
  if (!n.enabled) return []
  const t = getT()
  const today = todayKey()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const isNow = (time: string) => {
    const d = minutes - timeToMinutes(time)
    return d >= 0 && d < GRACE_MIN
  }
  const at = (time: string) => fmtTime(time, data.settings.timeFormat)
  const out: Due[] = []

  if (n.habits)
    for (const h of data.habits)
      if (h.reminderTime && isNow(h.reminderTime) && isDueOn(h, data.logs, today, data.settings.weekStart) && !doneOn(h, data.logs, today))
        out.push({ key: `h|${h.id}|${h.reminderTime}`, title: h.name, body: t.notify.habit(at(h.reminderTime)) })

  if (n.tasks)
    for (const task of data.tasks)
      if (task.remind && task.time && task.date === today && !task.done && !task.archivedAt && isNow(task.time))
        out.push({ key: `t|${task.id}|${task.time}`, title: task.title, body: t.notify.task(at(task.time)) })

  if (n.reminders)
    for (const r of data.reminders)
      if (r.enabled && reminderOccursOn(r, today) && isNow(r.time))
        out.push({ key: `r|${r.id}|${r.time}`, title: r.title, body: t.notify.reminder(at(r.time)) })

  return out
}

function readFired(today: string): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}')
    return raw.date === today && Array.isArray(raw.keys) ? new Set<string>(raw.keys) : new Set()
  } catch {
    return new Set()
  }
}

function tick() {
  const due = collectDue()
  if (!due.length) return
  const today = todayKey()
  const fired = readFired(today)
  for (const d of due) {
    if (fired.has(d.key)) continue
    fired.add(d.key)
    void show(d.title, d.body, d.key)
    if (document.visibilityState === 'visible') toast(`${d.title} · ${d.body}`)
  }
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify({ date: today, keys: [...fired] }))
  } catch {
    /* Storage full: reminders may repeat, which is better than being lost. */
  }
}

/** Checks for due reminders while the app is open. Returns a stop function. */
export function startReminderLoop(): () => void {
  // The app shell schedules real system notifications instead (see native.ts).
  if (isNative) return () => {}
  tick()
  const id = setInterval(tick, 20_000)
  const onVisible = () => document.visibilityState === 'visible' && tick()
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    clearInterval(id)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

export const sendTestNotification = () => {
  if (isNative) return void nativeTestNotification().catch(() => {})
  const t = getT()
  void show('Dayflow', t.notify.test, 'test')
}
