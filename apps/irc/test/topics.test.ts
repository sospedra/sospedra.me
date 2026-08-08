import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { inviteTopic, roomTopic } from '../src/mesh/topics.ts'

const sha256hex = (...parts: Buffer[]) =>
  createHash('sha256').update(Buffer.concat(parts)).digest('hex')

test('roomTopic is sha256(appId || roomId || topicSecret)', () => {
  const topic = roomTopic('irc/v0', 'room-1', 's3cret')
  const expected = sha256hex(
    Buffer.from('irc/v0'),
    Buffer.from('room-1'),
    Buffer.from('s3cret'),
  )
  assert.equal(topic, expected)
  assert.equal(topic.length, 64)
})

test('roomTopic changes with every component', () => {
  const base = roomTopic('irc/v0', 'room-1', 's3cret')
  assert.notEqual(roomTopic('irc/v1', 'room-1', 's3cret'), base)
  assert.notEqual(roomTopic('irc/v0', 'room-2', 's3cret'), base)
  assert.notEqual(roomTopic('irc/v0', 'room-1', 'other'), base)
})

test('inviteTopic is sha256(appId || inviteId)', () => {
  const inviteId = Uint8Array.from({ length: 16 }, (_, i) => i + 1)
  const topic = inviteTopic('irc/v0', inviteId)
  const expected = sha256hex(Buffer.from('irc/v0'), Buffer.from(inviteId))
  assert.equal(topic, expected)
})
