import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bytesToBigInt,
  randomBytes,
  toHex,
  u32be,
  u64be,
} from '../src/core/bytes.ts'
import {
  asUnsignedBigInt,
  type CborValue,
  decodeCbor,
  encodeCbor,
  MAX_BIGINT_BYTES,
  MAX_NESTING_DEPTH,
} from '../src/core/cbor.ts'
import { objectHash } from '../src/core/object-hash.ts'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(2 * i, 2 * i + 2), 16)
  }
  return bytes
}

function assertRejected(hex: string, reasonPattern: RegExp): void {
  const result = decodeCbor(hexToBytes(hex))
  assert.equal(result.ok, false, `expected rejection, decoded ${hex} instead`)
  if (result.ok) return
  assert.match(result.reason, reasonPattern)
}

// The fixed vector table: another implementation encodes `value` and checks
// its bytes against `expectedHex`, byte for byte.
type CborVector = {
  readonly description: string
  readonly value: CborValue
  readonly expectedHex: string
}

const CBOR_VECTORS: readonly CborVector[] = [
  { description: 'empty map', value: new Map(), expectedHex: 'a0' },
  { description: 'empty array', value: [], expectedHex: '80' },
  { description: 'small unsigned integer (10)', value: 10n, expectedHex: '0a' },
  {
    description: 'large integer near the 64-bit boundary (2^64 - 1)',
    value: 18446744073709551615n,
    expectedHex: '1bffffffffffffffff',
  },
  {
    description: 'negative integer (-1000)',
    value: -1000n,
    expectedHex: '3903e7',
  },
  { description: 'negative integer (-1)', value: -1n, expectedHex: '20' },
  {
    description: 'most negative representable integer (-2^64)',
    value: -18446744073709551616n,
    expectedHex: '3bffffffffffffffff',
  },
  {
    description: 'empty byte string',
    value: new Uint8Array(0),
    expectedHex: '40',
  },
  {
    description: 'text string with a multi-byte character (u+00fc)',
    value: 'ü',
    expectedHex: '62c3bc',
  },
  {
    description: 'array of small integers [1, 2, 3]',
    value: [1n, 2n, 3n],
    expectedHex: '83010203',
  },
  { description: 'simple value true', value: true, expectedHex: 'f5' },
  { description: 'simple value false', value: false, expectedHex: 'f4' },
  { description: 'simple value null', value: null, expectedHex: 'f6' },
  {
    description: 'nested map whose keys require reordering',
    value: new Map<string, CborValue>([
      ['z', 1n],
      [
        'a',
        new Map<string, CborValue>([
          ['y', 2n],
          ['b', 3n],
        ]),
      ],
    ]),
    expectedHex: 'a26161a2616203617902617a01',
  },
]

for (const vector of CBOR_VECTORS) {
  test(`encodeCbor vector: ${vector.description}`, () => {
    assert.equal(toHex(encodeCbor(vector.value)), vector.expectedHex)
  })

  test(`decodeCbor vector: ${vector.description}`, () => {
    const result = decodeCbor(hexToBytes(vector.expectedHex))
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(result.value, vector.value)
  })
}

type ObjectHashVector = {
  readonly description: string
  readonly typeUrl: string
  readonly value: CborValue
  readonly expectedHex: string
}

const OBJECT_HASH_VECTORS: readonly ObjectHashVector[] = [
  {
    description: 'record {n: 10} under type_url sige.example/v1',
    typeUrl: 'sige.example/v1',
    value: new Map<string, CborValue>([['n', 10n]]),
    expectedHex:
      '54decdf53e39a75d88e961e4d8d8525a600fa0335cdedf5b19fcc890d96f5f92',
  },
]

for (const vector of OBJECT_HASH_VECTORS) {
  test(`objectHash vector: ${vector.description}`, () => {
    const digest = objectHash(vector.typeUrl, vector.value)
    assert.equal(toHex(digest), vector.expectedHex)
    assert.equal(digest.length, 32)
  })
}

test('encodeCbor is deterministic regardless of map key insertion order', () => {
  const forward = new Map<string, CborValue>([
    ['alpha', 1n],
    ['beta', 2n],
    ['gamma', 3n],
  ])
  const backward = new Map<string, CborValue>([
    ['gamma', 3n],
    ['beta', 2n],
    ['alpha', 1n],
  ])
  assert.deepEqual(encodeCbor(forward), encodeCbor(backward))
})

