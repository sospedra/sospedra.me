import assert from 'node:assert/strict'
import { test } from 'node:test'
import { objectKeys } from '../src/handlers/object-keys.ts'
import { stringBytes } from '../src/handlers/string-bytes.ts'
import { stringCodePoints } from '../src/handlers/string-code-points.ts'
import len, {
  createLen,
  defineHandler,
  type FallbackMode,
} from '../src/index.ts'

class Dogs {
  pack: string[]
  constructor(pack: string[]) {
    this.pack = pack
  }
}

class Cats {
  count: number
  constructor(count: number) {
    this.count = count
  }
}

const isDogs = (value: unknown): value is Dogs => value instanceof Dogs

test('len measures arrays by element count', () => {
  assert.equal(len([]), 0)
  assert.equal(len([1, 2, 3]), 3)
  assert.equal(len(new Array(3)), 3)
})

test('len measures strings as UTF-16 code units by default', () => {
  assert.equal(len(''), 0)
  assert.equal(len('hi'), 2)
  assert.equal(len('héllo'), 5)
  assert.equal(len('👍'), 2)
  assert.equal(len('é'), 2)
  assert.equal(len('\uD800'), 1)
})

test('len measures typed arrays, views, and buffers', () => {
  assert.equal(len(new Uint8Array(4)), 4)
  assert.equal(len(new Float64Array(2)), 2)
  assert.equal(len(new Uint16Array(new ArrayBuffer(8))), 4)
  assert.equal(len(Buffer.from('héllo')), 6)
  assert.equal(len(new DataView(new ArrayBuffer(8))), 8)
  assert.equal(len(new DataView(new ArrayBuffer(8), 2)), 6)
  assert.equal(len(new ArrayBuffer(8)), 8)
  assert.equal(len(new SharedArrayBuffer(16)), 16)
})

test('len measures Map and Set by size', () => {
  assert.equal(len(new Map()), 0)
  assert.equal(
    len(
      new Map([
        ['a', 1],
        ['b', 2],
      ]),
    ),
    2,
  )
  assert.equal(len(new Set([1, 1, 2])), 2)
})

test('len throws a TypeError for targets without a length', () => {
  // @ts-expect-error plain objects are not lenable
  assert.throws(() => len({}), TypeError)
  // @ts-expect-error numbers are not lenable
  assert.throws(() => len(9), /invalid argument \(number\) for built-in len/)
  // @ts-expect-error booleans are not lenable
  assert.throws(() => len(true), TypeError)
  // @ts-expect-error null is not lenable
  assert.throws(() => len(null), TypeError)
  // @ts-expect-error undefined is not lenable
  assert.throws(() => len(undefined), TypeError)
  // @ts-expect-error bigints are not lenable
  assert.throws(() => len(9n), TypeError)
  // @ts-expect-error symbols are not lenable
  assert.throws(() => len(Symbol('tag')), TypeError)
  // @ts-expect-error functions are not lenable
  assert.throws(() => len(() => {}), TypeError)
  // @ts-expect-error WeakMap is unsized by design
  assert.throws(() => len(new WeakMap()), TypeError)
  // @ts-expect-error WeakSet is unsized by design
  assert.throws(() => len(new WeakSet()), TypeError)
  // @ts-expect-error boxed strings are not the string primitive
  assert.throws(() => len(new String('a')), /invalid argument \(String\)/)
})

test('shipped string handlers override the code-unit default', () => {
  const bytes = createLen({ handlers: [stringBytes] })
  const points = createLen({ handlers: [stringCodePoints] })
  assert.equal(bytes('héllo'), 6)
  assert.equal(points('héllo'), 5)
  assert.equal(bytes('👍'), 4)
  assert.equal(points('👍'), 1)
  assert.equal(bytes('é'), 3)
  assert.equal(points('é'), 2)
})

test('invalid fallback modes throw at creation', () => {
  // @ts-expect-error bogus fallback modes are rejected
  assert.throws(() => createLen({ fallback: 'bogus' }), TypeError)
})

