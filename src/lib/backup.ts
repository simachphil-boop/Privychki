import { defaultSettings, emptyData } from '../store/store'
import {
  CATEGORIES, COLORS,
  type AppData, type CategoryId, type ColorId, type Goal, type Habit, type HabitLog, type Logs, type Reminder, type Schedule, type Task,
} from '../store/types'
import { isValidKey, isValidTime, todayKey } from './dates'
import { isDone } from './schedule'

const BACKUPS_KEY = 'dayflow:backups'
const MAX_BACKUPS = 5

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const int = (v: unknown, fallback: number, min = 0, max = 1e6): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const iso = (v: unknown): string => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date().toISOString())
const isoOrNull = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null)

function schedule(v: unknown): Schedule {
  if (!isObj(v)) return { kind: 'daily' }
  switch (v.kind) {
    case 'weekdays': {
      const days = [...new Set(arr(v.days).filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))].sort()
      return days.length ? { kind: 'weekdays', days } : { kind: 'daily' }
    }
    case 'perWeek':
      return { kind: 'perWeek', count: int(v.count, 3, 1, 7) }
    case 'perMonth':
      return { kind: 'perMonth', count: int(v.count, 4, 1, 31) }
    case 'interval':
      return { kind: 'interval', every: int(v.every, 2, 1, 365) }
    default:
      return { kind: 'daily' }
  }
}

function habit(v: unknown): Habit | null {
  if (!isObj(v) || !str(v.id) || !str(v.name).trim()) return null
  return {
    id: str(v.id),
    name: str(v.name).slice(0, 80),
    description: str(v.description),
    icon: str(v.icon, 'check'),
    color: oneOf<ColorId>(v.color, COLORS, 'pine'),
    category: oneOf<CategoryId>(v.category, CATEGORIES, 'other'),
    type: oneOf(v.type, ['boolean', 'numeric', 'duration', 'checklist'] as const, 'boolean'),
    target: int(v.target, 1, 1, 99999),
    unit: str(v.unit),
    checklist: arr(v.checklist).flatMap((i) => (isObj(i) && str(i.id) && str(i.title) ? [{ id: str(i.id), title: str(i.title) }] : [])),
    schedule: schedule(v.schedule),
    reminderTime: isValidTime(v.reminderTime) ? v.reminderTime : null,
    startDate: isValidKey(v.startDate) ? v.startDate : todayKey(),
    goalCount: typeof v.goalCount === 'number' ? int(v.goalCount, 30, 1, 9999) : null,
    archivedAt: isoOrNull(v.archivedAt),
    createdAt: iso(v.createdAt),
  }
}

function task(v: unknown): Task | null {
  if (!isObj(v) || !str(v.id) || !str(v.title).trim()) return null
  const done = v.done === true
  return {
    id: str(v.id),
    title: str(v.title).slice(0, 140),
    notes: str(v.notes),
    date: isValidKey(v.date) ? v.date : null,
    time: isValidTime(v.time) ? v.time : null,
    priority: oneOf(v.priority, ['low', 'medium', 'high'] as const, 'medium'),
    category: oneOf<CategoryId>(v.category, CATEGORIES, 'other'),
    goalId: strOrNull(v.goalId),
    remind: v.remind === true,
    done,
    doneAt: done ? iso(v.doneAt) : null,
    archivedAt: isoOrNull(v.archivedAt),
    createdAt: iso(v.createdAt),
  }
}

function reminder(v: unknown): Reminder | null {
  if (!isObj(v) || !str(v.id) || !str(v.title).trim() || !isValidTime(v.time)) return null
  return {
    id: str(v.id),
    title: str(v.title).slice(0, 140),
    time: v.time,
    date: isValidKey(v.date) ? v.date : todayKey(),
    repeat: oneOf(v.repeat, ['none', 'daily', 'weekdays', 'weekly'] as const, 'none'),
    enabled: v.enabled !== false,
    createdAt: iso(v.createdAt),
  }
}

function goal(v: unknown): Goal | null {
  if (!isObj(v) || !str(v.id) || !str(v.title).trim()) return null
  return {
    id: str(v.id),
    title: str(v.title).slice(0, 100),
    description: str(v.description),
    color: oneOf<ColorId>(v.color, COLORS, 'pine'),
    deadline: isValidKey(v.deadline) ? v.deadline : null,
    milestones: arr(v.milestones).flatMap((m) => (isObj(m) && str(m.id) && str(m.title) ? [{ id: str(m.id), title: str(m.title), done: m.done === true }] : [])),
    habitIds: arr(v.habitIds).filter((x): x is string => typeof x === 'string'),
    completedAt: isoOrNull(v.completedAt),
    archivedAt: isoOrNull(v.archivedAt),
    createdAt: iso(v.createdAt),
  }
}

function logs(v: unknown, habitIds: Set<string>): Logs {
  const out: Logs = {}
  if (!isObj(v)) return out
  for (const id in v) {
    const days = v[id]
    if (!habitIds.has(id) || !isObj(days)) continue
    const mine: Record<string, HabitLog> = {}
    for (const k in days) {
      const e = days[k]
      if (!isValidKey(k) || !isObj(e)) continue
      const items = arr(e.items).filter((x): x is string => typeof x === 'string')
      mine[k] = items.length ? { value: int(e.value, 0), items } : { value: int(e.value, 0) }
    }
    out[id] = mine
  }
  return out
}

