import { bigIntToBytes, bytesEqual } from '../core/bytes.ts'
import type { CborValue } from '../core/cbor.ts'
import {
  asSafeCount,
  asUnsignedBigInt,
  decodeCbor,
  decodeCborArray,
  encodeCbor,
  isCborMap,
  strictCborMap,
} from '../core/cbor.ts'
import type { SignedTreeHead } from '../core/merkle.ts'
import { leafHash } from '../core/merkle.ts'
import { objectHash } from '../core/object-hash.ts'
import type { VtdProof } from '../core/vtd.ts'
import { cborToVtdProof, vtdProofCbor } from '../core/vtd-cbor.ts'
import { accountCommitment } from './derivations.ts'

// The sige.demo/records/*V1 catalog (SIGE spec 6.2.1-6.2.5): types,
// constructors, canonical CBOR codecs, and objectHash-based hashers.

export type Track = 'standard' | 'emergency'

export type RecordDecodeResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string }

// Spec 6.1 header fields the 6.2.x field lists do not repeat. type_url is
// omitted because objectHash already frames it; created_at because each record
// carries its own clock (accepted_at, timestamp, created_at) that would disagree.
export type RecordHeaderV1 = {
  schema_version: number
  network_id: Uint8Array
}

export const RECORD_SCHEMA_VERSION = 1

const RECORD_HEADER_KEYS = ['schema_version', 'network_id'] as const

function headerCborEntries(header: RecordHeaderV1): [string, CborValue][] {
  return [
    ['schema_version', BigInt(header.schema_version)],
    ['network_id', header.network_id],
  ]
}

// An unknown schema_version is a hard reject: this build cannot know which
// fields a later version made critical, so it must not hash what it misread.
function parseRecordHeader(
  map: ReadonlyMap<string, CborValue>,
): RecordHeaderV1 | null {
  const schemaVersion = asSafeCount(map.get('schema_version'))
  const networkId = map.get('network_id')
  if (schemaVersion !== RECORD_SCHEMA_VERSION) return null
  if (!(networkId instanceof Uint8Array)) return null
  return { schema_version: schemaVersion, network_id: networkId }
}

function unknownKeyReason(
  map: ReadonlyMap<string, CborValue>,
  knownKeys: ReadonlySet<string>,
): string | null {
  const unknown = [...map.keys()].find((key) => !knownKeys.has(key))
  return unknown === undefined
    ? null
    : `unrecognized critical field: ${unknown}`
}

function isTrack(value: CborValue | undefined): value is Track {
  return value === 'standard' || value === 'emergency'
}

function cborToBytes(value: CborValue): Uint8Array | null {
  return value instanceof Uint8Array ? value : null
}

function cborToText(value: CborValue): string | null {
  return typeof value === 'string' ? value : null
}

function decodeBytesArray(value: CborValue | undefined): Uint8Array[] | null {
  return decodeCborArray(value, cborToBytes)
}

function decodeTextArray(value: CborValue | undefined): string[] | null {
  return decodeCborArray(value, cborToText)
}

export type EscrowCiphertextV1 = {
  u: Uint8Array
  nonce: Uint8Array
  ciphertext: Uint8Array
}

const ESCROW_CIPHERTEXT_V1_KEYS: ReadonlySet<string> = new Set([
  'u',
  'nonce',
  'ciphertext',
])

function escrowCiphertextV1Cbor(value: EscrowCiphertextV1): CborValue {
  return new Map<string, CborValue>([
    ['u', value.u],
    ['nonce', value.nonce],
    ['ciphertext', value.ciphertext],
  ])
}

function cborToEscrowCiphertextV1(
  value: CborValue | undefined,
): EscrowCiphertextV1 | null {
  const map = strictCborMap(value, ESCROW_CIPHERTEXT_V1_KEYS)
  const u = cborToBytes(map?.get('u') ?? null)
  const nonce = cborToBytes(map?.get('nonce') ?? null)
  const ciphertext = cborToBytes(map?.get('ciphertext') ?? null)
  if (!u || !nonce || !ciphertext) return null
  return { u, nonce, ciphertext }
}

export type TimedCommitmentProofByTrack = Record<Track, VtdProof>

export const TRACKS: readonly Track[] = ['standard', 'emergency']

const TRACKS_KEYS: ReadonlySet<string> = new Set(TRACKS)

function tracksCbor(byTrack: TimedCommitmentProofByTrack): CborValue {
  return new Map<string, CborValue>(
    TRACKS.map((track) => [track, vtdProofCbor(byTrack[track])]),
  )
}

function cborToTracks(
  value: CborValue | undefined,
): TimedCommitmentProofByTrack | null {
  const map = strictCborMap(value, TRACKS_KEYS)
  const standard = cborToVtdProof(map?.get('standard'))
  const emergency = cborToVtdProof(map?.get('emergency'))
  return standard && emergency ? { standard, emergency } : null
}

export const ENROLLMENT_RECORD_V1_TYPE_URL =
  'sige.demo/records/EnrollmentRecordV1'

export type EnrollmentRecordV1 = RecordHeaderV1 & {
  account_id: Uint8Array
  account_public_key: Uint8Array
  enrollment_id: Uint8Array
  credential_profile_id: string
  trust_snapshot_id: string
  policy_id: string
  escrow_epoch: number
  delay_profile_id: string
  transcript_hash: Uint8Array
  identity_commitment: Uint8Array
  document_nullifier: Uint8Array
  escrow_ciphertext_standard: EscrowCiphertextV1
  escrow_ciphertext_emergency: EscrowCiphertextV1
  enrollment_proof: Uint8Array
  timed_commitment_proof: TimedCommitmentProofByTrack
  proof_system_id: string
  unseal_detection_tag_key: Uint8Array | null
  accepted_at: number
  verifier_build_hash: Uint8Array
}

export function enrollmentRecordV1(
  fields: EnrollmentRecordV1,
): EnrollmentRecordV1 {
  return { ...fields }
}

