'use client'

import { createExternalStore } from 'services/external-store'
import {
  type Corner,
  type DecorDoc,
  type DecorHost,
  type DecorKind,
  type DecorNode,
  indexNodes,
  isSpotKind,
  type Placement,
  parentIdOf,
  placementAt,
  type Regime,
  regimeAt,
  spriteSrc,
} from '../decor'
import { decorStore } from '../decor-store'
import { DESKTOP_FLOORS, type FloorsConfig, MOBILE_FLOORS } from '../floors'
import type { BazaarStallId } from '../stalls-manifest'
import {
  FALLBACK_PX_PER_SU,
  SPAWN_H,
  SPAWN_H_CAP,
  SPAWN_Z,
  SPOT_DEFAULT,
} from './catalog-data'
import { record } from './history'
import { clientToCorner, editEls, hostAt, unitOf } from './probe'
import { serializeDoc } from './serialize'

/* ---------- session state ---------- */

export type Selection =
  | { kind: 'node'; id: string }
  | { kind: 'chrome'; id: string }
  | null

export type Tab = 'inspect' | 'scene' | 'add'

export type SaveState =
  | 'clean'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error'
  | 'prod'

export type DragSpawn = {
  kind: DecorKind
  ref: string
  startX: number
  startY: number
} | null

export const selectionStore = createExternalStore<Selection>(null)
export const tabStore = createExternalStore<Tab>('inspect')
export const hoverStore = createExternalStore<string | null>(null)
export const anchorPickStore = createExternalStore<string | null>(null)
export const dragSpawnStore = createExternalStore<DragSpawn>(null)
export const stageSizeStore = createExternalStore<{ w: number; h: number }>({
  w: 0,
  h: 0,
})
export const saveStore = createExternalStore<{
  state: SaveState
  message?: string
}>({ state: 'clean' })
export const keysStore = createExternalStore<boolean>(false)

export const currentRegime = (): Regime => regimeAt(stageSizeStore.get().w)

export const selectNode = (id: string) => {
  selectionStore.set({ kind: 'node', id })
  tabStore.set('inspect')
}

/* ---------- document access ---------- */

export const getNode = (id: string) =>
  decorStore.get().nodes.find((node) => node.id === id) ?? null

const setDoc = (next: DecorDoc) => decorStore.set(next)

const patchNodeIn = (
  doc: DecorDoc,
  id: string,
  patch: Partial<DecorNode>,
): DecorDoc => ({
  ...doc,
  nodes: doc.nodes.map((node) =>
    node.id === id ? { ...node, ...patch } : node,
  ),
})

export const round1 = (value: number) => Math.round(value * 10) / 10
export const round2 = (value: number) => Math.round(value * 100) / 100

/* ---------- gestures: live writes, one command per gesture ---------- */

export const beginGesture = () => decorStore.get()

export const endGesture = (before: DecorDoc) => {
  const after = decorStore.get()
  if (after !== before) record({ scope: 'doc', before, after })
}

/** single-shot node edit with history */
export const editNode = (id: string, patch: Partial<DecorNode>) => {
  const before = decorStore.get()
  setDoc(patchNodeIn(before, id, patch))
  record({ scope: 'doc', before, after: decorStore.get() })
}

/** live (gesture-internal) node write, no history */
export const writeNode = (id: string, patch: Partial<DecorNode>) =>
  setDoc(patchNodeIn(decorStore.get(), id, patch))

const forkSeed = (node: DecorNode, regime: Regime): Partial<Placement> => {
  const place = placementAt(node, regime)
  const fork: Partial<Placement> = { x: place.x, y: place.y, h: place.h }
  if (place.w !== undefined) fork.w = place.w
  if (place.sx !== undefined) fork.sx = place.sx
  if (place.sy !== undefined) fork.sy = place.sy
  return fork
}

/* placement writes land on the current regime's fork when one exists.
   The mobile tree owns its placement outright: writes at M auto-fork,
   and base writes freeze M first, so the two never cross. */
export const placementTarget = (node: DecorNode): Regime | 'base' => {
  const regime = currentRegime()
  if (regime === 'm') return 'm'
  return node.over?.[regime] ? regime : 'base'
}

const placementPatchFor = (
  node: DecorNode,
  patch: Partial<Placement>,
): Partial<DecorNode> => {
  const target = placementTarget(node)
  if (target !== 'base') {
    const fork = { ...forkSeed(node, target), ...patch }
    return { over: { ...node.over, [target]: fork } }
  }
  if (node.over?.m) return patch
  return { ...patch, over: { ...node.over, m: forkSeed(node, 'm') } }
}

export const writePlacement = (id: string, patch: Partial<Placement>) => {
  const node = getNode(id)
  if (node) writeNode(id, placementPatchFor(node, patch))
}

export const editPlacement = (id: string, patch: Partial<Placement>) => {
  const node = getNode(id)
  if (node) editNode(id, placementPatchFor(node, patch))
}

