import { match } from 'ts-pattern'
import { FLY_DEBOUNCE_MS } from './flight.ts'

export type SlotIndex = 0 | 1

export type TourTarget =
  | { kind: 'mountain'; index: number }
  | { kind: 'city'; index: number }

type TourContext = {
  target: TourTarget
  slot: SlotIndex
  assignments: readonly [number, number]
  lastLaunchMs: number
}

export type TourState =
  | (TourContext & { phase: 'boot'; pendingSlot: SlotIndex })
  | (TourContext & { phase: 'flying'; pendingSlot: SlotIndex })
  | (TourContext & { phase: 'orbiting' })

export type TourEvent =
  | { type: 'launch'; target: TourTarget; atMs: number }
  | { type: 'arrive' }

export const createTourState = (): TourState => ({
  phase: 'boot',
  target: { kind: 'mountain', index: 0 },
  slot: 0,
  pendingSlot: 0,
  assignments: [0, -1],
  lastLaunchMs: 0,
})

export const otherSlot = (slot: SlotIndex): SlotIndex => (slot === 0 ? 1 : 0)

export const plannedSlot = (
  state: TourState,
  target: TourTarget,
): SlotIndex => {
  if (target.kind === 'city') return state.slot
  return state.assignments[state.slot] === target.index
    ? state.slot
    : otherSlot(state.slot)
}

const canLaunch = (
  state: TourState,
  target: TourTarget,
  atMs: number,
): boolean => {
  if (atMs - state.lastLaunchMs < FLY_DEBOUNCE_MS) return false
  const repeatsMountain =
    target.kind === 'mountain' &&
    state.target.kind === 'mountain' &&
    state.target.index === target.index
  return !repeatsMountain
}

const withAssignment = (
  assignments: readonly [number, number],
  slot: SlotIndex,
  target: TourTarget,
): readonly [number, number] => {
  if (target.kind === 'city') return assignments
  return slot === 0
    ? [target.index, assignments[1]]
    : [assignments[0], target.index]
}

export const transition = (state: TourState, event: TourEvent): TourState =>
  match(event)
    .returnType<TourState>()
    .with({ type: 'launch' }, ({ target, atMs }) => {
      if (!canLaunch(state, target, atMs)) return state
      const pendingSlot = plannedSlot(state, target)
      return {
        phase: 'flying',
        target,
        slot: state.slot,
        pendingSlot,
        assignments: withAssignment(state.assignments, pendingSlot, target),
        lastLaunchMs: atMs,
      }
    })
    .with({ type: 'arrive' }, () => {
      if (state.phase === 'orbiting') return state
      return {
        phase: 'orbiting',
        target: state.target,
        slot: state.target.kind === 'mountain' ? state.pendingSlot : state.slot,
        assignments: state.assignments,
        lastLaunchMs: state.lastLaunchMs,
      }
    })
    .exhaustive()

export const isEnRoute = (state: TourState): boolean => state.phase === 'flying'

export const isAirborne = (state: TourState): boolean =>
  state.phase !== 'orbiting'

export const destinationIndex = (state: TourState): number =>
  state.target.kind === 'mountain'
    ? state.target.index
    : state.assignments[state.slot]
