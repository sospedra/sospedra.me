import { bls12_381 } from '@noble/curves/bls12-381.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import {
  bytesEqual,
  bytesToBigInt,
  randomBytes,
  toHex,
  utf8,
} from '../core/bytes.ts'
import { type CborValue, decodeCbor, encodeCbor } from '../core/cbor.ts'
import { dhash } from '../core/hash.ts'
import {
  commitmentFor,
  commitPoly,
  type FeldmanCommitments,
  randomPoly,
  reconstruct,
  type Share,
  scalarCommitment,
  shareAt,
} from '../core/shamir.ts'
import { tryDocumentNullifier } from './derivations.ts'
import {
  activeEpoch,
  type DemoWorld,
  type EnrollmentRecord,
  enroll,
  enrollForMigration,
  type IdentityAttributes,
} from './world.ts'

const Fr = bls12_381.fields.Fr

function isCborMap(value: CborValue): value is ReadonlyMap<string, CborValue> {
  return value instanceof Map
}

function randomFactorSecret(): bigint {
  for (;;) {
    const candidate = Fr.create(bytesToBigInt(randomBytes(48)))
    if (candidate !== 0n) return candidate
  }
}

export type RecoveryFactorKind =
  | 'recovery_key'
  | 'device'
  | 'kit'
  | 'document_proof'

export type DeviceToken = Uint8Array

export const RECOVERY_THRESHOLD = 2

const RECOVERY_FACTOR_INDEX: Record<RecoveryFactorKind, number> = {
  recovery_key: 1,
  device: 2,
  kit: 3,
  document_proof: 4,
}

export const RECOVERY_DELAY_BLOCKS = 6

export type RecoveryKit = {
  accountId: Uint8Array
  commitments: FeldmanCommitments
  devices: DeviceToken[]
}

export type RecoveryShares = Record<RecoveryFactorKind, Share>

export function setupRecoveryKit(
  accountId: Uint8Array,
  devices: DeviceToken[],
): { kit: RecoveryKit; shares: RecoveryShares } {
  const secret = randomFactorSecret()
  const poly = randomPoly(secret, RECOVERY_THRESHOLD)
  const shares: RecoveryShares = {
    recovery_key: shareAt(poly, RECOVERY_FACTOR_INDEX.recovery_key),
    device: shareAt(poly, RECOVERY_FACTOR_INDEX.device),
    kit: shareAt(poly, RECOVERY_FACTOR_INDEX.kit),
    document_proof: shareAt(poly, RECOVERY_FACTOR_INDEX.document_proof),
  }
  return { kit: { accountId, commitments: commitPoly(poly), devices }, shares }
}

export type RecoveryFactorSubmission = {
  kind: RecoveryFactorKind
  share: Share
}

export type QuorumOutcome =
  | { satisfied: true; secret: bigint; validKinds: RecoveryFactorKind[] }
  | { satisfied: false; reason: string; validKinds: RecoveryFactorKind[] }

function validateFactorShare(
  kit: RecoveryKit,
  submission: RecoveryFactorSubmission,
): boolean {
  if (submission.share.index !== RECOVERY_FACTOR_INDEX[submission.kind]) {
    return false
  }
  const expected = commitmentFor(kit.commitments, submission.share.index)
  return bytesEqual(expected, scalarCommitment(submission.share.value))
}

function evaluateQuorumUnsafe(
  kit: RecoveryKit,
  submissions: RecoveryFactorSubmission[],
): QuorumOutcome {
  const byKind = new Map(submissions.map((s) => [s.kind, s] as const))
  const validEntries = [...byKind.entries()].filter(([, submission]) =>
    validateFactorShare(kit, submission),
  )
  const validKinds = validEntries.map(([kind]) => kind)
  if (validKinds.length < RECOVERY_THRESHOLD) {
    return {
      satisfied: false,
      reason: `refused: recovery needs ${RECOVERY_THRESHOLD} distinct valid factors, got ${validKinds.length}`,
      validKinds,
    }
  }

  const secret = reconstruct(
    validEntries.map(([, submission]) => submission.share),
  )
  const matches = bytesEqual(scalarCommitment(secret), kit.commitments.a[0])
  return matches
    ? { satisfied: true, secret, validKinds }
    : {
        satisfied: false,
        reason:
          'refused: reconstructed secret does not match the published commitment',
        validKinds,
      }
}

