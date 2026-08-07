import { bigIntToBytes } from './bytes.ts'
import {
  asSafeCount,
  asUnsignedBigInt,
  type CborValue,
  decodeCborArray,
  isCborArray,
  strictCborMap,
} from './cbor.ts'
import type { LhtlpPuzzle } from './lhtlp.ts'
import type { FeldmanCommitments } from './shamir.ts'
import type { VtdOpened, VtdProfile, VtdProof } from './vtd.ts'

// Canonical wire format for the VTD proof and its parts. records.ts and
// world.ts both encode proofs, so one implementation keeps one set of bytes.

const VTD_PROFILE_KEYS: ReadonlySet<string> = new Set(['n', 'k', 'o'])

export function vtdProfileCbor(profile: VtdProfile): CborValue {
  return new Map<string, CborValue>([
    ['n', BigInt(profile.n)],
    ['k', BigInt(profile.k)],
    ['o', BigInt(profile.o)],
  ])
}

export function cborToVtdProfile(
  value: CborValue | undefined,
): VtdProfile | null {
  const map = strictCborMap(value, VTD_PROFILE_KEYS)
  const n = asSafeCount(map?.get('n'))
  const k = asSafeCount(map?.get('k'))
  const o = asSafeCount(map?.get('o'))
  if (n === null || k === null || o === null) return null
  return { n, k, o }
}

const FELDMAN_COMMITMENTS_KEYS: ReadonlySet<string> = new Set(['a'])

export function feldmanCommitmentsCbor(
  commitments: FeldmanCommitments,
): CborValue {
  return new Map<string, CborValue>([['a', commitments.a]])
}

export function cborToFeldmanCommitments(
  value: CborValue | undefined,
): FeldmanCommitments | null {
  const map = strictCborMap(value, FELDMAN_COMMITMENTS_KEYS)
  const a = map?.get('a')
  if (!isCborArray(a)) return null
  const points = a.filter(
    (item): item is Uint8Array => item instanceof Uint8Array,
  )
  return points.length === a.length ? { a: points } : null
}

const LHTLP_PUZZLE_KEYS: ReadonlySet<string> = new Set(['u', 'v'])

export function lhtlpPuzzleCbor(puzzle: LhtlpPuzzle): CborValue {
  return new Map<string, CborValue>([
    ['u', bigIntToBytes(puzzle.u)],
    ['v', bigIntToBytes(puzzle.v)],
  ])
}

export function cborToLhtlpPuzzle(value: CborValue): LhtlpPuzzle | null {
  const map = strictCborMap(value, LHTLP_PUZZLE_KEYS)
  const u = asUnsignedBigInt(map?.get('u'))
  const v = asUnsignedBigInt(map?.get('v'))
  if (u === null || v === null) return null
  return { u, v }
}

const VTD_OPENED_KEYS: ReadonlySet<string> = new Set([
  'index',
  'share',
  'blinding',
])

export function vtdOpenedCbor(opened: VtdOpened): CborValue {
  return new Map<string, CborValue>([
    ['index', BigInt(opened.index)],
    ['share', bigIntToBytes(opened.share)],
    ['blinding', bigIntToBytes(opened.blinding)],
  ])
}

export function cborToVtdOpened(value: CborValue): VtdOpened | null {
  const map = strictCborMap(value, VTD_OPENED_KEYS)
  const index = asSafeCount(map?.get('index'))
  const share = asUnsignedBigInt(map?.get('share'))
  const blinding = asUnsignedBigInt(map?.get('blinding'))
  if (index === null || share === null || blinding === null) return null
  return { index, share, blinding }
}

const VTD_PROOF_KEYS: ReadonlySet<string> = new Set([
  'profile',
  'nonce',
  'commitments',
  'puzzles',
  'opened',
])

export function vtdProofCbor(proof: VtdProof): CborValue {
  return new Map<string, CborValue>([
    ['profile', vtdProfileCbor(proof.profile)],
    ['nonce', proof.nonce],
    ['commitments', feldmanCommitmentsCbor(proof.commitments)],
    ['puzzles', proof.puzzles.map(lhtlpPuzzleCbor)],
    ['opened', proof.opened.map(vtdOpenedCbor)],
  ])
}

export function cborToVtdProof(value: CborValue | undefined): VtdProof | null {
  const map = strictCborMap(value, VTD_PROOF_KEYS)
  const profile = cborToVtdProfile(map?.get('profile'))
  const commitments = cborToFeldmanCommitments(map?.get('commitments'))
  const puzzles = decodeCborArray(map?.get('puzzles'), cborToLhtlpPuzzle)
  const opened = decodeCborArray(map?.get('opened'), cborToVtdOpened)
  const nonce = map?.get('nonce')
  if (!profile || !commitments || !puzzles || !opened) return null
  if (!(nonce instanceof Uint8Array)) return null
  return { profile, nonce, commitments, puzzles, opened }
}
