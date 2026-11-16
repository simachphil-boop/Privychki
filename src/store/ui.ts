import { create } from 'zustand'
import type { DateKey } from './types'

export type CreateKind = 'task' | 'habit' | 'reminder' | 'goal'

export type SheetState =
  | { type: 'create'; kind: CreateKind; date?: DateKey; goalId?: string }
  | { type: 'task'; id: string }
  | { type: 'habit'; id: string }
  | { type: 'reminder'; id: string }
  | { type: 'goal'; id: string }
  | { type: 'log'; habitId: string; date: DateKey }
  | { type: 'taskView' }

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

export interface ConfirmState {
  title: string
  body?: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
}

interface UiState {
  sheet: SheetState | null
  toasts: Toast[]
  confirm: ConfirmState | null
  /** The day the user is looking at, so new items land on it. */
  focusDate: DateKey | null
  setFocusDate(date: DateKey | null): void
  openSheet(sheet: SheetState): void
  closeSheet(): void
  toast(text: string, action?: Toast['action']): void
  dismissToast(id: number): void
  ask(confirm: ConfirmState): void
  closeConfirm(): void
}

let toastSeq = 0

export const useUi = create<UiState>((set, get) => ({
  sheet: null,
  toasts: [],
  confirm: null,
  focusDate: null,
  setFocusDate: (focusDate) => set({ focusDate }),
  // A lingering toast would cover the sheet's fields, so it leaves when a sheet opens.
  openSheet: (sheet) => set({ sheet, toasts: [] }),
  closeSheet: () => set({ sheet: null }),
  toast(text, action) {
    const id = ++toastSeq
    // One toast at a time keeps the screen calm; the newest wins.
    set({ toasts: [{ id, text, action }] })
    setTimeout(() => get().dismissToast(id), action ? 5000 : 2600)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  ask: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
}))

export const toast = (text: string, action?: Toast['action']) => useUi.getState().toast(text, action)
