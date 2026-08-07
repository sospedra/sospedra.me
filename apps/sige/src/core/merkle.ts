import { ed25519 } from '@noble/curves/ed25519.js'
import { bytesEqual, concatBytes, u32be, utf8 } from './bytes.ts'
import { dhash, sha256 } from './hash.ts'

// Append-only Merkle log with signed tree heads: inclusion and consistency
// proofs (SIGE spec section 8.1, RFC 9162 section 2.1).

// A signed head encodes its size with u32be, so nothing above this can carry
// a signature. Both proof verifiers refuse beyond it.
const MAX_TREE_SIZE = 0xffffffff

const LEAF_PREFIX = Uint8Array.of(0)
const NODE_PREFIX = Uint8Array.of(1)

export function leafHash(leaf: Uint8Array): Uint8Array {
  return sha256(concatBytes(LEAF_PREFIX, leaf))
}

function nodeHash(l: Uint8Array, r: Uint8Array): Uint8Array {
  return sha256(concatBytes(NODE_PREFIX, l, r))
}

function collapseLevel(level: readonly Uint8Array[]): Uint8Array[] {
  const next: Uint8Array[] = []
  for (let i = 0; i < level.length; i += 2) {
    const left = level[i]
    const right = level[i + 1]
    if (left === undefined) break
    if (right !== undefined) {
      next.push(nodeHash(left, right))
    } else {
      next.push(left)
    }
  }
  return next
}

export type SignedTreeHead = {
  // ROW 7. Inside the signature, so "a head from a different log" is a
  // signature failure rather than a field comparison the presenter controls.
  treeId: string
  treeSize: number
  rootHash: Uint8Array
  signature: Uint8Array
}

function headMessage(
  treeId: string,
  treeSize: number,
  rootHash: Uint8Array,
): Uint8Array {
  return dhash('tree-head', utf8(treeId), u32be(treeSize), rootHash)
}

export class TransparencyLog {
  private leaves: Uint8Array[] = []
  // A real transparency log serves leaf BYTES, not just their hashes. Without
  // them no test could build the view an auditor actually holds, which is how
  // the chain walk shipped verified only against a synthetic log.
  private bytes: Uint8Array[] = []
  readonly treeId: string

  constructor(treeId = 'sige-demo-log/v1') {
    this.treeId = treeId
  }
  private readonly signingKey = ed25519.utils.randomSecretKey()
  readonly publicKey = ed25519.getPublicKey(this.signingKey)

  append(leaf: Uint8Array): number {
    this.leaves.push(leafHash(leaf))
    this.bytes.push(Uint8Array.from(leaf))
    return this.leaves.length - 1
  }

  leafBytesAt(index: number): Uint8Array {
    const bytes = this.bytes[index]
    if (bytes === undefined) throw new RangeError(`no leaf at ${index}`)
    return Uint8Array.from(bytes)
  }

  size(): number {
    return this.leaves.length
  }

  root(): Uint8Array {
    if (this.leaves.length === 0) return sha256(new Uint8Array(0))
    let level = this.leaves.slice()
    while (level.length > 1) level = collapseLevel(level)
    const root = level[0]
    return root ?? sha256(new Uint8Array(0))
  }

  signHead(): SignedTreeHead {
    const rootHash = this.root()
    const treeSize = this.leaves.length
    return {
      treeId: this.treeId,
      treeSize,
      rootHash,
      signature: ed25519.sign(
        headMessage(this.treeId, treeSize, rootHash),
        this.signingKey,
      ),
    }
  }

  // Demo-only: an equivocating operator signs an incompatible second head.
  signArbitraryHead(treeSize: number, rootHash: Uint8Array): SignedTreeHead {
    return {
      treeId: this.treeId,
      treeSize,
      rootHash,
      signature: ed25519.sign(
        headMessage(this.treeId, treeSize, rootHash),
        this.signingKey,
      ),
    }
  }

