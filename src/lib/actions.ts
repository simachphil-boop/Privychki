import { getData, useStore } from '../store/store'
import { toast } from '../store/ui'
import { getT } from './i18n'

/** Runs a change and offers to take it back for a few seconds. */
export function withUndo(run: () => void, message: string) {
  const snapshot = getData()
  run()
  toast(message, { label: getT().common.undo, run: () => useStore.getState().replaceData(snapshot) })
}
