import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deriveGroupKey } from './mesh/seal.ts'
import { PLANS } from './plans.ts'
import {
  acceptsSeq,
  createSessionLink,
  decodePayload,
  encodePayload,
  INITIAL_RUNTIME,
  INITIAL_SNAPSHOT,
  initialSeq,
  parseSessionHash,
  reduceSession,
  type SessionPayload,
  type SessionRuntime,
  sessionHash,
  snapshotTarget,
  timelineAt,
} from './session.ts'

const key = deriveGroupKey('secret')

test('session link roundtrips through the hash', () => {
  const link = createSessionLink()
  assert.equal(link.sessionId.length, 16)
  assert.equal(link.secret.length, 32)
  assert.deepEqual(parseSessionHash(sessionHash(link)), link)
})

test('parseSessionHash rejects foreign hashes', () => {
  assert.equal(parseSessionHash(''), null)
  assert.equal(parseSessionHash('#other'), null)
  assert.equal(parseSessionHash('#s=only-id'), null)
  assert.equal(parseSessionHash('#s=.only-secret'), null)
})

test('payload codec roundtrips every type', () => {
  const payloads: SessionPayload[] = [
    { type: 'state', ...INITIAL_SNAPSHOT, plan: 'long', seq: 7 },
    { type: 'presence', nick: 'keeper' },
    { type: 'bye' },
  ]
  for (const payload of payloads) {
    assert.deepEqual(decodePayload(key, encodePayload(key, payload)), payload)
  }
})

test('decodePayload rejects the wrong key, tampering and junk', () => {
  const content = encodePayload(key, { type: 'bye' })
  assert.equal(decodePayload(deriveGroupKey('other'), content), null)
  const tampered = `${content.slice(0, -2)}00`
  assert.equal(decodePayload(key, tampered), null)
  assert.equal(decodePayload(key, 'not-hex'), null)
  assert.equal(decodePayload(key, ''), null)
})

test('decodePayload rejects sealed junk shapes', () => {
  const junk = encodePayload(key, {
    type: 'presence',
    nick: '',
  } as SessionPayload)
  assert.equal(decodePayload(key, junk), null)
  const long = encodePayload(key, {
    type: 'presence',
    nick: 'x'.repeat(25),
  } as SessionPayload)
  assert.equal(decodePayload(key, long), null)
})

test('snapshotTarget projects position only while playing', () => {
  const base = { ...INITIAL_SNAPSHOT, positionMs: 10_000, positionEpoch: 1_000 }
  assert.equal(snapshotTarget({ ...base, playing: true }, 4_000), 13_000)
  assert.equal(snapshotTarget({ ...base, playing: false }, 4_000), 10_000)
})

test('initialSeq and acceptsSeq order events', () => {
  assert.equal(initialSeq(1_722_718_800_500), 1_722_718_800)
  assert.equal(acceptsSeq(null, 1), true)
  assert.equal(acceptsSeq(5, 6), true)
  assert.equal(acceptsSeq(5, 5), false)
  assert.equal(acceptsSeq(5, 4), false)
})

test('timelineAt walks the plan and ends in null', () => {
  const plan = PLANS.short
  assert.deepEqual(timelineAt(plan, -50), { index: 0, remaining: plan[0].time })
  assert.deepEqual(timelineAt(plan, 0), { index: 0, remaining: plan[0].time })
  assert.deepEqual(timelineAt(plan, 60_000), {
    index: 0,
    remaining: plan[0].time - 60_000,
  })
  assert.deepEqual(timelineAt(plan, plan[0].time), {
    index: 1,
    remaining: plan[1].time,
  })
  const total = plan.reduce((sum, segment) => sum + segment.time, 0)
  assert.deepEqual(timelineAt(plan, total - 1), {
    index: plan.length - 1,
    remaining: 1,
  })
  assert.equal(timelineAt(plan, total), null)
})

const hosted = (): SessionRuntime =>
  reduceSession(INITIAL_RUNTIME, {
    type: 'hosted',
    link: { sessionId: 'aa', secret: 'bb' },
    nick: 'keeper',
    selfPubkey: 'me',
    snapshot: { ...INITIAL_SNAPSHOT, seq: 100 },
  })

const seated = (): SessionRuntime => {
  const gated = reduceSession(INITIAL_RUNTIME, {
    type: 'gated',
    link: { sessionId: 'aa', secret: 'bb' },
  })
  return reduceSession(gated, {
    type: 'seated',
    nick: 'wanderer',
    selfPubkey: 'me',
  })
}

const state = (seq: number) =>
  ({
    type: 'state',
    ...INITIAL_SNAPSHOT,
    plan: 'short',
    planEpoch: 5,
    seq,
  }) as const

test('hosted and seated set their phases', () => {
  assert.equal(hosted().phase, 'host')
  assert.equal(hosted().lastSeq, 100)
  assert.equal(seated().phase, 'seated')
  assert.equal(seated().snapshot, null)
})