  inclusionProof(index: number): Uint8Array[] {
    const path: Uint8Array[] = []
    let level = this.leaves.slice()
    let idx = index
    while (level.length > 1) {
      const sibling = idx ^ 1
      if (sibling < level.length) {
        const sibl = level[sibling]
        if (sibl !== undefined) path.push(sibl)
      }
      level = collapseLevel(level)
      idx = idx >> 1
    }
    return path
  }

  consistencyProof(oldSize: number, newSize: number): Uint8Array[] {
    if (
      !Number.isInteger(oldSize) ||
      !Number.isInteger(newSize) ||
      oldSize <= 0 ||
      oldSize >= newSize ||
      newSize > this.leaves.length
    ) {
      return []
    }
    return subproof(this.leaves, {
      m: oldSize,
      offset: 0,
      n: newSize,
      complete: true,
    })
  }
}

export function verifyHead(
  publicKey: Uint8Array,
  sth: SignedTreeHead,
): boolean {
  return ed25519.verify(
    sth.signature,
    headMessage(sth.treeId, sth.treeSize, sth.rootHash),
    publicKey,
  )
}

type WalkState = {
  h: Uint8Array
  idx: number
  size: number
  p: number
}

// One parity expression drives both the sibling and the orientation. `idx ^ 1`
// coerces through ToInt32 while `idx % 2` does not, so deriving them separately
// made the two disagree for every index outside the Int32 range.
function verifyInclusionStep(
  state: WalkState,
  proof: Uint8Array[],
): WalkState | null {
  const isLeft = state.idx % 2 === 0
  const sibling = isLeft ? state.idx + 1 : state.idx - 1
  if (sibling >= state.size) return state
  if (state.p >= proof.length) return null
  const proofNode = proof[state.p]
  if (proofNode === undefined) return null
  const newH = isLeft
    ? nodeHash(state.h, proofNode)
    : nodeHash(proofNode, state.h)
  return { h: newH, idx: state.idx, size: state.size, p: state.p + 1 }
}

export function verifyInclusion(
  leaf: Uint8Array,
  index: number,
  treeSize: number,
  proof: Uint8Array[],
  root: Uint8Array,
): boolean {
  // Without the lower bound and the integer test, index - k*2^32 walks the same
  // path as index, so one leaf verifies under unboundedly many indices.
  if (!Number.isSafeInteger(index) || index < 0) return false
  if (!Number.isSafeInteger(treeSize) || treeSize > MAX_TREE_SIZE) return false
  if (index >= treeSize) return false
  let state: WalkState = {
    h: leafHash(leaf),
    idx: index,
    size: treeSize,
    p: 0,
  }
  while (state.size > 1) {
    const next = verifyInclusionStep(state, proof)
    if (next === null) return false
    state = {
      h: next.h,
      idx: Math.floor(next.idx / 2),
      size: Math.ceil(next.size / 2),
      p: next.p,
    }
  }
  return state.p === proof.length && bytesEqual(state.h, root)
}

type SubproofRange = {
  m: number
  offset: number
  n: number
  complete: boolean
}

function largestPowerOfTwoBelow(n: number): number {
  let k = 1
  while (k * 2 < n) k *= 2
  return k
}

function subtreeHash(
  leaves: readonly Uint8Array[],
  from: number,
  to: number,
): Uint8Array {
  let level = leaves.slice(from, to)
  while (level.length > 1) level = collapseLevel(level)
  return level[0] ?? sha256(new Uint8Array(0))
}

function subproof(
  leaves: readonly Uint8Array[],
  range: SubproofRange,
): Uint8Array[] {
  const { m, offset, n, complete } = range
  if (m === n && complete) return []
  if (m === n) return [subtreeHash(leaves, offset, offset + n)]
  const k = largestPowerOfTwoBelow(n)
  if (m <= k) {
    const left = subproof(leaves, { m, offset, n: k, complete })
    return [...left, subtreeHash(leaves, offset + k, offset + n)]
  }
  const right = subproof(leaves, {
    m: m - k,
    offset: offset + k,
    n: n - k,
    complete: false,
  })
  return [...right, subtreeHash(leaves, offset, offset + k)]
}

