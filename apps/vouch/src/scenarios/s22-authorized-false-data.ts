import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import { encodeOpenAccount, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  decodeBalanceResult,
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
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

export const SPEC_AUTHORIZATION_NOT_TRUTH_LIMIT =
  'The system does not guarantee that authorized input data is true in the ' +
  'physical world.'

function claimedBalanceStep(
  accountId: string,
  initialBalance: bigint,
  payloadBytes: Uint8Array,
): TraceStep {
  return {
    actor: 'author',
    kind: 'object',
    label: `alice's signed claim carries a number, not a fact: account "${accountId}" opens with initialBalance ${initialBalance}`,
    objects: [
      obj('physical-world-claim', 'open-account', payloadBytes, {
        accountId,
        claimedInitialBalance: initialBalance.toString(),
        verifiedByProtocol:
          'authorization, signature, chain-of-custody, computation',
        notVerifiedByProtocol: 'correspondence to any real-world audit balance',
      }),
    ],
  }
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

function receiptStep(receiptBytes: Uint8Array): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label:
      'server signs an honest immediate query receipt over the authorized-but-physically-unverifiable balance',
    objects: [
      {
        ...obj('receipt', 'query-receipt', receiptBytes, {
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

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)
  const accountId = 'auditor'
  const initialBalance = 1_000_000n
  const openAccountPayload = encodeOpenAccount({ accountId, initialBalance })

  const records = seqRecords(world, [
    ['alice', OP.OPEN_ACCOUNT, openAccountPayload],
  ])
  for (const record of records) server.submit(record)
  const sealProof = server.sealBatch()

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId }),
  })

  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's22-authorized-false-data-client')
  const { nonce } = client.request(requestBytes)

  const { receiptBytes } = server.execute(requestBytes, nonce)
  const bundle = server.proofFor({
    receiptBytes,
    sinceSequence: trust.highestSequence,
  })
  const bundleBytes = encodeBundle(bundle)

  if (bundle.latestHead === null) {
    throw new Error('s22: expected a latest-head statement')
  }
  const head = decodeLatestHead(bundle.latestHead)
  const result = client.acceptBundle(bundleBytes, head.latestAsOfMs)
  if (!result.ok) {
    throw new Error(`s22: expected ACCEPT, got ${result.error}`)
  }

  const balanceResult = decodeBalanceResult(bundle.canonicalResult)

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(balanceOpenedAuthorEventStep),
    claimedBalanceStep(accountId, initialBalance, openAccountPayload),
    batchSealStep(
      sealProof,
      "the honest server seals alice's authorized opening balance into a transition proof, exactly as claimed",
    ),
    queryRequestStep(requestBytes, nonce),
    receiptStep(receiptBytes),
    ...result.checks.map((check) => checkStep(check)),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'LIMITATION',
      note: `every check in this ladder genuinely passes: alice is a properly authorized author, her signature and author chain are valid, the transition proof honestly seals her event, and the receipt, query proof, and head are all correctly signed over the resulting state — account "${accountId}" now genuinely holds ${balanceResult.balance} in canonical state, exactly as alice claimed. ACCEPT is correct protocol behavior here, not a bug: the protocol has no channel for checking whether ${balanceResult.balance} corresponds to any real audit budget in the physical world; it proves who said it and that it was processed correctly, not that it is true. ${SPEC_AUTHORIZATION_NOT_TRUTH_LIMIT}`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 22,
    slug: 'authorized-false-data',
    title: 'Authorized false-data limitation',
    taxonomy: 'LIMITATION',
    specRefs: ['1', '4'],
    expected: 'LIMITATION',
  },
  run,
}
