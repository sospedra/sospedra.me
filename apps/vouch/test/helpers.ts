import { encodeBundle, type ResponseBundle } from '../src/protocol/bundle.ts'
import {
  PROTOCOL_VERSION,
  TIMELOCK_MIN,
  ZERO32,
} from '../src/protocol/constants.ts'
import {
  GENESIS_ROOT,
  type RecordSpec,
  seqRecords,
  type World,
} from '../src/protocol/genesis.ts'
import {
  encodeLatestHead,
  type HeadIdV1,
  headSigningInput,
  type LatestHeadV1,
} from '../src/protocol/head.ts'
import { sign } from '../src/protocol/keys.ts'
import {
  encodeOpenAccount,
  encodeSetReceiptKey,
  encodeTransfer,
  OP,
} from '../src/protocol/ops.ts'
import {
  encodeMigration,
  GENESIS_CHAIN,
  PROGRAM,
  type ProgramMigrationV1,
} from '../src/protocol/program.ts'
import {
  encodeGetBalanceBody,
  encodeQueryRequest,
  encodeTransparentQueryProof,
  proveQuery,
  REQ,
  requestHash,
  resultHash,
} from '../src/protocol/query.ts'
import {
  encodeQueryReceipt,
  type QueryReceiptV1,
  receiptSigningInput,
} from '../src/protocol/receipt.ts'
import type { Smt } from '../src/protocol/smt.ts'
import {
  CHAIN_KEY,
  decodeChainStateV1,
  decodeSequenceV1,
  receiptKeyKey,
  SEQUENCE_KEY,
} from '../src/protocol/state.ts'
import {
  encodeTransparentTransitionProof,
  proveBatch,
} from '../src/protocol/transition.ts'
import { type ClientTrustStateV1, genesisTrust } from '../src/protocol/trust.ts'
import type { AccessV1 } from '../src/protocol/view.ts'

export const HONEST_ISSUED_AT_MS = 1_800_000_000_000n
export const HONEST_PROOF_DEADLINE_MS = HONEST_ISSUED_AT_MS + 30_000n
export const HONEST_NONCE = new Uint8Array([9, 9, 9, 9])

type WorldMeta = {
  stateSequence: bigint
  updateProgramId: Uint8Array
  queryProgramId: Uint8Array
  programChainHash: Uint8Array
}

function readWorldMeta(tree: Smt): WorldMeta {
  const sequenceRaw = tree.get(SEQUENCE_KEY)
  if (!sequenceRaw) throw new Error('helpers: missing sys/sequence')
  const chainRaw = tree.get(CHAIN_KEY)
  if (!chainRaw) throw new Error('helpers: missing sys/program-chain')
  const chain = decodeChainStateV1(chainRaw)
  return {
    stateSequence: decodeSequenceV1(sequenceRaw).value,
    updateProgramId: chain.updateProgramId,
    queryProgramId: chain.queryProgramId,
    programChainHash: chain.chainHash,
  }
}

function buildReceiptKeyWitness(world: World): AccessV1 {
  const key = receiptKeyKey(world.receiptKey.publicKey)
  const witness = world.tree.witness(key)
  const value = world.tree.get(key)
  return { op: 1, key, value, witness }
}

export type HonestBundleOptions = {
  migrateToV2?: boolean
  revokeReceiptKey?: boolean
  includeHead?: boolean
  accountId?: string
}

export type HonestBundleResult = {
  world: World
  trust: ClientTrustStateV1
  receipt: QueryReceiptV1
  bundle: ResponseBundle
  bundleBytes: Uint8Array
  expectedRequest: Uint8Array
  expectedNonce: Uint8Array
  nowMs: bigint
}

