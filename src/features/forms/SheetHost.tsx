import { useState } from 'react'
import { useT } from '../../lib/i18n'
import { defaultSettings, useStore } from '../../store/store'
import { CATEGORIES, type CategoryId, type Priority, type TaskGroup, type TaskSort, type TaskStatusFilter } from '../../store/types'
import { useUi, type CreateKind } from '../../store/ui'
import { Button, Chip, Segmented } from '../../ui/kit'
import { Sheet, useSheetClose } from '../../ui/Sheet'
import { LogSheet } from '../day/LogSheet'
import { GoalForm } from './GoalForm'
import { HabitForm } from './HabitForm'
import { Field } from './parts'
import { ReminderForm } from './ReminderForm'
import { TaskForm } from './TaskForm'

const KINDS: CreateKind[] = ['task', 'habit', 'reminder', 'goal']

function TaskViewBody() {
  const t = useT()
  const close = useSheetClose()
  const view = useStore((s) => s.settings.taskView)
  const updateSettings = useStore((s) => s.updateSettings)
  const set = (patch: Partial<typeof view>) => updateSettings({ taskView: { ...view, ...patch } })
  return (
    <>
      <div className="sheet__body">
        <Field label={t.view.group}>
          <Segmented<TaskGroup> label={t.view.group} value={view.group} onChange={(group) => set({ group })} options={[{ value: 'daypart', label: t.view.groups.daypart }, { value: 'none', label: t.view.groups.none }]} />
        </Field>
        <Field label={t.view.sort}>
          <div className="chips">
            {(['time', 'priority', 'created', 'title'] as TaskSort[]).map((v) => (
              <Chip key={v} selected={view.sort === v} onClick={() => set({ sort: v })}>{t.view.sorts[v]}</Chip>
            ))}
          </div>
        </Field>
        <Field label={t.view.status}>
          <Segmented<TaskStatusFilter> label={t.view.status} value={view.status} onChange={(status) => set({ status })} options={(['all', 'active', 'done'] as const).map((v) => ({ value: v, label: t.view.statuses[v] }))} />
        </Field>
        <Field label={t.task.priorityLabel}>
          <div className="chips">
            {(['all', 'high', 'medium', 'low'] as (Priority | 'all')[]).map((v) => (
              <Chip key={v} selected={view.priority === v} onClick={() => set({ priority: v })}>{v === 'all' ? t.common.all : t.task.priority[v]}</Chip>
            ))}
          </div>
        </Field>
        <Field label={t.task.category}>
          <div className="chips">
            {(['all', ...CATEGORIES] as (CategoryId | 'all')[]).map((v) => (
              <Chip key={v} selected={view.category === v} onClick={() => set({ category: v })}>{v === 'all' ? t.common.all : t.cat[v]}</Chip>
            ))}
          </div>
        </Field>
      </div>
      <div className="sheet__foot">
        <Button block onClick={() => updateSettings({ taskView: defaultSettings().taskView })}>{t.view.reset}</Button>
        <Button variant="primary" block onClick={close}>{t.common.done}</Button>
      </div>
    </>
  )
}

/** Renders whichever sheet is currently requested through the UI store. */
export function SheetHost() {
  const t = useT()
  const sheet = useUi((s) => s.sheet)
  const closeSheet = useUi((s) => s.closeSheet)
  const [kind, setKind] = useState<CreateKind>('task')
  const [seen, setSeen] = useState(sheet)
  if (sheet !== seen) {
    setSeen(sheet)
    if (sheet?.type === 'create') setKind(sheet.kind)
  }
  if (!sheet) return null

  switch (sheet.type) {
    case 'create':
      return (
        <Sheet
          title={t.create.title}
          onClose={closeSheet}
          header={<Segmented<CreateKind> size="sm" label={t.create.title} value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: t.create.kinds[k] }))} />}
        >
          {kind === 'task' && <TaskForm date={sheet.date} goalId={sheet.goalId} />}
          {kind === 'habit' && <HabitForm />}
          {kind === 'reminder' && <ReminderForm date={sheet.date} />}
          {kind === 'goal' && <GoalForm />}
        </Sheet>
      )
    case 'task':
      return <Sheet title={t.task.edit} onClose={closeSheet}><TaskForm id={sheet.id} /></Sheet>
    case 'habit':
      return <Sheet title={t.habit.edit} onClose={closeSheet}><HabitForm id={sheet.id} /></Sheet>
    case 'reminder':
      return <Sheet title={t.reminder.edit} onClose={closeSheet}><ReminderForm id={sheet.id} /></Sheet>
    case 'goal':
      return <Sheet title={t.goal.edit} onClose={closeSheet}><GoalForm id={sheet.id} /></Sheet>
    case 'log':
      return <Sheet title={t.habit.log} onClose={closeSheet}><LogSheet habitId={sheet.habitId} date={sheet.date} /></Sheet>
    case 'taskView':
      return <Sheet title={t.view.title} onClose={closeSheet}><TaskViewBody /></Sheet>
  }
}
