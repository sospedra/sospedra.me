import assert from 'node:assert/strict'
import test from 'node:test'
import { createExternalStore } from './external-store.ts'

test('set stores the value and get returns it', () => {
  const store = createExternalStore(0)
  assert.equal(store.get(), 0)
  store.set(42)
  assert.equal(store.get(), 42)
})

test('set notifies every subscriber once per change', () => {
  const store = createExternalStore('idle')
  let first = 0
  let second = 0
  store.subscribe(() => {
    first += 1
  })
  store.subscribe(() => {
    second += 1
  })
  store.set('playing')
  assert.equal(first, 1)
  assert.equal(second, 1)
  assert.equal(store.get(), 'playing')
})

test('set skips notification when the value is reference-equal', () => {
  const shared = { count: 1 }
  const store = createExternalStore(shared)
  let calls = 0
  store.subscribe(() => {
    calls += 1
  })
  store.set(shared)
  assert.equal(calls, 0)
  store.set({ count: 1 })
  assert.equal(calls, 1)
})

test('set skips notification when a primitive is Object.is-equal', () => {
  const store = createExternalStore(7)
  let calls = 0
  store.subscribe(() => {
    calls += 1
  })
  store.set(7)
  assert.equal(calls, 0)
  store.set(8)
  assert.equal(calls, 1)
})

test('unsubscribe stops notifications for that listener only', () => {
  const store = createExternalStore(0)
  let kept = 0
  let dropped = 0
  store.subscribe(() => {
    kept += 1
  })
  const unsubscribe = store.subscribe(() => {
    dropped += 1
  })
  store.set(1)
  unsubscribe()
  store.set(2)
  assert.equal(kept, 2)
  assert.equal(dropped, 1)
})

test('a quantizing selector yields Object.is-stable slices within a quantum', () => {
  const store = createExternalStore(0)
  const selectSecond = (ms: number) => Math.floor(ms / 1000)
  const slices: number[] = []
  store.subscribe(() => {
    slices.push(selectSecond(store.get()))
  })

  store.set(16)
  store.set(450)
  store.set(999)
  store.set(1000)
  store.set(1016)

  assert.deepEqual(slices, [0, 0, 0, 1, 1])
  const renders = slices.filter(
    (slice, index) => index === 0 || !Object.is(slice, slices[index - 1]),
  )
  assert.deepEqual(renders, [0, 1])
})
