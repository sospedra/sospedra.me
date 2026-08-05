import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import {
  decodeAuthorEvent,
  encodeAuthorEvent,
  eventHash,
  type GlobalEventRecordV1,
} from '../src/protocol/events.ts'
import { buildGenesis, seqRecords } from '../src/protocol/genesis.ts'
import {
  encodeOpenAccount,
  encodeSetConfig,
  encodeTransfer,
  OP,
} from '../src/protocol/ops.ts'
import { PROGRAM } from '../src/protocol/program.ts'
import { accountKey, decodeAccount } from '../src/protocol/state.ts'
import {
  decodeTransparentTransitionProof,
  encodeTransparentTransitionProof,
  FEE_CONFIG_NAME,
  proveBatch,
  type TransparentTransitionProofV1,
  verifyTransition,
} from '../src/protocol/transition.ts'

test('happy batch applies and replays', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const records = seqRecords(w, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 10_000n }),
    ],
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'bob', initialBalance: 0n }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: 1000n }),
    ],
  ])

  const proof = proveBatch(w.tree, records, PROGRAM.updateV1)
  const out = verifyTransition(startRoot, proof, PROGRAM.updateV1)
  assert.equal(hex(out.endRoot), hex(w.tree.root()))

  const bobRaw = w.tree.get(accountKey('bob'))
  assert.ok(bobRaw)
  const bob = decodeAccount(bobRaw)
  assert.equal(bob.balance, 975n)
})

test('replay rejects a tampered record', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const records = seqRecords(w, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 10_000n }),
    ],
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'bob', initialBalance: 0n }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: 1000n }),
    ],
  ])

  const proof = proveBatch(w.tree, records, PROGRAM.updateV1)
  const decoded = decodeTransparentTransitionProof(
    encodeTransparentTransitionProof(proof),
  )

  const target = decoded.records[2]
  const targetEvent = decodeAuthorEvent(target.authorEvent)
  const tamperedPayload = targetEvent.payload.slice()
  tamperedPayload[0] ^= 1
  const tamperedEventBytes = encodeAuthorEvent({
    ...targetEvent,
    payload: tamperedPayload,
  })
  const tamperedRecord: GlobalEventRecordV1 = {
    ...target,
    authorEvent: tamperedEventBytes,
    eventHash: eventHash(tamperedEventBytes, target.authorSignature),
  }
  const tamperedProof: TransparentTransitionProofV1 = {
    ...decoded,
    records: decoded.records.map((r, i) => (i === 2 ? tamperedRecord : r)),
  }
  const finalProof = decodeTransparentTransitionProof(
    encodeTransparentTransitionProof(tamperedProof),
  )

  assert.throws(
    () => verifyTransition(startRoot, finalProof, PROGRAM.updateV1),
    {
      code: 'INVALID_PROOF',
      rule: 'author-signature',
    },
  )
})

test('replay rejects author replay', () => {
  const w = buildGenesis()
  const records = seqRecords(w, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 10_000n }),
    ],
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'bob', initialBalance: 0n }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: 1000n }),
    ],
  ])
  const replay: GlobalEventRecordV1 = { ...records[2], globalSequence: 4n }

  assert.throws(
    () => proveBatch(w.tree, [...records, replay], PROGRAM.updateV1),
    {
      rule: 'author-sequence',
    },
  )
})

test('non-contiguous global sequence rejected', () => {
  const w = buildGenesis()
  const records = seqRecords(w, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 10_000n }),
    ],
  ])
  const skipped: GlobalEventRecordV1 = { ...records[0], globalSequence: 2n }

  assert.throws(() => proveBatch(w.tree, [skipped], PROGRAM.updateV1), {
    rule: 'global-sequence',
  })
})

test('timelock enforced', () => {
  const w = buildGenesis()
  const records = seqRecords(w, [
    [
      'governance',
      OP.SET_CONFIG,
      encodeSetConfig({
        name: FEE_CONFIG_NAME,
        value: 500n,
        activationSequence: 2n,
      }),
    ],
  ])

  assert.throws(() => proveBatch(w.tree, records, PROGRAM.updateV1), {
    rule: 'timelock',
  })
})
