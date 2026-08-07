import { decodeBundle, type ResponseBundle } from './bundle.ts'
import { bytesEqual } from './bytes.ts'
import { FRESHNESS, PROTOCOL_VERSION } from './constants.ts'
import type { Evidence } from './evidence.ts'
import { hash } from './hash.ts'
import {
  checkFreshness,
  decodeLatestHead,
  type FreshnessResult,
  headSigningInput,
  type LatestHeadV1,
} from './head.ts'
import { verifySig } from './keys.ts'
import {
  chainNext,
  decodeMigration,
  PROGRAM,
  type ProgramMigrationV1,
} from './program.ts'
import {
  decodeQueryJournal,
  decodeTransparentQueryProof,
  type QueryJournalV1,
  QueryVerificationError,
  requestHash,
  resultHash,
  type TransparentQueryProofV1,
  verifyQuery,
} from './query.ts'
import {
  decodeQueryReceipt,
  type QueryReceiptV1,
  receiptSigningInput,
} from './receipt.ts'
import { verifyWitness } from './smt.ts'
import {
  decodeReceiptKeyV1,
  type ReceiptKeyV1,
  receiptKeyKey,
} from './state.ts'
import {
  decodeTransitionJournal,
  decodeTransparentTransitionProof,
  type TransitionJournalV1,
  TransitionVerificationError,
  type TransparentTransitionProofV1,
  verifyTransition,
} from './transition.ts'
import type { ClientTrustStateV1 } from './trust.ts'
import type { AccessV1 } from './view.ts'

export type VerifyErrorCode =
  | 'MALFORMED_TRANSPORT'
  | 'MALFORMED_CANONICAL_OBJECT'
  | 'UNSUPPORTED_PROTOCOL_VERSION'
  | 'INVALID_SIGNATURE'
  | 'UNAUTHORIZED_KEY'
  | 'NONCE_MISMATCH'
  | 'REQUEST_HASH_MISMATCH'
  | 'RESULT_HASH_MISMATCH'
  | 'INVALID_PROOF'
  | 'JOURNAL_MISMATCH'
  | 'INVALID_PROGRAM_CHAIN'
  | 'ROLLBACK_DETECTED'
  | 'STALE_HEAD'
  | 'FUTURE_HEAD'
  | 'STATE_PERSISTENCE_FAILED'

export type VerifyInput = {
  expectedRequest: Uint8Array
  expectedNonce: Uint8Array
  bundleBytes: Uint8Array
  trust: ClientTrustStateV1
  nowMs: bigint
  requireFreshHead: boolean
}

export type CheckLog = {
  step: number
  name: string
  pass: boolean
  error?: VerifyErrorCode
  skipped?: boolean
}

export type VerifyResult =
  | {
      ok: true
      result: Uint8Array
      next: ClientTrustStateV1
      evidence: Evidence[]
      checks: CheckLog[]
    }
  | { ok: false; error: VerifyErrorCode; rule?: string; checks: CheckLog[] }

type Failure = { error: VerifyErrorCode; rule?: string }

type StepOutcome<T> = { ok: true; value: T } | ({ ok: false } & Failure)

type StageResult<T> = { checks: CheckLog[] } & StepOutcome<T>

class StageFailure extends Error {
  readonly error: VerifyErrorCode
  readonly rule?: string

  constructor(error: VerifyErrorCode, rule?: string) {
    super(rule ?? error)
    this.name = 'StageFailure'
    this.error = error
    this.rule = rule
  }
}

function unwrap<T>(checks: CheckLog[], stage: StageResult<T>): T {
  checks.push(...stage.checks)
  if (!stage.ok) throw new StageFailure(stage.error, stage.rule)
  return stage.value
}

