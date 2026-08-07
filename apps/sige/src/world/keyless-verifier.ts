import { bytesEqual, toHex } from '../core/bytes.ts'
import type { Anchor, SimBitcoin } from '../core/chain.ts'
import type { CongestionPolicy } from '../core/congestion.ts'
import {
  chainedWork,
  requiredDifficulty,
  STAMP_GENESIS,
  windowCount,
} from '../core/congestion.ts'
import type { LhtlpParams } from '../core/lhtlp.ts'
import type { SignedTreeHead } from '../core/merkle.ts'
import {
  countCosignatures,
  type TransparencyLog,
  verifyConsistency,
  verifyHead,
  verifyInclusion,
  type WitnessPolicy,
} from '../core/merkle.ts'
import type { VtdProfile } from '../core/vtd.ts'
import {
  type ChainValidator,
  type ChainVerdict,
  createChainValidator,
  validateAnchor,
} from './chain-validator.ts'
import type { DocketRecord, UnsealSighting } from './docket.ts'
import { type DocketHorizon, type ReconcileEntry, reconcile } from './docket.ts'
import type { EvidenceBundleV1, EvidencePublicKeys } from './evidence.ts'
import { decodeClosingLeafV1, verifyEvidenceBundle } from './evidence.ts'
import type { LogLeafV1, SignedTreeHeadV1 } from './records.ts'
import {
  congestionStampLeafHash,
  coreSignedTreeHead,
  hashSignedTreeHeadV1,
  parseLeaf,
  TRACKS,
  type Track,
} from './records.ts'

// Keyless verifier (SIGE spec 5.8). Constructed from public data only. There
// is no field on this type that can hold a secret, so the claim is structural.

export type PublicLogView = {
  heads: readonly SignedTreeHead[]
  leaves: readonly PublicLeafView[]
  anchors: readonly Anchor[]
  // The head records the anchors commit, each with a consistency proof to the
  // pinned head. All three legs are needed: the chain carries the digest, the
  // digest pins the record, the log signature covers its size and root, and the
  // consistency proof shows it is an ANCESTOR of the tree the caller pinned. A
  // correctly signed head on a different branch satisfies the first three.
  anchoredHeads?: readonly AnchoredHeadView[]
}

// Only what the log actually authenticates, plus where it was anchored. Every
// other attribute is DECODED from the bytes, never accepted alongside them: a
// sibling field can relabel a genuinely included leaf and falsify every count.
export type PublicLeafView = {
  index: number
  bytes: Uint8Array
  inclusionProof: readonly Uint8Array[]
}

export type AnchoredHeadView = {
  head: SignedTreeHeadV1
  consistencyProof: readonly Uint8Array[]
}

export type DecodedLeaf = {
  view: PublicLeafView
  fields: LogLeafV1
}

// parseLeaf reads .length before its own guards, so null or undefined bytes
// escape as a TypeError instead of counting as undecodable.
export function decodeLeaves(leaves: readonly PublicLeafView[]): DecodedLeaf[] {
  return leaves.flatMap((view) => {
    try {
      const fields = parseLeaf(view.bytes)
      return fields ? [{ view, fields }] : []
    } catch {
      return []
    }
  })
}

// Decoding proves a leaf parses. Only an inclusion proof under a head this
// log signed proves the log actually holds it, and one index yields one leaf.
function includedLeaves(
  head: SafeHead,
  leaves: readonly SafeLeafView[],
): DecodedLeaf[] {
  const byIndex = new Map<number, DecodedLeaf>()
  for (const leaf of decodeLeaves(leaves)) {
    const { index, bytes, inclusionProof } = leaf.view
    if (byIndex.has(index)) continue
    let included = false
    try {
      included = verifyInclusion(
        bytes,
        index,
        head.treeSize,
        [...inclusionProof],
        head.rootHash,
      )
    } catch {
      included = false
    }
    if (included) byIndex.set(index, leaf)
  }
  return [...byIndex.values()]
}

export type KeylessVerifier = {
  readonly evidenceKeys: EvidencePublicKeys
  readonly witnessPolicy: WitnessPolicy | null
  readonly heartbeatIntervalBlocks: number
  readonly logPublicKey: Uint8Array
  readonly congestionPolicy: CongestionPolicy
  readonly chainValidator: ChainValidator
}

export type KeylessInputs = {
  evidenceKeys: EvidencePublicKeys
  congestionPolicy: CongestionPolicy
  minConfirmations?: number
  // Absent means no witnessing, which is the pre-witness behaviour and is
  // reported as such rather than silently treated as witnessed.
  witnessPolicy?: WitnessPolicy
  // 0 disables the check, which is the pre-heartbeat behaviour.
  heartbeatIntervalBlocks?: number
}

