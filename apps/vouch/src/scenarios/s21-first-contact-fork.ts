import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle, type ResponseBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import type { GlobalEventRecordV1 } from '../protocol/events.ts'
import type { SignedHead } from '../protocol/evidence.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import { encodeOpenAccount, encodeTransfer, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  decodeBalanceResult,
  encodeGetBalanceBody,
  encodeQueryRequest,
  REQ,
  requestHash,
} from '../protocol/query.ts'
import { decodeQueryReceipt, receiptSigningInput } from '../protocol/receipt.ts'
import {
  decodeTransitionJournal,
  type TransparentTransitionProofV1,
} from '../protocol/transition.ts'
import { type GenesisAnchors, genesisTrust } from '../protocol/trust.ts'
import {
  accountIdFromRequest,
  checkStep,
  describedAuthorEventStep,
  genesisAnchorsStep,
  headStatementStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

export const SPEC_FIRST_CONTACT_LIMIT =
  'First contact initializes from the app-pinned genesis. First contact ' +
  'proves valid genesis descent, not global freshness or uniqueness of the ' +
  'presented descendant.'

type WorldHistory = {
  server: Server
  records: GlobalEventRecordV1[]
  sealProof: TransparentTransitionProofV1
}

function buildWorldHistory(transferAmount: bigint): WorldHistory {
  const world = buildGenesis()
  const server = new Server(world)
  const records = seqRecords(world, [
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
      encodeTransfer({ from: 'alice', to: 'bob', amount: transferAmount }),
    ],
  ])
  for (const record of records) server.submit(record)
  const sealProof = server.sealBatch()
  return { server, records, sealProof }
}

function worldSealStep(
  name: string,
  proof: TransparentTransitionProofV1,
  label: string,
): TraceStep {
  const journal = decodeTransitionJournal(proof.journal)
  return {
    actor: 'server',
    kind: 'object',
    label,
    objects: [
      {
        ...obj(name, 'transition-journal', proof.journal, {
          startRoot: hex(journal.startRoot),
          endRoot: hex(journal.endRoot),
          startSequence: journal.startSequence.toString(),
          endSequence: journal.endSequence.toString(),
        }),
        hash: hex(journal.batchHash),
      },
    ],
  }
}

function requireSignedHead(
  bundle: Pick<ResponseBundle, 'latestHead' | 'latestHeadSignature'>,
): SignedHead {
  if (bundle.latestHead === null || bundle.latestHeadSignature === null) {
    throw new Error('s21: expected a latest-head statement')
  }
  return { headBytes: bundle.latestHead, signature: bundle.latestHeadSignature }
}

function queryRequestStep(
  world: string,
  requestBytes: Uint8Array,
  nonce: Uint8Array,
): TraceStep {
  const accountId = accountIdFromRequest(requestBytes)
  return {
    actor: 'client',
    kind: 'act',
    label: `${world}: a fresh client, holding only genesis trust, requests get-balance(${accountId})`,
    detail: `nonce ${hex(nonce)}`,
    objects: [
      {
        ...obj(`query-request-${world}`, 'query-request', requestBytes, {
          world,
          requestType: String(REQ.GET_BALANCE),
          accountId,
        }),
        hash: hex(requestHash(requestBytes)),
      },
    ],
  }
}

function receiptStep(world: string, receiptBytes: Uint8Array): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: `${world}: server signs an honest immediate query receipt over its own history`,
    objects: [
      {
        ...obj(`receipt-${world}`, 'query-receipt', receiptBytes, {
          stateRoot: hex(receipt.stateRoot),
          stateSequence: receipt.stateSequence.toString(),
          resultHash: hex(receipt.resultHash),
          nonce: hex(receipt.nonce),
        }),
        hash: hex(receiptSigningInput(receiptBytes)),
      },
    ],
  }
}

function balanceResultStep(
  world: string,
  label: string,
  resultBytes: Uint8Array,
): TraceStep {
  const result = decodeBalanceResult(resultBytes)
  return {
    actor: 'server',
    kind: 'object',
    label,
    objects: [
      obj(`balance-${world}`, 'balance-result', resultBytes, {
        exists: String(result.exists),
        balance: result.balance.toString(),
      }),
    ],
  }
}

