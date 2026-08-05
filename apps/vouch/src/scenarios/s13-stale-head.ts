import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle, type ResponseBundle } from '../protocol/bundle.ts'
import { hex, u64be } from '../protocol/bytes.ts'
import { FRESHNESS, PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import type { FreshnessPolicy } from '../protocol/head.ts'
import { encodeOpenAccount, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  encodeGetBalanceBody,
  encodeQueryRequest,
  REQ,
  requestHash,
} from '../protocol/query.ts'
import { decodeQueryReceipt, receiptSigningInput } from '../protocol/receipt.ts'
import { genesisTrust } from '../protocol/trust.ts'
import {
  accountIdFromRequest,
  balanceOpenedAuthorEventStep,
  batchSealStep,
  checkStep,
  genesisAnchorsStep,
  headStatementStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const STALE_OVERAGE_MS = 1_000n

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

function receiptStep(receiptBytes: Uint8Array): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: 'server signs an honest immediate query receipt',
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

function freshnessArithmeticStep(
  now: bigint,
  staleMs: bigint,
  policy: FreshnessPolicy,
): TraceStep {
  const ageMs = now - staleMs
  const overageMs = ageMs - policy.maxHeadAgeMs
  return {
    actor: 'server',
    kind: 'object',
    label: `the server signs a head that is honest about current state, but stamps latestAsOfMs ${staleMs} — ${ageMs}ms before the client's own clock reading of ${now}, ${overageMs}ms past the ${policy.maxHeadAgeMs}ms maxHeadAgeMs policy`,
    objects: [
      obj('freshness-policy', 'freshness-policy', u64be(policy.maxHeadAgeMs), {
        maxHeadAgeMs: policy.maxHeadAgeMs.toString(),
        clockSkewMs: policy.clockSkewMs.toString(),
      }),
      obj('stale-head-age', 'freshness-age', u64be(ageMs), {
        headLatestAsOfMs: staleMs.toString(),
        clientNowMs: now.toString(),
        ageMs: ageMs.toString(),
      }),
    ],
  }
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

  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's13-stale-head-client')
  const { nonce } = client.request(requestBytes)

  const { receiptBytes } = server.execute(requestBytes, nonce)
  const honestBundle = server.proofFor({ receiptBytes, sinceSequence: 0n })

  const now = server.clockMs
  const staleMs = now - FRESHNESS.maxHeadAgeMs - STALE_OVERAGE_MS
  const { headBytes: staleHeadBytes, sig: staleSignature } =
    server.signedHead(staleMs)

  const staleBundle: ResponseBundle = {
    ...honestBundle,
    latestHead: staleHeadBytes,
    latestHeadSignature: staleSignature,
  }
  const result = client.acceptBundle(encodeBundle(staleBundle), now)
  if (result.ok) {
    throw new Error('s13: expected REJECT, got ACCEPT')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(balanceOpenedAuthorEventStep),
    batchSealStep(
      sealProof,
      'the honest server seals the opening balance into a transition proof',
    ),
    queryRequestStep(requestBytes, nonce),
    receiptStep(receiptBytes),
    freshnessArithmeticStep(now, staleMs, FRESHNESS),
    headStatementStep(
      'stale-head',
      'the server signs this head honestly against its real, current state — only its claimed latestAsOfMs is stale',
      { headBytes: staleHeadBytes, signature: staleSignature },
    ),
    ...result.checks.map((check) => checkStep(check)),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'REJECT',
      error: result.error,
      note: `the bundle is honest in every other respect — receipt, query proof, and transition proof all check out — but its latest-head statement claims latestAsOfMs ${staleMs}, ${now - staleMs}ms before the client's own clock reading of ${now}, past the ${FRESHNESS.maxHeadAgeMs}ms maxHeadAgeMs policy, so rule "${result.rule}" catches it`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 13,
    slug: 'stale-head',
    title: 'Stale head rejection',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['6.1', '14.2', '17'],
    expected: 'REJECT STALE_HEAD',
  },
  run,
}
