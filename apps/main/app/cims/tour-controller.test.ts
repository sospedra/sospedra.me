import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Vector3 } from 'three'
import type { CimsSnapshot, CimsStore } from './cims-store.ts'
import { FLY_DEBOUNCE_MS } from './flight.ts'
import { createRig } from './rig.ts'
import type { SlotManager } from './slot-manager.ts'
import { createTourController } from './tour-controller.ts'
import type { FlightTrail } from './trail.ts'

const INITIAL_SNAPSHOT: CimsSnapshot = {
  ready: false,
  target: { kind: 'mountain', index: 0 },
  seqIndex: 0,
  enRoute: false,
  distanceKm: 0,
  autoOn: true,
  surfaceMode: 'contour',
  exaggeration: 2.8,
  peakLabels: [],
}

const createStoreFake = (): CimsStore => {
  let value = INITIAL_SNAPSHOT
  return {
    get: () => value,
    set: (next) => {
      value = next
    },
    subscribe: () => () => {},
  }
}

type SlotFake = {
  active: boolean
  center: Vector3
  approachRange: number
  altitudeOffset: number
  peaks: { name: string; elev: number; pos: Vector3 }[]
}

const createSlotFake = (): SlotFake => ({
  active: false,
  center: new Vector3(),
  approachRange: 2600,
  altitudeOffset: 330,
  peaks: [],
})

const mountainPeaks = (mountainIndex: number) =>
  [0, 1, 2].map((peakOrdinal) => ({
    name: `peak-${mountainIndex}-${peakOrdinal}`,
    elev: 1000 + mountainIndex,
    pos: new Vector3(),
  }))

const createHarness = () => {
  const store = createStoreFake()
  const rig = createRig()
  const slots = [createSlotFake(), createSlotFake()]
  const builds: { slot: SlotFake; mountainIndex: number }[] = []
  const visibilityCalls: SlotFake[] = []
  const slotManager = {
    slots,
    buildSlot: (slot: SlotFake, mountainIndex: number) => {
      builds.push({ slot, mountainIndex })
      slot.active = true
      slot.center.set(mountainIndex * 10_000, 400 + mountainIndex, 0)
      slot.peaks = mountainPeaks(mountainIndex)
    },
    applyVisibility: (slot: SlotFake) => {
      visibilityCalls.push(slot)
    },
    sampleActive: () => 0,
  } as unknown as SlotManager
  const sfxCalls: string[] = []
  const sfx = {
    resume: () => {},
    click: () => {},
    travel: () => sfxCalls.push('travel'),
    arrive: () => sfxCalls.push('arrive'),
    flightStart: () => sfxCalls.push('flightStart'),
    flightStop: () => sfxCalls.push('flightStop'),
    dispose: () => {},
  }
  const trailCalls: string[] = []
  const trail = {
    head: new Vector3(),
    build: () => trailCalls.push('build'),
    update: () => {},
    hide: () => trailCalls.push('hide'),
    dispose: () => {},
  } as unknown as FlightTrail
  const clock = { nowMs: 10_000 }
  const controller = createTourController({
    mountainCount: 3,
    cityData: [{ x: 5000, z: 5000, h: 50 }],
    store,
    rig,
    slotManager,
    trail,
    sfx,
    focus: new Vector3(),
    focusT: new Vector3(),
    camPos: new Vector3(0, 30_000, 60_000),
    now: () => clock.nowMs,
    quiet: () => false,
    exaggeration: () => 2.8,
    surfaceMode: () => 'contour',
    sampleAny: () => 0,
    heightAtEx: () => 0,
  })
  const tick = () => {
    clock.nowMs += FLY_DEBOUNCE_MS + 1
  }
  return {
    store,
    rig,
    slots,
    builds,
    visibilityCalls,
    sfxCalls,
    trailCalls,
    controller,
    tick,
  }
}

test('boot builds slot 0, publishes mountain 0 at rest, returns a trail-less plan', () => {
  const harness = createHarness()
  const plan = harness.controller.boot()
  assert.deepEqual(harness.builds, [
    { slot: harness.slots[0], mountainIndex: 0 },
  ])
  const snapshot = harness.store.get()
  assert.deepEqual(snapshot.target, { kind: 'mountain', index: 0 })
  assert.equal(snapshot.enRoute, false)
  assert.equal(snapshot.peakLabels.length, 2)
  assert.equal(plan.showTrail, false)
  assert.equal(harness.controller.airborne(), true)
  assert.equal(harness.controller.plan(), plan)
})

