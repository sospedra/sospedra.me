import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import type { GlobalEventRecordV1 } from '../src/protocol/events.ts'
import {
  buildGenesis,
  seqRecords,
  type World,
} from '../src/protocol/genesis.ts'
import { encodeOpenAccount, encodeTransfer, OP } from '../src/protocol/ops.ts'
import { PROGRAM } from '../src/protocol/program.ts'
import {
  decodeBalanceResult,
  decodeQueryJournal,
  decodeTransfersResult,
  decodeTransparentQueryProof,
  encodeGetBalanceBody,
  encodeListTransfersBody,
  encodeQueryJournal,
  encodeQueryRequest,
  encodeTransparentQueryProof,
  proveQuery,
  type QueryJournalV1,
  REQ,
  requestHash,
  resultHash,
  type TransparentQueryProofV1,
  verifyQuery,
} from '../src/protocol/query.ts'
import type { Smt } from '../src/protocol/smt.ts'
import {
  CHAIN_KEY,
  decodeChainStateV1,
  decodeSequenceV1,
  decodeTransferLogV1,
  SEQUENCE_KEY,
  transfersKey,
} from '../src/protocol/state.ts'
import { proveBatch } from '../src/protocol/transition.ts'

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

function readMeta(tree: Smt): {
  stateSequence: bigint
  queryProgramId: Uint8Array
  programChainHash: Uint8Array
} {
  const sequenceRaw = tree.get(SEQUENCE_KEY)
  assert.ok(sequenceRaw)
  const chainRaw = tree.get(CHAIN_KEY)
  assert.ok(chainRaw)
  const chain = decodeChainStateV1(chainRaw)
  return {
    stateSequence: decodeSequenceV1(sequenceRaw).value,
    queryProgramId: chain.queryProgramId,
    programChainHash: chain.chainHash,
  }
}

function expectedJournal(
  tree: Smt,
  requestBytes: Uint8Array,
  resultBytes: Uint8Array,
): QueryJournalV1 {
  const meta = readMeta(tree)
  return {
    stateRoot: tree.root(),
    stateSequence: meta.stateSequence,
    requestHash: requestHash(requestBytes),
    resultHash: resultHash(resultBytes),
    queryProgramId: meta.queryProgramId,
    programChainHash: meta.programChainHash,
  }
}

function roundTripProof(
  proof: TransparentQueryProofV1,
): TransparentQueryProofV1 {
  return decodeTransparentQueryProof(encodeTransparentQueryProof(proof))
}

function flipByte(bytes: Uint8Array): Uint8Array {
  const copy = bytes.slice()
  copy[0] ^= 1
  return copy
}

test('balance query proves and replays', () => {
  const w = buildGenesis()
  proveBatch(w.tree, openAliceAndBobThenTransfer(w), PROGRAM.updateV1)

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'bob' }),
  })
  const meta = readMeta(w.tree)
  const { resultBytes, proof } = proveQuery(w.tree, requestBytes, meta)

  const result = decodeBalanceResult(resultBytes)
  assert.equal(result.exists, true)
  assert.equal(result.balance, 975n)

  assert.doesNotThrow(() =>
    verifyQuery(proof, expectedJournal(w.tree, requestBytes, resultBytes)),
  )
})

test('completeness: list-transfers returns the witnessed full log tail', () => {
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
      encodeTransfer({ from: 'alice', to: 'bob', amount: 100n }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: 100n }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: 100n }),
    ],
  ])
  proveBatch(w.tree, records, PROGRAM.updateV1)

  const transfersRaw = w.tree.get(transfersKey('bob'))
  assert.ok(transfersRaw)
  const fullLog = decodeTransferLogV1(transfersRaw).entries
  assert.equal(fullLog.length, 3)

  const requestBytes = encodeQueryRequest({
    requestType: REQ.LIST_TRANSFERS,
    requestVersion: 1,
    body: encodeListTransfersBody({ accountId: 'bob', limit: 2 }),
  })
  const meta = readMeta(w.tree)
  const { resultBytes, proof } = proveQuery(w.tree, requestBytes, meta)
  const result = decodeTransfersResult(resultBytes)

  assert.deepEqual(result.entries.map(hex), fullLog.slice(-2).map(hex))

  assert.doesNotThrow(() =>
    verifyQuery(proof, expectedJournal(w.tree, requestBytes, resultBytes)),
  )
})