const ENROLLMENT_RECORD_V1_KEYS = new Set([
  ...RECORD_HEADER_KEYS,
  'account_id',
  'account_public_key',
  'enrollment_id',
  'credential_profile_id',
  'trust_snapshot_id',
  'policy_id',
  'escrow_epoch',
  'delay_profile_id',
  'transcript_hash',
  'identity_commitment',
  'document_nullifier',
  'escrow_ciphertext_standard',
  'escrow_ciphertext_emergency',
  'enrollment_proof',
  'timed_commitment_proof',
  'proof_system_id',
  'unseal_detection_tag_key',
  'accepted_at',
  'verifier_build_hash',
])

export function enrollmentRecordV1Cbor(record: EnrollmentRecordV1): CborValue {
  return new Map<string, CborValue>([
    ...headerCborEntries(record),
    ['account_id', record.account_id],
    ['account_public_key', record.account_public_key],
    ['enrollment_id', record.enrollment_id],
    ['credential_profile_id', record.credential_profile_id],
    ['trust_snapshot_id', record.trust_snapshot_id],
    ['policy_id', record.policy_id],
    ['escrow_epoch', BigInt(record.escrow_epoch)],
    ['delay_profile_id', record.delay_profile_id],
    ['transcript_hash', record.transcript_hash],
    ['identity_commitment', record.identity_commitment],
    ['document_nullifier', record.document_nullifier],
    [
      'escrow_ciphertext_standard',
      escrowCiphertextV1Cbor(record.escrow_ciphertext_standard),
    ],
    [
      'escrow_ciphertext_emergency',
      escrowCiphertextV1Cbor(record.escrow_ciphertext_emergency),
    ],
    ['enrollment_proof', record.enrollment_proof],
    ['timed_commitment_proof', tracksCbor(record.timed_commitment_proof)],
    ['proof_system_id', record.proof_system_id],
    ['unseal_detection_tag_key', record.unseal_detection_tag_key],
    ['accepted_at', BigInt(record.accepted_at)],
    ['verifier_build_hash', record.verifier_build_hash],
  ])
}

type EnrollmentScalarFields = Pick<
  EnrollmentRecordV1,
  | 'account_id'
  | 'account_public_key'
  | 'enrollment_id'
  | 'transcript_hash'
  | 'identity_commitment'
  | 'document_nullifier'
  | 'enrollment_proof'
  | 'verifier_build_hash'
  | 'credential_profile_id'
  | 'trust_snapshot_id'
  | 'policy_id'
  | 'delay_profile_id'
  | 'proof_system_id'
  | 'escrow_epoch'
  | 'accepted_at'
>

function parseEnrollmentScalarFields(
  map: ReadonlyMap<string, CborValue>,
): RecordDecodeResult<EnrollmentScalarFields> {
  const accountId = map.get('account_id')
  const accountPublicKey = map.get('account_public_key')
  const enrollmentId = map.get('enrollment_id')
  const transcriptHash = map.get('transcript_hash')
  const identityCommitment = map.get('identity_commitment')
  const documentNullifier = map.get('document_nullifier')
  const enrollmentProof = map.get('enrollment_proof')
  const verifierBuildHash = map.get('verifier_build_hash')
  if (
    !(accountId instanceof Uint8Array) ||
    !(accountPublicKey instanceof Uint8Array) ||
    !(enrollmentId instanceof Uint8Array) ||
    !(transcriptHash instanceof Uint8Array) ||
    !(identityCommitment instanceof Uint8Array) ||
    !(documentNullifier instanceof Uint8Array) ||
    !(enrollmentProof instanceof Uint8Array) ||
    !(verifierBuildHash instanceof Uint8Array)
  ) {
    return {
      ok: false,
      reason: 'enrollment record is missing a required byte field',
    }
  }

  const credentialProfileId = map.get('credential_profile_id')
  const trustSnapshotId = map.get('trust_snapshot_id')
  const policyId = map.get('policy_id')
  const delayProfileId = map.get('delay_profile_id')
  const proofSystemId = map.get('proof_system_id')
  if (
    typeof credentialProfileId !== 'string' ||
    typeof trustSnapshotId !== 'string' ||
    typeof policyId !== 'string' ||
    typeof delayProfileId !== 'string' ||
    typeof proofSystemId !== 'string'
  ) {
    return {
      ok: false,
      reason: 'enrollment record is missing a required text field',
    }
  }

  const escrowEpoch = asSafeCount(map.get('escrow_epoch'))
  const acceptedAt = asSafeCount(map.get('accepted_at'))
  if (escrowEpoch === null || acceptedAt === null) {
    return {
      ok: false,
      reason: 'enrollment record is missing a required integer field',
    }
  }

  return {
    ok: true,
    value: {
      account_id: accountId,
      account_public_key: accountPublicKey,
      enrollment_id: enrollmentId,
      transcript_hash: transcriptHash,
      identity_commitment: identityCommitment,
      document_nullifier: documentNullifier,
      enrollment_proof: enrollmentProof,
      verifier_build_hash: verifierBuildHash,
      credential_profile_id: credentialProfileId,
      trust_snapshot_id: trustSnapshotId,
      policy_id: policyId,
      delay_profile_id: delayProfileId,
      proof_system_id: proofSystemId,
      escrow_epoch: escrowEpoch,
      accepted_at: acceptedAt,
    },
  }
}

export function enrollmentRecordV1FromCbor(
  value: CborValue,
): RecordDecodeResult<EnrollmentRecordV1> {
  if (!isCborMap(value)) {
    return { ok: false, reason: 'enrollment record is not a cbor map' }
  }
  const unknown = unknownKeyReason(value, ENROLLMENT_RECORD_V1_KEYS)
  if (unknown) return { ok: false, reason: unknown }

  const header = parseRecordHeader(value)
  if (!header) {
    return { ok: false, reason: 'enrollment record has a malformed header' }
  }

  const scalars = parseEnrollmentScalarFields(value)
  if (!scalars.ok) return scalars

  const escrowCiphertextStandard = cborToEscrowCiphertextV1(
    value.get('escrow_ciphertext_standard'),
  )
  const escrowCiphertextEmergency = cborToEscrowCiphertextV1(
    value.get('escrow_ciphertext_emergency'),
  )
  const timedCommitmentProof = cborToTracks(value.get('timed_commitment_proof'))
  if (
    !escrowCiphertextStandard ||
    !escrowCiphertextEmergency ||
    !timedCommitmentProof
  ) {
    return {
      ok: false,
      reason:
        'enrollment record has a malformed escrow ciphertext or timed-commitment proof',
    }
  }

  const tagKey = value.get('unseal_detection_tag_key')
  if (tagKey !== null && !(tagKey instanceof Uint8Array)) {
    return {
      ok: false,
      reason: 'enrollment record has a malformed unseal detection tag key',
    }
  }

  return {
    ok: true,
    value: enrollmentRecordV1({
      ...header,
      ...scalars.value,
      escrow_ciphertext_standard: escrowCiphertextStandard,
      escrow_ciphertext_emergency: escrowCiphertextEmergency,
      timed_commitment_proof: timedCommitmentProof,
      unseal_detection_tag_key: tagKey,
    }),
  }
}

