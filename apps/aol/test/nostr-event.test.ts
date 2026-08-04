import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { randomBytes } from '../src/mesh/bytes.ts'
import { NOSTR_KIND } from '../src/mesh/constants.ts'
import { buildEvent, topicOf, verifyEvent } from '../src/mesh/nostr-event.ts'

const build = () =>
  buildEvent({
    secret: randomBytes(32),
    kind: NOSTR_KIND,
    tags: [['t', 'aa'.repeat(32)]],
    content: '{"hello":true}',
    createdAtSec: 1_800_000_000,
  })

test('a built event verifies and has canonical field shapes', () => {
  const event = build()
  assert.equal(event.id.length, 64)
  assert.equal(event.pubkey.length, 64)
  assert.equal(event.sig.length, 128)
  assert.equal(event.kind, NOSTR_KIND)
  assert.ok(verifyEvent(event))
})

test('the id follows nip-01 serialization', () => {
  const event = build()
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ])
  const expected = createHash('sha256').update(serialized, 'utf8').digest('hex')
  assert.equal(event.id, expected)
})

test('tampered content or signature fails verification', () => {
  const tamperedContent = { ...build(), content: '{"hello":false}' }
  assert.equal(verifyEvent(tamperedContent), null)
  const honest = build()
  const other = build()
  assert.equal(verifyEvent({ ...honest, sig: other.sig }), null)
})

test('malformed values fail verification', () => {
  assert.equal(verifyEvent(null), null)
  assert.equal(verifyEvent({}), null)
  assert.equal(verifyEvent('event'), null)
})

test('topicOf reads the first t tag', () => {
  const event = build()
  assert.equal(topicOf(event), 'aa'.repeat(32))
  const untagged = buildEvent({
    secret: randomBytes(32),
    kind: NOSTR_KIND,
    tags: [],
    content: '',
    createdAtSec: 1_800_000_000,
  })
  assert.equal(topicOf(untagged), null)
})