test('objectHash is deterministic regardless of map key insertion order', () => {
  const forward = new Map<string, CborValue>([
    ['alpha', 1n],
    ['beta', 2n],
  ])
  const backward = new Map<string, CborValue>([
    ['beta', 2n],
    ['alpha', 1n],
  ])
  assert.deepEqual(
    objectHash('sige.example/v1', forward),
    objectHash('sige.example/v1', backward),
  )
})

const MAX_GENERATOR_DEPTH = 3
const TRIALS = 300

function randomInt(exclusiveMax: number): number {
  return Math.floor(Math.random() * exclusiveMax)
}

function randomBigInt(): bigint {
  const magnitude = bytesToBigInt(randomBytes(1 + randomInt(8)))
  return randomInt(2) === 0 ? magnitude : -magnitude - 1n
}

const SAMPLE_CHARS = ['a', 'b', 'z', '0', '9', ' ', 'ü', '水', '"', '\\']

function randomText(length: number): string {
  return Array.from(
    { length },
    () => SAMPLE_CHARS[randomInt(SAMPLE_CHARS.length)],
  ).join('')
}

const LEAF_KINDS = ['int', 'bytes', 'text', 'bool', 'null'] as const
const CONTAINER_KINDS = ['array', 'map'] as const
type Kind = (typeof LEAF_KINDS)[number] | (typeof CONTAINER_KINDS)[number]

function randomKind(depth: number): Kind {
  const kinds: readonly Kind[] =
    depth >= MAX_GENERATOR_DEPTH
      ? LEAF_KINDS
      : [...LEAF_KINDS, ...CONTAINER_KINDS]
  return kinds[randomInt(kinds.length)]
}

function randomMap(depth: number): Map<string, CborValue> {
  const size = randomInt(4)
  const map = new Map<string, CborValue>()
  for (let i = 0; i < size; i++) {
    map.set(`k${i}-${randomText(3)}`, randomCborValue(depth + 1))
  }
  return map
}

function randomCborValue(depth: number): CborValue {
  switch (randomKind(depth)) {
    case 'int':
      return randomBigInt()
    case 'bytes':
      return randomBytes(randomInt(8))
    case 'text':
      return randomText(randomInt(8))
    case 'bool':
      return randomInt(2) === 0
    case 'null':
      return null
    case 'array':
      return Array.from({ length: randomInt(4) }, () =>
        randomCborValue(depth + 1),
      )
    case 'map':
      return randomMap(depth)
  }
}

test('round-trips arbitrary nested values through encode and decode', () => {
  for (let trial = 0; trial < TRIALS; trial++) {
    const value = randomCborValue(0)
    const encoded = encodeCbor(value)
    const decoded = decodeCbor(encoded)
    assert.ok(
      decoded.ok,
      `trial ${trial} failed to decode: ${!decoded.ok ? decoded.reason : ''}`,
    )
    if (!decoded.ok) continue
    assert.deepEqual(decoded.value, value)
    assert.deepEqual(encodeCbor(decoded.value), encoded)
  }
})

test('decodeCbor rejects duplicate map keys', () => {
  assertRejected('a2616101616102', /duplicate map key/i)
})

test('decodeCbor rejects non-shortest integer encodings', () => {
  assertRejected('1805', /shortest form/i)
  assertRejected('190064', /shortest form/i)
  assertRejected('3805', /shortest form/i)
})

test('decodeCbor rejects indefinite-length items', () => {
  assertRejected('5fff', /indefinite/i)
  assertRejected('9fff', /indefinite/i)
  assertRejected('bfff', /indefinite/i)
  assertRejected('ff', /indefinite/i)
})

test('decodeCbor rejects floating-point values', () => {
  assertRejected('f90000', /float/i)
  assertRejected('fa00000000', /float/i)
  assertRejected('fb0000000000000000', /float/i)
})

test('decodeCbor rejects trailing bytes after a complete item', () => {
  assertRejected('a000', /trailing bytes/i)
  assertRejected('0a00', /trailing bytes/i)
})

