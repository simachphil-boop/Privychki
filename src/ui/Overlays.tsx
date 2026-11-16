import { useUi } from '../store/ui'
import { useT } from '../lib/i18n'
import { Button } from './kit'
import { Sheet, useSheetClose } from './Sheet'

export function Toasts() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast__text">{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function ConfirmBody() {
  const t = useT()
  const confirm = useUi((s) => s.confirm)!
  const close = useSheetClose()
  return (
    <div className="dialog">
      <h2 className="dialog__title">{confirm.title}</h2>
      {confirm.body && <p className="dialog__body">{confirm.body}</p>}
      <div className="dialog__actions">
        <Button onClick={close}>{t.common.cancel}</Button>
        <Button
          variant={confirm.danger ? 'danger' : 'primary'}
          autoFocus
          onClick={() => {
            confirm.onConfirm()
            close()
          }}
        >
          {confirm.confirmLabel}
        </Button>
      </div>
    </div>
  )
}

export function ConfirmHost() {
  const confirm = useUi((s) => s.confirm)
  const closeConfirm = useUi((s) => s.closeConfirm)
  if (!confirm) return null
  return (
    <Sheet variant="dialog" title={confirm.title} onClose={closeConfirm}>
      <ConfirmBody />
    </Sheet>
  )
}
