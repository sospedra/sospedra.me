import { bytesEqual, toHex } from '../core/bytes.ts'
import type { Anchor, Block, SimBitcoin } from '../core/chain.ts'

// Chain validator (SIGE spec 4.1, 8.4). It holds the monotonic view of the
// anchoring chain so no single caller can assert progress it did not observe.

export type ChainValidatorPolicy = {
  minConfirmations: number
  freshnessBlocks: number
  minChainWorkDelta: number
}

export type AcceptedAnchor = {
  anchor: Anchor
  observedAtHeight: number
  cumulativeWork: number
  confirmations: number
}

export type ChainVerdict =
  | { accepted: true; entry: AcceptedAnchor; tier: 'ASSUMED'; note: string }
  | { accepted: false; reason: string }

// Proof of work is not proof of publication: knowing which chain is canonical
// is an out-of-band assumption, so every accepted anchor prints ASSUMED.
const CANONICAL_CHAIN_NOTE =
  'ASSUMED: this validator trusts the supplied chain view as canonical. Proof of work is not proof of publication (spec 8.4).'

export type ChainValidator = {
  readonly policy: ChainValidatorPolicy
  readonly archive: AcceptedAnchor[]
  bestWork: number
  lastAcceptedHeight: number
}

export function createChainValidator(
  policy: Partial<ChainValidatorPolicy> = {},
): ChainValidator {
  return {
    policy: {
      minConfirmations: policy.minConfirmations ?? 3,
      freshnessBlocks: policy.freshnessBlocks ?? 100,
      minChainWorkDelta: policy.minChainWorkDelta ?? 1,
    },
    archive: [],
    bestWork: 0,
    lastAcceptedHeight: -1,
  }
}

// Cumulative work in this simulator is block height: one block, one unit.
function cumulativeWorkAt(height: number): number {
  return height + 1
}

function findBlock(chain: SimBitcoin, height: number): Block | undefined {
  return chain.blocks[height]
}

function headerIssue(chain: SimBitcoin, anchor: Anchor): string | null {
  if (!Number.isInteger(anchor.blockHeight) || anchor.blockHeight < 0) {
    return 'anchor declares a non-integer or negative block height'
  }
  const block = findBlock(chain, anchor.blockHeight)
  if (!block) return `no block at height ${anchor.blockHeight}`
  if (!bytesEqual(block.hash, anchor.blockHash)) {
    return 'anchor block hash does not match the chain at that height'
  }
  if (!block.payload || !bytesEqual(block.payload, anchor.sthHash)) {
    return 'anchor block does not carry the declared sth hash'
  }
  return null
}

function progressIssue(
  validator: ChainValidator,
  chain: SimBitcoin,
  anchor: Anchor,
): string | null {
  const { policy } = validator
  const confirmations = chain.confirmations(anchor.blockHeight)
  if (confirmations < policy.minConfirmations) {
    return `anchor has ${confirmations} confirmations, policy requires ${policy.minConfirmations}`
  }
  const age = chain.tipHeight() - anchor.blockHeight
  if (age > policy.freshnessBlocks) {
    return `anchor is ${age} blocks old, beyond the freshness bound of ${policy.freshnessBlocks}`
  }
  if (anchor.blockHeight <= validator.lastAcceptedHeight) {
    return `anchor at height ${anchor.blockHeight} does not advance past the last accepted height ${validator.lastAcceptedHeight}`
  }
  const work = cumulativeWorkAt(anchor.blockHeight)
  if (work < validator.bestWork + policy.minChainWorkDelta) {
    return `anchor adds ${work - validator.bestWork} cumulative work, policy requires ${policy.minChainWorkDelta}`
  }
  return null
}

export function validateAnchor(
  validator: ChainValidator,
  chain: SimBitcoin,
  anchor: Anchor,
): ChainVerdict {
  const header = headerIssue(chain, anchor)
  if (header) return { accepted: false, reason: header }
  const progress = progressIssue(validator, chain, anchor)
  if (progress) return { accepted: false, reason: progress }

  const entry: AcceptedAnchor = {
    anchor,
    observedAtHeight: chain.tipHeight(),
    cumulativeWork: cumulativeWorkAt(anchor.blockHeight),
    confirmations: chain.confirmations(anchor.blockHeight),
  }
  validator.archive.push(entry)
  validator.bestWork = entry.cumulativeWork
  validator.lastAcceptedHeight = anchor.blockHeight
  return { accepted: true, entry, tier: 'ASSUMED', note: CANONICAL_CHAIN_NOTE }
}

export function anchorArchiveDigest(validator: ChainValidator): string[] {
  return validator.archive.map(
    (entry) =>
      `${entry.anchor.blockHeight}:${toHex(entry.anchor.sthHash).slice(0, 16)}:work=${entry.cumulativeWork}`,
  )
}
