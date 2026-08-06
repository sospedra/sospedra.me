import { mkdirSync, writeFileSync } from 'node:fs'
import { encodeBundle, type ResponseBundle } from '../src/protocol/bundle.ts'
import { ascii, hex } from '../src/protocol/bytes.ts'
import {
  MAGIC,
  PROTOCOL_VERSION,
  TIMELOCK_MIGRATION_MIN,
  ZERO32,
} from '../src/protocol/constants.ts'
import {
  decodeAuthorEvent,
  encodeGlobalEventRecord,
  encodeWriteAck,
  type GlobalEventRecordV1,
  signingInput,
  type WriteAckV1,
} from '../src/protocol/events.ts'
import {
  buildGenesis,
  GENESIS_ROOT,
  seqRecords,
  type World,
} from '../src/protocol/genesis.ts'
import { type Domain, hash } from '../src/protocol/hash.ts'
import {
  encodeHeadId,
  encodeLatestHead,
  type HeadIdV1,
  headSigningInput,
  type LatestHeadV1,
} from '../src/protocol/head.ts'
import { sign } from '../src/protocol/keys.ts'
import {
  encodeOpenAccount,
  encodeSetAuthor,
  encodeSetConfig,
  encodeSetReceiptKey,
  encodeTransfer,
  OP,
  type OpenAccountV1,
  type SetAuthorV1,
  type SetConfigV1,
  type SetReceiptKeyV1,
  type TransferV1,
} from '../src/protocol/ops.ts'
import {
  encodeManifest,
  encodeMigration,
  GENESIS_CHAIN,
  manifestFor,
  manifestHash,
  PROGRAM,
  type ProgramMigrationV1,
  scenarioFixture,
  simulatedManifestFor,
} from '../src/protocol/program.ts'
import {
  decodeBalanceResult,
  decodeQueryJournal,
  decodeQueryRequest,
  decodeTransfersResult,
  encodeGetBalanceBody,
  encodeListTransfersBody,
  encodeQueryRequest,
  encodeTransparentQueryProof,
  proveQuery,
  REQ,
  requestHash,
  resultHash,
  type TransparentQueryProofV1,
} from '../src/protocol/query.ts'
import {
  encodeQueryReceipt,
  type QueryReceiptV1,
  receiptSigningInput,
} from '../src/protocol/receipt.ts'
import { EMPTY, encodeWitness, type Smt } from '../src/protocol/smt.ts'
import {
  type AccountV1,
  accountKey,
  authorKey,
  CHAIN_KEY,
  configKey,
  decodeAccount,
  decodeAuthorRecordV1,
  decodeChainStateV1,
  decodeConfig,
  decodePendingMigrationV1,
  decodeReceiptKeyV1,
  decodeSequenceV1,
  decodeTransferLogV1,
  MIGRATION_KEY,
  receiptKeyKey,
  SEQUENCE_KEY,
  transfersKey,
} from '../src/protocol/state.ts'
import {
  decodeTransitionJournal,
  encodeTransparentTransitionProof,
  FEE_CONFIG_NAME,
  proveBatch,
  type TransitionJournalV1,
  type TransparentTransitionProofV1,
} from '../src/protocol/transition.ts'
import { encodeClientTrustState, genesisTrust } from '../src/protocol/trust.ts'
import { type AccessV1, encodeAccess } from '../src/protocol/view.ts'

const FIXED_DOMAIN_INPUT = ascii('vouch-golden-vector-fixed-input')
const FIXED_NONCE = ascii('vouch-golden-vector-nonce')
const FIXED_ISSUED_AT_MS = 1_800_000_000_000n
const FIXED_PROOF_DEADLINE_MS = FIXED_ISSUED_AT_MS + 30_000n

const DOMAIN_PRESENCE: Record<Domain, true> = {
  'author-event': true,
  'author-signing': true,
  'event-record': true,
  'write-ack': true,
  'state-key': true,
  'state-value': true,
  'state-leaf': true,
  'state-node': true,
  'transition-journal': true,
  'query-request': true,
  'query-result': true,
  'query-journal': true,
  'query-receipt': true,
  'latest-head': true,
  'program-chain': true,
  'proof-cache-key': true,
  'program-id': true,
  'scenario-fixture': true,
}
const DOMAINS = Object.keys(DOMAIN_PRESENCE) as Domain[]

