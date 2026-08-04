import type { HideBelow } from './decor-manifest'

export const translateOf = (el: HTMLElement) => {
  const [x = '0', y = '0'] = el.style.translate.split(' ')
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 }
}

const visibleFloors = () =>
  [...document.querySelectorAll<HTMLElement>('[data-floor]')].filter(
    (f) => f.offsetParent !== null,
  )

const marketFloors = () =>
  visibleFloors().filter((f) => f.dataset.marketIndex !== undefined)

const streetFloor = () =>
  visibleFloors().find((f) => f.dataset.marketIndex === undefined) ?? null

export const targetHost = (target: string) => {
  if (target === 'street') return streetFloor()
  const [kind, index] = target.split(':')
  if (kind === 'floor') return marketFloors()[Number(index)] ?? null
  return document.querySelector<HTMLElement>(`[data-bazaar-sep="${index}"]`)
}

/** the street keeps its own su; measure whatever var(--su) resolves
    to inside the host instead of assuming the page scale */
export const hostSu = (host: HTMLElement) => {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:absolute;visibility:hidden;height:0;width:calc(var(--su) * 1000)'
  host.appendChild(probe)
  const su = probe.getBoundingClientRect().width / 1000
  probe.remove()
  return su || 1
}

/** the floor or sep band under the viewport center; nearest floor otherwise */
export const centerHost = () => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  for (const hit of document.elementsFromPoint(cx, cy)) {
    const floor = (hit as HTMLElement).closest<HTMLElement>(
      '[data-market-index]',
    )
    if (floor)
      return { host: floor, target: `floor:${floor.dataset.marketIndex}` }
    const sep = (hit as HTMLElement).closest<HTMLElement>('[data-bazaar-sep]')
    if (sep) return { host: sep, target: `sep:${sep.dataset.bazaarSep}` }
    const street = (hit as HTMLElement).closest<HTMLElement>('[data-floor]')
    if (street && street.dataset.marketIndex === undefined) {
      return { host: street, target: 'street' }
    }
  }
  const nearest = marketFloors().toSorted((a, b) => {
    const da = Math.abs(a.getBoundingClientRect().top + a.offsetHeight / 2 - cy)
    const db = Math.abs(b.getBoundingClientRect().top + b.offsetHeight / 2 - cy)
    return da - db
  })[0]
  if (!nearest) return null
  return { host: nearest, target: `floor:${nearest.dataset.marketIndex}` }
}

/** px per sim unit, measured from any visible market floor (597 su tall) */
export const measureSu = () => {
  const market = visibleFloors().find((f) => f.dataset.marketIndex)
  return market ? market.getBoundingClientRect().height / 597 : 1
}

/** smallest edit target under the pointer — occluded items stay pickable */
export const pickAt = (x: number, y: number) => {
  const hits = new Set<HTMLElement>()
  for (const el of document.elementsFromPoint(x, y)) {
    const target = (el as HTMLElement).closest<HTMLElement>('[data-edit-id]')
    if (target) hits.add(target)
  }
  return [...hits].toSorted((a, b) => {
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    return ra.width * ra.height - rb.width * rb.height
  })[0]
}

/** everything anchored to rootId, transitively; drags follow, scales don't */
export const dependentsOf = (rootId: string) => {
  const all = [...document.querySelectorAll<HTMLElement>('[data-edit-anchor]')]
  const out: HTMLElement[] = []
  const queue = [rootId]
  while (queue.length > 0) {
    const id = queue.pop()
    for (const el of all) {
      if (el.dataset.editAnchor !== id || out.includes(el)) continue
      out.push(el)
      if (el.dataset.editId) queue.push(el.dataset.editId)
    }
  }
  return out
}

export type LayoutEntry = {
  id: string
  floor: number
  host?: string
  spawn?: string
  x: number
  y: number
  w: number
  h: number
  scale: number
  scaleY: number
  z: number | null
  bright: number
  opacity: number
  hideBelow?: HideBelow
  skin?: string
  anchor?: string
  ax?: number
  ay?: number
}

type Rel = (v: number) => number

/* spawn origin, visibility floor, and the sep/wall skin, read off the element */
const editFlags = (el: HTMLElement) => {
  const flags: Pick<LayoutEntry, 'spawn' | 'hideBelow' | 'skin'> = {}
  if (el.dataset.editSpawn) flags.spawn = el.dataset.editSpawn
  const hideBelow = Number(el.dataset.editHideBelow)
  if (hideBelow === 700 || hideBelow === 1690) flags.hideBelow = hideBelow
  const skinUrl = /url\("([^"]+)"\)/.exec(el.style.backgroundImage)?.[1]
  const skin =
    skinUrl?.split('/').pop()?.replace('.png', '') ?? el.dataset.editSkin
  if (skin) flags.skin = skin
  return flags
}

const anchorFields = (
  el: HTMLElement,
  floor: HTMLElement | null,
  rect: DOMRect,
  rel: Rel,
): Pick<LayoutEntry, 'anchor' | 'ax' | 'ay'> => {
  const anchorId = el.dataset.editAnchor
  if (!anchorId) return {}
  const target =
    floor?.querySelector<HTMLElement>(`[data-edit-id="${anchorId}"]`) ??
    document.querySelector<HTMLElement>(`[data-edit-id="${anchorId}"]`)
  if (!target) return {}
  const ar = target.getBoundingClientRect()
  return {
    anchor: anchorId,
    ax: rel(rect.left - ar.left),
    ay: rel(rect.top - ar.top),
  }
}

export const layoutEntry = (el: HTMLElement, su: number): LayoutEntry => {
  const floor = el.closest<HTMLElement>('[data-floor]')
  const sep = el.closest<HTMLElement>('[data-bazaar-sep]')
  const street = floor && floor.dataset.marketIndex === undefined ? floor : null
  const rect = el.getBoundingClientRect()
  const stageRect = floor
    ?.querySelector<HTMLElement>('[data-stage]')
    ?.getBoundingClientRect()
  const containerRect =
    sep?.getBoundingClientRect() ??
    (stageRect && stageRect.width > 0 ? stageRect : undefined) ??
    floor?.getBoundingClientRect()
  const localSu = street ? hostSu(street) : su
  const rel: Rel = (v) => Math.round((v / localSu) * 10) / 10
  const entry: LayoutEntry = {
    id: el.dataset.editId ?? '?',
    floor: floor ? visibleFloors().indexOf(floor) : -1,
    x: rel(rect.left - (containerRect?.left ?? 0)),
    y: rel(rect.top - (containerRect?.top ?? 0)),
    w: rel(rect.width),
    h: rel(rect.height),
    bright:
      Number.parseFloat(
        /brightness\(([\d.]+)\)/.exec(el.style.filter)?.[1] ?? '1',
      ) || 1,
    opacity: Number.parseFloat(el.style.opacity || '1') || 1,
    scale: Number.parseFloat(el.style.scale.split(' ')[0] || '1') || 1,
    scaleY:
      Number.parseFloat(
        el.style.scale.split(' ')[1] ?? el.style.scale.split(' ')[0] ?? '1',
      ) || 1,
    z: el.style.zIndex === '' ? null : Number.parseInt(el.style.zIndex, 10),
    ...editFlags(el),
    ...anchorFields(el, floor, rect, rel),
  }
  if (sep) entry.host = `sep:${sep.dataset.bazaarSep}`
  if (street) entry.host = 'street'
  return entry
}
