import { concatBytes, randomBytes, u32be } from './bytes.ts'
import { dhash, sha256 } from './hash.ts'

// Simulated Bitcoin chain for anchoring (SIGE spec section 8.3).
// One block per mine() call. Confirmations are tip distance.

export type Block = {
  height: number
  hash: Uint8Array
  header: Uint8Array
  chainWork: bigint
  payload: Uint8Array | null
}

const HEADER_VERSION = 1
const HEADER_BITS = 0x1d00ffff
const GENESIS_TIME = 1_700_000_000
const BLOCK_SECONDS = 600
const EMPTY_ROOT = new Uint8Array(32)
// Difficulty never retargets here, so every block adds one unit of work.
const WORK_PER_BLOCK = 1n

function merkleRoot(payload: Uint8Array | null): Uint8Array {
  if (payload === null) return EMPTY_ROOT
  return payload.length === 32 ? payload : sha256(payload)
}

// The 80-byte header layout: version, previous hash, merkle root, time, bits,
// nonce. The anchored payload is the single transaction, so it is the root.
function blockHeader(
  previous: Block | undefined,
  payload: Uint8Array | null,
  height: number,
): Uint8Array {
  return concatBytes(
    u32be(HEADER_VERSION),
    previous ? previous.hash : EMPTY_ROOT,
    merkleRoot(payload),
    u32be(GENESIS_TIME + height * BLOCK_SECONDS),
    u32be(HEADER_BITS),
    randomBytes(4),
  )
}

export class SimBitcoin {
  readonly blocks: Block[] = []

  constructor() {
    this.mine(null) // genesis
  }

  mine(payload: Uint8Array | null): Block {
    const previous = this.blocks[this.blocks.length - 1]
    const height = this.blocks.length
    const header = blockHeader(previous, payload, height)
    const block = {
      height,
      hash: dhash('sim-block', header),
      header,
      chainWork: (previous?.chainWork ?? 0n) + WORK_PER_BLOCK,
      payload,
    }
    this.blocks.push(block)
    return block
  }

  tipHeight(): number {
    return this.blocks.length - 1
  }

  confirmations(height: number): number {
    return this.tipHeight() - height + 1
  }
}

export type Anchor = {
  sthHash: Uint8Array
  blockHeight: number
  blockHash: Uint8Array
}

// The caller passes the digest it wants committed, so one head has one hash
// on the chain and in the evidence bundle, never two competing conventions.
export function anchorHead(chain: SimBitcoin, sthHash: Uint8Array): Anchor {
  const block = chain.mine(sthHash)
  return { sthHash, blockHeight: block.height, blockHash: block.hash }
}