export function createKeylessVerifier(inputs: KeylessInputs): KeylessVerifier {
  return {
    evidenceKeys: inputs.evidenceKeys,
    witnessPolicy: inputs.witnessPolicy ?? null,
    heartbeatIntervalBlocks: inputs.heartbeatIntervalBlocks ?? 0,
    logPublicKey: inputs.evidenceKeys.logPublicKey,
    congestionPolicy: inputs.congestionPolicy,
    chainValidator: createChainValidator({
      minConfirmations:
        inputs.minConfirmations ?? inputs.evidenceKeys.minConfirmations,
    }),
  }
}

// Every head reaching this module is presenter-controlled. verifyHead encodes
// the tree size as u32be and reads a fixed-length signature, so a junk head
// throws where the caller expects a verdict.
function safeVerifyHead(publicKey: Uint8Array, head: SafeHead): boolean {
  try {
    return verifyHead(publicKey, head)
  } catch {
    return false
  }
}

export function verifyLeafInclusion(
  verifier: KeylessVerifier,
  leaf: PublicLeafView,
  head: SignedTreeHead,
  proof: readonly Uint8Array[],
): string | null {
  const safeHead = readHead(head)
  if (!safeVerifyHead(verifier.logPublicKey, safeHead)) {
    return 'tree head signature does not verify'
  }
  const view = readLeafView({ ...leaf, inclusionProof: proof })
  return provesInclusion(safeHead, view)
    ? null
    : 'leaf is not included under this head'
}

export function verifyHeadConsistency(
  verifier: KeylessVerifier,
  oldHead: SignedTreeHead,
  newHead: SignedTreeHead,
  proof: readonly Uint8Array[],
): string | null {
  if (!safeVerifyHead(verifier.logPublicKey, readHead(oldHead))) {
    return 'old tree head signature does not verify'
  }
  if (!safeVerifyHead(verifier.logPublicKey, readHead(newHead))) {
    return 'new tree head signature does not verify'
  }
  return verifyConsistency(oldHead, newHead, [...proof])
    ? null
    : 'heads are not consistent'
}

export function verifyAnchor(
  verifier: KeylessVerifier,
  chain: SimBitcoin,
  anchor: Anchor,
): ChainVerdict {
  return validateAnchor(verifier.chainValidator, chain, anchor)
}

export function reconcileAgainstDocket(
  sightings: readonly UnsealSighting[],
  docket: readonly DocketRecord[],
  horizon: DocketHorizon,
): ReconcileEntry[] {
  return reconcile([...sightings], [...docket], horizon)
}

// Two signed heads at one tree size with different roots is equivocation the
// log cannot explain away: both signatures are its own.
export function detectEquivocation(
  verifier: KeylessVerifier,
  heads: readonly SignedTreeHead[],
): string | null {
  const bySize = new Map<number, string>()
  const byRoot = new Map<string, number>()
  for (const head of readHeads(heads)) {
    if (!safeVerifyHead(verifier.logPublicKey, head)) continue
    const root = toHex(head.rootHash)
    const seen = bySize.get(head.treeSize)
    if (seen !== undefined && seen !== root) {
      return `log equivocated at tree size ${head.treeSize}`
    }
    // An append-only tree cannot hold one root at two sizes. Without this a
    // second signed size for one root reopens the cross-size inclusion alias.
    const seenSize = byRoot.get(root)
    if (seenSize !== undefined && seenSize !== head.treeSize) {
      return `log signed one root at sizes ${seenSize} and ${head.treeSize}`
    }
    bySize.set(head.treeSize, root)
    byRoot.set(root, head.treeSize)
  }
  return null
}

export type ShareArtifact = {
  authorizationHash: string
  issuedByInterface: boolean
}

// A share the interface issued with no anchored leaf behind it is the shape a
// silent unseal takes, so it is flagged rather than ignored.
// Takes PROVEN leaves, never a raw view: an unproven leaf carrying the right
// hash would otherwise silence the alarm this function exists to raise.
export function verifyShareArtifact(
  artifact: ShareArtifact,
  proven: readonly DecodedLeaf[],
): string | null {
  if (!artifact.issuedByInterface) return null
  const anchored = proven.some(
    (leaf) =>
      toHex(leaf.fields.authorization_hash) === artifact.authorizationHash,
  )
  return anchored
    ? null
    : `share issued for ${artifact.authorizationHash} has no anchored leaf`
}