test('flyToMountain builds the free slot and publishes the en-route leg', () => {
  const harness = createHarness()
  harness.controller.boot()
  harness.tick()
  harness.controller.flyToMountain(1)
  assert.deepEqual(harness.builds.at(-1), {
    slot: harness.slots[1],
    mountainIndex: 1,
  })
  const snapshot = harness.store.get()
  assert.deepEqual(snapshot.target, { kind: 'mountain', index: 1 })
  assert.equal(snapshot.enRoute, true)
  assert.equal(snapshot.seqIndex, 1)
  assert.equal(snapshot.distanceKm > 0, true)
  assert.deepEqual(snapshot.peakLabels, [
    { name: 'peak-1-0', elev: 1001 },
    { name: 'peak-1-1', elev: 1001 },
  ])
  assert.deepEqual(harness.sfxCalls, ['travel', 'flightStart'])
  assert.deepEqual(harness.trailCalls, ['build'])
  assert.equal(harness.controller.plan()?.showTrail, true)
  assert.equal(harness.controller.destIndex(), 1)
})

test('arrive retires the other slot, snaps the pose, and lands the store', () => {
  const harness = createHarness()
  harness.controller.boot()
  harness.tick()
  harness.controller.flyToMountain(1)
  harness.controller.arrive()
  const snapshot = harness.store.get()
  assert.equal(snapshot.enRoute, false)
  assert.equal(snapshot.distanceKm, 0)
  assert.equal(harness.controller.airborne(), false)
  assert.equal(harness.controller.plan(), null)
  assert.equal(harness.slots[0].active, false)
  assert.equal(harness.visibilityCalls.at(-1), harness.slots[0])
  assert.deepEqual(harness.sfxCalls.slice(-2), ['flightStop', 'arrive'])
  assert.deepEqual(harness.trailCalls.at(-1), 'hide')
  assert.equal(harness.rig.range, harness.rig.rangeT)
  assert.equal(harness.rig.autoT, 0)
  assert.equal(harness.rig.showT, 0)
})

test('a second launch inside the debounce window does nothing', () => {
  const harness = createHarness()
  harness.controller.boot()
  harness.tick()
  harness.controller.flyToMountain(1)
  harness.controller.flyToMountain(2)
  assert.equal(harness.builds.length, 2)
  assert.deepEqual(harness.store.get().target, { kind: 'mountain', index: 1 })
})

test('flyToCity clears peaks, skips slot builds, and lands at the city', () => {
  const harness = createHarness()
  harness.controller.boot()
  harness.tick()
  harness.controller.flyToCity(0)
  const enRouteSnapshot = harness.store.get()
  assert.deepEqual(enRouteSnapshot.target, { kind: 'city', index: 0 })
  assert.equal(enRouteSnapshot.seqIndex, 0)
  assert.deepEqual(enRouteSnapshot.peakLabels, [])
  assert.equal(harness.builds.length, 1)
  harness.controller.arrive()
  assert.equal(harness.controller.destIndex(), 0)
  const focusAfterArrive = harness.store.get()
  assert.deepEqual(focusAfterArrive.target, { kind: 'city', index: 0 })
  assert.equal(focusAfterArrive.enRoute, false)
})

test('the hosted mountain is reachable again after a city visit', () => {
  const harness = createHarness()
  harness.controller.boot()
  harness.tick()
  harness.controller.flyToMountain(2)
  harness.controller.arrive()
  harness.tick()
  harness.controller.flyToCity(0)
  harness.controller.arrive()
  harness.tick()
  harness.controller.flyToMountain(2)
  const snapshot = harness.store.get()
  assert.deepEqual(snapshot.target, { kind: 'mountain', index: 2 })
  assert.equal(snapshot.enRoute, true)
})

test('advance wraps around the mountain count in both directions', () => {
  const harness = createHarness()
  harness.controller.boot()
  harness.tick()
  harness.controller.flyToMountain(2)
  harness.controller.arrive()
  harness.tick()
  harness.controller.advance(1)
  assert.deepEqual(harness.store.get().target, { kind: 'mountain', index: 0 })
  harness.controller.arrive()
  harness.tick()
  harness.controller.advance(-1)
  assert.deepEqual(harness.store.get().target, { kind: 'mountain', index: 2 })
})

test('revisiting a still-hosted mountain reactivates without a rebuild', () => {
  const harness = createHarness()
  harness.controller.boot()
  harness.tick()
  harness.controller.flyToMountain(1)
  harness.controller.arrive()
  harness.tick()
  harness.controller.flyToMountain(0)
  const buildsBefore = harness.builds.length
  assert.equal(harness.slots[0].active, true)
  assert.equal(buildsBefore, 2)
})
