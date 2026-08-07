import { bytesEqual } from './bytes.ts'
import {
  TIMELOCK_CONFIG_MIN,
  TIMELOCK_MIGRATION_MIN,
  ZERO32,
} from './constants.ts'
import { Reader, Writer } from './encode.ts'
import {
  type AuthorEventV1,
  decodeAuthorEvent,
  decodeGlobalEventRecord,
  encodeGlobalEventRecord,
  eventHash,
  type GlobalEventRecordV1,
  signingInput,
} from './events.ts'
import { hash } from './hash.ts'
import { verifySig } from './keys.ts'
import { LIMITS } from './limits.ts'
import {
  decodeOpenAccount,
  decodeSetAuthor,
  decodeSetConfig,
  decodeSetReceiptKey,
  decodeTransfer,
  OP,
} from './ops.ts'
import {
  chainNext,
  decodeMigration,
  encodeMigration,
  PROGRAM,
  type ProgramMigrationV1,
} from './program.ts'
import type { Smt } from './smt.ts'
import {
  type AccountV1,
  type AuthorRecordV1,
  accountKey,
  authorKey,
  CHAIN_KEY,
  type ChainStateV1,
  type ConfigV1,
  configKey,
  decodeAccount,
  decodeAuthorRecordV1,
  decodeChainStateV1,
  decodeConfig,
  decodePendingMigrationV1,
  decodeSequenceV1,
  decodeTransferLogV1,
  effectiveConfig,
  encodeAccount,
  encodeAuthorRecordV1,
  encodeChainStateV1,
  encodeConfig,
  encodePendingMigrationV1,
  encodeReceiptKeyV1,
  encodeSequenceV1,
  encodeTransferLogV1,
  MIGRATION_KEY,
  receiptKeyKey,
  SEQUENCE_KEY,
  transfersKey,
} from './state.ts'
import {
  type AccessV1,
  decodeAccess,
  encodeAccess,
  ProvingView,
  ReplayError,
  ReplayView,
  type StateView,
} from './view.ts'

export const FEE_CONFIG_NAME = 'fee_basis_points'

export type TransitionJournalV1 = {
  startRoot: Uint8Array
  endRoot: Uint8Array
  startSequence: bigint
  endSequence: bigint
  batchHash: Uint8Array
  updateProgramId: Uint8Array
  activeQueryProgramId: Uint8Array
  programChainHash: Uint8Array
}

export function encodeTransitionJournal(j: TransitionJournalV1): Uint8Array {
  const w = new Writer()
  w.fixed(j.startRoot, 32)
  w.fixed(j.endRoot, 32)
  w.u64(j.startSequence)
  w.u64(j.endSequence)
  w.fixed(j.batchHash, 32)
  w.fixed(j.updateProgramId, 32)
  w.fixed(j.activeQueryProgramId, 32)
  w.fixed(j.programChainHash, 32)
  return w.done()
}

export function decodeTransitionJournal(buf: Uint8Array): TransitionJournalV1 {
  const r = new Reader(buf)
  const startRoot = r.fixed(32)
  const endRoot = r.fixed(32)
  const startSequence = r.u64()
  const endSequence = r.u64()
  const batchHashValue = r.fixed(32)
  const updateProgramId = r.fixed(32)
  const activeQueryProgramId = r.fixed(32)
  const programChainHash = r.fixed(32)
  r.finish()
  return {
    startRoot,
    endRoot,
    startSequence,
    endSequence,
    batchHash: batchHashValue,
    updateProgramId,
    activeQueryProgramId,
    programChainHash,
  }
}

export function batchHash(records: GlobalEventRecordV1[]): Uint8Array {
  return hash('event-record', ...records.map((r) => r.eventHash))
}

export class RuleError extends Error {
  readonly rule: string

  constructor(rule: string) {
    super(rule)
    this.name = 'RuleError'
    this.rule = rule
  }
}

function requireValue(
  view: StateView,
  key: Uint8Array,
  rule: string,
): Uint8Array {
  const value = view.get(key)
  if (value === null) throw new RuleError(rule)
  return value
}

function decodeOrRule<T>(decode: () => T, rule: string): T {
  try {
    return decode()
  } catch {
    throw new RuleError(rule)
  }
}

function decodePayload<T>(decode: () => T): T {
  return decodeOrRule(decode, 'payload')
}

