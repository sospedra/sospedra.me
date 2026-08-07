import { ed25519 } from '@noble/curves/ed25519.js'
import { open } from '../core/aead.ts'
import { bytesEqual, concatBytes, u32be, utf8 } from '../core/bytes.ts'
import { dhash } from '../core/hash.ts'
import {
  checkEncapsulationPoint,
  combineContributions,
  deriveContribution,
  type EpochKeys,
  gateIdentity,
} from '../core/kem.ts'
import type { LhtlpParams } from '../core/lhtlp.ts'
import {
  leafHash,
  type SignedTreeHead,
  verifyHead,
  verifyInclusion,
} from '../core/merkle.ts'
import { scalarCommitment } from '../core/shamir.ts'
import {
  coefficientsDeriveFromSecret,
  type VtdProfile,
  type VtdProof,
  verifyVtd,
} from '../core/vtd.ts'
import {
  canonicalizeDocumentIssuanceId,
  credentialAttestedAttrsHash,
  DELAY_PROFILE_ID,
  documentNullifier,
  ENVELOPE_SCHEMA_VERSION,
  encodeEnvelope,
  encodeIdentityAttrs,
  encodeInnerPayload,
  escrowContext,
  identityCommitment,
  innerAd,
  innerKey,
  type TranscriptInputs,
  transcriptHash,
  tryDocumentNullifier,
} from './derivations.ts'

export type Track = 'standard' | 'emergency'
const TRACKS: readonly Track[] = ['standard', 'emergency']

function firstTrackIssue(
  check: (track: Track) => string | null,
): string | null {
  return (
    TRACKS.map(check).find((issue): issue is string => issue !== null) ?? null
  )
}

export type EscrowCiphertext = {
  u: Uint8Array
  nonce: Uint8Array
  ciphertext: Uint8Array
}

export type NormalizedIdentityAttributes = {
  fullLegalName: string
  dateOfBirth: string
  documentNumber: string
}

export type TrackStatement = {
  escrowCiphertext: EscrowCiphertext
  hS: Uint8Array
  t: number
  proof: VtdProof
}

export type EnrollmentStatement = {
  networkId: Uint8Array
  accountId: Uint8Array
  accountPublicKey: Uint8Array
  enrollmentId: Uint8Array
  serverNonce: Uint8Array
  transcriptHash: Uint8Array
  policyId: string
  trustSnapshotId: string
  escrowEpoch: number
  delayProfileId: string
  proofSystemId: string
  identityCommitment: Uint8Array
  documentNullifier: Uint8Array
  proofExpirationTime: number
  credentialProfileId: string
  tracks: Record<Track, TrackStatement>
}

export type TrackWitness = {
  secret: bigint
  innerNonce: Uint8Array
  innerCiphertext: Uint8Array
}

// Clear-mode witness (spec 7.6, 22 Open Decision 1): no ZK circuit exists.
// Sound for conditions 6-11 and pi_vtd; 1-5 accept placeholders (report).
export type EnrollmentWitness = {
  clientNonce: Uint8Array
  credentialChainRootHash: Uint8Array
  credentialType: string
  credentialValidFrom: number
  credentialValidUntil: number
  documentPublicKey: Uint8Array
  documentSignature: Uint8Array
  credentialAttestedAttrsHash: Uint8Array
  normalizedAttrs: NormalizedIdentityAttributes
  commitmentOpening: Uint8Array
  documentIssuanceId: string
  tracks: Record<Track, TrackWitness>
}

export type SubmittedEnrollmentPackage = {
  statement: EnrollmentStatement
  witness: EnrollmentWitness
}

export type ActivePolicy = {
  networkId: Uint8Array
  policyId: string
  trustSnapshotId: string
  acceptedCredentialTypes: readonly string[]
  acceptedCredentialProfileIds: readonly string[]
  acceptedChainRoots: readonly Uint8Array[]
  isDocumentRevoked: (documentNullifier: Uint8Array) => boolean
  escrowEpoch: number
  epochKeys: EpochKeys
  delayProfileId: string
  proofSystemId: string
  vtdProfile: VtdProfile
  delayT: number
  delayLhtlpParams: LhtlpParams
}

