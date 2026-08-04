import { debounce } from 'es-toolkit'
import { useEffect, useRef } from 'react'
import {
  captureEvent,
  isEditableTarget,
  isModifiedOrRepeatedKey,
} from 'services/trap-guards'

const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const
const KONAMI_WINDOW = 3000
const SUCCESS_KEY_HOLD_MS = 750
const konamiDirectionalKeys = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])
const konamiListeners = new Set<() => void>()
let konamiCursor = 0
let konamiTimeout: number | null = null
let successKey: string | null = null

export const clearKonamiSession = () => {
  konamiCursor = 0
  if (konamiTimeout !== null) {
    window.clearTimeout(konamiTimeout)
    konamiTimeout = null
  }
}

const startKonamiSession = () => {
  clearKonamiSession()
  konamiCursor = 1
  konamiTimeout = window.setTimeout(clearKonamiSession, KONAMI_WINDOW)
}

const scheduleSuccessKeyClear = debounce(() => {
  successKey = null
}, SUCCESS_KEY_HOLD_MS)

export const clearSuccessKey = () => {
  successKey = null
  scheduleSuccessKeyClear.cancel()
}

const dropModifiedKonamiInput = (event: KeyboardEvent) => {
  if (konamiCursor > 0 && !konamiDirectionalKeys.has(event.key)) {
    captureEvent(event)
  }
  clearKonamiSession()
}

const advanceKonamiSequence = (event: KeyboardEvent) => {
  // Directional keys stay available to local UI (the Papers remote, native
  // scrolling, games) while Konami listens in capture phase. The tail keys
  // are consumed so `b`/`a` cannot trigger global routes mid-sequence.
  if (!konamiDirectionalKeys.has(event.key)) captureEvent(event)

  if (event.key !== KONAMI_SEQUENCE[konamiCursor]) {
    if (event.key === KONAMI_SEQUENCE[0]) startKonamiSession()
    else clearKonamiSession()
    return
  }

  konamiCursor += 1
  if (konamiCursor !== KONAMI_SEQUENCE.length) return

  clearKonamiSession()
  successKey = event.key
  scheduleSuccessKeyClear()
  for (const listener of konamiListeners) listener()
}

const captureKonamiInput = (
  event: KeyboardEvent,
  isGameInputClaimed: () => boolean,
) => {
  // arcade pages own the keyboard: their steering walks the konami prefix,
  // and the trap would eat the next space/5/enter for the whole window
  if (isGameInputClaimed()) return

  if (successKey === event.key) {
    captureEvent(event)
    scheduleSuccessKeyClear()
    return
  }

  if (event.isComposing || isEditableTarget(event.target)) {
    clearKonamiSession()
    return
  }

  if (isModifiedOrRepeatedKey(event)) {
    dropModifiedKonamiInput(event)
    return
  }

  if (konamiCursor === 0) {
    if (event.key === KONAMI_SEQUENCE[0]) startKonamiSession()
    return
  }

  advanceKonamiSequence(event)
}

export const createKonamiCapture =
  (isGameInputClaimed: () => boolean) => (event: KeyboardEvent) =>
    captureKonamiInput(event, isGameInputClaimed)

export const releaseKonamiSuccessKey = (event: KeyboardEvent) => {
  if (event.key !== successKey) return
  clearSuccessKey()
}

export const useKonami = (handler: () => void) => {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const notify = () => handlerRef.current()
    konamiListeners.add(notify)
    return () => {
      konamiListeners.delete(notify)
    }
  }, [])
}