function readSequence(view: StateView): bigint {
  return decodeSequenceV1(requireValue(view, SEQUENCE_KEY, 'global-sequence'))
    .value
}

function readChain(view: StateView): ChainStateV1 {
  return decodeChainStateV1(requireValue(view, CHAIN_KEY, 'wrong-era'))
}

function enforceGlobalSequence(
  view: StateView,
  record: GlobalEventRecordV1,
): void {
  const stored = readSequence(view)
  if (record.globalSequence !== stored + 1n)
    throw new RuleError('global-sequence')
}

function rollover(
  view: StateView,
  chain: ChainStateV1,
  migration: ProgramMigrationV1,
  expectedUpdateId: Uint8Array,
): void {
  if (!bytesEqual(expectedUpdateId, migration.nextUpdateProgramId)) {
    throw new RuleError('era-boundary')
  }
  const chainHash = chainNext(chain.chainHash, migration)
  view.set(
    CHAIN_KEY,
    encodeChainStateV1({
      chainHash,
      updateProgramId: migration.nextUpdateProgramId,
      queryProgramId: migration.nextQueryProgramId,
    }),
  )
  view.set(
    MIGRATION_KEY,
    encodePendingMigrationV1({ present: 0, migration: new Uint8Array(0) }),
  )
}

function enforceEra(
  view: StateView,
  record: GlobalEventRecordV1,
  expectedUpdateId: Uint8Array,
): void {
  const chain = readChain(view)
  const pending = decodePendingMigrationV1(
    requireValue(view, MIGRATION_KEY, 'wrong-era'),
  )
  if (pending.present === 0) {
    if (bytesEqual(chain.updateProgramId, expectedUpdateId)) return
    throw new RuleError('wrong-era')
  }

  const migration = decodeMigration(pending.migration)
  if (record.globalSequence === migration.activationSequence) {
    rollover(view, chain, migration, expectedUpdateId)
    return
  }
  if (
    record.globalSequence > migration.activationSequence &&
    !bytesEqual(chain.updateProgramId, migration.nextUpdateProgramId)
  ) {
    throw new RuleError('era-boundary')
  }
  if (bytesEqual(chain.updateProgramId, expectedUpdateId)) return
  throw new RuleError('wrong-era')
}

function enforceEventHash(record: GlobalEventRecordV1): AuthorEventV1 {
  const event = decodeOrRule(
    () => decodeAuthorEvent(record.authorEvent),
    'event-hash',
  )
  const recomputed = eventHash(record.authorEvent, record.authorSignature)
  if (!bytesEqual(recomputed, record.eventHash))
    throw new RuleError('event-hash')
  return event
}

type ApplyContext = {
  view: StateView
  record: GlobalEventRecordV1
  event: AuthorEventV1
}

const GOVERNANCE_ROLE = 2
const AUTHOR_ROLES: readonly number[] = [1, 2]

const OP_ALLOWED_ROLES: Record<number, readonly number[]> = {
  [OP.OPEN_ACCOUNT]: AUTHOR_ROLES,
  [OP.TRANSFER]: AUTHOR_ROLES,
  [OP.SET_CONFIG]: [GOVERNANCE_ROLE],
  [OP.COMMIT_MIGRATION]: [GOVERNANCE_ROLE],
  [OP.SET_RECEIPT_KEY]: [GOVERNANCE_ROLE],
  [OP.SET_AUTHOR]: [GOVERNANCE_ROLE],
}

function enforceAuthorAuthorization(ctx: ApplyContext): AuthorRecordV1 {
  const raw = ctx.view.get(authorKey(ctx.event.authorKeyId))
  if (raw === null) throw new RuleError('unauthorized-author')
  const author = decodeAuthorRecordV1(raw)
  if (author.status !== 1) throw new RuleError('unauthorized-author')
  const allowedRoles = OP_ALLOWED_ROLES[ctx.event.operation]
  if (!allowedRoles?.includes(author.role)) {
    throw new RuleError('operation-not-permitted')
  }
  return author
}

function enforceAuthorSignature(ctx: ApplyContext): void {
  const digest = signingInput(ctx.record.authorEvent)
  if (!verifySig(digest, ctx.record.authorSignature, ctx.event.authorKeyId)) {
    throw new RuleError('author-signature')
  }
}

