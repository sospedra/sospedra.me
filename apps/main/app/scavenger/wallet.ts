import { match } from 'ts-pattern'
import { DISCS } from './discs.ts'

export const DISCS_PER_PAGE = 2
export const PAGE_COUNT = Math.ceil(DISCS.length / DISCS_PER_PAGE)

export type Slot = { page: number; side: 'a' | 'b' }

export function slotOf(disc: number): Slot {
  return {
    page: Math.floor(disc / DISCS_PER_PAGE),
    side: disc % DISCS_PER_PAGE === 0 ? 'a' : 'b',
  }
}

const lastSlot = slotOf(DISCS.length - 1)

// a b-side disc shows once its page lies flipped, one spread past its a-side
export const MAX_SPREAD =
  lastSlot.side === 'b' ? lastSlot.page + 1 : lastSlot.page
export const SPREAD_COUNT = MAX_SPREAD + 1
// the fan settles onto the cover spread, so no page crosses another
export const BOOT_SPREAD = 0

// where the ejected disc hovers, relative to the viewport center
export type FloatFrom = { dx: number; dy: number; size: number }

export type WalletState =
  | { phase: 'boot' }
  | { phase: 'opening' }
  | { phase: 'browse'; spread: number }
  | { phase: 'eject'; spread: number; disc: number }
  | { phase: 'out'; spread: number; disc: number; from: FloatFrom | null }
  | { phase: 'return'; spread: number; disc: number; from: FloatFrom | null }
  | { phase: 'insert'; spread: number; disc: number }
  | { phase: 'closing' }

export type WalletEvent =
  | { type: 'OPEN' }
  | { type: 'BOOTED' }
  | { type: 'FLIP'; direction: 1 | -1 }
  | { type: 'PULL'; disc: number }
  | { type: 'EJECTED'; from: FloatFrom | null }
  | { type: 'PUT_BACK' }
  | { type: 'RETURNED' }
  | { type: 'INSERTED' }
  | { type: 'CLOSE' }

export const INITIAL_STATE: WalletState = { phase: 'boot' }

export const clampSpread = (value: number): number =>
  Math.min(MAX_SPREAD, Math.max(0, value))

export function spreadDiscs(spread: number): number[] {
  const left = spread > 0 ? DISCS_PER_PAGE * (spread - 1) + 1 : -1
  const right = spread < PAGE_COUNT ? DISCS_PER_PAGE * spread : -1
  return [left, right].filter((disc) => disc >= 0 && disc < DISCS.length)
}

function pull(state: WalletState, disc: number): WalletState {
  if (state.phase !== 'browse') return state
  if (!spreadDiscs(state.spread).includes(disc)) return state
  return { phase: 'eject', spread: state.spread, disc }
}

export function reduce(state: WalletState, event: WalletEvent): WalletState {
  return match(event)
    .with(
      { type: 'OPEN' },
      (): WalletState =>
        state.phase === 'boot' ? { phase: 'opening' } : state,
    )
    .with(
      { type: 'BOOTED' },
      (): WalletState =>
        state.phase === 'boot' || state.phase === 'opening'
          ? { phase: 'browse', spread: BOOT_SPREAD }
          : state,
    )
    .with(
      { type: 'FLIP' },
      ({ direction }): WalletState =>
        state.phase === 'browse'
          ? { phase: 'browse', spread: clampSpread(state.spread + direction) }
          : state,
    )
    .with({ type: 'PULL' }, ({ disc }): WalletState => pull(state, disc))
    .with(
      { type: 'EJECTED' },
      ({ from }): WalletState =>
        state.phase === 'eject' ? { ...state, phase: 'out', from } : state,
    )
    .with(
      { type: 'PUT_BACK' },
      (): WalletState =>
        state.phase === 'out' ? { ...state, phase: 'return' } : state,
    )
    .with(
      { type: 'RETURNED' },
      (): WalletState =>
        state.phase === 'return'
          ? { phase: 'insert', spread: state.spread, disc: state.disc }
          : state,
    )
    .with(
      { type: 'INSERTED' },
      (): WalletState =>
        state.phase === 'insert'
          ? { phase: 'browse', spread: state.spread }
          : state,
    )
    .with(
      { type: 'CLOSE' },
      (): WalletState =>
        state.phase === 'browse' ? { phase: 'closing' } : state,
    )
    .exhaustive()
}

export type PagePose = { ry: number; z: number }

// reference wallet constants: flipped pages pile left past -172deg,
// resting pages fan right from -6deg, depth thins the stack
export function pageTransform(page: number, spread: number): PagePose {
  const flipped = page < spread
  const depth = flipped ? spread - 1 - page : page - spread
  const ry = flipped ? -172 - depth * 1.1 : -6 + depth * 0.9
  return { ry, z: (PAGE_COUNT - depth) * 1.6 }
}

// zip close: sleeves lie truly flat, far edges dipping away from the
// viewer, so the folded cover clears every plane
export function closedPageTransform(page: number): PagePose {
  return { ry: 0.4 + page * 0.2, z: (PAGE_COUNT - page) * 1.2 }
}

const FLIP_DRAG_X_PX = 48
const FLIP_DRAG_Y_PX = 36
/* above thumb-tap slop: a sloppy tap must never turn a page */
const PORTRAIT_FLIP_Y_PX = 56

/* the portrait book hinges on X: only a decisive vertical swipe flips,
   and an upward swipe lifts the page, so it advances */
export function portraitDragFlip(dx: number, dy: number): 1 | -1 | null {
  if (Math.abs(dy) < PORTRAIT_FLIP_Y_PX) return null
  if (Math.abs(dx) > Math.abs(dy)) return null
  return dy < 0 ? 1 : -1
}

/* the desktop wallet keeps its drag-the-content feel on both axes */
export function landscapeDragFlip(dx: number, dy: number): 1 | -1 | null {
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (Math.abs(dx) < FLIP_DRAG_X_PX) return null
    return dx > 0 ? -1 : 1
  }
  if (Math.abs(dy) < FLIP_DRAG_Y_PX) return null
  return dy < 0 ? -1 : 1
}

export const spreadLabel = (spread: number): string =>
  `SPREAD ${spread + 1} / ${SPREAD_COUNT}`

export const heldDisc = (state: WalletState): number | null =>
  state.phase === 'eject' ||
  state.phase === 'out' ||
  state.phase === 'return' ||
  state.phase === 'insert'
    ? state.disc
    : null