// The boundary for hostile input: shamir.ts throws on an out-of-range scalar
// or a malformed point, and a refusal must never surface as an exception.
export function evaluateRecoveryQuorum(
  kit: RecoveryKit,
  submissions: RecoveryFactorSubmission[],
): QuorumOutcome {
  try {
    return evaluateQuorumUnsafe(kit, submissions)
  } catch (error) {
    return {
      satisfied: false,
      reason: `refused: ${error instanceof Error ? error.message : String(error)}`,
      validKinds: [],
    }
  }
}

export function proveDocumentContinuity(
  world: DemoWorld,
  shares: RecoveryShares,
  input: { record: EnrollmentRecord; documentIssuanceId: string },
): RecoveryFactorSubmission | null {
  const nullifier = tryDocumentNullifier(
    world.networkId,
    input.documentIssuanceId,
  )
  if (nullifier === null) return null
  if (!bytesEqual(nullifier, input.record.documentNullifier)) return null
  return { kind: 'document_proof', share: shares.document_proof }
}

export type RecoveryLeafFields = {
  leaf_type: 'RECOVERY'
  account_commitment: string
  factor_commitment: string
  ready_at_height: number
  created_at: number
}

const RECOVERY_LEAF_KEYS = new Set([
  'leaf_type',
  'account_commitment',
  'factor_commitment',
  'ready_at_height',
  'created_at',
])

function recoveryLeafFieldsCbor(fields: RecoveryLeafFields): CborValue {
  return new Map<string, CborValue>([
    ['leaf_type', fields.leaf_type],
    ['account_commitment', fields.account_commitment],
    ['factor_commitment', fields.factor_commitment],
    ['ready_at_height', BigInt(fields.ready_at_height)],
    ['created_at', BigInt(fields.created_at)],
  ])
}

type BuiltRecoveryLeaf = {
  bytes: Uint8Array
  fields: RecoveryLeafFields
  accountBlinding: Uint8Array
  factorBlinding: Uint8Array
}

function buildRecoveryLeaf(
  accountId: Uint8Array,
  validKinds: RecoveryFactorKind[],
  readyAtHeight: number,
): BuiltRecoveryLeaf {
  const accountBlinding = randomBytes(32)
  const factorBlinding = randomBytes(32)
  const fields: RecoveryLeafFields = {
    leaf_type: 'RECOVERY',
    account_commitment: toHex(
      dhash('recovery-account-commitment', accountId, accountBlinding),
    ),
    factor_commitment: toHex(
      dhash(
        'recovery-factor-commitment',
        utf8(validKinds.toSorted().join(',')),
        factorBlinding,
      ),
    ),
    ready_at_height: readyAtHeight,
    created_at: Date.now(),
  }
  return {
    bytes: encodeCbor(recoveryLeafFieldsCbor(fields)),
    fields,
    accountBlinding,
    factorBlinding,
  }
}

export function parseRecoveryLeaf(
  bytes: Uint8Array,
): RecoveryLeafFields | null {
  const decoded = decodeCbor(bytes)
  if (!decoded.ok || !isCborMap(decoded.value)) return null
  const map = decoded.value
  const hasUnknownKey = [...map.keys()].some(
    (key) => !RECOVERY_LEAF_KEYS.has(key),
  )
  if (hasUnknownKey) return null
  const leafType = map.get('leaf_type')
  const accountCommitment = map.get('account_commitment')
  const factorCommitment = map.get('factor_commitment')
  const readyAtHeight = map.get('ready_at_height')
  const createdAt = map.get('created_at')
  if (
    leafType !== 'RECOVERY' ||
    typeof accountCommitment !== 'string' ||
    typeof factorCommitment !== 'string' ||
    typeof readyAtHeight !== 'bigint' ||
    typeof createdAt !== 'bigint'
  ) {
    return null
  }
  return {
    leaf_type: 'RECOVERY',
    account_commitment: accountCommitment,
    factor_commitment: factorCommitment,
    ready_at_height: Number(readyAtHeight),
    created_at: Number(createdAt),
  }
}

