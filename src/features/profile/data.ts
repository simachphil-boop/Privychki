import { ImportError, parseImport } from '../../lib/backup'
import { getT } from '../../lib/i18n'
import { useStore } from '../../store/store'
import { toast, useUi } from '../../store/ui'

/** Opens a file picker and resolves with the chosen file's text. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/** Import flow: pick, validate, confirm replacement, apply. */
export async function importFromFile(confirmReplace: boolean) {
  const t = getT()
  const file = await pickFile('application/json,.json')
  if (!file) return
  try {
    if (file.size > 20 * 1024 * 1024) throw new ImportError('too-big')
    const data = parseImport(await file.text())
    const apply = () => {
      useStore.getState().replaceData(data)
      toast(t.profile.imported(data.habits.length, data.tasks.length))
    }
    if (confirmReplace)
      useUi.getState().ask({ title: t.profile.importTitle, body: t.profile.importBody(data.habits.length, data.tasks.length), confirmLabel: t.profile.importConfirm, onConfirm: apply })
    else apply()
  } catch (e) {
    toast(e instanceof ImportError ? t.profile.importInvalid : t.profile.importFailed)
  }
}

/** Reads an image and returns a small square JPEG data URL. */
export async function readAvatar(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no-canvas')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.86)
}