export const resolvedPlacement = (node: DecorNode): Placement =>
  placementAt(node, currentRegime())

/* ---------- regime forks and visibility ---------- */

export const forkRegime = (id: string) => {
  const node = getNode(id)
  if (!node) return
  const regime = currentRegime()
  editNode(id, { over: { ...node.over, [regime]: forkSeed(node, regime) } })
}

export const dropFork = (id: string) => {
  const node = getNode(id)
  if (!node?.over) return
  const { [currentRegime()]: dropped, ...rest } = node.over
  editNode(id, { over: Object.keys(rest).length > 0 ? rest : undefined })
}

export const toggleRegime = (id: string, regime: Regime) => {
  const node = getNode(id)
  if (!node) return
  const hide = node.hide ?? []
  const next = hide.includes(regime)
    ? hide.filter((entry) => entry !== regime)
    : [...hide, regime]
  editNode(id, { hide: next.length > 0 ? next : undefined })
}

/* ---------- node lifecycle ---------- */

const nextId = (doc: DecorDoc) => `n${doc.counter + 1}`

const appendNode = (node: DecorNode) => {
  const before = decorStore.get()
  setDoc({
    counter: before.counter + 1,
    nodes: [...before.nodes, node],
  })
  record({ scope: 'doc', before, after: decorStore.get() })
  selectNode(node.id)
}

type SpriteSize = { h: number; ratio: number }

const probeSprite = (kind: DecorKind, ref: string) =>
  new Promise<SpriteSize>((resolve) => {
    const image = new Image()
    const fallback = { h: SPAWN_H[ref] ?? 160, ratio: 1 }
    image.onload = () => {
      const h =
        SPAWN_H[ref] ??
        Math.min(
          SPAWN_H_CAP,
          Math.round(image.naturalHeight / FALLBACK_PX_PER_SU),
        )
      resolve({ h, ratio: image.naturalWidth / image.naturalHeight || 1 })
    }
    image.onerror = () => resolve(fallback)
    image.src = spriteSrc(kind, ref)
  })

/** spawn a catalog entry with its anchor under the given client point */
export const spawnAt = async (
  kind: DecorKind,
  ref: string,
  clientX: number,
  clientY: number,
) => {
  const host = hostAt(clientX, clientY) ?? 'street'
  const size = isSpotKind(kind)
    ? { h: SPOT_DEFAULT.h, ratio: SPOT_DEFAULT.w / SPOT_DEFAULT.h }
    : await probeSprite(kind, ref)
  const point = clientToCorner(host, 'tl', clientX, clientY)
  const width = size.h * size.ratio
  const doc = decorStore.get()
  const node: DecorNode = {
    id: nextId(doc),
    kind,
    ref,
    host,
    corner: 'tl',
    x: round1(point.x - width / 2),
    y: round1(point.y - size.h / 2),
    h: size.h,
    z: SPAWN_Z[kind],
  }
  if (isSpotKind(kind)) node.w = SPOT_DEFAULT.w
  appendNode(node)
}

export const duplicateNode = (id: string) => {
  const node = getNode(id)
  if (!node) return
  const doc = decorStore.get()
  appendNode({
    ...node,
    id: nextId(doc),
    x: round1(node.x + 16),
    y: round1(node.y + 16),
  })
}

/* ---------- stall slots ---------- */

const swapIn = <F extends { stalls: readonly BazaarStallId[] }>(
  floorList: F[],
  swap: Partial<Record<BazaarStallId, BazaarStallId>>,
): F[] =>
  floorList.map((floor) => ({
    ...floor,
    stalls: floor.stalls.map((id) => swap[id] ?? id) as F['stalls'],
  }))

/** exchange two stalls' slots in the current regime's tree only */
export const swapStalls = (a: BazaarStallId, b: BazaarStallId) => {
  const before = decorStore.get()
  const floors: FloorsConfig = before.floors ?? {
    desktop: DESKTOP_FLOORS,
    mobile: MOBILE_FLOORS,
  }
  const swap: Partial<Record<BazaarStallId, BazaarStallId>> = {
    [a]: b,
    [b]: a,
  }
  const next: FloorsConfig =
    currentRegime() === 'm'
      ? { ...floors, mobile: swapIn(floors.mobile, swap) }
      : { ...floors, desktop: swapIn(floors.desktop, swap) }
  setDoc({ ...before, floors: next })
  record({ scope: 'doc', before, after: decorStore.get() })
}

/* deleting a parent re-bases its children onto the parent's host, so
   chains never dangle; per-regime offsets compose fork by fork */