const SIMULATED_PROGRAM_LABELS = [
  'vouch-update-v2-simulated',
  'vouch-query-v2-simulated',
] as const

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

function toJsonSafe(value: unknown): JsonValue {
  if (value === null) return null
  if (value instanceof Uint8Array) return hex(value)
  if (Array.isArray(value)) return value.map(toJsonSafe)
  switch (typeof value) {
    case 'bigint':
      return value.toString(10)
    case 'boolean':
    case 'number':
    case 'string':
      return value
    case 'object':
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, v]) => [
          key,
          toJsonSafe(v),
        ]),
      )
    default:
      throw new TypeError(
        `toJsonSafe: unsupported value of type ${typeof value}`,
      )
  }
}

export type VectorKind = 'hash' | 'object' | 'root' | 'signature'

export type VectorEntry = {
  name: string
  kind: VectorKind
  decoded: unknown
  hex: string
  hash?: string
}

export type VectorsFile = {
  meta: { magic: string; protocolVersion: number; seeds: string[] }
  entries: VectorEntry[]
}

function hashEntry(
  name: string,
  decoded: unknown,
  digest: Uint8Array,
): VectorEntry {
  return { name, kind: 'hash', decoded: toJsonSafe(decoded), hex: hex(digest) }
}

function rootEntry(
  name: string,
  decoded: unknown,
  root: Uint8Array,
): VectorEntry {
  return { name, kind: 'root', decoded: toJsonSafe(decoded), hex: hex(root) }
}

function objectEntry(
  name: string,
  decoded: unknown,
  bytes: Uint8Array,
): VectorEntry {
  return { name, kind: 'object', decoded: toJsonSafe(decoded), hex: hex(bytes) }
}

function signatureEntry(
  name: string,
  params: { decoded: unknown; signature: Uint8Array; digest: Uint8Array },
): VectorEntry {
  return {
    name,
    kind: 'signature',
    decoded: toJsonSafe(params.decoded),
    hex: hex(params.signature),
    hash: hex(params.digest),
  }
}

function mustGet(tree: Smt, key: Uint8Array, label: string): Uint8Array {
  const raw = tree.get(key)
  if (raw === null) throw new Error(`vectors: missing state key ${label}`)
  return raw
}

function mustFind<T>(
  items: T[],
  label: string,
  predicate: (item: T) => boolean,
): T {
  const found = items.find(predicate)
  if (found === undefined) throw new Error(`vectors: no item matched ${label}`)
  return found
}

function byName(a: VectorEntry, b: VectorEntry): number {
  if (a.name < b.name) return -1
  if (a.name > b.name) return 1
  return 0
}

function assertUniqueNames(entries: VectorEntry[]): void {
  const names = entries.map((entry) => entry.name)
  if (new Set(names).size !== names.length) {
    throw new Error('vectors: duplicate entry name detected')
  }
}

type WorldMeta = {
  stateSequence: bigint
  queryProgramId: Uint8Array
  programChainHash: Uint8Array
}

function readWorldMeta(tree: Smt): WorldMeta {
  const sequenceRaw = mustGet(tree, SEQUENCE_KEY, 'sys/sequence')
  const chain = decodeChainStateV1(
    mustGet(tree, CHAIN_KEY, 'sys/program-chain'),
  )
  return {
    stateSequence: decodeSequenceV1(sequenceRaw).value,
    queryProgramId: chain.queryProgramId,
    programChainHash: chain.chainHash,
  }
}

type Fixture = {
  world: World
  records: GlobalEventRecordV1[]
  openAlicePayload: OpenAccountV1
  transferPayload: TransferV1
  proof: TransparentTransitionProofV1
  journal: TransitionJournalV1
  balanceRequestBytes: Uint8Array
  balanceResultBytes: Uint8Array
  balanceProof: TransparentQueryProofV1
  transfersRequestBytes: Uint8Array
  transfersResultBytes: Uint8Array
  receipt: QueryReceiptV1
  receiptBytes: Uint8Array
  receiptSignature: Uint8Array
  headId: HeadIdV1
  latestHead: LatestHeadV1
  headBytes: Uint8Array
  headSignature: Uint8Array
  receiptKeyWitness: AccessV1
  bundle: ResponseBundle
}

