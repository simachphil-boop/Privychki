import type { AppData, DateKey, Goal, Habit, Reminder, Task, TaskView } from '../store/types'
import { dayPartOf, weekdayOf, type DayPart } from './dates'
import { doneOn, habitStats, isDueOn } from './schedule'

const byTime = (a: string | null, b: string | null) => (a ?? '99:99').localeCompare(b ?? '99:99')

export function habitsOn(data: Pick<AppData, 'habits' | 'logs' | 'settings'>, date: DateKey): Habit[] {
  return data.habits
    .filter((h) => isDueOn(h, data.logs, date, data.settings.weekStart))
    .sort((a, b) => byTime(a.reminderTime, b.reminderTime) || a.createdAt.localeCompare(b.createdAt))
}

export const tasksOn = (tasks: Task[], date: DateKey): Task[] => tasks.filter((t) => t.date === date && !t.archivedAt)

export const overdueTasks = (tasks: Task[], today: DateKey): Task[] =>
  tasks.filter((t) => t.date !== null && t.date < today && !t.done && !t.archivedAt)

export function reminderOccursOn(r: Reminder, k: DateKey): boolean {
  if (k < r.date) return false
  switch (r.repeat) {
    case 'none':
      return k === r.date
    case 'daily':
      return true
    case 'weekdays': {
      const w = weekdayOf(k)
      return w >= 1 && w <= 5
    }
    case 'weekly':
      return weekdayOf(k) === weekdayOf(r.date)
  }
}

export const remindersOn = (reminders: Reminder[], date: DateKey): Reminder[] =>
  reminders.filter((r) => reminderOccursOn(r, date)).sort((a, b) => a.time.localeCompare(b.time))

export interface DayProgress {
  habitsDone: number
  habitsTotal: number
  tasksDone: number
  tasksTotal: number
  /** 0…1, or null when nothing is planned. */
  rate: number | null
}

export function dayProgress(data: Pick<AppData, 'habits' | 'logs' | 'tasks' | 'settings'>, date: DateKey): DayProgress {
  const habits = habitsOn(data, date)
  const tasks = tasksOn(data.tasks, date)
  const habitsDone = habits.filter((h) => doneOn(h, data.logs, date)).length
  const tasksDone = tasks.filter((t) => t.done).length
  const total = habits.length + tasks.length
  return {
    habitsDone,
    habitsTotal: habits.length,
    tasksDone,
    tasksTotal: tasks.length,
    rate: total ? (habitsDone + tasksDone) / total : null,
  }
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

export function sortTasks(tasks: Task[], sort: TaskView['sort']): Task[] {
  const cmp: Record<TaskView['sort'], (a: Task, b: Task) => number> = {
    time: (a, b) => byTime(a.time, b.time) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byTime(a.time, b.time),
    created: (a, b) => b.createdAt.localeCompare(a.createdAt),
    title: (a, b) => a.title.localeCompare(b.title),
  }
  // Finished tasks sink to the bottom so the list reads as "what is left".
  return [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || cmp[sort](a, b) || a.createdAt.localeCompare(b.createdAt))
}

export function filterTasks(tasks: Task[], view: TaskView): Task[] {
  return tasks.filter(
    (t) =>
      (view.status === 'all' || (view.status === 'done') === t.done) &&
      (view.priority === 'all' || t.priority === view.priority) &&
      (view.category === 'all' || t.category === view.category),
  )
}

export const isFiltered = (v: TaskView) => v.status !== 'all' || v.priority !== 'all' || v.category !== 'all'

const PARTS: DayPart[] = ['morning', 'day', 'evening', 'none']

export function groupTasks(tasks: Task[], view: TaskView): { part: DayPart | null; tasks: Task[] }[] {
  const sorted = sortTasks(tasks, view.sort)
  if (view.group === 'none') return sorted.length ? [{ part: null, tasks: sorted }] : []
  return PARTS.map((part) => ({ part, tasks: sorted.filter((t) => dayPartOf(t.time) === part) })).filter((g) => g.tasks.length)
}

export interface GoalProgress {
  done: number
  total: number
  /** 0…1 */
  value: number
  /** Average regularity of linked habits, when there are any. */
  habitRate: number | null
}

/** Progress = finished milestones and linked tasks; falls back to habit regularity. */
export function goalProgress(goal: Goal, data: AppData, today: DateKey): GoalProgress {
  const tasks = data.tasks.filter((t) => t.goalId === goal.id)
  const done = goal.milestones.filter((m) => m.done).length + tasks.filter((t) => t.done).length
  const total = goal.milestones.length + tasks.length
  const rates = data.habits
    .filter((h) => goal.habitIds.includes(h.id))
    .map((h) => habitStats(h, data.logs, today, data.settings.weekStart).rate)
    .filter((r): r is number => r !== null)
  const habitRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null
  const value = goal.completedAt ? 1 : total ? done / total : (habitRate ?? 0)
  return { done, total, value, habitRate }
}
