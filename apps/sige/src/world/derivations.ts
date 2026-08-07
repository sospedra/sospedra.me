import { injectiveNumber, safeBigIntToBytes, utf8 } from '../core/bytes.ts'
import { type CborValue, encodeCbor } from '../core/cbor.ts'
import { dhash, kdf } from '../core/hash.ts'
import { objectHash } from '../core/object-hash.ts'
import type { VtdProof } from '../core/vtd.ts'
import { vtdProofCbor } from '../core/vtd-cbor.ts'
import type { Track } from './records.ts'

// The single home for every derivation that both the enrollment verifier and
// the world compute. Two implementations of one derivation drift, and the
// drift is silent until a record fails to reconstruct.

const INVISIBLE_CODE_POINTS: ReadonlySet<number> = new Set([
  0x00ad, 0x180e, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b,
  0x202c, 0x202d, 0x202e, 0x2028, 0x2029, 0x2060, 0x3164, 0xfeff,
])

function isStrippable(codePoint: number): boolean {
  if (codePoint < 0x20 || codePoint === 0x7f) return true
  return INVISIBLE_CODE_POINTS.has(codePoint)
}

// Spec 7.4 wants one nullifier per document, but merging two DIFFERENT
// documents is far worse than over-counting one. So this uses NFC, which only
// unifies sequences that already are the same character, never NFKC or case
// folding: those fold Turkish dotless i, final sigma and ligatures together.
export class AmbiguousDocumentIdError extends Error {}

function hasLoneSurrogate(raw: string): boolean {
  for (let i = 0; i < raw.length; i++) {
    const unit = raw.charCodeAt(i)
    if (unit < 0xd800 || unit > 0xdfff) continue
    const paired =
      unit < 0xdc00 &&
      i + 1 < raw.length &&
      raw.charCodeAt(i + 1) >= 0xdc00 &&
      raw.charCodeAt(i + 1) <= 0xdfff
    if (!paired) return true
    i++
  }
  return false
}

export function canonicalizeDocumentIssuanceId(raw: string): string {
  // utf8() maps every lone surrogate to U+FFFD, which would merge them.
  if (hasLoneSurrogate(raw)) {
    throw new AmbiguousDocumentIdError(
      'document issuance id contains a lone surrogate',
    )
  }
  const kept = [...raw.normalize('NFC')].filter((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint !== undefined && !isStrippable(codePoint)
  })
  const canonical = kept.join('').trim()
  if (canonical.length === 0) {
    throw new AmbiguousDocumentIdError('document issuance id is empty')
  }
  return canonical
}

export function documentNullifier(
  networkId: Uint8Array,
  documentIssuanceId: string,
): Uint8Array {
  return dhash(
    'sige/v1/nullifier',
    networkId,
    utf8(canonicalizeDocumentIssuanceId(documentIssuanceId)),
  )
}

// Boundary form: an ambiguous id is a refusal, never an exception.
export function tryDocumentNullifier(
  networkId: Uint8Array,
  documentIssuanceId: string,
): Uint8Array | null {
  try {
    return documentNullifier(networkId, documentIssuanceId)
  } catch {
    return null
  }
}

export type TranscriptInputs = {
  networkId: Uint8Array
  accountId: Uint8Array
  accountPublicKey: Uint8Array
  enrollmentId: Uint8Array
  serverNonce: Uint8Array
  clientNonce: Uint8Array
  policyId: string
  trustSnapshotId: string
  escrowEpoch: number
  delayProfileId: string
}

export function transcriptHash(inputs: TranscriptInputs): Uint8Array {
  return dhash(
    'sige/v1/transcript',
    inputs.networkId,
    inputs.accountId,
    inputs.accountPublicKey,
    inputs.enrollmentId,
    inputs.serverNonce,
    inputs.clientNonce,
    utf8(inputs.policyId),
    utf8(inputs.trustSnapshotId),
    injectiveNumber(inputs.escrowEpoch),
    utf8(inputs.delayProfileId),
  )
}

export type NormalizedIdentityAttributes = {
  fullLegalName: string
  dateOfBirth: string
  documentNumber: string
}

export const IDENTITY_ATTRIBUTE_NAMES = [
  'fullLegalName',
  'dateOfBirth',
  'documentNumber',
] as const satisfies readonly (keyof NormalizedIdentityAttributes)[]

