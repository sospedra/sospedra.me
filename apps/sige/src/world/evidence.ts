import { ed25519 } from '@noble/curves/ed25519.js'
import {
  bigIntToBytes,
  bytesEqual,
  bytesToBigInt,
  utf8,
} from '../core/bytes.ts'
import type { CborValue } from '../core/cbor.ts'
import { decodeCbor, encodeCbor, strictCborMap } from '../core/cbor.ts'
import type { CongestionPolicy, WorkStamp } from '../core/congestion.ts'
import { chainedWork } from '../core/congestion.ts'
import { dhash } from '../core/hash.ts'
import type { LhtlpParams, LhtlpPuzzle } from '../core/lhtlp.ts'
import { addPuzzles, scalePuzzle } from '../core/lhtlp.ts'
import {
  leafHash,
  verifyConsistency,
  verifyHead,
  verifyInclusion,
} from '../core/merkle.ts'
import { objectHash } from '../core/object-hash.ts'
import { lagrangeCoefficients, scalarCommitment } from '../core/shamir.ts'
import type { VtdProfile, VtdProof } from '../core/vtd.ts'
import { verifyVtd } from '../core/vtd.ts'
import { escrowCiphertextHash } from './derivations.ts'
import type {
  BitcoinAnchorV1,
  EnrollmentRecordV1,
  LogLeafV1,
  SignedTreeHeadV1,
  Track,
  UnsealAuthorizationV1,
} from './records.ts'
import {
  bitcoinAnchorV1Cbor,
  congestionStampLeafHash,
  coreSignedTreeHead,
  encodeLogLeafV1,
  enrollmentRecordV1Cbor,
  escrowCiphertextForTrack,
  hashBitcoinAnchorV1,
  hashEnrollmentRecordV1,
  hashLogLeafV1,
  hashSignedTreeHeadV1,
  hashUnsealAuthorizationV1,
  logLeafV1Cbor,
  signedTreeHeadV1Cbor,
  unsealAuthorizationV1Cbor,
} from './records.ts'

// The offline unseal-evidence bundle (spec 6.2.6): everything a party holding
// only public keys needs to check the whole ceremony after the fact.

export type RedactedOrderSignatureEvidence = {
  orderDocumentHash: Uint8Array
  issuingRole: string
  signature: Uint8Array
}

export type HsmGate = 'warrant' | 'log'

export type HsmAttestation = {
  gate: HsmGate
  message: Uint8Array
  signature: Uint8Array
}

export type CongestionScheduleEvidence = {
  stamp: WorkStamp
  previousStampOutput: Uint8Array
}

export type TimedCommitmentSolutionProof = {
  track: Track
  proof: VtdProof
  hS: Uint8Array
  subset: readonly number[]
  foldedPuzzle: LhtlpPuzzle
  recoveredScalar: Uint8Array
}

export type CeremonyStep = {
  label: string
  commitment: Uint8Array
}

export type CeremonyTranscriptV1 = {
  steps: readonly CeremonyStep[]
  finalHash: Uint8Array
}

export type ClosingLeafV1 = {
  unsealLeafHash: Uint8Array
  anchorHash: Uint8Array
  solutionProofCommitment: Uint8Array
  decryptionResultCommitment: Uint8Array
  // The transcript is recomputable from the bundle's own fields, so on its own
  // it constrains nothing. This is what gives it content: the log published it,
  // under a signed head, and the auditor proves inclusion.
  ceremonyTranscriptHash: Uint8Array
  closedAt: number
}

export type EvidenceBundleV1 = {
  authorization: UnsealAuthorizationV1
  orderSignatureEvidence: RedactedOrderSignatureEvidence
  logLeaf: LogLeafV1
  leafIndex: number
  inclusionProof: readonly Uint8Array[]
  signedHead: SignedTreeHeadV1
  previousSignedHead: SignedTreeHeadV1
  consistencyProof: readonly Uint8Array[]
  bitcoinAnchor: BitcoinAnchorV1
  congestionEvidence: CongestionScheduleEvidence
  warrantAttestation: HsmAttestation
  logAttestation: HsmAttestation
  solutionProof: TimedCommitmentSolutionProof | null
  // The record itself, not just its digest. A digest nothing compares against
  // leaves the recovered secret bound to no account at all.
  enrollmentRecord: EnrollmentRecordV1
  enrollmentRecordHash: Uint8Array
  // The leaf that published the record, plus its inclusion proof under
  // signedHead. Without it the record is a value the bundle simply asserts.
  enrollmentLeaf: LogLeafV1
  enrollmentLeafIndex: number
  enrollmentInclusionProof: readonly Uint8Array[]
  decryptionResultCommitment: Uint8Array
  ceremonyTranscript: CeremonyTranscriptV1
  closingLeaf: ClosingLeafV1
  closingLeafIndex: number
  closingInclusionProof: readonly Uint8Array[]
  closingSignedHead: SignedTreeHeadV1
  // ROW 6. Without this an equivocating log presents a closing head on another
  // branch: later, same log id, correctly signed, and unrelated.
  closingConsistencyProof: readonly Uint8Array[]
}

export type EvidencePublicKeys = {
  roleKeys: ReadonlyMap<string, Uint8Array>
  logPublicKey: Uint8Array
  warrantHsmPublicKey: Uint8Array
  logHsmPublicKey: Uint8Array
  delayParams: LhtlpParams
  expectedVtdProfile: VtdProfile
  minConfirmations: number
  minReviewerApprovals: number
  // Positional, matching the roster the gates use. Counting approvals without
  // these verifies nothing: any byte string satisfied the quorum.
  reviewerKeys: readonly Uint8Array[]
  congestionPolicy: CongestionPolicy
}

// Reviewers cannot sign a hash that already contains their signatures, so the
// pre-image is the same authorization with the approvals list emptied.
export function reviewerApprovalMessage(
  auth: UnsealAuthorizationV1,
): Uint8Array {
  return hashUnsealAuthorizationV1({ ...auth, reviewer_approvals: [] })
}