export function verifyBundle(
  verifier: KeylessVerifier,
  bundle: EvidenceBundleV1,
): string | null {
  return verifyEvidenceBundle(bundle, verifier.evidenceKeys)
}

export type TransparencyReport = {
  enrollmentsByEpoch: Record<number, number>
  unsealsByRole: Record<string, number>
  unsealsByTrack: Record<Track, number>
  currentDifficulty: number
  windowUnseals: number
  anchorsConfirmed: number
  anchorsPending: number
  // Anchors the caller supplied that the chain does not back at all.
  anchorsUnbacked: number
  // Unseal leaves with no anchored head covering their index. An unseal the log
  // holds and the chain never witnessed is exactly what an audit looks for.
  unanchoredUnseals: number
  treeSize: number
  rootHistory: string[]
  disclosures: number
  // Caller-supplied. See the note on ReportInputs: this is the one counter an
  // outsider cannot reproduce from the log alone.
  closures: number
  // False unless the latest head verifies under the pinned log key. Every
  // counter below is zero when it is false: an unsigned head proves nothing.
  headVerified: boolean
  // How many pinned witnesses countersigned the head, and whether that meets
  // the policy. `null` means the deployment has no witnesses, which is a
  // weaker position than zero and must not read the same.
  witnessCount: number | null
  witnessed: boolean
  // Blocks since the most recent heartbeat, and whether that exceeds the
  // promised cadence. `null` means the log never published one, which is a
  // breach from the first interval onward rather than a clean slate.
  heartbeatGapBlocks: number | null
  heartbeatBreached: boolean
  // Non-null when two heads this log signed disagree at one tree size. Every
  // counter is zeroed, because a forked log cannot be counted.
  equivocation: string | null
  // Three distinct causes, kept apart: one merged counter let an attacker pad
  // it with copies of a genuine leaf and drown a real failure.
  unparsable: number
  notIncluded: number
  duplicates: number
  // Proven leaves whose own fields contradict each other, so no other counter
  // can classify them. Never silently dropped.
  mismatched: number
  missingFromView: number
  unmatchedPastHorizon: number
  // Whether the work chain across ALL unseals holds. 'unknown' when the view is
  // short of the pinned tree: a partial log cannot answer this.
  congestionChain: ChainVerdict2
  congestionChainBreaks: number
}

// issuing_role is a free-form string, so a leaf may carry `__proto__` or
// `constructor`. On a bare literal the first vanishes and the second folds into
// the Object constructor, turning a count into a string.
function countBy<T, K extends string | number>(
  items: readonly T[],
  key: (item: T) => K,
): Record<K, number> {
  const out = Object.create(null) as Record<K, number>
  for (const item of items) {
    const k = key(item)
    out[k] = (out[k] ?? 0) + 1
  }
  // Spread copies own keys without running the __proto__ setter, so the counts
  // survive and the result still compares as an ordinary object.
  return { ...out }
}

const UNSEAL_LEAF_TYPE_FOR_TRACK: Record<Track, string> = {
  standard: 'UNSEAL_STANDARD',
  emergency: 'UNSEAL_EMERGENCY',
}

const UNSEAL_LEAF_TYPES: ReadonlySet<string> = new Set(
  Object.values(UNSEAL_LEAF_TYPE_FOR_TRACK),
)

// Every counter here except `closures` is recomputed from the public log
// (spec 17.1), so an outsider reproduces the same numbers. `closures` counts
// the caller's docket, which is operator state: two outsiders holding one log
// and different dockets print different values for it.
export type ReportInputs = {
  log: PublicLogView
  chain: SimBitcoin
  docket: readonly DocketRecord[]
  horizon: DocketHorizon
  // Obtained out of band, e.g. from a witness or a prior gossip round.
  pinnedHead: SignedTreeHead
  // The witness signatures over `pinnedHead`, if the deployment has witnesses.
  cosignatures?: readonly Uint8Array[]
}

export function provenLeaves(
  verifier: KeylessVerifier,
  head: SignedTreeHead,
  log: PublicLogView,
): DecodedLeaf[] {
  const safeHead = readHead(head)
  return safeVerifyHead(verifier.logPublicKey, safeHead)
    ? includedLeaves(safeHead, readLeafViews(log.leaves))
    : []
}

type LeafCounts = {
  unparsable: number
  notIncluded: number
  duplicates: number
  // A leaf the log authenticates whose own fields disagree. Without this it
  // fell between `unseals` and every other set and no counter recorded it, so
  // relabelling one field hid a real unseal from the whole report.
  mismatched: number
}

