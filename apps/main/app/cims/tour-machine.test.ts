import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FLY_DEBOUNCE_MS } from './flight.ts'
import {
  createTourState,
  destinationIndex,
  isAirborne,
  isEnRoute,
  type TourState,
  type TourTarget,
  transition,
} from './tour-machine.ts'

const AFTER_DEBOUNCE = FLY_DEBOUNCE_MS + 1

const launch = (
  state: TourState,
  target: TourTarget,
  atMs: number,
): TourState => transition(state, { type: 'launch', target, atMs })

const orbitingAtMountain = (index: number): TourState => {
  const flying = launch(
    createTourState(),
    { kind: 'mountain', index },
    AFTER_DEBOUNCE,
  )
  return transition(flying, { type: 'arrive' })
}

test('boots on an approach flight toward mountain 0 in slot 0', () => {
  const state = createTourState()
  assert.equal(state.phase, 'boot')
  assert.deepEqual(state.target, { kind: 'mountain', index: 0 })
  assert.equal(state.slot, 0)
  assert.deepEqual(state.assignments, [0, -1])
  assert.equal(isAirborne(state), true)
  assert.equal(isEnRoute(state), false)
})

test('launch to a new mountain flies via the free slot and assigns it', () => {
  const state = launch(
    createTourState(),
    { kind: 'mountain', index: 3 },
    AFTER_DEBOUNCE,
  )
  assert.equal(state.phase, 'flying')
  assert.deepEqual(state.target, { kind: 'mountain', index: 3 })
  assert.equal(state.phase === 'flying' && state.pendingSlot, 1)
  assert.deepEqual(state.assignments, [0, 3])
  assert.equal(isEnRoute(state), true)
})

test('launch to the mountain the current slot hosts reuses that slot', () => {
  const orbiting = orbitingAtMountain(2)
  const flying = launch(
    orbiting,
    { kind: 'mountain', index: 0 },
    AFTER_DEBOUNCE * 2,
  )
  const back = launch(
    transition(flying, { type: 'arrive' }),
    { kind: 'mountain', index: 2 },
    AFTER_DEBOUNCE * 3,
  )
  assert.equal(back.phase === 'flying' && back.pendingSlot, 1)
  assert.deepEqual(back.assignments, [0, 2])
})

test('launch inside the debounce window returns the same state', () => {
  const state = orbitingAtMountain(1)
  const blocked = launch(
    state,
    { kind: 'mountain', index: 2 },
    state.lastLaunchMs + FLY_DEBOUNCE_MS - 1,
  )
  assert.equal(blocked, state)
})

test('launch to the currently targeted mountain is a no-op', () => {
  const flying = launch(
    createTourState(),
    { kind: 'mountain', index: 2 },
    AFTER_DEBOUNCE,
  )
  assert.equal(
    launch(flying, { kind: 'mountain', index: 2 }, AFTER_DEBOUNCE * 2),
    flying,
  )
  const orbiting = transition(flying, { type: 'arrive' })
  assert.equal(
    launch(orbiting, { kind: 'mountain', index: 2 }, AFTER_DEBOUNCE * 3),
    orbiting,
  )
})

test('launch to mountain 0 during the boot approach is a no-op', () => {
  const boot = createTourState()
  const blocked = launch(
    boot,
    { kind: 'mountain', index: 0 },
    AFTER_DEBOUNCE * 5,
  )
  assert.equal(blocked, boot)
})

test('launch to a city keeps assignments and flies via the current slot', () => {
  const orbiting = orbitingAtMountain(1)
  const state = launch(orbiting, { kind: 'city', index: 4 }, AFTER_DEBOUNCE * 2)
  assert.equal(state.phase, 'flying')
  assert.deepEqual(state.target, { kind: 'city', index: 4 })
  assert.equal(state.phase === 'flying' && state.pendingSlot, orbiting.slot)
  assert.deepEqual(state.assignments, orbiting.assignments)
})

test('relaunch to the same city passes the guards', () => {
  const orbiting = orbitingAtMountain(1)
  const first = launch(orbiting, { kind: 'city', index: 4 }, AFTER_DEBOUNCE * 2)
  const again = launch(first, { kind: 'city', index: 4 }, AFTER_DEBOUNCE * 4)
  assert.notEqual(again, first)
  assert.equal(again.phase, 'flying')
})

test('after a city visit the hosted mountain is reachable again', () => {
  const orbiting = orbitingAtMountain(2)
  const atCity = transition(
    launch(orbiting, { kind: 'city', index: 0 }, AFTER_DEBOUNCE * 2),
    { type: 'arrive' },
  )
  const back = launch(
    atCity,
    { kind: 'mountain', index: 2 },
    AFTER_DEBOUNCE * 4,
  )
  assert.equal(back.phase, 'flying')
  assert.deepEqual(back.target, { kind: 'mountain', index: 2 })
})

test('arrive commits the pending slot after a mountain flight', () => {
  const flying = launch(
    createTourState(),
    { kind: 'mountain', index: 5 },
    AFTER_DEBOUNCE,
  )
  const orbiting = transition(flying, { type: 'arrive' })
  assert.equal(orbiting.phase, 'orbiting')
  assert.equal(orbiting.slot, 1)
  assert.deepEqual(orbiting.target, { kind: 'mountain', index: 5 })
  assert.equal(isAirborne(orbiting), false)
})

test('arrive after a city flight keeps the committed slot', () => {
  const orbiting = orbitingAtMountain(3)
  const atCity = transition(
    launch(orbiting, { kind: 'city', index: 1 }, AFTER_DEBOUNCE * 2),
    { type: 'arrive' },
  )
  assert.equal(atCity.phase, 'orbiting')
  assert.equal(atCity.slot, orbiting.slot)
  assert.deepEqual(atCity.target, { kind: 'city', index: 1 })
})

test('arrive while orbiting returns the same state', () => {
  const orbiting = orbitingAtMountain(1)
  assert.equal(transition(orbiting, { type: 'arrive' }), orbiting)
})

test('mid-flight redirect rebuilds the same free slot', () => {
  const toSecond = launch(
    createTourState(),
    { kind: 'mountain', index: 2 },
    AFTER_DEBOUNCE,
  )
  const redirected = launch(
    toSecond,
    { kind: 'mountain', index: 4 },
    AFTER_DEBOUNCE * 3,
  )
  assert.equal(redirected.phase === 'flying' && redirected.pendingSlot, 1)
  assert.deepEqual(redirected.assignments, [0, 4])
})

test('destinationIndex names the mountain target or the hosted mountain', () => {
  const flying = launch(
    createTourState(),
    { kind: 'mountain', index: 6 },
    AFTER_DEBOUNCE,
  )
  assert.equal(destinationIndex(flying), 6)
  const orbiting = transition(flying, { type: 'arrive' })
  assert.equal(destinationIndex(orbiting), 6)
  const toCity = launch(
    orbiting,
    { kind: 'city', index: 2 },
    AFTER_DEBOUNCE * 3,
  )
  assert.equal(destinationIndex(toCity), 6)
})