export type EnrollmentDependencies = {
  now: () => number
  consumeServerNonce: (serverNonce: Uint8Array) => boolean
  reserveNullifier: (documentNullifier: Uint8Array) => boolean
}

export type TrackRecordFields = {
  escrowCiphertext: EscrowCiphertext
  hS: Uint8Array
  t: number
  proof: VtdProof
}

export type AcceptedEnrollmentFields = {
  accountId: Uint8Array
  accountPublicKey: Uint8Array
  enrollmentId: Uint8Array
  policyId: string
  trustSnapshotId: string
  escrowEpoch: number
  delayProfileId: string
  proofSystemId: string
  credentialProfileId: string
  transcriptHash: Uint8Array
  identityCommitment: Uint8Array
  documentNullifier: Uint8Array
  tracks: Record<Track, TrackRecordFields>
}

export type EnrollmentAcceptedLeaf = {
  recordHash: Uint8Array
  identityCommitment: Uint8Array
  trackCommitments: Record<Track, Uint8Array>
}

export type EnrollmentAcceptance = {
  readonly accepted: true
  readonly record: AcceptedEnrollmentFields
  readonly leaf: EnrollmentAcceptedLeaf
}

export const SUBMITTER_REFUSAL_MESSAGE = 'enrollment refused'

export type EnrollmentRefusal = {
  readonly accepted: false
  readonly submitterMessage: typeof SUBMITTER_REFUSAL_MESSAGE
  readonly operatorReason: string
}

export type EnrollmentOutcome = EnrollmentAcceptance | EnrollmentRefusal

export type ActivationOutcome =
  | { readonly activated: true }
  | { readonly activated: false; readonly reason: string }

export const MAX_SUBMITTED_VTD_N = 256
export const MAX_SUBMITTED_VTD_K = 64
export const MAX_SMALL_FIELD_BYTES = 1024
export const MAX_LARGE_FIELD_BYTES = 512 * 1024
export const MAX_STRING_CHARS = 256
export const MAX_ESCROW_EPOCH = 0xffffffff

function refuse(operatorReason: string): EnrollmentRefusal {
  return {
    accepted: false,
    submitterMessage: SUBMITTER_REFUSAL_MESSAGE,
    operatorReason,
  }
}

function describeError(error: unknown): string {
  try {
    return String(error instanceof Error ? error.message : error)
  } catch {
    return 'unrecognizable error value'
  }
}

function frame(...parts: Uint8Array[]): Uint8Array {
  return concatBytes(...parts.flatMap((p) => [u32be(p.length), p]))
}

// Every derivation below is re-exported from derivations.ts, which world.ts
// also calls. One implementation, so the two cannot drift apart.
export const computeCredentialAttestedAttrsHash = (
  attrs: NormalizedIdentityAttributes,
): Uint8Array => credentialAttestedAttrsHash(encodeIdentityAttrs(attrs))

export const computeIdentityCommitment = (
  attrs: NormalizedIdentityAttributes,
  accountPublicKey: Uint8Array,
  opening: Uint8Array,
): Uint8Array =>
  identityCommitment(encodeIdentityAttrs(attrs), accountPublicKey, opening)

export {
  canonicalizeDocumentIssuanceId,
  documentNullifier as computeDocumentNullifier,
  innerAd as computeInnerAd,
  innerKey as computeInnerKey,
  type TranscriptInputs,
  transcriptHash as computeTranscriptHash,
}

function checkTrackProfileCeiling(proof: VtdProof): string | null {
  const overCeiling =
    proof.profile.n > MAX_SUBMITTED_VTD_N ||
    proof.profile.k > MAX_SUBMITTED_VTD_K
  return overCeiling
    ? 'timed-commitment profile exceeds the transport size ceiling'
    : null
}

function checkTracksPresent(tracks: Record<Track, unknown>): string | null {
  return TRACKS.every((track) => tracks[track] !== undefined)
    ? null
    : 'request is missing a required track'
}

