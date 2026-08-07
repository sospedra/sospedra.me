import { ed25519 } from '@noble/curves/ed25519.js'
import { randomBytes, toHex } from '../core/bytes.ts'
import type { EpochKeys } from '../core/kem.ts'
import type { LhtlpParams } from '../core/lhtlp.ts'
import type { VtdProfile, VtdProof } from '../core/vtd.ts'
import {
  type ActivePolicy,
  computeCredentialAttestedAttrsHash,
  type EnrollmentDependencies,
  type EnrollmentOutcome,
  type EnrollmentStatement,
  type EnrollmentWitness,
  type NormalizedIdentityAttributes,
  SUBMITTER_REFUSAL_MESSAGE,
  type SubmittedEnrollmentPackage,
  verifyEnrollmentSubmission,
} from './enrollment-verifier.ts'
import { TRACKS, type Track } from './records.ts'

// Adapter from the demo world to the spec 7.5/7.7 verifier. Conditions 6-11
// and pi_vtd are checked for real. Conditions 1-5 need a PKI this codebase
// does not have, so the adapter fabricates a credential and says so.

export const PLACEHOLDER_CONDITIONS: readonly string[] = [
  'condition 1: credential chain root is self-issued by this demo, not a real PKI',
  'condition 2: credential type and validity window are asserted, not attested',
  'condition 3: revocation status is a fixture, no revocation list exists',
  'condition 4: the document signature is made by a key this demo just generated',
  'condition 5: normalized attributes are trusted as submitted',
  'condition 11 (expiry half): the adapter mints proofExpirationTime from its own clock, so expiry cannot fire',
  'step 2: enroll() mints the server nonce it submits, so an unissued nonce cannot be detected, only a replayed one',
  'step 3 (delay profile): the submitted t and the pinned delayT come from one operator value, so the comparison is not independent',
]

export type AdapterTrackInput = {
  secret: bigint
  hS: Uint8Array
  proof: VtdProof
  innerNonce: Uint8Array
  innerCiphertext: Uint8Array
  escrowCiphertext: { u: Uint8Array; nonce: Uint8Array; ciphertext: Uint8Array }
}

// What the OPERATOR pins. Reading these from the submission makes step 3
// compare a field to itself, and makes condition 10 prove only that the
// submitter can open its own escrow.
export type OperatorPins = {
  networkId: Uint8Array
  escrowEpoch: number
  epochKeys: EpochKeys
  vtdProfile: VtdProfile
  delayT: number
  delayLhtlpParams: LhtlpParams
}

export type AdapterInput = {
  networkId: Uint8Array
  accountId: Uint8Array
  accountPublicKey: Uint8Array
  enrollmentId: Uint8Array
  serverNonce: Uint8Array
  clientNonce: Uint8Array
  transcriptHash: Uint8Array
  identityCommitment: Uint8Array
  documentNullifier: Uint8Array
  documentIssuanceId: string
  attrs: NormalizedIdentityAttributes
  commitmentOpening: Uint8Array
  escrowEpoch: number
  epochKeys: EpochKeys
  vtdProfile: VtdProfile
  delayT: number
  delayLhtlpParams: LhtlpParams
  tracks: Record<Track, AdapterTrackInput>
  now: number
}

export const DEMO_POLICY_ID = 'sige-demo-policy/v1'
export const DEMO_TRUST_SNAPSHOT_ID = 'sige-demo-trust/v1'
export const DEMO_DELAY_PROFILE_ID = 'sige-demo-delay/v1'
export const DEMO_CREDENTIAL_PROFILE_ID = 'sige-demo-credential/v1'
export const DEMO_CREDENTIAL_TYPE = 'demo-national-id'
export const DEMO_PROOF_SYSTEM_ID = 'none-clear-mode/v1'

// The fabricated credential. It is self-consistent, so conditions 6-11 get a
// real witness to check, and it proves nothing about a real document.
function placeholderCredential(transcriptHash: Uint8Array) {
  const documentKey = ed25519.utils.randomSecretKey()
  return {
    documentPublicKey: ed25519.getPublicKey(documentKey),
    documentSignature: ed25519.sign(transcriptHash, documentKey),
    credentialChainRootHash: randomBytes(32),
  }
}

export function buildActivePolicy(
  pins: OperatorPins,
  acceptedChainRoots: readonly Uint8Array[],
): ActivePolicy {
  return {
    networkId: pins.networkId,
    policyId: DEMO_POLICY_ID,
    trustSnapshotId: DEMO_TRUST_SNAPSHOT_ID,
    acceptedCredentialTypes: [DEMO_CREDENTIAL_TYPE],
    acceptedCredentialProfileIds: [DEMO_CREDENTIAL_PROFILE_ID],
    acceptedChainRoots,
    isDocumentRevoked: () => false,
    escrowEpoch: pins.escrowEpoch,
    epochKeys: pins.epochKeys,
    delayProfileId: DEMO_DELAY_PROFILE_ID,
    proofSystemId: DEMO_PROOF_SYSTEM_ID,
    vtdProfile: pins.vtdProfile,
    delayT: pins.delayT,
    delayLhtlpParams: pins.delayLhtlpParams,
  }
}

