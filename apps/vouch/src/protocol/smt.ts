import { bytesEqual, hex, unhex } from './bytes.ts'
import { type Reader, Writer } from './encode.ts'
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

function subtree(
  depth: number,
  entries: Entry[],
  memo: Map<string, Uint8Array>,
): Uint8Array {
  if (entries.length === 0) return EMPTY[depth]
  if (depth === TREE_DEPTH) {
    return leafHash(entries[0].path, valueHashOf(entries[0].value))
  }

  const memoKey = `${depth}:${hex(entries[0].path)}:${entries.length}`
  const cached = memo.get(memoKey)
  if (cached) return cached

  const lefts = entries.filter((e) => !bitAt(e.path, depth))
  const rights = entries.filter((e) => bitAt(e.path, depth))
  const result = hash(
    'state-node',
    subtree(depth + 1, lefts, memo),
    subtree(depth + 1, rights, memo),
  )
  memo.set(memoKey, result)
  return result
}

export class Smt {
  private leaves: Map<string, Uint8Array>

  constructor() {
    this.leaves = new Map()
  }

  set(key: Uint8Array, value: Uint8Array): void {
    this.leaves.set(hex(pathOf(key)), value)
  }

  get(key: Uint8Array): Uint8Array | null {
    return this.leaves.get(hex(pathOf(key))) ?? null
  }

  root(): Uint8Array {
    return subtree(0, this.leafEntries(), new Map())
  }

  witness(key: Uint8Array): Witness {
    const path = pathOf(key)
    const value = this.leaves.get(hex(path))
    const leaf = value === undefined ? null : valueHashOf(value)
    const memo = new Map<string, Uint8Array>()

    const collect = (depth: number, subset: Entry[]): Uint8Array[] => {
      if (depth === TREE_DEPTH) return []
      const lefts = subset.filter((e) => !bitAt(e.path, depth))
      const rights = subset.filter((e) => bitAt(e.path, depth))
      const [own, other] = bitAt(path, depth)
        ? [rights, lefts]
        : [lefts, rights]
      return [...collect(depth + 1, own), subtree(depth + 1, other, memo)]
    }

    const bitmap = new Uint8Array(32)
    const siblings = collect(0, this.leafEntries()).filter((sibling, i) => {
      const depth = TREE_DEPTH - 1 - i
      const nonEmpty = !bytesEqual(sibling, EMPTY[depth + 1])
      if (nonEmpty) setBit(bitmap, depth)
      return nonEmpty
    })

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

export function decodeWitness(r: Reader): Witness {
  const path = r.fixed(32)
  const present = r.bool()
  const leaf = present ? r.fixed(32) : null
  const bitmap = r.fixed(32)
  const siblings = r.list(MAX_SIBLINGS, () => r.fixed(32))
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
