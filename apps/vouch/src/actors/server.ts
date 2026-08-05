import type { ResponseBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import {
  ackSigningInput,
  decodeAuthorEvent,
  encodeWriteAck,
  type GlobalEventRecordV1,
  type WriteAckV1,
} from '../protocol/events.ts'
import type { World } from '../protocol/genesis.ts'
import {
  encodeLatestHead,
  type HeadIdV1,
  headSigningInput,
  type LatestHeadV1,
} from '../protocol/head.ts'
import { sign } from '../protocol/keys.ts'
import { OP } from '../protocol/ops.ts'
import { decodeMigration } from '../protocol/program.ts'
import {
  decodeQueryJournal,
  decodeTransparentQueryProof,
  encodeTransparentQueryProof,
  proveQuery,
  requestHash,
  resultHash,
  runQuery,
} from '../protocol/query.ts'
import {
  decodeQueryReceipt,
  encodeQueryReceipt,
  proofCacheKey,
  type QueryReceiptV1,
  receiptSigningInput,
} from '../protocol/receipt.ts'
import type { Smt } from '../protocol/smt.ts'
import {
  CHAIN_KEY,
  decodeChainStateV1,
  decodeSequenceV1,
  receiptKeyKey,
  SEQUENCE_KEY,
} from '../protocol/state.ts'
import {
  applyBatch,
  decodeTransitionJournal,
  encodeTransparentTransitionProof,
  proveBatch,
  type TransparentTransitionProofV1,
} from '../protocol/transition.ts'
import { type AccessV1, ReplayView, TreeView } from '../protocol/view.ts'

export const CLOCK_START_MS = 1_754_000_000_000n
export const CLOCK_STEP_MS = 1_000n
export const PROOF_WINDOW_MS = 30_000n
export const WRITE_ACK_WINDOW = 4n

export type SignedEventInput = {
  eventBytes: Uint8Array
  signature: Uint8Array
  eventHash: Uint8Array
}

export type SubmitInput = GlobalEventRecordV1 | SignedEventInput

export type SubmitResult = {
  ack: WriteAckV1
  ackBytes: Uint8Array
  signature: Uint8Array
}

export type ExecuteResult = {
  resultBytes: Uint8Array
  receiptBytes: Uint8Array
  receiptSig: Uint8Array
}

export type ProofForInput = {
  receiptBytes: Uint8Array
  sinceSequence: bigint
}

export type SignedHeadResult = {
  headBytes: Uint8Array
  sig: Uint8Array
}

function isFullRecord(input: SubmitInput): input is GlobalEventRecordV1 {
  return 'globalSequence' in input
}

function requireValue(tree: Smt, key: Uint8Array): Uint8Array {
  const value = tree.get(key)
  if (value === null) throw new RangeError('server: missing required state key')
  return value
}

function receiptWitnessCacheKey(
  stateRoot: Uint8Array,
  receiptKeyId: Uint8Array,
): string {
  return `${hex(stateRoot)}:${hex(receiptKeyId)}`
}

export class Server {
  tree: Smt
  log: GlobalEventRecordV1[]
  world: World
  updateId: Uint8Array
  queryId: Uint8Array
  chainHash: Uint8Array
  proofCache: Map<string, Uint8Array>
  receiptKeyWitnessCache: Map<string, AccessV1>
  resultOverrides: Map<string, Uint8Array>
  clockMs: bigint
  sealedTransitions: TransparentTransitionProofV1[]

  constructor(world: World) {
    const chain = decodeChainStateV1(requireValue(world.tree, CHAIN_KEY))
    this.tree = world.tree
    this.log = []
    this.world = world
    this.updateId = chain.updateProgramId
    this.queryId = chain.queryProgramId
    this.chainHash = chain.chainHash
    this.proofCache = new Map()
    this.receiptKeyWitnessCache = new Map()
    this.resultOverrides = new Map()
    this.clockMs = CLOCK_START_MS
    this.sealedTransitions = []
  }

  submit(input: SubmitInput): SubmitResult {
    const sealedSequence = this.sealedSequence()
    const pending = this.pendingRecords(sealedSequence)
    const nextSequence = sealedSequence + BigInt(pending.length) + 1n
    const record = this.buildRecord(input, nextSequence)
    this.assertValid(pending, record)
    this.log.push(record)
    return this.acknowledge(record)
  }

  sealBatch(): TransparentTransitionProofV1 {
    const sealedSequence = this.sealedSequence()
    const pending = this.pendingRecords(sealedSequence)
    const proof = proveBatch(this.tree, pending, this.updateId)
    this.sealedTransitions.push(proof)
    this.syncEra()
    this.tick()
    return proof
  }

  execute(requestBytes: Uint8Array, nonce: Uint8Array): ExecuteResult {
    const stateSequence = this.sealedSequence()
    const resultBytes = runQuery(
      new TreeView(this.tree),
      requestBytes,
      this.queryId,
    )
    const issuedAtMs = this.tick()
    const receipt: QueryReceiptV1 = {
      receiptKeyId: this.world.receiptKey.publicKey,
      stateRoot: this.tree.root(),
      stateSequence,
      requestHash: requestHash(requestBytes),
      resultHash: resultHash(resultBytes),
      queryProgramId: this.queryId,
      programChainHash: this.chainHash,
      nonce,
      issuedAtMs,
      proofDeadlineMs: issuedAtMs + PROOF_WINDOW_MS,
    }
    const receiptBytes = encodeQueryReceipt(receipt)
    const receiptSig = sign(
      receiptSigningInput(receiptBytes),
      this.world.receiptKey,
    )
    this.cacheQueryProof(requestBytes, receipt)
    return { resultBytes, receiptBytes, receiptSig }
  }

  proofFor(input: ProofForInput): ResponseBundle {
    const receipt = decodeQueryReceipt(input.receiptBytes)
    const cacheKey = hex(
      proofCacheKey(
        receipt.queryProgramId,
        receipt.stateRoot,
        receipt.requestHash,
      ),
    )
    const queryProofBytes = this.proofCache.get(cacheKey)
    if (!queryProofBytes) {
      throw new RangeError('server: no cached query proof for this receipt')
    }
    const { requestBytes } = decodeTransparentQueryProof(queryProofBytes)
    const now = this.tick()
    const { headBytes, sig } = this.signHead(now)
    return {
      canonicalRequest: requestBytes,
      canonicalResult: this.canonicalResultFor(
        input.receiptBytes,
        queryProofBytes,
      ),
      receipt: input.receiptBytes,
      receiptSignature: sign(
        receiptSigningInput(input.receiptBytes),
        this.world.receiptKey,
      ),
      receiptKeyWitness: this.cachedReceiptKeyWitness(receipt),
      queryProof: queryProofBytes,
      transitions: this.transitionsSince(input.sinceSequence),
      migrations: this.migrationsSince(
        input.sinceSequence,
        receipt.stateSequence,
      ),
      latestHead: headBytes,
      latestHeadSignature: sig,
    }
  }

  signedHead(latestAsOfMs: bigint = this.tick()): SignedHeadResult {
    return this.signHead(latestAsOfMs)
  }

  private tick(): bigint {
    const now = this.clockMs
    this.clockMs += CLOCK_STEP_MS
    return now
  }

  private sealedSequence(): bigint {
    return decodeSequenceV1(requireValue(this.tree, SEQUENCE_KEY)).value
  }

  private pendingRecords(sealedSequence: bigint): GlobalEventRecordV1[] {
    return this.log.filter((record) => record.globalSequence > sealedSequence)
  }

  private buildRecord(
    input: SubmitInput,
    nextSequence: bigint,
  ): GlobalEventRecordV1 {
    if (isFullRecord(input)) return input
    return {
      globalSequence: nextSequence,
      eventHash: input.eventHash,
      authorEvent: input.eventBytes,
      authorSignature: input.signature,
    }
  }

  private assertValid(
    pending: GlobalEventRecordV1[],
    record: GlobalEventRecordV1,
  ): void {
    const probe = new TreeView(this.tree.clone())
    applyBatch(probe, [...pending, record], this.updateId)
  }

  private acknowledge(record: GlobalEventRecordV1): SubmitResult {
    const acceptedAtMs = this.tick()
    const ack: WriteAckV1 = {
      eventHash: record.eventHash,
      acceptedAtMs,
      acceptedAgainstSequence: record.globalSequence - 1n,
      mustLandBySequence: record.globalSequence + WRITE_ACK_WINDOW,
      receiptKeyId: this.world.receiptKey.publicKey,
    }
    const ackBytes = encodeWriteAck(ack)
    const signature = sign(ackSigningInput(ackBytes), this.world.receiptKey)
    return { ack, ackBytes, signature }
  }

  private syncEra(): void {
    const chain = decodeChainStateV1(requireValue(this.tree, CHAIN_KEY))
    this.updateId = chain.updateProgramId
    this.queryId = chain.queryProgramId
    this.chainHash = chain.chainHash
  }

  private cacheQueryProof(
    requestBytes: Uint8Array,
    receipt: QueryReceiptV1,
  ): void {
    this.cacheQueryProofBytes(requestBytes, receipt)
    this.cacheReceiptKeyWitness(receipt)
  }

  private cacheQueryProofBytes(
    requestBytes: Uint8Array,
    receipt: QueryReceiptV1,
  ): void {
    const cacheKey = hex(
      proofCacheKey(
        receipt.queryProgramId,
        receipt.stateRoot,
        receipt.requestHash,
      ),
    )
    if (this.proofCache.has(cacheKey)) return
    const { proof } = proveQuery(this.tree, requestBytes, {
      stateSequence: receipt.stateSequence,
      queryProgramId: receipt.queryProgramId,
      programChainHash: receipt.programChainHash,
    })
    this.proofCache.set(cacheKey, encodeTransparentQueryProof(proof))
  }

  private cacheReceiptKeyWitness(receipt: QueryReceiptV1): void {
    const witnessKey = receiptWitnessCacheKey(
      receipt.stateRoot,
      receipt.receiptKeyId,
    )
    if (this.receiptKeyWitnessCache.has(witnessKey)) return
    this.receiptKeyWitnessCache.set(
      witnessKey,
      this.receiptKeyWitnessFor(receipt.receiptKeyId),
    )
  }

  private replayResult(queryProofBytes: Uint8Array): Uint8Array {
    const proof = decodeTransparentQueryProof(queryProofBytes)
    const journal = decodeQueryJournal(proof.journal)
    const view = new ReplayView(journal.stateRoot, proof.accesses.slice())
    return runQuery(view, proof.requestBytes, journal.queryProgramId)
  }

  private canonicalResultFor(
    receiptBytes: Uint8Array,
    queryProofBytes: Uint8Array,
  ): Uint8Array {
    const override = this.resultOverrides.get(
      hex(receiptSigningInput(receiptBytes)),
    )
    return override ?? this.replayResult(queryProofBytes)
  }

  private receiptKeyWitnessFor(keyId: Uint8Array): AccessV1 {
    const key = receiptKeyKey(keyId)
    return {
      op: 1,
      key,
      value: this.tree.get(key),
      witness: this.tree.witness(key),
    }
  }

  private cachedReceiptKeyWitness(receipt: QueryReceiptV1): AccessV1 {
    const witnessKey = receiptWitnessCacheKey(
      receipt.stateRoot,
      receipt.receiptKeyId,
    )
    const witness = this.receiptKeyWitnessCache.get(witnessKey)
    if (!witness) {
      throw new RangeError(
        'server: no cached receipt-key witness for this receipt',
      )
    }
    return witness
  }

  private transitionsSince(sinceSequence: bigint): Uint8Array[] {
    return this.sealedTransitions
      .filter(
        (proof) =>
          decodeTransitionJournal(proof.journal).endSequence > sinceSequence,
      )
      .map((proof) => encodeTransparentTransitionProof(proof))
  }

  private migrationsSince(
    sinceSequence: bigint,
    endSequence: bigint,
  ): Uint8Array[] {
    return this.log
      .map((record) => decodeAuthorEvent(record.authorEvent))
      .filter((event) => event.operation === OP.COMMIT_MIGRATION)
      .map((event) => event.payload)
      .filter((payload) => {
        const activation = decodeMigration(payload).activationSequence
        return activation > sinceSequence && activation <= endSequence
      })
  }

  private currentHeadId(): HeadIdV1 {
    return {
      sequence: this.sealedSequence(),
      stateRoot: this.tree.root(),
      updateProgramId: this.updateId,
      queryProgramId: this.queryId,
      programChainHash: this.chainHash,
    }
  }

  private signHead(latestAsOfMs: bigint): SignedHeadResult {
    const head: LatestHeadV1 = {
      head: this.currentHeadId(),
      latestAsOfMs,
      headKeyId: this.world.receiptKey.publicKey,
    }
    const headBytes = encodeLatestHead(head)
    const sig = sign(headSigningInput(headBytes), this.world.receiptKey)
    return { headBytes, sig }
  }
}
