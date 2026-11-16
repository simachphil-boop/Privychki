import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { withUndo } from '../../lib/actions'
import { nextHour } from '../../lib/dates'
import { useT } from '../../lib/i18n'
import { useStore, useToday, type ReminderInput } from '../../store/store'
import type { DateKey, ReminderRepeat } from '../../store/types'
import { toast } from '../../store/ui'
import { Button, Chip, Row, Switch } from '../../ui/kit'
import { useSheetClose } from '../../ui/Sheet'
import { DateChips, Field } from './parts'

const REPEATS: ReminderRepeat[] = ['none', 'daily', 'weekdays', 'weekly']

export function ReminderForm({ id, date }: { id?: string; date?: DateKey }) {
  const t = useT()
  const close = useSheetClose()
  const today = useToday((s) => s.today)
  const existing = useStore((s) => (id ? s.reminders.find((x) => x.id === id) : undefined))
  const notificationsOn = useStore((s) => s.settings.notifications.enabled)
  const { addReminder, updateReminder, deleteReminder } = useStore.getState()
  const [draft, setDraft] = useState<ReminderInput>(() =>
    existing
      ? { title: existing.title, time: existing.time, date: existing.date, repeat: existing.repeat, enabled: existing.enabled }
      : { title: '', time: nextHour(), date: date ?? today, repeat: 'none', enabled: true },
  )
  const [touched, setTouched] = useState(false)
  const set = (patch: Partial<ReminderInput>) => setDraft((d) => ({ ...d, ...patch }))
  const invalid = !draft.title.trim()

  const submit = () => {
    setTouched(true)
    if (invalid || !draft.time) return
    const clean = { ...draft, title: draft.title.trim() }
    if (existing) updateReminder(existing.id, clean)
    else {
      addReminder(clean)
      toast(t.reminder.added)
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
        <input className="title-input" autoFocus={!existing} value={draft.title} maxLength={140} placeholder={t.reminder.titlePlaceholder} aria-label={t.reminder.title} onChange={(e) => set({ title: e.target.value })} />
        {touched && invalid && <p className="field-error" role="alert">{t.reminder.titleRequired}</p>}

        <Field label={draft.repeat === 'none' ? t.task.date : t.reminder.startDate}>
          <DateChips value={draft.date} onChange={(d) => d && set({ date: d })} />
        </Field>
        <Field label={t.reminder.repeatLabel}>
          <div className="chips">
            {REPEATS.map((r) => (
              <Chip key={r} selected={draft.repeat === r} onClick={() => set({ repeat: r })}>{t.reminder.repeat[r]}</Chip>
            ))}
          </div>
        </Field>
        <div className="group form-group">
          <Row label={t.task.time}>
            <input type="time" required className="input input--inline" aria-label={t.task.time} value={draft.time} onChange={(e) => set({ time: e.target.value })} />
          </Row>
          <Row label={t.reminder.enabled}>
            <Switch checked={draft.enabled} onChange={(enabled) => set({ enabled })} label={t.reminder.enabled} />
          </Row>
        </div>
        {!notificationsOn && <p className="note form-note">{t.reminder.systemOff}</p>}

        {existing && (
          <div className="form-actions">
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              onClick={() => {
                withUndo(() => deleteReminder(existing.id), t.reminder.deleted)
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
          {existing ? t.common.save : t.reminder.create}
        </Button>
      </div>
    </form>
  )
}
