import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes, toHex, utf8 } from '../src/mesh/bytes.ts'
import {
  decodeMessage,
  encodeMessage,
  type MeshMessage,
} from '../src/mesh/messages.ts'

const roundtrip = (message: MeshMessage) =>
  decodeMessage(encodeMessage(message))

test('every message variant roundtrips', () => {
  const peer = toHex(randomBytes(32))
  const variants: MeshMessage[] = [
    { t: 'chat', text: 'hola', ts: 1_800_000_000_000, nick: 'ana' },
    { t: 'beat' },
    { t: 'view', peers: [peer] },
    { t: 'leave', peers: [peer, peer] },
    { t: 'dial-offer', dialId: toHex(randomBytes(16)), sdp: 'v=0 offer' },
    { t: 'dial-answer', dialId: toHex(randomBytes(16)), sdp: 'v=0 answer' },
    { t: 'hello', nick: 'guest-1a2b' },
    { t: 'kick', target: toHex(randomBytes(32)) },
  ]
  const decoded = variants.map(roundtrip)
  assert.deepEqual(decoded, variants)
})

test('kick rejects a malformed target', () => {
  assert.equal(roundtrip({ t: 'kick', target: 'abcd' }), null)
  assert.equal(decodeMessage(utf8('{"t":"kick","target":42}')), null)
})

test('nicks reject empty, oversize, untrimmed, and control chars', () => {
  assert.equal(roundtrip({ t: 'hello', nick: '' }), null)
  assert.equal(roundtrip({ t: 'hello', nick: 'x'.repeat(25) }), null)
  assert.equal(roundtrip({ t: 'hello', nick: ' pad ' }), null)
  assert.equal(roundtrip({ t: 'hello', nick: 'two\nlines' }), null)
  assert.equal(roundtrip({ t: 'hello', nick: 'be\u0007ll' }), null)
  assert.equal(roundtrip({ t: 'hello', nick: 'x'.repeat(24) })?.t, 'hello')
})

test('chat requires a valid nick', () => {
  assert.equal(roundtrip({ t: 'chat', text: 'hi', ts: 0, nick: '' }), null)
  assert.equal(decodeMessage(utf8('{"t":"chat","text":"hi","ts":0}')), null)
})

test('junk bytes decode to null', () => {
  assert.equal(decodeMessage(randomBytes(12)), null)
  assert.equal(decodeMessage(utf8('{"t":"nope"}')), null)
  assert.equal(decodeMessage(utf8('[]')), null)
})

test('oversize chat text is rejected', () => {
  const message: MeshMessage = {
    t: 'chat',
    text: 'x'.repeat(16_001),
    ts: 0,
    nick: 'ana',
  }
  assert.equal(roundtrip(message), null)
})

test('view lists reject bad entries and oversize lists', () => {
  const good = toHex(randomBytes(32))
  assert.equal(roundtrip({ t: 'view', peers: ['not-hex'] }), null)
  assert.equal(roundtrip({ t: 'view', peers: Array(49).fill(good) }), null)
})

test('dial messages validate the dial id', () => {
  assert.equal(roundtrip({ t: 'dial-offer', dialId: 'abcd', sdp: 'v=0' }), null)
})
