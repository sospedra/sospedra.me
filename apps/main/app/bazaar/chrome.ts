import { artCssUrl, artSrc } from './art-version'
import { type Regime, regimeAt } from './decor'

/* Scene chrome: inline style patches on the baked scene elements (walls,
   seps, stairs, stalls, street pieces). Two scopes only: `id@d` covers
   every desktop regime and `id@m` the mobile tree. The map persists in
   decor.json and applies on the public page. */

export type ChromePatch = Partial<
  Record<
    | 'translate'
    | 'scale'
    | 'zIndex'
    | 'filter'
    | 'opacity'
    | 'veil'
    | 'backgroundImage'
    | 'display'
    | 'wf'
    | 'shadowOp'
    | 'shadowStop'
    | 'shadowH'
    | 'shadowY'
    | 'shadowInset',
    string
  >
>

export type ChromeMap = Record<string, ChromePatch>

export type ChromeScope = 'm' | 'd'

export const chromeScopeOf = (regime: Regime): ChromeScope =>
  regime === 'm' ? 'm' : 'd'

export const chromeScopeAt = (width: number): ChromeScope =>
  chromeScopeOf(regimeAt(width))

export const chromeKey = (id: string, scope: ChromeScope) => `${id}@${scope}`

export const chromeIdOf = (key: string) => key.split('@')[0] ?? key

export const chromeEls = (id: string): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>(`[data-edit-id="${id}"]`),
]

/* live previews write with important priority: they must beat the saved
   chrome <style>, whose declarations are !important to outrank any
   module rule */
const applyImportant = (
  el: HTMLElement,
  prop: string,
  value: string | null,
) => {
  if (value) el.style.setProperty(prop, value, 'important')
  else el.style.removeProperty(prop)
}

/* the floor's --wf channel belongs to the wall layers alone: any other
   patched id inside the floor would clear the skin on its own apply */
const ownsWf = (el: HTMLElement) => {
  const id = el.dataset.editId ?? ''
  return id.startsWith('wall:') || id.startsWith('mwall:')
}

/* a filter patch replaces the whole property; the var keeps a baked
   structural blur (seps, street pads, fg towers) under brightness tuning */
const cssValueOf = (key: keyof ChromePatch, value: string) => {
  if (key === 'filter') return `${value} var(--baked-blur,)`
  if (key === 'backgroundImage') return artCssUrl(value)
  return value
}

export const applyChromeTo = (el: HTMLElement, patch: ChromePatch) => {
  for (const [key, prop] of Object.entries(CSS_PROP)) {
    if (key === 'wf') continue
    const value = patch[key as keyof ChromePatch]
    applyImportant(
      el,
      prop,
      value ? cssValueOf(key as keyof ChromePatch, value) : null,
    )
  }
  if (!ownsWf(el)) return
  const floor = el.closest<HTMLElement>('[data-floor]')
  if (floor) {
    applyImportant(
      floor,
      '--wf',
      patch.wf ? `url("${artSrc(patch.wf)}")` : null,
    )
  }
}

const CSS_PROP: Record<keyof ChromePatch, string> = {
  translate: 'translate',
  scale: 'scale',
  zIndex: 'z-index',
  filter: 'filter',
  opacity: 'opacity',
  veil: '--veil',
  backgroundImage: 'background-image',
  display: 'display',
  wf: '--wf',
  shadowOp: '--shadow-op',
  shadowStop: '--shadow-stop',
  shadowH: '--shadow-h',
  shadowY: '--shadow-y',
  shadowInset: '--shadow-inset',
}

/* keep in sync with the .stallWrap::after var fallbacks:
   op alpha · stop gradient length % · h/y in su · inset % of width */
export const SHADOW_DEFAULTS = { op: 0.7, stop: 72, h: 18, y: -5, inset: 2 }

/* --wf lives on the floor so both wf layers inherit it */
const floorSelectorOf = (id: string): string | null => {
  if (id.startsWith('wall:')) {
    return `[data-market-index="${id.slice(5)}"][data-market-index]:not([data-mfloor])`
  }
  if (id.startsWith('mwall:')) {
    return `[data-mfloor="${id.slice(6)}"][data-mfloor]`
  }
  return null
}

/* !important lifts saved chrome above every module rule; live editor
   previews still win through important-priority inline styles */
const ruleOf = (id: string, patch: ChromePatch): string => {
  const declarations = Object.entries(patch)
    .filter(([key, value]) => key !== 'wf' && value !== undefined)
    .map(
      ([key, value]) =>
        `${CSS_PROP[key as keyof ChromePatch]}: ${cssValueOf(
          key as keyof ChromePatch,
          value,
        )} !important`,
    )
  const rules: string[] = []
  if (declarations.length > 0) {
    rules.push(`[data-edit-id="${id}"] { ${declarations.join('; ')} }`)
  }
  const floorSelector = floorSelectorOf(id)
  if (patch.wf && floorSelector) {
    rules.push(
      `${floorSelector} { --wf: url("${artSrc(patch.wf)}") !important }`,
    )
  }
  return rules.join('\n')
}

const scopedRules = (map: ChromeMap, scope: ChromeScope): string =>
  Object.entries(map)
    .filter(([key]) => key.endsWith(`@${scope}`))
    .map(([key, patch]) => ruleOf(chromeIdOf(key), patch))
    .filter((rule) => rule.length > 0)
    .join('\n')

export const chromeCss = (map: ChromeMap): string => {
  const desktop = scopedRules(map, 'd')
  const mobile = scopedRules(map, 'm')
  return [
    desktop && `@container bazaar (min-width: 700px) {\n${desktop}\n}`,
    mobile && `@container bazaar (max-width: 699.98px) {\n${mobile}\n}`,
  ]
    .filter(Boolean)
    .join('\n')
}
