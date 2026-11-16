import type { HabitInput } from '../store/store'
import type { DateKey } from '../store/types'

export type TemplateId = 'water' | 'reading' | 'workout' | 'meditation' | 'walk' | 'language' | 'sleep' | 'journal' | 'budget' | 'morning'

type Shape = Pick<HabitInput, 'icon' | 'color' | 'category' | 'type' | 'target' | 'schedule' | 'reminderTime'>

export const TEMPLATES: Record<TemplateId, Shape> = {
  water: { icon: 'droplets', color: 'blue', category: 'health', type: 'numeric', target: 8, schedule: { kind: 'daily' }, reminderTime: null },
  reading: { icon: 'book', color: 'ochre', category: 'learning', type: 'duration', target: 30, schedule: { kind: 'daily' }, reminderTime: '21:00' },
  workout: { icon: 'dumbbell', color: 'clay', category: 'sport', type: 'boolean', target: 1, schedule: { kind: 'perWeek', count: 3 }, reminderTime: null },
  meditation: { icon: 'leaf', color: 'olive', category: 'growth', type: 'duration', target: 10, schedule: { kind: 'daily' }, reminderTime: '07:30' },
  walk: { icon: 'footprints', color: 'pine', category: 'health', type: 'duration', target: 30, schedule: { kind: 'daily' }, reminderTime: null },
  language: { icon: 'languages', color: 'plum', category: 'learning', type: 'duration', target: 20, schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] }, reminderTime: '19:00' },
  sleep: { icon: 'moon', color: 'graphite', category: 'health', type: 'boolean', target: 1, schedule: { kind: 'daily' }, reminderTime: '22:30' },
  journal: { icon: 'pen', color: 'teal', category: 'growth', type: 'boolean', target: 1, schedule: { kind: 'daily' }, reminderTime: '21:30' },
  budget: { icon: 'wallet', color: 'olive', category: 'finance', type: 'boolean', target: 1, schedule: { kind: 'daily' }, reminderTime: null },
  morning: { icon: 'sun', color: 'ochre', category: 'health', type: 'checklist', target: 1, schedule: { kind: 'daily' }, reminderTime: '07:00' },
}

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[]

export interface TemplateText {
  name: string
  unit?: string
  items?: string[]
}

export function fromTemplate(id: TemplateId, text: TemplateText, startDate: DateKey): HabitInput {
  return {
    ...TEMPLATES[id],
    name: text.name,
    description: '',
    unit: text.unit ?? '',
    checklist: (text.items ?? []).map((title, i) => ({ id: `i${i + 1}`, title })),
    startDate,
    goalCount: null,
  }
}
