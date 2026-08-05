import { Reader, Writer } from './encode.ts'
import { hash } from './hash.ts'
import { LIMITS } from './limits.ts'

export type QueryReceiptV1 = {
  receiptKeyId: Uint8Array
  stateRoot: Uint8Array
  stateSequence: bigint
  requestHash: Uint8Array
  resultHash: Uint8Array
  queryProgramId: Uint8Array
  programChainHash: Uint8Array
  nonce: Uint8Array
  issuedAtMs: bigint
  proofDeadlineMs: bigint
}

export function encodeQueryReceipt(receipt: QueryReceiptV1): Uint8Array {
  const w = new Writer()
  w.fixed(receipt.receiptKeyId, 32)
  w.fixed(receipt.stateRoot, 32)
  w.u64(receipt.stateSequence)
  w.fixed(receipt.requestHash, 32)
  w.fixed(receipt.resultHash, 32)
  w.fixed(receipt.queryProgramId, 32)
  w.fixed(receipt.programChainHash, 32)
  w.bytes(receipt.nonce, LIMITS.nonce)
  w.u64(receipt.issuedAtMs)
  w.u64(receipt.proofDeadlineMs)
  return w.done()
}

export function decodeQueryReceipt(buf: Uint8Array): QueryReceiptV1 {
  const r = new Reader(buf)
  const receiptKeyId = r.fixed(32)
  const stateRoot = r.fixed(32)
  const stateSequence = r.u64()
  const requestHash = r.fixed(32)
  const resultHash = r.fixed(32)
  const queryProgramId = r.fixed(32)
  const programChainHash = r.fixed(32)
  const nonce = r.bytes(LIMITS.nonce)
  const issuedAtMs = r.u64()
  const proofDeadlineMs = r.u64()
  r.finish()
  return {
    receiptKeyId,
    stateRoot,
    stateSequence,
    requestHash,
    resultHash,
    queryProgramId,
    programChainHash,
    nonce,
    issuedAtMs,
    proofDeadlineMs,
  }
}

export function receiptSigningInput(receiptBytes: Uint8Array): Uint8Array {
  return hash('query-receipt', receiptBytes)
}

export function proofCacheKey(
  queryProgramId: Uint8Array,
  stateRoot: Uint8Array,
  reqHash: Uint8Array,
): Uint8Array {
  return hash('proof-cache-key', queryProgramId, stateRoot, reqHash)
}
