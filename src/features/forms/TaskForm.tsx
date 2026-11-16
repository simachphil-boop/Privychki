import { Archive, ArrowRight, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { withUndo } from '../../lib/actions'
import { addDays } from '../../lib/dates'
import { useT } from '../../lib/i18n'
import { useStore, useToday, type TaskInput } from '../../store/store'
import type { DateKey, Priority } from '../../store/types'
import { toast } from '../../store/ui'
import { Button, Row, Segmented, Switch } from '../../ui/kit'
import { useSheetClose } from '../../ui/Sheet'
import { CategoryChips, DateChips, Field, TimeInput } from './parts'

export function TaskForm({ id, date, goalId }: { id?: string; date?: DateKey; goalId?: string }) {
  const t = useT()
  const close = useSheetClose()
  const today = useToday((s) => s.today)
  const existing = useStore((s) => (id ? s.tasks.find((x) => x.id === id) : undefined))
  const goals = useStore((s) => s.goals).filter((g) => !g.archivedAt)
  const { addTask, updateTask, deleteTask } = useStore.getState()
  const [draft, setDraft] = useState<TaskInput>(() =>
    existing
      ? { title: existing.title, notes: existing.notes, date: existing.date, time: existing.time, priority: existing.priority, category: existing.category, goalId: existing.goalId, remind: existing.remind }
      : { title: '', notes: '', date: date ?? today, time: null, priority: 'medium', category: 'other', goalId: goalId ?? null, remind: false },
  )
  const [touched, setTouched] = useState(false)
  const set = (patch: Partial<TaskInput>) => setDraft((d) => ({ ...d, ...patch }))
  const invalid = !draft.title.trim()

  const submit = () => {
    setTouched(true)
    if (invalid) return
    const clean = { ...draft, title: draft.title.trim(), notes: draft.notes.trim(), remind: draft.remind && !!draft.time && !!draft.date }
    if (existing) updateTask(existing.id, clean)
    else {
      addTask(clean)
      toast(t.task.added)
    }
    close()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="sheet__body">
        <input className="title-input" autoFocus={!existing} value={draft.title} maxLength={140} placeholder={t.task.titlePlaceholder} aria-label={t.task.title} enterKeyHint="done" onChange={(e) => set({ title: e.target.value })} />
        {touched && invalid && <p className="field-error" role="alert">{t.task.titleRequired}</p>}
        <textarea className="ghost-area" rows={1} value={draft.notes} maxLength={1000} placeholder={t.task.notesPlaceholder} aria-label={t.task.notes} onChange={(e) => set({ notes: e.target.value })} />

        <Field label={t.task.date}>
          <DateChips value={draft.date} onChange={(d) => set({ date: d })} allowNone />
        </Field>
        <Field label={t.task.priorityLabel}>
          <Segmented<Priority>
            label={t.task.priorityLabel}
            value={draft.priority}
            onChange={(priority) => set({ priority })}
            options={(['low', 'medium', 'high'] as const).map((p) => ({ value: p, label: t.task.priority[p] }))}
          />
        </Field>
        <Field label={t.task.category}>
          <CategoryChips value={draft.category} onChange={(category) => set({ category })} />
        </Field>

        <div className="group form-group">
          <Row label={t.task.time}>
            <TimeInput value={draft.time} onChange={(time) => set({ time, remind: time ? draft.remind : false })} label={t.task.time} />
          </Row>
          <Row label={t.task.remind} hint={!draft.time || !draft.date ? t.task.remindHint : undefined}>
            <Switch checked={draft.remind && !!draft.time && !!draft.date} disabled={!draft.time || !draft.date} onChange={(remind) => set({ remind })} label={t.task.remind} />
          </Row>
          {goals.length > 0 && (
            <Row label={t.task.goal}>
              <select className="select input--inline" aria-label={t.task.goal} value={draft.goalId ?? ''} onChange={(e) => set({ goalId: e.target.value || null })}>
                <option value="">{t.task.noGoal}</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </Row>
          )}
        </div>

        {existing && (
          <div className="form-actions">
            {!existing.done && (
              <Button
                size="sm"
                icon={ArrowRight}
                onClick={() => {
                  updateTask(existing.id, { date: addDays(today, 1) })
                  toast(t.task.movedTomorrow)
                  close()
                }}
              >
                {t.task.toTomorrow}
              </Button>
            )}
            <Button
              size="sm"
              icon={Archive}
              onClick={() => {
                withUndo(() => updateTask(existing.id, { archivedAt: new Date().toISOString() }), t.task.archived)
                close()
              }}
            >
              {t.common.archive}
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              onClick={() => {
                withUndo(() => deleteTask(existing.id), t.task.deleted)
                close()
              }}
            >
              {t.common.delete}
            </Button>
          </div>
        )}
      </div>
      <div className="sheet__foot">
        <Button type="submit" variant="primary" block>
          {existing ? t.common.save : t.task.create}
        </Button>
      </div>
    </form>
  )
}