export function openRecoveryAccountCommitment(
  leaf: RecoveryLeafFields,
  accountId: Uint8Array,
  blinding: Uint8Array,
): boolean {
  return (
    leaf.account_commitment ===
    toHex(dhash('recovery-account-commitment', accountId, blinding))
  )
}

export type PendingRecovery = {
  ticketId: string
  accountId: Uint8Array
  secret: bigint
  readyAtHeight: number
  leafIndex: number
  notifiedDevices: DeviceToken[]
  accountBlinding: Uint8Array
  factorBlinding: Uint8Array
}

export type RecoveryTicketStore = {
  pending: Map<string, PendingRecovery>
}

export function createRecoveryTicketStore(): RecoveryTicketStore {
  return { pending: new Map() }
}

export type InitiateRecoveryInput = {
  kit: RecoveryKit
  submissions: RecoveryFactorSubmission[]
  notify?: (device: DeviceToken) => void
}

export type InitiateRecoveryResult =
  | { refused: true; reason: string }
  | { refused: false; pending: PendingRecovery; leaf: RecoveryLeafFields }

function initiateRecoveryUnsafe(
  world: DemoWorld,
  tickets: RecoveryTicketStore,
  input: InitiateRecoveryInput,
): InitiateRecoveryResult {
  const outcome = evaluateRecoveryQuorum(input.kit, input.submissions)
  if (!outcome.satisfied) return { refused: true, reason: outcome.reason }

  const readyAtHeight = world.chain.tipHeight() + RECOVERY_DELAY_BLOCKS
  const built = buildRecoveryLeaf(
    input.kit.accountId,
    outcome.validKinds,
    readyAtHeight,
  )
  const leafIndex = world.log.append(built.bytes)

  const notify = input.notify ?? (() => {})
  for (const device of input.kit.devices) notify(device)

  const pending: PendingRecovery = {
    ticketId: toHex(randomBytes(16)),
    accountId: input.kit.accountId,
    secret: outcome.secret,
    readyAtHeight,
    leafIndex,
    notifiedDevices: input.kit.devices,
    accountBlinding: built.accountBlinding,
    factorBlinding: built.factorBlinding,
  }
  tickets.pending.set(pending.ticketId, pending)
  return { refused: false, pending, leaf: built.fields }
}

