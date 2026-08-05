import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import {
  decodeAuthorEvent,
  type GlobalEventRecordV1,
} from '../protocol/events.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import { decodeOpenAccount, encodeOpenAccount, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  decodeBalanceResult,
  decodeGetBalanceBody,
  decodeQueryJournal,
  decodeQueryRequest,
  decodeTransparentQueryProof,
  encodeBalanceResult,
  encodeGetBalanceBody,
  encodeQueryJournal,
  encodeQueryRequest,
  encodeTransparentQueryProof,
  type QueryJournalV1,
  REQ,
  requestHash,
  resultHash,
  runQuery,
  type TransparentQueryProofV1,
} from '../protocol/query.ts'
import {
  decodeQueryReceipt,
  encodeQueryReceipt,
  proofCacheKey,
  type QueryReceiptV1,
  receiptSigningInput,
} from '../protocol/receipt.ts'
import {
  decodeTransitionJournal,
  type TransparentTransitionProofV1,
} from '../protocol/transition.ts'
import { genesisTrust } from '../protocol/trust.ts'
import type { CheckLog } from '../protocol/verify.ts'
import { ReplayView } from '../protocol/view.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const BONUS = 1_000n

function genesisAnchorsStep(): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label: 'genesis anchors pinned by the client',
    objects: [
      obj('genesis-anchors', 'genesis-anchors', GENESIS_ROOT, {
        genesisRoot: hex(GENESIS_ROOT),
        updateProgramId: hex(PROGRAM.updateV1),
        queryProgramId: hex(PROGRAM.queryV1),
        programChainHash: hex(GENESIS_CHAIN),
      }),
    ],
  }
}

function authorEventStep(record: GlobalEventRecordV1): TraceStep {
  const event = decodeAuthorEvent(record.authorEvent)
  const open = decodeOpenAccount(event.payload)
  return {
    actor: 'author',
    kind: 'object',
    label: `alice opens account ${open.accountId} with balance ${open.initialBalance}`,
    objects: [
      {
        ...obj('author-event', 'author-event', record.authorEvent, {
          authorKeyId: hex(event.authorKeyId),
          authorSequence: event.authorSequence.toString(),
          globalSequence: record.globalSequence.toString(),
        }),
        hash: hex(record.eventHash),
      },
    ],
  }
}

function batchSealStep(proof: TransparentTransitionProofV1): TraceStep {
  const journal = decodeTransitionJournal(proof.journal)
  return {
    actor: 'server',
    kind: 'object',
    label:
      'the honest server seals the opening balance into a transition proof',
    objects: [
      {
        ...obj('batch-seal', 'transition-journal', proof.journal, {
          startRoot: hex(journal.startRoot),
          endRoot: hex(journal.endRoot),
          startSequence: journal.startSequence.toString(),
          endSequence: journal.endSequence.toString(),
          updateProgramId: hex(journal.updateProgramId),
        }),
        hash: hex(journal.batchHash),
      },
    ],
  }
}

function accountIdFromRequest(requestBytes: Uint8Array): string {
  return decodeGetBalanceBody(decodeQueryRequest(requestBytes).body).accountId
}

function queryRequestStep(
  requestBytes: Uint8Array,
  nonce: Uint8Array,
): TraceStep {
  const accountId = accountIdFromRequest(requestBytes)
  return {
    actor: 'client',
    kind: 'act',
    label: `client requests get-balance(${accountId}) with a fresh nonce`,
    detail: `nonce ${hex(nonce)}`,
    objects: [
      {
        ...obj('query-request', 'query-request', requestBytes, {
          requestType: String(REQ.GET_BALANCE),
          accountId,
        }),
        hash: hex(requestHash(requestBytes)),
      },
    ],
  }
}

function addBonus(resultBytes: Uint8Array, bonus: bigint): Uint8Array {
  const balance = decodeBalanceResult(resultBytes)
  return encodeBalanceResult({
    exists: balance.exists,
    balance: balance.balance + bonus,
  })
}

function hiddenFunctionStep(
  hiddenResultBytes: Uint8Array,
  accountId: string,
): TraceStep {
  const balance = decodeBalanceResult(hiddenResultBytes)
  return {
    actor: 'attacker',
    kind: 'act',
    label: `a hidden server function computes get-balance(${accountId}) = ${balance.balance}, a silent +${BONUS} bonus on top of the honest balance, before anything is signed`,
    objects: [
      {
        ...obj('hidden-function-output', 'balance-result', hiddenResultBytes, {
          accountId,
          exists: String(balance.exists),
          balance: balance.balance.toString(),
        }),
        hash: hex(resultHash(hiddenResultBytes)),
      },
    ],
  }
}

function forgedQueryJournalStep(
  honestJournal: QueryJournalV1,
  forgedJournal: QueryJournalV1,
): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label:
      'the server plants a lying journal into its own proof cache; every field but resultHash, and every recorded state access, stays exactly as the honest run produced it',
    detail: `resultHash: ${hex(honestJournal.resultHash)} -> ${hex(forgedJournal.resultHash)}`,
    objects: [
      obj(
        'forged-query-journal',
        'query-journal',
        encodeQueryJournal(forgedJournal),
        {
          stateRoot: hex(forgedJournal.stateRoot),
          stateSequence: forgedJournal.stateSequence.toString(),
          resultHash: hex(forgedJournal.resultHash),
          queryProgramId: hex(forgedJournal.queryProgramId),
        },
      ),
    ],
  }
}

