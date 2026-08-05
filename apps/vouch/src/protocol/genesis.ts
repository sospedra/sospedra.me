import { ZERO32 } from './constants.ts'
import { type GlobalEventRecordV1, makeSignedEvent } from './events.ts'
import { type Keypair, keypairFromLabel } from './keys.ts'
import { GENESIS_CHAIN, PROGRAM } from './program.ts'
import { Smt } from './smt.ts'
import {
  type AuthorRecordV1,
  authorKey,
  CHAIN_KEY,
  configKey,
  decodeAuthorRecordV1,
  decodeSequenceV1,
  encodeAuthorRecordV1,
  encodeChainStateV1,
  encodeConfig,
  encodePendingMigrationV1,
  encodeReceiptKeyV1,
  encodeSequenceV1,
  MIGRATION_KEY,
  receiptKeyKey,
  SEQUENCE_KEY,
} from './state.ts'
import { FEE_CONFIG_NAME } from './transition.ts'

export type World = {
  tree: Smt
  authors: Record<string, Keypair>
  governance: Keypair
  receiptKey: Keypair
}

const GENESIS_AUTHOR: AuthorRecordV1 = {
  role: 1,
  status: 1,
  sequence: 0n,
  tip: ZERO32,
}

export function buildGenesis(): World {
  const tree = new Smt()
  const alice = keypairFromLabel('author-alice')
  const bob = keypairFromLabel('author-bob')
  const governance = keypairFromLabel('governance-1')
  const receiptKey = keypairFromLabel('receipt-1')

  tree.set(authorKey(alice.publicKey), encodeAuthorRecordV1(GENESIS_AUTHOR))
  tree.set(authorKey(bob.publicKey), encodeAuthorRecordV1(GENESIS_AUTHOR))
  tree.set(
    authorKey(governance.publicKey),
    encodeAuthorRecordV1({ ...GENESIS_AUTHOR, role: 2 }),
  )
  tree.set(
    receiptKeyKey(receiptKey.publicKey),
    encodeReceiptKeyV1({ status: 1, sinceSequence: 0n }),
  )
  tree.set(
    configKey(FEE_CONFIG_NAME),
    encodeConfig({ current: 250n, next: 0n, nextActivation: 0n }),
  )
  tree.set(SEQUENCE_KEY, encodeSequenceV1({ value: 0n }))
  tree.set(
    CHAIN_KEY,
    encodeChainStateV1({
      chainHash: GENESIS_CHAIN,
      updateProgramId: PROGRAM.updateV1,
      queryProgramId: PROGRAM.queryV1,
    }),
  )
  tree.set(
    MIGRATION_KEY,
    encodePendingMigrationV1({ present: 0, migration: new Uint8Array(0) }),
  )

  return { tree, authors: { alice, bob }, governance, receiptKey }
}

export const GENESIS_ROOT: Uint8Array = buildGenesis().tree.root()

export type RecordSpec = readonly [
  author: string,
  operation: number,
  payload: Uint8Array,
]

export type AdvancedAuthor = {
  record: GlobalEventRecordV1
  next: AuthorRecordV1
}

export function advanceAuthor(
  keypair: Keypair,
  current: AuthorRecordV1,
  operation: number,
  payload: Uint8Array,
  globalSequence: bigint,
): AdvancedAuthor {
  const signed = makeSignedEvent(
    keypair,
    current.sequence + 1n,
    current.tip,
    operation,
    payload,
  )
  const record: GlobalEventRecordV1 = {
    globalSequence,
    eventHash: signed.eventHash,
    authorEvent: signed.eventBytes,
    authorSignature: signed.signature,
  }
  const next: AuthorRecordV1 = {
    role: current.role,
    status: current.status,
    sequence: current.sequence + 1n,
    tip: signed.eventHash,
  }
  return { record, next }
}

function resolveAuthor(world: World, name: string): Keypair {
  if (name === 'governance') return world.governance
  const keypair = world.authors[name]
  if (!keypair) throw new RangeError(`seqRecords: unknown author "${name}"`)
  return keypair
}

function readAuthorRecord(tree: Smt, keypair: Keypair): AuthorRecordV1 {
  const raw = tree.get(authorKey(keypair.publicKey))
  return raw === null ? GENESIS_AUTHOR : decodeAuthorRecordV1(raw)
}

export function seqRecords(
  world: World,
  specs: readonly RecordSpec[],
): GlobalEventRecordV1[] {
  const sequenceRaw = world.tree.get(SEQUENCE_KEY)
  const startSequence =
    sequenceRaw === null ? 0n : decodeSequenceV1(sequenceRaw).value
  const bookkeeping = new Map<string, AuthorRecordV1>()
  const records: GlobalEventRecordV1[] = []
  for (const [index, [authorName, operation, payload]] of specs.entries()) {
    const keypair = resolveAuthor(world, authorName)
    const current =
      bookkeeping.get(authorName) ?? readAuthorRecord(world.tree, keypair)
    const globalSequence = startSequence + BigInt(index) + 1n
    const { record, next } = advanceAuthor(
      keypair,
      current,
      operation,
      payload,
      globalSequence,
    )
    bookkeeping.set(authorName, next)
    records.push(record)
  }
  return records
}
