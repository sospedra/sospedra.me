import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ascii, hex } from '../src/protocol/bytes.ts'
import {
  TIMELOCK_CONFIG_MIN,
  TIMELOCK_MIGRATION_MIN,
  ZERO32,
} from '../src/protocol/constants.ts'
import { DecodeError, Reader } from '../src/protocol/encode.ts'
import {
  decodeAuthorEvent,
  encodeAuthorEvent,
  eventHash,
  type GlobalEventRecordV1,
} from '../src/protocol/events.ts'
import {
  buildGenesis,
  seqRecords,
  type World,
} from '../src/protocol/genesis.ts'
import {
  encodeOpenAccount,
  encodeSetAuthor,
  encodeSetConfig,
  encodeTransfer,
  OP,
} from '../src/protocol/ops.ts'
import {
  chainNext,
  encodeMigration,
  GENESIS_CHAIN,
  PROGRAM,
  type ProgramMigrationV1,
} from '../src/protocol/program.ts'
import { Smt } from '../src/protocol/smt.ts'
import {
  accountKey,
  authorKey,
  CHAIN_KEY,
  configKey,
  decodeAccount,
  decodeAuthorRecordV1,
  decodeChainStateV1,
  decodePendingMigrationV1,
  encodeConfig,
  MIGRATION_KEY,
} from '../src/protocol/state.ts'
import {
  decodeTransitionJournal,
  decodeTransparentTransitionProof,
  encodeTransitionJournal,
  encodeTransparentTransitionProof,
  FEE_CONFIG_NAME,
  proveBatch,
  type TransitionJournalV1,
  type TransparentTransitionProofV1,
  verifyTransition,
} from '../src/protocol/transition.ts'
import {
  type AccessV1,
  decodeAccess,
  encodeAccess,
} from '../src/protocol/view.ts'

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

test('V1 fee rounding floors a non-divisible amount instead of ceiling it', () => {
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
      encodeTransfer({ from: 'alice', to: 'bob', amount: 999n }),
    ],
  ])

  proveBatch(w.tree, records, PROGRAM.updateV1)

  const bobRaw = w.tree.get(accountKey('bob'))
  assert.ok(bobRaw)
  const bob = decodeAccount(bobRaw)
  assert.equal(bob.balance, 975n)
  assert.notEqual(bob.balance, 974n)
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

test('the config timelock requires less lead time than the migration timelock', () => {
  const configWorld = buildGenesis()
  const configRecords = seqRecords(configWorld, [
    [
      'governance',
      OP.SET_CONFIG,
      encodeSetConfig({
        name: FEE_CONFIG_NAME,
        value: 500n,
        activationSequence: 3n,
      }),
    ],
  ])
  proveBatch(configWorld.tree, configRecords, PROGRAM.updateV1)

  const migrationWorld = buildGenesis()
  const migrationRecords = seqRecords(migrationWorld, [
    [
      'governance',
      OP.COMMIT_MIGRATION,
      encodeMigration({
        nextUpdateProgramId: PROGRAM.updateV2,
        nextQueryProgramId: PROGRAM.queryV2,
        nextProgramManifestHash: ZERO32,
        activationSequence: 3n,
        governanceAuthorization: new Uint8Array(0),
      }),
    ],
  ])

  assert.throws(
    () => proveBatch(migrationWorld.tree, migrationRecords, PROGRAM.updateV1),
    { rule: 'timelock' },
  )
})

function openAliceAndBobThenTransfer(w: World): GlobalEventRecordV1[] {
  return seqRecords(w, [
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
}

function roundTripProof(
  proof: TransparentTransitionProofV1,
): TransparentTransitionProofV1 {
  return decodeTransparentTransitionProof(
    encodeTransparentTransitionProof(proof),
  )
}

function flipByte(bytes: Uint8Array): Uint8Array {
  const copy = bytes.slice()
  copy[0] ^= 1
  return copy
}

function forgeJournal(
  proof: TransparentTransitionProofV1,
  mutate: (journal: TransitionJournalV1) => TransitionJournalV1,
): TransparentTransitionProofV1 {
  const journal = mutate(decodeTransitionJournal(proof.journal))
  return { ...proof, journal: encodeTransitionJournal(journal) }
}

test('replay rejects a forged start sequence', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const forged = forgeJournal(proof, (j) => ({
    ...j,
    startSequence: j.startSequence + 1n,
  }))

  assert.throws(() => verifyTransition(startRoot, forged, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'start-sequence',
  })
})

test('replay rejects a forged end sequence', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const forged = forgeJournal(proof, (j) => ({
    ...j,
    endSequence: j.endSequence + 1n,
  }))

  assert.throws(() => verifyTransition(startRoot, forged, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'end-sequence',
  })
})

