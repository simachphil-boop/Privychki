import { App as NativeApp } from '@capacitor/app'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Share } from '@capacitor/share'
import { getData, useStore } from '../store/store'
import { useUi } from '../store/ui'
import { addDays, fromKey, todayKey } from './dates'
import { fmtTime } from './format'
import { getT } from './i18n'
import { doneOn, isDueOn, isScheduledOn } from './schedule'
import { reminderOccursOn } from './select'

/** True inside the Android/iOS app shell, false in a browser. */
export const isNative = Capacitor.isNativePlatform()

/** How far ahead system notifications are scheduled; refreshed on every launch and data change. */
const HORIZON_DAYS = 14
const MAX_SCHEDULED = 60

export type Permission = 'granted' | 'denied' | 'default' | 'unsupported'

export async function nativePermission(request: boolean): Promise<Permission> {
  try {
    const result = request ? await LocalNotifications.requestPermissions() : await LocalNotifications.checkPermissions()
    return result.display === 'granted' ? 'granted' : result.display === 'denied' ? 'denied' : 'default'
  } catch {
    return 'unsupported'
  }
}

interface Planned {
  at: Date
  title: string
  body: string
}

/** Every reminder that falls within the horizon, earliest first. */
function plan(): Planned[] {
  const data = getData()
  const n = data.settings.notifications
  if (!n.enabled) return []
  const t = getT()
  const today = todayKey()
  const now = Date.now()
  const out: Planned[] = []
  const add = (day: string, time: string, title: string, body: string) => {
    const at = fromKey(day)
    const [h, m] = time.split(':').map(Number)
    at.setHours(h, m, 0, 0)
    if (at.getTime() > now) out.push({ at, title, body })
  }
  const label = (time: string) => fmtTime(time, data.settings.timeFormat)

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const day = addDays(today, i)
    if (n.habits)
      for (const h of data.habits) {
        if (!h.reminderTime || h.archivedAt) continue
        // Today we know whether the habit is still open; later days follow the schedule.
        const due = i === 0 ? isDueOn(h, data.logs, day, data.settings.weekStart) && !doneOn(h, data.logs, day) : isScheduledOn(h, day)
        if (due) add(day, h.reminderTime, h.name, t.notify.habit(label(h.reminderTime)))
      }
    if (n.tasks)
      for (const task of data.tasks)
        if (task.remind && task.time && task.date === day && !task.done && !task.archivedAt)
          add(day, task.time, task.title, t.notify.task(label(task.time)))
    if (n.reminders)
      for (const r of data.reminders)
        if (r.enabled && reminderOccursOn(r, day)) add(day, r.time, r.title, t.notify.reminder(label(r.time)))
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_SCHEDULED)
}

let syncing = Promise.resolve()

/** Replaces all scheduled system notifications with the current plan. */
export function syncNativeSchedule(): Promise<void> {
  if (!isNative) return Promise.resolve()
  // Runs are chained so two quick changes cannot interleave cancel and schedule.
  syncing = syncing
    .then(async () => {
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length)
        await LocalNotifications.cancel({ notifications: pending.notifications.map((x) => ({ id: x.id })) })
      const items = plan()
      if (!items.length || (await nativePermission(false)) !== 'granted') return
      await LocalNotifications.schedule({
        notifications: items.map((x, i) => ({ id: i + 1, title: x.title, body: x.body, schedule: { at: x.at, allowWhileIdle: true } })),
      })
    })
    .catch(() => {
      /* Scheduling is best-effort; the next change or launch retries. */
    })
  return syncing
}

export async function nativeTestNotification() {
  await LocalNotifications.schedule({
    notifications: [{ id: 9999, title: 'Dayflow', body: getT().notify.test, schedule: { at: new Date(Date.now() + 1500), allowWhileIdle: true } }],
  })
}

/** Saves a text file to the app cache and opens the system share sheet for it. */
export async function nativeShareFile(filename: string, text: string) {
  const file = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 })
  await Share.share({ title: filename, files: [file.uri] })
}

export function setNativeBarStyle(theme: 'light' | 'dark') {
  if (!isNative) return
  // "Dark" means a dark background, i.e. light status-bar icons.
  SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}

/** Wires up the pieces that only exist in the app shell. Safe to call in a browser. */
export function initNative() {
  if (!isNative) return
  void syncNativeSchedule()

  let timer: ReturnType<typeof setTimeout> | undefined
  useStore.subscribe(() => {
    clearTimeout(timer)
    timer = setTimeout(() => void syncNativeSchedule(), 1500)
  })

  // Coming back to the app moves the scheduling window forward.
  void NativeApp.addListener('resume', () => void syncNativeSchedule())

  void NativeApp.addListener('backButton', ({ canGoBack }) => {
    const ui = useUi.getState()
    if (ui.confirm) ui.closeConfirm()
    else if (ui.sheet) ui.closeSheet()
    else if (canGoBack) window.history.back()
    else void NativeApp.exitApp()
  })
}