test('a lying result hash fails replay', () => {
  const w = buildGenesis()
  proveBatch(w.tree, openAliceAndBobThenTransfer(w), PROGRAM.updateV1)

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'bob' }),
  })
  const meta = readMeta(w.tree)
  const { resultBytes, proof } = proveQuery(w.tree, requestBytes, meta)

  const journal = decodeQueryJournal(proof.journal)
  const forgedJournal: QueryJournalV1 = {
    ...journal,
    resultHash: resultHash(flipByte(resultBytes)),
  }
  const forgedProof: TransparentQueryProofV1 = {
    ...proof,
    journal: encodeQueryJournal(forgedJournal),
  }

  assert.throws(() => verifyQuery(forgedProof, forgedJournal), {
    code: 'INVALID_PROOF',
    rule: 'result',
  })
})

test('non-membership balance verifies', () => {
  const w = buildGenesis()
  proveBatch(w.tree, openAliceAndBobThenTransfer(w), PROGRAM.updateV1)

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'ghost' }),
  })
  const meta = readMeta(w.tree)
  const { resultBytes, proof } = proveQuery(w.tree, requestBytes, meta)

  const result = decodeBalanceResult(resultBytes)
  assert.equal(result.exists, false)
  assert.equal(result.balance, 0n)
  assert.equal(proof.accesses.length, 1)
  assert.equal(proof.accesses[0].value, null)

  assert.doesNotThrow(() =>
    verifyQuery(proof, expectedJournal(w.tree, requestBytes, resultBytes)),
  )
})

test('a forged state root fails the journal check', () => {
  const w = buildGenesis()
  proveBatch(w.tree, openAliceAndBobThenTransfer(w), PROGRAM.updateV1)

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'bob' }),
  })
  const meta = readMeta(w.tree)
  const { resultBytes, proof } = proveQuery(w.tree, requestBytes, meta)
  const expected: QueryJournalV1 = {
    ...expectedJournal(w.tree, requestBytes, resultBytes),
    stateRoot: flipByte(w.tree.root()),
  }

  assert.throws(() => verifyQuery(proof, expected), {
    code: 'JOURNAL_MISMATCH',
    rule: 'state-root',
  })
})

test('a surplus access fails the drained check', () => {
  const w = buildGenesis()
  proveBatch(w.tree, openAliceAndBobThenTransfer(w), PROGRAM.updateV1)

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'bob' }),
  })
  const meta = readMeta(w.tree)
  const { resultBytes, proof } = proveQuery(w.tree, requestBytes, meta)
  const expected = expectedJournal(w.tree, requestBytes, resultBytes)

  const decoded = roundTripProof(proof)
  const last = decoded.accesses[decoded.accesses.length - 1]
  const tampered = roundTripProof({
    ...decoded,
    accesses: [...decoded.accesses, last],
  })

  assert.throws(() => verifyQuery(tampered, expected), {
    code: 'INVALID_PROOF',
    rule: 'access-surplus',
  })
})

test('a tampered access value fails the witness check', () => {
  const w = buildGenesis()
  proveBatch(w.tree, openAliceAndBobThenTransfer(w), PROGRAM.updateV1)

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'bob' }),
  })
  const meta = readMeta(w.tree)
  const { resultBytes, proof } = proveQuery(w.tree, requestBytes, meta)
  const expected = expectedJournal(w.tree, requestBytes, resultBytes)

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

  assert.throws(() => verifyQuery(tampered, expected), {
    code: 'INVALID_PROOF',
    rule: 'access-witness',
  })
})