function countVerifiedApprovals(
  auth: UnsealAuthorizationV1,
  reviewerKeys: readonly Uint8Array[],
): number {
  const message = reviewerApprovalMessage(auth)
  return auth.reviewer_approvals.filter((signature, i) => {
    const key = reviewerKeys[i]
    if (key === undefined) return false
    try {
      return ed25519.verify(signature, message, key)
    } catch {
      return false
    }
  }).length
}

const MAX_PROOF_LENGTH = 64
const MAX_SOLUTION_SUBSET_SIZE = 1024

function checkSignedHead(
  head: SignedTreeHeadV1,
  logPublicKey: Uint8Array,
): boolean {
  try {
    return verifyHead(logPublicKey, coreSignedTreeHead(head))
  } catch {
    return false
  }
}

export function orderDocumentSignatureMessage(
  orderDocumentHash: Uint8Array,
): Uint8Array {
  return dhash('sige/evidence/order-document', orderDocumentHash)
}

export function orderSignatureEvidenceCommitment(
  evidence: RedactedOrderSignatureEvidence,
): Uint8Array {
  return dhash(
    'sige/evidence/order-signature-evidence',
    evidence.orderDocumentHash,
    utf8(evidence.issuingRole),
    evidence.signature,
  )
}

function verifiesRoleSignature(
  evidence: RedactedOrderSignatureEvidence,
  roleKeys: ReadonlyMap<string, Uint8Array>,
): boolean {
  const rolePublicKey = roleKeys.get(evidence.issuingRole)
  if (!rolePublicKey) return false
  try {
    return ed25519.verify(
      evidence.signature,
      orderDocumentSignatureMessage(evidence.orderDocumentHash),
      rolePublicKey,
    )
  } catch {
    return false
  }
}

function checkOrderSignatureEvidence(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  const { authorization, orderSignatureEvidence: evidence } = bundle
  if (
    !bytesEqual(evidence.orderDocumentHash, authorization.order_document_hash)
  ) {
    return 'order-signature evidence targets a different order document than the authorization'
  }
  if (evidence.issuingRole !== authorization.issuing_role) {
    return 'order-signature evidence names a different issuing role than the authorization'
  }
  if (
    !bytesEqual(
      orderSignatureEvidenceCommitment(evidence),
      authorization.order_signature_evidence_hash,
    )
  ) {
    return 'order-signature evidence does not match the authorization commitment'
  }
  return verifiesRoleSignature(evidence, keys.roleKeys)
    ? null
    : 'order-signature evidence signature does not verify against a pinned role key'
}

const LEAF_TYPE_FOR_TRACK: Record<Track, string> = {
  standard: 'UNSEAL_STANDARD',
  emergency: 'UNSEAL_EMERGENCY',
}

function checkLeafFieldBinding(bundle: EvidenceBundleV1): string | null {
  const { authorization: auth, logLeaf: leaf } = bundle
  if (!bytesEqual(leaf.ciphertext_hash, auth.ciphertext_hash)) {
    return 'log leaf targets a different ciphertext than the authorization'
  }
  if (
    !bytesEqual(leaf.case_reference_commitment, auth.case_reference_commitment)
  ) {
    return 'log leaf case reference does not match the authorization'
  }
  if (!bytesEqual(leaf.order_document_hash, auth.order_document_hash)) {
    return 'log leaf order document hash does not match the authorization'
  }
  if (leaf.issuing_role !== auth.issuing_role) {
    return 'log leaf issuing role does not match the authorization'
  }
  if (leaf.escrow_epoch !== auth.escrow_epoch) {
    return 'log leaf escrow epoch does not match the authorization'
  }
  return null
}

function checkLeafBinding(bundle: EvidenceBundleV1): string | null {
  const { authorization: auth, logLeaf: leaf } = bundle
  if (!bytesEqual(leaf.authorization_hash, hashUnsealAuthorizationV1(auth))) {
    return 'log leaf does not commit this authorization'
  }
  if (leaf.track !== auth.track) {
    return 'log leaf track does not match the authorization'
  }
  if (leaf.leaf_type !== LEAF_TYPE_FOR_TRACK[auth.track]) {
    return 'log leaf type does not match the authorization track'
  }
  return checkLeafFieldBinding(bundle)
}

function checkInclusion(bundle: EvidenceBundleV1): string | null {
  if (bundle.inclusionProof.length > MAX_PROOF_LENGTH) {
    return 'inclusion proof is implausibly long'
  }
  const included = verifyInclusion(
    encodeLogLeafV1(bundle.logLeaf),
    bundle.leafIndex,
    bundle.signedHead.tree_size,
    [...bundle.inclusionProof],
    bundle.signedHead.root_hash,
  )
  return included
    ? null
    : 'log leaf is not included under the presented tree head'
}

function checkHead(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  return checkSignedHead(bundle.signedHead, keys.logPublicKey)
    ? null
    : 'signed tree head does not verify against the pinned log key'
}

function selfReportsPreviousHead(
  signedHead: SignedTreeHeadV1,
  previous: SignedTreeHeadV1,
): boolean {
  return (
    signedHead.previous_tree_size === previous.tree_size &&
    signedHead.previous_root_hash !== null &&
    bytesEqual(signedHead.previous_root_hash, previous.root_hash)
  )
}