export class ImportError extends Error {}

/** Parses an export file. Tolerates missing fields; rejects anything that is not a Dayflow export. */
export function parseImport(text: string): AppData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ImportError('not-json')
  }
  const body = isObj(raw) && isObj(raw.data) ? raw.data : raw
  if (!isObj(raw) || raw.app !== 'dayflow' || !isObj(body)) throw new ImportError('not-dayflow')

  const habits = arr(body.habits).map(habit).filter((x): x is Habit => x !== null)
  const ids = new Set(habits.map((h) => h.id))
  const goals = arr(body.goals).map(goal).filter((x): x is Goal => x !== null)
  const goalIds = new Set(goals.map((g) => g.id))
  const d = defaultSettings()
  const s = isObj(body.settings) ? body.settings : {}
  const n = isObj(s.notifications) ? s.notifications : {}
  const v = isObj(s.taskView) ? s.taskView : {}

  return {
    habits,
    logs: logs(body.logs, ids),
    tasks: arr(body.tasks).map(task).filter((x): x is Task => x !== null).map((t) => ({ ...t, goalId: t.goalId && goalIds.has(t.goalId) ? t.goalId : null })),
    reminders: arr(body.reminders).map(reminder).filter((x): x is Reminder => x !== null),
    goals: goals.map((g) => ({ ...g, habitIds: g.habitIds.filter((id) => ids.has(id)) })),
    settings: {
      name: str(s.name).slice(0, 40),
      avatar: typeof s.avatar === 'string' && s.avatar.startsWith('data:image/') ? s.avatar : null,
      theme: oneOf(s.theme, ['system', 'light', 'dark'] as const, d.theme),
      lang: oneOf(s.lang, ['ru', 'en'] as const, d.lang),
      weekStart: s.weekStart === 0 ? 0 : 1,
      timeFormat: s.timeFormat === '12' ? '12' : '24',
      notifications: { enabled: n.enabled === true, habits: n.habits !== false, tasks: n.tasks !== false, reminders: n.reminders !== false },
      taskView: {
        sort: oneOf(v.sort, ['time', 'priority', 'created', 'title'] as const, d.taskView.sort),
        group: oneOf(v.group, ['daypart', 'none'] as const, d.taskView.group),
        status: oneOf(v.status, ['all', 'active', 'done'] as const, 'all'),
        priority: oneOf(v.priority, ['all', 'low', 'medium', 'high'] as const, 'all'),
        category: oneOf(v.category, ['all', ...CATEGORIES] as const, 'all'),
      },
      onboarded: true,
    },
  }
}

export const serialize = (data: AppData): string =>
  JSON.stringify({ app: 'dayflow', version: 1, exportedAt: new Date().toISOString(), data }, null, 2)

const csvCell = (v: string | number) => (/[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))

/** Habit history as a spreadsheet-friendly table. */
export function logsToCsv(data: AppData): string {
  const rows = [['date', 'habit', 'category', 'value', 'target', 'completed']]
  for (const h of data.habits) {
    const mine = data.logs[h.id] ?? {}
    for (const k of Object.keys(mine).sort()) {
      const e = mine[k]
      const value = h.type === 'checklist' ? (e.items?.length ?? 0) : e.value
      const target = h.type === 'checklist' ? h.checklist.length : h.type === 'boolean' ? 1 : h.target
      rows.push([k, h.name, h.category, String(value), String(target), isDone(h, e) ? '1' : '0'])
    }
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n')
}

export function download(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface Backup {
  /** Day the snapshot was taken. */
  date: string
  at: string
  data: AppData
}

export function listBackups(): Backup[] {
  try {
    const raw = JSON.parse(localStorage.getItem(BACKUPS_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((b) => isObj(b) && isValidKey(b.date) && isObj(b.data)) : []
  } catch {
    return []
  }
}

const hasContent = (d: AppData) => d.habits.length + d.tasks.length + d.goals.length + d.reminders.length > 0

/** Keeps one snapshot per day, the newest few only. Avatars are left out to save space. */
export function saveBackup(data: AppData, force = false): boolean {
  if (!hasContent(data)) return false
  const date = todayKey()
  const existing = listBackups()
  if (!force && existing.some((b) => b.date === date)) return false
  const snapshot: Backup = { date, at: new Date().toISOString(), data: { ...data, settings: { ...data.settings, avatar: null } } }
  let next = [snapshot, ...existing.filter((b) => b.date !== date)].slice(0, MAX_BACKUPS)
  while (next.length) {
    try {
      localStorage.setItem(BACKUPS_KEY, JSON.stringify(next))
      return true
    } catch {
      next = next.slice(0, -1) // Out of space: drop the oldest and retry.
    }
  }
  return false
}

export const clearBackups = () => localStorage.removeItem(BACKUPS_KEY)

export const blankData = emptyData