function enforceAuthorChain(ctx: ApplyContext, author: AuthorRecordV1): void {
  if (ctx.event.authorSequence !== author.sequence + 1n) {
    throw new RuleError('author-sequence')
  }
  if (!bytesEqual(ctx.event.authorPreviousHash, author.tip)) {
    throw new RuleError('author-tip')
  }
}

function applyOpenAccount(ctx: ApplyContext): void {
  const payload = decodePayload(() => decodeOpenAccount(ctx.event.payload))
  const existing = ctx.view.get(accountKey(payload.accountId))
  if (existing !== null) throw new RuleError('account-exists')
  ctx.view.set(
    accountKey(payload.accountId),
    encodeAccount({ balance: payload.initialBalance }),
  )
  ctx.view.set(
    transfersKey(payload.accountId),
    encodeTransferLogV1({ entries: [] }),
  )
}

function readAccountOrRule(view: StateView, accountId: string): AccountV1 {
  const raw = view.get(accountKey(accountId))
  if (raw === null) throw new RuleError('insufficient-funds')
  return decodeAccount(raw)
}

function appendTransferLog(
  view: StateView,
  accountId: string,
  hashValue: Uint8Array,
): void {
  const log = decodeTransferLogV1(
    requireValue(view, transfersKey(accountId), 'insufficient-funds'),
  )
  view.set(
    transfersKey(accountId),
    encodeTransferLogV1({ entries: [...log.entries, hashValue] }),
  )
}

function readFeeBasisPoints(view: StateView): ConfigV1 {
  return decodeConfig(
    requireValue(view, configKey(FEE_CONFIG_NAME), 'insufficient-funds'),
  )
}

type FeeRounding = (amount: bigint, feeBp: bigint) => bigint

const U64_MAX = 2n ** 64n - 1n

function creditedBalance(balance: bigint, amount: bigint, fee: bigint): bigint {
  const credited = balance + amount - fee
  if (credited > U64_MAX) throw new RuleError('balance-overflow')
  return credited
}

function applyTransfer(ctx: ApplyContext, feeRounding: FeeRounding): void {
  const payload = decodePayload(() => decodeTransfer(ctx.event.payload))
  if (payload.from === payload.to) throw new RuleError('self-transfer')
  const from = readAccountOrRule(ctx.view, payload.from)
  const to = readAccountOrRule(ctx.view, payload.to)
  if (payload.amount <= 0n || from.balance < payload.amount) {
    throw new RuleError('insufficient-funds')
  }
  const feeBp = effectiveConfig(
    readFeeBasisPoints(ctx.view),
    ctx.record.globalSequence,
  )
  const fee = feeRounding(payload.amount, feeBp)
  if (fee > payload.amount) throw new RuleError('fee-overflow')
  const creditedTo = creditedBalance(to.balance, payload.amount, fee)
  ctx.view.set(
    accountKey(payload.from),
    encodeAccount({ balance: from.balance - payload.amount }),
  )
  ctx.view.set(accountKey(payload.to), encodeAccount({ balance: creditedTo }))
  appendTransferLog(ctx.view, payload.from, ctx.record.eventHash)
  appendTransferLog(ctx.view, payload.to, ctx.record.eventHash)
}

function readConfigOrDefault(view: StateView, key: Uint8Array): ConfigV1 {
  const raw = view.get(key)
  return raw === null
    ? { current: 0n, next: 0n, nextActivation: 0n }
    : decodeConfig(raw)
}

const FEE_BP_MAX = 10000n

function applySetConfig(ctx: ApplyContext): void {
  const payload = decodePayload(() => decodeSetConfig(ctx.event.payload))
  if (payload.name === FEE_CONFIG_NAME && payload.value > FEE_BP_MAX) {
    throw new RuleError('config-range')
  }
  const key = configKey(payload.name)
  const existing = readConfigOrDefault(ctx.view, key)
  if (
    payload.activationSequence <
    ctx.record.globalSequence + TIMELOCK_CONFIG_MIN
  ) {
    throw new RuleError('timelock')
  }
  const current = effectiveConfig(existing, ctx.record.globalSequence)
  ctx.view.set(
    key,
    encodeConfig({
      current,
      next: payload.value,
      nextActivation: payload.activationSequence,
    }),
  )
}