// A stateless bundle cannot confirm previousSignedHead is the log's true
// last-accepted state -- that needs a gate with memory. What it CAN refuse is
// a previous head that proves nothing: verifyConsistency returns true on the
// degenerate oldSize === newSize branch, so a bundle naming itself as its own
// predecessor with an empty proof would otherwise pass with zero content.
function checkConsistency(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  const { previousSignedHead, consistencyProof, signedHead } = bundle
  if (consistencyProof.length > MAX_PROOF_LENGTH) {
    return 'consistency proof is implausibly long'
  }
  if (previousSignedHead.tree_size >= signedHead.tree_size) {
    return 'previous signed head does not precede the signed head'
  }
  if (consistencyProof.length === 0) {
    return 'consistency proof is absent'
  }
  if (!selfReportsPreviousHead(signedHead, previousSignedHead)) {
    return 'signed head does not self-report the previous anchor in the bundle'
  }
  if (!checkSignedHead(previousSignedHead, keys.logPublicKey)) {
    return 'previous signed head does not verify against the pinned log key'
  }
  const consistent = verifyConsistency(
    coreSignedTreeHead(previousSignedHead),
    coreSignedTreeHead(signedHead),
    [...consistencyProof],
  )
  return consistent
    ? null
    : 'signed head is not a consistent extension of the previous anchor'
}

function checkAnchorShape(anchor: BitcoinAnchorV1): string | null {
  if (anchor.transaction_merkle_proof.length > MAX_PROOF_LENGTH) {
    return 'anchor transaction merkle proof is implausibly long'
  }
  if (anchor.block_header.length !== 80) {
    return 'anchor block header is not 80 bytes'
  }
  if (!Number.isInteger(anchor.block_height) || anchor.block_height < 0) {
    return 'anchor block height is not a valid non-negative integer'
  }
  return anchor.observed_chain_work > 0n
    ? null
    : 'anchor observed chain work must be positive'
}

function checkAnchorBinding(
  anchor: BitcoinAnchorV1,
  signedHead: SignedTreeHeadV1,
  minConfirmations: number,
): string | null {
  if (!Number.isInteger(minConfirmations) || minConfirmations < 0) {
    return 'minimum confirmations policy is not a valid non-negative integer'
  }
  if (anchor.tree_id !== signedHead.tree_id) {
    return 'anchor names a different log than the signed head'
  }
  if (anchor.tree_size !== signedHead.tree_size) {
    return 'anchor commits a different tree size than the signed head'
  }
  if (!bytesEqual(anchor.root_hash, signedHead.root_hash)) {
    return 'anchor commits a different root hash than the signed head'
  }
  if (!bytesEqual(anchor.sth_hash, hashSignedTreeHeadV1(signedHead))) {
    return 'anchor does not commit this signed tree head'
  }
  return anchor.confirmation_policy >= minConfirmations
    ? null
    : 'anchor confirmation policy is below the required minimum'
}

function checkAnchor(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  return (
    checkAnchorShape(bundle.bitcoinAnchor) ??
    checkAnchorBinding(
      bundle.bitcoinAnchor,
      bundle.signedHead,
      keys.minConfirmations,
    )
  )
}

function congestionDifficultyCeiling(policy: CongestionPolicy): number {
  return policy.dFloor * 2 ** policy.cap
}

// Spec 5.5C exempts the emergency track from congestion, so its floor is 0.
// This cannot be laundered: three independent checks refuse a relabelled
// track, and the last of them rides the HSM-signed authorization hash.
function checkCongestionPolicyRange(
  difficulty: number,
  policy: CongestionPolicy,
  track: Track,
): string | null {
  if (!Number.isInteger(difficulty) || difficulty < 0) {
    return 'leaf congestion difficulty is not a valid non-negative integer'
  }
  const floor = track === 'emergency' ? 0 : policy.dFloor
  return difficulty >= floor &&
    difficulty <= congestionDifficultyCeiling(policy)
    ? null
    : 'leaf congestion difficulty is outside the policy-allowed range'
}

function checkCongestion(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  const { stamp, previousStampOutput } = bundle.congestionEvidence
  const required = bundle.logLeaf.congestion_difficulty
  const rangeIssue = checkCongestionPolicyRange(
    required,
    keys.congestionPolicy,
    bundle.logLeaf.track,
  )
  if (rangeIssue) return rangeIssue
  if (!Number.isInteger(stamp.difficulty) || stamp.difficulty < 0) {
    return 'congestion stamp difficulty is not a valid non-negative integer'
  }
  if (stamp.difficulty !== required) {
    return 'congestion stamp difficulty does not match the leaf requirement'
  }
  // The log signs the leaf, and the leaf carries the output, so a bundle cannot
  // restate its starting point after publication. It does NOT bind the start at
  // construction: the stamp pre-image zeroes this field, so the producer chose
  // it freely. See the known-gaps table in CLAIMS.md.
  if (!bytesEqual(bundle.logLeaf.congestion_stamp_output, stamp.output)) {
    return 'congestion stamp output is not the one the log published'
  }
  const recomputed = chainedWork(
    previousStampOutput,
    congestionStampLeafHash(bundle.logLeaf),
    stamp.difficulty,
  )
  return bytesEqual(recomputed.output, stamp.output)
    ? null
    : 'congestion stamp does not recompute the expected hash chain'
}

export function attestationMessage(
  gate: HsmGate,
  authorization: UnsealAuthorizationV1,
  logLeaf: LogLeafV1,
): Uint8Array {
  return dhash(
    `sige/evidence/${gate}-attestation`,
    hashUnsealAuthorizationV1(authorization),
    hashLogLeafV1(logLeaf),
    authorization.ciphertext_hash,
  )
}

const ATTESTATION_FOR: Record<
  HsmGate,
  (bundle: EvidenceBundleV1) => HsmAttestation
> = {
  warrant: (bundle) => bundle.warrantAttestation,
  log: (bundle) => bundle.logAttestation,
}

function verifiesAttestationSignature(
  attestation: HsmAttestation,
  hsmPublicKey: Uint8Array,
): boolean {
  try {
    return ed25519.verify(
      attestation.signature,
      attestation.message,
      hsmPublicKey,
    )
  } catch {
    return false
  }
}