function classifyLeaves(
  head: SafeHead,
  views: readonly SafeLeafView[],
): { leaves: DecodedLeaf[]; counts: LeafCounts; accountedFor: number } {
  const byIndex = new Map<number, DecodedLeaf>()
  const counts: LeafCounts = {
    unparsable: 0,
    notIncluded: 0,
    duplicates: 0,
    mismatched: 0,
  }
  let accountedFor = 0
  for (const view of views) {
    const fields = safeReadLeaf(view)
    if (!fields) {
      if (isAccountedFor(view.bytes) && provesInclusion(head, view)) {
        accountedFor++
      } else {
        counts.unparsable++
      }
      continue
    }
    if (!provesInclusion(head, view)) {
      counts.notIncluded++
      continue
    }
    if (byIndex.has(view.index)) {
      counts.duplicates++
      continue
    }
    byIndex.set(view.index, { view, fields })
  }
  return { leaves: [...byIndex.values()], counts, accountedFor }
}

// A closing leaf uses its own encoding, so the strict LogLeafV1 decoder
// rejects it. Counting those rejections as MISSING made the chain walk report
// `unknown` on every log a real ceremony produces, because each ceremony
// appends one. A leaf that decodes as either shape is accounted for.
function isAccountedFor(bytes: Uint8Array): boolean {
  try {
    return decodeClosingLeafV1(bytes) !== null
  } catch {
    return false
  }
}

function safeReadLeaf(view: PublicLeafView): LogLeafV1 | null {
  try {
    return parseLeaf(view.bytes)
  } catch {
    return null
  }
}

// ONE normalization boundary for everything the presenter supplies.
//
// Five separate arrays each grew the same three holes: a hostile getter read
// twice returning two values, duplicates inflating a count, and a malformed
// entry throwing instead of refusing. Five per-site fixes did not stop the
// sixth array from growing them again. So nothing below this point reads a
// caller object. Every value is copied out once, validated once, and deduped
// once, and the counters see only the result.

const EMPTY_BYTES = new Uint8Array(0)

function readBytes(value: unknown): Uint8Array {
  return value instanceof Uint8Array ? Uint8Array.from(value) : EMPTY_BYTES
}

// The pinned head decides which anchored trees are admissible, so it is read
// once and copied. A getter answering differently on each of three reads made
// the report disagree with itself.
// The `normalized` marker makes these NOMINAL. Copying a value is not enough:
// `anchoredHeads` was copied for a round and still slipped, because its type was
// the caller's own and nothing stopped a raw value reaching a counter. A raw
// SignedTreeHead cannot satisfy SafeHead, so the compiler holds the line.
export type SafeHead = SignedTreeHead & { readonly normalized: true }
export type SafeLeafView = PublicLeafView & { readonly normalized: true }

function readHead(head: SignedTreeHead): SafeHead {
  try {
    const treeSize = head?.treeSize
    const treeId = head?.treeId
    return {
      treeId: typeof treeId === 'string' ? treeId : '',
      treeSize: Number.isSafeInteger(treeSize) ? treeSize : -1,
      rootHash: readBytes(head?.rootHash),
      signature: readBytes(head?.signature),
      normalized: true,
    }
  } catch {
    return {
      treeId: '',
      treeSize: -1,
      rootHash: EMPTY_BYTES,
      signature: EMPTY_BYTES,
      normalized: true,
    }
  }
}

function readHeads(heads: readonly SignedTreeHead[]): SafeHead[] {
  try {
    return [...heads].map(readHead)
  } catch {
    return []
  }
}

// Leaves were left raw when the anchors were normalized. `view.index` was read
// five times, so a getter could be one leaf for the counters and another for
// the anchor lookup.
function readLeafView(view: PublicLeafView): SafeLeafView {
  try {
    const index = view?.index
    const proof = view?.inclusionProof
    return {
      index: Number.isSafeInteger(index) ? index : -1,
      bytes: readBytes(view?.bytes),
      inclusionProof: Array.isArray(proof) ? proof.map(readBytes) : [],
      normalized: true,
    }
  } catch {
    return {
      index: -1,
      bytes: EMPTY_BYTES,
      inclusionProof: [],
      normalized: true,
    }
  }
}

function readLeafViews(views: readonly PublicLeafView[]): SafeLeafView[] {
  try {
    return [...views].map(readLeafView)
  } catch {
    return []
  }
}