export function hashEnrollmentRecordV1(record: EnrollmentRecordV1): Uint8Array {
  return objectHash(
    ENROLLMENT_RECORD_V1_TYPE_URL,
    enrollmentRecordV1Cbor(record),
  )
}

export function encodeEnrollmentRecordV1(
  record: EnrollmentRecordV1,
): Uint8Array {
  return encodeCbor(enrollmentRecordV1Cbor(record))
}

export function decodeEnrollmentRecordV1(
  bytes: Uint8Array,
): RecordDecodeResult<EnrollmentRecordV1> {
  const decoded = decodeCbor(bytes)
  if (!decoded.ok) return decoded
  return enrollmentRecordV1FromCbor(decoded.value)
}

export const UNSEAL_AUTHORIZATION_V1_TYPE_URL =
  'sige.demo/records/UnsealAuthorizationV1'

export type UnsealAuthorizationV1 = RecordHeaderV1 & {
  authorization_id: Uint8Array
  account_id: Uint8Array
  enrollment_id: Uint8Array
  // The exact enrollment record this order opens. The HSM gates sign
  // hashUnsealAuthorizationV1, so this is the only field that pins WHICH
  // record backs the recovered secret. An enrollment_id alone lets the
  // operator publish a second record under the same id and swap the secret.
  enrollment_record_hash: Uint8Array
  escrow_epoch: number
  track: Track
  ciphertext_hash: Uint8Array
  order_document_hash: Uint8Array
  order_signature_evidence_hash: Uint8Array
  issuing_authority: string
  issuing_role: string
  jurisdiction: string
  case_reference_commitment: Uint8Array
  legal_basis_code: string
  requested_attribute_scope: string[]
  mapping_explanation_commitment: Uint8Array
  reviewer_approvals: Uint8Array[]
  policy_version: string
  expires_at: number
}

export function unsealAuthorizationV1(
  fields: UnsealAuthorizationV1,
): UnsealAuthorizationV1 {
  return { ...fields }
}

const UNSEAL_AUTHORIZATION_V1_KEYS = new Set([
  ...RECORD_HEADER_KEYS,
  'authorization_id',
  'account_id',
  'enrollment_id',
  'enrollment_record_hash',
  'escrow_epoch',
  'track',
  'ciphertext_hash',
  'order_document_hash',
  'order_signature_evidence_hash',
  'issuing_authority',
  'issuing_role',
  'jurisdiction',
  'case_reference_commitment',
  'legal_basis_code',
  'requested_attribute_scope',
  'mapping_explanation_commitment',
  'reviewer_approvals',
  'policy_version',
  'expires_at',
])

export function unsealAuthorizationV1Cbor(
  auth: UnsealAuthorizationV1,
): CborValue {
  return new Map<string, CborValue>([
    ...headerCborEntries(auth),
    ['authorization_id', auth.authorization_id],
    ['account_id', auth.account_id],
    ['enrollment_id', auth.enrollment_id],
    ['enrollment_record_hash', auth.enrollment_record_hash],
    ['escrow_epoch', BigInt(auth.escrow_epoch)],
    ['track', auth.track],
    ['ciphertext_hash', auth.ciphertext_hash],
    ['order_document_hash', auth.order_document_hash],
    ['order_signature_evidence_hash', auth.order_signature_evidence_hash],
    ['issuing_authority', auth.issuing_authority],
    ['issuing_role', auth.issuing_role],
    ['jurisdiction', auth.jurisdiction],
    ['case_reference_commitment', auth.case_reference_commitment],
    ['legal_basis_code', auth.legal_basis_code],
    ['requested_attribute_scope', auth.requested_attribute_scope],
    ['mapping_explanation_commitment', auth.mapping_explanation_commitment],
    ['reviewer_approvals', auth.reviewer_approvals],
    ['policy_version', auth.policy_version],
    ['expires_at', BigInt(auth.expires_at)],
  ])
}

type UnsealAuthorizationScalarFields = Pick<
  UnsealAuthorizationV1,
  | 'authorization_id'
  | 'account_id'
  | 'enrollment_id'
  | 'enrollment_record_hash'
  | 'ciphertext_hash'
  | 'order_document_hash'
  | 'order_signature_evidence_hash'
  | 'case_reference_commitment'
  | 'mapping_explanation_commitment'
  | 'track'
  | 'issuing_authority'
  | 'issuing_role'
  | 'jurisdiction'
  | 'legal_basis_code'
  | 'policy_version'
  | 'escrow_epoch'
  | 'expires_at'
>