// One bound for the epoch, matching gateIdentity's u32be, so a value that
// passes here can never throw downstream and can never collide in a hash.
function checkNumericFieldsSane(statement: EnrollmentStatement): string | null {
  if (
    !Number.isInteger(statement.escrowEpoch) ||
    statement.escrowEpoch < 0 ||
    statement.escrowEpoch > MAX_ESCROW_EPOCH
  ) {
    return 'escrow_epoch is outside the supported range'
  }
  const numbers = [
    statement.escrowEpoch,
    statement.proofExpirationTime,
    ...TRACKS.flatMap((track) => {
      const trackStatement = statement.tracks[track]
      return [
        trackStatement.t,
        trackStatement.proof.profile.n,
        trackStatement.proof.profile.k,
        trackStatement.proof.profile.o,
      ]
    }),
  ]
  return numbers.every((n) => Number.isInteger(n) && n >= 0)
    ? null
    : 'request carries a malformed numeric field'
}

function collectSmallByteFields(pkg: SubmittedEnrollmentPackage): Uint8Array[] {
  const { statement, witness } = pkg
  return [
    statement.networkId,
    statement.accountId,
    statement.accountPublicKey,
    statement.enrollmentId,
    statement.serverNonce,
    statement.transcriptHash,
    statement.identityCommitment,
    statement.documentNullifier,
    witness.clientNonce,
    witness.credentialChainRootHash,
    witness.documentPublicKey,
    witness.documentSignature,
    witness.credentialAttestedAttrsHash,
    witness.commitmentOpening,
    ...TRACKS.map((track) => statement.tracks[track].hS),
  ]
}

function collectLargeByteFields(pkg: SubmittedEnrollmentPackage): Uint8Array[] {
  const { statement, witness } = pkg
  return TRACKS.flatMap((track) => [
    statement.tracks[track].escrowCiphertext.u,
    statement.tracks[track].escrowCiphertext.nonce,
    statement.tracks[track].escrowCiphertext.ciphertext,
    witness.tracks[track].innerNonce,
    witness.tracks[track].innerCiphertext,
  ])
}

function collectStringFields(pkg: SubmittedEnrollmentPackage): string[] {
  const { statement, witness } = pkg
  return [
    statement.policyId,
    statement.trustSnapshotId,
    statement.delayProfileId,
    statement.proofSystemId,
    statement.credentialProfileId,
    witness.credentialType,
    witness.documentIssuanceId,
    witness.normalizedAttrs.fullLegalName,
    witness.normalizedAttrs.dateOfBirth,
    witness.normalizedAttrs.documentNumber,
  ]
}

function checkFieldSizeCeilings(
  pkg: SubmittedEnrollmentPackage,
): string | null {
  if (
    collectSmallByteFields(pkg).some((b) => b.length > MAX_SMALL_FIELD_BYTES)
  ) {
    return 'a fixed-size field exceeds the transport size ceiling'
  }
  if (
    collectLargeByteFields(pkg).some((b) => b.length > MAX_LARGE_FIELD_BYTES)
  ) {
    return 'an escrow ciphertext field exceeds the transport size ceiling'
  }
  return collectStringFields(pkg).some((s) => s.length > MAX_STRING_CHARS)
    ? 'a text field exceeds the transport size ceiling'
    : null
}

export function checkRequestShape(
  pkg: SubmittedEnrollmentPackage,
): string | null {
  const shapeIssue =
    checkTracksPresent(pkg.statement.tracks) ??
    checkTracksPresent(pkg.witness.tracks) ??
    checkNumericFieldsSane(pkg.statement) ??
    checkFieldSizeCeilings(pkg)
  if (shapeIssue) return shapeIssue
  return firstTrackIssue((track) =>
    checkTrackProfileCeiling(pkg.statement.tracks[track].proof),
  )
}

function checkPolicyIdentifiers(
  statement: EnrollmentStatement,
  policy: ActivePolicy,
): string | null {
  if (!bytesEqual(statement.networkId, policy.networkId)) {
    return 'network_id is not active'
  }
  if (statement.policyId !== policy.policyId) return 'policy_id is not active'
  if (statement.trustSnapshotId !== policy.trustSnapshotId) {
    return 'trust_snapshot_id is not active'
  }
  if (statement.escrowEpoch !== policy.escrowEpoch) {
    return 'escrow_epoch is not the active epoch'
  }
  if (statement.delayProfileId !== policy.delayProfileId) {
    return 'delay_profile_id is not active'
  }
  if (statement.proofSystemId !== policy.proofSystemId) {
    return 'proof_system_id does not match the active proof key'
  }
  if (
    !policy.acceptedCredentialProfileIds.includes(statement.credentialProfileId)
  ) {
    return 'credential_profile_id is not accepted'
  }
  return null
}

