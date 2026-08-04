import type { Route } from 'next'
import { letterKeysDisabled } from 'services/letter-keys'
import { scrollToPageEdge } from 'services/scroll-nav'
import {
  captureEvent,
  isEditableTarget,
  isModifiedOrRepeatedKey,
} from 'services/trap-guards'

export const GOTO_ROUTES: Record<string, Route> = {
  h: '/',
  p: '/papers',
  a: '/about',
  b: '/bazaar',
  m: '/manual',
  r: '/rubiks',
  u: '/uses',
  c: '/console',
  t: '/videoclub',
  v: '/travel',
}

const GOTO_WINDOW = 1400
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta'])
let gotoPending = false
let gotoTimeout: number | null = null

export const clearGotoSession = () => {
  gotoPending = false
  if (gotoTimeout !== null) {
    window.clearTimeout(gotoTimeout)
    gotoTimeout = null
  }
}

const startGotoSession = () => {
  clearGotoSession()
  gotoPending = true
  gotoTimeout = window.setTimeout(clearGotoSession, GOTO_WINDOW)
}

const resolveGotoKey = (
  event: KeyboardEvent,
  navigate: (url: Route) => void,
) => {
  if (isModifiedOrRepeatedKey(event)) return
  if (event.key === 'g') {
    captureEvent(event)
    scrollToPageEdge(-1)
    return
  }
  const route = GOTO_ROUTES[event.key]
  if (!route) return
  captureEvent(event)
  navigate(route)
}

// vim-style leader: `g` arms a goto window, the next key picks the sector.
// Capture phase, like konami: the second key must never reach single-key
// traps (`g b` warps to the bazaar instead of also triggering "back").
const handleGotoCapture = (
  event: KeyboardEvent,
  navigate: (url: Route) => void,
  isGameInputClaimed: () => boolean,
) => {
  const inactive =
    letterKeysDisabled() || isGameInputClaimed() || MODIFIER_KEYS.has(event.key)
  if (inactive) return
  if (event.isComposing || isEditableTarget(event.target)) {
    clearGotoSession()
    return
  }
  if (gotoPending) {
    clearGotoSession()
    resolveGotoKey(event, navigate)
    return
  }
  if (event.key === 'g' && !isModifiedOrRepeatedKey(event)) {
    startGotoSession()
  }
}

export const createGotoCapture =
  (navigate: (url: Route) => void, isGameInputClaimed: () => boolean) =>
  (event: KeyboardEvent) =>
    handleGotoCapture(event, navigate, isGameInputClaimed)
