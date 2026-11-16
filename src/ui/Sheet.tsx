import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../lib/i18n'
import { cx } from './kit'

const CloseCtx = createContext<() => void>(() => {})
/** Closes the enclosing sheet with its exit animation. */
export const useSheetClose = () => useContext(CloseCtx)

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface SheetProps {
  title?: string
  /** Rendered in the header in place of a title, e.g. a segmented control. */
  header?: ReactNode
  onClose: () => void
  children: ReactNode
  variant?: 'sheet' | 'dialog'
}

let openCount = 0

export function Sheet({ title, header, onClose, children, variant = 'sheet' }: SheetProps) {
  const t = useT()
  const [closing, setClosing] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(() => onCloseRef.current(), reduced() ? 0 : 180)
  }, [])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus()
    openCount++
    document.documentElement.classList.add('is-locked')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
      if (e.key !== 'Tab' || !panel.current) return
      // Keep keyboard focus inside the sheet.
      const items = panel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (--openCount === 0) document.documentElement.classList.remove('is-locked')
      previous?.focus?.()
    }
  }, [close])

  return (
    <CloseCtx.Provider value={close}>
      <div className={cx('overlay', `overlay--${variant}`, closing && 'is-closing')}>
        <div className="overlay__scrim" onClick={close} />
        <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
          {variant === 'sheet' && (
            <div className="sheet__head">
              {header ?? <h2 className="sheet__title">{title}</h2>}
              <button type="button" className="icon-btn icon-btn--soft" aria-label={t.common.close} onClick={close}>
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </CloseCtx.Provider>
  )
}
