import { bytesEqual, hex, unhex } from './bytes.ts'
import { DecodeError, type Reader, Writer } from './encode.ts'
import { hash } from './hash.ts'

const TREE_DEPTH = 256
const MAX_SIBLINGS = TREE_DEPTH

export const EMPTY: Uint8Array[] = buildEmptyTable()

function buildEmptyTable(): Uint8Array[] {
  const table = new Array<Uint8Array>(TREE_DEPTH + 1)
  table[TREE_DEPTH] = hash('state-leaf')
  for (let depth = TREE_DEPTH - 1; depth >= 0; depth -= 1) {
    table[depth] = hash('state-node', table[depth + 1], table[depth + 1])
  }
  return table
}

export const pathOf = (key: Uint8Array): Uint8Array => hash('state-key', key)

export const valueHashOf = (value: Uint8Array): Uint8Array =>
  hash('state-value', value)

export const leafHash = (path: Uint8Array, valueHash: Uint8Array): Uint8Array =>
  hash('state-leaf', path, valueHash)

export type Witness = {
  path: Uint8Array
  leaf: Uint8Array | null
  bitmap: Uint8Array
  siblings: Uint8Array[]
}

function bitAt(bytes: Uint8Array, index: number): boolean {
  return (bytes[index >> 3] & (0x80 >> (index & 7))) !== 0
}

function setBit(bitmap: Uint8Array, index: number): void {
  bitmap[index >> 3] |= 0x80 >> (index & 7)
}

type Entry = { path: Uint8Array; value: Uint8Array }

function subtree(depth: number, entries: Entry[]): Uint8Array {
  if (entries.length === 0) return EMPTY[depth]
  if (depth === TREE_DEPTH) {
    return leafHash(entries[0].path, valueHashOf(entries[0].value))
  }

  const lefts = entries.filter((e) => !bitAt(e.path, depth))
  const rights = entries.filter((e) => bitAt(e.path, depth))
  return hash(
    'state-node',
    subtree(depth + 1, lefts),
    subtree(depth + 1, rights),
  )
}

export class Smt {
  private leaves: Map<string, Uint8Array>

  constructor() {
    this.leaves = new Map()
  }

  set(key: Uint8Array, value: Uint8Array): void {
    this.leaves.set(hex(pathOf(key)), value.slice())
  }

  get(key: Uint8Array): Uint8Array | null {
    return this.leaves.get(hex(pathOf(key)))?.slice() ?? null
  }

  root(): Uint8Array {
    return subtree(0, this.leafEntries())
  }

  witness(key: Uint8Array): Witness {
    const path = pathOf(key)
    const value = this.leaves.get(hex(path))
    const leaf = value === undefined ? null : valueHashOf(value)

    const collect = (depth: number, subset: Entry[]): Uint8Array[] => {
      if (depth === TREE_DEPTH) return []
      const lefts = subset.filter((e) => !bitAt(e.path, depth))
      const rights = subset.filter((e) => bitAt(e.path, depth))
      const [own, other] = bitAt(path, depth)
        ? [rights, lefts]
        : [lefts, rights]
      return [...collect(depth + 1, own), subtree(depth + 1, other)]
    }

    const folded = collect(0, this.leafEntries())
    const bitmap = new Uint8Array(32)
    const siblings: Uint8Array[] = []
    for (let i = 0; i < folded.length; i += 1) {
      const depth = TREE_DEPTH - 1 - i
      if (bytesEqual(folded[i], EMPTY[depth + 1])) continue
      setBit(bitmap, depth)
      siblings.push(folded[i])
    }

    return { path, leaf, bitmap, siblings }
  }

  clone(): Smt {
    const copy = new Smt()
    copy.leaves = new Map(this.leaves)
    return copy
  }

  private leafEntries(): Entry[] {
    return Array.from(this.leaves, ([pathHex, value]) => ({
      path: unhex(pathHex),
      value,
    }))
  }
}

export function encodeWitness(w: Witness): Uint8Array {
  const writer = new Writer()
  writer.fixed(w.path, 32)
  writer.bool(w.leaf !== null)
  if (w.leaf !== null) writer.fixed(w.leaf, 32)
  writer.fixed(w.bitmap, 32)
  writer.list(w.siblings, MAX_SIBLINGS, (s) => writer.fixed(s, 32))
  return writer.done()
}

function bytePopcount(byte: number): number {
  let count = 0
  for (let mask = 1; mask <= 0x80; mask <<= 1) {
    if (byte & mask) count += 1
  }
  return count
}

function popcount(bitmap: Uint8Array): number {
  return bitmap.reduce((sum, byte) => sum + bytePopcount(byte), 0)
}

export function decodeWitness(r: Reader): Witness {
  const path = r.fixed(32)
  const present = r.bool()
  const leaf = present ? r.fixed(32) : null
  const bitmap = r.fixed(32)
  const siblings = r.list(MAX_SIBLINGS, () => r.fixed(32))
  const bits = popcount(bitmap)
  if (bits !== siblings.length) {
    throw new DecodeError(
      `witness: bitmap has ${bits} set bit(s), siblings list has ${siblings.length}`,
    )
  }
  return { path, leaf, bitmap, siblings }
}

export function foldWitness(w: Witness, leaf: Uint8Array | null): Uint8Array {
  let current = leaf === null ? EMPTY[TREE_DEPTH] : leafHash(w.path, leaf)
  let cursor = 0

  for (let depth = TREE_DEPTH - 1; depth >= 0; depth -= 1) {
    const sibling = bitAt(w.bitmap, depth)
      ? w.siblings[cursor++]
      : EMPTY[depth + 1]
    current = bitAt(w.path, depth)
      ? hash('state-node', sibling, current)
      : hash('state-node', current, sibling)
  }

  return current
}

function nullableBytesEqual(
  a: Uint8Array | null,
  b: Uint8Array | null,
): boolean {
  if (a === null || b === null) return a === b
  return bytesEqual(a, b)
}

export function verifyWitness(
  root: Uint8Array,
  key: Uint8Array,
  value: Uint8Array | null,
  w: Witness,
): boolean {
  if (!bytesEqual(w.path, pathOf(key))) return false
  const expectedLeaf = value === null ? null : valueHashOf(value)
  if (!nullableBytesEqual(w.leaf, expectedLeaf)) return false
  return bytesEqual(foldWitness(w, w.leaf), root)
}

export function rootAfter(w: Witness, newValue: Uint8Array | null): Uint8Array {
  return foldWitness(w, newValue ? valueHashOf(newValue) : null)
}
