import { bytesEqual } from './bytes.ts'
import { DecodeError, Reader, Writer } from './encode.ts'
import { hash } from './hash.ts'
import { LIMITS } from './limits.ts'
import { decodeAccountId, encodeAccountId } from './ops.ts'
import { PROGRAM } from './program.ts'
import type { Smt } from './smt.ts'
import {
  accountKey,
  decodeAccount,
  decodeTransferLogV1,
  transfersKey,
} from './state.ts'
import {
  type AccessV1,
  decodeAccess,
  encodeAccess,
  ProvingView,
  ReplayError,
  ReplayView,
  type StateView,
} from './view.ts'

export const REQ = { GET_BALANCE: 1, LIST_TRANSFERS: 2 } as const

export type QueryRequestV1 = {
  requestType: number
  requestVersion: number
  body: Uint8Array
}

export function encodeQueryRequest(req: QueryRequestV1): Uint8Array {
  const w = new Writer()
  w.u16(req.requestType)
  w.u16(req.requestVersion)
  w.bytes(req.body, LIMITS.payload)
  return w.done()
}

export function decodeQueryRequest(buf: Uint8Array): QueryRequestV1 {
  const r = new Reader(buf)
  const requestType = r.u16()
  const requestVersion = r.u16()
  const body = r.bytes(LIMITS.payload)
  r.finish()
  return { requestType, requestVersion, body }
}

export type GetBalanceBodyV1 = { accountId: string }

export function encodeGetBalanceBody(b: GetBalanceBodyV1): Uint8Array {
  const w = new Writer()
  encodeAccountId(w, b.accountId)
  return w.done()
}

export function decodeGetBalanceBody(buf: Uint8Array): GetBalanceBodyV1 {
  const r = new Reader(buf)
  const accountId = decodeAccountId(r)
  r.finish()
  return { accountId }
}

const LIST_TRANSFERS_LIMIT_MAX = LIMITS.transferLogEntries

export type ListTransfersBodyV1 = { accountId: string; limit: number }

export function encodeListTransfersBody(b: ListTransfersBodyV1): Uint8Array {
  if (b.limit > LIST_TRANSFERS_LIMIT_MAX) {
    throw new RangeError(
      `limit must be 0-${LIST_TRANSFERS_LIMIT_MAX}, got ${b.limit}`,
    )
  }
  const w = new Writer()
  encodeAccountId(w, b.accountId)
  w.u16(b.limit)
  return w.done()
}

export function decodeListTransfersBody(buf: Uint8Array): ListTransfersBodyV1 {
  const r = new Reader(buf)
  const accountId = decodeAccountId(r)
  const limit = r.u16()
  r.finish()
  if (limit > LIST_TRANSFERS_LIMIT_MAX) {
    throw new DecodeError(
      `limit must be 0-${LIST_TRANSFERS_LIMIT_MAX}, got ${limit}`,
    )
  }
  return { accountId, limit }
}

export type BalanceResultV1 = { exists: boolean; balance: bigint }

export function encodeBalanceResult(b: BalanceResultV1): Uint8Array {
  const w = new Writer()
  w.bool(b.exists)
  w.u64(b.balance)
  return w.done()
}

export function decodeBalanceResult(buf: Uint8Array): BalanceResultV1 {
  const r = new Reader(buf)
  const exists = r.bool()
  const balance = r.u64()
  r.finish()
  return { exists, balance }
}

export type TransfersResultV1 = { entries: Uint8Array[] }

export function encodeTransfersResult(t: TransfersResultV1): Uint8Array {
  const w = new Writer()
  w.list(t.entries, LIMITS.transferLogEntries, (entry) => {
    w.fixed(entry, 32)
  })
  return w.done()
}

export function decodeTransfersResult(buf: Uint8Array): TransfersResultV1 {
  const r = new Reader(buf)
  const entries = r.list(LIMITS.transferLogEntries, () => r.fixed(32))
  r.finish()
  return { entries }
}

