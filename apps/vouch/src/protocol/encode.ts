import { concat, u16be, u32be, u64be } from './bytes.ts'

export class DecodeError extends Error {
  readonly code = 'MALFORMED_CANONICAL_OBJECT' as const

  constructor(message: string) {
    super(message)
    this.name = 'DecodeError'
  }
}

export class UnsupportedVersionError extends Error {
  readonly code = 'UNSUPPORTED_PROTOCOL_VERSION' as const

  constructor(got: number, supported: number) {
    super(`unsupported protocol version: got ${got}, supported ${supported}`)
    this.name = 'UnsupportedVersionError'
  }
}

export class Writer {
  private readonly chunks: Uint8Array[] = []

  u16(n: number): void {
    this.chunks.push(u16be(n))
  }

  u32(n: number): void {
    this.chunks.push(u32be(n))
  }

  u64(n: bigint): void {
    this.chunks.push(u64be(n))
  }

  bool(b: boolean): void {
    this.chunks.push(Uint8Array.of(b ? 1 : 0))
  }

  fixed(b: Uint8Array, len: number): void {
    if (b.length !== len) {
      throw new RangeError(`fixed: expected ${len} bytes, got ${b.length}`)
    }
    this.chunks.push(b)
  }

  bytes(b: Uint8Array, max: number): void {
    if (b.length > max) {
      throw new RangeError(`bytes: length ${b.length} exceeds max ${max}`)
    }
    this.u32(b.length)
    this.chunks.push(b)
  }

  list<T>(items: T[], max: number, fn: (item: T) => void): void {
    if (items.length > max) {
      throw new RangeError(`list: count ${items.length} exceeds max ${max}`)
    }
    this.u32(items.length)
    for (const item of items) fn(item)
  }

  done(): Uint8Array {
    return concat(...this.chunks)
  }
}

export class Reader {
  private readonly buf: Uint8Array
  private offset = 0

  constructor(buf: Uint8Array) {
    this.buf = buf
  }

  private need(n: number): void {
    if (this.offset + n > this.buf.length) {
      throw new DecodeError(`truncated input: need ${n} more byte(s)`)
    }
  }

  private view(n: number): DataView {
    this.need(n)
    return new DataView(this.buf.buffer, this.buf.byteOffset + this.offset, n)
  }

  u16(): number {
    const value = this.view(2).getUint16(0)
    this.offset += 2
    return value
  }

  version(supported: number): number {
    const value = this.u16()
    if (value !== supported) {
      throw new UnsupportedVersionError(value, supported)
    }
    return value
  }

  u32(): number {
    const value = this.view(4).getUint32(0)
    this.offset += 4
    return value
  }

  u64(): bigint {
    const value = this.view(8).getBigUint64(0)
    this.offset += 8
    return value
  }

  bool(): boolean {
    this.need(1)
    const value = this.buf[this.offset]
    this.offset += 1
    if (value === 0) return false
    if (value === 1) return true
    throw new DecodeError(`bool: invalid discriminant byte ${value}`)
  }

  fixed(len: number): Uint8Array {
    this.need(len)
    const value = this.buf.slice(this.offset, this.offset + len)
    this.offset += len
    return value
  }

  bytes(max: number): Uint8Array {
    const len = this.u32()
    if (len > max) {
      throw new DecodeError(`bytes: length ${len} exceeds max ${max}`)
    }
    return this.fixed(len)
  }

  list<T>(max: number, fn: () => T): T[] {
    const count = this.u32()
    if (count > max) {
      throw new DecodeError(`list: count ${count} exceeds max ${max}`)
    }
    return Array.from({ length: count }, () => fn())
  }

  finish(): void {
    if (this.offset !== this.buf.length) {
      throw new DecodeError('finish: trailing bytes after canonical object')
    }
  }
}
