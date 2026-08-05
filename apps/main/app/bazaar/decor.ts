/* The decor document. Every placed prop, glow, and arch piece lives in
   decor.json as one node. The editor mutates the document at runtime and
   saves it back to disk through the dev-only save route. */

import rawDecor from './decor.json'
import type { BazaarStallId } from './stalls-manifest'

export const DECO = '/images/bazaar/deco'
export const ARCH = '/images/bazaar/arch'

export const REGIMES = ['m', 'b', 'a', 'w'] as const
export type Regime = (typeof REGIMES)[number]

/* regime floors in stage px: M mobile · B full bleed · A container · W capped */
export const REGIME_MIN: Record<Regime, number> = {
  m: 0,
  b: 700,
  a: 1690,
  w: 2560,
}

/* the stage letterboxes past this width: black bars, no more growth */
export const STAGE_MAX = 3840

export const regimeAt = (width: number): Regime => {
  if (width < REGIME_MIN.b) return 'm'
  if (width < REGIME_MIN.a) return 'b'
  if (width < REGIME_MIN.w) return 'a'
  return 'w'
}

export type DecorKind = 'deco' | 'arch' | 'glow' | 'shadow'

export type Corner = 'tl' | 'tr' | 'bl' | 'br'

/* layout boxes a node can anchor to; node:<id> chains onto another node */
export type DecorHost =
  | `stall:${BazaarStallId}`
  | `stairs:${number}`
  | `floor:${number}`
  | `sep:${number}`
  | `mfloor:${number}`
  | `sm:${number}`
  | 'street'

export type NodeHost = DecorHost | `node:${string}`

/* x/y run from the anchor corner into the box, in the host's unit */
export type Placement = {
  x: number
  y: number
  w?: number
  h: number
  sx?: number
  sy?: number
}

export type DecorNode = Placement & {
  id: string
  kind: DecorKind
  ref: string
  host: NodeHost
  corner: Corner
  z: number
  flip?: boolean
  bright?: number
  opacity?: number
  hide?: Regime[]
  over?: Partial<Record<Regime, Partial<Placement>>>
}

export type DecorDoc = { counter: number; nodes: DecorNode[] }

export const INITIAL_DECOR = rawDecor as DecorDoc

export const spriteSrc = (kind: DecorKind, ref: string) =>
  `${kind === 'arch' ? ARCH : DECO}/${ref}.png`

export const isSpotKind = (kind: DecorKind) =>
  kind === 'glow' || kind === 'shadow'

/* editor glow palette: spawnable lighting spots */
export const GLOW_COLORS: Record<string, string> = {
  amber: 'rgb(255 190 90 / 0.5)',
  cyan: 'rgb(75 210 225 / 0.45)',
  pink: 'rgb(255 95 170 / 0.45)',
  teal: 'rgb(86 180 164 / 0.4)',
  red: 'rgb(221 96 72 / 0.45)',
  green: 'rgb(149 162 71 / 0.4)',
  black: 'rgb(0 0 0 / 0.6)',
}

/* per-stall lift off the band floor (su) and art dim, 2026-08-04 session */
export const STALL_TUNE: Record<BazaarStallId, { lift: number; dim?: number }> =
  {
    uses: { lift: 47 },
    papers: { lift: 28, dim: 0.9 },
    manual: { lift: 57 },
    console: { lift: 35.8 },
    talks: { lift: 44.4 },
    w98: { lift: 58.7 },
    games: { lift: 62 },
    travel: { lift: 57.4 },
  }

export type NodeIndex = Map<string, DecorNode>

export const indexNodes = (doc: DecorDoc): NodeIndex =>
  new Map(doc.nodes.map((node) => [node.id, node]))

export const parentIdOf = (node: DecorNode) =>
  node.host.startsWith('node:') ? node.host.slice(5) : null

const parentOf = (byId: NodeIndex, node: DecorNode) => {
  const id = parentIdOf(node)
  return id ? (byId.get(id) ?? null) : null
}

const CHAIN_CAP = 16

/** the layout box a node ultimately renders into, through anchor chains */
export const rootHostOf = (byId: NodeIndex, node: DecorNode): DecorHost => {
  let current = node
  for (let hop = 0; hop < CHAIN_CAP; hop += 1) {
    const parent = parentOf(byId, current)
    if (!parent) return current.host as DecorHost
    current = parent
  }
  return 'street'
}

/** the anchor corner a node inherits from its chain root */
export const rootCornerOf = (byId: NodeIndex, node: DecorNode): Corner => {
  let current = node
  for (let hop = 0; hop < CHAIN_CAP; hop += 1) {
    const parent = parentOf(byId, current)
    if (!parent) return current.corner
    current = parent
  }
  return 'tl'
}

export const placementAt = (node: DecorNode, regime: Regime): Placement => {
  const base: Placement = {
    x: node.x,
    y: node.y,
    w: node.w,
    h: node.h,
    sx: node.sx,
    sy: node.sy,
  }
  return { ...base, ...node.over?.[regime] }
}

/** placement in the chain root's corner space: offsets sum through parents */
export const chainPlacementAt = (
  byId: NodeIndex,
  node: DecorNode,
  regime: Regime,
): Placement => {
  const own = placementAt(node, regime)
  let x = own.x
  let y = own.y
  let current = node
  for (let hop = 0; hop < CHAIN_CAP; hop += 1) {
    const parent = parentOf(byId, current)
    if (!parent) break
    const up = placementAt(parent, regime)
    x += up.x
    y += up.y
    current = parent
  }
  return { ...own, x, y }
}

export type DecorVariant = {
  regimes: Regime[]
  hiddenIn: Regime[]
  place: Placement
}

const placeKey = (place: Placement) =>
  [place.x, place.y, place.w, place.h, place.sx, place.sy].join('|')

/** one render variant per distinct regime placement; CSS picks the live one */
export const variantsOf = (
  byId: NodeIndex,
  node: DecorNode,
): DecorVariant[] => {
  const visible = REGIMES.filter((regime) => !node.hide?.includes(regime))
  const groups = new Map<string, { regimes: Regime[]; place: Placement }>()
  for (const regime of visible) {
    const place = chainPlacementAt(byId, node, regime)
    const key = placeKey(place)
    const group = groups.get(key)
    if (group) group.regimes.push(regime)
    else groups.set(key, { regimes: [regime], place })
  }
  return [...groups.values()].map(({ regimes, place }) => ({
    regimes,
    place,
    hiddenIn: REGIMES.filter((regime) => !regimes.includes(regime)),
  }))
}
