import type { Anchor } from '../core/chain.ts'
import type { LhtlpParams } from '../core/lhtlp.ts'
import { leafHash } from '../core/merkle.ts'
import type { VtdProof } from '../core/vtd.ts'
import type {
  CeremonyTranscriptV1,
  ClosingLeafV1,
  CongestionScheduleEvidence,
  EvidenceBundleV1,
  HsmAttestation,
  RedactedOrderSignatureEvidence,
  TimedCommitmentSolutionProof,
} from './evidence.ts'
import {
  buildCeremonyTranscript,
  buildTimedCommitmentSolutionProof,
  solutionProofCommitment,
  unopenedPuzzleIndices,
} from './evidence.ts'
import type {
  BitcoinAnchorV1,
  EnrollmentRecordV1,
  LogLeafV1,
  SignedTreeHeadV1,
  Track,
} from './records.ts'
import {
  encodeLogLeafV1,
  hashBitcoinAnchorV1,
  hashEnrollmentRecordV1,
} from './records.ts'

// The producer side of spec 6.2.6. Every field here comes from the ceremony
// that just ran, so verifyEvidenceBundle checks real values, never fixtures.

export type PublishedLeaf = {
  leafBytes: Uint8Array
  // Null when a fault injection published bytes that are not a LogLeafV1.
  leaf: LogLeafV1 | null
  blinding: Uint8Array
  leafIndex: number
  inclusionProof: Uint8Array[]
  // Proved at the SAME tree state as `head`, so the enrollment leaf rides the
  // head the anchor and the consistency proof bind.
  enrollmentInclusionProof: Uint8Array[]
  previousHead: SignedTreeHeadV1
  head: SignedTreeHeadV1
  consistencyProof: Uint8Array[]
  anchor: Anchor
  anchorRecord: BitcoinAnchorV1 | null
}

export type SolutionProofInput = {
  params: LhtlpParams
  track: Track
  proof: VtdProof
  hS: Uint8Array
  recoveredScalar: bigint
}

export function buildUnsealSolutionProof(
  input: SolutionProofInput,
): TimedCommitmentSolutionProof | null {
  const { proof } = input
  const subset = unopenedPuzzleIndices(proof).slice(0, proof.profile.k)
  if (subset.length !== proof.profile.k) return null
  try {
    return buildTimedCommitmentSolutionProof({ ...input, subset })
  } catch {
    return null
  }
}

export type ClosingLeafInput = {
  logLeaf: LogLeafV1
  bitcoinAnchor: BitcoinAnchorV1
  solutionProof: TimedCommitmentSolutionProof
  decryptionResultCommitment: Uint8Array
  ceremonyTranscriptHash: Uint8Array
  closedAt: number
}

export function buildClosingLeaf(input: ClosingLeafInput): ClosingLeafV1 {
  return {
    unsealLeafHash: leafHash(encodeLogLeafV1(input.logLeaf)),
    anchorHash: hashBitcoinAnchorV1(input.bitcoinAnchor),
    solutionProofCommitment: solutionProofCommitment(input.solutionProof),
    decryptionResultCommitment: input.decryptionResultCommitment,
    ceremonyTranscriptHash: input.ceremonyTranscriptHash,
    closedAt: input.closedAt,
  }
}

export type ClosingPublication = {
  leaf: ClosingLeafV1
  leafIndex: number
  inclusionProof: Uint8Array[]
  head: SignedTreeHeadV1
  consistencyProof: Uint8Array[]
}

export type EvidenceParts = {
  authorization: EvidenceBundleV1['authorization']
  orderSignatureEvidence: RedactedOrderSignatureEvidence
  logLeaf: LogLeafV1
  leafIndex: number
  inclusionProof: Uint8Array[]
  previousHead: SignedTreeHeadV1
  head: SignedTreeHeadV1
  consistencyProof: Uint8Array[]
  bitcoinAnchor: BitcoinAnchorV1
  congestionEvidence: CongestionScheduleEvidence
  warrantAttestation: HsmAttestation
  logAttestation: HsmAttestation
  solutionProof: TimedCommitmentSolutionProof
  enrollmentRecord: EnrollmentRecordV1
  enrollmentLeaf: LogLeafV1
  enrollmentLeafIndex: number
  enrollmentInclusionProof: Uint8Array[]
  decryptionResultCommitment: Uint8Array
  closing: ClosingPublication
}

function ceremonyTranscriptFor(parts: EvidenceParts): CeremonyTranscriptV1 {
  return buildCeremonyTranscript({
    authorization: parts.authorization,
    warrantAttestation: parts.warrantAttestation,
    logAttestation: parts.logAttestation,
    solutionProof: parts.solutionProof,
    decryptionResultCommitment: parts.decryptionResultCommitment,
  })
}

export function buildUnsealEvidence(parts: EvidenceParts): EvidenceBundleV1 {
  return {
    authorization: parts.authorization,
    orderSignatureEvidence: parts.orderSignatureEvidence,
    logLeaf: parts.logLeaf,
    leafIndex: parts.leafIndex,
    inclusionProof: parts.inclusionProof,
    signedHead: parts.head,
    previousSignedHead: parts.previousHead,
    consistencyProof: parts.consistencyProof,
    bitcoinAnchor: parts.bitcoinAnchor,
    congestionEvidence: parts.congestionEvidence,
    warrantAttestation: parts.warrantAttestation,
    logAttestation: parts.logAttestation,
    solutionProof: parts.solutionProof,
    enrollmentRecord: parts.enrollmentRecord,
    enrollmentRecordHash: hashEnrollmentRecordV1(parts.enrollmentRecord),
    enrollmentLeaf: parts.enrollmentLeaf,
    enrollmentLeafIndex: parts.enrollmentLeafIndex,
    enrollmentInclusionProof: parts.enrollmentInclusionProof,
    decryptionResultCommitment: parts.decryptionResultCommitment,
    ceremonyTranscript: ceremonyTranscriptFor(parts),
    closingLeaf: parts.closing.leaf,
    closingLeafIndex: parts.closing.leafIndex,
    closingInclusionProof: parts.closing.inclusionProof,
    closingSignedHead: parts.closing.head,
    closingConsistencyProof: parts.closing.consistencyProof,
  }
}