function parseUnsealAuthorizationScalarFields(
  map: ReadonlyMap<string, CborValue>,
): RecordDecodeResult<UnsealAuthorizationScalarFields> {
  const authorizationId = map.get('authorization_id')
  const accountId = map.get('account_id')
  const enrollmentId = map.get('enrollment_id')
  const enrollmentRecordHash = map.get('enrollment_record_hash')
  const ciphertextHash = map.get('ciphertext_hash')
  const orderDocumentHash = map.get('order_document_hash')
  const orderSignatureEvidenceHash = map.get('order_signature_evidence_hash')
  const caseReferenceCommitment = map.get('case_reference_commitment')
  const mappingExplanationCommitment = map.get('mapping_explanation_commitment')
  if (
    !(authorizationId instanceof Uint8Array) ||
    !(accountId instanceof Uint8Array) ||
    !(enrollmentId instanceof Uint8Array) ||
    !(enrollmentRecordHash instanceof Uint8Array) ||
    !(ciphertextHash instanceof Uint8Array) ||
    !(orderDocumentHash instanceof Uint8Array) ||
    !(orderSignatureEvidenceHash instanceof Uint8Array) ||
    !(caseReferenceCommitment instanceof Uint8Array) ||
    !(mappingExplanationCommitment instanceof Uint8Array)
  ) {
    return {
      ok: false,
      reason: 'unseal authorization is missing a required byte field',
    }
  }

  const track = map.get('track')
  const issuingAuthority = map.get('issuing_authority')
  const issuingRole = map.get('issuing_role')
  const jurisdiction = map.get('jurisdiction')
  const legalBasisCode = map.get('legal_basis_code')
  const policyVersion = map.get('policy_version')
  if (
    !isTrack(track) ||
    typeof issuingAuthority !== 'string' ||
    typeof issuingRole !== 'string' ||
    typeof jurisdiction !== 'string' ||
    typeof legalBasisCode !== 'string' ||
    typeof policyVersion !== 'string'
  ) {
    return {
      ok: false,
      reason: 'unseal authorization is missing a required text or track field',
    }
  }

  const escrowEpoch = asSafeCount(map.get('escrow_epoch'))
  const expiresAt = asSafeCount(map.get('expires_at'))
  if (escrowEpoch === null || expiresAt === null) {
    return {
      ok: false,
      reason: 'unseal authorization is missing a required integer field',
    }
  }

  return {
    ok: true,
    value: {
      authorization_id: authorizationId,
      account_id: accountId,
      enrollment_id: enrollmentId,
      enrollment_record_hash: enrollmentRecordHash,
      ciphertext_hash: ciphertextHash,
      order_document_hash: orderDocumentHash,
      order_signature_evidence_hash: orderSignatureEvidenceHash,
      case_reference_commitment: caseReferenceCommitment,
      mapping_explanation_commitment: mappingExplanationCommitment,
      track,
      issuing_authority: issuingAuthority,
      issuing_role: issuingRole,
      jurisdiction,
      legal_basis_code: legalBasisCode,
      policy_version: policyVersion,
      escrow_epoch: escrowEpoch,
      expires_at: expiresAt,
    },
  }
}

export function unsealAuthorizationV1FromCbor(
  value: CborValue,
): RecordDecodeResult<UnsealAuthorizationV1> {
  if (!isCborMap(value)) {
    return { ok: false, reason: 'unseal authorization is not a cbor map' }
  }
  const unknown = unknownKeyReason(value, UNSEAL_AUTHORIZATION_V1_KEYS)
  if (unknown) return { ok: false, reason: unknown }

  const header = parseRecordHeader(value)
  if (!header) {
    return { ok: false, reason: 'unseal authorization has a malformed header' }
  }

  const scalars = parseUnsealAuthorizationScalarFields(value)
  if (!scalars.ok) return scalars

  const requestedAttributeScope = decodeTextArray(
    value.get('requested_attribute_scope'),
  )
  const reviewerApprovals = decodeBytesArray(value.get('reviewer_approvals'))
  if (!requestedAttributeScope || !reviewerApprovals) {
    return {
      ok: false,
      reason: 'unseal authorization has a malformed scope or approvals list',
    }
  }

  return {
    ok: true,
    value: unsealAuthorizationV1({
      ...header,
      ...scalars.value,
      requested_attribute_scope: requestedAttributeScope,
      reviewer_approvals: reviewerApprovals,
    }),
  }
}

export function hashUnsealAuthorizationV1(
  auth: UnsealAuthorizationV1,
): Uint8Array {
  return objectHash(
    UNSEAL_AUTHORIZATION_V1_TYPE_URL,
    unsealAuthorizationV1Cbor(auth),
  )
}

export function encodeUnsealAuthorizationV1(
  auth: UnsealAuthorizationV1,
): Uint8Array {
  return encodeCbor(unsealAuthorizationV1Cbor(auth))
}

export function decodeUnsealAuthorizationV1(
  bytes: Uint8Array,
): RecordDecodeResult<UnsealAuthorizationV1> {
  const decoded = decodeCbor(bytes)
  if (!decoded.ok) return decoded
  return unsealAuthorizationV1FromCbor(decoded.value)
}

export const LOG_LEAF_V1_TYPE_URL = 'sige.demo/records/LogLeafV1'

export const LEAF_TYPES = [
  'ESCROW_EPOCH',
  'ENROLLMENT_ACCEPTED',
  'ANCHOR_OBSERVED',
  'DISCLOSURE',
  'POLICY',
  'RECOVERY',
  'UNSEAL_STANDARD',
  'UNSEAL_EMERGENCY',
] as const

export type LeafType = (typeof LEAF_TYPES)[number]

const LEAF_TYPE_SET: ReadonlySet<string> = new Set(LEAF_TYPES)

export function isLeafType(value: unknown): value is LeafType {
  return typeof value === 'string' && LEAF_TYPE_SET.has(value)
}

export type LogLeafV1 = RecordHeaderV1 & {
  leaf_type: LeafType
  event_id: Uint8Array
  authorization_hash: Uint8Array
  account_commitment: Uint8Array
  case_reference_commitment: Uint8Array
  order_document_hash: Uint8Array
  ciphertext_hash: Uint8Array
  escrow_epoch: number
  issuing_role: string
  track: Track
  prev_unseal_anchor_ref: number | null
  congestion_difficulty: number
  // This leaf's work-stamp output. It does NOT constrain the starting point:
  // the pre-image below zeroes this field, so a producer picks any start,
  // computes the output and writes it in. What it does buy is that the start
  // cannot be RESTATED later, because editing the leaf breaks its inclusion
  // proof. Serialization needs the report to walk leaves in index order.
  congestion_stamp_output: Uint8Array
  unseal_detection_tag: Uint8Array | null
  public_disclosure_class: string
  created_at: number
  extension_commitments: Uint8Array[]
}