test('replay rejects a forged update program id', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const forged = forgeJournal(proof, (j) => ({
    ...j,
    updateProgramId: PROGRAM.updateV2,
  }))

  assert.throws(() => verifyTransition(startRoot, forged, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'update-program-id',
  })
})

test('replay rejects a forged active query program id', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const forged = forgeJournal(proof, (j) => ({
    ...j,
    activeQueryProgramId: PROGRAM.queryV2,
  }))

  assert.throws(() => verifyTransition(startRoot, forged, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'query-program-id',
  })
})

test('replay rejects a forged program chain hash', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const forged = forgeJournal(proof, (j) => ({
    ...j,
    programChainHash: flipByte(j.programChainHash),
  }))

  assert.throws(() => verifyTransition(startRoot, forged, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'program-chain-hash',
  })
})

test('replay rejects a forged end root', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const forged = forgeJournal(proof, (j) => ({
    ...j,
    endRoot: flipByte(j.endRoot),
  }))

  assert.throws(() => verifyTransition(startRoot, forged, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'end-root',
  })
})

test('replay rejects a forged batch hash', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const forged = forgeJournal(proof, (j) => ({
    ...j,
    batchHash: flipByte(j.batchHash),
  }))

  assert.throws(() => verifyTransition(startRoot, forged, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'batch-hash',
  })
})

test('replay of a zero-record segment rejects a foreign expected update program id', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(w.tree, [], PROGRAM.updateV1)

  assert.throws(() => verifyTransition(startRoot, proof, PROGRAM.updateV2), {
    code: 'INVALID_PROOF',
    rule: 'wrong-era',
  })
})

test('replay of an honest zero-record segment still verifies', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(w.tree, [], PROGRAM.updateV1)

  const out = verifyTransition(startRoot, proof, PROGRAM.updateV1)
  assert.equal(hex(out.endRoot), hex(startRoot))
})

test('replay rejects an access with the wrong op', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const decoded = roundTripProof(proof)
  const setIndex = decoded.accesses.findIndex((a) => a.op === 2)
  assert.ok(setIndex !== -1)
  const target = decoded.accesses[setIndex]
  const tampered = roundTripProof({
    ...decoded,
    accesses: decoded.accesses.with(setIndex, { ...target, op: 1 }),
  })

  assert.throws(() => verifyTransition(startRoot, tampered, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'access-op',
  })
})

test('replay rejects an access with the wrong key', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const decoded = roundTripProof(proof)
  const target = decoded.accesses[0]
  const tampered = roundTripProof({
    ...decoded,
    accesses: decoded.accesses.with(0, {
      ...target,
      key: flipByte(target.key),
    }),
  })

  assert.throws(() => verifyTransition(startRoot, tampered, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'access-key',
  })
})

test('replay rejects an access with a tampered witness value', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const decoded = roundTripProof(proof)
  const target = decoded.accesses[0]
  assert.ok(target.value)
  const tampered = roundTripProof({
    ...decoded,
    accesses: decoded.accesses.with(0, {
      ...target,
      value: flipByte(target.value),
    }),
  })

  assert.throws(() => verifyTransition(startRoot, tampered, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'access-witness',
  })
})

test('replay rejects a dropped access', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const decoded = roundTripProof(proof)
  const tampered = roundTripProof({
    ...decoded,
    accesses: decoded.accesses.slice(0, -1),
  })

  assert.throws(() => verifyTransition(startRoot, tampered, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'access-underflow',
  })
})

test('replay rejects a surplus access', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const proof = proveBatch(
    w.tree,
    openAliceAndBobThenTransfer(w),
    PROGRAM.updateV1,
  )
  const decoded = roundTripProof(proof)
  const last = decoded.accesses[decoded.accesses.length - 1]
  const tampered = roundTripProof({
    ...decoded,
    accesses: [...decoded.accesses, last],
  })

  assert.throws(() => verifyTransition(startRoot, tampered, PROGRAM.updateV1), {
    code: 'INVALID_PROOF',
    rule: 'access-surplus',
  })
})

test('self-transfer is rejected instead of minting balance', () => {
  const w = buildGenesis()
  const records = seqRecords(w, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 10_000n }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'alice', amount: 10_000n }),
    ],
  ])

  assert.throws(() => proveBatch(w.tree, records, PROGRAM.updateV1), {
    rule: 'self-transfer',
  })
})

test('SET_CONFIG rejects a fee_basis_points value above 10000', () => {
  const w = buildGenesis()
  const records = seqRecords(w, [
    [
      'governance',
      OP.SET_CONFIG,
      encodeSetConfig({
        name: FEE_CONFIG_NAME,
        value: 10_001n,
        activationSequence: 1n + TIMELOCK_CONFIG_MIN,
      }),
    ],
  ])

  assert.throws(() => proveBatch(w.tree, records, PROGRAM.updateV1), {
    rule: 'config-range',
  })
})