function checkAttestation(
  gate: HsmGate,
  bundle: EvidenceBundleV1,
  hsmPublicKey: Uint8Array,
): string | null {
  const attestation = ATTESTATION_FOR[gate](bundle)
  if (attestation.gate !== gate) {
    return `${gate} attestation is tagged for the wrong gate`
  }
  const expected = attestationMessage(
    gate,
    bundle.authorization,
    bundle.logLeaf,
  )
  if (!bytesEqual(attestation.message, expected)) {
    return `${gate} attestation message does not bind this authorization and leaf`
  }
  return verifiesAttestationSignature(attestation, hsmPublicKey)
    ? null
    : `${gate} attestation signature does not verify against the pinned hsm key`
}

export function unopenedPuzzleIndices(proof: VtdProof): number[] {
  const opened = new Set(proof.opened.map((entry) => entry.index))
  return Array.from({ length: proof.profile.n }, (_, i) => i + 1).filter(
    (index) => !opened.has(index),
  )
}

export function foldTimedCommitmentPuzzles(
  params: LhtlpParams,
  proof: VtdProof,
  subset: readonly number[],
): LhtlpPuzzle {
  const lambdas = lagrangeCoefficients([...subset])
  const scaled = subset.map((index, i) =>
    scalePuzzle(params, proof.puzzles[index - 1], lambdas[i]),
  )
  return scaled.reduce((acc, puzzle) => addPuzzles(params, acc, puzzle))
}

export type BuildSolutionProofInput = {
  params: LhtlpParams
  track: Track
  proof: VtdProof
  hS: Uint8Array
  subset: readonly number[]
  recoveredScalar: bigint
}

export function buildTimedCommitmentSolutionProof(
  input: BuildSolutionProofInput,
): TimedCommitmentSolutionProof {
  const { params, track, proof, hS, subset, recoveredScalar } = input
  return {
    track,
    proof,
    hS,
    subset,
    foldedPuzzle: foldTimedCommitmentPuzzles(params, proof, subset),
    recoveredScalar: bigIntToBytes(recoveredScalar),
  }
}

function isWellFormedSubset(
  subset: readonly number[],
  proof: VtdProof,
): boolean {
  if (subset.length === 0 || subset.length > MAX_SOLUTION_SUBSET_SIZE)
    return false
  if (subset.length !== proof.profile.k) return false
  if (new Set(subset).size !== subset.length) return false
  const opened = new Set(proof.opened.map((entry) => entry.index))
  return subset.every(
    (index) =>
      Number.isInteger(index) &&
      index >= 1 &&
      index <= proof.puzzles.length &&
      !opened.has(index),
  )
}

function recomputeFold(
  params: LhtlpParams,
  proof: VtdProof,
  subset: readonly number[],
): LhtlpPuzzle | null {
  try {
    return foldTimedCommitmentPuzzles(params, proof, subset)
  } catch {
    return null
  }
}

function recoveredScalarCommitment(
  recoveredScalar: Uint8Array,
): Uint8Array | null {
  try {
    return scalarCommitment(bytesToBigInt(recoveredScalar))
  } catch {
    return null
  }
}

// verifyVtd ties this to the pinned H_s and rejects a blanked cut-and-choose.
// Neither it nor the fold below proves t squarings elapsed: only a VDF proof would.
function checkTimedCommitmentProof(
  params: LhtlpParams,
  proof: VtdProof,
  hS: Uint8Array,
  profile: VtdProfile,
): string | null {
  const vtdReason = verifyVtd(params, proof, { hS, profile })
  if (vtdReason !== null) {
    return `timed-commitment proof failed verification: ${vtdReason}`
  }
  return bytesEqual(proof.commitments.a[0], hS)
    ? null
    : 'solution proof commitment root does not match the published H_s'
}

function checkFoldAndScalar(
  params: LhtlpParams,
  solutionProof: TimedCommitmentSolutionProof,
): string | null {
  if (!isWellFormedSubset(solutionProof.subset, solutionProof.proof)) {
    return 'solution proof subset is not a valid set of unopened puzzle indices'
  }
  const refolded = recomputeFold(
    params,
    solutionProof.proof,
    solutionProof.subset,
  )
  if (
    refolded === null ||
    refolded.u !== solutionProof.foldedPuzzle.u ||
    refolded.v !== solutionProof.foldedPuzzle.v
  ) {
    return 'solution proof fold does not recompute from the published puzzles'
  }
  const commitment = recoveredScalarCommitment(solutionProof.recoveredScalar)
  if (commitment === null) {
    return 'solution proof recovered scalar is out of range for the scalar field'
  }
  return bytesEqual(commitment, solutionProof.hS)
    ? null
    : 'solution proof recovered scalar does not match the published H_s'
}

// Without this the solution proof is self-consistent and account-free: a
// proof for any secret the adversary chooses verifies against the victim's
// authorization. H_s must be the one the named enrollment published.
// The record must be one the log published, not one the bundle asserts.
function checkEnrollmentLeaf(bundle: EvidenceBundleV1): string | null {
  // Verified under signedHead, NOT the closing head. An earlier leaf is
  // covered by every later head, and signedHead is the only one the anchor
  // and the consistency proof bind. The closing head carries neither.
  const { enrollmentLeaf, enrollmentRecord } = bundle
  const head = bundle.signedHead
  if (enrollmentLeaf.leaf_type !== 'ENROLLMENT_ACCEPTED') {
    return 'enrollment leaf is not an ENROLLMENT_ACCEPTED leaf'
  }
  if (
    !bytesEqual(
      enrollmentLeaf.authorization_hash,
      hashEnrollmentRecordV1(enrollmentRecord),
    )
  ) {
    return 'enrollment leaf does not commit the record the bundle names'
  }
  if (bundle.enrollmentInclusionProof.length > MAX_PROOF_LENGTH) {
    return 'enrollment inclusion proof is implausibly long'
  }
  const included = verifyInclusion(
    encodeLogLeafV1(enrollmentLeaf),
    bundle.enrollmentLeafIndex,
    head.tree_size,
    [...bundle.enrollmentInclusionProof],
    head.root_hash,
  )
  return included
    ? null
    : 'enrollment leaf is not included under the signed head'
}

