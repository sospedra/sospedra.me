# `@sospedra/len` 🍥

The typed length of anything. One function returns the element count of any container: strings, arrays, typed arrays, buffers, `Map`, `Set`, or your own classes through pluggable handlers. Values without a length fail at compile time and at runtime, or return `0` or `null` when you configure that. Zero dependencies, ESM, just 601 bytes gzipped.

```ts
import len from '@sospedra/len'

len('héllo') // 5, UTF-16 code units, like .length
len([1, 2]) // 2
len(new Map()) // 0
len(9) // tsc error, and a TypeError at runtime
```

Want the byte count instead? Register the shipped handler:

```ts
import { createLen } from '@sospedra/len'
import { stringBytes } from '@sospedra/len/string-bytes'

const len = createLen({ handlers: [stringBytes] })

len('héllo') // 6, UTF-8 bytes
```

### Install

```sh
npm install @sospedra/len
```

Or add it to a workspace consumer:

```json
"@sospedra/len": "workspace:*"
```

### Why

Vanilla JS spells "how many" differently per container: `.length`, `.size`, `.byteLength`, or nothing at all. Mix two shapes and you get the classic crash report, `Cannot read properties of undefined (reading 'length')`. Every Sentry board has one. `len` is one function for the same question on every container. You choose the no-length behavior at creation: a tsc error plus a TypeError, a `0`, or a `null`.

| ask | vanilla JS | `len` |
| --- | --- | --- |
| items in an array | `array.length` | `len(array)` |
| entries in a `Map` or `Set` | `map.size` | `len(map)` |
| bytes in a buffer | `buffer.byteLength` | `len(buffer)` |
| UTF-8 bytes of a string | `new TextEncoder().encode(s).byteLength` | `len(s)` with `stringBytes` |
| value might be `undefined` | crashes mid-expression | tsc error, or `0` / `null` by config |
| keys in a plain object | `Object.keys(object).length` | opt-in `objectKeys` handler |

### Semantics

`len(target)` picks the measurement from the target's shape:

| target | result |
| --- | --- |
| `string` | UTF-16 code units, like `.length` |
| `T[]` | element count |
| typed arrays, `Buffer` | element count |
| `DataView` | `byteLength` |
| `ArrayBuffer`, `SharedArrayBuffer` | `byteLength` |
| `Map`, `Set` | `size` |
| anything else | `TypeError`, or `0` / `null` per `fallback` |

Not lenable: plain objects (see the shipped handlers), numbers, `null`, `undefined`, `WeakMap`, `WeakSet`, functions, boxed `String`.

Two details to know:

- `null` and `undefined` carry no type, so they take the fallback path.
- `stringBytes` encodes the string as UTF-8, and a lone surrogate encodes as U+FFFD, 3 bytes.

### Configure

`createLen` takes two keys: `fallback` and `handlers`. The default export is `createLen()`.

```ts
import { createLen } from '@sospedra/len'

const strict = createLen()
const loose = createLen({ fallback: 'zero' })
const maybe = createLen({ fallback: 'null' })
```

| `fallback` | accepts | no-length result |
| --- | --- | --- |
| `'throw'` (default) | lenable and handled types only | `TypeError`, plus a tsc error |
| `'zero'` | `unknown` | `0` |
| `'null'` | `unknown` | `null` |

`'zero'` and `'null'` still measure every lenable target. Only the no-length case changes.

### Shipped handlers

Each optional behavior is a handler on its own subpath. Import only what you register: a string handler is under 200 bytes of runtime.

```ts
import { createLen } from '@sospedra/len'
import { objectKeys } from '@sospedra/len/object-keys'
import { stringBytes } from '@sospedra/len/string-bytes'

const bytes = createLen({ handlers: [stringBytes] })
bytes('héllo') // 6

const keys = createLen({ handlers: [objectKeys] })
keys({ a: 1, b: 2 }) // 2
```

| handler | subpath | measures |
| --- | --- | --- |
| `stringBytes` | `@sospedra/len/string-bytes` | `'héllo'` → 6, `'👍'` → 4 |
| `stringCodePoints` | `@sospedra/len/string-code-points` | `'héllo'` → 5, `'👍'` → 1 |
| `objectKeys` | `@sospedra/len/object-keys` | own enumerable string keys |

The string handlers override the built-in code-unit count, because handlers run before built-ins. They share one predicate, so registering both in one instance throws at creation. Pick one per instance. Plain objects are not lenable by default, so `objectKeys` is the opt-in key count.

### Extend

Register a handler per instance for your own types:

```ts
import { createLen, defineHandler } from '@sospedra/len'

class Dogs {
  pack: string[]
  constructor(pack: string[]) {
    this.pack = pack
  }
}

const measureDogs = defineHandler(
  (value): value is Dogs => value instanceof Dogs,
  (dogs) => dogs.pack.length,
)

const len = createLen({ handlers: [measureDogs] })

len(new Dogs(['rex', 'fido'])) // 2
len('héllo') // 5, built-ins still apply
```

Any predicate works. Numbers, for example:

```ts
const measureDigits = defineHandler(
  (value): value is number => typeof value === 'number',
  (value) => value.toString().length,
)

const len = createLen({ handlers: [measureDigits] })

len(1234) // 4
len(-9.5) // 4
```

The rules:

- Handlers run before built-ins, and the first matching predicate wins
- Registration is per instance, the default export stays untouched
- Two handlers sharing one `is` reference throw at creation, because the second can never run
- Distinct predicates that overlap stay legal, so put the specific one first
- Under `fallback: 'throw'` the instance accepts your handled types at the type level, so the `Dogs` call above needs no cast

Write the predicate through `defineHandler`, or annotate it as `value is T` yourself.

### FAQ

**Why does `len('héllo')` return 5?**

The default counts UTF-16 code units, the same number `'héllo'.length` returns. Register `stringBytes` for the UTF-8 byte count, 6 here, or `stringCodePoints` to count astral characters like `'👍'` as 1.

**How do I count bytes instead of code units?**

Import `stringBytes` from `@sospedra/len/string-bytes` and pass it to `createLen({ handlers: [stringBytes] })`. The handler overrides the built-in count for every string the instance measures.

**What does `len(null)` or `len(undefined)` return?**

Nothing by default: both are a tsc error and a runtime TypeError. With `fallback: 'zero'` they return `0`, and with `fallback: 'null'` they return `null`.

**Does `len` count plain object keys?**

Not by default. Register `objectKeys` from `@sospedra/len/object-keys` and `len({ a: 1, b: 2 })` returns 2, own enumerable string keys only. Class instances stay non-lenable either way.

**Can I measure my own classes?**

Yes. Build a handler with `defineHandler` and pass it to `createLen`. The instance accepts your type at compile time and measures it at runtime. See Extend above.