function receiptStep(receiptBytes: Uint8Array): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label:
      'the server signs an immediate query receipt over the lying result hash',
    objects: [
      {
        ...obj('receipt', 'query-receipt', receiptBytes, {
          stateRoot: hex(receipt.stateRoot),
          stateSequence: receipt.stateSequence.toString(),
          resultHash: hex(receipt.resultHash),
          nonce: hex(receipt.nonce),
          issuedAtMs: receipt.issuedAtMs.toString(),
          proofDeadlineMs: receipt.proofDeadlineMs.toString(),
        }),
        hash: hex(receiptSigningInput(receiptBytes)),
      },
    ],
  }
}

function replayedHonestResultStep(
  replayedResultBytes: Uint8Array,
  accountId: string,
): TraceStep {
  const balance = decodeBalanceResult(replayedResultBytes)
  return {
    actor: 'client',
    kind: 'object',
    label: `independently replaying the published query program over the same, untouched state accesses recovers get-balance(${accountId}) = ${balance.balance}, the true balance`,
    objects: [
      {
        ...obj(
          'replayed-honest-result',
          'balance-result',
          replayedResultBytes,
          {
            accountId,
            exists: String(balance.exists),
            balance: balance.balance.toString(),
          },
        ),
        hash: hex(resultHash(replayedResultBytes)),
      },
    ],
  }
}

function checkStep(check: CheckLog): TraceStep {
  return {
    actor: 'client',
    kind: 'check',
    label: check.name,
    detail: check.skipped ? 'skipped' : undefined,
    check: { name: check.name, pass: check.pass, error: check.error },
  }
}

function requireCachedProof(server: Server, cacheKey: string): Uint8Array {
  const bytes = server.proofCache.get(cacheKey)
  if (!bytes) throw new Error('s05: expected a cached honest query proof')
  return bytes
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)

  const records = seqRecords(world, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 5_000n }),
    ],
  ])
  for (const record of records) server.submit(record)
  const sealProof = server.sealBatch()

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'alice' }),
  })
  const accountId = accountIdFromRequest(requestBytes)

  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's05-hidden-algorithm-client')
  const { nonce } = client.request(requestBytes)

  const { receiptBytes: honestReceiptBytes } = server.execute(
    requestBytes,
    nonce,
  )
  const honestReceipt = decodeQueryReceipt(honestReceiptBytes)
  const cacheKey = hex(
    proofCacheKey(
      honestReceipt.queryProgramId,
      honestReceipt.stateRoot,
      honestReceipt.requestHash,
    ),
  )
  const honestProof = decodeTransparentQueryProof(
    requireCachedProof(server, cacheKey),
  )
  const honestJournal = decodeQueryJournal(honestProof.journal)

  const replayView = new ReplayView(
    honestJournal.stateRoot,
    honestProof.accesses.slice(),
  )
  const replayedResultBytes = runQuery(
    replayView,
    honestProof.requestBytes,
    honestJournal.queryProgramId,
  )

  const hiddenResultBytes = addBonus(replayedResultBytes, BONUS)
  const lyingResultHash = resultHash(hiddenResultBytes)

  const forgedJournal: QueryJournalV1 = {
    ...honestJournal,
    resultHash: lyingResultHash,
  }
  const forgedProof: TransparentQueryProofV1 = {
    journal: encodeQueryJournal(forgedJournal),
    requestBytes: honestProof.requestBytes,
    accesses: honestProof.accesses,
  }
  server.proofCache.set(cacheKey, encodeTransparentQueryProof(forgedProof))

  const forgedReceipt: QueryReceiptV1 = {
    ...honestReceipt,
    resultHash: lyingResultHash,
  }
  const forgedReceiptBytes = encodeQueryReceipt(forgedReceipt)
  server.resultOverrides.set(
    hex(receiptSigningInput(forgedReceiptBytes)),
    hiddenResultBytes,
  )

  const bundle = server.proofFor({
    receiptBytes: forgedReceiptBytes,
    sinceSequence: trust.highestSequence,
  })
  const bundleBytes = encodeBundle(bundle)

  if (bundle.latestHead === null) {
    throw new Error('s05: expected a latest-head statement')
  }
  const head = decodeLatestHead(bundle.latestHead)
  const result = client.acceptBundle(bundleBytes, head.latestAsOfMs)
  if (result.ok) {
    throw new Error('s05: expected REJECT, got ACCEPT')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(authorEventStep),
    batchSealStep(sealProof),
    queryRequestStep(requestBytes, nonce),
    hiddenFunctionStep(hiddenResultBytes, accountId),
    forgedQueryJournalStep(honestJournal, forgedJournal),
    receiptStep(forgedReceiptBytes),
    replayedHonestResultStep(replayedResultBytes, accountId),
    ...result.checks.map(checkStep),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'REJECT',
      error: result.error,
      note: `the hidden function's +${BONUS} bonus never reaches the published query program; replaying that program over the same, untouched state accesses recovers the honest balance, so the server's claimed result cannot be finalized and rule "${result.rule}" catches it during query-proof verification`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 5,
    slug: 'hidden-algorithm',
    title: 'Hidden algorithm cannot finalize a lie',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['6.1', '12', '13', '17'],
    expected: 'REJECT INVALID_PROOF (result)',
  },
  run,
}
