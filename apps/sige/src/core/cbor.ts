import { bytesToBigInt, concatBytes, utf8 } from './bytes.ts'

// Deterministic CBOR profile (SIGE spec 6.1): shortest-form integers, definite
// lengths only, map keys sorted by their own encoded bytes.
export type CborValue =
  | bigint
  | Uint8Array
  | string
  | boolean
  | null
  | readonly CborValue[]
  | ReadonlyMap<string, CborValue>

export function isCborArray(value: unknown): value is readonly CborValue[] {
  return Array.isArray(value)
}

export function isCborMap(
  value: unknown,
): value is ReadonlyMap<string, CborValue> {
  return value instanceof Map
}

// Spec 6.1 rejects unrecognized critical fields. A decoder that ignores an
// unknown key gives one logical object two wire forms under a single hash.
export function strictCborMap(
  value: CborValue | undefined,
  knownKeys: ReadonlySet<string>,
): ReadonlyMap<string, CborValue> | null {
  if (!isCborMap(value)) return null
  const hasUnknown = [...value.keys()].some((key) => !knownKeys.has(key))
  return hasUnknown ? null : value
}

export function decodeCborArray<T>(
  value: CborValue | undefined,
  decodeItem: (item: CborValue) => T | null,
): T[] | null {
  if (!isCborArray(value)) return null
  const items = value.map(decodeItem)
  return items.every((item): item is T => item !== null) ? items : null
}

export function asSafeCount(value: CborValue | undefined): number | null {
  if (typeof value !== 'bigint') return null
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return null
  return Number(value)
}

// bigIntToBytes emits minimal big-endian bytes, so a leading zero or an empty
// string is a second wire form for a value that already has one.
// ROW 14. A decoded bigint drives modular exponentiation, so an unbounded one
// is a denial of service with no forgery needed. 512 bytes is 4096 bits, well
// past any RSA-style modulus this demo uses.
export const MAX_BIGINT_BYTES = 512

export function asUnsignedBigInt(value: CborValue | undefined): bigint | null {
  if (!(value instanceof Uint8Array)) return null
  if (value.length === 0) return null
  if (value.length > MAX_BIGINT_BYTES) return null
  if (value.length > 1 && value[0] === 0) return null
  return bytesToBigInt(value)
}

const MAJOR_UINT = 0
const MAJOR_NEGINT = 1
const MAJOR_BYTES = 2
const MAJOR_TEXT = 3
const MAJOR_ARRAY = 4
const MAJOR_MAP = 5
const MAJOR_SIMPLE = 7

const SIMPLE_FALSE = Uint8Array.of((MAJOR_SIMPLE << 5) | 20)
const SIMPLE_TRUE = Uint8Array.of((MAJOR_SIMPLE << 5) | 21)
const SIMPLE_NULL = Uint8Array.of((MAJOR_SIMPLE << 5) | 22)

// The deepest §6.2 record (the evidence bundle) nests about five levels; 32
// leaves orders of magnitude of margin below any engine's stack limit.
export const MAX_NESTING_DEPTH = 32
const NESTING_LIMIT_REASON = `cbor nesting exceeds the profile limit of ${MAX_NESTING_DEPTH}`

type ArgumentBand = {
  readonly marker: number
  readonly length: number
  readonly min: bigint
  readonly max: bigint
}

// RFC 8949 4.2 shortest-form bands: the byte width an argument must use once
// it no longer fits in the direct 0-23 head byte.
const ARGUMENT_BANDS: readonly ArgumentBand[] = [
  { marker: 24, length: 1, min: 24n, max: 0xffn },
  { marker: 25, length: 2, min: 0x100n, max: 0xffffn },
  { marker: 26, length: 4, min: 0x10000n, max: 0xffffffffn },
  { marker: 27, length: 8, min: 0x100000000n, max: 0xffffffffffffffffn },
]

function beBytes(value: bigint, length: number): Uint8Array {
  const out = new Uint8Array(length)
  let remaining = value
  for (let i = length - 1; i >= 0; i--) {
    out[i] = Number(remaining & 0xffn)
    remaining >>= 8n
  }
  return out
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff
  }
  return a.length - b.length
}

