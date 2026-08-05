import { Client } from '../actors/client.ts'
import { PROOF_WINDOW_MS, Server } from '../actors/server.ts'
import { encodeBundle, type ResponseBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import { sign } from '../protocol/keys.ts'
import { encodeOpenAccount, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  decodeBalanceResult,
  encodeGetBalanceBody,
  encodeQueryRequest,
  encodeTransparentQueryProof,
  proveQuery,
  REQ,
  requestHash,
  resultHash,
  runQuery,
} from '../protocol/query.ts'
import {
  decodeQueryReceipt,
  encodeQueryReceipt,
  type QueryReceiptV1,
  receiptSigningInput,
} from '../protocol/receipt.ts'
import { accountKey, encodeAccount, receiptKeyKey } from '../protocol/state.ts'
import {
  decodeTransitionJournal,
  encodeTransparentTransitionProof,
} from '../protocol/transition.ts'
import { genesisTrust } from '../protocol/trust.ts'
import { type AccessV1, TreeView } from '../protocol/view.ts'
import {
  accountIdFromRequest,
  balanceOpenedAuthorEventStep,
  batchSealStep,
  checkStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const BALANCE_MULTIPLIER = 100n

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

function rootsSideBySideStep(
  canonicalRoot: Uint8Array,
  shadowRoot: Uint8Array,
): TraceStep {
  return {
    actor: 'attacker',
    kind: 'act',
    label:
      'the operator physically swaps the account database for a shadow copy, entirely outside any transition proof',
    objects: [
      obj('canonical-root', 'state-root', canonicalRoot, {
        provenBy: 'the sealed transition proof from genesis',
      }),
      obj('shadow-root', 'state-root', shadowRoot, {
        provenBy: 'nothing; a raw database swap, never sealed',
      }),
    ],
  }
}

function honestBalanceStep(
  accountId: string,
  honestResultBytes: Uint8Array,
): TraceStep {
  const balance = decodeBalanceResult(honestResultBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: `the real, canonical ledger has get-balance(${accountId}) = ${balance.balance}`,
    objects: [
      {
        ...obj('honest-balance', 'balance-result', honestResultBytes, {
          accountId,
          exists: String(balance.exists),
          balance: balance.balance.toString(),
        }),
        hash: hex(resultHash(honestResultBytes)),
      },
    ],
  }
}

function shadowBalanceStep(
  accountId: string,
  shadowResultBytes: Uint8Array,
): TraceStep {
  const balance = decodeBalanceResult(shadowResultBytes)
  return {
    actor: 'attacker',
    kind: 'object',
    label: `the swapped shadow database instead answers get-balance(${accountId}) = ${balance.balance}, ${BALANCE_MULTIPLIER}x the real balance`,
    objects: [
      {
        ...obj('shadow-balance', 'balance-result', shadowResultBytes, {
          accountId,
          exists: String(balance.exists),
          balance: balance.balance.toString(),
        }),
        hash: hex(resultHash(shadowResultBytes)),
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
      'the server, still holding the real receipt-signing key, signs an immediate query receipt claiming the shadow root as current state',
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
  const sealedSequence = decodeTransitionJournal(sealProof.journal).endSequence
  const canonicalRoot = server.tree.root()

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'alice' }),
  })
  const accountId = accountIdFromRequest(requestBytes)

  const honestResultBytes = runQuery(
    new TreeView(server.tree),
    requestBytes,
    PROGRAM.queryV1,
  )
  const honestBalance = decodeBalanceResult(honestResultBytes).balance

  const shadowTree = server.tree.clone()
  shadowTree.set(
    accountKey(accountId),
    encodeAccount({ balance: honestBalance * BALANCE_MULTIPLIER }),
  )
  const shadowRoot = shadowTree.root()

  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's08-database-swap-client')
  const { nonce } = client.request(requestBytes)

  const { resultBytes: shadowResultBytes, proof: shadowProof } = proveQuery(
    shadowTree,
    requestBytes,
    {
      stateSequence: sealedSequence,
      queryProgramId: PROGRAM.queryV1,
      programChainHash: GENESIS_CHAIN,
    },
  )

  const receipt: QueryReceiptV1 = {
    receiptKeyId: world.receiptKey.publicKey,
    stateRoot: shadowRoot,
    stateSequence: sealedSequence,
    requestHash: requestHash(requestBytes),
    resultHash: resultHash(shadowResultBytes),
    queryProgramId: PROGRAM.queryV1,
    programChainHash: GENESIS_CHAIN,
    nonce,
    issuedAtMs: server.clockMs,
    proofDeadlineMs: server.clockMs + PROOF_WINDOW_MS,
  }
  const receiptBytes = encodeQueryReceipt(receipt)
  const receiptSignature = sign(
    receiptSigningInput(receiptBytes),
    world.receiptKey,
  )

  const receiptStateKey = receiptKeyKey(world.receiptKey.publicKey)
  const receiptKeyWitness: AccessV1 = {
    op: 1,
    key: receiptStateKey,
    value: shadowTree.get(receiptStateKey),
    witness: shadowTree.witness(receiptStateKey),
  }

  const { headBytes, sig: headSignature } = server.signedHead()

  const bundle: ResponseBundle = {
    canonicalRequest: requestBytes,
    canonicalResult: shadowResultBytes,
    receipt: receiptBytes,
    receiptSignature,
    receiptKeyWitness,
    queryProof: encodeTransparentQueryProof(shadowProof),
    transitions: [encodeTransparentTransitionProof(sealProof)],
    migrations: [],
    latestHead: headBytes,
    latestHeadSignature: headSignature,
  }
  const bundleBytes = encodeBundle(bundle)

  const head = decodeLatestHead(headBytes)
  const result = client.acceptBundle(bundleBytes, head.latestAsOfMs)
  if (result.ok) {
    throw new Error('s08: expected REJECT, got ACCEPT')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(balanceOpenedAuthorEventStep),
    batchSealStep(
      sealProof,
      "the honest server seals alice's opening balance into a transition proof; this is the only proof that will ever exist from genesis",
    ),
    rootsSideBySideStep(canonicalRoot, shadowRoot),
    queryRequestStep(requestBytes, nonce),
    honestBalanceStep(accountId, honestResultBytes),
    shadowBalanceStep(accountId, shadowResultBytes),
    receiptStep(receiptBytes),
    ...result.checks.map((check) => checkStep(check)),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'REJECT',
      error: result.error,
      note: `the sealed transitions from genesis only ever prove the canonical root; the receipt instead claims the shadow root produced by swapping the physical database outside any transition proof, so the client's walk from its trusted genesis anchor lands on the wrong endpoint and rule "${result.rule}" catches it`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 8,
    slug: 'database-swap',
    title: 'Physical database replacement',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['6.1', '9.3', '11', '17'],
    expected: 'REJECT INVALID_PROOF (continuity)',
  },
  run,
}
