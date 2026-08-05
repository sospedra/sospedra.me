import {
  type DecorDoc,
  indexNodes,
  isSpotKind,
  type Placement,
  rootCornerOf,
} from '../decor'
import { decorStore } from '../decor-store'
import { stageBox } from '../stage'
import {
  beginChromeGesture,
  chromePatchOf,
  endChromeGesture,
  writeChrome,
} from './chrome-store'
import { CORNER_SIGN, hostAt, pickAt, unitOf } from './probe'
import {
  anchorPickStore,
  beginGesture,
  chainRootHost,
  currentRegime,
  dragSpawnStore,
  endGesture,
  getNode,
  rehostNode,
  resolvedPlacement,
  round1,
  round2,
  selectionStore,
  selectNode,
  spawnAt,
  writePlacement,
} from './store'

export type HandleKind = 'tl' | 't' | 'tr' | 'l' | 'r' | 'bl' | 'b' | 'br'

export const HANDLES: { kind: HandleKind; cursor: string }[] = [
  { kind: 'tl', cursor: 'nwse-resize' },
  { kind: 't', cursor: 'ns-resize' },
  { kind: 'tr', cursor: 'nesw-resize' },
  { kind: 'l', cursor: 'ew-resize' },
  { kind: 'r', cursor: 'ew-resize' },
  { kind: 'bl', cursor: 'nesw-resize' },
  { kind: 'b', cursor: 'ns-resize' },
  { kind: 'br', cursor: 'nwse-resize' },
]

export const axisX = (kind: HandleKind): -1 | 0 | 1 => {
  if (kind.includes('l')) return -1
  if (kind.includes('r')) return 1
  return 0
}

export const axisY = (kind: HandleKind): -1 | 0 | 1 => {
  if (kind.includes('t')) return -1
  if (kind.includes('b')) return 1
  return 0
}

const clampK = (k: number) => Math.min(20, Math.max(0.05, k))
const clampS = (s: number) => Math.min(8, Math.max(0.05, s))

export const parsePair = (raw: string | undefined) => {
  const [x = '', y = ''] = (raw ?? '').replaceAll('px', '').split(' ')
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 }
}

type ChromeMap = ReturnType<typeof beginChromeGesture>

export type Drag =
  | {
      mode: 'node'
      id: string
      startX: number
      startY: number
      baseX: number
      baseY: number
      unit: number
      sign: { x: 1 | -1; y: 1 | -1 }
      before: DecorDoc
    }
  | {
      mode: 'chrome'
      id: string
      startX: number
      startY: number
      baseX: number
      baseY: number
      scale: number
      lockX: boolean
      before: ChromeMap
    }

export type Resize = {
  selKind: 'node' | 'chrome'
  id: string
  kind: HandleKind
  startX: number
  startY: number
  rect: DOMRect
  place: Placement
  scaleX: number
  scaleY: number
  beforeDoc: DecorDoc | null
  beforeChrome: ChromeMap | null
}

const beginNodeDrag = (id: string, event: PointerEvent): Drag | null => {
  const node = getNode(id)
  if (!node) return null
  selectNode(id)
  const byId = indexNodes(decorStore.get())
  const place = resolvedPlacement(node)
  return {
    mode: 'node',
    id,
    startX: event.clientX,
    startY: event.clientY,
    baseX: place.x,
    baseY: place.y,
    unit: unitOf(chainRootHost(id)),
    sign: CORNER_SIGN[rootCornerOf(byId, node)],
    before: beginGesture(),
  }
}

/* desktop stalls ride the flex layout: y only; the mobile tree centers
   per story row, so M unlocks the x axis */
const stallLockX = (el: HTMLElement) =>
  el.dataset.stall !== undefined && currentRegime() !== 'm'

const beginChromeDrag = (
  el: HTMLElement,
  id: string,
  event: PointerEvent,
): Drag => {
  selectionStore.set({ kind: 'chrome', id })
  const base = parsePair(chromePatchOf(id).translate ?? el.style.translate)
  return {
    mode: 'chrome',
    id,
    startX: event.clientX,
    startY: event.clientY,
    baseX: base.x,
    baseY: base.y,
    scale: stageBox().scale,
    lockX: stallLockX(el),
    before: beginChromeGesture(),
  }
}

export const applyDrag = (drag: Drag, event: PointerEvent) => {
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (drag.mode === 'node') {
    writePlacement(drag.id, {
      x: round1(drag.baseX + (dx / drag.unit) * drag.sign.x),
      y: round1(drag.baseY + (dy / drag.unit) * drag.sign.y),
    })
    return
  }
  const x = drag.lockX ? drag.baseX : Math.round(drag.baseX + dx / drag.scale)
  const y = Math.round(drag.baseY + dy / drag.scale)
  writeChrome(drag.id, { translate: `${x}px ${y}px` })
}

const grownH = (place: Placement, k: number) => round1(Math.max(2, place.h * k))

const grownW = (place: Placement, k: number) =>
  round1(Math.max(2, (place.w ?? place.h) * k))

const bothPatch = (place: Placement, spot: boolean, k: number) => {
  const patch: Partial<Placement> = { h: grownH(place, k) }
  if (spot) patch.w = grownW(place, k)
  return patch
}

const widthPatch = (place: Placement, spot: boolean, k: number) =>
  spot ? { w: grownW(place, k) } : { sx: clampS(round2((place.sx ?? 1) * k)) }

const heightPatch = (place: Placement, spot: boolean, k: number) =>
  spot ? { h: grownH(place, k) } : { sy: clampS(round2((place.sy ?? 1) * k)) }