export function requestHash(requestBytes: Uint8Array): Uint8Array {
  return hash('query-request', requestBytes)
}

export function resultHash(resultBytes: Uint8Array): Uint8Array {
  return hash('query-result', resultBytes)
}

export type QueryJournalV1 = {
  stateRoot: Uint8Array
  stateSequence: bigint
  requestHash: Uint8Array
  resultHash: Uint8Array
  queryProgramId: Uint8Array
  programChainHash: Uint8Array
}

export function encodeQueryJournal(j: QueryJournalV1): Uint8Array {
  const w = new Writer()
  w.fixed(j.stateRoot, 32)
  w.u64(j.stateSequence)
  w.fixed(j.requestHash, 32)
  w.fixed(j.resultHash, 32)
  w.fixed(j.queryProgramId, 32)
  w.fixed(j.programChainHash, 32)
  return w.done()
}

export function decodeQueryJournal(buf: Uint8Array): QueryJournalV1 {
  const r = new Reader(buf)
  const stateRoot = r.fixed(32)
  const stateSequence = r.u64()
  const requestHashValue = r.fixed(32)
  const resultHashValue = r.fixed(32)
  const queryProgramId = r.fixed(32)
  const programChainHash = r.fixed(32)
  r.finish()
  return {
    stateRoot,
    stateSequence,
    requestHash: requestHashValue,
    resultHash: resultHashValue,
    queryProgramId,
    programChainHash,
  }
}

export type TransparentQueryProofV1 = {
  journal: Uint8Array
  requestBytes: Uint8Array
  accesses: AccessV1[]
}

export function encodeTransparentQueryProof(
  p: TransparentQueryProofV1,
): Uint8Array {
  const w = new Writer()
  w.bytes(p.journal, LIMITS.bytesField)
  w.bytes(p.requestBytes, LIMITS.bytesField)
  w.list(p.accesses, LIMITS.proofAccesses, (access) => {
    const accessBytes = encodeAccess(access)
    w.fixed(accessBytes, accessBytes.length)
  })
  return w.done()
}

export function decodeTransparentQueryProof(
  buf: Uint8Array,
): TransparentQueryProofV1 {
  const r = new Reader(buf)
  const journal = r.bytes(LIMITS.bytesField)
  const requestBytes = r.bytes(LIMITS.bytesField)
  const accesses = r.list(LIMITS.proofAccesses, () => decodeAccess(r))
  r.finish()
  return { journal, requestBytes, accesses }
}

export class QueryError extends Error {
  readonly rule: string

  constructor(rule: string) {
    super(rule)
    this.name = 'QueryError'
    this.rule = rule
  }
}

function decodePayload<T>(decode: () => T): T {
  try {
    return decode()
  } catch {
    throw new QueryError('payload')
  }
}

function isKnownQueryProgram(queryId: Uint8Array): boolean {
  return (
    bytesEqual(queryId, PROGRAM.queryV1) || bytesEqual(queryId, PROGRAM.queryV2)
  )
}

function runGetBalance(view: StateView, body: Uint8Array): Uint8Array {
  const parsed = decodePayload(() => decodeGetBalanceBody(body))
  const raw = view.get(accountKey(parsed.accountId))
  const result: BalanceResultV1 =
    raw === null
      ? { exists: false, balance: 0n }
      : { exists: true, balance: decodeAccount(raw).balance }
  return encodeBalanceResult(result)
}

function runListTransfers(view: StateView, body: Uint8Array): Uint8Array {
  const parsed = decodePayload(() => decodeListTransfersBody(body))
  const raw = view.get(transfersKey(parsed.accountId))
  const entries = raw === null ? [] : decodeTransferLogV1(raw).entries
  const tail = entries.slice(Math.max(0, entries.length - parsed.limit))
  return encodeTransfersResult({ entries: tail })
}