export function initiateRecovery(
  world: DemoWorld,
  tickets: RecoveryTicketStore,
  input: InitiateRecoveryInput,
): InitiateRecoveryResult {
  if (world.lockdown) return { refused: true, reason: 'refused: lockdown' }
  try {
    return initiateRecoveryUnsafe(world, tickets, input)
  } catch (error) {
    return {
      refused: true,
      reason: `refused: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export type FinalizeRecoveryResult =
  | { refused: true; reason: string }
  | { refused: false; newAccountKey: Uint8Array }

export function finalizeRecovery(
  world: DemoWorld,
  tickets: RecoveryTicketStore,
  ticketId: string,
): FinalizeRecoveryResult {
  if (world.lockdown) return { refused: true, reason: 'refused: lockdown' }
  const pending = tickets.pending.get(ticketId)
  if (!pending) {
    return {
      refused: true,
      reason: 'refused: unknown or already-used recovery ticket',
    }
  }
  if (world.chain.tipHeight() < pending.readyAtHeight) {
    return {
      refused: true,
      reason: `refused: recovery delay not yet elapsed, ready at height ${pending.readyAtHeight}`,
    }
  }
  tickets.pending.delete(ticketId)
  const newPrivateKey = ed25519.utils.randomSecretKey()
  return { refused: false, newAccountKey: ed25519.getPublicKey(newPrivateKey) }
}

export type AccountAuthKey = {
  accountId: Uint8Array
  publicKey: Uint8Array
}

// noble throws on a malformed signature or key. A verifier at a boundary
// must return a reason, so every check here routes through this.
function verifyEd25519(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  try {
    return ed25519.verify(signature, message, publicKey)
  } catch {
    return false
  }
}

export function accountKeyRegistrationChallenge(
  accountId: Uint8Array,
  newPublicKey: Uint8Array,
): Uint8Array {
  return dhash('account-key-registration', accountId, newPublicKey)
}

export function signAccountKeyRegistration(
  accountPrivateKey: Uint8Array,
  accountId: Uint8Array,
  newPublicKey: Uint8Array,
): Uint8Array {
  return ed25519.sign(
    accountKeyRegistrationChallenge(accountId, newPublicKey),
    accountPrivateKey,
  )
}

export type AccountKeyRegistration =
  | { registered: true; authKey: AccountAuthKey }
  | { registered: false; reason: string }

export type RegisterAccountKeyInput = {
  // The record, not a caller-supplied key pair. Accepting both the account id
  // and its public key from the caller lets an attacker supply its own.
  record: EnrollmentRecord
  newPublicKey: Uint8Array
  signature: Uint8Array
}

// Spec 12.3 requires authenticating the existing account. Without this any
// party could register a key for any account and silently own it.
export function registerAccountKey(
  input: RegisterAccountKeyInput,
): AccountKeyRegistration {
  const { accountId, accountPublicKey } = input.record
  const challenge = accountKeyRegistrationChallenge(
    accountId,
    input.newPublicKey,
  )
  const authentic = verifyEd25519(input.signature, challenge, accountPublicKey)
  if (!authentic) {
    return {
      registered: false,
      reason: 'registration is not signed by the enrolled account key',
    }
  }
  return {
    registered: true,
    authKey: { accountId, publicKey: input.newPublicKey },
  }
}

export function generateAccountAuthKey(): {
  publicKey: Uint8Array
  privateKey: Uint8Array
} {
  const privateKey = ed25519.utils.randomSecretKey()
  return { publicKey: ed25519.getPublicKey(privateKey), privateKey }
}

export function renewalContinuityChallenge(
  oldEnrollmentId: Uint8Array,
  newDocumentIssuanceId: string,
): Uint8Array {
  return dhash(
    'renewal-continuity',
    oldEnrollmentId,
    utf8(newDocumentIssuanceId),
  )
}

export function signRenewalContinuity(
  privateKey: Uint8Array,
  oldEnrollmentId: Uint8Array,
  newDocumentIssuanceId: string,
): Uint8Array {
  return ed25519.sign(
    renewalContinuityChallenge(oldEnrollmentId, newDocumentIssuanceId),
    privateKey,
  )
}

export type ContinuityProof =
  | { kind: 'account_key'; signature: Uint8Array }
  | {
      kind: 'recovery_quorum'
      kit: RecoveryKit
      submissions: RecoveryFactorSubmission[]
    }

type RenewalContext = {
  oldEnrollmentId: Uint8Array
  newDocumentIssuanceId: string
}

// A quorum claim is re-derived from the raw kit and submissions every time,
// never trusted as a precomputed flag a caller could fabricate.
function verifyContinuityUnsafe(
  proof: ContinuityProof,
  authKey: AccountAuthKey | null,
  context: RenewalContext,
): string | null {
  if (proof.kind === 'recovery_quorum') {
    const outcome = evaluateRecoveryQuorum(proof.kit, proof.submissions)
    return outcome.satisfied ? null : outcome.reason
  }
  if (!authKey) {
    return 'refused: account key continuity requires a registered auth key'
  }
  const challenge = renewalContinuityChallenge(
    context.oldEnrollmentId,
    context.newDocumentIssuanceId,
  )
  const valid = verifyEd25519(proof.signature, challenge, authKey.publicKey)
  return valid ? null : 'refused: account key continuity signature invalid'
}

export function verifyContinuity(
  proof: ContinuityProof,
  authKey: AccountAuthKey | null,
  context: RenewalContext,
): string | null {
  try {
    return verifyContinuityUnsafe(proof, authKey, context)
  } catch (error) {
    return `refused: ${error instanceof Error ? error.message : String(error)}`
  }
}

export type EnrollmentLink = {
  oldEnrollmentId: Uint8Array
  newEnrollmentId: Uint8Array
  personLinkage: 'not_claimed'
  reason: 'renewal' | 'migration'
  linkedAt: number
}

export type SupersessionLedger = {
  supersededBy: Map<string, Uint8Array>
  links: EnrollmentLink[]
}

export function createSupersessionLedger(): SupersessionLedger {
  return { supersededBy: new Map(), links: [] }
}

export function isSuperseded(
  ledger: SupersessionLedger,
  enrollmentId: Uint8Array,
): boolean {
  return ledger.supersededBy.has(toHex(enrollmentId))
}

export function supersedingEnrollmentId(
  ledger: SupersessionLedger,
  enrollmentId: Uint8Array,
): Uint8Array | null {
  return ledger.supersededBy.get(toHex(enrollmentId)) ?? null
}

function supersede(
  ledger: SupersessionLedger,
  fields: {
    oldEnrollmentId: Uint8Array
    newEnrollmentId: Uint8Array
    reason: EnrollmentLink['reason']
  },
): EnrollmentLink {
  const link: EnrollmentLink = {
    oldEnrollmentId: fields.oldEnrollmentId,
    newEnrollmentId: fields.newEnrollmentId,
    personLinkage: 'not_claimed',
    reason: fields.reason,
    linkedAt: Date.now(),
  }
  ledger.supersededBy.set(toHex(fields.oldEnrollmentId), fields.newEnrollmentId)
  ledger.links.push(link)
  return link
}

export type LinkedReenrollmentInput = {
  priorRecord: EnrollmentRecord
  newDocumentIssuanceId: string
  attrs: IdentityAttributes
  continuity: ContinuityProof
  authKey: AccountAuthKey | null
  ledger: SupersessionLedger
}

export type LinkedReenrollmentResult =
  | { refused: true; reason: string }
  | { refused: false; link: EnrollmentLink; newRecord: EnrollmentRecord }

function linkedReenrollmentUnsafe(
  world: DemoWorld,
  input: LinkedReenrollmentInput,
  reason: EnrollmentLink['reason'],
): LinkedReenrollmentResult {
  const continuityIssue = verifyContinuity(input.continuity, input.authKey, {
    oldEnrollmentId: input.priorRecord.enrollmentId,
    newDocumentIssuanceId: input.newDocumentIssuanceId,
  })
  if (continuityIssue) return { refused: true, reason: continuityIssue }

  // A renewal presents a new document and earns a new nullifier. A migration
  // rewraps the same one, so it must not mint a second (spec 7.4, 13.2).
  const enrolled =
    reason === 'migration'
      ? enrollForMigration(
          world,
          input.priorRecord,
          input.attrs,
          input.newDocumentIssuanceId,
        )
      : enroll(world, input.newDocumentIssuanceId, input.attrs)
  if ('error' in enrolled) {
    return {
      refused: true,
      reason: `refused: new credential enrollment failed: ${enrolled.error}`,
    }
  }

  const link = supersede(input.ledger, {
    oldEnrollmentId: input.priorRecord.enrollmentId,
    newEnrollmentId: enrolled.record.enrollmentId,
    reason,
  })
  return { refused: false, link, newRecord: enrolled.record }
}

function linkedReenrollment(
  world: DemoWorld,
  input: LinkedReenrollmentInput,
  reason: EnrollmentLink['reason'],
): LinkedReenrollmentResult {
  try {
    return linkedReenrollmentUnsafe(world, input, reason)
  } catch (error) {
    return {
      refused: true,
      reason: `refused: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export function renewEnrollment(
  world: DemoWorld,
  input: LinkedReenrollmentInput,
): LinkedReenrollmentResult {
  return linkedReenrollment(world, input, 'renewal')
}

// Boneh-Franklin cannot re-encrypt existing ciphertexts to a new epoch's
// keys, so migration only ever adds a new, linked, new-epoch enrollment.
function migrateAccountUnsafe(
  world: DemoWorld,
  input: LinkedReenrollmentInput,
): LinkedReenrollmentResult {
  if (activeEpoch(world).epoch === input.priorRecord.escrowEpoch) {
    return {
      refused: true,
      reason: 'refused: active epoch has not changed, nothing to migrate',
    }
  }
  return linkedReenrollment(world, input, 'migration')
}

export function migrateAccount(
  world: DemoWorld,
  input: LinkedReenrollmentInput,
): LinkedReenrollmentResult {
  try {
    return migrateAccountUnsafe(world, input)
  } catch (error) {
    return {
      refused: true,
      reason: `refused: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