function buildTransitionsForMigration(world: World): {
  transitions: Uint8Array[]
  migrations: Uint8Array[]
} {
  const activationSequence = 1n + TIMELOCK_MIN
  const migration: ProgramMigrationV1 = {
    nextUpdateProgramId: PROGRAM.updateV2,
    nextQueryProgramId: PROGRAM.queryV2,
    nextProgramManifestHash: ZERO32,
    activationSequence,
    governanceAuthorization: new Uint8Array(0),
  }

  const setupRecords = seqRecords(world, [
    ['governance', OP.COMMIT_MIGRATION, encodeMigration(migration)],
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
  ])
  const setupProof = proveBatch(world.tree, setupRecords, PROGRAM.updateV1)

  const activationRecords = seqRecords(world, [
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: 1000n }),
    ],
  ])
  const activationProof = proveBatch(
    world.tree,
    activationRecords,
    PROGRAM.updateV2,
  )

  return {
    transitions: [
      encodeTransparentTransitionProof(setupProof),
      encodeTransparentTransitionProof(activationProof),
    ],
    migrations: [encodeMigration(migration)],
  }
}

function buildTransitionsForSingleBatch(
  world: World,
  revokeReceiptKey: boolean,
): { transitions: Uint8Array[]; migrations: Uint8Array[] } {
  const specs: RecordSpec[] = [
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
  ]
  if (revokeReceiptKey) {
    specs.push([
      'governance',
      OP.SET_RECEIPT_KEY,
      encodeSetReceiptKey({ keyId: world.receiptKey.publicKey, status: 0 }),
    ])
  }
  const records = seqRecords(world, specs)
  const proof = proveBatch(world.tree, records, PROGRAM.updateV1)
  return {
    transitions: [encodeTransparentTransitionProof(proof)],
    migrations: [],
  }
}

export function makeHonestBundle(
  world: World,
  options: HonestBundleOptions = {},
): HonestBundleResult {
  const accountId = options.accountId ?? 'bob'
  const migrateToV2 = options.migrateToV2 ?? false
  const revokeReceiptKey = options.revokeReceiptKey ?? false
  const includeHead = options.includeHead ?? true

  const { transitions, migrations } = migrateToV2
    ? buildTransitionsForMigration(world)
    : buildTransitionsForSingleBatch(world, revokeReceiptKey)

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId }),
  })
  const meta = readWorldMeta(world.tree)
  const { resultBytes, proof: queryProof } = proveQuery(
    world.tree,
    requestBytes,
    meta,
  )

  const receipt: QueryReceiptV1 = {
    receiptKeyId: world.receiptKey.publicKey,
    stateRoot: world.tree.root(),
    stateSequence: meta.stateSequence,
    requestHash: requestHash(requestBytes),
    resultHash: resultHash(resultBytes),
    queryProgramId: meta.queryProgramId,
    programChainHash: meta.programChainHash,
    nonce: HONEST_NONCE,
    issuedAtMs: HONEST_ISSUED_AT_MS,
    proofDeadlineMs: HONEST_PROOF_DEADLINE_MS,
  }
  const receiptBytes = encodeQueryReceipt(receipt)
  const receiptSignature = sign(
    receiptSigningInput(receiptBytes),
    world.receiptKey,
  )
  const receiptKeyWitness = buildReceiptKeyWitness(world)

  const headId: HeadIdV1 = {
    sequence: meta.stateSequence,
    stateRoot: receipt.stateRoot,
    updateProgramId: meta.updateProgramId,
    queryProgramId: meta.queryProgramId,
    programChainHash: meta.programChainHash,
  }
  const latestHead: LatestHeadV1 = {
    head: headId,
    latestAsOfMs: HONEST_ISSUED_AT_MS,
    headKeyId: world.receiptKey.publicKey,
  }
  const headBytes = encodeLatestHead(latestHead)
  const headSignature = sign(headSigningInput(headBytes), world.receiptKey)

  const bundle: ResponseBundle = {
    canonicalRequest: requestBytes,
    canonicalResult: resultBytes,
    receipt: receiptBytes,
    receiptSignature,
    receiptKeyWitness,
    queryProof: encodeTransparentQueryProof(queryProof),
    transitions,
    migrations,
    latestHead: includeHead ? headBytes : null,
    latestHeadSignature: includeHead ? headSignature : null,
  }
  const bundleBytes = encodeBundle(bundle)

  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })

  return {
    world,
    trust,
    receipt,
    bundle,
    bundleBytes,
    expectedRequest: requestBytes,
    expectedNonce: HONEST_NONCE,
    nowMs: HONEST_ISSUED_AT_MS,
  }
}