function buildFixture(): Fixture {
  const world = buildGenesis()

  const openAlicePayload: OpenAccountV1 = {
    accountId: 'alice',
    initialBalance: 10_000n,
  }
  const openBobPayload: OpenAccountV1 = { accountId: 'bob', initialBalance: 0n }
  const transferPayload: TransferV1 = {
    from: 'alice',
    to: 'bob',
    amount: 1000n,
  }

  const records = seqRecords(world, [
    ['alice', OP.OPEN_ACCOUNT, encodeOpenAccount(openAlicePayload)],
    ['alice', OP.OPEN_ACCOUNT, encodeOpenAccount(openBobPayload)],
    ['alice', OP.TRANSFER, encodeTransfer(transferPayload)],
  ])

  const proof = proveBatch(world.tree, records, PROGRAM.updateV1)
  const journal = decodeTransitionJournal(proof.journal)

  const meta = readWorldMeta(world.tree)

  const balanceRequestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'bob' }),
  })
  const { resultBytes: balanceResultBytes, proof: balanceProof } = proveQuery(
    world.tree,
    balanceRequestBytes,
    meta,
  )

  const transfersRequestBytes = encodeQueryRequest({
    requestType: REQ.LIST_TRANSFERS,
    requestVersion: 1,
    body: encodeListTransfersBody({ accountId: 'bob', limit: 10 }),
  })
  const { resultBytes: transfersResultBytes } = proveQuery(
    world.tree,
    transfersRequestBytes,
    meta,
  )

  const receipt: QueryReceiptV1 = {
    receiptKeyId: world.receiptKey.publicKey,
    stateRoot: world.tree.root(),
    stateSequence: meta.stateSequence,
    requestHash: requestHash(balanceRequestBytes),
    resultHash: resultHash(balanceResultBytes),
    queryProgramId: meta.queryProgramId,
    programChainHash: meta.programChainHash,
    nonce: FIXED_NONCE,
    issuedAtMs: FIXED_ISSUED_AT_MS,
    proofDeadlineMs: FIXED_PROOF_DEADLINE_MS,
  }
  const receiptBytes = encodeQueryReceipt(receipt)
  const receiptSignature = sign(
    receiptSigningInput(receiptBytes),
    world.receiptKey,
  )

  const headId: HeadIdV1 = {
    sequence: meta.stateSequence,
    stateRoot: receipt.stateRoot,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: meta.queryProgramId,
    programChainHash: meta.programChainHash,
  }
  const latestHead: LatestHeadV1 = {
    head: headId,
    latestAsOfMs: FIXED_ISSUED_AT_MS,
    headKeyId: world.receiptKey.publicKey,
  }
  const headBytes = encodeLatestHead(latestHead)
  const headSignature = sign(headSigningInput(headBytes), world.receiptKey)

  const receiptKeyWitness: AccessV1 = {
    op: 1,
    key: receiptKeyKey(world.receiptKey.publicKey),
    value: mustGet(
      world.tree,
      receiptKeyKey(world.receiptKey.publicKey),
      'keys/receipt',
    ),
    witness: world.tree.witness(receiptKeyKey(world.receiptKey.publicKey)),
  }

  const bundle: ResponseBundle = {
    canonicalRequest: balanceRequestBytes,
    canonicalResult: balanceResultBytes,
    receipt: receiptBytes,
    receiptSignature,
    receiptKeyWitness,
    queryProof: encodeTransparentQueryProof(balanceProof),
    transitions: [encodeTransparentTransitionProof(proof)],
    migrations: [],
    latestHead: headBytes,
    latestHeadSignature: headSignature,
  }

  return {
    world,
    records,
    openAlicePayload,
    transferPayload,
    proof,
    journal,
    balanceRequestBytes,
    balanceResultBytes,
    balanceProof,
    transfersRequestBytes,
    transfersResultBytes,
    receipt,
    receiptBytes,
    receiptSignature,
    headId,
    latestHead,
    headBytes,
    headSignature,
    receiptKeyWitness,
    bundle,
  }
}

type FeeRoundingFixture = {
  transferPayload: TransferV1
  creditedAccount: AccountV1
  creditedAccountRaw: Uint8Array
}