function run(): Trace {
  const worldA = buildWorldHistory(100n)
  const worldB = buildWorldHistory(999n)

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'bob' }),
  })

  const anchors: GenesisAnchors = {
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  }

  const clientA = new Client(
    genesisTrust(anchors),
    's21-first-contact-fork-client-on-world-a',
  )
  const { nonce: nonceA } = clientA.request(requestBytes)
  const { receiptBytes: receiptBytesA } = worldA.server.execute(
    requestBytes,
    nonceA,
  )
  const bundleA = worldA.server.proofFor({
    receiptBytes: receiptBytesA,
    sinceSequence: 0n,
  })
  const signedHeadA = requireSignedHead(bundleA)
  const headA = decodeLatestHead(signedHeadA.headBytes)
  const resultA = clientA.acceptBundle(
    encodeBundle(bundleA),
    headA.latestAsOfMs,
  )
  if (!resultA.ok) {
    throw new Error('s21: expected world A to genuinely verify (ACCEPT)')
  }

  const clientB = new Client(
    genesisTrust(anchors),
    's21-first-contact-fork-client-on-world-b',
  )
  const { nonce: nonceB } = clientB.request(requestBytes)
  const { receiptBytes: receiptBytesB } = worldB.server.execute(
    requestBytes,
    nonceB,
  )
  const bundleB = worldB.server.proofFor({
    receiptBytes: receiptBytesB,
    sinceSequence: 0n,
  })
  const signedHeadB = requireSignedHead(bundleB)
  const headB = decodeLatestHead(signedHeadB.headBytes)
  const resultB = clientB.acceptBundle(
    encodeBundle(bundleB),
    headB.latestAsOfMs,
  )
  if (!resultB.ok) {
    throw new Error('s21: expected world B to genuinely verify (ACCEPT)')
  }

  const balanceA = decodeBalanceResult(bundleA.canonicalResult)
  const balanceB = decodeBalanceResult(bundleB.canonicalResult)

  const steps: TraceStep[] = [
    genesisAnchorsStep(
      'genesis anchors pinned by a first-contact client, before either fork exists',
    ),
    ...worldA.records.map(describedAuthorEventStep),
    worldSealStep(
      'world-a-seal',
      worldA.sealProof,
      'world A seals its own history from the pinned genesis: alice opens both accounts, then transfers 100 to bob',
    ),
    ...worldB.records.map(describedAuthorEventStep),
    worldSealStep(
      'world-b-seal',
      worldB.sealProof,
      'world B seals a DIFFERENT history from the IDENTICAL pinned genesis: alice opens both accounts, then transfers 999 to bob',
    ),
    queryRequestStep('world-a', requestBytes, nonceA),
    receiptStep('world-a', receiptBytesA),
    headStatementStep(
      'head-world-a',
      "world A signs its own latest-head statement, over world A's own root",
      signedHeadA,
    ),
    balanceResultStep(
      'world-a',
      "world A's own honest, independently-verified query result: bob's balance in world A",
      bundleA.canonicalResult,
    ),
    ...resultA.checks.map((check) => checkStep(check, 'world-a')),
    queryRequestStep('world-b', requestBytes, nonceB),
    receiptStep('world-b', receiptBytesB),
    headStatementStep(
      'head-world-b',
      "world B signs its own latest-head statement, over world B's own root",
      signedHeadB,
    ),
    balanceResultStep(
      'world-b',
      "the fresh client's honest query result: bob's balance in world B",
      bundleB.canonicalResult,
    ),
    ...resultB.checks.map((check) => checkStep(check, 'world-b')),
  ]

  return {
    steps,
    checks: [...resultA.checks, ...resultB.checks],
    verdict: {
      kind: 'LIMITATION',
      note: `world A and world B both descend from the identical pinned genesis root ${hex(GENESIS_ROOT)}, then diverge at a single transfer amount (100 in world A, 999 in world B). Each history is honestly sealed, and a fresh client holding only genesis trust fully verifies EITHER bundle, and every check in that ladder genuinely passes — bob's balance is ${balanceA.balance} in world A and ${balanceB.balance} in world B, and nothing in first-contact verification can tell which one is canonical, or whether more forks exist. ${SPEC_FIRST_CONTACT_LIMIT}`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 21,
    slug: 'first-contact-fork',
    title: 'First-contact valid-fork limitation',
    taxonomy: 'LIMITATION',
    specRefs: ['4', '18'],
    expected: 'LIMITATION',
  },
  run,
}
