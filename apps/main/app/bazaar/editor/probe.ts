import type { Corner, DecorHost } from '../decor'
import { stageBox } from '../stage'
import { DIMS } from '../stall-catalog'
import type { BazaarStallId } from '../stalls-manifest'

export type Picked = { el: HTMLElement; id: string }

const visible = (el: HTMLElement) => el.offsetParent !== null

const visibleMatch = (selector: string) => {
  const all = [...document.querySelectorAll<HTMLElement>(selector)]
  return all.find(visible) ?? all[0] ?? null
}

const HOST_SELECTOR: Record<string, (key: string) => string> = {
  stall: (key) => `[data-stall="${key}"]`,
  stairs: (key) => `[data-edit-id="stairs:${key}"]`,
  floor: (key) => `[data-market-index="${key}"]:not([data-mfloor])`,
  sep: (key) => `[data-bazaar-sep="${key}"]`,
  mfloor: (key) => `[data-mfloor="${key}"]`,
  sm: (key) => `[data-sm="${key}"]`,
  street: () => '[data-market-scene]',
}

export const hostEl = (host: DecorHost): HTMLElement | null => {
  const [group = '', key = ''] = host.split(':')
  const selector = HOST_SELECTOR[group]
  return selector ? visibleMatch(selector(key)) : null
}

const measureVar = (host: HTMLElement, expression: string) => {
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;height:0;width:${expression}`
  host.appendChild(probe)
  const width = probe.getBoundingClientRect().width
  probe.remove()
  return width / 1000
}

/** client px per host unit: stall dims, su, or the mobile mu (mfloor-h/597).
    Rect-based, so the sim scale is already included. */
export const unitOf = (host: DecorHost): number => {
  const el = hostEl(host)
  if (!el) return 1
  if (host.startsWith('stall:')) {
    const dims = DIMS[host.slice(6) as BazaarStallId]
    return el.getBoundingClientRect().width / dims.width || 1
  }
  const mobile = host.startsWith('mfloor:') || host.startsWith('sm:')
  const expression = mobile
    ? 'calc(var(--mfloor-h) / 597 * 1000)'
    : 'calc(var(--su) * 1000)'
  return measureVar(el, expression) || 1
}

export const CORNER_SIGN: Record<Corner, { x: 1 | -1; y: 1 | -1 }> = {
  tl: { x: 1, y: 1 },
  tr: { x: -1, y: 1 },
  bl: { x: 1, y: -1 },
  br: { x: -1, y: -1 },
}

/** a client point expressed in host units from the given corner */
export const clientToCorner = (
  host: DecorHost,
  corner: Corner,
  clientX: number,
  clientY: number,
) => {
  const el = hostEl(host)
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  const unit = unitOf(host)
  const originX = corner.includes('l') ? rect.left : rect.right
  const originY = corner.startsWith('t') ? rect.top : rect.bottom
  const sign = CORNER_SIGN[corner]
  return {
    x: ((clientX - originX) * sign.x) / unit,
    y: ((clientY - originY) * sign.y) / unit,
  }
}

type HostMatcher = (el: HTMLElement) => DecorHost | null

const matchData =
  (attribute: string, prefix: string): HostMatcher =>
  (el) => {
    const box = el.closest<HTMLElement>(`[${attribute}]`)
    const key = box?.getAttribute(attribute)
    return key === null || key === undefined
      ? null
      : (`${prefix}${key}` as DecorHost)
  }

/* spawn/anchor host priority: the smallest sensible box wins */
const HOST_MATCHERS: HostMatcher[] = [
  matchData('data-stall', 'stall:'),
  (el) => {
    const id = el.closest<HTMLElement>('[data-edit-id^="stairs:"]')?.dataset
      .editId
    return (id as DecorHost) ?? null
  },
  matchData('data-bazaar-sep', 'sep:'),
  matchData('data-sm', 'sm:'),
  matchData('data-mfloor', 'mfloor:'),
  (el) => {
    const box = el.closest<HTMLElement>('[data-market-index]')
    if (!box || box.dataset.mfloor !== undefined) return null
    return `floor:${box.dataset.marketIndex}` as DecorHost
  },
  (el) => (el.closest('[data-market-scene]') ? 'street' : null),
]

export const hostAt = (clientX: number, clientY: number): DecorHost | null => {
  for (const hit of document.elementsFromPoint(clientX, clientY)) {
    for (const matcher of HOST_MATCHERS) {
      const host = matcher(hit as HTMLElement)
      if (host) return host
    }
  }
  return null
}

/** smallest edit target under the pointer — occluded items stay pickable */
export const pickAt = (clientX: number, clientY: number): Picked | null => {
  const hits = new Set<HTMLElement>()
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    const target = (el as HTMLElement).closest<HTMLElement>('[data-edit-id]')
    if (target) hits.add(target)
  }
  const smallest = [...hits].toSorted((a, b) => {
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    return ra.width * ra.height - rb.width * rb.height
  })[0]
  if (!smallest) return null
  return { el: smallest, id: smallest.dataset.editId ?? '' }
}

export const editEl = (id: string): HTMLElement | null =>
  visibleMatch(`[data-edit-id="${id}"]`)

export const editEls = (id: string): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>(`[data-edit-id="${id}"]`),
]

/** every visible chrome target (edit ids the decor document does not own) */
export const chromeIds = (isNode: (id: string) => boolean): string[] => {
  const ids = new Set<string>()
  for (const el of document.querySelectorAll<HTMLElement>('[data-edit-id]')) {
    const id = el.dataset.editId
    if (id && !isNode(id) && visible(el)) ids.add(id)
  }
  return [...ids]
}

export const stageScale = () => stageBox().scale || 1

export const translateOf = (el: HTMLElement) => {
  const [x = '0', y = '0'] = el.style.translate.split(' ')
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 }
}