function buildFeeRoundingFixture(): FeeRoundingFixture {
  const world = buildGenesis()
  const transferPayload: TransferV1 = { from: 'alice', to: 'bob', amount: 999n }

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
    ['alice', OP.TRANSFER, encodeTransfer(transferPayload)],
  ])
  proveBatch(world.tree, records, PROGRAM.updateV1)

  const creditedAccountRaw = mustGet(
    world.tree,
    accountKey('bob'),
    'app/account/bob:fee-rounding',
  )
  return {
    transferPayload,
    creditedAccount: decodeAccount(creditedAccountRaw),
    creditedAccountRaw,
  }
}

export function buildVectors(): VectorsFile {
  const fixture = buildFixture()
  const feeRounding = buildFeeRoundingFixture()

  const domainHashEntries = DOMAINS.map((domain) =>
    hashEntry(
      `domain-hash/${domain}`,
      { domain, input: FIXED_DOMAIN_INPUT },
      hash(domain, FIXED_DOMAIN_INPUT),
    ),
  )

  const realProgramIdEntries = (['update', 'query'] as const).map((kind) => {
    const manifest = manifestFor(kind)
    return hashEntry(
      `program-id/${kind}-v1`,
      {
        domain: 'program-id',
        kind,
        lockfileHash: manifest.lockfileHash,
        toolchainHash: manifest.toolchainHash,
        buildRecipeHash: manifest.buildRecipeHash,
        programSourceHash: manifest.programSourceHash,
      },
      manifest.programId,
    )
  })

  const simulatedProgramIdEntries = SIMULATED_PROGRAM_LABELS.map((label) =>
    hashEntry(
      `program-id/${label}`,
      { domain: 'scenario-fixture', label, input: ascii(label) },
      scenarioFixture(label),
    ),
  )

  const genesisChainEntry = hashEntry(
    'program-chain/genesis',
    {
      domain: 'program-chain',
      prev: ZERO32,
      updateProgramId: PROGRAM.updateV1,
      queryProgramId: PROGRAM.queryV1,
      activationSequence: 0n,
    },
    GENESIS_CHAIN,
  )

  const rootEntries = [
    rootEntry('root/empty-depth-0', { depth: 0 }, EMPTY[0]),
    rootEntry('root/empty-depth-256', { depth: 256 }, EMPTY[256]),
    rootEntry('root/genesis', { sequence: 0n }, GENESIS_ROOT),
    rootEntry(
      'root/happy-batch-end',
      { sequence: fixture.journal.endSequence },
      fixture.journal.endRoot,
    ),
  ]

  const event0 = decodeAuthorEvent(fixture.records[0].authorEvent)
  const transferEventPayload = decodeAuthorEvent(
    fixture.records[2].authorEvent,
  ).payload

  const presentAccess = mustFind(
    fixture.proof.accesses,
    'a present-leaf access',
    (a) => a.witness.leaf !== null,
  )
  const absentAccess = mustFind(
    fixture.proof.accesses,
    'an absent-leaf access',
    (a) => a.witness.leaf === null,
  )
  const getAccess = mustFind(
    fixture.proof.accesses,
    'a get access with a value',
    (a) => a.op === 1 && a.value !== null,
  )
  const setAccess = mustFind(
    fixture.proof.accesses,
    'a set access',
    (a) => a.op === 2,
  )

  const bobAccountRaw = mustGet(
    fixture.world.tree,
    accountKey('bob'),
    'app/account/bob',
  )
  const bobTransferLogRaw = mustGet(
    fixture.world.tree,
    transfersKey('bob'),
    'app/transfers/bob',
  )
  const aliceAuthorRaw = mustGet(
    fixture.world.tree,
    authorKey(fixture.world.authors.alice.publicKey),
    'author/alice',
  )
  const receiptKeyRaw = mustGet(
    fixture.world.tree,
    receiptKeyKey(fixture.world.receiptKey.publicKey),
    'keys/receipt/receipt-1',
  )
  const feeConfigRaw = mustGet(
    fixture.world.tree,
    configKey(FEE_CONFIG_NAME),
    'config/fee_basis_points',
  )
  const sequenceRaw = mustGet(fixture.world.tree, SEQUENCE_KEY, 'sys/sequence')
  const chainRaw = mustGet(fixture.world.tree, CHAIN_KEY, 'sys/program-chain')
  const migrationRaw = mustGet(
    fixture.world.tree,
    MIGRATION_KEY,
    'governance/migration',
  )

  const setConfigSample: SetConfigV1 = {
    name: FEE_CONFIG_NAME,
    value: 500n,
    activationSequence: 10n,
  }
  const setReceiptKeySample: SetReceiptKeyV1 = {
    keyId: fixture.world.receiptKey.publicKey,
    status: 1,
  }
  const setAuthorSample: SetAuthorV1 = {
    keyId: fixture.world.governance.publicKey,
    role: 2,
    status: 1,
  }
  const writeAck: WriteAckV1 = {
    eventHash: fixture.records[0].eventHash,
    acceptedAtMs: FIXED_ISSUED_AT_MS,
    acceptedAgainstSequence: 0n,
    mustLandBySequence: 5n,
    receiptKeyId: fixture.world.receiptKey.publicKey,
  }

  const updateManifestSample = manifestFor('update')
  const queryManifestSample = manifestFor('query')
  const simulatedManifestSample = simulatedManifestFor(
    'vouch-update-v2-simulated',
  )
  const nextManifestHash = manifestHash(simulatedManifestSample)
  const migrationSample: ProgramMigrationV1 = {
    nextUpdateProgramId: PROGRAM.updateV2,
    nextQueryProgramId: PROGRAM.queryV2,
    nextProgramManifestHash: nextManifestHash,
    activationSequence: 1n + TIMELOCK_MIGRATION_MIN,
    governanceAuthorization: new Uint8Array(0),
  }
  const trustSample = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })

  const balanceJournal = decodeQueryJournal(fixture.balanceProof.journal)

  const objectEntries = [
    objectEntry('object/AuthorEventV1', event0, fixture.records[0].authorEvent),
    objectEntry(
      'object/GlobalEventRecordV1',
      fixture.records[0],
      encodeGlobalEventRecord(fixture.records[0]),
    ),
    objectEntry('object/WriteAckV1', writeAck, encodeWriteAck(writeAck)),
    objectEntry(
      'object/OpenAccountV1',
      fixture.openAlicePayload,
      event0.payload,
    ),
    objectEntry(
      'object/TransferV1',
      fixture.transferPayload,
      transferEventPayload,
    ),
    objectEntry(
      'object/SetConfigV1',
      setConfigSample,
      encodeSetConfig(setConfigSample),
    ),
    objectEntry(
      'object/SetReceiptKeyV1',
      setReceiptKeySample,
      encodeSetReceiptKey(setReceiptKeySample),
    ),
    objectEntry(
      'object/SetAuthorV1',
      setAuthorSample,
      encodeSetAuthor(setAuthorSample),
    ),
    objectEntry(
      'object/AccountV1',
      decodeAccount(bobAccountRaw),
      bobAccountRaw,
    ),
    objectEntry(
      'object/TransferLogV1',
      decodeTransferLogV1(bobTransferLogRaw),
      bobTransferLogRaw,
    ),
    objectEntry(
      'object/AuthorRecordV1',
      decodeAuthorRecordV1(aliceAuthorRaw),
      aliceAuthorRaw,
    ),
    objectEntry(
      'object/ReceiptKeyV1',
      decodeReceiptKeyV1(receiptKeyRaw),
      receiptKeyRaw,
    ),
    objectEntry('object/ConfigV1', decodeConfig(feeConfigRaw), feeConfigRaw),
    objectEntry(
      'object/SequenceV1',
      decodeSequenceV1(sequenceRaw),
      sequenceRaw,
    ),
    objectEntry('object/ChainStateV1', decodeChainStateV1(chainRaw), chainRaw),
    objectEntry(
      'object/PendingMigrationV1',
      decodePendingMigrationV1(migrationRaw),
      migrationRaw,
    ),
    objectEntry(
      'object/Witness:present',
      presentAccess.witness,
      encodeWitness(presentAccess.witness),
    ),
    objectEntry(
      'object/Witness:absent',
      absentAccess.witness,
      encodeWitness(absentAccess.witness),
    ),
    objectEntry('object/AccessV1:get', getAccess, encodeAccess(getAccess)),
    objectEntry('object/AccessV1:set', setAccess, encodeAccess(setAccess)),
    objectEntry(
      'object/TransitionJournalV1',
      fixture.journal,
      fixture.proof.journal,
    ),
    objectEntry(
      'object/TransparentTransitionProofV1',
      fixture.proof,
      encodeTransparentTransitionProof(fixture.proof),
    ),
    objectEntry(
      'object/QueryRequestV1:get-balance',
      decodeQueryRequest(fixture.balanceRequestBytes),
      fixture.balanceRequestBytes,
    ),
    objectEntry(
      'object/QueryRequestV1:list-transfers',
      decodeQueryRequest(fixture.transfersRequestBytes),
      fixture.transfersRequestBytes,
    ),
    objectEntry(
      'object/BalanceResultV1',
      decodeBalanceResult(fixture.balanceResultBytes),
      fixture.balanceResultBytes,
    ),
    objectEntry(
      'object/TransfersResultV1',
      decodeTransfersResult(fixture.transfersResultBytes),
      fixture.transfersResultBytes,
    ),
    objectEntry(
      'object/QueryJournalV1',
      balanceJournal,
      fixture.balanceProof.journal,
    ),
    objectEntry(
      'object/TransparentQueryProofV1',
      fixture.balanceProof,
      encodeTransparentQueryProof(fixture.balanceProof),
    ),
    objectEntry('object/QueryReceiptV1', fixture.receipt, fixture.receiptBytes),
    objectEntry(
      'object/HeadIdV1',
      fixture.headId,
      encodeHeadId(fixture.headId),
    ),
    objectEntry('object/LatestHeadV1', fixture.latestHead, fixture.headBytes),
    objectEntry(
      'object/ProgramManifestV1:update',
      updateManifestSample,
      encodeManifest(updateManifestSample),
    ),
    objectEntry(
      'object/ProgramManifestV1:query',
      queryManifestSample,
      encodeManifest(queryManifestSample),
    ),
    objectEntry(
      'object/ProgramManifestV1:simulated',
      simulatedManifestSample,
      encodeManifest(simulatedManifestSample),
    ),
    objectEntry(
      'object/ProgramMigrationV1',
      migrationSample,
      encodeMigration(migrationSample),
    ),
    objectEntry(
      'object/ClientTrustStateV1',
      trustSample,
      encodeClientTrustState(trustSample),
    ),
    objectEntry(
      'object/ResponseBundle',
      fixture.bundle,
      encodeBundle(fixture.bundle),
    ),
    objectEntry(
      'object/TransferV1:fee-rounding-nondivisible',
      feeRounding.transferPayload,
      encodeTransfer(feeRounding.transferPayload),
    ),
    objectEntry(
      'object/AccountV1:fee-rounding-floor',
      feeRounding.creditedAccount,
      feeRounding.creditedAccountRaw,
    ),
  ]

  const signatureEntries = [
    signatureEntry('signature/author', {
      decoded: {
        publicKey: event0.authorKeyId,
        message: fixture.records[0].authorEvent,
      },
      signature: fixture.records[0].authorSignature,
      digest: signingInput(fixture.records[0].authorEvent),
    }),
    signatureEntry('signature/receipt', {
      decoded: {
        publicKey: fixture.world.receiptKey.publicKey,
        message: fixture.receiptBytes,
      },
      signature: fixture.receiptSignature,
      digest: receiptSigningInput(fixture.receiptBytes),
    }),
  ]

  const entries = [
    ...domainHashEntries,
    ...realProgramIdEntries,
    ...simulatedProgramIdEntries,
    genesisChainEntry,
    ...rootEntries,
    ...objectEntries,
    ...signatureEntries,
  ].toSorted(byName)

  assertUniqueNames(entries)

  return {
    meta: {
      magic: new TextDecoder().decode(MAGIC),
      protocolVersion: PROTOCOL_VERSION,
      seeds: ['author-alice', 'author-bob', 'governance-1', 'receipt-1'],
    },
    entries,
  }
}

if (import.meta.main) {
  const vectors = buildVectors()
  const outDir = new URL('../fixtures/protocol-v1/', import.meta.url)
  const outFile = new URL(
    '../fixtures/protocol-v1/vectors.json',
    import.meta.url,
  )
  mkdirSync(outDir, { recursive: true })
  writeFileSync(outFile, `${JSON.stringify(vectors, null, 2)}\n`)
}
