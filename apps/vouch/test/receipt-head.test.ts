import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import { FRESHNESS, ZERO32 } from '../src/protocol/constants.ts'
import {
  ackSigningInput,
  encodeWriteAck,
  type WriteAckV1,
} from '../src/protocol/events.ts'
import {
  ackOmission,
  headConflict,
  type SignedAck,
  type SignedHead,
} from '../src/protocol/evidence.ts'
import { GENESIS_ROOT } from '../src/protocol/genesis.ts'
import {
  checkFreshness,
  encodeLatestHead,
  type HeadIdV1,
  headSigningInput,
  type LatestHeadV1,
} from '../src/protocol/head.ts'
import {
  type Keypair,
  keypairFromLabel,
  sign,
  verifySig,
} from '../src/protocol/keys.ts'
import { GENESIS_CHAIN, PROGRAM } from '../src/protocol/program.ts'
import {
  decodeQueryReceipt,
  encodeQueryReceipt,
  proofCacheKey,
  type QueryReceiptV1,
  receiptSigningInput,
} from '../src/protocol/receipt.ts'
import {
  type ClientTrustStateV1,
  decodeClientTrustState,
  encodeClientTrustState,
  genesisTrust,
  type KeyStateEntryV1,
  keyStateHash,
} from '../src/protocol/trust.ts'

function makeLatestHead(
  latestAsOfMs: bigint,
  overrides: Partial<HeadIdV1 & { headKeyId: Uint8Array }> = {},
): LatestHeadV1 {
  return {
    head: {
      sequence: overrides.sequence ?? 1n,
      stateRoot: overrides.stateRoot ?? new Uint8Array(32).fill(0xaa),
      updateProgramId: overrides.updateProgramId ?? PROGRAM.updateV1,
      queryProgramId: overrides.queryProgramId ?? PROGRAM.queryV1,
      programChainHash: overrides.programChainHash ?? GENESIS_CHAIN,
    },
    latestAsOfMs,
    headKeyId: overrides.headKeyId ?? ZERO32,
  }
}

function signHead(head: LatestHeadV1, kp: Keypair): SignedHead {
  const headBytes = encodeLatestHead(head)
  const signature = sign(headSigningInput(headBytes), kp)
  return { headBytes, signature }
}

test('receipt roundtrip and signature', () => {
  const kp = keypairFromLabel('receipt-1')
  const receipt: QueryReceiptV1 = {
    receiptKeyId: kp.publicKey,
    stateRoot: new Uint8Array(32).fill(0x11),
    stateSequence: 7n,
    requestHash: new Uint8Array(32).fill(0x22),
    resultHash: new Uint8Array(32).fill(0x33),
    queryProgramId: PROGRAM.queryV1,
    programChainHash: GENESIS_CHAIN,
    nonce: new Uint8Array([1, 2, 3, 4]),
    issuedAtMs: 1_754_000_000_000n,
    proofDeadlineMs: 1_754_000_030_000n,
  }
  const encoded = encodeQueryReceipt(receipt)
  assert.deepEqual(decodeQueryReceipt(encoded), receipt)

  const digest = receiptSigningInput(encoded)
  const signature = sign(digest, kp)
  assert.ok(verifySig(digest, signature, kp.publicKey))
})

test('proof cache key excludes nonce', () => {
  const base: QueryReceiptV1 = {
    receiptKeyId: new Uint8Array(32).fill(0x01),
    stateRoot: new Uint8Array(32).fill(0x02),
    stateSequence: 3n,
    requestHash: new Uint8Array(32).fill(0x04),
    resultHash: new Uint8Array(32).fill(0x05),
    queryProgramId: PROGRAM.queryV1,
    programChainHash: GENESIS_CHAIN,
    nonce: new Uint8Array([9, 9]),
    issuedAtMs: 1000n,
    proofDeadlineMs: 2000n,
  }
  const otherNonce: QueryReceiptV1 = { ...base, nonce: new Uint8Array([1]) }

  const keyA = proofCacheKey(
    base.queryProgramId,
    base.stateRoot,
    base.requestHash,
  )
  const keyB = proofCacheKey(
    otherNonce.queryProgramId,
    otherNonce.stateRoot,
    otherNonce.requestHash,
  )
  assert.equal(hex(keyA), hex(keyB))

  const keyDifferentRoot = proofCacheKey(
    base.queryProgramId,
    new Uint8Array(32).fill(0xff),
    base.requestHash,
  )
  assert.notEqual(hex(keyA), hex(keyDifferentRoot))
})

test('freshness window', () => {
  const now = 100_000n
  assert.equal(checkFreshness(makeLatestHead(95_000n), now, FRESHNESS), 'ok')
  assert.equal(
    checkFreshness(makeLatestHead(30_000n), now, FRESHNESS),
    'STALE_HEAD',
  )
  assert.equal(
    checkFreshness(makeLatestHead(106_000n), now, FRESHNESS),
    'FUTURE_HEAD',
  )
})

test('freshness boundaries are inclusive-ok at the exact limit', () => {
  const now = 100_000n
  const staleEdge = now - FRESHNESS.maxHeadAgeMs
  const futureEdge = now + FRESHNESS.clockSkewMs

  assert.equal(checkFreshness(makeLatestHead(staleEdge), now, FRESHNESS), 'ok')
  assert.equal(
    checkFreshness(makeLatestHead(staleEdge - 1n), now, FRESHNESS),
    'STALE_HEAD',
  )
  assert.equal(checkFreshness(makeLatestHead(futureEdge), now, FRESHNESS), 'ok')
  assert.equal(
    checkFreshness(makeLatestHead(futureEdge + 1n), now, FRESHNESS),
    'FUTURE_HEAD',
  )
})