function profilesMatch(a: VtdProfile, b: VtdProfile): boolean {
  return a.n === b.n && a.k === b.k && a.o === b.o
}

function checkTrackProfilePinned(
  statement: EnrollmentStatement,
  policy: ActivePolicy,
): string | null {
  const mismatch = TRACKS.find(
    (track) =>
      !profilesMatch(statement.tracks[track].proof.profile, policy.vtdProfile),
  )
  return mismatch
    ? `${mismatch} track profile does not match the active delay profile`
    : null
}

export function checkActivePolicyMaterial(
  statement: EnrollmentStatement,
  policy: ActivePolicy,
): string | null {
  return (
    checkPolicyIdentifiers(statement, policy) ??
    checkTrackProfilePinned(statement, policy)
  )
}

export function checkCredentialChainRoot(
  witness: EnrollmentWitness,
  policy: ActivePolicy,
): string | null {
  const accepted = policy.acceptedChainRoots.some((root) =>
    bytesEqual(root, witness.credentialChainRootHash),
  )
  return accepted
    ? null
    : 'credential chain does not terminate in an accepted root'
}

export function checkCredentialTypeAndValidity(
  witness: EnrollmentWitness,
  policy: ActivePolicy,
  now: number,
): string | null {
  if (!policy.acceptedCredentialTypes.includes(witness.credentialType)) {
    return 'credential type is not accepted'
  }
  const { credentialValidFrom, credentialValidUntil } = witness
  const validWindow =
    Number.isFinite(credentialValidFrom) &&
    Number.isFinite(credentialValidUntil) &&
    now >= credentialValidFrom &&
    now <= credentialValidUntil
  return validWindow ? null : 'credential was not valid at proof time'
}

export function checkCredentialNotRevoked(
  statement: EnrollmentStatement,
  policy: ActivePolicy,
): string | null {
  let revoked: boolean
  try {
    revoked = policy.isDocumentRevoked(statement.documentNullifier)
  } catch {
    return 'revocation check failed'
  }
  return revoked ? 'credential is revoked' : null
}

export function checkCredentialSignature(
  statement: EnrollmentStatement,
  witness: EnrollmentWitness,
): string | null {
  let valid: boolean
  try {
    valid = ed25519.verify(
      witness.documentSignature,
      statement.transcriptHash,
      witness.documentPublicKey,
    )
  } catch {
    valid = false
  }
  return valid ? null : 'document signature over the transcript does not verify'
}

export function checkNormalizedFieldsAuthenticated(
  witness: EnrollmentWitness,
): string | null {
  const recomputed = computeCredentialAttestedAttrsHash(witness.normalizedAttrs)
  return bytesEqual(recomputed, witness.credentialAttestedAttrsHash)
    ? null
    : 'normalized fields do not derive from the authenticated credential data'
}

export function checkIdentityCommitment(
  statement: EnrollmentStatement,
  witness: EnrollmentWitness,
): string | null {
  const recomputed = computeIdentityCommitment(
    witness.normalizedAttrs,
    statement.accountPublicKey,
    witness.commitmentOpening,
  )
  return bytesEqual(recomputed, statement.identityCommitment)
    ? null
    : 'identity_commitment does not commit to the normalized fields and account key'
}

export function checkDocumentNullifierDerivation(
  statement: EnrollmentStatement,
  witness: EnrollmentWitness,
): string | null {
  const recomputed = tryDocumentNullifier(
    statement.networkId,
    witness.documentIssuanceId,
  )
  if (recomputed === null) {
    return 'document issuance id is ambiguous or empty'
  }
  return bytesEqual(recomputed, statement.documentNullifier)
    ? null
    : 'document_nullifier does not derive from the credential issuance'
}