function stageDecode(
  bundleBytes: Uint8Array,
): StageResult<{ bundle: ResponseBundle; receipt: QueryReceiptV1 }> {
  const checks: CheckLog[] = []
  let bundle: ResponseBundle
  try {
    bundle = decodeBundle(bundleBytes)
  } catch {
    checks.push({
      step: 1,
      name: 'decode transport bundle',
      pass: false,
      error: 'MALFORMED_TRANSPORT',
    })
    return { checks, ok: false, error: 'MALFORMED_TRANSPORT' }
  }
  checks.push({ step: 1, name: 'decode transport bundle', pass: true })
  checks.push({ step: 2, name: 'extract canonical byte objects', pass: true })

  let receipt: QueryReceiptV1
  try {
    receipt = decodeQueryReceipt(bundle.receipt)
  } catch {
    checks.push({
      step: 3,
      name: 'decode canonical receipt',
      pass: false,
      error: 'MALFORMED_CANONICAL_OBJECT',
    })
    return { checks, ok: false, error: 'MALFORMED_CANONICAL_OBJECT' }
  }
  checks.push({ step: 3, name: 'decode canonical receipt', pass: true })

  return { checks, ok: true, value: { bundle, receipt } }
}

function verifyReceiptKeyAccess(
  access: AccessV1,
  receipt: QueryReceiptV1,
): Failure | null {
  const expectedKey = receiptKeyKey(receipt.receiptKeyId)
  if (access.op !== 1) return { error: 'INVALID_PROOF', rule: 'receipt-key-op' }
  if (!bytesEqual(access.key, expectedKey)) {
    return { error: 'INVALID_PROOF', rule: 'receipt-key-target' }
  }
  if (
    !verifyWitness(receipt.stateRoot, access.key, access.value, access.witness)
  ) {
    return { error: 'INVALID_PROOF', rule: 'receipt-key-witness' }
  }
  if (access.value === null) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'receipt-key-absent' }
  }
  let decoded: ReceiptKeyV1
  try {
    decoded = decodeReceiptKeyV1(access.value)
  } catch {
    return { error: 'MALFORMED_CANONICAL_OBJECT', rule: 'receipt-key-decode' }
  }
  if (decoded.status !== 1) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'receipt-key-status' }
  }
  if (decoded.sinceSequence > receipt.stateSequence) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'receipt-key-since' }
  }
  return null
}

function stageAuthenticateReceipt(
  bundle: ResponseBundle,
  receipt: QueryReceiptV1,
  expectedNonce: Uint8Array,
): StageResult<void> {
  const checks: CheckLog[] = []

  const keyFailure = verifyReceiptKeyAccess(bundle.receiptKeyWitness, receipt)
  if (keyFailure) {
    checks.push({
      step: 4,
      name: 'receipt key authorized at state sequence',
      pass: false,
      error: keyFailure.error,
    })
    return { checks, ok: false, ...keyFailure }
  }
  checks.push({
    step: 4,
    name: 'receipt key authorized at state sequence',
    pass: true,
  })

  const signatureOk = verifySig(
    receiptSigningInput(bundle.receipt),
    bundle.receiptSignature,
    receipt.receiptKeyId,
  )
  if (!signatureOk) {
    checks.push({
      step: 5,
      name: 'verify receipt signature',
      pass: false,
      error: 'INVALID_SIGNATURE',
    })
    return { checks, ok: false, error: 'INVALID_SIGNATURE' }
  }
  checks.push({ step: 5, name: 'verify receipt signature', pass: true })

  if (!bytesEqual(receipt.nonce, expectedNonce)) {
    checks.push({
      step: 6,
      name: 'verify receipt nonce',
      pass: false,
      error: 'NONCE_MISMATCH',
    })
    return { checks, ok: false, error: 'NONCE_MISMATCH' }
  }
  checks.push({ step: 6, name: 'verify receipt nonce', pass: true })

  return { checks, ok: true, value: undefined }
}