// Spec 5.5C gives the emergency track its own authorization path. That is worth
// nothing if both tracks lock the same secret under the same randomness.
function checkTrackSeparation(record: EnrollmentRecordV1): string | null {
  const standard = record.timed_commitment_proof.standard
  const emergency = record.timed_commitment_proof.emergency
  if (!standard || !emergency) return null
  if (bytesEqual(standard.nonce, emergency.nonce)) {
    return 'both tracks reuse one timed-commitment nonce'
  }
  if (bytesEqual(standard.commitments.a[0], emergency.commitments.a[0])) {
    return 'both tracks lock the same secret'
  }
  const se = record.escrow_ciphertext_standard
  const ee = record.escrow_ciphertext_emergency
  if (bytesEqual(se.nonce, ee.nonce)) {
    return 'both tracks reuse one escrow nonce'
  }
  return bytesEqual(se.u, ee.u) ? 'both tracks reuse one encapsulation' : null
}

function checkEnrollmentBinding(
  bundle: EvidenceBundleV1,
  solutionProof: TimedCommitmentSolutionProof,
): string | null {
  const { enrollmentRecord, authorization } = bundle
  const recordHash = hashEnrollmentRecordV1(enrollmentRecord)
  if (!bytesEqual(recordHash, bundle.enrollmentRecordHash)) {
    return 'enrollment record does not match the declared record hash'
  }
  // The operator chooses what the log publishes, so a published leaf alone
  // proves nothing. This hash rides hashUnsealAuthorizationV1, which both HSM
  // gates sign, so it is the one binding the operator cannot mint after the fact.
  if (!bytesEqual(recordHash, authorization.enrollment_record_hash)) {
    return 'enrollment record is not the one this authorization was issued against'
  }
  if (!bytesEqual(enrollmentRecord.account_id, authorization.account_id)) {
    return 'enrollment record is for another account'
  }
  if (
    !bytesEqual(enrollmentRecord.enrollment_id, authorization.enrollment_id)
  ) {
    return 'enrollment record is for another enrollment'
  }
  const leafIssue = checkEnrollmentLeaf(bundle)
  if (leafIssue) return leafIssue
  if (enrollmentRecord.escrow_epoch !== authorization.escrow_epoch) {
    return 'enrollment record names another escrow epoch'
  }
  // The HSMs sign auth.ciphertext_hash, so recomputing it from the record is
  // what ties the named record to the ciphertext the gates actually opened.
  const escrow = escrowCiphertextForTrack(enrollmentRecord, solutionProof.track)
  if (
    !bytesEqual(
      escrowCiphertextHash(escrow.u, escrow.nonce, escrow.ciphertext),
      authorization.ciphertext_hash,
    )
  ) {
    return 'enrollment record does not carry the ciphertext this authorization opened'
  }
  // ROW 10. The two tracks must not share a secret or a nonce. Sharing either
  // means one recovered secret opens both, so the emergency track's separate
  // authorization buys nothing.
  const separation = checkTrackSeparation(enrollmentRecord)
  if (separation) return separation
  const published = enrollmentRecord.timed_commitment_proof[solutionProof.track]
  if (!published) {
    return 'enrollment record publishes no proof for this track'
  }
  return bytesEqual(published.commitments.a[0], solutionProof.hS)
    ? null
    : 'solution proof H_s is not the commitment this enrollment published'
}

function checkSolutionProof(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  const { solutionProof, authorization } = bundle
  if (solutionProof === null) {
    return 'no timed-commitment solution proof is present'
  }
  if (solutionProof.track !== authorization.track) {
    return 'solution proof track does not match the authorization'
  }
  if (bundle.enrollmentRecordHash.length !== 32) {
    return 'enrollment record hash must be a 32-byte digest'
  }
  const binding = checkEnrollmentBinding(bundle, solutionProof)
  if (binding) return binding
  return (
    checkTimedCommitmentProof(
      keys.delayParams,
      solutionProof.proof,
      solutionProof.hS,
      keys.expectedVtdProfile,
    ) ?? checkFoldAndScalar(keys.delayParams, solutionProof)
  )
}

export function commitDecryptionResult(
  resultBytes: Uint8Array,
  opening: Uint8Array,
): Uint8Array {
  return dhash('sige/evidence/decryption-result', resultBytes, opening)
}

export function verifyDecryptionResultOpening(
  commitment: Uint8Array,
  resultBytes: Uint8Array,
  opening: Uint8Array,
): boolean {
  return bytesEqual(commitDecryptionResult(resultBytes, opening), commitment)
}

function checkDecryptionCommitment(bundle: EvidenceBundleV1): string | null {
  return bundle.decryptionResultCommitment.length === 32
    ? null
    : 'decryption result commitment must be a 32-byte digest'
}

export function solutionProofCommitment(
  solutionProof: TimedCommitmentSolutionProof,
): Uint8Array {
  return dhash(
    'sige/evidence/solution-proof-commitment',
    utf8(solutionProof.track),
    solutionProof.hS,
    bigIntToBytes(solutionProof.foldedPuzzle.u),
    bigIntToBytes(solutionProof.foldedPuzzle.v),
    solutionProof.recoveredScalar,
  )
}

function closingLeafV1Cbor(leaf: ClosingLeafV1): CborValue {
  return new Map<string, CborValue>([
    ['unseal_leaf_hash', leaf.unsealLeafHash],
    ['anchor_hash', leaf.anchorHash],
    ['solution_proof_commitment', leaf.solutionProofCommitment],
    ['decryption_result_commitment', leaf.decryptionResultCommitment],
    ['ceremony_transcript_hash', leaf.ceremonyTranscriptHash],
    ['closed_at', BigInt(leaf.closedAt)],
  ])
}

