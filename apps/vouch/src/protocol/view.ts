import { bytesEqual } from './bytes.ts'
import { DecodeError, type Reader, Writer } from './encode.ts'
import { LIMITS } from './limits.ts'
import {
  decodeWitness,
  encodeWitness,
  foldWitness,
  pathOf,
  rootAfter,
  type Smt,
  verifyWitness,
  type Witness,
} from './smt.ts'

export type StateView = {
  get(key: Uint8Array): Uint8Array | null
  set(key: Uint8Array, value: Uint8Array): void
  root(): Uint8Array
}

export type AccessV1 = {
  op: 1 | 2
  key: Uint8Array
  value: Uint8Array | null
  witness: Witness
}

export function encodeAccess(a: AccessV1): Uint8Array {
  const w = new Writer()
  w.u16(a.op)
  w.bytes(a.key, LIMITS.payload)
  w.bool(a.value !== null)
  if (a.value !== null) w.bytes(a.value, LIMITS.result)
  const witnessBytes = encodeWitness(a.witness)
  w.fixed(witnessBytes, witnessBytes.length)
  return w.done()
}

export function decodeAccess(r: Reader): AccessV1 {
  const op = r.u16()
  if (op !== 1 && op !== 2) {
    throw new DecodeError(`access: op must be 1 or 2, got ${op}`)
  }
  const key = r.bytes(LIMITS.payload)
  const hasValue = r.bool()
  const value = hasValue ? r.bytes(LIMITS.result) : null
  const witness = decodeWitness(r)
  return { op, key, value, witness }
}

export class TreeView implements StateView {
  private readonly tree: Smt

  constructor(tree: Smt) {
    this.tree = tree
  }

  get(key: Uint8Array): Uint8Array | null {
    return this.tree.get(key)
  }

  set(key: Uint8Array, value: Uint8Array): void {
    this.tree.set(key, value)
  }

  root(): Uint8Array {
    return this.tree.root()
  }
}

export class ProvingView implements StateView {
  private readonly tree: Smt
  private readonly log: AccessV1[]

  constructor(tree: Smt) {
    this.tree = tree
    this.log = []
  }

  get(key: Uint8Array): Uint8Array | null {
    const witness = this.tree.witness(key)
    const value = this.tree.get(key)
    this.log.push({ op: 1, key, value, witness })
    return value
  }

  set(key: Uint8Array, value: Uint8Array): void {
    const witness = this.tree.witness(key)
    this.log.push({ op: 2, key, value: null, witness })
    this.tree.set(key, value)
  }

  root(): Uint8Array {
    return this.tree.root()
  }

  accesses(): AccessV1[] {
    return this.log.slice()
  }
}

export class ReplayError extends Error {
  readonly code = 'INVALID_PROOF' as const
  readonly rule: string

  constructor(rule: string) {
    super(rule)
    this.name = 'ReplayError'
    this.rule = rule
  }
}

function verifyOldLeaf(
  root: Uint8Array,
  key: Uint8Array,
  witness: Witness,
): boolean {
  if (!bytesEqual(witness.path, pathOf(key))) return false
  return bytesEqual(foldWitness(witness, witness.leaf), root)
}

export class ReplayView implements StateView {
  private readonly log: AccessV1[]
  private cursor: number
  private currentRoot: Uint8Array

  constructor(startRoot: Uint8Array, accesses: AccessV1[]) {
    this.log = accesses
    this.cursor = 0
    this.currentRoot = startRoot
  }

  private pop(): AccessV1 {
    if (this.cursor >= this.log.length)
      throw new ReplayError('access-underflow')
    const access = this.log[this.cursor]
    this.cursor += 1
    return access
  }

  get(key: Uint8Array): Uint8Array | null {
    const access = this.pop()
    if (access.op !== 1) throw new ReplayError('access-op')
    if (!bytesEqual(access.key, key)) throw new ReplayError('access-key')
    if (!verifyWitness(this.currentRoot, key, access.value, access.witness)) {
      throw new ReplayError('access-witness')
    }
    return access.value
  }

  set(key: Uint8Array, value: Uint8Array): void {
    const access = this.pop()
    if (access.op !== 2) throw new ReplayError('access-op')
    if (!bytesEqual(access.key, key)) throw new ReplayError('access-key')
    if (!verifyOldLeaf(this.currentRoot, key, access.witness)) {
      throw new ReplayError('access-witness')
    }
    this.currentRoot = rootAfter(access.witness, value)
  }

  root(): Uint8Array {
    return this.currentRoot
  }

  assertDrained(): void {
    if (this.cursor !== this.log.length) throw new ReplayError('access-surplus')
  }
}