function encodeHead(majorType: number, argument: bigint): Uint8Array {
  if (argument < 24n) return Uint8Array.of((majorType << 5) | Number(argument))
  const band = ARGUMENT_BANDS.find((candidate) => argument <= candidate.max)
  if (!band) {
    throw new RangeError('cbor argument exceeds the 64-bit profile limit')
  }
  return concatBytes(
    Uint8Array.of((majorType << 5) | band.marker),
    beBytes(argument, band.length),
  )
}

function encodeInt(value: bigint): Uint8Array {
  return value >= 0n
    ? encodeHead(MAJOR_UINT, value)
    : encodeHead(MAJOR_NEGINT, -1n - value)
}

function encodeBytes(value: Uint8Array): Uint8Array {
  return concatBytes(encodeHead(MAJOR_BYTES, BigInt(value.length)), value)
}

function encodeText(value: string): Uint8Array {
  const encoded = utf8(value)
  return concatBytes(encodeHead(MAJOR_TEXT, BigInt(encoded.length)), encoded)
}

function encodeArray(items: readonly CborValue[], depth: number): Uint8Array {
  if (depth > MAX_NESTING_DEPTH) throw new RangeError(NESTING_LIMIT_REASON)
  const head = encodeHead(MAJOR_ARRAY, BigInt(items.length))
  return concatBytes(head, ...items.map((item) => encodeValue(item, depth + 1)))
}

function encodeMap(
  value: ReadonlyMap<string, CborValue>,
  depth: number,
): Uint8Array {
  if (depth > MAX_NESTING_DEPTH) throw new RangeError(NESTING_LIMIT_REASON)
  const head = encodeHead(MAJOR_MAP, BigInt(value.size))
  const parts = [...value.entries()]
    .map(([key, entryValue]) => ({ keyBytes: encodeText(key), entryValue }))
    .sort((a, b) => compareBytes(a.keyBytes, b.keyBytes))
    .flatMap(({ keyBytes, entryValue }) => [
      keyBytes,
      encodeValue(entryValue, depth + 1),
    ])
  return concatBytes(head, ...parts)
}

function encodeValue(value: CborValue, depth: number): Uint8Array {
  if (value === null) return SIMPLE_NULL
  if (typeof value === 'boolean') return value ? SIMPLE_TRUE : SIMPLE_FALSE
  if (typeof value === 'bigint') return encodeInt(value)
  if (typeof value === 'string') return encodeText(value)
  if (value instanceof Uint8Array) return encodeBytes(value)
  if (isCborArray(value)) return encodeArray(value, depth)
  return encodeMap(value, depth)
}

export function encodeCbor(value: CborValue): Uint8Array {
  return encodeValue(value, 0)
}

export type CborDecodeResult =
  | { readonly ok: true; readonly value: CborValue }
  | { readonly ok: false; readonly reason: string }

type DecodeFailure = { readonly ok: false; readonly reason: string }
type ArgumentResult =
  | DecodeFailure
  | { readonly ok: true; readonly value: bigint; readonly consumed: number }
type SimpleResult =
  | DecodeFailure
  | { readonly ok: true; readonly value: boolean | null }
type DecodeStep =
  | DecodeFailure
  | { readonly ok: true; readonly value: CborValue; readonly offset: number }
type MapEntryStep =
  | DecodeFailure
  | {
      readonly ok: true
      readonly key: string
      readonly value: CborValue
      readonly offset: number
    }

type DecodeContext = {
  readonly bytes: Uint8Array
  readonly depth: number
}

function deeper(ctx: DecodeContext): DecodeContext {
  return { bytes: ctx.bytes, depth: ctx.depth + 1 }
}

const ADDITIONAL_INFO_INDEFINITE = 31
const DIRECT_ARGUMENT_MAX = 23
const FLOAT_ADDITIONAL_INFO = new Set([25, 26, 27])
const RESERVED_ADDITIONAL_INFO = new Set([28, 29, 30])
const MIN_BYTES_PER_ARRAY_ITEM = 1
const MIN_BYTES_PER_MAP_ENTRY = 2
const STRICT_UTF8_DECODER = new TextDecoder('utf-8', { fatal: true })