// A function, never a shared module array. Handing the same Uint8Array to every
// zeroed leaf meant one write through any leaf moved every stamp pre-image in
// the process and poisoned every later enrollment leaf.
export function zeroStampOutput(): Uint8Array {
  return new Uint8Array(32)
}

// The stamp covers the leaf hash and the leaf carries the stamp output, so the
// pre-image must exclude that one field. Same shape as an approval signature
// over a record whose approvals list is emptied.
export function congestionStampLeafHash(leaf: LogLeafV1): Uint8Array {
  return leafHash(
    encodeLogLeafV1({ ...leaf, congestion_stamp_output: zeroStampOutput() }),
  )
}

export function logLeafV1(fields: LogLeafV1): LogLeafV1 {
  return { ...fields }
}

const LOG_LEAF_V1_KEYS = new Set([
  ...RECORD_HEADER_KEYS,
  'leaf_type',
  'event_id',
  'authorization_hash',
  'account_commitment',
  'case_reference_commitment',
  'order_document_hash',
  'ciphertext_hash',
  'escrow_epoch',
  'issuing_role',
  'track',
  'prev_unseal_anchor_ref',
  'congestion_difficulty',
  'congestion_stamp_output',
  'unseal_detection_tag',
  'public_disclosure_class',
  'created_at',
  'extension_commitments',
])

export function logLeafV1Cbor(leaf: LogLeafV1): CborValue {
  return new Map<string, CborValue>([
    ...headerCborEntries(leaf),
    ['leaf_type', leaf.leaf_type],
    ['event_id', leaf.event_id],
    ['authorization_hash', leaf.authorization_hash],
    ['account_commitment', leaf.account_commitment],
    ['case_reference_commitment', leaf.case_reference_commitment],
    ['order_document_hash', leaf.order_document_hash],
    ['ciphertext_hash', leaf.ciphertext_hash],
    ['escrow_epoch', BigInt(leaf.escrow_epoch)],
    ['issuing_role', leaf.issuing_role],
    ['track', leaf.track],
    [
      'prev_unseal_anchor_ref',
      leaf.prev_unseal_anchor_ref === null
        ? null
        : BigInt(leaf.prev_unseal_anchor_ref),
    ],
    ['congestion_difficulty', BigInt(leaf.congestion_difficulty)],
    ['congestion_stamp_output', leaf.congestion_stamp_output],
    ['unseal_detection_tag', leaf.unseal_detection_tag],
    ['public_disclosure_class', leaf.public_disclosure_class],
    ['created_at', BigInt(leaf.created_at)],
    ['extension_commitments', leaf.extension_commitments],
  ])
}

type LogLeafScalarFields = Pick<
  LogLeafV1,
  | 'event_id'
  | 'authorization_hash'
  | 'account_commitment'
  | 'case_reference_commitment'
  | 'order_document_hash'
  | 'ciphertext_hash'
  | 'leaf_type'
  | 'issuing_role'
  | 'public_disclosure_class'
  | 'track'
  | 'escrow_epoch'
  | 'congestion_difficulty'
  | 'congestion_stamp_output'
  | 'created_at'
>

function parseLogLeafScalarFields(
  map: ReadonlyMap<string, CborValue>,
): RecordDecodeResult<LogLeafScalarFields> {
  const eventId = map.get('event_id')
  const authorizationHash = map.get('authorization_hash')
  const accountCommitment = map.get('account_commitment')
  const caseReferenceCommitment = map.get('case_reference_commitment')
  const orderDocumentHash = map.get('order_document_hash')
  const ciphertextHash = map.get('ciphertext_hash')
  if (
    !(eventId instanceof Uint8Array) ||
    !(authorizationHash instanceof Uint8Array) ||
    !(accountCommitment instanceof Uint8Array) ||
    !(caseReferenceCommitment instanceof Uint8Array) ||
    !(orderDocumentHash instanceof Uint8Array) ||
    !(ciphertextHash instanceof Uint8Array)
  ) {
    return { ok: false, reason: 'log leaf is missing a required byte field' }
  }

  const leafType = map.get('leaf_type')
  const issuingRole = map.get('issuing_role')
  const publicDisclosureClass = map.get('public_disclosure_class')
  const track = map.get('track')
  if (
    typeof issuingRole !== 'string' ||
    typeof publicDisclosureClass !== 'string' ||
    !isTrack(track)
  ) {
    return {
      ok: false,
      reason: 'log leaf is missing a required text or track field',
    }
  }
  if (!isLeafType(leafType)) {
    return { ok: false, reason: 'log leaf declares an unrecognized leaf_type' }
  }

  const escrowEpoch = asSafeCount(map.get('escrow_epoch'))
  const congestionDifficulty = asSafeCount(map.get('congestion_difficulty'))
  const stampOutput = map.get('congestion_stamp_output')
  if (!(stampOutput instanceof Uint8Array)) {
    return {
      ok: false,
      reason: 'log leaf has a malformed congestion_stamp_output',
    }
  }
  const createdAt = asSafeCount(map.get('created_at'))
  if (
    escrowEpoch === null ||
    congestionDifficulty === null ||
    createdAt === null
  ) {
    return { ok: false, reason: 'log leaf is missing a required integer field' }
  }

  return {
    ok: true,
    value: {
      event_id: eventId,
      authorization_hash: authorizationHash,
      account_commitment: accountCommitment,
      case_reference_commitment: caseReferenceCommitment,
      order_document_hash: orderDocumentHash,
      ciphertext_hash: ciphertextHash,
      leaf_type: leafType,
      issuing_role: issuingRole,
      public_disclosure_class: publicDisclosureClass,
      track,
      escrow_epoch: escrowEpoch,
      congestion_difficulty: congestionDifficulty,
      congestion_stamp_output: stampOutput,
      created_at: createdAt,
    },
  }
}

