import { bls12_381 } from '@noble/curves/bls12-381.js'
import {
  bytesEqual,
  bytesToBigInt,
  concatBytes,
  randomBytes,
  u32be,
  utf8,
} from './bytes.ts'
import { dhash, kdf } from './hash.ts'

// Two-gate Boneh-Franklin-style IBE KEM (SIGE spec sections 5.2-5.4). CCA-
// hardened via Fujisaki-Okamoto (spec 5.5) only if the plaintext is unguessable.

const G2 = bls12_381.G2.Point
const Fr = bls12_381.fields.Fr
const Fp12 = bls12_381.fields.Fp12

export type Gate = 'warrant' | 'log'

const DST: Record<Gate, string> = {
  warrant: 'SIGE-DEMO-WARRANT-V1',
  log: 'SIGE-DEMO-LOG-V1',
}

const FO_DOMAIN = 'fo-randomness'

export type G2Point = typeof G2.BASE

export type EpochKeys = {
  epoch: number
  xA: bigint // warrant master secret, HSM domain A
  xB: bigint // publication master secret, HSM domain B
  pkA: G2Point
  pkB: G2Point
}

function randomScalar(): bigint {
  for (;;) {
    const s = Fr.create(bytesToBigInt(randomBytes(48)))
    if (s !== 0n) return s
  }
}

export function genEpoch(epoch: number): EpochKeys {
  const xA = randomScalar()
  const xB = randomScalar()
  return {
    epoch,
    xA,
    xB,
    pkA: G2.BASE.multiply(xA),
    pkB: G2.BASE.multiply(xB),
  }
}

// Account-scoped identity string (spec section 5.3). Fixed at enrollment.
export function gateIdentity(
  gate: Gate,
  networkId: Uint8Array,
  accountId: Uint8Array,
  enrollmentId: Uint8Array,
  epoch: number,
): Uint8Array {
  const label = gate === 'warrant' ? 'SIGE/v1/warrant' : 'SIGE/v1/log'
  return concatBytes(
    utf8(label),
    u32be(networkId.length),
    networkId,
    u32be(accountId.length),
    accountId,
    u32be(enrollmentId.length),
    enrollmentId,
    u32be(epoch),
  )
}

function hashToG1(id: Uint8Array, gate: Gate) {
  return bls12_381.G1.hashToCurve(id, { DST: DST[gate] })
}

function gtBytes(z: ReturnType<typeof bls12_381.pairing>): Uint8Array {
  return Fp12.toBytes(z)
}

export type Encapsulation = {
  U: Uint8Array // compressed G2 point
  K: Uint8Array // 32-byte AEAD key
}

export type EncapsulateInput = {
  ids: { warrant: Uint8Array; log: Uint8Array }
  keys: { pkA: G2Point; pkB: G2Point }
  transcriptHash: Uint8Array
  context: Uint8Array
  plaintext: Uint8Array
}

// r derives from the plaintext (spec 5.5), making U a public commitment to it.
// ASSUMED: callers supply >=255 bits of plaintext entropy (world.ts's envelopes do).
function deriveRandomness(
  plaintext: Uint8Array,
  transcriptHash: Uint8Array,
  context: Uint8Array,
): bigint {
  let digest = dhash(FO_DOMAIN, plaintext, transcriptHash, context)
  for (;;) {
    const r = Fr.create(bytesToBigInt(digest))
    if (r !== 0n) return r
    digest = dhash(FO_DOMAIN, digest, transcriptHash, context)
  }
}

// Client side. Concatenated pairing results, never multiplied (spec section 5.4).
export function encapsulate(input: EncapsulateInput): Encapsulation {
  const { ids, keys, transcriptHash, context, plaintext } = input
  const r = deriveRandomness(plaintext, transcriptHash, context)
  const U = G2.BASE.multiply(r)
  const zA = bls12_381.pairing(
    hashToG1(ids.warrant, 'warrant').multiply(r),
    keys.pkA,
  )
  const zB = bls12_381.pairing(hashToG1(ids.log, 'log').multiply(r), keys.pkB)
  const K = kdf(concatBytes(gtBytes(zA), gtBytes(zB)), transcriptHash, context)
  return { U: U.toBytes(true), K }
}

const G2_COMPRESSED_BYTES = G2.BASE.toBytes(true).length

// Spec 5.8: reject a non-canonical field encoding rather than let noble
// reduce it mod p, which would let two distinct byte strings decode to one point.
export function checkEncapsulationPoint(U: Uint8Array): string | null {
  if (U.length !== G2_COMPRESSED_BYTES) {
    return `U must be ${G2_COMPRESSED_BYTES} bytes, got ${U.length}`
  }
  let point: G2Point
  try {
    point = G2.fromBytes(U)
  } catch (error) {
    return `U is not a valid point: ${error instanceof Error ? error.message : String(error)}`
  }
  if (point.is0()) return 'U must not be the identity point'
  if (!bytesEqual(point.toBytes(true), U))
    return 'U is not a canonical point encoding'
  return null
}

// HSM side. Returns a pairing contribution, never a reusable private key (spec section 5.6).
export function deriveContribution(
  gate: Gate,
  id: Uint8Array,
  masterSecret: bigint,
  U: Uint8Array,
): Uint8Array {
  const issue = checkEncapsulationPoint(U)
  if (issue) throw new Error(issue)
  const d = hashToG1(id, gate).multiply(masterSecret)
  return gtBytes(bls12_381.pairing(d, G2.fromBytes(U)))
}

// Ceremony side. K exists only when both contributions are present.
export function combineContributions(
  zA: Uint8Array,
  zB: Uint8Array,
  transcriptHash: Uint8Array,
  context: Uint8Array,
): Uint8Array {
  return kdf(concatBytes(zA, zB), transcriptHash, context)
}

export type ReencapsulationCheck = {
  transcriptHash: Uint8Array
  context: Uint8Array
  plaintext: Uint8Array
  U: Uint8Array
}

// U = r*G2.BASE is a bijection on a prime-order group, and encapsulation is
// deterministic in r: a matching U forces a matching r, and thus a matching K.
export function verifyEncapsulation(input: ReencapsulationCheck): boolean {
  const { transcriptHash, context, plaintext, U } = input
  const r = deriveRandomness(plaintext, transcriptHash, context)
  const expected = G2.BASE.multiply(r).toBytes(true)
  return bytesEqual(expected, U)
}
