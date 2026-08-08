// The enrollment relation R. Paper Section 3.5, Equations 5 to 10.
//
// R joins a credential proof to the escrow proof through one public value, hS.
// Getting that join wrong is the failure mode the paper spends most of its
// design section on: a genuine passport can coexist with sealed garbage if the
// two halves are never tied together.
//
// The zero-knowledge circuit does not exist. This module computes the SAME
// relation in the clear and marks every witness field as such. That is enough
// to exercise the binding, which is the part that can be wrong in an
// interesting way. It proves nothing about zero knowledge, and says so.

import { ed25519 } from '@noble/curves/ed25519.js'
import { open, sealWith } from '../core/aead.ts'
import { bytesEqual, concatBytes, frame, toHex, utf8 } from '../core/bytes.ts'
import { dhash, kdf } from '../core/hash.ts'
import { scalarCommitment } from '../core/shamir.ts'

// The secret scalar as 32 fixed big-endian bytes. This is s itself, the value
// the escrow shares, and is distinct from its public commitment [s]P_1.
function secretScalarBytes(secret: bigint): Uint8Array {
  const out = new Uint8Array(32)
  let v = secret
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

export const CIRCUIT_STATUS =
  'CLEAR-MODE: the relation is evaluated in the open. No zero-knowledge ' +
  'property holds. Paper Section 9.1 names this the critical path.'

// Stands in for the passport data groups. Real data groups are a DER structure
// carrying, among much else, the holder attributes and the chip public key.
export type PassportData = {
  readonly documentNumber: string
  readonly fullName: string
  readonly dateOfBirth: string
  readonly nationality: string
  // Equation 6: the chip's authentication key lives INSIDE the signed data, so
  // it inherits the country's signature.
  readonly chipPublicKey: Uint8Array
}

export type Witness = {
  readonly data: PassportData
  readonly countrySignature: Uint8Array
  readonly chipSignature: Uint8Array
  readonly secret: bigint
  readonly sealNonce: Uint8Array
}

export type PublicInputs = {
  readonly accountId: string
  readonly serverNonce: Uint8Array
  readonly hS: Uint8Array
  readonly nullifier: Uint8Array
  readonly sealedIdentity: Uint8Array
}

export function encodeData(data: PassportData): Uint8Array {
  // Every field length-framed. The old separators were ambiguous: a field
  // containing the separator byte could impersonate a different layout.
  return frame(
    utf8('CLAVE/passport/v1'),
    utf8(data.documentNumber),
    utf8(data.fullName),
    utf8(data.dateOfBirth),
    utf8(data.nationality),
    data.chipPublicKey,
  )
}

// Equation 7's challenge. Bound to BOTH the account and a single-use server
// nonce, so a recorded chip response cannot be replayed into another account
// or another session.
export function chipChallenge(
  accountId: string,
  serverNonce: Uint8Array,
): Uint8Array {
  // Framed. A raw concat let ('acct', 0x58...) and ('acctX', ...) collide, so
  // a chip response bound to one account was accepted for another.
  return dhash('CLAVE/chip-challenge/v1', utf8(accountId), serverNonce)
}

// Equation 8. Derived from the document alone. Including the account id here
// would let one passport enroll unlimited accounts, which is decision 7 in the
// paper and the reason this function does not take an accountId.
export function nullifierFor(data: PassportData): Uint8Array {
  return dhash('CLAVE/nullifier/v1', utf8(data.documentNumber))
}

// Equation 10. The identity is sealed under a key derived from the random
// scalar, never committed directly, because identity data is low entropy.
// Equation 10. The key derives from the SECRET scalar s, never from its
// commitment. scalarCommitment(s) is hS, which is public, so keying the seal
// from it would let anyone holding the record decrypt the identity. The key
// must come from s itself, which is recoverable only through the escrow.
function sealKey(secret: bigint, accountId: string): Uint8Array {
  return kdf(secretScalarBytes(secret), utf8('CLAVE/seal/v1'), utf8(accountId))
}

export function sealIdentity(
  secret: bigint,
  nonce: Uint8Array,
  data: PassportData,
  accountId: string,
): Uint8Array {
  const sealed = sealWith(
    sealKey(secret, accountId),
    nonce,
    encodeData(data),
    utf8(accountId),
  )
  return concatBytes(sealed.nonce, sealed.ciphertext)
}

export function unsealIdentity(
  secret: bigint,
  accountId: string,
  sealedIdentity: Uint8Array,
): Uint8Array | null {
  const nonce = sealedIdentity.subarray(0, 24)
  const ciphertext = sealedIdentity.subarray(24)
  return open(sealKey(secret, accountId), nonce, ciphertext, utf8(accountId))
}

export type Statement = {
  readonly publicInputs: PublicInputs
  readonly circuitStatus: string
}

export function prove(
  witness: Witness,
  accountId: string,
  serverNonce: Uint8Array,
): Statement {
  return {
    circuitStatus: CIRCUIT_STATUS,
    publicInputs: {
      accountId,
      serverNonce,
      // Equation 9. Every downstream check compares against this one value.
      hS: scalarCommitment(witness.secret),
      nullifier: nullifierFor(witness.data),
      sealedIdentity: sealIdentity(
        witness.secret,
        witness.sealNonce,
        witness.data,
        accountId,
      ),
    },
  }
}

function verifySignature(
  key: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
): boolean {
  try {
    return ed25519.verify(signature, message, key)
  } catch {
    return false
  }
}

// Equation 5. The country signed the data groups. The key set is the
// VERIFIER'S, never one carried in the statement. A prover who supplies the
// list of keys to trust can sign their own passport.
function checkCountry(
  w: Witness,
  _p: PublicInputs,
  trusted: readonly Uint8Array[],
): string | null {
  const encoded = encodeData(w.data)
  const signed = trusted.some((key) =>
    verifySignature(key, encoded, w.countrySignature),
  )
  return signed ? null : 'no trusted country key signed these data groups'
}

// Equations 6 and 7. The chip key came from inside the signed data, and the
// physical chip answered a challenge bound to this account and session.
function checkChipPresence(w: Witness, p: PublicInputs): string | null {
  const challenge = chipChallenge(p.accountId, p.serverNonce)
  const answered = verifySignature(
    w.data.chipPublicKey,
    challenge,
    w.chipSignature,
  )
  return answered ? null : 'the chip did not answer this challenge'
}

// Equations 9 and 10. THE JOIN. The identity the country signed is exactly what
// is sealed, under exactly the key committed by hS. Without this, a genuine
// passport and a sealed lie both verify on their own.
function checkSealBinding(w: Witness, p: PublicInputs): string | null {
  if (!bytesEqual(scalarCommitment(w.secret), p.hS)) {
    return 'hS does not commit the secret the sealing used'
  }
  const nonce = p.sealedIdentity.subarray(0, 24)
  const recomputed = sealIdentity(w.secret, nonce, w.data, p.accountId)
  if (!bytesEqual(recomputed, p.sealedIdentity)) {
    return 'the sealed bytes are not the signed identity under this key'
  }
  return null
}

// Equation 8.
function checkNullifier(w: Witness, p: PublicInputs): string | null {
  if (!bytesEqual(nullifierFor(w.data), p.nullifier)) {
    return 'nullifier is not derived from this document'
  }
  if (toHex(p.nullifier).includes(toHex(utf8(p.accountId)))) {
    return 'nullifier appears to be scoped to the account'
  }
  return null
}

// Read every witness field EXACTLY ONCE into a plain object. A caller can
// define `data` as a getter that answers differently on each read, which would
// let one identity satisfy the signature check and another satisfy the seal
// check. Normalise first, then never touch the argument again.
function snapshot(witness: Witness): Witness {
  const d = witness.data
  return {
    data: {
      documentNumber: d.documentNumber,
      fullName: d.fullName,
      dateOfBirth: d.dateOfBirth,
      nationality: d.nationality,
      chipPublicKey: Uint8Array.from(d.chipPublicKey),
    },
    countrySignature: Uint8Array.from(witness.countrySignature),
    chipSignature: Uint8Array.from(witness.chipSignature),
    secret: witness.secret,
    sealNonce: Uint8Array.from(witness.sealNonce),
  }
}

function verifyWitness(
  statement: Statement,
  witness: Witness,
  trustedCountryKeys: readonly Uint8Array[],
): string | null {
  const checked = snapshot(witness)
  const p = statement.publicInputs
  const country = checkCountry(checked, p, trustedCountryKeys)
  if (country) return country
  for (const check of [checkChipPresence, checkNullifier, checkSealBinding]) {
    const fault = check(checked, p)
    if (fault) return fault
  }
  return null
}

// The seam. A credential proof carries the public inputs and an opaque payload.
// The protocol layer treats the payload as unknown and never reads it, so it
// cannot see the passport. Only a backend understands the payload.
//
// In clear mode the payload IS the witness, so the backend sees it. In a
// zero-knowledge backend the payload is a proof and no party sees the witness.
// The protocol code is identical either way, which is what makes the gap a
// named boundary rather than a rewrite.
export type CredentialProof = {
  readonly statement: Statement
  readonly payload: unknown
}

export type CredentialBackend = {
  readonly mode: 'clear' | 'zk'
  prove(
    witness: Witness,
    accountId: string,
    serverNonce: Uint8Array,
  ): CredentialProof
  verify(
    proof: CredentialProof,
    trustedCountryKeys: readonly Uint8Array[],
  ): string | null
}

export const clearModeBackend: CredentialBackend = {
  mode: 'clear',
  prove(witness, accountId, serverNonce) {
    // Snapshot first, so a getter-backed witness is read exactly once, before
    // the statement is built from it.
    const w = snapshot(witness)
    return { statement: prove(w, accountId, serverNonce), payload: w }
  },
  verify(proof, trustedCountryKeys) {
    // Check shape by key existence, not by reading the value. A getter-backed
    // payload must be read for the first time inside snapshot, not here.
    const payload = proof.payload
    if (
      payload === null ||
      typeof payload !== 'object' ||
      !('data' in payload)
    ) {
      return 'clear-mode payload is not a witness'
    }
    return verifyWitness(
      proof.statement,
      payload as Witness,
      trustedCountryKeys,
    )
  },
}