test('a legacy bad fee config fails typed instead of crashing', () => {
  const w = buildGenesis()
  w.tree.set(
    configKey(FEE_CONFIG_NAME),
    encodeConfig({ current: 20_000n, next: 0n, nextActivation: 0n }),
  )
  const records = seqRecords(w, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 100n }),
    ],
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'bob', initialBalance: 0n }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: 100n }),
    ],
  ])

  assert.throws(() => proveBatch(w.tree, records, PROGRAM.updateV1), {
    rule: 'fee-overflow',
  })
})

test('a transfer that would overflow the receiver balance fails typed instead of crashing', () => {
  const w = buildGenesis()
  const maxBalance = 2n ** 64n - 1n
  const openRecords = seqRecords(w, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: maxBalance }),
    ],
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'bob', initialBalance: maxBalance }),
    ],
  ])
  proveBatch(w.tree, openRecords, PROGRAM.updateV1)

  const transferRecords = seqRecords(w, [
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: 10_000n }),
    ],
  ])

  assert.throws(() => proveBatch(w.tree, transferRecords, PROGRAM.updateV1), {
    rule: 'balance-overflow',
  })
})

test('proveBatch leaves the caller tree untouched on failure', () => {
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
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'bob', initialBalance: 0n }),
    ],
  ])

  assert.throws(() => proveBatch(w.tree, records, PROGRAM.updateV1), {
    rule: 'account-exists',
  })
  assert.equal(hex(w.tree.root()), hex(startRoot))
})

test('a governance key can revoke its own author record', () => {
  const w = buildGenesis()
  const records = seqRecords(w, [
    [
      'governance',
      OP.SET_AUTHOR,
      encodeSetAuthor({ keyId: w.governance.publicKey, role: 2, status: 0 }),
    ],
  ])

  proveBatch(w.tree, records, PROGRAM.updateV1)

  const raw = w.tree.get(authorKey(w.governance.publicKey))
  assert.ok(raw)
  const record = decodeAuthorRecordV1(raw)
  assert.equal(record.status, 0)
  assert.equal(record.sequence, 1n)
})

test('migration rollover advances the chain, clears pending, and switches the query program', () => {
  const w = buildGenesis()
  const activationSequence = 1n + TIMELOCK_MIGRATION_MIN
  const migrationObject: ProgramMigrationV1 = {
    nextUpdateProgramId: PROGRAM.updateV2,
    nextQueryProgramId: PROGRAM.queryV2,
    nextProgramManifestHash: ZERO32,
    activationSequence,
    governanceAuthorization: new Uint8Array(0),
  }
  const migration = encodeMigration(migrationObject)
  const setupRecords = seqRecords(w, [
    ['governance', OP.COMMIT_MIGRATION, migration],
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'filler-1', initialBalance: 0n }),
    ],
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'filler-2', initialBalance: 0n }),
    ],
  ])
  proveBatch(w.tree, setupRecords, PROGRAM.updateV1)

  const activationRecords = seqRecords(w, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'filler-3', initialBalance: 0n }),
    ],
  ])
  proveBatch(w.tree, activationRecords, PROGRAM.updateV2)

  const chainRaw = w.tree.get(CHAIN_KEY)
  assert.ok(chainRaw)
  const chain = decodeChainStateV1(chainRaw)
  assert.equal(
    hex(chain.chainHash),
    hex(chainNext(GENESIS_CHAIN, migrationObject)),
  )
  assert.equal(hex(chain.updateProgramId), hex(PROGRAM.updateV2))
  assert.equal(hex(chain.queryProgramId), hex(PROGRAM.queryV2))

  const pendingRaw = w.tree.get(MIGRATION_KEY)
  assert.ok(pendingRaw)
  assert.equal(decodePendingMigrationV1(pendingRaw).present, 0)
})

test('encodeAccess rejects a present value on a set access', () => {
  const witness = new Smt().witness(ascii('probe'))
  const setAccess: AccessV1 = {
    op: 2,
    key: ascii('probe'),
    value: ascii('sneaky'),
    witness,
  }

  assert.throws(() => encodeAccess(setAccess), RangeError)
})

test('decodeAccess rejects a present value smuggled onto a set access', () => {
  const tree = new Smt()
  tree.set(ascii('probe'), ascii('v1'))
  const getAccess: AccessV1 = {
    op: 1,
    key: ascii('probe'),
    value: ascii('v1'),
    witness: tree.witness(ascii('probe')),
  }
  const encoded = encodeAccess(getAccess)
  const tampered = encoded.slice()
  tampered[1] = 2

  assert.throws(() => decodeAccess(new Reader(tampered)), DecodeError)
})