const absorbInto = (child: DecorNode, parent: DecorNode): DecorNode => {
  const next: DecorNode = {
    ...child,
    host: parent.host,
    x: round1(child.x + parent.x),
    y: round1(child.y + parent.y),
  }
  const regimes = new Set([
    ...Object.keys(child.over ?? {}),
    ...Object.keys(parent.over ?? {}),
  ] as Regime[])
  if (regimes.size === 0) return next
  const over: Partial<Record<Regime, Partial<Placement>>> = {}
  for (const regime of regimes) {
    const childPlace = placementAt(child, regime)
    const parentPlace = placementAt(parent, regime)
    over[regime] = {
      ...child.over?.[regime],
      x: round1(childPlace.x + parentPlace.x),
      y: round1(childPlace.y + parentPlace.y),
    }
  }
  return { ...next, over }
}

export const removeNode = (id: string) => {
  const before = decorStore.get()
  const node = before.nodes.find((entry) => entry.id === id)
  if (!node) return
  setDoc({
    ...before,
    nodes: before.nodes
      .filter((entry) => entry.id !== id)
      .map((entry) =>
        parentIdOf(entry) === id ? absorbInto(entry, node) : entry,
      ),
  })
  record({ scope: 'doc', before, after: decorStore.get() })
  selectionStore.set(null)
}

/* ---------- anchoring ---------- */

const wouldCycle = (nodeId: string, targetId: string) => {
  const byId = indexNodes(decorStore.get())
  let current = byId.get(targetId)
  for (let hop = 0; hop < 32 && current; hop += 1) {
    if (current.id === nodeId) return true
    const parentId = parentIdOf(current)
    current = parentId ? byId.get(parentId) : undefined
  }
  return false
}

/** re-anchor keeping the on-screen position; corner resets on host moves */
export const rehostNode = (
  id: string,
  host: DecorHost | `node:${string}`,
  corner: Corner = 'tl',
) => {
  const node = getNode(id)
  if (!node) return
  if (host === `node:${id}`) return
  if (host.startsWith('node:') && wouldCycle(id, host.slice(5))) return
  const el = editEls(id).find((entry) => entry.offsetParent !== null)
  if (!el) return
  const rect = el.getBoundingClientRect()
  const byId = indexNodes(decorStore.get())
  const anchorNode = host.startsWith('node:') ? byId.get(host.slice(5)) : null
  if (anchorNode) {
    const anchorEl = editEls(anchorNode.id).find(
      (entry) => entry.offsetParent !== null,
    )
    if (!anchorEl) return
    const anchorRect = anchorEl.getBoundingClientRect()
    const unit = unitOf(rootHostOfLive(anchorNode.id))
    editNode(id, {
      host,
      corner: 'tl',
      x: round1((rect.left - anchorRect.left) / unit),
      y: round1((rect.top - anchorRect.top) / unit),
      over: undefined,
    })
    return
  }
  const point = clientToCorner(host as DecorHost, corner, rect.left, rect.top)
  editNode(id, {
    host,
    corner,
    x: round1(point.x),
    y: round1(point.y),
    over: undefined,
  })
}

export const chainRootHost = (id: string): DecorHost => rootHostOfLive(id)

const rootHostOfLive = (id: string): DecorHost => {
  const byId = indexNodes(decorStore.get())
  let current = byId.get(id)
  for (let hop = 0; hop < 32 && current; hop += 1) {
    const parentId = parentIdOf(current)
    if (!parentId) return current.host as DecorHost
    current = byId.get(parentId)
  }
  return 'street'
}

/** re-express the base coordinates from another corner, same position */
export const setCorner = (id: string, corner: Corner) => {
  const node = getNode(id)
  if (!node || node.corner === corner || node.host.startsWith('node:')) return
  if (node.over) return
  const el = editEls(id).find((entry) => entry.offsetParent !== null)
  if (!el) return
  const rect = el.getBoundingClientRect()
  const clientX = corner.includes('l') ? rect.left : rect.right
  const clientY = corner.startsWith('t') ? rect.top : rect.bottom
  const point = clientToCorner(node.host as DecorHost, corner, clientX, clientY)
  editNode(id, { corner, x: round1(point.x), y: round1(point.y) })
}

/* ---------- persistence ---------- */

let savedDoc = decorStore.get()

decorStore.subscribe(() => {
  const { state } = saveStore.get()
  if (state === 'saving') return
  const dirty = decorStore.get() !== savedDoc
  if (dirty && state !== 'dirty') saveStore.set({ state: 'dirty' })
  if (!dirty && state === 'dirty') saveStore.set({ state: 'clean' })
})

export const save = async () => {
  const doc = decorStore.get()
  saveStore.set({ state: 'saving' })
  try {
    const response = await fetch('/bazaar/editor/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(doc),
    })
    if (response.status === 404) {
      await navigator.clipboard.writeText(serializeDoc(doc))
      saveStore.set({ state: 'prod', message: 'read-only build · copied json' })
      return
    }
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      saveStore.set({ state: 'error', message: body.error ?? 'save failed' })
      return
    }
    savedDoc = doc
    saveStore.set({ state: 'saved' })
  } catch {
    saveStore.set({ state: 'error', message: 'network error' })
  }
}
