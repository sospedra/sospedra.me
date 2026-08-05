import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { hex, u64be } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import { encodeOpenAccount, encodeTransfer, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  decodeBalanceResult,
  decodeQueryJournal,
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
import { configKey, decodeConfig } from '../protocol/state.ts'
import { FEE_CONFIG_NAME } from '../protocol/transition.ts'
import { genesisTrust } from '../protocol/trust.ts'
import { ReplayView } from '../protocol/view.ts'
import {
  accountIdFromRequest,
  batchSealStep,
  checkStep,
  describedAuthorEventStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const BOB_OPENING_BALANCE = 0n
const TRANSFER_AMOUNT = 1_000n
const ENV_FEE_BP = 9_999n

function envFeeCreditedBalance(
  openingBalance: bigint,
  amount: bigint,
  feeBp: bigint,
): bigint {
  const fee = (amount * feeBp) / 10_000n
  return openingBalance + amount - fee
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

function committedFeeConfigStep(configBytes: Uint8Array): TraceStep {
  const config = decodeConfig(configBytes)
  return {
    actor: 'server',
    kind: 'object',
    label:
      'the committed fee configuration the published query program must actually honor, read from proven state',
    objects: [
      obj('committed-fee-config', 'config-value', configBytes, {
        name: FEE_CONFIG_NAME,
        current: config.current.toString(),
        trust: 'committed',
      }),
    ],
  }
}

function envFeeVarStep(envFeeBp: bigint): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label:
      'this scenario models an env-var-driven fee override named FEE_BP, a value outside canonical state, in place of the fee the transfer actually proved',
    objects: [
      obj('env-fee-var', 'untrusted-env-var', u64be(envFeeBp), {
        name: 'FEE_BP',
        basisPoints: envFeeBp.toString(),
        trust: 'untrusted',
      }),
    ],
  }
}

function envTaintedResultStep(
  envResultBytes: Uint8Array,
  accountId: string,
): TraceStep {
  const balance = decodeBalanceResult(envResultBytes)
  return {
    actor: 'attacker',
    kind: 'act',
    label: `the forged result claims get-balance(${accountId}) = ${balance.balance}, as if the transfer fee had been recomputed with the modeled env-var override instead of the committed one`,
    objects: [
      {
        ...obj('env-tainted-result', 'balance-result', envResultBytes, {
          accountId,
          exists: String(balance.exists),
          balance: balance.balance.toString(),
        }),
        hash: hex(resultHash(envResultBytes)),
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
      'the server signs an immediate query receipt over the lying result hash, modeled on the env-var fee override',
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

function replayedTrueResultStep(
  replayedResultBytes: Uint8Array,
  accountId: string,
): TraceStep {
  const balance = decodeBalanceResult(replayedResultBytes)
  return {
    actor: 'client',
    kind: 'object',
    label: `independently replaying the published query program over the same, untouched state accesses recovers get-balance(${accountId}) = ${balance.balance}, the true committed balance; no deployment-time configuration outside canonical state, modeled here as an environment variable, can change what the proven program already computed`,
    objects: [
      {
        ...obj('replayed-true-result', 'balance-result', replayedResultBytes, {
          accountId,
          exists: String(balance.exists),
          balance: balance.balance.toString(),
        }),
        hash: hex(resultHash(replayedResultBytes)),
      },
    ],
  }
}

function requireCachedProof(server: Server, cacheKey: string): Uint8Array {
  const bytes = server.proofCache.get(cacheKey)
  if (!bytes) throw new Error('s09: expected a cached honest query proof')
  return bytes
}

function requireConfig(server: Server): Uint8Array {
  const bytes = server.tree.get(configKey(FEE_CONFIG_NAME))
  if (!bytes) throw new Error('s09: expected a committed fee config')
  return bytes
}

function run(): Trace {
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
      encodeOpenAccount({
        accountId: 'bob',
        initialBalance: BOB_OPENING_BALANCE,
      }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: TRANSFER_AMOUNT }),
    ],
  ])
  for (const record of records) server.submit(record)
  const sealProof = server.sealBatch()
  const configBytes = requireConfig(server)

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'bob' }),
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
  const client = new Client(trust, 's09-env-var-semantics-client')
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

  const envResultBytes = encodeBalanceResult({
    exists: true,
    balance: envFeeCreditedBalance(
      BOB_OPENING_BALANCE,
      TRANSFER_AMOUNT,
      ENV_FEE_BP,
    ),
  })
  const lyingResultHash = resultHash(envResultBytes)

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
    envResultBytes,
  )

  const bundle = server.proofFor({
    receiptBytes: forgedReceiptBytes,
    sinceSequence: trust.highestSequence,
  })
  const bundleBytes = encodeBundle(bundle)

  if (bundle.latestHead === null) {
    throw new Error('s09: expected a latest-head statement')
  }
  const head = decodeLatestHead(bundle.latestHead)
  const result = client.acceptBundle(bundleBytes, head.latestAsOfMs)
  if (result.ok) {
    throw new Error('s09: expected REJECT, got ACCEPT')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(describedAuthorEventStep),
    batchSealStep(
      sealProof,
      'the honest server seals the opening balances and fee-bearing transfer into a transition proof',
    ),
    committedFeeConfigStep(configBytes),
    queryRequestStep(requestBytes, nonce),
    envFeeVarStep(ENV_FEE_BP),
    envTaintedResultStep(envResultBytes, accountId),
    forgedQueryJournalStep(honestJournal, forgedJournal),
    receiptStep(forgedReceiptBytes),
    replayedTrueResultStep(replayedResultBytes, accountId),
    ...result.checks.map((check) => checkStep(check)),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'REJECT',
      error: result.error,
      note: `this scenario models the transfer fee as recomputed from a mutable, untrusted environment variable (${ENV_FEE_BP} basis points) instead of the committed config (${decodeConfig(configBytes).current} basis points); replaying the published query program over the same proven state accesses disagrees with that claim, so rule "${result.rule}" catches it during query-proof verification`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 9,
    slug: 'env-var-semantics',
    title: 'Environment-variable semantic changes',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['6.1', '12', '13', '17'],
    expected: 'REJECT INVALID_PROOF (result)',
  },
  run,
}