function stageBindRequestAndResult(
  bundle: ResponseBundle,
  receipt: QueryReceiptV1,
  expectedRequest: Uint8Array,
): StageResult<void> {
  const checks: CheckLog[] = []

  const computedRequestHash = requestHash(expectedRequest)
  checks.push({ step: 7, name: 'recompute request hash', pass: true })
  const requestOk =
    bytesEqual(bundle.canonicalRequest, expectedRequest) &&
    bytesEqual(computedRequestHash, receipt.requestHash)
  if (!requestOk) {
    checks.push({
      step: 8,
      name: 'verify receipt request hash',
      pass: false,
      error: 'REQUEST_HASH_MISMATCH',
    })
    return { checks, ok: false, error: 'REQUEST_HASH_MISMATCH' }
  }
  checks.push({ step: 8, name: 'verify receipt request hash', pass: true })

  const computedResultHash = resultHash(bundle.canonicalResult)
  checks.push({ step: 9, name: 'recompute result hash', pass: true })
  if (!bytesEqual(computedResultHash, receipt.resultHash)) {
    checks.push({
      step: 10,
      name: 'verify receipt result hash',
      pass: false,
      error: 'RESULT_HASH_MISMATCH',
    })
    return { checks, ok: false, error: 'RESULT_HASH_MISMATCH' }
  }
  checks.push({ step: 10, name: 'verify receipt result hash', pass: true })

  return { checks, ok: true, value: undefined }
}

function toQueryFailure(err: unknown): Failure {
  if (err instanceof QueryVerificationError) {
    return { error: err.code, rule: err.rule }
  }
  throw err
}

function matchQueryJournalToReceipt(
  journal: QueryJournalV1,
  receipt: QueryReceiptV1,
): string | null {
  if (!bytesEqual(journal.stateRoot, receipt.stateRoot)) return 'state-root'
  if (journal.stateSequence !== receipt.stateSequence) return 'state-sequence'
  if (!bytesEqual(journal.requestHash, receipt.requestHash))
    return 'request-hash'
  if (!bytesEqual(journal.resultHash, receipt.resultHash)) return 'result-hash'
  if (!bytesEqual(journal.queryProgramId, receipt.queryProgramId)) {
    return 'query-program-id'
  }
  if (!bytesEqual(journal.programChainHash, receipt.programChainHash)) {
    return 'program-chain-hash'
  }
  return null
}

function stageRollbackAndQueryProof(
  bundle: ResponseBundle,
  receipt: QueryReceiptV1,
  trust: ClientTrustStateV1,
): StageResult<void> {
  const checks: CheckLog[] = []

  if (receipt.stateSequence < trust.highestSequence) {
    checks.push({
      step: 11,
      name: 'receipt sequence not behind trust',
      pass: false,
      error: 'ROLLBACK_DETECTED',
    })
    return { checks, ok: false, error: 'ROLLBACK_DETECTED' }
  }
  checks.push({
    step: 11,
    name: 'receipt sequence not behind trust',
    pass: true,
  })

  let proof: TransparentQueryProofV1
  let journal: QueryJournalV1
  try {
    proof = decodeTransparentQueryProof(bundle.queryProof)
    journal = decodeQueryJournal(proof.journal)
  } catch {
    checks.push({
      step: 12,
      name: 'verify query proof',
      pass: false,
      error: 'INVALID_PROOF',
    })
    return {
      checks,
      ok: false,
      error: 'INVALID_PROOF',
      rule: 'query-proof-decode',
    }
  }
  try {
    verifyQuery(proof, journal)
  } catch (err) {
    const failure = toQueryFailure(err)
    checks.push({
      step: 12,
      name: 'verify query proof',
      pass: false,
      error: failure.error,
    })
    return { checks, ok: false, ...failure }
  }
  checks.push({ step: 12, name: 'verify query proof', pass: true })

  const mismatch = matchQueryJournalToReceipt(journal, receipt)
  if (mismatch) {
    checks.push({
      step: 13,
      name: 'verify query journal matches receipt',
      pass: false,
      error: 'JOURNAL_MISMATCH',
    })
    return { checks, ok: false, error: 'JOURNAL_MISMATCH', rule: mismatch }
  }
  checks.push({
    step: 13,
    name: 'verify query journal matches receipt',
    pass: true,
  })

  return { checks, ok: true, value: undefined }
}