export function logLeafV1FromCbor(
  value: CborValue,
): RecordDecodeResult<LogLeafV1> {
  if (!isCborMap(value)) {
    return { ok: false, reason: 'log leaf is not a cbor map' }
  }
  const unknown = unknownKeyReason(value, LOG_LEAF_V1_KEYS)
  if (unknown) return { ok: false, reason: unknown }

  const header = parseRecordHeader(value)
  if (!header) {
    return { ok: false, reason: 'log leaf has a malformed header' }
  }

  const scalars = parseLogLeafScalarFields(value)
  if (!scalars.ok) return scalars

  const prevAnchorRefRaw = value.get('prev_unseal_anchor_ref')
  const prevAnchorRef =
    prevAnchorRefRaw === null ? null : asSafeCount(prevAnchorRefRaw)
  if (prevAnchorRefRaw !== null && prevAnchorRef === null) {
    return {
      ok: false,
      reason: 'log leaf has a malformed prev_unseal_anchor_ref',
    }
  }

  const detectionTag = value.get('unseal_detection_tag')
  if (detectionTag !== null && !(detectionTag instanceof Uint8Array)) {
    return {
      ok: false,
      reason: 'log leaf has a malformed unseal_detection_tag',
    }
  }

  const extensionCommitments = decodeBytesArray(
    value.get('extension_commitments'),
  )
  if (!extensionCommitments) {
    return {
      ok: false,
      reason: 'log leaf has a malformed extension_commitments list',
    }
  }

  return {
    ok: true,
    value: logLeafV1({
      ...header,
      ...scalars.value,
      prev_unseal_anchor_ref: prevAnchorRef,
      unseal_detection_tag: detectionTag,
      extension_commitments: extensionCommitments,
    }),
  }
}

export function hashLogLeafV1(leaf: LogLeafV1): Uint8Array {
  return objectHash(LOG_LEAF_V1_TYPE_URL, logLeafV1Cbor(leaf))
}

export function encodeLogLeafV1(leaf: LogLeafV1): Uint8Array {
  return encodeCbor(logLeafV1Cbor(leaf))
}

export function decodeLogLeafV1(
  bytes: Uint8Array,
): RecordDecodeResult<LogLeafV1> {
  const decoded = decodeCbor(bytes)
  if (!decoded.ok) return decoded
  return logLeafV1FromCbor(decoded.value)
}

export const SIGNED_TREE_HEAD_V1_TYPE_URL = 'sige.demo/records/SignedTreeHeadV1'

export type SignedTreeHeadV1 = RecordHeaderV1 & {
  tree_id: string
  tree_size: number
  root_hash: Uint8Array
  timestamp: number
  previous_tree_size: number | null
  previous_root_hash: Uint8Array | null
  log_key_id: string
  signature: Uint8Array
}

export function signedTreeHeadV1(fields: SignedTreeHeadV1): SignedTreeHeadV1 {
  return { ...fields }
}

const SIGNED_TREE_HEAD_V1_KEYS = new Set([
  ...RECORD_HEADER_KEYS,
  'tree_id',
  'tree_size',
  'root_hash',
  'timestamp',
  'previous_tree_size',
  'previous_root_hash',
  'log_key_id',
  'signature',
])

export function signedTreeHeadV1Cbor(head: SignedTreeHeadV1): CborValue {
  return new Map<string, CborValue>([
    ...headerCborEntries(head),
    ['tree_id', head.tree_id],
    ['tree_size', BigInt(head.tree_size)],
    ['root_hash', head.root_hash],
    ['timestamp', BigInt(head.timestamp)],
    [
      'previous_tree_size',
      head.previous_tree_size === null ? null : BigInt(head.previous_tree_size),
    ],
    ['previous_root_hash', head.previous_root_hash],
    ['log_key_id', head.log_key_id],
    ['signature', head.signature],
  ])
}

type SignedTreeHeadScalarFields = Pick<
  SignedTreeHeadV1,
  | 'root_hash'
  | 'signature'
  | 'tree_id'
  | 'log_key_id'
  | 'tree_size'
  | 'timestamp'
>

function parseSignedTreeHeadScalarFields(
  map: ReadonlyMap<string, CborValue>,
): RecordDecodeResult<SignedTreeHeadScalarFields> {
  const rootHash = map.get('root_hash')
  const signature = map.get('signature')
  if (!(rootHash instanceof Uint8Array) || !(signature instanceof Uint8Array)) {
    return {
      ok: false,
      reason: 'signed tree head is missing a required byte field',
    }
  }

  const treeId = map.get('tree_id')
  const logKeyId = map.get('log_key_id')
  if (typeof treeId !== 'string' || typeof logKeyId !== 'string') {
    return {
      ok: false,
      reason: 'signed tree head is missing a required text field',
    }
  }

  const treeSize = asSafeCount(map.get('tree_size'))
  const timestamp = asSafeCount(map.get('timestamp'))
  if (treeSize === null || timestamp === null) {
    return {
      ok: false,
      reason: 'signed tree head is missing a required integer field',
    }
  }

  return {
    ok: true,
    value: {
      root_hash: rootHash,
      signature,
      tree_id: treeId,
      log_key_id: logKeyId,
      tree_size: treeSize,
      timestamp,
    },
  }
}

export function signedTreeHeadV1FromCbor(
  value: CborValue,
): RecordDecodeResult<SignedTreeHeadV1> {
  if (!isCborMap(value)) {
    return { ok: false, reason: 'signed tree head is not a cbor map' }
  }
  const unknown = unknownKeyReason(value, SIGNED_TREE_HEAD_V1_KEYS)
  if (unknown) return { ok: false, reason: unknown }

  const header = parseRecordHeader(value)
  if (!header) {
    return { ok: false, reason: 'signed tree head has a malformed header' }
  }

  const scalars = parseSignedTreeHeadScalarFields(value)
  if (!scalars.ok) return scalars

  const previousTreeSizeRaw = value.get('previous_tree_size')
  const previousTreeSize =
    previousTreeSizeRaw === null ? null : asSafeCount(previousTreeSizeRaw)
  if (previousTreeSizeRaw !== null && previousTreeSize === null) {
    return {
      ok: false,
      reason: 'signed tree head has a malformed previous_tree_size',
    }
  }

  const previousRootHash = value.get('previous_root_hash')
  if (previousRootHash !== null && !(previousRootHash instanceof Uint8Array)) {
    return {
      ok: false,
      reason: 'signed tree head has a malformed previous_root_hash',
    }
  }

  return {
    ok: true,
    value: signedTreeHeadV1({
      ...header,
      ...scalars.value,
      previous_tree_size: previousTreeSize,
      previous_root_hash: previousRootHash,
    }),
  }
}

