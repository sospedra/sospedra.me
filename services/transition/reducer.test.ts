import assert from 'node:assert/strict'
import test from 'node:test'
import type { Route } from 'next'
import {
  DEFAULT_STATE,
  destinationUrl,
  type Offshore,
  reducer,
  type State,
} from './reducer.ts'

const ABOUT = '/about' as Route
const PAPERS = '/papers' as Route
const CLOUD: Offshore = { kind: 'cloud', duration: 4200 }

const idle: State = { phase: 'idle', offshore: undefined }
const departing: State = { phase: 'departing', url: ABOUT, offshore: undefined }
const unmounting: State = {
  phase: 'unmounting',
  url: ABOUT,
  offshore: undefined,
}

test('default state is idle without offshore', () => {
  assert.deepEqual(DEFAULT_STATE, idle)
})

test('navigate from idle starts a departure', () => {
  const next = reducer(idle, { type: 'NAVIGATE', payload: { url: ABOUT } })
  assert.deepEqual(next, departing)
})

test('navigate while departing retargets the departure', () => {
  const next = reducer(departing, {
    type: 'NAVIGATE',
    payload: { url: PAPERS },
  })
  assert.deepEqual(next, {
    phase: 'departing',
    url: PAPERS,
    offshore: undefined,
  })
})

test('navigate while unmounting retargets the push', () => {
  const next = reducer(unmounting, {
    type: 'NAVIGATE',
    payload: { url: PAPERS },
  })
  assert.deepEqual(next, {
    phase: 'unmounting',
    url: PAPERS,
    offshore: undefined,
  })
})

test('unmount moves a departure to unmounting', () => {
  assert.deepEqual(reducer(departing, { type: 'UNMOUNT' }), unmounting)
})

test('unmount outside departing is ignored', () => {
  assert.equal(reducer(idle, { type: 'UNMOUNT' }), idle)
  assert.equal(reducer(unmounting, { type: 'UNMOUNT' }), unmounting)
})

test('reset lands idle from every phase', () => {
  assert.deepEqual(reducer(idle, { type: 'RESET' }), idle)
  assert.deepEqual(reducer(departing, { type: 'RESET' }), idle)
  assert.deepEqual(reducer(unmounting, { type: 'RESET' }), idle)
})

test('offshore sets and clears in every phase', () => {
  const set = { type: 'OFFSHORE', payload: { offshore: CLOUD } } as const
  assert.deepEqual(reducer(idle, set), { phase: 'idle', offshore: CLOUD })
  assert.deepEqual(reducer(departing, set), {
    phase: 'departing',
    url: ABOUT,
    offshore: CLOUD,
  })
  assert.deepEqual(reducer(unmounting, set), {
    phase: 'unmounting',
    url: ABOUT,
    offshore: CLOUD,
  })

  const cloudy = reducer(idle, set)
  const clear = { type: 'OFFSHORE', payload: { offshore: undefined } } as const
  assert.deepEqual(reducer(cloudy, clear), idle)
})

test('offshore survives navigate, unmount and reset', () => {
  const cloudyIdle: State = { phase: 'idle', offshore: CLOUD }
  const cloudyDeparting = reducer(cloudyIdle, {
    type: 'NAVIGATE',
    payload: { url: ABOUT },
  })
  assert.deepEqual(cloudyDeparting, {
    phase: 'departing',
    url: ABOUT,
    offshore: CLOUD,
  })

  const cloudyUnmounting = reducer(cloudyDeparting, { type: 'UNMOUNT' })
  assert.deepEqual(cloudyUnmounting, {
    phase: 'unmounting',
    url: ABOUT,
    offshore: CLOUD,
  })

  assert.deepEqual(reducer(cloudyUnmounting, { type: 'RESET' }), cloudyIdle)
})

test('destinationUrl reads the target only mid-transition', () => {
  assert.equal(destinationUrl(idle), null)
  assert.equal(destinationUrl(departing), ABOUT)
  assert.equal(destinationUrl(unmounting), ABOUT)
})