type EraState = {
  root: Uint8Array
  sequence: bigint
  updateProgramId: Uint8Array
  queryProgramId: Uint8Array
  chainHash: Uint8Array
}

type WalkPosition = { era: EraState; cursor: number }

function initialEra(trust: ClientTrustStateV1): EraState {
  return {
    root: trust.acceptedRoot,
    sequence: trust.highestSequence,
    updateProgramId: trust.activeUpdateProgramId,
    queryProgramId: trust.activeQueryProgramId,
    chainHash: trust.programChainHash,
  }
}

function eraFromJournal(journal: TransitionJournalV1): EraState {
  return {
    root: journal.endRoot,
    sequence: journal.endSequence,
    updateProgramId: journal.updateProgramId,
    queryProgramId: journal.activeQueryProgramId,
    chainHash: journal.programChainHash,
  }
}

const REGISTRY_PROGRAM_IDS: Uint8Array[] = [
  PROGRAM.updateV1,
  PROGRAM.updateV2,
  PROGRAM.queryV1,
  PROGRAM.queryV2,
]

function isRegistryProgramId(id: Uint8Array): boolean {
  return REGISTRY_PROGRAM_IDS.some((known) => bytesEqual(known, id))
}

function verifyTransitionSegment(
  root: Uint8Array,
  segmentBytes: Uint8Array,
): StepOutcome<TransitionJournalV1> {
  let proof: TransparentTransitionProofV1
  let peeked: TransitionJournalV1
  try {
    proof = decodeTransparentTransitionProof(segmentBytes)
    peeked = decodeTransitionJournal(proof.journal)
  } catch {
    return { ok: false, error: 'INVALID_PROOF', rule: 'transition-decode' }
  }
  try {
    const verified = verifyTransition(root, proof, peeked.updateProgramId)
    return { ok: true, value: verified.journal }
  } catch (err) {
    if (err instanceof TransitionVerificationError) {
      return { ok: false, error: 'INVALID_PROOF', rule: err.rule }
    }
    throw err
  }
}

function walkTransitionSegments(
  trust: ClientTrustStateV1,
  receipt: QueryReceiptV1,
  transitions: Uint8Array[],
): StepOutcome<TransitionJournalV1[]> {
  let root = trust.acceptedRoot
  let sequence = trust.highestSequence
  const journals: TransitionJournalV1[] = []

  for (const segmentBytes of transitions) {
    const outcome = verifyTransitionSegment(root, segmentBytes)
    if (!outcome.ok) return outcome
    const journal = outcome.value
    if (journal.startSequence !== sequence) {
      return { ok: false, error: 'INVALID_PROOF', rule: 'continuity' }
    }
    journals.push(journal)
    root = journal.endRoot
    sequence = journal.endSequence
  }

  const endpointOk =
    bytesEqual(root, receipt.stateRoot) && sequence === receipt.stateSequence
  if (!endpointOk) {
    return { ok: false, error: 'INVALID_PROOF', rule: 'continuity' }
  }
  return { ok: true, value: journals }
}

function activationWithinSegment(
  journal: TransitionJournalV1,
  activationSequence: bigint,
): boolean {
  return (
    journal.startSequence < activationSequence &&
    activationSequence <= journal.endSequence
  )
}

