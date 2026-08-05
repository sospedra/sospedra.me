import { ascii } from './bytes.ts'
import { Reader, Writer } from './encode.ts'
import { LIMITS } from './limits.ts'

export const OP = {
  OPEN_ACCOUNT: 1,
  TRANSFER: 2,
  SET_CONFIG: 16,
  COMMIT_MIGRATION: 17,
  SET_RECEIPT_KEY: 18,
  SET_AUTHOR: 19,
} as const

function validateAccountId(id: string): void {
  if (id.length === 0 || id.length > LIMITS.accountId) {
    throw new RangeError(
      `accountId must be 1-${LIMITS.accountId} bytes, got ${id.length}`,
    )
  }
  const bytes = ascii(id)
  for (const byte of bytes) {
    const char = String.fromCharCode(byte)
    if (
      !(
        (byte >= 0x61 && byte <= 0x7a) ||
        (byte >= 0x30 && byte <= 0x39) ||
        byte === 0x2d
      )
    ) {
      throw new RangeError(
        `accountId contains invalid byte: ${char} (0x${byte.toString(16)})`,
      )
    }
  }
}

function encodeAccountId(w: Writer, id: string): void {
  validateAccountId(id)
  w.bytes(ascii(id), LIMITS.accountId)
}

function decodeAccountId(r: Reader): string {
  const bytes = r.bytes(LIMITS.accountId)
  const id = new TextDecoder().decode(bytes)
  validateAccountId(id)
  return id
}

export type OpenAccountV1 = {
  accountId: string
  initialBalance: bigint
}

export function encodeOpenAccount(op: OpenAccountV1): Uint8Array {
  const w = new Writer()
  encodeAccountId(w, op.accountId)
  w.u64(op.initialBalance)
  return w.done()
}

export function decodeOpenAccount(buf: Uint8Array): OpenAccountV1 {
  const r = new Reader(buf)
  const accountId = decodeAccountId(r)
  const initialBalance = r.u64()
  r.finish()
  return { accountId, initialBalance }
}

export type TransferV1 = {
  from: string
  to: string
  amount: bigint
}

export function encodeTransfer(op: TransferV1): Uint8Array {
  const w = new Writer()
  encodeAccountId(w, op.from)
  encodeAccountId(w, op.to)
  w.u64(op.amount)
  return w.done()
}

export function decodeTransfer(buf: Uint8Array): TransferV1 {
  const r = new Reader(buf)
  const from = decodeAccountId(r)
  const to = decodeAccountId(r)
  const amount = r.u64()
  r.finish()
  return { from, to, amount }
}

export type SetConfigV1 = {
  name: string
  value: bigint
  activationSequence: bigint
}

export function encodeSetConfig(op: SetConfigV1): Uint8Array {
  const w = new Writer()
  w.bytes(ascii(op.name), LIMITS.bytesField)
  w.u64(op.value)
  w.u64(op.activationSequence)
  return w.done()
}

export function decodeSetConfig(buf: Uint8Array): SetConfigV1 {
  const r = new Reader(buf)
  const nameBytes = r.bytes(LIMITS.bytesField)
  const name = new TextDecoder().decode(nameBytes)
  const value = r.u64()
  const activationSequence = r.u64()
  r.finish()
  return { name, value, activationSequence }
}

export type SetReceiptKeyV1 = {
  keyId: Uint8Array
  status: number
}

export function encodeSetReceiptKey(op: SetReceiptKeyV1): Uint8Array {
  const w = new Writer()
  w.fixed(op.keyId, 32)
  w.u16(op.status)
  return w.done()
}

export function decodeSetReceiptKey(buf: Uint8Array): SetReceiptKeyV1 {
  const r = new Reader(buf)
  const keyId = r.fixed(32)
  const status = r.u16()
  r.finish()
  return { keyId, status }
}

export type SetAuthorV1 = {
  keyId: Uint8Array
  role: number
  status: number
}

export function encodeSetAuthor(op: SetAuthorV1): Uint8Array {
  const w = new Writer()
  w.fixed(op.keyId, 32)
  w.u16(op.role)
  w.u16(op.status)
  return w.done()
}

export function decodeSetAuthor(buf: Uint8Array): SetAuthorV1 {
  const r = new Reader(buf)
  const keyId = r.fixed(32)
  const role = r.u16()
  const status = r.u16()
  r.finish()
  return { keyId, role, status }
}