export function hashSignedTreeHeadV1(head: SignedTreeHeadV1): Uint8Array {
  return objectHash(SIGNED_TREE_HEAD_V1_TYPE_URL, signedTreeHeadV1Cbor(head))
}

export function encodeSignedTreeHeadV1(head: SignedTreeHeadV1): Uint8Array {
  return encodeCbor(signedTreeHeadV1Cbor(head))
}

export function decodeSignedTreeHeadV1(
  bytes: Uint8Array,
): RecordDecodeResult<SignedTreeHeadV1> {
  const decoded = decodeCbor(bytes)
  if (!decoded.ok) return decoded
  return signedTreeHeadV1FromCbor(decoded.value)
}

export const BITCOIN_ANCHOR_V1_TYPE_URL = 'sige.demo/records/BitcoinAnchorV1'

export type BitcoinAnchorV1 = RecordHeaderV1 & {
  tree_id: string
  tree_size: number
  root_hash: Uint8Array
  sth_hash: Uint8Array
  commitment_scheme: string
  transaction_id: Uint8Array
  transaction_merkle_proof: Uint8Array[]
  block_header: Uint8Array
  block_height: number
  confirmation_policy: number
  observed_chain_work: bigint
}

export function bitcoinAnchorV1(fields: BitcoinAnchorV1): BitcoinAnchorV1 {
  return { ...fields }
}

const BITCOIN_ANCHOR_V1_KEYS = new Set([
  ...RECORD_HEADER_KEYS,
  'tree_id',
  'tree_size',
  'root_hash',
  'sth_hash',
  'commitment_scheme',
  'transaction_id',
  'transaction_merkle_proof',
  'block_header',
  'block_height',
  'confirmation_policy',
  'observed_chain_work',
])

export function bitcoinAnchorV1Cbor(anchor: BitcoinAnchorV1): CborValue {
  return new Map<string, CborValue>([
    ...headerCborEntries(anchor),
    ['tree_id', anchor.tree_id],
    ['tree_size', BigInt(anchor.tree_size)],
    ['root_hash', anchor.root_hash],
    ['sth_hash', anchor.sth_hash],
    ['commitment_scheme', anchor.commitment_scheme],
    ['transaction_id', anchor.transaction_id],
    ['transaction_merkle_proof', anchor.transaction_merkle_proof],
    ['block_header', anchor.block_header],
    ['block_height', BigInt(anchor.block_height)],
    ['confirmation_policy', BigInt(anchor.confirmation_policy)],
    // Bitcoin chainwork is a 256-bit cumulative-work figure: bytes, not a
    // CBOR integer, matching the profile's 64-bit shortest-form ceiling.
    ['observed_chain_work', bigIntToBytes(anchor.observed_chain_work)],
  ])
}

type BitcoinAnchorScalarFields = Pick<
  BitcoinAnchorV1,
  | 'root_hash'
  | 'sth_hash'
  | 'transaction_id'
  | 'block_header'
  | 'tree_id'
  | 'commitment_scheme'
  | 'tree_size'
  | 'block_height'
  | 'confirmation_policy'
>

function parseBitcoinAnchorScalarFields(
  map: ReadonlyMap<string, CborValue>,
): RecordDecodeResult<BitcoinAnchorScalarFields> {
  const rootHash = map.get('root_hash')
  const sthHash = map.get('sth_hash')
  const transactionId = map.get('transaction_id')
  const blockHeader = map.get('block_header')
  if (
    !(rootHash instanceof Uint8Array) ||
    !(sthHash instanceof Uint8Array) ||
    !(transactionId instanceof Uint8Array) ||
    !(blockHeader instanceof Uint8Array)
  ) {
    return {
      ok: false,
      reason: 'bitcoin anchor is missing a required byte field',
    }
  }

  const treeId = map.get('tree_id')
  const commitmentScheme = map.get('commitment_scheme')
  if (typeof treeId !== 'string' || typeof commitmentScheme !== 'string') {
    return {
      ok: false,
      reason: 'bitcoin anchor is missing a required text field',
    }
  }

  const treeSize = asSafeCount(map.get('tree_size'))
  const blockHeight = asSafeCount(map.get('block_height'))
  const confirmationPolicy = asSafeCount(map.get('confirmation_policy'))
  if (
    treeSize === null ||
    blockHeight === null ||
    confirmationPolicy === null
  ) {
    return {
      ok: false,
      reason: 'bitcoin anchor is missing a required integer field',
    }
  }

  return {
    ok: true,
    value: {
      root_hash: rootHash,
      sth_hash: sthHash,
      transaction_id: transactionId,
      block_header: blockHeader,
      tree_id: treeId,
      commitment_scheme: commitmentScheme,
      tree_size: treeSize,
      block_height: blockHeight,
      confirmation_policy: confirmationPolicy,
    },
  }
}

export function bitcoinAnchorV1FromCbor(
  value: CborValue,
): RecordDecodeResult<BitcoinAnchorV1> {
  if (!isCborMap(value)) {
    return { ok: false, reason: 'bitcoin anchor is not a cbor map' }
  }
  const unknown = unknownKeyReason(value, BITCOIN_ANCHOR_V1_KEYS)
  if (unknown) return { ok: false, reason: unknown }

  const header = parseRecordHeader(value)
  if (!header) {
    return { ok: false, reason: 'bitcoin anchor has a malformed header' }
  }

  const scalars = parseBitcoinAnchorScalarFields(value)
  if (!scalars.ok) return scalars

  const transactionMerkleProof = decodeBytesArray(
    value.get('transaction_merkle_proof'),
  )
  const observedChainWork = asUnsignedBigInt(value.get('observed_chain_work'))
  if (!transactionMerkleProof || observedChainWork === null) {
    return {
      ok: false,
      reason: 'bitcoin anchor has a malformed merkle proof or chain-work field',
    }
  }

  return {
    ok: true,
    value: bitcoinAnchorV1({
      ...header,
      ...scalars.value,
      transaction_merkle_proof: transactionMerkleProof,
      observed_chain_work: observedChainWork,
    }),
  }
}

