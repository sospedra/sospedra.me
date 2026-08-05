import { Client } from '../actors/client.ts'
import { PROOF_WINDOW_MS, Server } from '../actors/server.ts'
import { encodeBundle, type ResponseBundle } from '../protocol/bundle.ts'
import { hex, u64be } from '../protocol/bytes.ts'
import {
  PROTOCOL_VERSION,
  TIMELOCK_MIN,
  ZERO32,
} from '../protocol/constants.ts'
import type { GlobalEventRecordV1 } from '../protocol/events.ts'
import {
  buildGenesis,
  GENESIS_ROOT,
  seqRecords,
  type World,
} from '../protocol/genesis.ts'
import { decodeLatestHead, type LatestHeadV1 } from '../protocol/head.ts'
import { sign } from '../protocol/keys.ts'
import {
  encodeOpenAccount,
  encodeSetConfig,
  encodeTransfer,
  OP,
} from '../protocol/ops.ts'
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
} from '../protocol/query.ts'
import {
  decodeQueryReceipt,
  encodeQueryReceipt,
  type QueryReceiptV1,
  receiptSigningInput,
} from '../protocol/receipt.ts'
import {
  configKey,
  decodeConfig,
  encodeConfig,
  receiptKeyKey,
} from '../protocol/state.ts'
import {
  decodeTransitionJournal,
  encodeTransparentTransitionProof,
  FEE_CONFIG_NAME,
  proveBatch,
} from '../protocol/transition.ts'
import { genesisTrust } from '../protocol/trust.ts'
import type { VerifyResult } from '../protocol/verify.ts'
import type { AccessV1 } from '../protocol/view.ts'
import {
  accountIdFromRequest,
  authorEventStep,
  batchSealStep,
  checkStep,
  describedAuthorEventStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const NEW_FEE_BP = 500n
const TRANSFER_AMOUNT = 1_000n
const SET_CONFIG_SEQUENCE = 3n
const ACTIVATION_SEQUENCE = SET_CONFIG_SEQUENCE + TIMELOCK_MIN
const EARLY_SEQUENCE = ACTIVATION_SEQUENCE - 1n

function requireHead(latestHead: Uint8Array | null): LatestHeadV1 {
  if (latestHead === null) {
    throw new Error('s17: expected a latest-head statement')
  }
  return decodeLatestHead(latestHead)
}

function requireConfigBytes(server: Server): Uint8Array {
  const bytes = server.tree.get(configKey(FEE_CONFIG_NAME))
  if (!bytes) throw new Error('s17: expected a committed fee config')
  return bytes
}

function balanceRequest(accountId: string): Uint8Array {
  return encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId }),
  })
}

