import { useStore } from '../store/store'
import type { Lang } from '../store/types'
import { en } from '../locales/en'
import { ru, type Dict } from '../locales/ru'

const DICTS: Record<Lang, Dict> = { ru, en }

export const useLang = (): Lang => useStore((s) => s.settings.lang)
export const useT = (): Dict => DICTS[useLang()]
export const getT = (): Dict => DICTS[useStore.getState().settings.lang]
export type { Dict }