const CLOSING_LEAF_KEYS = new Set([
  'unseal_leaf_hash',
  'anchor_hash',
  'solution_proof_commitment',
  'decryption_result_commitment',
  'ceremony_transcript_hash',
  'closed_at',
])

// A transparency report needs to tell a closing leaf apart from a corrupt one.
// Without this every completed ceremony raised the unparsable count by one.
export function decodeClosingLeafV1(bytes: Uint8Array): true | null {
  const decoded = decodeCbor(bytes)
  if (!decoded.ok) return null
  const map = strictCborMap(decoded.value, CLOSING_LEAF_KEYS)
  if (map === null) return null
  return map.size === CLOSING_LEAF_KEYS.size ? true : null
}

export function encodeClosingLeafV1(leaf: ClosingLeafV1): Uint8Array {
  return encodeCbor(closingLeafV1Cbor(leaf))
}

function checkClosingLeafBinding(bundle: EvidenceBundleV1): string | null {
  const {
    closingLeaf,
    logLeaf,
    bitcoinAnchor,
    decryptionResultCommitment,
    solutionProof,
  } = bundle
  if (solutionProof === null) {
    return 'closing leaf needs a timed-commitment solution proof to bind'
  }
  if (
    !bytesEqual(closingLeaf.unsealLeafHash, leafHash(encodeLogLeafV1(logLeaf)))
  ) {
    return 'closing leaf does not reference this unseal leaf'
  }
  if (!bytesEqual(closingLeaf.anchorHash, hashBitcoinAnchorV1(bitcoinAnchor))) {
    return 'closing leaf does not reference this bitcoin anchor'
  }
  if (
    !bytesEqual(
      closingLeaf.solutionProofCommitment,
      solutionProofCommitment(solutionProof),
    )
  ) {
    return 'closing leaf does not commit this timed-commitment solution proof'
  }
  if (
    !bytesEqual(
      closingLeaf.decryptionResultCommitment,
      decryptionResultCommitment,
    )
  ) {
    return 'closing leaf does not commit the same decryption result'
  }
  if (
    !bytesEqual(
      closingLeaf.ceremonyTranscriptHash,
      bundle.ceremonyTranscript.finalHash,
    )
  ) {
    return 'closing leaf does not commit this ceremony transcript'
  }
  return closingLeaf.closedAt >= logLeaf.created_at
    ? null
    : 'closing leaf claims to close before the unseal leaf was created'
}

// ROW 8. The head signature covers the size and the root and nothing else, so
// every other field on all three heads is free. Two byte-distinct bundles used
// to earn one verdict, which means the bundle digest is not ceremony identity.
const HEAD_IDENTITY: readonly [
  string,
  (a: SignedTreeHeadV1, b: SignedTreeHeadV1) => boolean,
][] = [
  [
    'names a different log than the signed head',
    (a, b) => a.tree_id === b.tree_id,
  ],
  [
    'names a different log key than the signed head',
    (a, b) => a.log_key_id === b.log_key_id,
  ],
  [
    'declares a different schema version',
    (a, b) => a.schema_version === b.schema_version,
  ],
  [
    'names a different network',
    (a, b) => bytesEqual(a.network_id, b.network_id),
  ],
]

function headIdentityMismatch(
  head: SignedTreeHeadV1,
  other: SignedTreeHeadV1,
): string | null {
  const failed = HEAD_IDENTITY.find(([, agrees]) => !agrees(head, other))
  return failed ? failed[0] : null
}

function checkHeadFieldAgreement(bundle: EvidenceBundleV1): string | null {
  const {
    signedHead: head,
    previousSignedHead: prev,
    closingSignedHead,
  } = bundle
  for (const [name, other] of [
    ['previous', prev],
    ['closing', closingSignedHead],
  ] as const) {
    const mismatch = headIdentityMismatch(head, other)
    if (mismatch) return `${name} head ${mismatch}`
  }
  // The three timestamps are outside headMessage and outside every HSM
  // pre-image, so one operator authors all three and picks a consistent
  // triple. An ordering test constrains him against himself. Stated in the
  // CLAIMS known gaps instead of pretended here.
  return null
}

function checkClosingLeafInclusion(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  if (bundle.closingInclusionProof.length > MAX_PROOF_LENGTH) {
    return 'closing inclusion proof is implausibly long'
  }
  const included = verifyInclusion(
    encodeClosingLeafV1(bundle.closingLeaf),
    bundle.closingLeafIndex,
    bundle.closingSignedHead.tree_size,
    [...bundle.closingInclusionProof],
    bundle.closingSignedHead.root_hash,
  )
  if (!included) {
    return 'closing leaf is not included under the presented closing tree head'
  }
  if (!checkSignedHead(bundle.closingSignedHead, keys.logPublicKey)) {
    return 'closing signed head does not verify against the pinned log key'
  }
  if (bundle.closingSignedHead.tree_size < bundle.signedHead.tree_size) {
    return 'closing tree head is not later than the unseal tree head'
  }
  if (bundle.closingConsistencyProof.length > MAX_PROOF_LENGTH) {
    return 'closing consistency proof is implausibly long'
  }
  return verifyConsistency(
    coreSignedTreeHead(bundle.signedHead),
    coreSignedTreeHead(bundle.closingSignedHead),
    [...bundle.closingConsistencyProof],
  )
    ? null
    : 'closing head is not a consistent extension of the unseal head'
}

function checkClosingLeaf(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  return (
    checkHeadFieldAgreement(bundle) ??
    checkClosingLeafBinding(bundle) ??
    checkClosingLeafInclusion(bundle, keys)
  )
}

const CEREMONY_STEP_LABELS = [
  'authorization-published',
  'warrant-gate-released',
  'log-gate-released',
  'timed-commitment-solved',
  'decryption-completed',
] as const

type CeremonyStepLabel = (typeof CEREMONY_STEP_LABELS)[number]

