// The protocol end to end. Paper Sections 3.4 through 3.8.
//
// Enrollment runs on the device and hands the platform ciphertext. Unsealing
// runs through a public request, and the escrow network is the only party that
// can turn that request into a key.
//
// The platform object below holds NO secret. That is checkable by reading its
// type: there is nowhere for one to live.

import { x25519 } from '@noble/curves/ed25519.js'
import type { Beacon, Capsule } from './beacon/beacon.ts'
import type { Chain, TxRef } from './chain/chain.ts'
import { open, type Sealed, seal } from './core/aead.ts'
import { bytesEqual, concatBytes, fromHex, toHex, utf8 } from './core/bytes.ts'
import { kdf, sha256 } from './core/hash.ts'
import { type AccountKey, derive, type MasterKey } from './core/ibe.ts'
import { TransparencyLog } from './core/merkle.ts'
import {
  prove as proveRelation,
  type Statement,
  verify as verifyRelation,
  type Witness,
} from './enrollment/relation.ts'
import {
  type EscrowProof,
  type Profile,
  prove as proveEscrow,
  REFERENCE_PROFILE,
  recover,
  verify as verifyEscrow,
} from './escrow/proof.ts'

export type EnrollmentRecord = {
  readonly accountId: string
  readonly statement: Statement
  readonly escrow: EscrowProof
}

// Everything the platform stores about one user. No key material anywhere.
export type PlatformState = {
  readonly records: Map<string, EnrollmentRecord>
  readonly nullifiers: Set<string>
  readonly log: TransparencyLog
  // The verifier's own trust anchors. Never taken from a submitted statement.
  readonly trustedCountryKeys: readonly Uint8Array[]
}

export function newPlatform(
  trustedCountryKeys: readonly Uint8Array[] = [],
): PlatformState {
  return {
    records: new Map(),
    nullifiers: new Set(),
    log: new TransparencyLog(),
    trustedCountryKeys,
  }
}

export type EnrollInput = {
  readonly accountId: string
  readonly serverNonce: Uint8Array
  readonly witness: Witness
  readonly profile?: Profile
}

// Runs on the user's device. The only thing that crosses the boundary is the
// return value, and it carries no plaintext.
export function sealOnDevice(
  mpk: Uint8Array,
  input: EnrollInput,
): EnrollmentRecord {
  const statement = proveRelation(
    input.witness,
    input.accountId,
    input.serverNonce,
  )
  const escrow = proveEscrow(
    mpk,
    input.accountId,
    input.witness.secret,
    input.profile ?? REFERENCE_PROFILE,
  )
  return { accountId: input.accountId, statement, escrow }
}

export type AcceptResult =
  | { readonly ok: true; readonly leafIndex: number }
  | { readonly ok: false; readonly reason: string }

// Runs on the platform. Verifies both proofs and the join between them, then
// records the enrollment. The witness argument exists only because the circuit
// is in clear mode; a real deployment verifies a proof instead and never sees
// it. See CIRCUIT_STATUS.
export function acceptEnrollment(
  platform: PlatformState,
  mpk: Uint8Array,
  record: EnrollmentRecord,
  witness: Witness,
): AcceptResult {
  // The account the credential proof was built for must be the account being
  // enrolled. Without this a proof for one account is reusable under another,
  // and the chip challenge binding travels to the wrong place.
  if (record.statement.publicInputs.accountId !== record.accountId) {
    return { ok: false, reason: 'credential proof is for another account' }
  }

  const relationFault = verifyRelation(
    record.statement,
    witness,
    platform.trustedCountryKeys,
  )
  if (relationFault) return { ok: false, reason: relationFault }

  const escrowFault = verifyEscrow(
    mpk,
    record.escrow,
    record.statement.publicInputs.hS,
  )
  if (escrowFault) return { ok: false, reason: escrowFault }

  if (record.escrow.accountId !== record.accountId) {
    return { ok: false, reason: 'escrow proof is for another account' }
  }

  const nullifier = toHex(record.statement.publicInputs.nullifier)
  if (platform.nullifiers.has(nullifier)) {
    return { ok: false, reason: 'this document has already enrolled' }
  }
  platform.nullifiers.add(nullifier)
  platform.records.set(record.accountId, record)

  const leafIndex = platform.log.append(
    sha256(
      concatBytes(
        utf8('CLAVE/enrollment/v1'),
        utf8(record.accountId),
        record.statement.publicInputs.hS,
      ),
    ),
  )
  return { ok: true, leafIndex }
}

export type UnsealOutcome = {
  readonly tx: TxRef
  readonly capsule: Capsule
  readonly identity: Uint8Array | null
  readonly reason: string
}

