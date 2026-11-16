import { ChevronLeft, Minus, Plus, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { goBack } from '../lib/router'
import { useStore } from '../store/store'
import type { ColorId } from '../store/types'

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

/** Inline style that exposes a habit/goal colour to CSS as --c. */
export const tint = (color: ColorId): CSSProperties => ({ '--c': `var(--c-${color})` }) as CSSProperties

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  icon?: LucideIcon
  block?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon: Icon, block, className, children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={cx('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className)} {...rest}>
      {Icon && <Icon size={size === 'sm' ? 15 : 17} strokeWidth={2} aria-hidden />}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: LucideIcon
  size?: number
}

export function IconButton({ label, icon: Icon, size = 20, className, ...rest }: IconButtonProps) {
  return (
    <button type="button" className={cx('icon-btn', className)} aria-label={label} title={label} {...rest}>
      <Icon size={size} strokeWidth={1.75} aria-hidden />
    </button>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
  size?: 'md' | 'sm'
}

export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={cx('seg', size === 'sm' && 'seg--sm')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={cx('seg__item', o.value === value && 'is-on')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cx('switch', checked && 'is-on')}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" />
    </button>
  )
}

export function Chip({ selected, onClick, children, icon: Icon }: { selected?: boolean; onClick?: () => void; children: ReactNode; icon?: LucideIcon }) {
  return (
    <button type="button" className={cx('chip', selected && 'is-on')} aria-pressed={selected} onClick={onClick}>
      {Icon && <Icon size={14} strokeWidth={2} aria-hidden />}
      {children}
    </button>
  )
}

export function Stepper({ value, onChange, min = 1, max = 999, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label="−" disabled={value <= min} onClick={() => set(value - 1)}>
        <Minus size={16} aria-hidden />
      </button>
      <input
        className="stepper__value"
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          set(Number.isFinite(n) ? n : min)
        }}
      />
      <button type="button" aria-label="+" disabled={value >= max} onClick={() => set(value + 1)}>
        <Plus size={16} aria-hidden />
      </button>
    </div>
  )
}

interface RingProps {
  /** 0…1 */
  value: number
  size: number
  stroke?: number
  children?: ReactNode
  className?: string
}

export function ProgressRing({ value, size, stroke = 4, children, className }: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <span className={cx('ring', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ opacity: v === 0 ? 0 : 1 }}
        />
      </svg>
      {children && <span className="ring__content">{children}</span>}
    </span>
  )
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cx('bar', className)}>
      <span className="bar__fill" style={{ transform: `scaleX(${Math.min(1, Math.max(0, value))})` }} />
    </span>
  )
}

/** A checkmark that draws itself when it appears. */
export function CheckGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg className="check-glyph" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 8.4l3 3 6-6.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
    </svg>
  )
}

export function Empty({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon size={22} strokeWidth={1.5} aria-hidden />
      </span>
      <p className="empty__title">{title}</p>
      {text && <p className="empty__text">{text}</p>}
      {children && <div className="empty__action">{children}</div>}
    </div>
  )
}

export function SectionHead({ title, count, children }: { title: string; count?: string; children?: ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="section-head__title">
        {title}
        {count && <span className="section-head__count">{count}</span>}
      </h2>
      {children && <div className="section-head__actions">{children}</div>}
    </div>
  )
}

export function PageHeader({ title, eyebrow, back, backLabel, actions }: { title: string; eyebrow?: string; back?: string; backLabel?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-header__bar">
        {back !== undefined ? (
          <button type="button" className="back-link" onClick={() => goBack(back)}>
            <ChevronLeft size={18} strokeWidth={2} aria-hidden />
            {backLabel}
          </button>
        ) : (
          <span className="page-header__eyebrow">{eyebrow}</span>
        )}
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
      <h1 className="page-header__title">{title}</h1>
    </header>
  )
}

export function Avatar({ size = 36 }: { size?: number }) {
  const name = useStore((s) => s.settings.name)
  const avatar = useStore((s) => s.settings.avatar)
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {avatar ? <img src={avatar} alt="" /> : initials || '·'}
    </span>
  )
}

/** A labelled row inside a grouped list: label on the left, control on the right. */
export function Row({ label, hint, icon: Icon, children, stack, onClick }: { label: string; hint?: string; icon?: LucideIcon; children?: ReactNode; stack?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <span className="row__main">
        {Icon && <Icon className="row__icon" size={18} strokeWidth={1.75} aria-hidden />}
        <span className="row__text">
          <span className="row__label">{label}</span>
          {hint && <span className="row__hint">{hint}</span>}
        </span>
      </span>
      {children && <span className="row__control">{children}</span>}
    </>
  )
  return onClick ? (
    <button type="button" className={cx('row', 'row--button', stack && 'row--stack')} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={cx('row', stack && 'row--stack')}>{body}</div>
  )
}