test('decodeCbor rejects a map key that is not a text string', () => {
  assertRejected('a10102', /map keys must be text strings/i)
})

test('decodeCbor rejects map keys presented out of canonical order', () => {
  assertRejected('a2616201616102', /canonical order/i)
})

test('decodeCbor rejects an unsupported major type (tags are out of profile)', () => {
  assertRejected('c0', /unsupported major type/i)
})

test('decodeCbor rejects reserved additional-information values with the same wording across major types', () => {
  assertRejected('1c', /reserved additional information 28/i)
  assertRejected('fc', /reserved additional information 28/i)
})

test('decodeCbor rejects truncated input at every stage', () => {
  assertRejected('', /unexpected end of input/i)
  assertRejected('41', /unexpected end of input/i)
  assertRejected('18', /unexpected end of input/i)
})

test('decodeCbor rejects unsupported simple values', () => {
  assertRejected('f7', /unsupported simple value/i)
  assertRejected('e0', /unsupported simple value/i)
})

test('encodeCbor throws when an integer exceeds the 64-bit profile range', () => {
  assert.throws(() => encodeCbor(2n ** 64n), /64-bit/)
  assert.throws(() => encodeCbor(-(2n ** 64n) - 1n), /64-bit/)
})

function nestedArrayHex(depth: number): string {
  return `${'81'.repeat(depth + 1)}00`
}

function nestedArrayValue(depth: number): CborValue {
  let value: CborValue = 0n
  for (let i = 0; i <= depth; i++) value = [value]
  return value
}

test('decodeCbor accepts nesting exactly at the depth limit', () => {
  const result = decodeCbor(hexToBytes(nestedArrayHex(MAX_NESTING_DEPTH)))
  assert.equal(result.ok, true)
})

test('decodeCbor rejects nesting one level past the depth limit', () => {
  assertRejected(nestedArrayHex(MAX_NESTING_DEPTH + 1), /nesting.*exceeds/i)
})

test('decodeCbor rejects a 10000-deep input with a reason instead of throwing', () => {
  assertRejected(nestedArrayHex(10000), /nesting.*exceeds/i)
})

test('encodeCbor accepts nesting exactly at the depth limit', () => {
  assert.doesNotThrow(() => encodeCbor(nestedArrayValue(MAX_NESTING_DEPTH)))
})

test('encodeCbor throws for nesting one level past the depth limit', () => {
  assert.throws(
    () => encodeCbor(nestedArrayValue(MAX_NESTING_DEPTH + 1)),
    /nesting.*exceeds/i,
  )
})

test('u32be throws for a value outside the unsigned 32-bit range', () => {
  assert.throws(() => u32be(-1), /32-bit/i)
  assert.throws(() => u32be(2 ** 32), /32-bit/i)
  assert.throws(() => u32be(1.5), /32-bit/i)
  assert.doesNotThrow(() => u32be(0))
  assert.doesNotThrow(() => u32be(0xffffffff))
})

test('u64be throws for a value outside its representable range', () => {
  assert.throws(() => u64be(-1), /64-bit/i)
  assert.throws(() => u64be(Number.MAX_SAFE_INTEGER + 1), /64-bit/i)
  assert.throws(() => u64be(1.5), /64-bit/i)
  assert.doesNotThrow(() => u64be(0))
  assert.doesNotThrow(() => u64be(Number.MAX_SAFE_INTEGER))
})

// ROW 14. A decoded bigint drives modular exponentiation in the LHTLP path, so
// an unbounded one is a denial of service that needs no forgery. The decoder is
// the only place that can refuse it: every consumer downstream just multiplies.
test('a transport bigint beyond the modulus bound is refused', () => {
  const ok = asUnsignedBigInt(new Uint8Array(MAX_BIGINT_BYTES).fill(0xff))
  assert.notEqual(ok, null, 'a value at the bound is still accepted')

  const oversized = new Uint8Array(MAX_BIGINT_BYTES + 1).fill(0xff)
  assert.equal(asUnsignedBigInt(oversized), null, 'one byte over the bound')
  assert.equal(
    asUnsignedBigInt(new Uint8Array(1_000_000).fill(0xff)),
    null,
    'a megabyte integer was decoded',
  )
})