function advanceEra(
  position: WalkPosition,
  journal: TransitionJournalV1,
  migrations: Uint8Array[],
): StepOutcome<WalkPosition> {
  const nextEra = eraFromJournal(journal)
  const eraChanged =
    !bytesEqual(position.era.queryProgramId, journal.activeQueryProgramId) ||
    !bytesEqual(position.era.chainHash, journal.programChainHash)
  if (!eraChanged) {
    return { ok: true, value: { era: nextEra, cursor: position.cursor } }
  }

  if (position.cursor >= migrations.length) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-missing',
    }
  }
  let migration: ProgramMigrationV1
  try {
    migration = decodeMigration(migrations[position.cursor])
  } catch {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-decode',
    }
  }
  if (
    !isRegistryProgramId(migration.nextUpdateProgramId) ||
    !isRegistryProgramId(migration.nextQueryProgramId)
  ) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-unknown-program',
    }
  }
  if (!bytesEqual(migration.nextUpdateProgramId, journal.updateProgramId)) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-update-id',
    }
  }
  if (!bytesEqual(migration.nextQueryProgramId, journal.activeQueryProgramId)) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-query-id',
    }
  }
  if (!activationWithinSegment(journal, migration.activationSequence)) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-activation-sequence',
    }
  }
  const expectedChainHash = chainNext(position.era.chainHash, migration)
  if (!bytesEqual(expectedChainHash, journal.programChainHash)) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-chain-hash',
    }
  }
  return { ok: true, value: { era: nextEra, cursor: position.cursor + 1 } }
}

function matchWalkedEraToReceipt(
  position: WalkPosition,
  migrations: Uint8Array[],
  receipt: QueryReceiptV1,
): string | null {
  if (position.cursor !== migrations.length) return 'migration-surplus'
  if (!bytesEqual(position.era.queryProgramId, receipt.queryProgramId)) {
    return 'final-query-program-id'
  }
  if (!bytesEqual(position.era.chainHash, receipt.programChainHash)) {
    return 'final-chain-hash'
  }
  return null
}

type MigrationWalkInput = {
  journals: TransitionJournalV1[]
  migrations: Uint8Array[]
}

function walkMigrations(
  trust: ClientTrustStateV1,
  receipt: QueryReceiptV1,
  input: MigrationWalkInput,
): StepOutcome<EraState> {
  let position: WalkPosition = { era: initialEra(trust), cursor: 0 }

  for (const journal of input.journals) {
    const advanced = advanceEra(position, journal, input.migrations)
    if (!advanced.ok) return advanced
    position = advanced.value
  }

  const mismatch = matchWalkedEraToReceipt(position, input.migrations, receipt)
  if (mismatch) {
    return { ok: false, error: 'INVALID_PROGRAM_CHAIN', rule: mismatch }
  }
  return { ok: true, value: position.era }
}

const WALK_STEP_NAME = {
  14: 'walk transition proofs to the receipt endpoint',
  15: 'walk program migrations across era boundaries',
} as const

function stageTransitionAndMigrationWalk(
  trust: ClientTrustStateV1,
  receipt: QueryReceiptV1,
  bundle: ResponseBundle,
): StageResult<EraState> {
  const checks: CheckLog[] = []

  const journalsOutcome = walkTransitionSegments(
    trust,
    receipt,
    bundle.transitions,
  )
  if (!journalsOutcome.ok) {
    checks.push({
      step: 14,
      name: WALK_STEP_NAME[14],
      pass: false,
      error: journalsOutcome.error,
    })
    return { checks, ...journalsOutcome }
  }
  checks.push({ step: 14, name: WALK_STEP_NAME[14], pass: true })

  const eraOutcome = walkMigrations(trust, receipt, {
    journals: journalsOutcome.value,
    migrations: bundle.migrations,
  })
  if (!eraOutcome.ok) {
    checks.push({
      step: 15,
      name: WALK_STEP_NAME[15],
      pass: false,
      error: eraOutcome.error,
    })
    return { checks, ...eraOutcome }
  }
  checks.push({ step: 15, name: WALK_STEP_NAME[15], pass: true })

  return { checks, ok: true, value: eraOutcome.value }
}

type HeadFacts = { latestAsOfMs: bigint }

type HeadCheckParams = {
  headBytes: Uint8Array
  head: LatestHeadV1
  signature: Uint8Array
  receipt: QueryReceiptV1
  trust: ClientTrustStateV1
  nowMs: bigint
  requireFreshHead: boolean
}