const resizePatch = (state: Resize, spot: boolean, dx: number, dy: number) => {
  const ux = axisX(state.kind)
  const uy = axisY(state.kind)
  const kx = clampK(1 + (ux * dx) / state.rect.width)
  const ky = clampK(1 + (uy * dy) / state.rect.height)
  if (ux !== 0 && uy !== 0) {
    return bothPatch(state.place, spot, clampK((kx + ky) / 2))
  }
  if (ux !== 0) return widthPatch(state.place, spot, kx)
  return heightPatch(state.place, spot, ky)
}

const applyNodeResize = (state: Resize, dx: number, dy: number) => {
  const node = getNode(state.id)
  if (!node) return
  writePlacement(state.id, resizePatch(state, isSpotKind(node.kind), dx, dy))
}

const applyChromeResize = (state: Resize, dx: number, dy: number) => {
  const ux = axisX(state.kind)
  const uy = axisY(state.kind)
  const kx = ux === 0 ? 1 : clampK(1 + (ux * dx) / state.rect.width)
  const ky = uy === 0 ? 1 : clampK(1 + (uy * dy) / state.rect.height)
  const both = ux !== 0 && uy !== 0 ? clampK((kx + ky) / 2) : null
  const sx = clampS(round2(state.scaleX * (both ?? kx)))
  const sy = clampS(round2(state.scaleY * (both ?? ky)))
  writeChrome(state.id, { scale: `${sx} ${sy}` })
}

export const applyResize = (state: Resize, event: PointerEvent) => {
  const dx = event.clientX - state.startX
  const dy = event.clientY - state.startY
  if (state.selKind === 'node') applyNodeResize(state, dx, dy)
  else applyChromeResize(state, dx, dy)
}

export const settleResize = (state: Resize | null) => {
  if (!state) return
  if (state.beforeDoc) endGesture(state.beforeDoc)
  if (state.beforeChrome) endChromeGesture(state.beforeChrome)
}

export const settleDrag = (state: Drag | null) => {
  if (!state) return
  if (state.mode === 'node') endGesture(state.before)
  else endChromeGesture(state.before)
}

export const nodeResizeState = (
  id: string,
  kind: HandleKind,
  event: React.PointerEvent,
  rect: DOMRect,
): Resize => {
  const live = getNode(id)
  return {
    selKind: 'node',
    id,
    kind,
    startX: event.clientX,
    startY: event.clientY,
    rect,
    place: live ? resolvedPlacement(live) : { x: 0, y: 0, h: 0 },
    scaleX: 1,
    scaleY: 1,
    beforeDoc: beginGesture(),
    beforeChrome: null,
  }
}

export const chromeResizeState = (
  id: string,
  kind: HandleKind,
  event: React.PointerEvent,
  rect: DOMRect,
): Resize => {
  const scale = parsePair(chromePatchOf(id).scale)
  return {
    selKind: 'chrome',
    id,
    kind,
    startX: event.clientX,
    startY: event.clientY,
    rect,
    place: { x: 0, y: 0, h: 0 },
    scaleX: scale.x || 1,
    scaleY: scale.y || 1,
    beforeDoc: null,
    beforeChrome: beginChromeGesture(),
  }
}

const handleAnchorPick = (nodeId: string, event: PointerEvent) => {
  event.preventDefault()
  event.stopPropagation()
  anchorPickStore.set(null)
  const picked = pickAt(event.clientX, event.clientY)
  if (picked && picked.id !== nodeId && getNode(picked.id)) {
    rehostNode(nodeId, `node:${picked.id}`)
    return
  }
  const host = hostAt(event.clientX, event.clientY)
  if (host) rehostNode(nodeId, host)
}

const beginDrag = (event: PointerEvent): Drag | null => {
  const picked = pickAt(event.clientX, event.clientY)
  if (!picked) {
    selectionStore.set(null)
    return null
  }
  event.preventDefault()
  event.stopPropagation()
  return getNode(picked.id)
    ? beginNodeDrag(picked.id, event)
    : beginChromeDrag(picked.el, picked.id, event)
}

export const handleDown = (
  event: PointerEvent,
  drag: { current: Drag | null },
) => {
  if (event.button !== 0) return
  if ((event.target as HTMLElement).closest('[data-editor-ui]')) return
  if (dragSpawnStore.get()) return
  const picking = anchorPickStore.get()
  if (picking) {
    handleAnchorPick(picking, event)
    return
  }
  drag.current = beginDrag(event)
}

export const swallowClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.closest('[data-editor-ui]')) return
  if (target.closest('[data-edit-id]')) {
    event.preventDefault()
    event.stopPropagation()
  }
}

const SPAWN_SLOP_PX = 5

/** a catalog drag that ends over the scene places there; a click centers */
export const spawnFromDrag = (event: PointerEvent) => {
  const spawn = dragSpawnStore.get()
  if (!spawn) return false
  dragSpawnStore.set(null)
  const distance = Math.hypot(
    event.clientX - spawn.startX,
    event.clientY - spawn.startY,
  )
  const overUi = (event.target as HTMLElement).closest('[data-editor-ui]')
  if (distance < SPAWN_SLOP_PX || overUi) {
    const box = stageBox()
    spawnAt(
      spawn.kind,
      spawn.ref,
      box.left + (box.width * box.scale) / 2,
      box.top + (box.height * box.scale) / 2,
    )
    return true
  }
  spawnAt(spawn.kind, spawn.ref, event.clientX, event.clientY)
  return true
}
