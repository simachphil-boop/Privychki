import { Archive, ChevronDown, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { weekdayLabel } from '../../lib/format'
import { useLang, useT } from '../../lib/i18n'
import { navigate } from '../../lib/router'
import { TEMPLATE_IDS, fromTemplate } from '../../lib/templates'
import { useStore, useToday, type HabitInput } from '../../store/store'
import type { ChecklistItem, HabitType, Schedule } from '../../store/types'
import { toast, useUi } from '../../store/ui'
import { HABIT_ICONS, habitIcon } from '../../ui/icons'
import { Button, Chip, Row, Segmented, Stepper, Switch, cx, tint } from '../../ui/kit'
import { useSheetClose } from '../../ui/Sheet'
import { CategoryChips, ColorDots, Field, ListEditor } from './parts'

const TYPES: HabitType[] = ['boolean', 'numeric', 'duration', 'checklist']
const KINDS: Schedule['kind'][] = ['daily', 'weekdays', 'perWeek', 'perMonth', 'interval']
const GOAL_PRESETS = [21, 30, 66, 100]

const defaultSchedule = (kind: Schedule['kind']): Schedule => {
  switch (kind) {
    case 'daily':
      return { kind }
    case 'weekdays':
      return { kind, days: [1, 2, 3, 4, 5] }
    case 'perWeek':
      return { kind, count: 3 }
    case 'perMonth':
      return { kind, count: 4 }
    case 'interval':
      return { kind, every: 2 }
  }
}

export function HabitForm({ id }: { id?: string }) {
  const t = useT()
  const lang = useLang()
  const close = useSheetClose()
  const today = useToday((s) => s.today)
  const weekStart = useStore((s) => s.settings.weekStart)
  const existing = useStore((s) => (id ? s.habits.find((x) => x.id === id) : undefined))
  const { addHabit, updateHabit, deleteHabit } = useStore.getState()
  const ask = useUi((s) => s.ask)

  const [draft, setDraft] = useState<HabitInput>(() => {
    if (existing) {
      const { id: _id, createdAt: _c, archivedAt: _a, ...rest } = existing
      return rest
    }
    return { name: '', description: '', icon: 'check', color: 'pine', category: 'health', type: 'boolean', target: 1, unit: '', checklist: [], schedule: { kind: 'daily' }, reminderTime: null, startDate: today, goalCount: null }
  })
  const [touched, setTouched] = useState(false)
  const [iconsOpen, setIconsOpen] = useState(false)
  const set = (patch: Partial<HabitInput>) => setDraft((d) => ({ ...d, ...patch }))
  const s = draft.schedule
  const Icon = habitIcon(draft.icon)

  const errors = {
    name: !draft.name.trim() && t.habit.nameRequired,
    target: (draft.type === 'numeric' || draft.type === 'duration') && !(draft.target >= 1) && t.habit.targetRequired,
    checklist: draft.type === 'checklist' && draft.checklist.filter((i) => i.title.trim()).length === 0 && t.habit.checklistRequired,
    days: s.kind === 'weekdays' && s.days.length === 0 && t.habit.daysRequired,
  }
  const invalid = Object.values(errors).some(Boolean)

  const setType = (type: HabitType) =>
    set({ type, target: type === 'numeric' ? (draft.type === 'numeric' ? draft.target : 8) : type === 'duration' ? (draft.type === 'duration' ? draft.target : 30) : 1 })

  const submit = () => {
    setTouched(true)
    if (invalid) return
    const clean: HabitInput = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      unit: draft.unit.trim(),
      checklist: draft.checklist.map((i) => ({ ...i, title: i.title.trim() })).filter((i) => i.title),
    }
    if (existing) updateHabit(existing.id, clean)
    else {
      addHabit(clean)
      toast(t.habit.added)
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
      <div className="sheet__body" style={tint(draft.color)}>
        {!existing && !draft.name && (
          <div className="chips chips--scroll templates" aria-label={t.habit.templates}>
            {TEMPLATE_IDS.map((tid) => (
              <Chip key={tid} onClick={() => setDraft(fromTemplate(tid, t.templates[tid], today))}>{t.templates[tid].name}</Chip>
            ))}
          </div>
        )}

        <div className="habit-head">
          <button type="button" className="tile tile--lg" aria-label={t.habit.iconAndColor} aria-expanded={iconsOpen} onClick={() => setIconsOpen((v) => !v)}>
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            <span className="tile__more">
              <ChevronDown size={11} strokeWidth={2.5} aria-hidden />
            </span>
          </button>
          <div className="habit-head__text">
            <input className="title-input" autoFocus={!existing} value={draft.name} maxLength={80} placeholder={t.habit.namePlaceholder} aria-label={t.habit.name} onChange={(e) => set({ name: e.target.value })} />
            <textarea className="ghost-area" rows={1} value={draft.description} maxLength={400} placeholder={t.habit.descriptionPlaceholder} aria-label={t.habit.description} onChange={(e) => set({ description: e.target.value })} />
          </div>
        </div>
        {touched && errors.name && <p className="field-error" role="alert">{errors.name}</p>}

        {iconsOpen && (
          <div className="icon-picker">
            <ColorDots value={draft.color} onChange={(color) => set({ color })} />
            <div className="icon-grid" role="radiogroup" aria-label={t.habit.icon}>
              {Object.entries(HABIT_ICONS).map(([key, I]) => (
                <button key={key} type="button" role="radio" aria-checked={draft.icon === key} aria-label={key} className={cx('icon-grid__item', draft.icon === key && 'is-on')} onClick={() => set({ icon: key })}>
                  <I size={19} strokeWidth={1.75} aria-hidden />
                </button>
              ))}
            </div>
          </div>
        )}

        <Field label={t.habit.category}>
          <CategoryChips value={draft.category} onChange={(category) => set({ category })} />
        </Field>

        <Field label={t.habit.typeLabel} error={touched && (errors.target || errors.checklist)}>
          <Segmented<HabitType> label={t.habit.typeLabel} value={draft.type} onChange={setType} options={TYPES.map((v) => ({ value: v, label: t.habit.types[v] }))} />
          {draft.type === 'numeric' && (
            <div className="inline-fields">
              <input className="input input--num" inputMode="numeric" aria-label={t.habit.target} value={draft.target || ''} onChange={(e) => set({ target: Math.min(99999, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0) })} />
              <input className="input" value={draft.unit} maxLength={20} placeholder={t.habit.unitPlaceholder} aria-label={t.habit.unit} onChange={(e) => set({ unit: e.target.value })} />
              <span className="inline-fields__suffix">{t.habit.perDay}</span>
            </div>
          )}
          {draft.type === 'duration' && (
            <div className="inline-fields">
              <Stepper value={draft.target} min={1} max={1440} onChange={(target) => set({ target })} label={t.habit.minutes} />
              <span className="inline-fields__suffix">{t.habit.minutesPerDay}</span>
              <div className="chips inline-fields__presets">
                {[10, 20, 30, 60].map((m) => (
                  <Chip key={m} selected={draft.target === m} onClick={() => set({ target: m })}>{m}</Chip>
                ))}
              </div>
            </div>
          )}
          {draft.type === 'checklist' && (
            <ListEditor<ChecklistItem> items={draft.checklist} onChange={(checklist) => set({ checklist })} placeholder={t.habit.checklistPlaceholder} make={(iid, title) => ({ id: iid, title })} />
          )}
          {draft.type === 'boolean' && <p className="note field__note">{t.habit.typeHints.boolean}</p>}
        </Field>

        <Field label={t.habit.scheduleLabel} error={touched && errors.days}>
          <div className="chips">
            {KINDS.map((k) => (
              <Chip key={k} selected={s.kind === k} onClick={() => s.kind !== k && set({ schedule: defaultSchedule(k) })}>{t.habit.kinds[k]}</Chip>
            ))}
          </div>
          {s.kind === 'weekdays' && (
            <div className="weekdays">
              {Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={s.days.includes(d)}
                  aria-label={weekdayLabel(d, lang, 'long')}
                  className={cx('weekdays__day', s.days.includes(d) && 'is-on')}
                  onClick={() => set({ schedule: { kind: 'weekdays', days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d].sort() } })}
                >
                  {weekdayLabel(d, lang, 'short')}
                </button>
              ))}
            </div>
          )}
          {s.kind === 'perWeek' && (
            <div className="inline-fields">
              <Stepper value={s.count} min={1} max={7} onChange={(count) => set({ schedule: { kind: 'perWeek', count } })} label={t.habit.kinds.perWeek} />
              <span className="inline-fields__suffix">{t.habit.timesPerWeek(s.count)}</span>
            </div>
          )}
          {s.kind === 'perMonth' && (
            <div className="inline-fields">
              <Stepper value={s.count} min={1} max={31} onChange={(count) => set({ schedule: { kind: 'perMonth', count } })} label={t.habit.kinds.perMonth} />
              <span className="inline-fields__suffix">{t.habit.timesPerMonth(s.count)}</span>
            </div>
          )}
          {s.kind === 'interval' && (
            <div className="inline-fields">
              <span className="inline-fields__suffix">{t.habit.every}</span>
              <Stepper value={s.every} min={2} max={90} onChange={(every) => set({ schedule: { kind: 'interval', every } })} label={t.habit.kinds.interval} />
              <span className="inline-fields__suffix">{t.habit.everyNDays(s.every)}</span>
            </div>
          )}
        </Field>

        <div className="group form-group">
          <Row label={t.habit.reminder}>
            {draft.reminderTime !== null && (
              <input type="time" className="input input--inline" aria-label={t.habit.reminderTime} value={draft.reminderTime} onChange={(e) => e.target.value && set({ reminderTime: e.target.value })} />
            )}
            <Switch checked={draft.reminderTime !== null} onChange={(on) => set({ reminderTime: on ? '09:00' : null })} label={t.habit.reminder} />
          </Row>
          <Row label={t.habit.startDate}>
            <input type="date" required className="input input--inline" aria-label={t.habit.startDate} value={draft.startDate} onChange={(e) => e.target.value && set({ startDate: e.target.value })} />
          </Row>
          <Row label={t.habit.goal} hint={t.habit.goalHint} stack>
            <div className="chips">
              <Chip selected={draft.goalCount === null} onClick={() => set({ goalCount: null })}>{t.habit.noGoal}</Chip>
              {GOAL_PRESETS.map((n) => (
                <Chip key={n} selected={draft.goalCount === n} onClick={() => set({ goalCount: n })}>{n}</Chip>
              ))}
              {draft.goalCount !== null && <Stepper value={draft.goalCount} min={1} max={9999} onChange={(goalCount) => set({ goalCount })} label={t.habit.goal} />}
            </div>
          </Row>
        </div>

        {existing && (
          <div className="form-actions">
            <Button
              size="sm"
              icon={Archive}
              onClick={() => {
                updateHabit(existing.id, { archivedAt: existing.archivedAt ? null : new Date().toISOString() })
                toast(existing.archivedAt ? t.habit.restored : t.habit.archived)
                close()
                if (!existing.archivedAt) navigate('habits', true)
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
                  title: t.habit.deleteTitle(existing.name),
                  body: t.habit.deleteBody,
                  confirmLabel: t.common.delete,
                  danger: true,
                  onConfirm: () => {
                    close()
                    navigate('habits', true)
                    deleteHabit(existing.id)
                    toast(t.habit.deleted)
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
          {existing ? t.common.save : t.habit.create}
        </Button>
      </div>
    </form>
  )
}