// One encoding of the attributes. The verifier framed them and the world
// CBOR-encoded them, so the same person hashed to two commitments.
export function identityAttrsCborMap(
  attrs: NormalizedIdentityAttributes,
): CborValue {
  return new Map<string, CborValue>([
    ['fullLegalName', attrs.fullLegalName],
    ['dateOfBirth', attrs.dateOfBirth],
    ['documentNumber', attrs.documentNumber],
  ])
}

export function encodeIdentityAttrs(
  attrs: NormalizedIdentityAttributes,
): Uint8Array {
  return encodeCbor(identityAttrsCborMap(attrs))
}

export function encodeInnerPayload(
  attrs: NormalizedIdentityAttributes,
  opening: Uint8Array,
): Uint8Array {
  return encodeCbor(
    new Map<string, CborValue>([
      ['attrs', identityAttrsCborMap(attrs)],
      ['opening', opening],
    ]),
  )
}

export function identityCommitment(
  encodedAttrs: Uint8Array,
  accountPublicKey: Uint8Array,
  opening: Uint8Array,
): Uint8Array {
  return dhash(
    'sige/v1/identity-commitment',
    encodedAttrs,
    accountPublicKey,
    opening,
  )
}

export function credentialAttestedAttrsHash(
  encodedAttrs: Uint8Array,
): Uint8Array {
  return dhash('sige/v1/credential-attrs', encodedAttrs)
}

export function innerAd(
  accountId: Uint8Array,
  enrollmentId: Uint8Array,
): Uint8Array {
  return dhash('sige/v1/inner-ad', accountId, enrollmentId)
}

// The public unseal leaf names the account only through this commitment. The
// ceremony builds it and a later Disclosure opens it, so it lives here.
export function accountCommitment(
  accountId: Uint8Array,
  blinding: Uint8Array,
): Uint8Array {
  return dhash('sige/v1/account-commitment', accountId, blinding)
}

export function caseReferenceCommitment(
  caseReference: string,
  salt: Uint8Array,
): Uint8Array {
  return dhash('sige/v1/case-reference', utf8(caseReference), salt)
}

export function mappingExplanationCommitment(
  explanation: string,
  salt: Uint8Array,
): Uint8Array {
  return dhash('sige/v1/mapping-explanation', utf8(explanation), salt)
}

export function innerKey(secret: bigint): Uint8Array {
  return kdf(
    safeBigIntToBytes(secret),
    new Uint8Array(0),
    utf8('sige/v1/inner-aead'),
  )
}

export const ENVELOPE_SCHEMA_VERSION = 1
export const DELAY_PROFILE_ID = 'sige-demo-delay/v1'

export type DelayedIdentityEnvelopeV1 = {
  schemaVersion: number
  delayProfileId: string
  t: number
  hS: Uint8Array
  proof: VtdProof
  innerNonce: Uint8Array
  innerCiphertext: Uint8Array
}

export function delayedIdentityEnvelopeCbor(
  env: DelayedIdentityEnvelopeV1,
): CborValue {
  return new Map<string, CborValue>([
    ['schemaVersion', BigInt(env.schemaVersion)],
    ['delayProfileId', env.delayProfileId],
    ['t', BigInt(env.t)],
    ['hS', env.hS],
    ['proof', vtdProofCbor(env.proof)],
    ['innerNonce', env.innerNonce],
    ['innerCiphertext', env.innerCiphertext],
  ])
}

export function encodeEnvelope(env: DelayedIdentityEnvelopeV1): Uint8Array {
  return encodeCbor(delayedIdentityEnvelopeCbor(env))
}

export function escrowCiphertextHash(
  u: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  return dhash('ciphertext', u, nonce, ciphertext)
}

export type EscrowBinding = {
  networkId: Uint8Array
  accountId: Uint8Array
  accountPublicKey: Uint8Array
  enrollmentId: Uint8Array
  escrowEpoch: number
  track: Track
}

const TYPE_URL_ESCROW_BINDING = 'sige.demo/EscrowBindingV1'

// The track separator is load-bearing: without it one gate release opens both
// tracks, because the gate identities are shared across them.
export function escrowContext(binding: EscrowBinding): Uint8Array {
  const map = new Map<string, CborValue>([
    ['network_id', binding.networkId],
    ['account_id', binding.accountId],
    ['account_public_key', binding.accountPublicKey],
    ['enrollment_id', binding.enrollmentId],
    ['escrow_epoch', BigInt(binding.escrowEpoch)],
    ['track', binding.track],
  ])
  return objectHash(TYPE_URL_ESCROW_BINDING, map)
}