test('a follower applies state by growing seq only', () => {
  const first = reduceSession(seated(), {
    type: 'received',
    payload: state(10),
    pubkey: 'host',
    nowMs: 1_000,
  })
  assert.equal(first.snapshot?.plan, 'short')
  assert.equal(first.lastSeq, 10)
  assert.equal(first.hostPubkey, 'host')
  assert.equal(first.hostSeenMs, 1_000)
  const stale = reduceSession(first, {
    type: 'received',
    payload: state(9),
    pubkey: 'host',
    nowMs: 2_000,
  })
  assert.equal(stale.lastSeq, 10)
  assert.equal(stale.hostSeenMs, 1_000)
})

test('a host ignores foreign state', () => {
  const runtime = reduceSession(hosted(), {
    type: 'received',
    payload: state(999),
    pubkey: 'other',
    nowMs: 1_000,
  })
  assert.equal(runtime.lastSeq, 100)
})

test('presence tracks peers and skips self', () => {
  const withPeer = reduceSession(seated(), {
    type: 'received',
    payload: { type: 'presence', nick: 'ember' },
    pubkey: 'friend',
    nowMs: 1_000,
  })
  assert.deepEqual(withPeer.peers.friend, { nick: 'ember', lastSeenMs: 1_000 })
  const self = reduceSession(withPeer, {
    type: 'received',
    payload: { type: 'presence', nick: 'me-again' },
    pubkey: 'me',
    nowMs: 1_000,
  })
  assert.equal(self.peers.me, undefined)
})

test('bye removes a peer and flags the host', () => {
  const base = reduceSession(seated(), {
    type: 'received',
    payload: state(10),
    pubkey: 'host',
    nowMs: 1_000,
  })
  const withPeer = reduceSession(base, {
    type: 'received',
    payload: { type: 'presence', nick: 'ember' },
    pubkey: 'friend',
    nowMs: 1_000,
  })
  const friendGone = reduceSession(withPeer, {
    type: 'received',
    payload: { type: 'bye' },
    pubkey: 'friend',
    nowMs: 2_000,
  })
  assert.equal(friendGone.peers.friend, undefined)
  assert.equal(friendGone.hostLeft, false)
  const hostGone = reduceSession(friendGone, {
    type: 'received',
    payload: { type: 'bye' },
    pubkey: 'host',
    nowMs: 2_000,
  })
  assert.equal(hostGone.hostLeft, true)
})

test('a fresh state clears the host-left flag', () => {
  const base = reduceSession(seated(), {
    type: 'received',
    payload: state(10),
    pubkey: 'host',
    nowMs: 1_000,
  })
  const left = reduceSession(base, {
    type: 'received',
    payload: { type: 'bye' },
    pubkey: 'host',
    nowMs: 2_000,
  })
  const back = reduceSession(left, {
    type: 'received',
    payload: state(11),
    pubkey: 'host',
    nowMs: 3_000,
  })
  assert.equal(back.hostLeft, false)
})

test('swept expires quiet peers and a silent host', () => {
  const base = reduceSession(seated(), {
    type: 'received',
    payload: state(10),
    pubkey: 'host',
    nowMs: 0,
  })
  const withPeer = reduceSession(base, {
    type: 'received',
    payload: { type: 'presence', nick: 'ember' },
    pubkey: 'friend',
    nowMs: 0,
  })
  const early = reduceSession(withPeer, { type: 'swept', nowMs: 44_000 })
  assert.notEqual(early.peers.friend, undefined)
  assert.equal(early.hostLeft, true)
  const late = reduceSession(withPeer, { type: 'swept', nowMs: 46_000 })
  assert.equal(late.peers.friend, undefined)
})

test('a silent host never flags a hosting tab', () => {
  const runtime = reduceSession(hosted(), { type: 'swept', nowMs: 999_000 })
  assert.equal(runtime.hostLeft, false)
})

test('relay states fold into a count and a memory', () => {
  const open = reduceSession(seated(), { type: 'relays', open: 3 })
  assert.equal(open.openRelays, 3)
  assert.equal(open.everOpen, true)
  const down = reduceSession(open, { type: 'relays', open: 0 })
  assert.equal(down.openRelays, 0)
  assert.equal(down.everOpen, true)
})

test('commanded updates a host snapshot only', () => {
  const next = { ...INITIAL_SNAPSHOT, plan: 'long' as const, seq: 101 }
  const host = reduceSession(hosted(), { type: 'commanded', snapshot: next })
  assert.equal(host.snapshot?.plan, 'long')
  assert.equal(host.lastSeq, 101)
  const follower = reduceSession(seated(), {
    type: 'commanded',
    snapshot: next,
  })
  assert.equal(follower.snapshot, null)
})
