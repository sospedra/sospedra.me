import { ascii, hex } from './bytes.ts'
import { Reader, Writer } from './encode.ts'
import { LIMITS } from './limits.ts'

// State key functions

export const accountKey = (id: string): Uint8Array => ascii(`app/account/${id}`)

export const transfersKey = (id: string): Uint8Array =>
  ascii(`app/transfers/${id}`)

export const authorKey = (keyId: Uint8Array): Uint8Array =>
  ascii(`author/${hex(keyId)}`)

export const receiptKeyKey = (keyId: Uint8Array): Uint8Array =>
  ascii(`keys/receipt/${hex(keyId)}`)

export const configKey = (name: string): Uint8Array => ascii(`config/${name}`)

export const MIGRATION_KEY = ascii('governance/migration')

export const SEQUENCE_KEY = ascii('sys/sequence')

export const CHAIN_KEY = ascii('sys/program-chain')

// Types

type AccountV1 = { balance: bigint }

type TransferLogV1 = { entries: Uint8Array[] }

type AuthorRecordV1 = {
  role: number
  status: number
  sequence: bigint
  tip: Uint8Array
}

type ReceiptKeyV1 = { status: number; sinceSequence: bigint }

type ConfigV1 = { current: bigint; next: bigint; nextActivation: bigint }

type SequenceV1 = { value: bigint }

type ChainStateV1 = {
  chainHash: Uint8Array
  updateProgramId: Uint8Array
  queryProgramId: Uint8Array
}

type PendingMigrationV1 = { present: number; migration: Uint8Array }

// AccountV1

export const encodeAccount = (a: AccountV1): Uint8Array => {
  const w = new Writer()
  w.u64(a.balance)
  return w.done()
}

export const decodeAccount = (b: Uint8Array): AccountV1 => {
  const r = new Reader(b)
  const balance = r.u64()
  r.finish()
  return { balance }
}

// TransferLogV1

export const encodeTransferLogV1 = (t: TransferLogV1): Uint8Array => {
  const w = new Writer()
  w.list(t.entries, LIMITS.listCount, (entry) => {
    w.fixed(entry, 32)
  })
  return w.done()
}

export const decodeTransferLogV1 = (b: Uint8Array): TransferLogV1 => {
  const r = new Reader(b)
  const entries = r.list(LIMITS.listCount, () => r.fixed(32))
  r.finish()
  return { entries }
}

// AuthorRecordV1

export const encodeAuthorRecordV1 = (a: AuthorRecordV1): Uint8Array => {
  const w = new Writer()
  w.u16(a.role)
  w.u16(a.status)
  w.u64(a.sequence)
  w.fixed(a.tip, 32)
  return w.done()
}

export const decodeAuthorRecordV1 = (b: Uint8Array): AuthorRecordV1 => {
  const r = new Reader(b)
  const role = r.u16()
  const status = r.u16()
  const sequence = r.u64()
  const tip = r.fixed(32)
  r.finish()
  return { role, status, sequence, tip }
}

// ReceiptKeyV1

export const encodeReceiptKeyV1 = (r: ReceiptKeyV1): Uint8Array => {
  const w = new Writer()
  w.u16(r.status)
  w.u64(r.sinceSequence)
  return w.done()
}

export const decodeReceiptKeyV1 = (b: Uint8Array): ReceiptKeyV1 => {
  const r = new Reader(b)
  const status = r.u16()
  const sinceSequence = r.u64()
  r.finish()
  return { status, sinceSequence }
}

// ConfigV1

export const encodeConfig = (c: ConfigV1): Uint8Array => {
  const w = new Writer()
  w.u64(c.current)
  w.u64(c.next)
  w.u64(c.nextActivation)
  return w.done()
}

export const decodeConfig = (b: Uint8Array): ConfigV1 => {
  const r = new Reader(b)
  const current = r.u64()
  const next = r.u64()
  const nextActivation = r.u64()
  r.finish()
  return { current, next, nextActivation }
}

// SequenceV1

export const encodeSequenceV1 = (s: SequenceV1): Uint8Array => {
  const w = new Writer()
  w.u64(s.value)
  return w.done()
}

export const decodeSequenceV1 = (b: Uint8Array): SequenceV1 => {
  const r = new Reader(b)
  const value = r.u64()
  r.finish()
  return { value }
}

// ChainStateV1

export const encodeChainStateV1 = (c: ChainStateV1): Uint8Array => {
  const w = new Writer()
  w.fixed(c.chainHash, 32)
  w.fixed(c.updateProgramId, 32)
  w.fixed(c.queryProgramId, 32)
  return w.done()
}

export const decodeChainStateV1 = (b: Uint8Array): ChainStateV1 => {
  const r = new Reader(b)
  const chainHash = r.fixed(32)
  const updateProgramId = r.fixed(32)
  const queryProgramId = r.fixed(32)
  r.finish()
  return { chainHash, updateProgramId, queryProgramId }
}

// PendingMigrationV1

export const encodePendingMigrationV1 = (p: PendingMigrationV1): Uint8Array => {
  const w = new Writer()
  w.u16(p.present)
  w.bytes(p.migration, LIMITS.bytesField)
  return w.done()
}

export const decodePendingMigrationV1 = (b: Uint8Array): PendingMigrationV1 => {
  const r = new Reader(b)
  const present = r.u16()
  const migration = r.bytes(LIMITS.bytesField)
  r.finish()
  return { present, migration }
}

// Helper

export const effectiveConfig = (c: ConfigV1, seq: bigint): bigint =>
  c.nextActivation > 0n && seq >= c.nextActivation ? c.next : c.current