// SimBitcoin is a live object the caller owns, and `confirmations` is a method
// it can replace. Depth is recomputed here from the block array instead.
type SafeChain = { payloads: (Uint8Array | null)[]; tipHeight: number }

function readChain(chain: SimBitcoin): SafeChain {
  try {
    const blocks = [...chain.blocks]
    return {
      payloads: blocks.map((block) =>
        block?.payload instanceof Uint8Array
          ? Uint8Array.from(block.payload)
          : null,
      ),
      tipHeight: blocks.length - 1,
    }
  } catch {
    return { payloads: [], tipHeight: -1 }
  }
}

function confirmationsAt(chain: SafeChain, height: number): number {
  return chain.tipHeight - height + 1
}

type SafeAnchor = { sthHash: Uint8Array; blockHeight: number | null }

function readAnchor(anchor: Anchor): SafeAnchor | null {
  try {
    if (anchor === null || typeof anchor !== 'object') return null
    const height = anchor.blockHeight
    const digest = anchor.sthHash
    return {
      sthHash:
        digest instanceof Uint8Array ? Uint8Array.from(digest) : EMPTY_BYTES,
      blockHeight: Number.isSafeInteger(height) ? height : null,
    }
  } catch {
    return null
  }
}

function anchorKey(anchor: SafeAnchor): string {
  return `${anchor.blockHeight ?? 'malformed'}:${toHex(anchor.sthHash)}`
}

// One anchor repeated is one anchor. Malformed entries keep a key rather than
// vanishing, so they still reach the unbacked counter.
function readAnchors(anchors: readonly Anchor[]): SafeAnchor[] {
  const byKey = new Map<string, SafeAnchor>()
  for (const raw of anchors) {
    const anchor = readAnchor(raw) ?? {
      sthHash: EMPTY_BYTES,
      blockHeight: null,
    }
    byKey.set(anchorKey(anchor), anchor)
  }
  return [...byKey.values()]
}

function backedByChain(chain: SafeChain, anchor: SafeAnchor): boolean {
  if (anchor.blockHeight === null) return false
  const payload = chain.payloads[anchor.blockHeight]
  if (payload === undefined || payload === null) return false
  return bytesEqual(payload, anchor.sthHash)
}

function provesInclusion(head: SafeHead, view: SafeLeafView): boolean {
  try {
    return verifyInclusion(
      view.bytes,
      view.index,
      head.treeSize,
      [...view.inclusionProof],
      head.rootHash,
    )
  } catch {
    return false
  }
}

// The `normalized` marker is what makes this NOMINAL: a raw AnchoredHeadView
// cannot satisfy it, so the compiler refuses a presenter value where a safe one
// is expected. `SafeAnchor` and `SafeChain` already work this way. This array
// was the sixth to grow the same hole because its type was the caller's own,
// and enumerating inputs by hand is discipline, not enforcement.
type SafeAnchoredHead = {
  readonly head: SignedTreeHeadV1
  readonly consistencyProof: readonly Uint8Array[]
  readonly normalized: true
}

function readAnchoredHead(entry: AnchoredHeadView): SafeAnchoredHead | null {
  try {
    const head = entry?.head
    if (head === null || typeof head !== 'object') return null
    const proof = entry.consistencyProof
    return {
      // One spread reads every field exactly once, so a getter cannot answer
      // the size checks honestly and the coverage decision differently.
      head: { ...head },
      consistencyProof: Array.isArray(proof) ? proof.map(readBytes) : [],
      normalized: true,
    }
  } catch {
    return null
  }
}

function readAnchoredHeads(
  entries: readonly AnchoredHeadView[],
): SafeAnchoredHead[] {
  try {
    // Reference dedupe BEFORE normalizing. Normalizing first makes every entry a
    // fresh object, which silently undid D45: 200k copies of one head then cost
    // 200k spreads and 200k hashes instead of one.
    return [...new Set(entries)].flatMap(
      (entry) => readAnchoredHead(entry) ?? [],
    )
  } catch {
    return []
  }
}

// A leaf is anchored by the EARLIEST anchored head whose tree already held it.
type AnchoredTree = { height: number; treeSize: number }