function queryRequestStep(
  requestBytes: Uint8Array,
  nonce: Uint8Array,
  round: string,
): TraceStep {
  const accountId = accountIdFromRequest(requestBytes)
  return {
    actor: 'client',
    kind: 'act',
    label: `${round}: client requests get-balance(${accountId}) with a fresh nonce`,
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

function receiptStep(receiptBytes: Uint8Array, round: string): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: `${round}: server signs an immediate query receipt for state sequence ${receipt.stateSequence}`,
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

function committedFeeConfigStep(configBytes: Uint8Array): TraceStep {
  const config = decodeConfig(configBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: `governance's timelocked config: still ${config.current}bp now, ${config.next}bp once sequence ${config.nextActivation} is reached`,
    objects: [
      obj('committed-fee-config', 'config-value', configBytes, {
        name: FEE_CONFIG_NAME,
        current: config.current.toString(),
        next: config.next.toString(),
        nextActivation: config.nextActivation.toString(),
      }),
    ],
  }
}

function shadowFeeConfigStep(shadowConfigBytes: Uint8Array): TraceStep {
  const config = decodeConfig(shadowConfigBytes)
  return {
    actor: 'attacker',
    kind: 'act',
    label: `at sequence ${EARLY_SEQUENCE}, one before the committed activation, a forked copy of state is forced to already read the fee as ${config.current}bp, unconditionally`,
    objects: [
      obj('shadow-fee-config', 'config-value', shadowConfigBytes, {
        name: FEE_CONFIG_NAME,
        current: config.current.toString(),
        provenBy:
          'nothing; a raw fork of state, never sealed by any transition',
      }),
    ],
  }
}

function earlyFeeResultStep(
  resultBytes: Uint8Array,
  accountId: string,
): TraceStep {
  const balance = decodeBalanceResult(resultBytes)
  return {
    actor: 'attacker',
    kind: 'object',
    label: `the forked state reports get-balance(${accountId}) = ${balance.balance}, as if the ${NEW_FEE_BP}bp fee already applied one sequence early`,
    objects: [
      {
        ...obj('early-fee-result', 'balance-result', resultBytes, {
          accountId,
          exists: String(balance.exists),
          balance: balance.balance.toString(),
        }),
        hash: hex(resultHash(resultBytes)),
      },
    ],
  }
}

function feeTimelockComparisonStep(
  preBalance: bigint,
  postBalance: bigint,
): TraceStep {
  const preFeeCharged = TRANSFER_AMOUNT - preBalance
  const postFeeCharged = TRANSFER_AMOUNT - (postBalance - preBalance)
  return {
    actor: 'client',
    kind: 'object',
    label: `the pre-boundary transfer charges ${preFeeCharged} on ${TRANSFER_AMOUNT} (250bp); the post-boundary transfer charges ${postFeeCharged} on ${TRANSFER_AMOUNT} (${NEW_FEE_BP}bp), both read from the actual, proven balances`,
    objects: [
      obj('fee-timelock-comparison', 'fee-comparison', u64be(postFeeCharged), {
        transferAmount: TRANSFER_AMOUNT.toString(),
        preBoundaryBalance: preBalance.toString(),
        preBoundaryFeeCharged: preFeeCharged.toString(),
        postBoundaryBalance: postBalance.toString(),
        postBoundaryFeeCharged: postFeeCharged.toString(),
      }),
    ],
  }
}

type EarlyFeeAttemptInput = {
  server: Server
  world: World
  client: Client
  requestBytes: Uint8Array
}

type EarlyFeeAttemptResult = {
  result: VerifyResult
  resultBytes: Uint8Array
  receiptBytes: Uint8Array
  configBytes: Uint8Array
  nonce: Uint8Array
}

function attemptEarlyFeeApplication(
  input: EarlyFeeAttemptInput,
): EarlyFeeAttemptResult {
  const { server, world, client, requestBytes } = input
  const [maliciousRecord]: GlobalEventRecordV1[] = seqRecords(world, [
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: TRANSFER_AMOUNT }),
    ],
  ])

  const shadowTree = server.tree.clone()
  shadowTree.set(
    configKey(FEE_CONFIG_NAME),
    encodeConfig({ current: NEW_FEE_BP, next: 0n, nextActivation: 0n }),
  )
  const configBytes = shadowTree.get(configKey(FEE_CONFIG_NAME))
  if (!configBytes) throw new Error('s17: expected the shadow config to be set')

  const maliciousProof = proveBatch(
    shadowTree,
    [maliciousRecord],
    PROGRAM.updateV1,
  )
  const { resultBytes, proof: maliciousQueryProof } = proveQuery(
    shadowTree,
    requestBytes,
    {
      stateSequence: EARLY_SEQUENCE,
      queryProgramId: PROGRAM.queryV1,
      programChainHash: server.chainHash,
    },
  )

  const { nonce } = client.request(requestBytes)
  const receipt: QueryReceiptV1 = {
    receiptKeyId: world.receiptKey.publicKey,
    stateRoot: shadowTree.root(),
    stateSequence: EARLY_SEQUENCE,
    requestHash: requestHash(requestBytes),
    resultHash: resultHash(resultBytes),
    queryProgramId: PROGRAM.queryV1,
    programChainHash: server.chainHash,
    nonce,
    issuedAtMs: server.clockMs,
    proofDeadlineMs: server.clockMs + PROOF_WINDOW_MS,
  }
  const receiptBytes = encodeQueryReceipt(receipt)
  const receiptSignature = sign(
    receiptSigningInput(receiptBytes),
    world.receiptKey,
  )
  const witnessKey = receiptKeyKey(world.receiptKey.publicKey)
  const receiptKeyWitness: AccessV1 = {
    op: 1,
    key: witnessKey,
    value: shadowTree.get(witnessKey),
    witness: shadowTree.witness(witnessKey),
  }
  const { headBytes, sig: headSignature } = server.signedHead()
  const bundle: ResponseBundle = {
    canonicalRequest: requestBytes,
    canonicalResult: resultBytes,
    receipt: receiptBytes,
    receiptSignature,
    receiptKeyWitness,
    queryProof: encodeTransparentQueryProof(maliciousQueryProof),
    transitions: [encodeTransparentTransitionProof(maliciousProof)],
    migrations: [],
    latestHead: headBytes,
    latestHeadSignature: headSignature,
  }
  const head = requireHead(headBytes)
  const result = client.acceptBundle(encodeBundle(bundle), head.latestAsOfMs)

  return { result, resultBytes, receiptBytes, configBytes, nonce }
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)

  const setupRecords = seqRecords(world, [
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
      'governance',
      OP.SET_CONFIG,
      encodeSetConfig({
        name: FEE_CONFIG_NAME,
        value: NEW_FEE_BP,
        activationSequence: ACTIVATION_SEQUENCE,
      }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: TRANSFER_AMOUNT }),
    ],
  ])
  for (const record of setupRecords) server.submit(record)
  const preBoundaryProof = server.sealBatch()
  const configBytes = requireConfigBytes(server)

  const requestBytes = balanceRequest('bob')
  const accountId = accountIdFromRequest(requestBytes)
  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's17-config-timelock-client')

  const { nonce: preNonce } = client.request(requestBytes)
  const { receiptBytes: preReceiptBytes } = server.execute(
    requestBytes,
    preNonce,
  )
  const preBundle = server.proofFor({
    receiptBytes: preReceiptBytes,
    sinceSequence: 0n,
  })
  const preHead = requireHead(preBundle.latestHead)
  const preResult = client.acceptBundle(
    encodeBundle(preBundle),
    preHead.latestAsOfMs,
  )
  if (!preResult.ok) {
    throw new Error(
      `s17: expected pre-boundary query ACCEPT, got ${preResult.error}`,
    )
  }

  const attempt = attemptEarlyFeeApplication({
    server,
    world,
    client,
    requestBytes,
  })
  const maliciousResult = attempt.result
  if (maliciousResult.ok) {
    throw new Error('s17: expected the early-fee attempt to REJECT, got ACCEPT')
  }

  const postBoundaryRecords = seqRecords(world, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'carol', initialBalance: 0n }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: TRANSFER_AMOUNT }),
    ],
  ])
  for (const record of postBoundaryRecords) server.submit(record)
  const postBoundaryProof = server.sealBatch()

  const { nonce: postNonce } = client.request(requestBytes)
  const { receiptBytes: postReceiptBytes } = server.execute(
    requestBytes,
    postNonce,
  )
  const postBundle = server.proofFor({
    receiptBytes: postReceiptBytes,
    sinceSequence: client.trust.highestSequence,
  })
  const postHead = requireHead(postBundle.latestHead)
  const postResult = client.acceptBundle(
    encodeBundle(postBundle),
    postHead.latestAsOfMs,
  )
  if (!postResult.ok) {
    throw new Error(
      `s17: expected post-boundary query ACCEPT, got ${postResult.error}`,
    )
  }

  const preBalance = decodeBalanceResult(preResult.result).balance
  const postBalance = decodeBalanceResult(postResult.result).balance
  const preBoundaryJournal = decodeTransitionJournal(preBoundaryProof.journal)
  const postBoundaryJournal = decodeTransitionJournal(postBoundaryProof.journal)

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    describedAuthorEventStep(setupRecords[0]),
    describedAuthorEventStep(setupRecords[1]),
    authorEventStep(
      setupRecords[2],
      `governance times the fee to ${NEW_FEE_BP}bp, effective at sequence ${ACTIVATION_SEQUENCE}`,
    ),
    describedAuthorEventStep(setupRecords[3]),
    batchSealStep(
      preBoundaryProof,
      `the honest server seals the setup batch, reaching sequence ${preBoundaryJournal.endSequence}`,
    ),
    committedFeeConfigStep(configBytes),
    queryRequestStep(requestBytes, preNonce, 'pre-boundary query'),
    receiptStep(preReceiptBytes, 'pre-boundary query'),
    ...preResult.checks.map((check) => checkStep(check, 'pre-boundary query')),
    shadowFeeConfigStep(attempt.configBytes),
    queryRequestStep(
      requestBytes,
      attempt.nonce,
      'malicious early application',
    ),
    earlyFeeResultStep(attempt.resultBytes, accountId),
    receiptStep(attempt.receiptBytes, 'malicious early application'),
    ...maliciousResult.checks.map((check) =>
      checkStep(check, 'malicious early application'),
    ),
    ...postBoundaryRecords.map(describedAuthorEventStep),
    batchSealStep(
      postBoundaryProof,
      `the server seals the remaining batch; the config's own committed activation now applies the new fee, reaching sequence ${postBoundaryJournal.endSequence}`,
    ),
    queryRequestStep(requestBytes, postNonce, 'post-boundary query'),
    receiptStep(postReceiptBytes, 'post-boundary query'),
    ...postResult.checks.map((check) =>
      checkStep(check, 'post-boundary query'),
    ),
    feeTimelockComparisonStep(preBalance, postBalance),
  ]

  return {
    steps,
    checks: [
      ...preResult.checks,
      ...maliciousResult.checks,
      ...postResult.checks,
    ],
    verdict: {
      kind: 'ACCEPT',
      note: `the timelock holds across the whole window: the pre-boundary transfer paid ${TRANSFER_AMOUNT - preBalance} at 250bp, the post-boundary transfer paid ${TRANSFER_AMOUNT - (postBalance - preBalance)} at ${NEW_FEE_BP}bp, both verified by query; a forged attempt to apply the ${NEW_FEE_BP}bp fee one sequence early, at sequence ${EARLY_SEQUENCE}, failed the client's replay with ${maliciousResult.error}, rule "${maliciousResult.rule}" -- forcing the fee early requires forking state outside any sealed transition, and that fork's starting root does not match the trusted chain`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 17,
    slug: 'config-timelock',
    title: 'Timelocked configuration change',
    taxonomy: 'POSSIBLE_UNDER_GOVERNANCE',
    specRefs: ['6.3', '13', '17'],
    expected: 'ACCEPT',
  },
  run,
}