function headFreshnessFailure(
  freshness: FreshnessResult,
  requireFreshHead: boolean,
): Failure | null {
  if (freshness === 'ok') return null
  if (freshness === 'STALE_HEAD' && !requireFreshHead) return null
  return { error: freshness, rule: 'head-freshness' }
}

function checkHeadStatement(params: HeadCheckParams): Failure | null {
  const {
    headBytes,
    head,
    signature,
    receipt,
    trust,
    nowMs,
    requireFreshHead,
  } = params
  if (!verifySig(headSigningInput(headBytes), signature, head.headKeyId)) {
    return { error: 'INVALID_SIGNATURE', rule: 'head-signature' }
  }
  if (!bytesEqual(head.headKeyId, receipt.receiptKeyId)) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'head-key-era' }
  }
  const freshness = checkFreshness(head, nowMs, FRESHNESS)
  const freshnessFailure = headFreshnessFailure(freshness, requireFreshHead)
  if (freshnessFailure) return freshnessFailure
  if (
    head.head.sequence < receipt.stateSequence ||
    head.head.sequence < trust.highestSequence
  ) {
    return { error: 'ROLLBACK_DETECTED', rule: 'head-sequence' }
  }
  if (
    head.head.sequence === receipt.stateSequence &&
    !bytesEqual(head.head.stateRoot, receipt.stateRoot)
  ) {
    return { error: 'JOURNAL_MISMATCH', rule: 'head-root' }
  }
  return null
}

type HeadFreshnessParams = {
  bundle: ResponseBundle
  receipt: QueryReceiptV1
  trust: ClientTrustStateV1
  nowMs: bigint
  requireFreshHead: boolean
}

function stageHeadFreshness(
  params: HeadFreshnessParams,
): StageResult<HeadFacts | null> {
  const { bundle, receipt, trust, nowMs, requireFreshHead } = params
  const checks: CheckLog[] = []

  if (bundle.latestHead === null || bundle.latestHeadSignature === null) {
    if (!requireFreshHead) {
      checks.push({
        step: 16,
        name: 'verify latest-head freshness',
        pass: false,
        skipped: true,
      })
      return { checks, ok: true, value: null }
    }
    checks.push({
      step: 16,
      name: 'verify latest-head freshness',
      pass: false,
      error: 'STALE_HEAD',
    })
    return { checks, ok: false, error: 'STALE_HEAD', rule: 'head-absent' }
  }

  let head: LatestHeadV1
  try {
    head = decodeLatestHead(bundle.latestHead)
  } catch {
    checks.push({
      step: 16,
      name: 'verify latest-head freshness',
      pass: false,
      error: 'MALFORMED_CANONICAL_OBJECT',
    })
    return {
      checks,
      ok: false,
      error: 'MALFORMED_CANONICAL_OBJECT',
      rule: 'head-decode',
    }
  }

  const failure = checkHeadStatement({
    headBytes: bundle.latestHead,
    head,
    signature: bundle.latestHeadSignature,
    receipt,
    trust,
    nowMs,
    requireFreshHead,
  })
  if (failure) {
    checks.push({
      step: 16,
      name: 'verify latest-head freshness',
      pass: false,
      error: failure.error,
    })
    return { checks, ok: false, ...failure }
  }
  checks.push({ step: 16, name: 'verify latest-head freshness', pass: true })
  return {
    checks,
    ok: true,
    value: { latestAsOfMs: head.latestAsOfMs },
  }
}

function maxBigint(a: bigint, b: bigint): bigint {
  return a > b ? a : b
}

type BuildTrustParams = {
  trust: ClientTrustStateV1
  era: EraState
  headFacts: HeadFacts | null
  keyStateHash: Uint8Array
}