export function checkTimedCommitmentProof(
  track: Track,
  pkg: SubmittedEnrollmentPackage,
  policy: ActivePolicy,
): string | null {
  const trackStatement = pkg.statement.tracks[track]
  const expectations = { hS: trackStatement.hS, profile: policy.vtdProfile }
  const proofIssue = verifyVtd(
    policy.delayLhtlpParams,
    trackStatement.proof,
    expectations,
  )
  if (proofIssue) return `${track} pi_vtd rejected: ${proofIssue}`
  const secret = pkg.witness.tracks[track].secret
  const coefficientIssue = coefficientsDeriveFromSecret(
    secret,
    trackStatement.proof,
  )
  return coefficientIssue
    ? `${track} pi_vtd coefficients do not derive from the witness secret: ${coefficientIssue}`
    : null
}

export function checkInnerKeyBindsToPublishedCommitment(
  track: Track,
  statement: EnrollmentStatement,
  witness: EnrollmentWitness,
): string | null {
  const secret = witness.tracks[track].secret
  let expected: Uint8Array
  try {
    expected = scalarCommitment(secret)
  } catch {
    return `${track} inner key does not bind to the published H_s`
  }
  return bytesEqual(expected, statement.tracks[track].hS)
    ? null
    : `${track} inner key does not bind to the published H_s`
}

export function checkDelayMatchesProfile(
  track: Track,
  statement: EnrollmentStatement,
  policy: ActivePolicy,
): string | null {
  return statement.tracks[track].t === policy.delayT
    ? null
    : `${track} declared t does not match the active delay profile`
}

export type EscrowContextBinding = Pick<
  EnrollmentStatement,
  'accountId' | 'accountPublicKey' | 'enrollmentId' | 'escrowEpoch'
>

// The track separator is load-bearing, not decoration: without it one gate
// release opens both tracks, and these bytes must equal world.ts's context.
export function computeEscrowContext(
  statement: EscrowContextBinding,
  policy: ActivePolicy,
  track: Track,
): Uint8Array {
  return escrowContext({
    networkId: policy.networkId,
    accountId: statement.accountId,
    accountPublicKey: statement.accountPublicKey,
    enrollmentId: statement.enrollmentId,
    escrowEpoch: statement.escrowEpoch,
    track,
  })
}

// The world is the only producer of envelope bytes, so the verifier must use
// its encoding. A local framing here verified something no producer emits.
export function computeEnvelopePlaintext(
  trackStatement: TrackStatement,
  innerNonce: Uint8Array,
  innerCiphertext: Uint8Array,
): Uint8Array {
  return encodeEnvelope({
    schemaVersion: ENVELOPE_SCHEMA_VERSION,
    delayProfileId: DELAY_PROFILE_ID,
    t: trackStatement.t,
    hS: trackStatement.hS,
    proof: trackStatement.proof,
    innerNonce,
    innerCiphertext,
  })
}

export const computePayloadPlaintext = encodeInnerPayload

type ReconstructKeyInput = {
  fields: Pick<
    AcceptedEnrollmentFields,
    'accountId' | 'enrollmentId' | 'escrowEpoch' | 'transcriptHash'
  >
  ciphertext: EscrowCiphertext
  policy: ActivePolicy
  context: Uint8Array
}

function reconstructTrackKey(input: ReconstructKeyInput): Uint8Array | null {
  const { fields, ciphertext, policy, context } = input
  const pointIssue = checkEncapsulationPoint(ciphertext.u)
  if (pointIssue) return null
  const idWarrant = gateIdentity(
    'warrant',
    policy.networkId,
    fields.accountId,
    fields.enrollmentId,
    fields.escrowEpoch,
  )
  const idLog = gateIdentity(
    'log',
    policy.networkId,
    fields.accountId,
    fields.enrollmentId,
    fields.escrowEpoch,
  )
  try {
    const zA = deriveContribution(
      'warrant',
      idWarrant,
      policy.epochKeys.xA,
      ciphertext.u,
    )
    const zB = deriveContribution(
      'log',
      idLog,
      policy.epochKeys.xB,
      ciphertext.u,
    )
    return combineContributions(zA, zB, fields.transcriptHash, context)
  } catch {
    return null
  }
}

