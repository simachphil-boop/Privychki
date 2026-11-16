import { Archive, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../../lib/i18n'
import { navigate } from '../../lib/router'
import { useStore, type GoalInput } from '../../store/store'
import type { Milestone } from '../../store/types'
import { toast, useUi } from '../../store/ui'
import { Button, Chip, Row } from '../../ui/kit'
import { useSheetClose } from '../../ui/Sheet'
import { ColorDots, Field, ListEditor } from './parts'

export function GoalForm({ id }: { id?: string }) {
  const t = useT()
  const close = useSheetClose()
  const existing = useStore((s) => (id ? s.goals.find((x) => x.id === id) : undefined))
  const habits = useStore((s) => s.habits).filter((h) => !h.archivedAt)
  const { addGoal, updateGoal, deleteGoal } = useStore.getState()
  const ask = useUi((s) => s.ask)
  const [draft, setDraft] = useState<GoalInput>(() =>
    existing
      ? { title: existing.title, description: existing.description, color: existing.color, deadline: existing.deadline, milestones: existing.milestones, habitIds: existing.habitIds }
      : { title: '', description: '', color: 'pine', deadline: null, milestones: [], habitIds: [] },
  )
  const [touched, setTouched] = useState(false)
  const set = (patch: Partial<GoalInput>) => setDraft((d) => ({ ...d, ...patch }))
  const invalid = !draft.title.trim()

  const submit = () => {
    setTouched(true)
    if (invalid) return
    const clean = { ...draft, title: draft.title.trim(), description: draft.description.trim(), milestones: draft.milestones.filter((m) => m.title.trim()) }
    if (existing) updateGoal(existing.id, clean)
    else {
      const newId = addGoal(clean)
      toast(t.goal.added)
      navigate(`goals/${newId}`)
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
        <input className="title-input" autoFocus={!existing} value={draft.title} maxLength={100} placeholder={t.goal.titlePlaceholder} aria-label={t.goal.title} onChange={(e) => set({ title: e.target.value })} />
        {touched && invalid && <p className="field-error" role="alert">{t.goal.titleRequired}</p>}
        <textarea className="ghost-area" rows={1} value={draft.description} maxLength={600} placeholder={t.goal.descriptionPlaceholder} aria-label={t.goal.description} onChange={(e) => set({ description: e.target.value })} />

        <Field label={t.goal.milestones}>
          <ListEditor<Milestone> items={draft.milestones} onChange={(milestones) => set({ milestones })} placeholder={t.goal.milestonePlaceholder} make={(mid, title) => ({ id: mid, title, done: false })} />
        </Field>

        {habits.length > 0 && (
          <Field label={t.goal.linkedHabits}>
            <div className="chips">
              {habits.map((h) => {
                const on = draft.habitIds.includes(h.id)
                return (
                  <Chip key={h.id} selected={on} onClick={() => set({ habitIds: on ? draft.habitIds.filter((x) => x !== h.id) : [...draft.habitIds, h.id] })}>{h.name}</Chip>
                )
              })}
            </div>
          </Field>
        )}

        <div className="group form-group">
          <Row label={t.goal.deadline}>
            <input type="date" className="input input--inline" aria-label={t.goal.deadline} value={draft.deadline ?? ''} onChange={(e) => set({ deadline: e.target.value || null })} />
          </Row>
          <Row label={t.habit.color} stack>
            <ColorDots value={draft.color} onChange={(color) => set({ color })} />
          </Row>
        </div>

        {existing && (
          <div className="form-actions">
            <Button
              size="sm"
              icon={Archive}
              onClick={() => {
                updateGoal(existing.id, { archivedAt: existing.archivedAt ? null : new Date().toISOString() })
                toast(existing.archivedAt ? t.goal.restored : t.goal.archived)
                close()
                if (!existing.archivedAt) navigate('goals', true)
              }}
            >
              {existing.archivedAt ? t.common.restore : t.common.archive}
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              onClick={() =>
                ask({
                  title: t.goal.deleteTitle(existing.title),
                  body: t.goal.deleteBody,
                  confirmLabel: t.common.delete,
                  danger: true,
                  onConfirm: () => {
                    close()
                    navigate('goals', true)
                    deleteGoal(existing.id)
                    toast(t.goal.deleted)
                  },
                })
              }
            >
              {t.common.delete}
            </Button>
          </div>
        )}
      </div>
      <div className="sheet__foot">
        <Button type="submit" variant="primary" block>
          {existing ? t.common.save : t.goal.create}
        </Button>
      </div>
    </form>
  )
}