test('head conflict detected', () => {
  const kp = keypairFromLabel('head-key-1')
  const ms = 50_000n
  const rootA = new Uint8Array(32).fill(0xaa)
  const rootB = new Uint8Array(32).fill(0xbb)
  const signedA = signHead(
    makeLatestHead(ms, { stateRoot: rootA, headKeyId: kp.publicKey }),
    kp,
  )
  const signedB = signHead(
    makeLatestHead(ms, { stateRoot: rootB, headKeyId: kp.publicKey }),
    kp,
  )

  const evidence = headConflict(signedA, signedB)
  assert.ok(evidence)
  assert.equal(evidence.kind, 'head-conflict')
  assert.equal(evidence.taxonomy, 'PROVABLE_ON_RECORD')
  assert.deepEqual(evidence.objects, [
    signedA.headBytes,
    signedA.signature,
    signedB.headBytes,
    signedB.signature,
  ])
})

test('headConflict returns null when a signature is invalid', () => {
  const kp = keypairFromLabel('head-key-2')
  const ms = 60_000n
  const rootA = new Uint8Array(32).fill(0x01)
  const rootB = new Uint8Array(32).fill(0x02)
  const signedA = signHead(
    makeLatestHead(ms, { stateRoot: rootA, headKeyId: kp.publicKey }),
    kp,
  )
  const signedB = signHead(
    makeLatestHead(ms, { stateRoot: rootB, headKeyId: kp.publicKey }),
    kp,
  )
  const tamperedSignature = signedB.signature.slice()
  tamperedSignature[0] ^= 1

  assert.equal(
    headConflict(signedA, { ...signedB, signature: tamperedSignature }),
    null,
  )
})

test('headConflict detects a later statement with a lower sequence', () => {
  const kp = keypairFromLabel('head-key-3')
  const earlier = signHead(
    makeLatestHead(1000n, { sequence: 10n, headKeyId: kp.publicKey }),
    kp,
  )
  const later = signHead(
    makeLatestHead(2000n, { sequence: 5n, headKeyId: kp.publicKey }),
    kp,
  )

  const evidence = headConflict(earlier, later)
  assert.ok(evidence)
  assert.equal(evidence.kind, 'head-conflict')

  const reversed = headConflict(later, earlier)
  assert.ok(reversed)
  assert.equal(reversed.kind, 'head-conflict')

  const otherKp = keypairFromLabel('head-key-3-other')
  const laterOtherKey = signHead(
    makeLatestHead(2000n, { sequence: 5n, headKeyId: otherKp.publicKey }),
    otherKp,
  )
  assert.equal(headConflict(earlier, laterOtherKey), null)
})

test('ack omission requires crossed boundary', () => {
  const kp = keypairFromLabel('receipt-1')
  const ack: WriteAckV1 = {
    eventHash: new Uint8Array(32).fill(0x77),
    acceptedAtMs: 1000n,
    acceptedAgainstSequence: 4n,
    mustLandBySequence: 5n,
    receiptKeyId: kp.publicKey,
  }
  const ackBytes = encodeWriteAck(ack)
  const signature = sign(ackSigningInput(ackBytes), kp)
  const signedAck: SignedAck = { ackBytes, signature }

  assert.equal(ackOmission(signedAck, 4n, false), null)
  assert.equal(ackOmission(signedAck, 5n, true), null)
  assert.ok(ackOmission(signedAck, 5n, false))
  assert.ok(ackOmission(signedAck, 6n, false))

  const tamperedSignature = signature.slice()
  tamperedSignature[0] ^= 1
  assert.equal(
    ackOmission({ ackBytes, signature: tamperedSignature }, 6n, false),
    null,
  )
})

test('trust state roundtrip and genesisTrust fields', () => {
  const trust: ClientTrustStateV1 = {
    protocolVersion: 1,
    highestSequence: 42n,
    acceptedRoot: new Uint8Array(32).fill(0x01),
    programChainHash: GENESIS_CHAIN,
    activeUpdateProgramId: PROGRAM.updateV1,
    activeQueryProgramId: PROGRAM.queryV1,
    activeKeyStateHash: new Uint8Array(32).fill(0x02),
    lastLatestAsOfMs: 123n,
  }
  assert.deepEqual(decodeClientTrustState(encodeClientTrustState(trust)), trust)

  const anchors = {
    protocolVersion: 1,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: new Uint8Array(32).fill(0x03),
  }
  const genesis = genesisTrust(anchors)
  assert.equal(genesis.protocolVersion, 1)
  assert.equal(genesis.highestSequence, 0n)
  assert.equal(hex(genesis.acceptedRoot), hex(anchors.genesisRoot))
  assert.equal(hex(genesis.programChainHash), hex(anchors.programChainHash))
  assert.equal(hex(genesis.activeUpdateProgramId), hex(anchors.updateProgramId))
  assert.equal(hex(genesis.activeQueryProgramId), hex(anchors.queryProgramId))
  assert.equal(hex(genesis.activeKeyStateHash), hex(anchors.keyStateHash))
  assert.equal(genesis.lastLatestAsOfMs, 0n)
})

test('keyStateHash is order independent', () => {
  const entries: KeyStateEntryV1[] = [
    { keyId: new Uint8Array(32).fill(0x03), status: 1, sinceSequence: 9n },
    { keyId: new Uint8Array(32).fill(0x01), status: 0, sinceSequence: 3n },
    { keyId: new Uint8Array(32).fill(0x02), status: 1, sinceSequence: 5n },
  ]
  const shuffled = [entries[2], entries[0], entries[1]]

  assert.equal(hex(keyStateHash(entries)), hex(keyStateHash(shuffled)))
  assert.notEqual(
    hex(keyStateHash(entries)),
    hex(keyStateHash([entries[0], entries[1]])),
  )
})
