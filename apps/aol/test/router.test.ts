import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes, utf8 } from '../src/mesh/bytes.ts'
import { HOP_CAP } from '../src/mesh/constants.ts'
import { buildFrame, encodeFrame, WILDCARD } from '../src/mesh/frame.ts'
import { type Identity, identityFromSeed } from '../src/mesh/keys.ts'
import { type DropRecord, Router } from '../src/mesh/router.ts'

const alice = identityFromSeed(randomBytes(32), 'PRF')
const bob = identityFromSeed(randomBytes(32), 'PRF')
const carol = identityFromSeed(randomBytes(32), 'PRF')

const LINK = 'link-peer'

const encoded = (input: {
  identity?: Identity
  dst?: Uint8Array
  seq: number
  hop?: number
}) =>
  encodeFrame(
    buildFrame({
      identity: input.identity ?? alice,
      dst: input.dst ?? WILDCARD,
      seq: input.seq,
      hop: input.hop ?? 0,
      payload: utf8('body'),
    }),
  )

const makeRouter = (ejected: string[] = []) => {
  const drops: DropRecord[] = []
  const router = new Router({
    selfHex: bob.peerIdHex,
    isEjected: (hex) => ejected.includes(hex),
    onDrop: (record) => drops.push(record),
  })
  return { router, drops }
}

test('a wildcard frame is delivered and forwarded with hop advanced', () => {
  const { router } = makeRouter()
  const result = router.accept(encoded({ seq: 1 }), LINK, 0)
  assert.equal(result.kind, 'accept')
  if (result.kind !== 'accept') return
  assert.equal(result.deliver, true)
  assert.equal(result.forward, true)
  assert.equal(result.frame.hop, 1)
})

test('a frame addressed to me delivers, one addressed elsewhere floods only', () => {
  const { router } = makeRouter()
  const toMe = router.accept(encoded({ seq: 1, dst: bob.peerId }), LINK, 0)
  const toOther = router.accept(encoded({ seq: 2, dst: carol.peerId }), LINK, 0)
  assert.equal(toMe.kind === 'accept' && toMe.deliver, true)
  assert.equal(toOther.kind === 'accept' && toOther.deliver, false)
  assert.equal(toOther.kind === 'accept' && toOther.forward, true)
})

test('a tampered frame drops as bad-sig and penalizes the link', () => {
  const { router, drops } = makeRouter()
  const bytes = encoded({ seq: 1 })
  bytes[110] ^= 0xff
  const result = router.accept(bytes, LINK, 0)
  assert.deepEqual(result, { kind: 'drop', reason: 'bad-sig' })
  assert.deepEqual(drops, [{ reason: 'bad-sig', offender: LINK }])
})

test('malformed bytes drop and penalize the link', () => {
  const { router, drops } = makeRouter()
  const result = router.accept(randomBytes(30), LINK, 0)
  assert.deepEqual(result, { kind: 'drop', reason: 'malformed' })
  assert.deepEqual(drops, [{ reason: 'malformed', offender: LINK }])
})

test('frames from an ejected source drop without penalty', () => {
  const { router, drops } = makeRouter([alice.peerIdHex])
  const result = router.accept(encoded({ seq: 1 }), LINK, 0)
  assert.deepEqual(result, { kind: 'drop', reason: 'ejected' })
  assert.deepEqual(drops, [{ reason: 'ejected', offender: null }])
})

test('my own frame echoed back drops silently', () => {
  const { router, drops } = makeRouter()
  const result = router.accept(encoded({ identity: bob, seq: 1 }), LINK, 0)
  assert.deepEqual(result, { kind: 'drop', reason: 'own' })
  assert.deepEqual(drops, [{ reason: 'own', offender: null }])
})

test('a gossip duplicate drops without penalty', () => {
  const { router, drops } = makeRouter()
  const bytes = encoded({ seq: 9 })
  assert.equal(router.accept(bytes, LINK, 0).kind, 'accept')
  const replay = router.accept(bytes, 'other-link', 1)
  assert.deepEqual(replay, { kind: 'drop', reason: 'dup' })
  assert.deepEqual(drops, [{ reason: 'dup', offender: null }])
})

test('an out-of-window sequence drops and penalizes the source', () => {
  const { router, drops } = makeRouter()
  assert.equal(router.accept(encoded({ seq: 5000 }), LINK, 0).kind, 'accept')
  const result = router.accept(encoded({ seq: 3000 }), LINK, 1)
  assert.deepEqual(result, { kind: 'drop', reason: 'seq' })
  assert.deepEqual(drops, [{ reason: 'seq', offender: alice.peerIdHex }])
})

test('hop cap drops before delivery and penalizes the link', () => {
  const { router, drops } = makeRouter()
  const result = router.accept(encoded({ seq: 1, hop: HOP_CAP }), LINK, 0)
  assert.deepEqual(result, { kind: 'drop', reason: 'hop' })
  assert.deepEqual(drops, [{ reason: 'hop', offender: LINK }])
})

test('a frame one below the hop cap delivers but does not forward', () => {
  const { router } = makeRouter()
  const result = router.accept(encoded({ seq: 1, hop: HOP_CAP - 1 }), LINK, 0)
  assert.equal(result.kind === 'accept' && result.deliver, true)
  assert.equal(result.kind === 'accept' && result.forward, false)
})

test('the source rate limit drops the eleventh frame in the window', () => {
  const { router, drops } = makeRouter()
  const results = Array.from({ length: 11 }, (_, index) =>
    router.accept(encoded({ seq: index + 1 }), LINK, index),
  )
  assert.equal(results.filter((entry) => entry.kind === 'accept').length, 10)
  assert.deepEqual(results[10], { kind: 'drop', reason: 'rate' })
  assert.deepEqual(drops, [{ reason: 'rate', offender: alice.peerIdHex }])
})

test('a rate-dropped sequence stays acceptable later', () => {
  const { router } = makeRouter()
  Array.from({ length: 11 }, (_, index) =>
    router.accept(encoded({ seq: index + 1 }), LINK, index),
  )
  const retry = router.accept(encoded({ seq: 11 }), LINK, 2000)
  assert.equal(retry.kind, 'accept')
})