function reservedAdditionalInfoReason(additionalInfo: number): string {
  return `reserved additional information ${additionalInfo}`
}

function readFixedWidthArgument(
  bytes: Uint8Array,
  offset: number,
  additionalInfo: number,
): ArgumentResult {
  const band = ARGUMENT_BANDS.find(
    (candidate) => candidate.marker === additionalInfo,
  )
  if (!band) {
    return { ok: false, reason: reservedAdditionalInfoReason(additionalInfo) }
  }
  if (offset + band.length > bytes.length) {
    return { ok: false, reason: 'unexpected end of input' }
  }
  const value = bytesToBigInt(bytes.subarray(offset, offset + band.length))
  if (value < band.min) {
    return { ok: false, reason: 'integer is not encoded in its shortest form' }
  }
  return { ok: true, value, consumed: band.length }
}

function readArgument(
  bytes: Uint8Array,
  offset: number,
  additionalInfo: number,
): ArgumentResult {
  if (additionalInfo <= DIRECT_ARGUMENT_MAX) {
    return { ok: true, value: BigInt(additionalInfo), consumed: 0 }
  }
  if (additionalInfo === ADDITIONAL_INFO_INDEFINITE) {
    return { ok: false, reason: 'indefinite-length items are not supported' }
  }
  return readFixedWidthArgument(bytes, offset, additionalInfo)
}

function decodeSimple(additionalInfo: number): SimpleResult {
  switch (additionalInfo) {
    case 20:
      return { ok: true, value: false }
    case 21:
      return { ok: true, value: true }
    case 22:
      return { ok: true, value: null }
    case ADDITIONAL_INFO_INDEFINITE:
      return { ok: false, reason: 'indefinite-length items are not supported' }
    default:
      if (FLOAT_ADDITIONAL_INFO.has(additionalInfo)) {
        return { ok: false, reason: 'floating-point values are not supported' }
      }
      if (RESERVED_ADDITIONAL_INFO.has(additionalInfo)) {
        return {
          ok: false,
          reason: reservedAdditionalInfoReason(additionalInfo),
        }
      }
      return { ok: false, reason: `unsupported simple value ${additionalInfo}` }
  }
}

function decodeItemSimple(additionalInfo: number, offset: number): DecodeStep {
  const simple = decodeSimple(additionalInfo)
  if (!simple.ok) return simple
  return { ok: true, value: simple.value, offset: offset + 1 }
}

function withinBounds(
  bytes: Uint8Array,
  offset: number,
  length: bigint,
): number | null {
  const end = BigInt(offset) + length
  return end > BigInt(bytes.length) ? null : Number(end)
}

function decodeByteString(
  bytes: Uint8Array,
  offset: number,
  length: bigint,
): DecodeStep {
  const end = withinBounds(bytes, offset, length)
  if (end === null) return { ok: false, reason: 'unexpected end of input' }
  return { ok: true, value: bytes.slice(offset, end), offset: end }
}

function decodeUtf8Strict(bytes: Uint8Array): string | null {
  try {
    return STRICT_UTF8_DECODER.decode(bytes)
  } catch {
    return null
  }
}

function decodeTextString(
  bytes: Uint8Array,
  offset: number,
  length: bigint,
): DecodeStep {
  const end = withinBounds(bytes, offset, length)
  if (end === null) return { ok: false, reason: 'unexpected end of input' }
  const text = decodeUtf8Strict(bytes.subarray(offset, end))
  if (text === null) {
    return { ok: false, reason: 'text string is not valid utf-8' }
  }
  return { ok: true, value: text, offset: end }
}

function decodeArray(
  ctx: DecodeContext,
  offset: number,
  count: bigint,
): DecodeStep {
  if (ctx.depth > MAX_NESTING_DEPTH) {
    return { ok: false, reason: NESTING_LIMIT_REASON }
  }
  if (
    count * BigInt(MIN_BYTES_PER_ARRAY_ITEM) >
    BigInt(ctx.bytes.length - offset)
  ) {
    return {
      ok: false,
      reason: 'declared array length exceeds remaining input',
    }
  }
  const items: CborValue[] = []
  let cursor = offset
  for (let i = 0; i < Number(count); i++) {
    const item = decodeItem(deeper(ctx), cursor)
    if (!item.ok) return item
    items.push(item.value)
    cursor = item.offset
  }
  return { ok: true, value: items, offset: cursor }
}

