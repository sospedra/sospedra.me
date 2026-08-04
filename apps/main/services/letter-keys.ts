import { useSyncExternalStore } from 'react'
import { readLocal, writeLocal } from 'services/storage'

// WCAG 2.1.4: bare character shortcuts must have an off switch
const LETTER_KEYS_KEY = 'midnight-io:letter-keys'
let letterKeysOff: boolean | null = null
const letterKeysListeners = new Set<() => void>()

export const letterKeysDisabled = () => {
  if (typeof window === 'undefined') return false
  letterKeysOff ??= readLocal(LETTER_KEYS_KEY) === 'off'
  return letterKeysOff
}

export const setLetterKeysEnabled = (enabled: boolean) => {
  letterKeysOff = !enabled
  writeLocal(LETTER_KEYS_KEY, enabled ? 'on' : 'off')
  for (const listener of letterKeysListeners) listener()
}

const subscribeLetterKeys = (listener: () => void) => {
  letterKeysListeners.add(listener)
  return () => {
    letterKeysListeners.delete(listener)
  }
}

export const useLetterKeysEnabled = () =>
  useSyncExternalStore(
    subscribeLetterKeys,
    () => !letterKeysDisabled(),
    () => true,
  )