export function checkEscrowDecryptsToEnvelope(
  track: Track,
  pkg: SubmittedEnrollmentPackage,
  policy: ActivePolicy,
): string | null {
  const { statement, witness } = pkg
  const trackStatement = statement.tracks[track]
  const context = computeEscrowContext(statement, policy, track)
  const key = reconstructTrackKey({
    fields: statement,
    ciphertext: trackStatement.escrowCiphertext,
    policy,
    context,
  })
  if (!key) return `${track} escrow ciphertext key does not reconstruct`
  const opened = open(
    key,
    trackStatement.escrowCiphertext.nonce,
    trackStatement.escrowCiphertext.ciphertext,
    context,
  )
  if (!opened)
    return `${track} escrow ciphertext does not decrypt under the declared epoch`
  const trackWitness = witness.tracks[track]
  const expectedEnvelope = computeEnvelopePlaintext(
    trackStatement,
    trackWitness.innerNonce,
    trackWitness.innerCiphertext,
  )
  if (!bytesEqual(opened, expectedEnvelope)) {
    return `${track} escrow ciphertext does not decrypt to the witnessed envelope`
  }
  const ad = innerAd(statement.accountId, statement.enrollmentId)
  const derivedInnerKey = innerKey(trackWitness.secret)
  const payload = open(
    derivedInnerKey,
    trackWitness.innerNonce,
    trackWitness.innerCiphertext,
    ad,
  )
  if (!payload)
    return `${track} inner ciphertext does not decrypt under the witnessed secret`
  const expectedPayload = computePayloadPlaintext(
    witness.normalizedAttrs,
    witness.commitmentOpening,
  )
  return bytesEqual(payload, expectedPayload)
    ? null
    : `${track} inner payload does not contain the witnessed fields and commitment opening`
}

function checkTranscriptHash(
  statement: EnrollmentStatement,
  witness: EnrollmentWitness,
): string | null {
  const recomputed = transcriptHash({
    networkId: statement.networkId,
    accountId: statement.accountId,
    accountPublicKey: statement.accountPublicKey,
    enrollmentId: statement.enrollmentId,
    serverNonce: statement.serverNonce,
    clientNonce: witness.clientNonce,
    policyId: statement.policyId,
    trustSnapshotId: statement.trustSnapshotId,
    escrowEpoch: statement.escrowEpoch,
    delayProfileId: statement.delayProfileId,
  })
  return bytesEqual(recomputed, statement.transcriptHash)
    ? null
    : 'transcript_hash is not bound to its declared fields'
}

function checkNotExpired(
  statement: EnrollmentStatement,
  now: number,
): string | null {
  return now <= statement.proofExpirationTime ? null : 'proof has expired'
}

export function checkTranscriptBinding(
  statement: EnrollmentStatement,
  witness: EnrollmentWitness,
  now: number,
): string | null {
  return (
    checkTranscriptHash(statement, witness) ?? checkNotExpired(statement, now)
  )
}

function evaluateTrackEnvelope(
  track: Track,
  pkg: SubmittedEnrollmentPackage,
  policy: ActivePolicy,
): (string | null)[] {
  return [
    checkTimedCommitmentProof(track, pkg, policy),
    checkInnerKeyBindsToPublishedCommitment(track, pkg.statement, pkg.witness),
    checkDelayMatchesProfile(track, pkg.statement, policy),
    checkEscrowDecryptsToEnvelope(track, pkg, policy),
  ]
}

// ROW 15. INTERNAL. Standalone this enforces none of the step-3 policy pins:
// it takes the policy on trust and checks the witness against it, so a caller
// that passes a policy of its own choosing proves nothing. Only
// `verifyEnrollmentSubmission` establishes those pins first, so only it may
// call this. Exported for tests, which is why the name says so.
//
// Evaluated unconditionally (array literal, never `??`) so no TOP-LEVEL
// predicate is skipped. This is NOT constant time: predicates return early
// internally, and a cheap structural refusal still costs far less than an
// accept. See CLAIMS.md, known gaps.
export function checkRelationInternal(
  pkg: SubmittedEnrollmentPackage,
  policy: ActivePolicy,
  now: number,
): string | null {
  const { statement, witness } = pkg
  const issues = [
    checkCredentialChainRoot(witness, policy),
    checkCredentialTypeAndValidity(witness, policy, now),
    checkCredentialNotRevoked(statement, policy),
    checkCredentialSignature(statement, witness),
    checkNormalizedFieldsAuthenticated(witness),
    checkIdentityCommitment(statement, witness),
    checkDocumentNullifierDerivation(statement, witness),
    ...TRACKS.flatMap((track) => evaluateTrackEnvelope(track, pkg, policy)),
    checkTranscriptBinding(statement, witness, now),
  ]
  return issues.find((issue): issue is string => issue !== null) ?? null
}