function applyCommitMigration(ctx: ApplyContext): void {
  const payload = decodePayload(() => decodeMigration(ctx.event.payload))
  const pending = decodePendingMigrationV1(
    requireValue(ctx.view, MIGRATION_KEY, 'migration-pending'),
  )
  if (pending.present !== 0) throw new RuleError('migration-pending')
  if (
    payload.activationSequence <
    ctx.record.globalSequence + TIMELOCK_MIGRATION_MIN
  ) {
    throw new RuleError('timelock')
  }
  ctx.view.set(
    MIGRATION_KEY,
    encodePendingMigrationV1({
      present: 1,
      migration: encodeMigration(payload),
    }),
  )
}

function applySetReceiptKey(ctx: ApplyContext): void {
  const payload = decodePayload(() => decodeSetReceiptKey(ctx.event.payload))
  ctx.view.set(
    receiptKeyKey(payload.keyId),
    encodeReceiptKeyV1({
      status: payload.status,
      sinceSequence: ctx.record.globalSequence,
    }),
  )
}

function applySetAuthor(ctx: ApplyContext): void {
  const payload = decodePayload(() => decodeSetAuthor(ctx.event.payload))
  const existingRaw = ctx.view.get(authorKey(payload.keyId))
  const existing =
    existingRaw === null ? null : decodeAuthorRecordV1(existingRaw)
  ctx.view.set(
    authorKey(payload.keyId),
    encodeAuthorRecordV1({
      role: payload.role,
      status: payload.status,
      sequence: existing?.sequence ?? 0n,
      tip: existing?.tip ?? ZERO32,
    }),
  )
}

const OP_HANDLERS: Record<
  number,
  (ctx: ApplyContext, feeRounding: FeeRounding) => void
> = {
  [OP.OPEN_ACCOUNT]: applyOpenAccount,
  [OP.TRANSFER]: applyTransfer,
  [OP.SET_CONFIG]: applySetConfig,
  [OP.COMMIT_MIGRATION]: applyCommitMigration,
  [OP.SET_RECEIPT_KEY]: applySetReceiptKey,
  [OP.SET_AUTHOR]: applySetAuthor,
}

function applyOperation(ctx: ApplyContext, feeRounding: FeeRounding): void {
  const handler = OP_HANDLERS[ctx.event.operation]
  handler(ctx, feeRounding)
}

function writeAuthorAdvance(ctx: ApplyContext): void {
  const current = decodeAuthorRecordV1(
    requireValue(
      ctx.view,
      authorKey(ctx.event.authorKeyId),
      'unauthorized-author',
    ),
  )
  ctx.view.set(
    authorKey(ctx.event.authorKeyId),
    encodeAuthorRecordV1({
      role: current.role,
      status: current.status,
      sequence: current.sequence + 1n,
      tip: ctx.record.eventHash,
    }),
  )
  ctx.view.set(
    SEQUENCE_KEY,
    encodeSequenceV1({ value: ctx.record.globalSequence }),
  )
}

const floorFee: FeeRounding = (amount, feeBp) => (amount * feeBp) / 10000n
const ceilFee: FeeRounding = (amount, feeBp) =>
  (amount * feeBp + 9999n) / 10000n

function feeRoundingFor(expectedUpdateId: Uint8Array): FeeRounding {
  if (bytesEqual(expectedUpdateId, PROGRAM.updateV1)) return floorFee
  if (bytesEqual(expectedUpdateId, PROGRAM.updateV2)) return ceilFee
  throw new RuleError('unknown-program')
}

type BatchContext = {
  view: StateView
  expectedUpdateId: Uint8Array
  feeRounding: FeeRounding
}

function applyRecord(batch: BatchContext, record: GlobalEventRecordV1): void {
  enforceGlobalSequence(batch.view, record)
  enforceEra(batch.view, record, batch.expectedUpdateId)
  const event = enforceEventHash(record)
  const ctx: ApplyContext = { view: batch.view, record, event }
  const author = enforceAuthorAuthorization(ctx)
  enforceAuthorSignature(ctx)
  enforceAuthorChain(ctx, author)
  applyOperation(ctx, batch.feeRounding)
  writeAuthorAdvance(ctx)
}