export function hashBitcoinAnchorV1(anchor: BitcoinAnchorV1): Uint8Array {
  return objectHash(BITCOIN_ANCHOR_V1_TYPE_URL, bitcoinAnchorV1Cbor(anchor))
}

export function encodeBitcoinAnchorV1(anchor: BitcoinAnchorV1): Uint8Array {
  return encodeCbor(bitcoinAnchorV1Cbor(anchor))
}

export function decodeBitcoinAnchorV1(
  bytes: Uint8Array,
): RecordDecodeResult<BitcoinAnchorV1> {
  const decoded = decodeCbor(bytes)
  if (!decoded.ok) return decoded
  return bitcoinAnchorV1FromCbor(decoded.value)
}

export const DISCLOSURE_V1_TYPE_URL = 'sige.demo/records/DisclosureV1'

// Spec 8.2: a disclosure opens selected commitments only after review. There
// is no timed disclosure, so this record carries a reviewer, never a deadline.
export type DisclosureV1 = RecordHeaderV1 & {
  disclosure_id: Uint8Array
  authorization_hash: Uint8Array
  reviewed_by: string
  review_decision_hash: Uint8Array
  opened_fields: string[]
  opened_salts: Uint8Array[]
  disclosed_at: number
}

export function disclosureV1(fields: DisclosureV1): DisclosureV1 {
  return { ...fields }
}

const DISCLOSURE_V1_KEYS = new Set([
  ...RECORD_HEADER_KEYS,
  'disclosure_id',
  'authorization_hash',
  'reviewed_by',
  'review_decision_hash',
  'opened_fields',
  'opened_salts',
  'disclosed_at',
])

export function disclosureV1Cbor(disclosure: DisclosureV1): CborValue {
  return new Map<string, CborValue>([
    ...headerCborEntries(disclosure),
    ['disclosure_id', disclosure.disclosure_id],
    ['authorization_hash', disclosure.authorization_hash],
    ['reviewed_by', disclosure.reviewed_by],
    ['review_decision_hash', disclosure.review_decision_hash],
    ['opened_fields', disclosure.opened_fields],
    ['opened_salts', disclosure.opened_salts],
    ['disclosed_at', BigInt(disclosure.disclosed_at)],
  ])
}

export function disclosureV1FromCbor(
  value: CborValue,
): RecordDecodeResult<DisclosureV1> {
  if (!isCborMap(value)) {
    return { ok: false, reason: 'disclosure is not a cbor map' }
  }
  const unknown = unknownKeyReason(value, DISCLOSURE_V1_KEYS)
  if (unknown) return { ok: false, reason: unknown }

  const header = parseRecordHeader(value)
  if (!header) {
    return { ok: false, reason: 'disclosure has a malformed header' }
  }

  const disclosureId = value.get('disclosure_id')
  const authorizationHash = value.get('authorization_hash')
  const reviewDecisionHash = value.get('review_decision_hash')
  const reviewedBy = value.get('reviewed_by')
  const disclosedAt = asSafeCount(value.get('disclosed_at'))
  if (
    !(disclosureId instanceof Uint8Array) ||
    !(authorizationHash instanceof Uint8Array) ||
    !(reviewDecisionHash instanceof Uint8Array) ||
    typeof reviewedBy !== 'string' ||
    disclosedAt === null
  ) {
    return { ok: false, reason: 'disclosure is missing a required field' }
  }

  const openedFields = decodeTextArray(value.get('opened_fields'))
  const openedSalts = decodeBytesArray(value.get('opened_salts'))
  if (!openedFields || !openedSalts) {
    return { ok: false, reason: 'disclosure has a malformed opened list' }
  }
  if (openedFields.length !== openedSalts.length) {
    return { ok: false, reason: 'disclosure opens a field with no salt' }
  }

  return {
    ok: true,
    value: disclosureV1({
      ...header,
      disclosure_id: disclosureId,
      authorization_hash: authorizationHash,
      reviewed_by: reviewedBy,
      review_decision_hash: reviewDecisionHash,
      opened_fields: openedFields,
      opened_salts: openedSalts,
      disclosed_at: disclosedAt,
    }),
  }
}

export function hashDisclosureV1(disclosure: DisclosureV1): Uint8Array {
  return objectHash(DISCLOSURE_V1_TYPE_URL, disclosureV1Cbor(disclosure))
}

export function encodeDisclosureV1(disclosure: DisclosureV1): Uint8Array {
  return encodeCbor(disclosureV1Cbor(disclosure))
}

export function decodeDisclosureV1(
  bytes: Uint8Array,
): RecordDecodeResult<DisclosureV1> {
  const decoded = decodeCbor(bytes)
  if (!decoded.ok) return decoded
  return disclosureV1FromCbor(decoded.value)
}

// The log stores canonical LogLeafV1 bytes, so reading one back is the strict
// decoder, never a looser sibling parser that would accept a relabelled leaf.
export function parseLeaf(bytes: Uint8Array): LogLeafV1 | null {
  const decoded = decodeLogLeafV1(bytes)
  return decoded.ok ? decoded.value : null
}

export function openAccountCommitment(
  leaf: LogLeafV1,
  accountId: Uint8Array,
  blinding: Uint8Array,
): boolean {
  return bytesEqual(
    leaf.account_commitment,
    accountCommitment(accountId, blinding),
  )
}

// verifyHead and the two Merkle proofs read only these three fields. Every
// other head field is metadata the log signature does not cover today.
export function coreSignedTreeHead(head: SignedTreeHeadV1): SignedTreeHead {
  return {
    treeId: head.tree_id,
    treeSize: head.tree_size,
    rootHash: head.root_hash,
    signature: head.signature,
  }
}

export function escrowCiphertextForTrack(
  record: EnrollmentRecordV1,
  track: Track,
): EscrowCiphertextV1 {
  return track === 'standard'
    ? record.escrow_ciphertext_standard
    : record.escrow_ciphertext_emergency
}
