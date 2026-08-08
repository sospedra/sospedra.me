import { ed25519 } from '@noble/curves/ed25519.js'
import { concatBytes, u32be, utf8 } from './bytes.ts'
import { dhash, sha256 } from './hash.ts'

// Append-only Merkle log with signed tree heads: inclusion and consistency
// proofs (SIGE spec section 8.1, RFC 9162 section 2.1).

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
        // Copied. Handing the stored node out by reference let a write through
        // a served proof rewrite the log's own tree, so it signed a different
        // root at the same size without anyone holding its key.
        if (sibl !== undefined) path.push(Uint8Array.from(sibl))
      }
      level = collapseLevel(level)
      idx = idx >> 1
    }
    return path
  }

  // Fetch, do not accept. Every view the report checked used to be a bag the
  // caller assembled, which made "presenter" a role with its own attack
  // surface: withhold a leaf, pad an array, reorder it. Serving the view from
  // the log's own state removes that role. It removes nothing else: the log is
  // still untrusted, the head is still verified, every proof is still checked.
  serveLeaves(): {
    index: number
    bytes: Uint8Array
    inclusionProof: Uint8Array[]
  }[] {
    // Build every level ONCE. Calling inclusionProof per leaf rebuilt the whole
    // tree each time, which measured O(n^2): 70 seconds at 8000 leaves, and a
    // SIGE log appends a leaf per enrollment, unseal, disclosure and heartbeat.
    // The auditor is the one who pays for that, which is the wrong party.
    const levels: Uint8Array[][] = [this.leaves.slice()]
    while (levels[levels.length - 1].length > 1) {
      levels.push(collapseLevel(levels[levels.length - 1]))
    }
    return this.bytes.map((bytes, index) => {
      const path: Uint8Array[] = []
      let idx = index
      for (const level of levels) {
        if (level.length <= 1) break
        const sibl = level[idx ^ 1]
        if (sibl !== undefined) path.push(Uint8Array.from(sibl))
        idx >>= 1
      }
      return { index, bytes: Uint8Array.from(bytes), inclusionProof: path }
    })
  }
}
