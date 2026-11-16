import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { todayKey } from '../lib/dates'
import { completeEntry, isDone } from '../lib/schedule'
import type { AppData, DateKey, Goal, Habit, HabitLog, Reminder, Settings, Task } from './types'

export const STORAGE_KEY = 'dayflow:v1'

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const systemLang = (): 'ru' | 'en' =>
  typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('ru') ? 'en' : 'ru'

export const defaultSettings = (): Settings => ({
  name: '',
  avatar: null,
  theme: 'system',
  lang: systemLang(),
  weekStart: 1,
  timeFormat: '24',
  notifications: { enabled: false, habits: true, tasks: true, reminders: true },
  taskView: { sort: 'time', group: 'daypart', status: 'all', priority: 'all', category: 'all' },
  onboarded: false,
})

export const emptyData = (): AppData => ({
  habits: [],
  logs: {},
  tasks: [],
  reminders: [],
  goals: [],
  settings: defaultSettings(),
})

export type HabitInput = Omit<Habit, 'id' | 'createdAt' | 'archivedAt'>
export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'archivedAt' | 'done' | 'doneAt'>
export type ReminderInput = Omit<Reminder, 'id' | 'createdAt'>
export type GoalInput = Omit<Goal, 'id' | 'createdAt' | 'archivedAt' | 'completedAt'>

interface Actions {
  addHabit(input: HabitInput): string
  updateHabit(id: string, patch: Partial<Habit>): void
  deleteHabit(id: string): void
  /** Sets or clears (null) a day's log entry. */
  setLog(habitId: string, date: DateKey, entry: HabitLog | null): void
  /** Completes the day, or clears it when already complete. */
  toggleHabit(habitId: string, date: DateKey): void

  addTask(input: TaskInput): string
  updateTask(id: string, patch: Partial<Task>): void
  toggleTask(id: string): void
  deleteTask(id: string): void

  addReminder(input: ReminderInput): string
  updateReminder(id: string, patch: Partial<Reminder>): void
  deleteReminder(id: string): void

  addGoal(input: GoalInput): string
  updateGoal(id: string, patch: Partial<Goal>): void
  deleteGoal(id: string): void

  updateSettings(patch: Partial<Settings>): void
  /** Replaces all data: used by import, restore and undo. */
  replaceData(data: AppData): void
  resetAll(): void
}

export type Store = AppData & Actions

const now = () => new Date().toISOString()
const patchById = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x))

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyData(),

      addHabit(input) {
        const id = uid()
        set((s) => ({ habits: [...s.habits, { ...input, id, createdAt: now(), archivedAt: null }] }))
        return id
      },
      updateHabit: (id, patch) => set((s) => ({ habits: patchById(s.habits, id, patch) })),
      deleteHabit: (id) =>
        set((s) => {
          const { [id]: _removed, ...logs } = s.logs
          return {
            habits: s.habits.filter((h) => h.id !== id),
            logs,
            goals: s.goals.map((g) => ({ ...g, habitIds: g.habitIds.filter((x) => x !== id) })),
          }
        }),
      setLog: (habitId, date, entry) =>
        set((s) => {
          const mine = { ...(s.logs[habitId] ?? {}) }
          const empty = !entry || (entry.value <= 0 && !(entry.items && entry.items.length))
          if (empty) delete mine[date]
          else mine[date] = entry
          return { logs: { ...s.logs, [habitId]: mine } }
        }),
      toggleHabit(habitId, date) {
        const s = get()
        const h = s.habits.find((x) => x.id === habitId)
        if (!h) return
        s.setLog(habitId, date, isDone(h, s.logs[habitId]?.[date]) ? null : completeEntry(h))
      },

      addTask(input) {
        const id = uid()
        set((s) => ({
          tasks: [...s.tasks, { ...input, id, createdAt: now(), archivedAt: null, done: false, doneAt: null }],
        }))
        return id
      },
      updateTask: (id, patch) => set((s) => ({ tasks: patchById(s.tasks, id, patch) })),
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? null : now() } : t)),
        })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addReminder(input) {
        const id = uid()
        set((s) => ({ reminders: [...s.reminders, { ...input, id, createdAt: now() }] }))
        return id
      },
      updateReminder: (id, patch) => set((s) => ({ reminders: patchById(s.reminders, id, patch) })),
      deleteReminder: (id) => set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),

      addGoal(input) {
        const id = uid()
        set((s) => ({ goals: [...s.goals, { ...input, id, createdAt: now(), archivedAt: null, completedAt: null }] }))
        return id
      },
      updateGoal: (id, patch) => set((s) => ({ goals: patchById(s.goals, id, patch) })),
      deleteGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          tasks: s.tasks.map((t) => (t.goalId === id ? { ...t, goalId: null } : t)),
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      replaceData: (data) => set({ ...data }),
      resetAll: () => set({ ...emptyData() }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s): AppData => pickData(s),
      // Fill in settings added by newer versions without dropping stored ones.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppData>
        const d = defaultSettings()
        return {
          ...current,
          ...p,
          settings: {
            ...d,
            ...p.settings,
            notifications: { ...d.notifications, ...p.settings?.notifications },
            taskView: { ...d.taskView, ...p.settings?.taskView },
          },
        }
      },
    },
  ),
)

export const pickData = (s: AppData): AppData => ({
  habits: s.habits,
  logs: s.logs,
  tasks: s.tasks,
  reminders: s.reminders,
  goals: s.goals,
  settings: s.settings,
})

export const getData = (): AppData => pickData(useStore.getState())

/** Re-renders at midnight so "today" never goes stale in a long-lived tab. */
export const useToday = create<{ today: DateKey }>(() => ({ today: todayKey() }))
if (typeof window !== 'undefined') {
  const sync = () => {
    const k = todayKey()
    if (useToday.getState().today !== k) useToday.setState({ today: k })
  }
  setInterval(sync, 30_000)
  document.addEventListener('visibilitychange', sync)
}