type CeremonyInputs = {
  authorization: UnsealAuthorizationV1
  warrantAttestation: HsmAttestation
  logAttestation: HsmAttestation
  solutionProof: TimedCommitmentSolutionProof
  decryptionResultCommitment: Uint8Array
}

function timedCommitmentSolvedCommitment(
  solutionProof: TimedCommitmentSolutionProof,
): Uint8Array {
  return dhash(
    'sige/evidence/timed-commitment-solved',
    bigIntToBytes(solutionProof.foldedPuzzle.u),
    bigIntToBytes(solutionProof.foldedPuzzle.v),
    solutionProof.recoveredScalar,
  )
}

const CEREMONY_STEP_COMMITMENTS: Record<
  CeremonyStepLabel,
  (inputs: CeremonyInputs) => Uint8Array
> = {
  'authorization-published': (inputs) =>
    hashUnsealAuthorizationV1(inputs.authorization),
  'warrant-gate-released': (inputs) => inputs.warrantAttestation.message,
  'log-gate-released': (inputs) => inputs.logAttestation.message,
  'timed-commitment-solved': (inputs) =>
    timedCommitmentSolvedCommitment(inputs.solutionProof),
  'decryption-completed': (inputs) => inputs.decryptionResultCommitment,
}

function expectedCeremonySteps(inputs: CeremonyInputs): CeremonyStep[] {
  return CEREMONY_STEP_LABELS.map((label) => ({
    label,
    commitment: CEREMONY_STEP_COMMITMENTS[label](inputs),
  }))
}

const CEREMONY_GENESIS = dhash('sige/evidence/ceremony-genesis')

function ceremonyChainHash(steps: readonly CeremonyStep[]): Uint8Array {
  return steps.reduce(
    (chain, step) =>
      dhash(
        'sige/evidence/ceremony-step',
        chain,
        utf8(step.label),
        step.commitment,
      ),
    CEREMONY_GENESIS,
  )
}

export function buildCeremonyTranscript(
  inputs: CeremonyInputs,
): CeremonyTranscriptV1 {
  const steps = expectedCeremonySteps(inputs)
  return { steps, finalHash: ceremonyChainHash(steps) }
}

function stepsMatch(
  actual: readonly CeremonyStep[],
  expected: readonly CeremonyStep[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every(
      (step, i) =>
        step.label === expected[i].label &&
        bytesEqual(step.commitment, expected[i].commitment),
    )
  )
}

function checkCeremonyTranscript(bundle: EvidenceBundleV1): string | null {
  const { solutionProof } = bundle
  if (solutionProof === null) {
    return 'ceremony transcript needs a timed-commitment solution proof'
  }
  if (bundle.ceremonyTranscript.steps.length > CEREMONY_STEP_LABELS.length) {
    return 'ceremony transcript has more steps than expected'
  }
  const expected = expectedCeremonySteps({
    authorization: bundle.authorization,
    warrantAttestation: bundle.warrantAttestation,
    logAttestation: bundle.logAttestation,
    solutionProof,
    decryptionResultCommitment: bundle.decryptionResultCommitment,
  })
  if (!stepsMatch(bundle.ceremonyTranscript.steps, expected)) {
    return 'ceremony transcript steps do not match the rest of the bundle'
  }
  const finalHash = ceremonyChainHash(bundle.ceremonyTranscript.steps)
  return bytesEqual(finalHash, bundle.ceremonyTranscript.finalHash)
    ? null
    : 'ceremony transcript final hash does not match its own steps'
}

// The authorization's own legal predicates. Their values are covered by the
// authorization hash, so they cannot be altered after the fact, but an
// offline auditor still needs a verdict on whether they were satisfied.
function checkAuthorizationPredicates(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  const { authorization: auth, logLeaf: leaf } = bundle
  const approvals = countVerifiedApprovals(auth, keys.reviewerKeys)
  if (approvals < keys.minReviewerApprovals) {
    return `authorization carries ${approvals} verified reviewer approvals, policy requires ${keys.minReviewerApprovals}`
  }
  if (auth.expires_at <= leaf.created_at) {
    return 'authorization had already expired when the leaf was created'
  }
  if (auth.requested_attribute_scope.length === 0) {
    return 'authorization requests no attribute scope'
  }
  if (auth.legal_basis_code.length === 0) {
    return 'authorization names no legal basis'
  }
  return null
}

function runEvidenceChecks(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  return (
    checkOrderSignatureEvidence(bundle, keys) ??
    checkAuthorizationPredicates(bundle, keys) ??
    checkLeafBinding(bundle) ??
    checkInclusion(bundle) ??
    checkHead(bundle, keys) ??
    checkConsistency(bundle, keys) ??
    checkAnchor(bundle, keys) ??
    checkCongestion(bundle, keys) ??
    checkAttestation('warrant', bundle, keys.warrantHsmPublicKey) ??
    checkAttestation('log', bundle, keys.logHsmPublicKey) ??
    checkSolutionProof(bundle, keys) ??
    checkDecryptionCommitment(bundle) ??
    checkClosingLeaf(bundle, keys) ??
    checkCeremonyTranscript(bundle)
  )
}

// `instanceof` walks the prototype chain, so a Proxy with a throwing
// getPrototypeOf trap escapes any try that does not enclose the test itself.
function describeError(error: unknown): string {
  try {
    return error instanceof Error ? error.message : String(error)
  } catch {
    return 'unrecognized error shape'
  }
}

export function verifyEvidenceBundle(
  bundle: EvidenceBundleV1,
  keys: EvidencePublicKeys,
): string | null {
  try {
    return runEvidenceChecks(bundle, keys)
  } catch (error) {
    return `evidence bundle is malformed: ${describeError(error)}`
  }
}

export const EVIDENCE_BUNDLE_V1_TYPE_URL = 'sige.demo/records/EvidenceBundleV1'