function buildAcceptedFields(
  statement: EnrollmentStatement,
): AcceptedEnrollmentFields {
  const tracks = Object.fromEntries(
    TRACKS.map((track) => {
      const trackStatement = statement.tracks[track]
      const fields: TrackRecordFields = {
        escrowCiphertext: trackStatement.escrowCiphertext,
        hS: trackStatement.hS,
        t: trackStatement.t,
        proof: trackStatement.proof,
      }
      return [track, fields] as const
    }),
  ) as Record<Track, TrackRecordFields>
  return {
    accountId: statement.accountId,
    accountPublicKey: statement.accountPublicKey,
    enrollmentId: statement.enrollmentId,
    policyId: statement.policyId,
    trustSnapshotId: statement.trustSnapshotId,
    escrowEpoch: statement.escrowEpoch,
    delayProfileId: statement.delayProfileId,
    proofSystemId: statement.proofSystemId,
    credentialProfileId: statement.credentialProfileId,
    transcriptHash: statement.transcriptHash,
    identityCommitment: statement.identityCommitment,
    documentNullifier: statement.documentNullifier,
    tracks,
  }
}

function trackKeyReconstructs(
  track: Track,
  fields: AcceptedEnrollmentFields,
  policy: ActivePolicy,
  context: Uint8Array,
): boolean {
  const key = reconstructTrackKey({
    fields,
    ciphertext: fields.tracks[track].escrowCiphertext,
    policy,
    context,
  })
  if (!key) return false
  const { nonce, ciphertext } = fields.tracks[track].escrowCiphertext
  return open(key, nonce, ciphertext, context) !== null
}

export function checkKeyReconstructibleFromStoredFields(
  fields: AcceptedEnrollmentFields,
  statement: EnrollmentStatement,
  policy: ActivePolicy,
): string | null {
  if (!bytesEqual(fields.transcriptHash, statement.transcriptHash)) {
    return 'stored transcript_hash does not match the validated transcript'
  }
  const unreconstructible = TRACKS.find(
    (track) =>
      !trackKeyReconstructs(
        track,
        fields,
        policy,
        computeEscrowContext(statement, policy, track),
      ),
  )
  return unreconstructible
    ? `${unreconstructible} track key does not reconstruct from the fields about to be stored`
    : null
}

function buildLeaf(record: AcceptedEnrollmentFields): EnrollmentAcceptedLeaf {
  const recordHash = dhash(
    'sige-verifier/accepted-record',
    record.accountId,
    record.accountPublicKey,
    record.enrollmentId,
    record.transcriptHash,
    record.identityCommitment,
    record.documentNullifier,
    utf8(record.credentialProfileId),
    ...TRACKS.map((track) => record.tracks[track].hS),
  )
  const trackCommitments = Object.fromEntries(
    TRACKS.map((track) => [track, record.tracks[track].hS] as const),
  ) as Record<Track, Uint8Array>
  return {
    recordHash,
    identityCommitment: record.identityCommitment,
    trackCommitments,
  }
}

function encodeLeaf(leaf: EnrollmentAcceptedLeaf): Uint8Array {
  return frame(
    leaf.recordHash,
    leaf.identityCommitment,
    ...TRACKS.map((track) => leaf.trackCommitments[track]),
  )
}

function snapshotVtdProfile(profile: VtdProfile): VtdProfile {
  return Object.freeze({ n: profile.n, k: profile.k, o: profile.o })
}