function anchoredTreeFor(
  verifier: KeylessVerifier,
  entry: SafeAnchoredHead,
  pinned: SignedTreeHead,
  heightByDigest: ReadonlyMap<string, number>,
): AnchoredTree | null {
  // Null and hostile shapes reach the catch below, so no separate shape guard.
  try {
    const head = entry.head
    if (
      !safeVerifyHead(verifier.logPublicKey, readHead(coreSignedTreeHead(head)))
    ) {
      return null
    }
    // Signed, chain-backed and small enough still leaves a fork: a head on
    // another branch satisfies all three. Only consistency to the pinned head
    // shows this tree is the one the leaf was proven against.
    if (
      !verifyConsistency(coreSignedTreeHead(head), pinned, [
        ...entry.consistencyProof,
      ])
    ) {
      return null
    }
    // A size larger than the pinned tree is already refused by the consistency
    // proof above: verifyConsistency requires oldSize <= newSize. The separate
    // bound this used to carry was proven when it landed and became redundant
    // when the consistency check arrived. The mutation gate found it.
    if (!Number.isSafeInteger(head.tree_size)) return null
    const height = heightByDigest.get(toHex(hashSignedTreeHeadV1(head)))
    return height === undefined ? null : { height, treeSize: head.tree_size }
  } catch {
    return null
  }
}

// Folded with the LOWEST height per digest, never last-write-wins: one head
// anchored at two heights let array order alone move the reported window.
function anchoredTrees(
  verifier: KeylessVerifier,
  heads: readonly SafeAnchoredHead[],
  pinned: SignedTreeHead,
  backed: readonly SafeAnchor[],
): AnchoredTree[] {
  const heightByDigest = new Map<string, number>()
  for (const anchor of backed) {
    if (anchor.blockHeight === null) continue
    const key = toHex(anchor.sthHash)
    const seen = heightByDigest.get(key)
    if (seen === undefined || anchor.blockHeight < seen) {
      heightByDigest.set(key, anchor.blockHeight)
    }
  }
  // Deduped at the boundary by reference, so this loop sees one entry per
  // distinct caller object and hashSignedTreeHeadV1 runs once each.
  const byTree = new Map<string, AnchoredTree>()
  for (const head of heads) {
    const tree = anchoredTreeFor(verifier, head, pinned, heightByDigest)
    if (tree === null) continue
    byTree.set(`${tree.treeSize}:${tree.height}`, tree)
  }
  return [...byTree.values()]
}

// A reduce fold, never Math.min(...spread): 200k anchored heads overflowed the
// stack and crashed the report instead of refusing by name.
function anchorHeightFor(
  leafIndex: number,
  trees: readonly AnchoredTree[],
): number | null {
  return trees.reduce<number | null>(
    (best, tree) =>
      tree.treeSize > leafIndex && (best === null || tree.height < best)
        ? tree.height
        : best,
    null,
  )
}

export type ChainVerdict2 = 'intact' | 'broken' | 'unknown'

// Serialization is a LOG-WIDE property, so one bundle cannot show it. A bundle
// proves only that its link chains from some published start, and two unseals
// could name one predecessor and fork the chain while each verifies alone.
// Here every proven unseal leaf is walked in authenticated index order and each
// must recompute from the one before it. Fork, skipped predecessor, reordered
// chain and a second genesis all collapse into one failed adjacent-pair check.
//
// The verdict is 'unknown' whenever the view is short of the pinned tree. An
// auditor holding part of a log must not be told the chain is sound.
function safeChainedWork(
  previous: Uint8Array,
  preimage: Uint8Array,
  difficulty: number,
): Uint8Array | null {
  try {
    return chainedWork(previous, preimage, difficulty).output
  } catch {
    return null
  }
}

function walkCongestionChain(
  unseals: readonly DecodedLeaf[],
  complete: boolean,
  floor: number,
): { verdict: ChainVerdict2; breaks: number } {
  if (!complete) return { verdict: 'unknown', breaks: 0 }
  const ordered = [...unseals].sort((a, b) => a.view.index - b.view.index)
  let previous = STAMP_GENESIS
  let breaks = 0
  for (const leaf of ordered) {
    // The loop count comes from the leaf under audit, so serialization alone
    // says nothing about COST: twenty unseals at difficulty 0 chain perfectly
    // and take 2.6ms. The policy floor is the only outside number here.
    if (leaf.fields.congestion_difficulty < floor) {
      breaks += 1
      previous = leaf.fields.congestion_stamp_output
      continue
    }
    const expected = safeChainedWork(
      previous,
      congestionStampLeafHash(leaf.fields),
      leaf.fields.congestion_difficulty,
    )
    if (
      expected === null ||
      !bytesEqual(expected, leaf.fields.congestion_stamp_output)
    ) {
      breaks += 1
    }
    previous = leaf.fields.congestion_stamp_output
  }
  return { verdict: breaks === 0 ? 'intact' : 'broken', breaks }
}