function stageBuildNextTrust(
  params: BuildTrustParams,
): StageResult<ClientTrustStateV1> {
  const { trust, era, headFacts, keyStateHash } = params
  const checks: CheckLog[] = []
  const next: ClientTrustStateV1 = {
    protocolVersion: trust.protocolVersion,
    highestSequence: era.sequence,
    acceptedRoot: era.root,
    programChainHash: era.chainHash,
    activeUpdateProgramId: era.updateProgramId,
    activeQueryProgramId: era.queryProgramId,
    activeKeyStateHash: keyStateHash,
    lastLatestAsOfMs:
      headFacts === null
        ? trust.lastLatestAsOfMs
        : maxBigint(trust.lastLatestAsOfMs, headFacts.latestAsOfMs),
  }
  checks.push({
    step: 17,
    name: 'construct next client trust state',
    pass: true,
  })
  return { checks, ok: true, value: next }
}

const STEP_PRIMARY_ERROR: Record<number, VerifyErrorCode> = {
  1: 'MALFORMED_TRANSPORT',
  2: 'MALFORMED_TRANSPORT',
  3: 'MALFORMED_CANONICAL_OBJECT',
  4: 'INVALID_PROOF',
  5: 'INVALID_SIGNATURE',
  6: 'NONCE_MISMATCH',
  7: 'REQUEST_HASH_MISMATCH',
  8: 'REQUEST_HASH_MISMATCH',
  9: 'RESULT_HASH_MISMATCH',
  10: 'RESULT_HASH_MISMATCH',
  11: 'ROLLBACK_DETECTED',
  12: 'INVALID_PROOF',
  13: 'JOURNAL_MISMATCH',
  14: 'INVALID_PROOF',
  15: 'INVALID_PROGRAM_CHAIN',
  16: 'INVALID_SIGNATURE',
}

function runVerification(input: VerifyInput): VerifyResult {
  if (input.trust.protocolVersion !== PROTOCOL_VERSION) {
    return { ok: false, error: 'UNSUPPORTED_PROTOCOL_VERSION', checks: [] }
  }
  const checks: CheckLog[] = []
  try {
    const { bundle, receipt } = unwrap(checks, stageDecode(input.bundleBytes))
    unwrap(
      checks,
      stageAuthenticateReceipt(bundle, receipt, input.expectedNonce),
    )
    unwrap(
      checks,
      stageBindRequestAndResult(bundle, receipt, input.expectedRequest),
    )
    unwrap(checks, stageRollbackAndQueryProof(bundle, receipt, input.trust))
    const era = unwrap(
      checks,
      stageTransitionAndMigrationWalk(input.trust, receipt, bundle),
    )
    const headFacts = unwrap(
      checks,
      stageHeadFreshness({
        bundle,
        receipt,
        trust: input.trust,
        nowMs: input.nowMs,
        requireFreshHead: input.requireFreshHead,
      }),
    )
    const receiptKeyValue = bundle.receiptKeyWitness.value
    if (receiptKeyValue === null) {
      throw new Error(
        'receipt key value must not be null after step 4 accepted it',
      )
    }
    const next = unwrap(
      checks,
      stageBuildNextTrust({
        trust: input.trust,
        era,
        headFacts,
        keyStateHash: hash('key-state', receiptKeyValue),
      }),
    )

    checks.push({
      step: 18,
      name: "persistence is the caller's duty",
      pass: false,
      skipped: true,
    })
    checks.push({ step: 19, name: 'return verified result', pass: true })

    return {
      ok: true,
      result: bundle.canonicalResult,
      next,
      evidence: [],
      checks,
    }
  } catch (err) {
    if (err instanceof StageFailure) {
      return { ok: false, error: err.error, rule: err.rule, checks }
    }
    const step = checks.length + 1
    const error = STEP_PRIMARY_ERROR[step] ?? 'MALFORMED_TRANSPORT'
    checks.push({ step, name: 'unexpected internal error', pass: false, error })
    return { ok: false, error, rule: 'unexpected', checks }
  }
}

export function verifyBundle(input: VerifyInput): VerifyResult {
  try {
    return runVerification(input)
  } catch {
    return { ok: false, error: 'MALFORMED_TRANSPORT', checks: [] }
  }
}
