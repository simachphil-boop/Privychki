/** Calendar day in local time, formatted as YYYY-MM-DD. Sorts lexicographically. */
export type DateKey = string
/** Wall-clock time, formatted as HH:MM (24h). */
export type TimeStr = string

export type CategoryId =
  | 'health'
  | 'sport'
  | 'learning'
  | 'work'
  | 'growth'
  | 'finance'
  | 'rest'
  | 'other'

export const CATEGORIES: CategoryId[] = [
  'health',
  'sport',
  'learning',
  'work',
  'growth',
  'finance',
  'rest',
  'other',
]

export type ColorId = 'clay' | 'ochre' | 'olive' | 'pine' | 'teal' | 'blue' | 'plum' | 'graphite'
export const COLORS: ColorId[] = ['clay', 'ochre', 'olive', 'pine', 'teal', 'blue', 'plum', 'graphite']

export type HabitType = 'boolean' | 'numeric' | 'duration' | 'checklist'

export type Schedule =
  | { kind: 'daily' }
  /** Fixed weekdays, 0 = Sunday … 6 = Saturday. */
  | { kind: 'weekdays'; days: number[] }
  /** Any `count` days within a week. */
  | { kind: 'perWeek'; count: number }
  /** Any `count` days within a calendar month. */
  | { kind: 'perMonth'; count: number }
  /** Every `every` days, counted from the start date. */
  | { kind: 'interval'; every: number }

export interface ChecklistItem {
  id: string
  title: string
}

export interface Habit {
  id: string
  name: string
  description: string
  icon: string
  color: ColorId
  category: CategoryId
  type: HabitType
  /** Numeric: amount per day. Duration: minutes per day. Ignored otherwise. */
  target: number
  /** Unit label for numeric habits, e.g. "стаканов". */
  unit: string
  checklist: ChecklistItem[]
  schedule: Schedule
  reminderTime: TimeStr | null
  startDate: DateKey
  /** Optional goal: number of completions the user is working towards. */
  goalCount: number | null
  archivedAt: string | null
  createdAt: string
}

export interface HabitLog {
  /** Boolean: 1. Numeric: amount. Duration: minutes. Checklist: unused (see items). */
  value: number
  /** Checklist: ids of ticked items. */
  items?: string[]
}

export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  notes: string
  /** null = "someday", not bound to a day. */
  date: DateKey | null
  time: TimeStr | null
  priority: Priority
  category: CategoryId
  goalId: string | null
  remind: boolean
  done: boolean
  doneAt: string | null
  archivedAt: string | null
  createdAt: string
}

export type ReminderRepeat = 'none' | 'daily' | 'weekdays' | 'weekly'

export interface Reminder {
  id: string
  title: string
  time: TimeStr
  /** For `none`: the day it fires. For repeating ones: the first day. */
  date: DateKey
  repeat: ReminderRepeat
  enabled: boolean
  createdAt: string
}

export interface Milestone {
  id: string
  title: string
  done: boolean
}

export interface Goal {
  id: string
  title: string
  description: string
  color: ColorId
  deadline: DateKey | null
  milestones: Milestone[]
  habitIds: string[]
  completedAt: string | null
  archivedAt: string | null
  createdAt: string
}

export type ThemePref = 'system' | 'light' | 'dark'
export type Lang = 'ru' | 'en'
export type TaskSort = 'time' | 'priority' | 'created' | 'title'
export type TaskGroup = 'daypart' | 'none'
export type TaskStatusFilter = 'all' | 'active' | 'done'

export interface TaskView {
  sort: TaskSort
  group: TaskGroup
  status: TaskStatusFilter
  priority: Priority | 'all'
  category: CategoryId | 'all'
}

export interface Settings {
  name: string
  /** Data URL of a square, downscaled photo. */
  avatar: string | null
  theme: ThemePref
  lang: Lang
  /** 0 = Sunday, 1 = Monday. */
  weekStart: 0 | 1
  timeFormat: '24' | '12'
  notifications: {
    enabled: boolean
    habits: boolean
    tasks: boolean
    reminders: boolean
  }
  taskView: TaskView
  onboarded: boolean
}

export type Logs = Record<string, Record<DateKey, HabitLog>>

/** Everything that is persisted and exported. */
export interface AppData {
  habits: Habit[]
  logs: Logs
  tasks: Task[]
  reminders: Reminder[]
  goals: Goal[]
  settings: Settings
}