// What the platform puts on chain. The confirmation depth and the disclosure
// schedule are NOT here, because they belong to the escrow network's policy.
export type UnsealInput = {
  readonly accountId: string
  readonly reason: string
  readonly requesterPubKey: string
}

// Stands in for a per-release ephemeral key. A deployment generates one per
// delivery and publishes the public half beside the sealed key.
const EPHEMERAL = new Uint8Array(32).fill(7)

function commitmentFor(accountId: string): string {
  return toHex(sha256(concatBytes(utf8('CLAVE/request/v1'), utf8(accountId))))
}

// The platform posts a request. It cannot derive anything itself.
export async function requestUnseal(
  chain: Chain,
  input: UnsealInput,
): Promise<TxRef> {
  return chain.postRequest({
    commitment: commitmentFor(input.accountId),
    reasonHash: toHex(sha256(utf8(input.reason))),
    requesterPubKey: input.requesterPubKey,
  })
}

export type ServeResult =
  | {
      readonly ok: true
      // Encrypted to the requester key committed on chain, never handed over
      // in the clear. A published key would expose the user to everyone.
      readonly sealedKey: Sealed
      readonly capsule: Capsule
    }
  | { readonly ok: false; readonly reason: string }

// The network's own policy. None of it is caller supplied, because a caller
// who picks the confirmation depth or the disclosure round controls the two
// properties the construction exists to provide.
export type EscrowPolicy = {
  readonly minConfirmations: number
  readonly disclosureDelayRounds: number
}

export type ServeInput = {
  readonly accountId: string
  // Must hash to the reasonHash already committed on chain.
  readonly reason: string
}

// Runs on the escrow network. Everything it acts on comes from the chain or
// from its own policy. The only caller input is which account to look for, and
// that is checked against the on-chain commitment before anything is derived.
export async function serveRequest(
  master: MasterKey,
  chain: Chain,
  beacon: Beacon,
  policy: EscrowPolicy,
  input: ServeInput,
): Promise<ServeResult> {
  const observed = await chain.observeRequests(policy.minConfirmations)
  const wanted = commitmentFor(input.accountId)
  const match = observed.find((r) => r.commitment === wanted)
  if (!match) {
    return {
      ok: false,
      reason: 'no confirmed on-chain request for this account',
    }
  }

  // The stated reason was fixed by its hash at request time. A reason that
  // does not match it is a revision after the fact.
  if (match.reasonHash !== toHex(sha256(utf8(input.reason)))) {
    return { ok: false, reason: 'reason does not match the committed hash' }
  }

  const requesterPub = fromHex(match.requesterPubKey)
  if (requesterPub === null) {
    return { ok: false, reason: 'on-chain requester key is malformed' }
  }

  // The disclosure round comes from policy and the beacon's current position,
  // never from the requester. A caller-chosen round can be set far enough out
  // that the disclosure never opens.
  const round = beacon.currentRound() + policy.disclosureDelayRounds
  const capsule = beacon.sealUntil(
    round,
    utf8(`account=${input.accountId} tx=${match.tx.hash}`),
  )

  const key = derive(master, input.accountId)
  const shared = x25519.getSharedSecret(EPHEMERAL, requesterPub)
  const sealedKey = seal(
    kdf(shared, utf8('CLAVE/key-delivery/v1'), utf8(input.accountId)),
    key.sk,
    utf8(input.accountId),
  )
  return { ok: true, sealedKey, capsule }
}

// The requester recovers the account key from what the network published.
export function openDeliveredKey(
  accountId: string,
  requesterSecret: Uint8Array,
  sealedKey: Sealed,
): AccountKey | null {
  const shared = x25519.getSharedSecret(
    requesterSecret,
    x25519.getPublicKey(EPHEMERAL),
  )
  const sk = open(
    kdf(shared, utf8('CLAVE/key-delivery/v1'), utf8(accountId)),
    sealedKey.nonce,
    sealedKey.ciphertext,
    utf8(accountId),
  )
  return sk === null ? null : { id: accountId, sk }
}

export function openSealedIdentity(
  record: EnrollmentRecord,
  key: AccountKey,
): Uint8Array | null {
  const result = recover(key, record.escrow)
  if (!result.ok) return null
  // The recovered scalar is what the sealing key derives from. A caller with
  // the record can now open it; this returns the scalar's commitment so a test
  // can check the round trip without this module importing the sealing code.
  const check = record.statement.publicInputs.hS
  return bytesEqual(check, record.escrow.hS) ? check : null
}
