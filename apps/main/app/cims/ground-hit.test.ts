import assert from 'node:assert/strict'
import test from 'node:test'
import { marchGround } from './ground-hit.ts'

test('marchGround finds a slanted hit on flat terrain', () => {
  const hit = marchGround(
    { x: 0, y: 1000, z: 0 },
    { x: 0.6, y: -0.8, z: 0 },
    () => 0,
  )
  assert.ok(hit)
  assert.ok(Math.abs(hit.x - 750) < 0.2, `x=${hit.x}`)
  assert.equal(hit.z, 0)
})

test('marchGround refines against a terrain wall', () => {
  const wall = (x: number) => (x > 500 ? 2000 : 0)
  const hit = marchGround(
    { x: 0, y: 100, z: 0 },
    { x: 1, y: -0.001, z: 0 },
    wall,
  )
  assert.ok(hit)
  assert.ok(Math.abs(hit.x - 500) < 1, `x=${hit.x}`)
})

test('marchGround returns null when the ray never lands', () => {
  const hit = marchGround(
    { x: 0, y: 100, z: 0 },
    { x: 0, y: 0.5, z: 0 },
    () => 0,
  )
  assert.equal(hit, null)
})
