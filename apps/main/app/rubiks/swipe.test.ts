import assert from 'node:assert/strict'
import { test } from 'node:test'
import { swipeMove } from './swipe.ts'

const FRONT_VIEW = { rotateX: 0, rotateY: 0 }
const HOME_VIEW = { rotateX: -24, rotateY: -38 }

test('swipe right on the front top row turns U prime', () => {
  const move = swipeMove(
    FRONT_VIEW,
    { face: 'F', position: [1, 1, 1] },
    [40, 0],
  )
  assert.deepEqual(move, { face: 'U', prime: true })
})

test('swipe left on the front top row turns U', () => {
  const move = swipeMove(
    FRONT_VIEW,
    { face: 'F', position: [1, 1, 1] },
    [-40, 0],
  )
  assert.deepEqual(move, { face: 'U', prime: false })
})

test('swipe up on the front right column turns R', () => {
  const move = swipeMove(
    FRONT_VIEW,
    { face: 'F', position: [1, 1, 1] },
    [0, -40],
  )
  assert.deepEqual(move, { face: 'R', prime: false })
})

test('swipe down on the front left column turns L', () => {
  const move = swipeMove(
    FRONT_VIEW,
    { face: 'F', position: [-1, 1, 1] },
    [0, 40],
  )
  assert.deepEqual(move, { face: 'L', prime: false })
})

test('swipe across a middle row is a slice, so no move', () => {
  const move = swipeMove(
    FRONT_VIEW,
    { face: 'F', position: [0, 0, 1] },
    [40, 0],
  )
  assert.equal(move, null)
})

test('the home orbit keeps the top-row mapping', () => {
  const move = swipeMove(HOME_VIEW, { face: 'F', position: [1, 1, 1] }, [40, 0])
  assert.deepEqual(move, { face: 'U', prime: true })
})

test('after orbiting to the left face, a right swipe still turns U prime', () => {
  const move = swipeMove(
    { rotateX: 0, rotateY: 90 },
    { face: 'L', position: [-1, 1, -1] },
    [40, 0],
  )
  assert.deepEqual(move, { face: 'U', prime: true })
})