type ConsistencyWalkState = {
  fn: number
  sn: number
  fr: Uint8Array
  sr: Uint8Array
}

function isPowerOfTwo(n: number): boolean {
  return (n & (n - 1)) === 0
}

function shiftWhileLsbSet(fn: number, sn: number): [number, number] {
  let f = fn
  let s = sn
  while ((f & 1) === 1) {
    f >>= 1
    s >>= 1
  }
  return [f, s]
}

function shiftWhileLsbUnset(fn: number, sn: number): [number, number] {
  let f = fn
  let s = sn
  while (f !== 0 && (f & 1) === 0) {
    f >>= 1
    s >>= 1
  }
  return [f, s]
}

function verifyConsistencyStep(
  state: ConsistencyWalkState,
  c: Uint8Array,
): ConsistencyWalkState | null {
  if (state.sn === 0) return null
  if ((state.fn & 1) === 1 || state.fn === state.sn) {
    const fr = nodeHash(c, state.fr)
    const sr = nodeHash(c, state.sr)
    const [fn, sn] = shiftWhileLsbUnset(state.fn, state.sn)
    return { fn: fn >> 1, sn: sn >> 1, fr, sr }
  }
  return {
    fn: state.fn >> 1,
    sn: state.sn >> 1,
    fr: state.fr,
    sr: nodeHash(state.sr, c),
  }
}

function verifyConsistencyPath(
  oldSth: SignedTreeHead,
  newSth: SignedTreeHead,
  proof: Uint8Array[],
): boolean {
  const { treeSize: oldSize, rootHash: oldRoot } = oldSth
  const { treeSize: newSize, rootHash: newRoot } = newSth
  if (proof.length === 0) return false
  const path = isPowerOfTwo(oldSize) ? [oldRoot, ...proof] : proof
  const head = path[0]
  if (head === undefined) return false
  const [fn, sn] = shiftWhileLsbSet(oldSize - 1, newSize - 1)
  let state: ConsistencyWalkState = { fn, sn, fr: head, sr: head }
  for (const c of path.slice(1)) {
    const next = verifyConsistencyStep(state, c)
    if (next === null) return false
    state = next
  }
  return (
    state.sn === 0 &&
    bytesEqual(state.fr, oldRoot) &&
    bytesEqual(state.sr, newRoot)
  )
}

export function verifyConsistency(
  oldSth: SignedTreeHead,
  newSth: SignedTreeHead,
  proof: Uint8Array[],
): boolean {
  const { treeSize: oldSize, rootHash: oldRoot } = oldSth
  const { treeSize: newSize, rootHash: newRoot } = newSth
  // The shift loops use `&` and `>>`, which coerce through ToInt32. At any
  // nonzero multiple of 2^32, `oldSize - 1` becomes -1 and `-1 >> 1` is -1, so
  // the loop never ends. A hang is worse than a throw: no try recovers it.
  // MAX_TREE_SIZE is the range a signed head can express through u32be.
  const validRange =
    Number.isSafeInteger(oldSize) &&
    Number.isSafeInteger(newSize) &&
    oldSize >= 0 &&
    newSize >= oldSize &&
    newSize <= MAX_TREE_SIZE
  if (!validRange) return false
  if (oldSize === newSize) {
    return proof.length === 0 && bytesEqual(oldRoot, newRoot)
  }
  if (oldSize === 0) return proof.length === 0
  return verifyConsistencyPath(oldSth, newSth, proof)
}

export type EquivocationProof = {
  first: SignedTreeHead
  second: SignedTreeHead
}

// Two valid heads, same size, different roots: transferable evidence
// (SIGE spec section 8.6). Any third party can verify it offline.
export function detectEquivocation(
  publicKey: Uint8Array,
  a: SignedTreeHead,
  b: SignedTreeHead,
): EquivocationProof | null {
  if (a.treeSize !== b.treeSize) return null
  if (bytesEqual(a.rootHash, b.rootHash)) return null
  if (!verifyHead(publicKey, a) || !verifyHead(publicKey, b)) return null
  return { first: a, second: b }
}