// Builds the view from the log itself rather than from a caller's bag. The
// anchors and the head records still come from outside, because the chain and
// the anchor records are not the log's to serve.
// A head nobody but the log vouched for can be shown to one auditor alone.
// Counting the witnesses is what makes a split view cost more than lying.
function countWitnesses(
  verifier: KeylessVerifier,
  head: SafeHead,
  cosignatures: readonly Uint8Array[],
): { count: number | null; ok: boolean } {
  const policy = verifier.witnessPolicy
  if (policy === null) return { count: null, ok: false }
  try {
    const count = countCosignatures({ head, cosignatures }, policy)
    return { count, ok: count >= policy.threshold }
  } catch {
    return { count: 0, ok: false }
  }
}

// The heartbeat's freshness comes from the chain tip it names, never from a
// timestamp the operator writes. A self-authored clock lets a week of missing
// heartbeats be manufactured the moment somebody asks.
function heartbeatStatus(
  decoded: readonly DecodedLeaf[],
  tipHeight: number,
  intervalBlocks: number,
): { heartbeatGapBlocks: number | null; heartbeatBreached: boolean } {
  if (intervalBlocks <= 0) {
    return { heartbeatGapBlocks: null, heartbeatBreached: false }
  }
  const heights = decoded
    .filter((leaf) => leaf.fields.leaf_type === 'HEARTBEAT')
    .map((leaf) => leaf.fields.prev_unseal_anchor_ref)
    .filter((height): height is number => Number.isSafeInteger(height))
  if (heights.length === 0) {
    return { heartbeatGapBlocks: null, heartbeatBreached: true }
  }
  const gap = tipHeight - Math.max(...heights)
  return { heartbeatGapBlocks: gap, heartbeatBreached: gap > intervalBlocks }
}

export function viewFromLog(
  log: TransparencyLog,
  anchors: readonly Anchor[] = [],
  anchoredHeads: readonly AnchoredHeadView[] = [],
): PublicLogView {
  const head = log.signHead()
  return { heads: [head], leaves: log.serveLeaves(), anchors, anchoredHeads }
}