function vtdProfileCborLocal(profile: VtdProfile): CborValue {
  return new Map<string, CborValue>([
    ['n', BigInt(profile.n)],
    ['k', BigInt(profile.k)],
    ['o', BigInt(profile.o)],
  ])
}

function lhtlpPuzzleCborLocal(puzzle: LhtlpPuzzle): CborValue {
  return new Map<string, CborValue>([
    ['u', bigIntToBytes(puzzle.u)],
    ['v', bigIntToBytes(puzzle.v)],
  ])
}

function vtdProofCborLocal(proof: VtdProof): CborValue {
  return new Map<string, CborValue>([
    ['profile', vtdProfileCborLocal(proof.profile)],
    ['nonce', proof.nonce],
    ['commitments', new Map<string, CborValue>([['a', proof.commitments.a]])],
    ['puzzles', proof.puzzles.map(lhtlpPuzzleCborLocal)],
    [
      'opened',
      proof.opened.map(
        (entry) =>
          new Map<string, CborValue>([
            ['index', BigInt(entry.index)],
            ['share', bigIntToBytes(entry.share)],
            ['blinding', bigIntToBytes(entry.blinding)],
          ]),
      ),
    ],
  ])
}

function redactedOrderSignatureEvidenceCbor(
  evidence: RedactedOrderSignatureEvidence,
): CborValue {
  return new Map<string, CborValue>([
    ['order_document_hash', evidence.orderDocumentHash],
    ['issuing_role', evidence.issuingRole],
    ['signature', evidence.signature],
  ])
}

function hsmAttestationCbor(attestation: HsmAttestation): CborValue {
  return new Map<string, CborValue>([
    ['gate', attestation.gate],
    ['message', attestation.message],
    ['signature', attestation.signature],
  ])
}

function congestionScheduleEvidenceCbor(
  evidence: CongestionScheduleEvidence,
): CborValue {
  return new Map<string, CborValue>([
    [
      'stamp',
      new Map<string, CborValue>([
        ['output', evidence.stamp.output],
        ['difficulty', BigInt(evidence.stamp.difficulty)],
      ]),
    ],
    ['previous_stamp_output', evidence.previousStampOutput],
  ])
}

function timedCommitmentSolutionProofCbor(
  proof: TimedCommitmentSolutionProof,
): CborValue {
  return new Map<string, CborValue>([
    ['track', proof.track],
    ['proof', vtdProofCborLocal(proof.proof)],
    ['h_s', proof.hS],
    ['subset', proof.subset.map((index) => BigInt(index))],
    ['folded_puzzle', lhtlpPuzzleCborLocal(proof.foldedPuzzle)],
    ['recovered_scalar', proof.recoveredScalar],
  ])
}

function ceremonyStepCbor(step: CeremonyStep): CborValue {
  return new Map<string, CborValue>([
    ['label', step.label],
    ['commitment', step.commitment],
  ])
}

function ceremonyTranscriptV1Cbor(transcript: CeremonyTranscriptV1): CborValue {
  return new Map<string, CborValue>([
    ['steps', transcript.steps.map(ceremonyStepCbor)],
    ['final_hash', transcript.finalHash],
  ])
}

export function evidenceBundleV1Cbor(bundle: EvidenceBundleV1): CborValue {
  return new Map<string, CborValue>([
    ['authorization', unsealAuthorizationV1Cbor(bundle.authorization)],
    [
      'order_signature_evidence',
      redactedOrderSignatureEvidenceCbor(bundle.orderSignatureEvidence),
    ],
    ['log_leaf', logLeafV1Cbor(bundle.logLeaf)],
    ['leaf_index', BigInt(bundle.leafIndex)],
    ['inclusion_proof', [...bundle.inclusionProof]],
    ['signed_head', signedTreeHeadV1Cbor(bundle.signedHead)],
    ['previous_signed_head', signedTreeHeadV1Cbor(bundle.previousSignedHead)],
    ['consistency_proof', [...bundle.consistencyProof]],
    ['bitcoin_anchor', bitcoinAnchorV1Cbor(bundle.bitcoinAnchor)],
    [
      'congestion_evidence',
      congestionScheduleEvidenceCbor(bundle.congestionEvidence),
    ],
    ['warrant_attestation', hsmAttestationCbor(bundle.warrantAttestation)],
    ['log_attestation', hsmAttestationCbor(bundle.logAttestation)],
    [
      'solution_proof',
      bundle.solutionProof === null
        ? null
        : timedCommitmentSolutionProofCbor(bundle.solutionProof),
    ],
    ['enrollment_record', enrollmentRecordV1Cbor(bundle.enrollmentRecord)],
    ['enrollment_record_hash', bundle.enrollmentRecordHash],
    ['enrollment_leaf', logLeafV1Cbor(bundle.enrollmentLeaf)],
    ['enrollment_leaf_index', BigInt(bundle.enrollmentLeafIndex)],
    ['enrollment_inclusion_proof', [...bundle.enrollmentInclusionProof]],
    ['decryption_result_commitment', bundle.decryptionResultCommitment],
    [
      'ceremony_transcript',
      ceremonyTranscriptV1Cbor(bundle.ceremonyTranscript),
    ],
    ['closing_leaf', closingLeafV1Cbor(bundle.closingLeaf)],
    ['closing_leaf_index', BigInt(bundle.closingLeafIndex)],
    ['closing_inclusion_proof', [...bundle.closingInclusionProof]],
    ['closing_signed_head', signedTreeHeadV1Cbor(bundle.closingSignedHead)],
    ['closing_consistency_proof', [...bundle.closingConsistencyProof]],
  ])
}

export function encodeEvidenceBundleV1(bundle: EvidenceBundleV1): Uint8Array {
  return encodeCbor(evidenceBundleV1Cbor(bundle))
}

export function hashEvidenceBundleV1(bundle: EvidenceBundleV1): Uint8Array {
  return objectHash(EVIDENCE_BUNDLE_V1_TYPE_URL, evidenceBundleV1Cbor(bundle))
}
