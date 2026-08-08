'use client'

import { createExternalStore } from 'services/external-store'
import {
  applyChromeTo,
  type ChromeMap,
  type ChromePatch,
  chromeEls,
  chromeIdOf,
  chromeKey,
  chromeScopeOf,
} from '../chrome'
import { INITIAL_DECOR } from '../decor'
import { record, registerChromeApplier } from './history'
import { currentRegime, refreshSaveState, registerChromeSource } from './store'

export type { ChromeMap, ChromePatch } from '../chrome'

/* the live chrome map: seeded from the saved doc, persisted through
   SAVE as decor.json's chrome block; edits between saves are previews
   that die on reload */
export const chromeStore = createExternalStore<ChromeMap>(
  INITIAL_DECOR.chrome ?? {},
)

const STALE_CHROME_LS = [
  'bazaar-editor-chrome',
  'bazaar-editor-chrome-v2',
  'bazaar-editor-chrome-v3',
]

const chromeKeyOf = (id: string) =>
  chromeKey(id, chromeScopeOf(currentRegime()))

const effectivePatch = (map: ChromeMap, id: string): ChromePatch =>
  map[chromeKeyOf(id)] ?? {}

export const chromeTouched = (map: ChromeMap, id: string) =>
  Object.keys(map).some((key) => chromeIdOf(key) === id)

const applyAll = (next: ChromeMap, previous: ChromeMap) => {
  const ids = new Set(
    [...Object.keys(previous), ...Object.keys(next)].map(chromeIdOf),
  )
  for (const id of ids) {
    for (const el of chromeEls(id)) applyChromeTo(el, effectivePatch(next, id))
  }
}

const setChrome = (next: ChromeMap) => {
  applyAll(next, chromeStore.get())
  chromeStore.set(next)
}

/** scope boundaries swap which patch is live; the stage wiring calls this */
export const reapplyChrome = () => {
  const map = chromeStore.get()
  applyAll(map, map)
}

export const chromePatchOf = (id: string): ChromePatch =>
  effectivePatch(chromeStore.get(), id)

/** the live translate: the patch first, then the baked computed value */
export const chromeTranslateOf = (id: string): string => {
  const patched = chromePatchOf(id).translate
  if (patched) return patched
  const el = chromeEls(id).find((entry) => entry.offsetParent !== null)
  const computed = el ? getComputedStyle(el).translate : ''
  return computed === 'none' ? '' : computed
}

/** live (gesture-internal) chrome write, no history */
export const writeChrome = (id: string, patch: ChromePatch) => {
  const map = chromeStore.get()
  const key = chromeKeyOf(id)
  setChrome({ ...map, [key]: { ...map[key], ...patch } })
}

export const beginChromeGesture = () => chromeStore.get()

export const endChromeGesture = (before: ChromeMap) => {
  const after = chromeStore.get()
  if (after !== before) record({ scope: 'chrome', before, after })
}

export const editChrome = (id: string, patch: ChromePatch) => {
  const before = chromeStore.get()
  writeChrome(id, patch)
  record({ scope: 'chrome', before, after: chromeStore.get() })
}

export const resetChrome = (id: string) => {
  const before = chromeStore.get()
  const { [chromeKeyOf(id)]: dropped, ...rest } = before
  setChrome(rest)
  record({ scope: 'chrome', before, after: chromeStore.get() })
}

/* chrome persisted to localStorage until 2026-08-08; the doc owns it now */
export const scrubStaleChromeStorage = () => {
  for (const staleKey of STALE_CHROME_LS) localStorage.removeItem(staleKey)
}

export const exportChrome = () =>
  navigator.clipboard.writeText(JSON.stringify(chromeStore.get(), null, 2))

registerChromeApplier((map) => setChrome(map as ChromeMap))
registerChromeSource(() => chromeStore.get())
chromeStore.subscribe(refreshSaveState)