export function applyBatch(
  view: StateView,
  records: GlobalEventRecordV1[],
  expectedUpdateId: Uint8Array,
): TransitionJournalV1 {
  const batch: BatchContext = {
    view,
    expectedUpdateId,
    feeRounding: feeRoundingFor(expectedUpdateId),
  }
  const startRoot = view.root()
  const startSequence = readSequence(view)
  for (const record of records) {
    applyRecord(batch, record)
  }
  const endSequence = readSequence(view)
  const chain = readChain(view)
  if (!bytesEqual(chain.updateProgramId, expectedUpdateId)) {
    throw new RuleError('wrong-era')
  }
  return {
    startRoot,
    endRoot: view.root(),
    startSequence,
    endSequence,
    batchHash: batchHash(records),
    updateProgramId: expectedUpdateId,
    activeQueryProgramId: chain.queryProgramId,
    programChainHash: chain.chainHash,
  }
}

export type TransparentTransitionProofV1 = {
  journal: Uint8Array
  records: GlobalEventRecordV1[]
  accesses: AccessV1[]
}

export function encodeTransparentTransitionProof(
  p: TransparentTransitionProofV1,
): Uint8Array {
  const w = new Writer()
  w.bytes(p.journal, LIMITS.bytesField)
  w.list(p.records, LIMITS.proofEvents, (record) => {
    w.bytes(encodeGlobalEventRecord(record), LIMITS.bytesField)
  })
  w.list(p.accesses, LIMITS.proofAccesses, (access) => {
    const accessBytes = encodeAccess(access)
    w.fixed(accessBytes, accessBytes.length)
  })
  return w.done()
}

export function decodeTransparentTransitionProof(
  buf: Uint8Array,
): TransparentTransitionProofV1 {
  const r = new Reader(buf)
  const journal = r.bytes(LIMITS.bytesField)
  const records = r.list(LIMITS.proofEvents, () =>
    decodeGlobalEventRecord(r.bytes(LIMITS.bytesField)),
  )
  const accesses = r.list(LIMITS.proofAccesses, () => decodeAccess(r))
  r.finish()
  return { journal, records, accesses }
}

export function proveBatch(
  tree: Smt,
  records: GlobalEventRecordV1[],
  expectedUpdateId: Uint8Array,
): TransparentTransitionProofV1 {
  const working = tree.clone()
  const view = new ProvingView(working)
  const applied = applyBatch(view, records, expectedUpdateId)
  const journal = encodeTransitionJournal(applied)
  tree.replaceWith(working)
  return { journal, records, accesses: view.accesses() }
}

export class TransitionVerificationError extends Error {
  readonly code = 'INVALID_PROOF' as const
  readonly rule: string

  constructor(rule: string) {
    super(rule)
    this.name = 'TransitionVerificationError'
    this.rule = rule
  }
}

function checkJournalAgreement(
  applied: TransitionJournalV1,
  journal: TransitionJournalV1,
): void {
  if (!bytesEqual(applied.endRoot, journal.endRoot))
    throw new RuleError('end-root')
  if (applied.startSequence !== journal.startSequence) {
    throw new RuleError('start-sequence')
  }
  if (applied.endSequence !== journal.endSequence)
    throw new RuleError('end-sequence')
  if (!bytesEqual(applied.batchHash, journal.batchHash))
    throw new RuleError('batch-hash')
  if (!bytesEqual(applied.updateProgramId, journal.updateProgramId)) {
    throw new RuleError('update-program-id')
  }
  if (!bytesEqual(applied.activeQueryProgramId, journal.activeQueryProgramId)) {
    throw new RuleError('query-program-id')
  }
  if (!bytesEqual(applied.programChainHash, journal.programChainHash)) {
    throw new RuleError('program-chain-hash')
  }
}

export function verifyTransition(
  startRoot: Uint8Array,
  proof: TransparentTransitionProofV1,
  expectedUpdateId: Uint8Array,
): { endRoot: Uint8Array; journal: TransitionJournalV1 } {
  const journal = decodeTransitionJournal(proof.journal)
  try {
    if (!bytesEqual(journal.startRoot, startRoot))
      throw new RuleError('start-root')
    const view = new ReplayView(journal.startRoot, proof.accesses.slice())
    const applied = applyBatch(view, proof.records, expectedUpdateId)
    view.assertDrained()
    checkJournalAgreement(applied, journal)
    return { endRoot: applied.endRoot, journal }
  } catch (err) {
    if (err instanceof RuleError || err instanceof ReplayError) {
      throw new TransitionVerificationError(err.rule)
    }
    throw err
  }
}