function decodeMapEntry(ctx: DecodeContext, offset: number): MapEntryStep {
  const key = decodeItem(ctx, offset)
  if (!key.ok) return key
  if (typeof key.value !== 'string') {
    return { ok: false, reason: 'map keys must be text strings' }
  }
  const value = decodeItem(ctx, key.offset)
  if (!value.ok) return value
  return { ok: true, key: key.value, value: value.value, offset: value.offset }
}

function keyOrderViolation(
  previous: Uint8Array | null,
  current: Uint8Array,
): string | null {
  if (previous === null) return null
  const order = compareBytes(previous, current)
  if (order === 0) return 'duplicate map key'
  if (order > 0) return 'map keys are not in canonical order'
  return null
}

function finalizeMap(
  entries: readonly [string, CborValue][],
  offset: number,
): DecodeStep {
  const map = new Map<string, CborValue>()
  let previousKeyBytes: Uint8Array | null = null
  for (const [key, value] of entries) {
    const keyBytes = encodeText(key)
    const violation = keyOrderViolation(previousKeyBytes, keyBytes)
    if (violation !== null) {
      return { ok: false, reason: `${violation}: ${JSON.stringify(key)}` }
    }
    map.set(key, value)
    previousKeyBytes = keyBytes
  }
  return { ok: true, value: map, offset }
}

function decodeMap(
  ctx: DecodeContext,
  offset: number,
  count: bigint,
): DecodeStep {
  if (ctx.depth > MAX_NESTING_DEPTH) {
    return { ok: false, reason: NESTING_LIMIT_REASON }
  }
  if (
    count * BigInt(MIN_BYTES_PER_MAP_ENTRY) >
    BigInt(ctx.bytes.length - offset)
  ) {
    return { ok: false, reason: 'declared map length exceeds remaining input' }
  }
  const entries: [string, CborValue][] = []
  let cursor = offset
  for (let i = 0; i < Number(count); i++) {
    const entry = decodeMapEntry(deeper(ctx), cursor)
    if (!entry.ok) return entry
    entries.push([entry.key, entry.value])
    cursor = entry.offset
  }
  return finalizeMap(entries, cursor)
}

function decodeItem(ctx: DecodeContext, offset: number): DecodeStep {
  const { bytes } = ctx
  if (offset >= bytes.length) {
    return { ok: false, reason: 'unexpected end of input' }
  }
  const initial = bytes[offset]
  const majorType = initial >> 5
  const additionalInfo = initial & 0x1f

  if (majorType === MAJOR_SIMPLE) {
    return decodeItemSimple(additionalInfo, offset)
  }

  const argument = readArgument(bytes, offset + 1, additionalInfo)
  if (!argument.ok) return argument
  const bodyOffset = offset + 1 + argument.consumed

  switch (majorType) {
    case MAJOR_UINT:
      return { ok: true, value: argument.value, offset: bodyOffset }
    case MAJOR_NEGINT:
      return { ok: true, value: -1n - argument.value, offset: bodyOffset }
    case MAJOR_BYTES:
      return decodeByteString(bytes, bodyOffset, argument.value)
    case MAJOR_TEXT:
      return decodeTextString(bytes, bodyOffset, argument.value)
    case MAJOR_ARRAY:
      return decodeArray(ctx, bodyOffset, argument.value)
    case MAJOR_MAP:
      return decodeMap(ctx, bodyOffset, argument.value)
    default:
      return { ok: false, reason: `unsupported major type ${majorType}` }
  }
}

export function decodeCbor(bytes: Uint8Array): CborDecodeResult {
  const item = decodeItem({ bytes, depth: 0 }, 0)
  if (!item.ok) return item
  if (item.offset !== bytes.length) {
    return { ok: false, reason: 'trailing bytes after a complete item' }
  }
  return { ok: true, value: item.value }
}