test('fallback zero returns 0 when there is no length', () => {
  const zero = createLen({ fallback: 'zero' })
  assert.equal(zero(9), 0)
  assert.equal(zero(null), 0)
  assert.equal(zero({}), 0)
  assert.equal(zero(new WeakMap()), 0)
  assert.equal(zero('héllo'), 5)
})

test('fallback null returns null when there is no length', () => {
  const nullable = createLen({ fallback: 'null' })
  assert.equal(nullable(9), null)
  assert.equal(nullable(undefined), null)
  const measured: number | null = nullable([1, 2])
  assert.equal(measured, 2)
  // @ts-expect-error the null fallback widens the return type
  const strict: number = nullable([1, 2])
  assert.equal(strict, 2)
})

test('custom handlers measure user types', () => {
  const measureDogs = defineHandler(isDogs, (dogs) => dogs.pack.length)
  const dogsLen = createLen({ handlers: [measureDogs] })
  assert.equal(dogsLen(new Dogs(['rex', 'fido'])), 2)
  assert.equal(dogsLen('héllo'), 5)
  // @ts-expect-error instances without the Dogs handler reject Dogs
  assert.throws(() => len(new Dogs(['rex'])), TypeError)
})

test('handlers run before built-ins and first match wins', () => {
  const stringAnswer = defineHandler(
    (value): value is string => typeof value === 'string',
    () => 42,
  )
  const overridden = createLen({ handlers: [stringAnswer] })
  assert.equal(overridden('anything'), 42)
  const specificDogs = defineHandler(isDogs, (dogs) => dogs.pack.length)
  const broadDogs = defineHandler(
    (value): value is Dogs => value instanceof Dogs,
    () => 999,
  )
  const stacked = createLen({ handlers: [specificDogs, broadDogs] })
  assert.equal(stacked(new Dogs(['rex'])), 1)
})

test('handlers sharing one predicate throw at creation', () => {
  assert.throws(
    () => createLen({ handlers: [stringCodePoints, stringBytes] }),
    /handlers 0 and 1 share one is predicate/,
  )
  const measureDogs = defineHandler(isDogs, (dogs) => dogs.pack.length)
  const shadowedDogs = defineHandler(isDogs, () => 999)
  assert.throws(
    () => createLen({ handlers: [measureDogs, shadowedDogs] }),
    TypeError,
  )
})

test('a custom number handler measures digits', () => {
  const measureDigits = defineHandler(
    (value): value is number => typeof value === 'number',
    (value) => value.toString().length,
  )
  const digits = createLen({ handlers: [measureDigits] })
  assert.equal(digits(1234), 4)
  assert.equal(digits(-9.5), 4)
  assert.equal(digits('héllo'), 5)
})

const pickMode = (): FallbackMode => 'zero'

test('type-level rejections stay loud', () => {
  const mode = pickMode()
  // @ts-expect-error non-literal fallbacks do not resolve an overload
  createLen({ fallback: mode })
  const catsMeasurer = (cats: Cats) => cats.count
  // @ts-expect-error a Dogs predicate cannot pair with a Cats measurer
  createLen({ handlers: [{ is: isDogs, len: catsMeasurer }] })
})

test('objectKeys is an opt-in plain-object handler', () => {
  const keys = createLen({ handlers: [objectKeys] })
  assert.equal(keys({}), 0)
  assert.equal(keys({ a: 1, b: 2 }), 2)
  const bare = Object.create(null)
  bare.answer = 42
  assert.equal(keys(bare), 1)
  assert.equal(keys([1, 2]), 2)
  assert.equal(keys(new Map([['a', 1]])), 1)
  // @ts-expect-error class instances are not plain objects
  assert.throws(() => keys(new Dogs(['rex'])), TypeError)
})

test('structural fakes compile and throw at runtime', () => {
  const fake: ArrayBufferView = {
    buffer: new ArrayBuffer(0),
    byteLength: 0,
    byteOffset: 0,
  }
  assert.throws(() => len(fake), TypeError)
})

test('a DataView with an own length property reports byteLength', () => {
  const lying = Object.assign(new DataView(new ArrayBuffer(8)), {
    length: 123,
  })
  assert.equal(len(lying), 8)
})