function snapshotTrackStatement(
  trackStatement: TrackStatement | undefined,
): TrackStatement | undefined {
  if (!trackStatement?.proof?.profile) return trackStatement
  return {
    ...trackStatement,
    proof: {
      ...trackStatement.proof,
      profile: snapshotVtdProfile(trackStatement.proof.profile),
    },
  }
}

// Reads profile.n/k/o once into plain frozen fields: a hostile accessor
// cannot return a different value later once every step sees this snapshot.
function snapshotPackage(
  pkg: SubmittedEnrollmentPackage,
): SubmittedEnrollmentPackage {
  const tracks = Object.fromEntries(
    TRACKS.map(
      (track) =>
        [track, snapshotTrackStatement(pkg.statement.tracks[track])] as const,
    ),
  ) as Record<Track, TrackStatement>
  return { statement: { ...pkg.statement, tracks }, witness: pkg.witness }
}

function runAcceptanceSteps(
  submission: SubmittedEnrollmentPackage,
  policy: ActivePolicy,
  deps: EnrollmentDependencies,
): EnrollmentOutcome {
  const pkg = snapshotPackage(submission)
  const shapeIssue = checkRequestShape(pkg)
  if (shapeIssue) return refuse(`step 1 (request shape): ${shapeIssue}`)

  if (!deps.consumeServerNonce(pkg.statement.serverNonce)) {
    return refuse('step 2 (server nonce): nonce is unknown or already consumed')
  }

  const policyIssue = checkActivePolicyMaterial(pkg.statement, policy)
  if (policyIssue)
    return refuse(`step 3 (active policy material): ${policyIssue}`)

  const relationIssue = checkRelationInternal(pkg, policy, deps.now())
  if (relationIssue) return refuse(`step 4 (relation): ${relationIssue}`)

  const record = buildAcceptedFields(pkg.statement)
  const keyIssue = checkKeyReconstructibleFromStoredFields(
    record,
    pkg.statement,
    policy,
  )
  if (keyIssue)
    return refuse(`step 5 (transcript and key reconstruction): ${keyIssue}`)

  if (!deps.reserveNullifier(record.documentNullifier)) {
    return refuse('step 6 (nullifier uniqueness): document already enrolled')
  }

  return { accepted: true, record, leaf: buildLeaf(record) }
}

export function verifyEnrollmentSubmission(
  pkg: SubmittedEnrollmentPackage,
  policy: ActivePolicy,
  deps: EnrollmentDependencies,
): EnrollmentOutcome {
  try {
    return runAcceptanceSteps(pkg, policy, deps)
  } catch (error) {
    return refuse(`unexpected verifier error: ${describeError(error)}`)
  }
}

export function persistAcceptance(
  acceptance: EnrollmentAcceptance,
  persist: (
    record: AcceptedEnrollmentFields,
    leaf: EnrollmentAcceptedLeaf,
  ) => number,
): number {
  return persist(acceptance.record, acceptance.leaf)
}

export type InclusionEvidence = {
  leaf: EnrollmentAcceptedLeaf
  leafIndex: number
  sth: SignedTreeHead
  inclusionProof: Uint8Array[]
  logPublicKey: Uint8Array
}

export function activateAfterInclusion(
  evidence: InclusionEvidence,
): ActivationOutcome {
  try {
    const { leaf, leafIndex, sth, inclusionProof, logPublicKey } = evidence
    if (!verifyHead(logPublicKey, sth)) {
      return {
        activated: false,
        reason: 'signed tree head signature does not verify',
      }
    }
    const included = verifyInclusion(
      encodeLeaf(leaf),
      leafIndex,
      sth.treeSize,
      inclusionProof,
      sth.rootHash,
    )
    return included
      ? { activated: true }
      : {
          activated: false,
          reason: 'leaf does not appear in the signed tree head',
        }
  } catch (error) {
    return {
      activated: false,
      reason: `unexpected verifier error: ${describeError(error)}`,
    }
  }
}

export function enrollmentAcceptedLeafBytes(
  leaf: EnrollmentAcceptedLeaf,
): Uint8Array {
  return encodeLeaf(leaf)
}

export function enrollmentAcceptedLeafHash(
  leaf: EnrollmentAcceptedLeaf,
): Uint8Array {
  return leafHash(encodeLeaf(leaf))
}
