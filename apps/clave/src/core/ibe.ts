// Boneh-Franklin identity-based encryption over BLS12-381.
//
// Paper Equation 1: sk_id = [msk] H_1(id).
//
// Correctness rests on bilinearity. With Q = H_1(id) in G1 and mpk = [msk]P_2:
//   encrypt computes  e([r]Q, mpk)      = e(Q, P_2)^(msk*r)
//   decrypt computes  e([msk]Q, [r]P_2) = e(Q, P_2)^(msk*r)
// Both sides reach the same GT element, so no exponentiation in GT is needed.
//
// The master secret is held by a threshold network in deployment. Here it is a
// single value, because modelling the network's internals proves nothing the
// paper claims. What IS modelled, and tested: no key exists until derive() is
// called, and a key derived for one identity is useless for any other.

import { bls12_381 } from '@noble/curves/bls12-381.js'

import { bytesToBigInt, concatBytes, randomBytes, utf8 } from './bytes.ts'
import { kdf, sha256 } from './hash.ts'

const G1 = bls12_381.G1.Point
const G2 = bls12_381.G2.Point
const Fp12 = bls12_381.fields.Fp12
const Fr = bls12_381.fields.Fr

const DST = 'CLAVE-IBE-BLS12381-G1-v1'

export type MasterKey = { readonly msk: bigint; readonly mpk: Uint8Array }
export type AccountKey = { readonly id: string; readonly sk: Uint8Array }
export type Ciphertext = { readonly u: Uint8Array; readonly v: Uint8Array }

function randomScalar(): bigint {
  for (;;) {
    const x = Fr.create(bytesToBigInt(randomBytes(48)))
    if (x !== 0n) return x
  }
}

export function setup(): MasterKey {
  const msk = randomScalar()
  return { msk, mpk: G2.BASE.multiply(msk).toBytes(true) }
}

function hashToG1(id: string): InstanceType<typeof G1> {
  return bls12_381.G1.hashToCurve(utf8(id), { DST }) as InstanceType<typeof G1>
}

// Equation 1. The only function that consumes the master secret.
export function derive(master: MasterKey, id: string): AccountKey {
  return { id, sk: hashToG1(id).multiply(master.msk).toBytes(true) }
}

function padFrom(shared: ReturnType<typeof bls12_381.pairing>, length: number) {
  const seed = sha256(Fp12.toBytes(shared))
  const out = new Uint8Array(length)
  for (let block = 0; block * 32 < length; block++) {
    const chunk = kdf(seed, utf8(`${DST}/mask`), utf8(String(block)))
    out.set(chunk.subarray(0, Math.min(32, length - block * 32)), block * 32)
  }
  return out
}

function xorInto(message: Uint8Array, pad: Uint8Array): Uint8Array {
  return message.map((byte, i) => byte ^ (pad[i] ?? 0))
}

// Coins are an explicit argument, never sampled inside. The escrow proof opens
// a subset and RECOMPUTES each ciphertext byte for byte (paper Equation 11),
// which is impossible if encryption picks its own randomness.
export function encrypt(
  mpk: Uint8Array,
  id: string,
  message: Uint8Array,
  coins: Uint8Array,
): Ciphertext {
  const r = Fr.create(bytesToBigInt(sha256(concatBytes(utf8(DST), coins))))
  const shared = bls12_381.pairing(hashToG1(id).multiply(r), G2.fromBytes(mpk))
  return {
    u: G2.BASE.multiply(r).toBytes(true),
    v: xorInto(message, padFrom(shared, message.length)),
  }
}

// Returns null on malformed input rather than throwing, because recovery
// decrypts many candidates and must discard failures without unwinding.
// A wrong-but-well-formed key yields bytes that fail the Feldman check, which
// is where paper Equation 12 places the validation.
export function decrypt(key: AccountKey, ct: Ciphertext): Uint8Array | null {
  try {
    const shared = bls12_381.pairing(G1.fromBytes(key.sk), G2.fromBytes(ct.u))
    return xorInto(ct.v, padFrom(shared, ct.v.length))
  } catch {
    return null
  }
}
