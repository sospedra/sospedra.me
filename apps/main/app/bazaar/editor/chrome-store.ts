'use client'

import { createExternalStore } from 'services/external-store'
import { record, registerChromeApplier } from './history'
import { editEls } from './probe'
import { currentRegime } from './store'

/* Scene chrome: inline style patches on the baked scene elements (walls,
   seps, stairs, stalls, street pieces). Patches key by `id@regime`, so a
   position tuned in one regime never leaks into another and the mobile
   tree tunes apart from the desktop trees. Preview only: the values
   graduate into CSS by hand. */

export type ChromePatch = Partial<
  Record<
    | 'translate'
    | 'scale'
    | 'zIndex'
    | 'filter'
    | 'opacity'
    | 'backgroundImage'
    | 'display'
    | 'wf',
    string
  >
>

export type ChromeMap = Record<string, ChromePatch>

const CHROME_LS = 'bazaar-editor-chrome'

export const chromeStore = createExternalStore<ChromeMap>({})

const idOfKey = (key: string) => key.split('@')[0] ?? key

const chromeKeyOf = (id: string) => `${id}@${currentRegime()}`

const effectivePatch = (map: ChromeMap, id: string): ChromePatch =>
  map[chromeKeyOf(id)] ?? {}

export const chromeTouched = (map: ChromeMap, id: string) =>
  Object.keys(map).some((key) => idOfKey(key) === id)

const applyChromeTo = (el: HTMLElement, patch: ChromePatch) => {
  el.style.translate = patch.translate ?? ''
  el.style.scale = patch.scale ?? ''
  el.style.zIndex = patch.zIndex ?? ''
  el.style.filter = patch.filter ?? ''
  el.style.opacity = patch.opacity ?? ''
  el.style.display = patch.display ?? ''
  el.style.backgroundImage = patch.backgroundImage ?? ''
  const floor = el.closest<HTMLElement>('[data-floor]')
  if (!floor) return
  if (patch.wf) floor.style.setProperty('--wf', `url("${patch.wf}")`)
  else floor.style.removeProperty('--wf')
}

const applyAll = (next: ChromeMap, previous: ChromeMap) => {
  const ids = new Set(
    [...Object.keys(previous), ...Object.keys(next)].map(idOfKey),
  )
  for (const id of ids) {
    for (const el of editEls(id)) applyChromeTo(el, effectivePatch(next, id))
  }
}

const setChrome = (next: ChromeMap) => {
  applyAll(next, chromeStore.get())
  chromeStore.set(next)
  try {
    localStorage.setItem(CHROME_LS, JSON.stringify(next))
  } catch {
    /* storage full or blocked: the live styles still stand */
  }
}

/** regime boundaries swap which patch is live; the stage wiring calls this */
export const reapplyChrome = () => {
  const map = chromeStore.get()
  applyAll(map, map)
}

export const chromePatchOf = (id: string): ChromePatch =>
  effectivePatch(chromeStore.get(), id)

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

/* sessions saved before regime scoping carry bare ids: treat them as B */
const migrateKeys = (raw: ChromeMap): ChromeMap =>
  Object.fromEntries(
    Object.entries(raw).map(([key, patch]) => [
      key.includes('@') ? key : `${key}@b`,
      patch,
    ]),
  )

export const restoreChromeFromStorage = () => {
  try {
    const raw = localStorage.getItem(CHROME_LS)
    if (raw) setChrome(migrateKeys(JSON.parse(raw) as ChromeMap))
  } catch {
    /* corrupt payload: start clean */
  }
}

export const exportChrome = () =>
  navigator.clipboard.writeText(JSON.stringify(chromeStore.get(), null, 2))

registerChromeApplier((map) => setChrome(map as ChromeMap))
