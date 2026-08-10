import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { sessionTopic } from './topics.ts'

const sha256hex = (...parts: Buffer[]) =>
  createHash('sha256').update(Buffer.concat(parts)).digest('hex')

test('sessionTopic is sha256(appId || sessionId || secret)', () => {
  const topic = sessionTopic('bonfire/v0', 'fire-1', 's3cret')
  const expected = sha256hex(
    Buffer.from('bonfire/v0'),
    Buffer.from('fire-1'),
    Buffer.from('s3cret'),
  )
  assert.equal(topic, expected)
  assert.equal(topic.length, 64)
})

test('sessionTopic changes with every component', () => {
  const base = sessionTopic('bonfire/v0', 'fire-1', 's3cret')
  assert.notEqual(sessionTopic('bonfire/v1', 'fire-1', 's3cret'), base)
  assert.notEqual(sessionTopic('bonfire/v0', 'fire-2', 's3cret'), base)
  assert.notEqual(sessionTopic('bonfire/v0', 'fire-1', 'other'), base)
})