export function transparencyReport(
  verifier: KeylessVerifier,
  inputs: ReportInputs,
): TransparencyReport {
  const { docket } = inputs
  // EVERY presenter input crosses the boundary here, not just the anchors.
  // Leaving four of them raw is how the same three holes reappeared.
  const chain = readChain(inputs.chain)
  const pinnedHead = readHead(inputs.pinnedHead)
  const log = {
    heads: readHeads(inputs.log?.heads ?? []),
    leaves: readLeafViews(inputs.log?.leaves ?? []),
    anchors: inputs.log?.anchors ?? [],
    anchoredHeads: readAnchoredHeads(inputs.log?.anchoredHeads ?? []),
  }
  // The horizon's tip is the chain's tip, never the caller's word for it.
  const horizon = {
    tipHeight: chain.tipHeight,
    horizonBlocks: Number.isSafeInteger(inputs.horizon?.horizonBlocks)
      ? inputs.horizon.horizonBlocks
      : 0,
  }
  // The head is PINNED by the caller from outside the view, not picked out
  // of it. Choosing the newest head in the array lets the presenter omit it
  // and show a stale one, hiding every leaf beyond it with no alarm.
  const head = pinnedHead
  const headVerified = safeVerifyHead(verifier.logPublicKey, head)
  const witness = countWitnesses(verifier, head, inputs.cosignatures ?? [])
  const equivocation = detectEquivocation(verifier, [head, ...log.heads])
  const {
    leaves: decoded,
    counts,
    accountedFor,
  } = classifyLeaves(head, log.leaves)
  const claimedUnseals = decoded.filter((leaf) =>
    UNSEAL_LEAF_TYPES.has(leaf.fields.leaf_type),
  )
  const unseals = claimedUnseals.filter(
    (leaf) =>
      leaf.fields.leaf_type === UNSEAL_LEAF_TYPE_FOR_TRACK[leaf.fields.track],
  )
  const mismatched = claimedUnseals.filter(
    (leaf) =>
      leaf.fields.leaf_type !== UNSEAL_LEAF_TYPE_FOR_TRACK[leaf.fields.track],
  )
  const enrollments = decoded.filter(
    (leaf) => leaf.fields.leaf_type === 'ENROLLMENT_ACCEPTED',
  )
  const suppliedAnchors = readAnchors(log.anchors)
  const realAnchors = suppliedAnchors.filter((anchor) =>
    backedByChain(chain, anchor),
  )
  // backedByChain already proved the height is a safe integer, so this reads
  // the normalized copy and never the caller's object a fifth time.
  const confirmed = realAnchors.filter(
    (anchor) =>
      anchor.blockHeight !== null &&
      confirmationsAt(chain, anchor.blockHeight) >=
        verifier.chainValidator.policy.minConfirmations,
  )
  const trees = anchoredTrees(verifier, log.anchoredHeads, head, realAnchors)
  const heights = unseals.map((leaf) => anchorHeightFor(leaf.view.index, trees))
  const anchorHeights = heights.filter((height) => height !== null)
  const entries = reconcileAgainstDocket(
    unseals.map((leaf) => ({
      authorizationHash: toHex(leaf.fields.authorization_hash),
      anchorHeight: anchorHeightFor(leaf.view.index, trees) ?? -1,
    })),
    docket,
    horizon,
  )
  const byTrack = countBy(unseals, (leaf) => leaf.fields.track)

  if (equivocation !== null || !headVerified) {
    // A counter derived from a head this log did not sign is worse than no
    // counter, so nothing below is reported at all.
    return {
      headVerified: false,
      witnessCount: witness.count,
      witnessed: witness.ok,
      heartbeatGapBlocks: null,
      heartbeatBreached: true,
      equivocation,
      enrollmentsByEpoch: {},
      unsealsByRole: {},
      unsealsByTrack: { standard: 0, emergency: 0 },
      currentDifficulty: 0,
      windowUnseals: 0,
      anchorsConfirmed: 0,
      anchorsPending: 0,
      anchorsUnbacked: 0,
      unanchoredUnseals: 0,
      treeSize: 0,
      rootHistory: [],
      disclosures: 0,
      closures: 0,
      unparsable: 0,
      notIncluded: 0,
      duplicates: 0,
      mismatched: 0,
      missingFromView: 0,
      unmatchedPastHorizon: 0,
      congestionChain: 'unknown',
      congestionChainBreaks: 0,
    }
  }

  return {
    enrollmentsByEpoch: countBy(
      enrollments,
      (leaf) => leaf.fields.escrow_epoch,
    ),
    unsealsByRole: countBy(unseals, (leaf) => leaf.fields.issuing_role),
    unsealsByTrack: {
      standard: byTrack.standard ?? 0,
      emergency: byTrack.emergency ?? 0,
    },

    currentDifficulty: requiredDifficulty(
      verifier.congestionPolicy,
      windowCount(verifier.congestionPolicy, anchorHeights, chain.tipHeight),
    ),
    windowUnseals: windowCount(
      verifier.congestionPolicy,
      anchorHeights,
      chain.tipHeight,
    ),
    anchorsConfirmed: confirmed.length,
    anchorsPending: realAnchors.length - confirmed.length,
    anchorsUnbacked: suppliedAnchors.length - realAnchors.length,
    unanchoredUnseals: heights.filter((height) => height === null).length,
    treeSize: head.treeSize,
    rootHistory: [
      ...new Set(
        log.heads
          .filter((entry) => safeVerifyHead(verifier.logPublicKey, entry))
          .map((entry) => `${entry.treeSize}:${toHex(entry.rootHash)}`),
      ),
    ].map((entry) => entry.split(':')[1]?.slice(0, 16) ?? ''),
    disclosures: decoded.filter(
      (leaf) => leaf.fields.leaf_type === 'DISCLOSURE',
    ).length,
    closures: docket.length,
    headVerified,
    witnessCount: witness.count,
    witnessed: witness.ok,
    ...heartbeatStatus(
      decoded,
      chain.tipHeight,
      verifier.heartbeatIntervalBlocks,
    ),
    equivocation,
    // Leaves the caller supplied that this build could not prove are in the
    // log, and leaves the head says exist that the caller did not supply.
    unparsable: counts.unparsable,
    notIncluded: counts.notIncluded,
    duplicates: counts.duplicates,
    mismatched: mismatched.length,
    missingFromView: head.treeSize - decoded.length - accountedFor,
    ...(() => {
      const walk = walkCongestionChain(
        unseals,
        head.treeSize - decoded.length - accountedFor === 0,
        verifier.congestionPolicy.dFloor,
      )
      return {
        congestionChain: walk.verdict,
        congestionChainBreaks: walk.breaks,
      }
    })(),
    unmatchedPastHorizon: entries.filter((entry) => entry.status === 'overdue')
      .length,
  }
}

export const KEYLESS_TRACKS = TRACKS

export type KeylessDelayView = {
  delayParams: LhtlpParams
  expectedVtdProfile: VtdProfile
}