function buildStatement(input: AdapterInput): EnrollmentStatement {
  const tracks = {} as EnrollmentStatement['tracks']
  for (const track of TRACKS) {
    const source = input.tracks[track]
    tracks[track] = {
      escrowCiphertext: source.escrowCiphertext,
      hS: source.hS,
      t: input.delayT,
      proof: source.proof,
    }
  }
  return {
    networkId: input.networkId,
    accountId: input.accountId,
    accountPublicKey: input.accountPublicKey,
    enrollmentId: input.enrollmentId,
    serverNonce: input.serverNonce,
    transcriptHash: input.transcriptHash,
    policyId: DEMO_POLICY_ID,
    trustSnapshotId: DEMO_TRUST_SNAPSHOT_ID,
    escrowEpoch: input.escrowEpoch,
    delayProfileId: DEMO_DELAY_PROFILE_ID,
    proofSystemId: DEMO_PROOF_SYSTEM_ID,
    identityCommitment: input.identityCommitment,
    documentNullifier: input.documentNullifier,
    proofExpirationTime: input.now + 3_600_000,
    credentialProfileId: DEMO_CREDENTIAL_PROFILE_ID,
    tracks,
  }
}

function buildWitness(
  input: AdapterInput,
  credential: ReturnType<typeof placeholderCredential>,
): EnrollmentWitness {
  const tracks = {} as EnrollmentWitness['tracks']
  for (const track of TRACKS) {
    const source = input.tracks[track]
    tracks[track] = {
      secret: source.secret,
      innerNonce: source.innerNonce,
      innerCiphertext: source.innerCiphertext,
    }
  }
  return {
    clientNonce: input.clientNonce,
    credentialChainRootHash: credential.credentialChainRootHash,
    credentialType: DEMO_CREDENTIAL_TYPE,
    credentialValidFrom: input.now - 1,
    credentialValidUntil: input.now + 3_600_000,
    documentPublicKey: credential.documentPublicKey,
    documentSignature: credential.documentSignature,
    credentialAttestedAttrsHash: computeCredentialAttestedAttrsHash(
      input.attrs,
    ),
    normalizedAttrs: input.attrs,
    commitmentOpening: input.commitmentOpening,
    documentIssuanceId: input.documentIssuanceId,
    tracks,
  }
}

export type AdapterVerdict = {
  outcome: EnrollmentOutcome
  placeholderConditions: readonly string[]
}

// The adapter dereferences every track before the verifier's own try/catch,
// so a missing track would throw past enroll() instead of refusing by name.
function buildPackage(
  input: AdapterInput,
  credential: ReturnType<typeof placeholderCredential>,
): SubmittedEnrollmentPackage | null {
  try {
    return {
      statement: buildStatement(input),
      witness: buildWitness(input, credential),
    }
  } catch {
    return null
  }
}

export function verifyThroughSpecVerifier(
  input: AdapterInput,
  pins: OperatorPins,
  deps: EnrollmentDependencies,
): AdapterVerdict {
  const credential = placeholderCredential(input.transcriptHash)
  const pkg = buildPackage(input, credential)
  if (pkg === null) {
    return {
      outcome: {
        accepted: false,
        operatorReason: 'submission is missing a required field or track',
        submitterMessage: SUBMITTER_REFUSAL_MESSAGE,
      },
      placeholderConditions: PLACEHOLDER_CONDITIONS,
    }
  }
  const policy = buildActivePolicy(pins, [credential.credentialChainRootHash])
  return {
    outcome: verifyEnrollmentSubmission(pkg, policy, deps),
    placeholderConditions: PLACEHOLDER_CONDITIONS,
  }
}

export function seenNonceDeps(
  seenServerNonces: Set<string>,
  expectedNullifier: Uint8Array,
  now: number,
): EnrollmentDependencies {
  return {
    now: () => now,
    consumeServerNonce: (nonce) => {
      const key = toHex(nonce)
      if (seenServerNonces.has(key)) return false
      seenServerNonces.add(key)
      return true
    },
    // enrollCore already reserved it. Returning the equality check turns this
    // into a cross-check that the verifier derived the same nullifier.
    reserveNullifier: (nullifier) =>
      toHex(nullifier) === toHex(expectedNullifier),
  }
}