const REQUEST_HANDLERS: Record<
  number,
  (view: StateView, body: Uint8Array) => Uint8Array
> = {
  [REQ.GET_BALANCE]: runGetBalance,
  [REQ.LIST_TRANSFERS]: runListTransfers,
}

export function runQuery(
  view: StateView,
  requestBytes: Uint8Array,
  queryId: Uint8Array,
): Uint8Array {
  if (!isKnownQueryProgram(queryId)) throw new QueryError('unknown-program')
  const request = decodePayload(() => decodeQueryRequest(requestBytes))
  const handler = REQUEST_HANDLERS[request.requestType]
  if (!handler) throw new QueryError('unknown-request-type')
  return handler(view, request.body)
}

export function proveQuery(
  tree: Smt,
  requestBytes: Uint8Array,
  meta: {
    stateSequence: bigint
    queryProgramId: Uint8Array
    programChainHash: Uint8Array
  },
): { resultBytes: Uint8Array; proof: TransparentQueryProofV1 } {
  const view = new ProvingView(tree)
  const stateRoot = view.root()
  const resultBytes = runQuery(view, requestBytes, meta.queryProgramId)
  const journal: QueryJournalV1 = {
    stateRoot,
    stateSequence: meta.stateSequence,
    requestHash: requestHash(requestBytes),
    resultHash: resultHash(resultBytes),
    queryProgramId: meta.queryProgramId,
    programChainHash: meta.programChainHash,
  }
  return {
    resultBytes,
    proof: {
      journal: encodeQueryJournal(journal),
      requestBytes,
      accesses: view.accesses(),
    },
  }
}

export type QueryVerificationCode = 'JOURNAL_MISMATCH' | 'INVALID_PROOF'

export class QueryVerificationError extends Error {
  readonly code: QueryVerificationCode
  readonly rule: string

  constructor(code: QueryVerificationCode, rule: string) {
    super(`${code}: ${rule}`)
    this.name = 'QueryVerificationError'
    this.code = code
    this.rule = rule
  }
}

function checkJournalMatches(
  journal: QueryJournalV1,
  expected: QueryJournalV1,
): void {
  if (!bytesEqual(journal.stateRoot, expected.stateRoot)) {
    throw new QueryVerificationError('JOURNAL_MISMATCH', 'state-root')
  }
  if (journal.stateSequence !== expected.stateSequence) {
    throw new QueryVerificationError('JOURNAL_MISMATCH', 'state-sequence')
  }
  if (!bytesEqual(journal.requestHash, expected.requestHash)) {
    throw new QueryVerificationError('JOURNAL_MISMATCH', 'request-hash')
  }
  if (!bytesEqual(journal.resultHash, expected.resultHash)) {
    throw new QueryVerificationError('JOURNAL_MISMATCH', 'result-hash')
  }
  if (!bytesEqual(journal.queryProgramId, expected.queryProgramId)) {
    throw new QueryVerificationError('JOURNAL_MISMATCH', 'query-program-id')
  }
  if (!bytesEqual(journal.programChainHash, expected.programChainHash)) {
    throw new QueryVerificationError('JOURNAL_MISMATCH', 'program-chain-hash')
  }
}

export function verifyQuery(
  proof: TransparentQueryProofV1,
  expected: QueryJournalV1,
): void {
  const journal = decodeQueryJournal(proof.journal)
  checkJournalMatches(journal, expected)
  try {
    const view = new ReplayView(journal.stateRoot, proof.accesses.slice())
    const replayed = runQuery(view, proof.requestBytes, journal.queryProgramId)
    view.assertDrained()
    if (!bytesEqual(resultHash(replayed), journal.resultHash)) {
      throw new QueryError('result')
    }
  } catch (err) {
    if (err instanceof QueryError || err instanceof ReplayError) {
      throw new QueryVerificationError('INVALID_PROOF', err.rule)
    }
    throw err
  }
}
