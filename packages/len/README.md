# `@sospedra/len` 🍥

Go's builtin `len`, in TypeScript.

```ts
import len from '@sospedra/len'

len('héllo') // 6, UTF-8 bytes, like Go
len([1, 2]) // 2
len(new Map()) // 0
len(9) // tsc error, and a TypeError at runtime
```

### Install

```sh
npm install @sospedra/len
```

Or add it to a workspace consumer:

```json
"@sospedra/len": "workspace:*"
```

### Semantics

| target | Go analog | result |
| --- | --- | --- |
| `string` | `string` | UTF-8 byte count |
| `T[]` | slice, array | element count |
| typed arrays, `Buffer` | `[]byte` and friends | element count |
| `DataView` | byte window | `byteLength` |
| `ArrayBuffer`, `SharedArrayBuffer` | backing storage | `byteLength` |
| `Map` | `map` | `size` |
| `Set` | `map[T]struct{}` | `size` |
| anything else | compile error in Go | `TypeError` |

Set, typed arrays, DataView, and buffers are JS adaptations. Go's `len` accepts arrays, pointers to arrays, slices, strings, maps, and channels. Channels and pointer-to-array have no JS analog.

Not lenable: plain objects (see the shipped handlers), numbers, `null`, `undefined`, `WeakMap`, `WeakSet`, functions, boxed `String`.

Two adaptations to know:

- Go returns 0 for typed nil slices and maps and rejects only untyped `nil`. JS `null` and `undefined` carry no type, so they take the fallback path.
- A Go string is a raw byte sequence. A JS string is not. The byte count is the UTF-8 encoding of the JS string, and a lone surrogate encodes as U+FFFD, 3 bytes.

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

Each optional behavior is a handler on its own subpath. Import only what you register.

```ts
import { createLen } from '@sospedra/len'
import { objectKeys } from '@sospedra/len/object-keys'
import { stringCodeUnits } from '@sospedra/len/string-code-units'

const units = createLen({ handlers: [stringCodeUnits] })
units('héllo') // 5

const keys = createLen({ handlers: [objectKeys] })
keys({ a: 1, b: 2 }) // 2
```

| handler | subpath | measures |
| --- | --- | --- |
| `stringCodeUnits` | `@sospedra/len/string-code-units` | `'héllo'` → 5, `'👍'` → 2 |
| `stringCodePoints` | `@sospedra/len/string-code-points` | `'héllo'` → 5, `'👍'` → 1 |
| `objectKeys` | `@sospedra/len/object-keys` | own enumerable string keys |

The string handlers override the built-in byte count, because handlers run before built-ins. They share one predicate, so registering both in one instance throws at creation. Pick one per instance. Plain objects read as Go structs by default, so `objectKeys` is the opt-in Go-map reading.

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
len('héllo') // 6, built-ins still apply
```

Handlers run before built-ins. First match wins. Registration is per instance. Two handlers with the same `is` reference throw at creation, because the second can never run. Distinct predicates that overlap stay legal, so put the specific one first. Under `fallback: 'throw'` the instance also accepts your handled types at the type level, so the call above needs no cast. Write the predicate through `defineHandler`, or annotate it as `value is T` yourself.

### Migrate from v2

| call | v2 | v3 |
| --- | --- | --- |
| `len('string')` | `0` | `6` |
| `len({})` | `0` | `TypeError` |
| `len(9)` | `0` | `TypeError`, and a tsc error |
| `len(undefined)` | `0` | `TypeError` |
| `len(new Map([['a', 1]]))` | `0` | `1` |

`createLen({ fallback: 'zero' })` is the closest v2 shape. It keeps the `(target: unknown) => number` signature, but strings, Maps, Sets, typed arrays, and buffers now measure instead of returning 0.

### Caveats

- ESM only. `sideEffects: false` plus per-handler subpaths keep bundles minimal, and the default instance carries a pure annotation, so it drops when unused.
- Consumers need TypeScript >= 5.0. The published types use `const` type parameters.
- Node >= 20 at runtime. Zero dependencies.
- `instanceof` misses cross-realm `ArrayBuffer`, `Map`, and `Set` values. They take the fallback path.
- The type layer is structural. A hand-built `{ buffer, byteLength, byteOffset }` object compiles as lenable and still throws at runtime.
