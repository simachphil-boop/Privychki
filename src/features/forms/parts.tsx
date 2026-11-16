import { Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { addDays } from '../../lib/dates'
import { useT } from '../../lib/i18n'
import { uid, useToday } from '../../store/store'
import { CATEGORIES, COLORS, type CategoryId, type ColorId, type DateKey } from '../../store/types'
import { Chip, cx, tint } from '../../ui/kit'

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string | false }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {children}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
}

/** Today / Tomorrow shortcuts next to a native date picker. */
export function DateChips({ value, onChange, allowNone }: { value: DateKey | null; onChange: (v: DateKey | null) => void; allowNone?: boolean }) {
  const t = useT()
  const today = useToday((s) => s.today)
  const tomorrow = addDays(today, 1)
  return (
    <div className="chips">
      <Chip selected={value === today} onClick={() => onChange(today)}>{t.common.today}</Chip>
      <Chip selected={value === tomorrow} onClick={() => onChange(tomorrow)}>{t.common.tomorrow}</Chip>
      {allowNone && <Chip selected={value === null} onClick={() => onChange(null)}>{t.task.noDate}</Chip>}
      <input
        type="date"
        className={cx('input', 'input--inline', value && value !== today && value !== tomorrow && 'is-set')}
        aria-label={t.task.date}
        value={value ?? ''}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </div>
  )
}

export function TimeInput({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  const t = useT()
  return (
    <span className="time-input">
      <input type="time" className="input input--inline" aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} />
      {value && (
        <button type="button" className="icon-btn icon-btn--soft" aria-label={t.common.clear} onClick={() => onChange(null)}>
          <X size={14} strokeWidth={2} aria-hidden />
        </button>
      )}
    </span>
  )
}

export function CategoryChips({ value, onChange }: { value: CategoryId; onChange: (v: CategoryId) => void }) {
  const t = useT()
  return (
    <div className="chips">
      {CATEGORIES.map((c) => (
        <Chip key={c} selected={value === c} onClick={() => onChange(c)}>{t.cat[c]}</Chip>
      ))}
    </div>
  )
}

export function ColorDots({ value, onChange }: { value: ColorId; onChange: (v: ColorId) => void }) {
  const t = useT()
  return (
    <div className="dots" role="radiogroup" aria-label={t.habit.color}>
      {COLORS.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={t.colors[c]} className={cx('dot', value === c && 'is-on')} style={tint(c)} onClick={() => onChange(c)} />
      ))}
    </div>
  )
}

/** Editable list of short text items: checklist steps, goal milestones. */
export function ListEditor<T extends { id: string; title: string }>({ items, onChange, placeholder, make }: { items: T[]; onChange: (v: T[]) => void; placeholder: string; make: (id: string, title: string) => T }) {
  const t = useT()
  const [draft, setDraft] = useState('')
  const add = () => {
    const title = draft.trim()
    if (!title) return
    onChange([...items, make(uid(), title)])
    setDraft('')
  }
  return (
    <div className="list-editor">
      {items.map((item) => (
        <div key={item.id} className="list-editor__item">
          <input className="input" value={item.title} aria-label={placeholder} maxLength={100} onChange={(e) => onChange(items.map((x) => (x.id === item.id ? { ...x, title: e.target.value } : x)))} />
          <button type="button" className="icon-btn" aria-label={t.common.delete} onClick={() => onChange(items.filter((x) => x.id !== item.id))}>
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      ))}
      <div className="list-editor__item">
        <input
          className="input"
          value={draft}
          placeholder={placeholder}
          maxLength={100}
          enterKeyHint="done"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" className="icon-btn" aria-label={t.common.add} disabled={!draft.trim()} onClick={add}>
          <Plus size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  )
}
