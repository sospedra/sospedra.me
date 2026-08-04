# vouch implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/vouch`, a browser dashboard that runs 22 adversarial scenarios over a byte-exact TypeScript reference model of the verifiable-API spec.

**Architecture:** A pure protocol core (`src/protocol/`) implements canonical encoding, domain hashing, a 256-level sparse Merkle tree, events, transitions, queries, receipts, heads, and the 19-step terminal verifier. Proofs are transparent: witness streams that the verifier replays through the same program code. Scenario modules (`src/scenarios/`) emit deterministic traces consumed by both `node --test` and a vanilla-TS dashboard (`src/ui/`).

**Tech Stack:** Vite 8, TypeScript strict, biome, `node --test`, `@noble/curves` 2.2.0 (Ed25519), `@noble/hashes` 2.2.0 (SHA-256). No UI framework.

## Global constraints

- The source spec ("Verifiable Algorithm and Canonical Data Architecture" v0.1.0) wins over this plan in any conflict. `apps/vouch/DESIGN.md` wins over this plan.
- Hash magic prefix: ASCII `VOUCH`. `PROTOCOL_VERSION = 1`.
- `u64` is `bigint` end to end. No `number` above 2^32. No floats anywhere in protocol code.
- All canonical integers big-endian fixed width. Decoders reject trailing bytes, over-limit lengths, invalid discriminants, invalid UTF-8, and unsupported versions.
- Determinism: keypairs from labeled seeds, nonces from per-scenario seeded PRNG. Zero `Math.random`, zero `Date.now` in protocol and scenario code. UI code may read the clock for display only.
- Node 24. Test imports use relative paths WITH `.ts` extension (bare `baseUrl` paths crash `node --test`).
- File names kebab-case (biome rule). Commit subjects only, no bodies. Commit on the current branch.
- Every task ends green: the named test command passes before its commit step.

---

### Task 1: Scaffold apps/vouch

**Files:**
- Create: `apps/vouch/package.json`, `apps/vouch/tsconfig.json`, `apps/vouch/biome.json`, `apps/vouch/vite.config.ts`, `apps/vouch/index.html`, `apps/vouch/src/main.ts`, `apps/vouch/test/smoke.test.ts`

**Interfaces:**
- Produces: a workspace package named `vouch` with scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `vectors`.

- [ ] **Step 1: Write the failing smoke test**

`test/smoke.test.ts`:
```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAGIC } from '../src/protocol/constants.ts'

test('protocol magic', () => {
  assert.equal(new TextDecoder().decode(MAGIC), 'VOUCH')
})
```

- [ ] **Step 2: Create the package files**

`package.json` (mirror aol; `test` script grows one file per task):
```json
{
  "name": "vouch",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": "24.x" },
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "lint": "biome check .",
    "preview": "vite preview",
    "test": "node --test test/smoke.test.ts",
    "typecheck": "tsc",
    "vectors": "node scripts/vectors.ts"
  },
  "license": "ISC",
  "dependencies": {
    "@noble/curves": "2.2.0",
    "@noble/hashes": "2.2.0"
  },
  "devDependencies": {
    "@biomejs/biome": "catalog:",
    "@repo/biome-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vite": "8.2.0"
  }
}
```

`tsconfig.json`, `biome.json`, `vite.config.ts`: copy `apps/aol`'s files verbatim (biome adds the kebab-case filename rule; vite target `es2022`; tsconfig includes `src/**/*.ts`, `test/**/*.ts`, `vite.config.ts` — add `scripts/**/*.ts` to the include list).

`index.html`: copy aol's shape, title `vouch · verified output under canonical history`, `<div id="app">`, module script `/src/main.ts`.

`src/main.ts` (placeholder until Task 22):
```ts
document.querySelector('#app')!.textContent = 'vouch'
```

`src/protocol/constants.ts`:
```ts
export const MAGIC = new TextEncoder().encode('VOUCH')
export const PROTOCOL_VERSION = 1
export const ZERO32 = new Uint8Array(32)
export const TIMELOCK_MIN = 3n
export const FRESHNESS = { maxHeadAgeMs: 60_000n, clockSkewMs: 5_000n } as const
```

`src/protocol/limits.ts` (the DESIGN.md `limits.ts` object):
```ts
export const LIMITS = {
  bytesField: 65536,
  listCount: 4096,
  payload: 4096,
  nonce: 64,
  accountId: 64,
  result: 65536,
  proofEvents: 64,
  proofAccesses: 4096,
  migrationChain: 8,
} as const
```

- [ ] **Step 3: Install and verify the test fails, then passes**

Run: `pnpm install` (workspace globs `apps/*` already; verify `pnpm --filter vouch exec pwd` resolves). Then `pnpm --filter vouch test`.
Expected: PASS (constants exist by now). Also run `pnpm --filter vouch typecheck` and `pnpm --filter vouch lint`.

- [ ] **Step 4: Commit**

```bash
git add apps/vouch pnpm-lock.yaml
git commit -m "feat(vouch): scaffold app workspace"
```

---

### Task 2: Bytes and canonical encoding

**Files:**
- Create: `src/protocol/bytes.ts`, `src/protocol/encode.ts`
- Test: `test/encode.test.ts`

**Interfaces:**
- Produces `bytes.ts`: `concat(...parts: Uint8Array[]): Uint8Array`, `u16be(n: number): Uint8Array`, `u32be(n: number): Uint8Array`, `u64be(n: bigint): Uint8Array`, `hex(b: Uint8Array): string`, `unhex(s: string): Uint8Array`, `bytesEqual(a, b): boolean`, `ascii(s: string): Uint8Array`.
- Produces `encode.ts`: `class Writer { u16(n); u32(n); u64(n: bigint); bool(b); fixed(b: Uint8Array, len); bytes(b, max); list<T>(items, max, fn); done(): Uint8Array }` and `class Reader { constructor(buf); u16(); u32(); u64(): bigint; bool(); fixed(len); bytes(max); list<T>(max, fn); finish(): void }` plus `class DecodeError extends Error { code: 'MALFORMED_CANONICAL_OBJECT' }`.

- [ ] **Step 1: Write failing tests**

`test/encode.test.ts` covers, with exact asserts:
```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex, u64be } from '../src/protocol/bytes.ts'
import { DecodeError, Reader, Writer } from '../src/protocol/encode.ts'

test('u64be encodes big-endian', () => {
  assert.equal(hex(u64be(0x0102030405060708n)), '0102030405060708')
})

test('writer roundtrips through reader', () => {
  const w = new Writer()
  w.u16(7)
  w.u64(9007199254740993n) // above Number.MAX_SAFE_INTEGER
  w.bytes(new Uint8Array([1, 2, 3]), 16)
  const buf = w.done()
  const r = new Reader(buf)
  assert.equal(r.u16(), 7)
  assert.equal(r.u64(), 9007199254740993n)
  assert.deepEqual(r.bytes(16), new Uint8Array([1, 2, 3]))
  r.finish()
})

test('reader rejects trailing bytes', () => {
  const r = new Reader(new Uint8Array([0, 1, 0xff]))
  r.u16()
  assert.throws(() => r.finish(), DecodeError)
})

test('reader rejects over-limit length', () => {
  const w = new Writer()
  w.bytes(new Uint8Array(8), 8)
  const r = new Reader(w.done())
  assert.throws(() => r.bytes(4), DecodeError)
})

test('reader rejects truncated input', () => {
  assert.throws(() => new Reader(new Uint8Array([0])).u16(), DecodeError)
})

test('bool rejects 0x02', () => {
  assert.throws(() => new Reader(new Uint8Array([2])).bool(), DecodeError)
})

test('list rejects count over max', () => {
  const w = new Writer()
  w.list([1, 2, 3], 8, (x) => w.u16(x))
  const r = new Reader(w.done())
  assert.throws(() => r.list(2, () => r.u16()), DecodeError)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/encode.test.ts` from `apps/vouch`.
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement `bytes.ts` and `encode.ts`**

`u64be`: `DataView.setBigUint64`. `Writer` accumulates chunks, `done()` concats. `Reader` tracks offset; every read checks remaining length; `finish()` throws if `offset !== buf.length`. `bytes(max)`: read `u32` length, reject `> max`, slice. `list(max, fn)`: read `u32` count, reject `> max`, loop `fn`. `u16`/`u32` also validate integer range on write (`Number.isInteger`, bounds) and throw `RangeError` on violation. `u64` write rejects negatives and `>= 2n ** 64n`.

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `node --test test/encode.test.ts && pnpm --filter vouch typecheck && pnpm --filter vouch lint`
Expected: PASS. Add the file to the package `test` script list.

- [ ] **Step 5: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): canonical byte encoding"
```

---

### Task 3: Domain-separated hashing

**Files:**
- Create: `src/protocol/hash.ts`
- Test: `test/hash.test.ts`

**Interfaces:**
- Produces: `type Domain = 'author-event' | 'author-signing' | 'event-record' | 'write-ack' | 'state-key' | 'state-value' | 'state-leaf' | 'state-node' | 'transition-journal' | 'query-request' | 'query-result' | 'query-journal' | 'query-receipt' | 'latest-head' | 'program-chain' | 'proof-cache-key' | 'program-id'`, `hash(domain: Domain, ...parts: Uint8Array[]): Uint8Array` (32 bytes).

- [ ] **Step 1: Write failing tests**

```ts
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ascii, concat, hex, u16be, u32be } from '../src/protocol/bytes.ts'
import { hash } from '../src/protocol/hash.ts'

test('hash matches independent preimage construction', () => {
  const part = ascii('hello')
  const preimage = concat(
    ascii('VOUCH'),
    u16be(1),
    u16be(9),
    ascii('state-key'),
    u32be(5),
    part,
  )
  const expected = createHash('sha256').update(preimage).digest('hex')
  assert.equal(hex(hash('state-key', part)), expected)
})

test('domains separate', () => {
  const p = ascii('x')
  assert.notEqual(hex(hash('state-key', p)), hex(hash('state-value', p)))
})

test('part boundaries separate', () => {
  const a = hash('state-key', ascii('ab'), ascii('c'))
  const b = hash('state-key', ascii('a'), ascii('bc'))
  assert.notEqual(hex(a), hex(b))
})
```

- [ ] **Step 2: Run to verify failure, implement, re-run**

Implement with `sha256` from `@noble/hashes/sha2.js`: build the preimage exactly as the spec 8.2 formula with `VOUCH` magic, `u16be(PROTOCOL_VERSION)`, `u16be(domain.length) || domain_ascii`, then `u32be(len) || part` per part.
Run: `node --test test/hash.test.ts`
Expected: PASS. Add to `test` script.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): domain-separated hashing"
```

---

### Task 4: Keys and seeded randomness

**Files:**
- Create: `src/protocol/keys.ts`, `src/protocol/rand.ts`
- Test: `test/keys.test.ts`

**Interfaces:**
- Produces `keys.ts`: `interface Keypair { publicKey: Uint8Array; secretKey: Uint8Array }`, `keypairFromLabel(label: string): Keypair` (seed = SHA-256 of `vouch-seed:<label>`; not a protocol hash, tooling only), `sign(digest32: Uint8Array, kp: Keypair): Uint8Array` (64 bytes), `verifySig(digest32, sig, publicKey): boolean`. Key id IS the 32-byte public key.
- Produces `rand.ts`: `class Prng { constructor(label: string); bytes(n: number): Uint8Array }` — SHA-256 counter stream over the label seed. Deterministic.

- [ ] **Step 1: Write failing tests**

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import { hash } from '../src/protocol/hash.ts'
import { keypairFromLabel, sign, verifySig } from '../src/protocol/keys.ts'
import { Prng } from '../src/protocol/rand.ts'

test('keypair is deterministic per label', () => {
  const a = keypairFromLabel('author-alice')
  const b = keypairFromLabel('author-alice')
  assert.equal(hex(a.publicKey), hex(b.publicKey))
  assert.equal(a.publicKey.length, 32)
})

test('sign and verify roundtrip, tamper fails', () => {
  const kp = keypairFromLabel('author-alice')
  const digest = hash('author-signing', new Uint8Array([1]))
  const sig = sign(digest, kp)
  assert.equal(sig.length, 64)
  assert.ok(verifySig(digest, sig, kp.publicKey))
  const bad = sig.slice()
  bad[0] ^= 1
  assert.ok(!verifySig(digest, bad, kp.publicKey))
})

test('prng streams deterministically', () => {
  assert.equal(hex(new Prng('s1').bytes(16)), hex(new Prng('s1').bytes(16)))
  assert.notEqual(hex(new Prng('s1').bytes(16)), hex(new Prng('s2').bytes(16)))
})
```

- [ ] **Step 2: Run to verify failure, implement, re-run**

Use `ed25519` from `@noble/curves/ed25519.js`: `ed25519.getPublicKey(seed)`, `ed25519.sign(digest, seed)`, `ed25519.verify(sig, digest, pub)`.
Run: `node --test test/keys.test.ts`
Expected: PASS. Add to `test` script.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): ed25519 keys and seeded prng"
```

---

### Task 5: Sparse Merkle tree

**Files:**
- Create: `src/protocol/smt.ts`
- Test: `test/smt.test.ts`

**Interfaces:**
- Produces: `EMPTY: Uint8Array[]` (index = depth 0..256; `EMPTY[256] = hash('state-leaf')` zero parts; `EMPTY[d] = hash('state-node', EMPTY[d+1], EMPTY[d+1])`), `pathOf(key: Uint8Array): Uint8Array` (= `hash('state-key', key)`), `leafHash(path, valueHash): Uint8Array` (= `hash('state-leaf', path, valueHash)`), `valueHashOf(value: Uint8Array): Uint8Array` (= `hash('state-value', value)`).
- `interface Witness { path: Uint8Array; leaf: Uint8Array | null; bitmap: Uint8Array; siblings: Uint8Array[] }` — `leaf` is the present leaf's `value_hash` or null for absence. Bitmap bit `i` (byte `i >> 3`, mask `0x80 >> (i & 7)`) marks a non-empty sibling at depth `i`. `siblings` is in fold order: depth 255 first, depth 0 last.
- `encodeWitness(w): Uint8Array` / `decodeWitness(r: Reader): Witness` per DESIGN: `path(32) || leafOpt(0x00 | 0x01||hash32) || bitmap(32) || list<hash32>`.
- `class Smt { set(key: Uint8Array, value: Uint8Array): void; get(key): Uint8Array | null; root(): Uint8Array; witness(key): Witness; clone(): Smt }`.
- `foldWitness(w: Witness, leaf: Uint8Array | null): Uint8Array` — recompute root from a leaf value-hash (or absence) through the witness.
- `verifyWitness(root, key, value: Uint8Array | null, w: Witness): boolean` — checks `w.path === pathOf(key)`, leaf consistency with `value`, and `foldWitness(w, w.leaf)` equals `root`.
- `rootAfter(w: Witness, newValue: Uint8Array | null): Uint8Array` — `foldWitness(w, newValue ? valueHashOf(newValue) : null)`.

- [ ] **Step 1: Write failing tests**

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ascii, hex } from '../src/protocol/bytes.ts'
import { EMPTY, Smt, rootAfter, verifyWitness } from '../src/protocol/smt.ts'

test('empty tree root is the protocol constant', () => {
  assert.equal(hex(new Smt().root()), hex(EMPTY[0]))
})

test('insert changes root deterministically, order-independent storage', () => {
  const a = new Smt()
  a.set(ascii('k1'), ascii('v1'))
  a.set(ascii('k2'), ascii('v2'))
  const b = new Smt()
  b.set(ascii('k2'), ascii('v2'))
  b.set(ascii('k1'), ascii('v1'))
  assert.equal(hex(a.root()), hex(b.root()))
  assert.notEqual(hex(a.root()), hex(EMPTY[0]))
})

test('membership witness verifies, wrong value fails', () => {
  const t = new Smt()
  t.set(ascii('k1'), ascii('v1'))
  t.set(ascii('k2'), ascii('v2'))
  const w = t.witness(ascii('k1'))
  assert.ok(verifyWitness(t.root(), ascii('k1'), ascii('v1'), w))
  assert.ok(!verifyWitness(t.root(), ascii('k1'), ascii('WRONG'), w))
})

test('non-membership witness verifies', () => {
  const t = new Smt()
  t.set(ascii('k1'), ascii('v1'))
  const w = t.witness(ascii('absent'))
  assert.equal(w.leaf, null)
  assert.ok(verifyWitness(t.root(), ascii('absent'), null, w))
})

test('rootAfter matches a real update', () => {
  const t = new Smt()
  t.set(ascii('k1'), ascii('v1'))
  const w = t.witness(ascii('k1'))
  t.set(ascii('k1'), ascii('v9'))
  assert.equal(hex(rootAfter(w, ascii('v9'))), hex(t.root()))
})

test('update through witness composes across keys', () => {
  const t = new Smt()
  t.set(ascii('k1'), ascii('v1'))
  const w2 = t.witness(ascii('k2'))
  t.set(ascii('k2'), ascii('v2'))
  assert.equal(hex(rootAfter(w2, ascii('v2'))), hex(t.root()))
})
```

- [ ] **Step 2: Run to verify failure, implement, re-run**

Implementation: leaves stored as `Map<hexPath, value>`. `root()` and `witness()` by recursive descent: `subtree(depth, paths)` returns `EMPTY[depth]` when `paths` empty, the leaf hash at depth 256, else `hash('state-node', subtree(d+1, lefts), subtree(d+1, rights))` splitting on path bit `d`. `witness(key)` descends toward the key's path collecting the opposite subtree root per depth; bitmap bit set when that sibling differs from `EMPTY[d+1]`. `foldWitness` walks depth 255 → 0 consuming `siblings` when the bit is set, else `EMPTY[depth + 1]`, ordering left/right by the path bit. Memoize subtree hashes per `root()`/`witness()` call keyed by `depth:firstPathHex:count`.
Run: `node --test test/smt.test.ts`
Expected: PASS. Add to `test` script.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): sparse merkle tree with witnesses"
```

---

### Task 6: Logical state layout

**Files:**
- Create: `src/protocol/state.ts`
- Test: `test/state.test.ts`

**Interfaces:**
- Produces state keys (all return `Uint8Array` of the ASCII key): `accountKey(id: string)` = `app/account/<id>`, `transfersKey(id: string)` = `app/transfers/<id>`, `authorKey(keyId: Uint8Array)` = `author/<hex>`, `receiptKeyKey(keyId: Uint8Array)` = `keys/receipt/<hex>`, `configKey(name: string)` = `config/<name>`, `MIGRATION_KEY` = `governance/migration`, `SEQUENCE_KEY` = `sys/sequence`, `CHAIN_KEY` = `sys/program-chain`.
- Produces value structs, each with `encodeX(x): Uint8Array` and `decodeX(b: Uint8Array): X` (strict, `finish()` enforced):
  - `AccountV1 { balance: bigint }`
  - `TransferLogV1 { entries: Uint8Array[] }` (32-byte event hashes, max `LIMITS.listCount`)
  - `AuthorRecordV1 { role: number; status: number; sequence: bigint; tip: Uint8Array }` (role: 1 author, 2 governance; status: 0 revoked, 1 active)
  - `ReceiptKeyV1 { status: number; sinceSequence: bigint }`
  - `ConfigV1 { current: bigint; next: bigint; nextActivation: bigint }` (`nextActivation = 0n` means no pending)
  - `SequenceV1 { value: bigint }`
  - `ChainStateV1 { chainHash: Uint8Array; updateProgramId: Uint8Array; queryProgramId: Uint8Array }`
  - `PendingMigrationV1 { present: number; migration: Uint8Array }` (present: 0 empty with zero-length bytes, 1 holds a canonical `ProgramMigrationV1`)
- `effectiveConfig(c: ConfigV1, seq: bigint): bigint` — `c.nextActivation > 0n && seq >= c.nextActivation ? c.next : c.current`.

- [ ] **Step 1: Write failing tests**

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  configKey, decodeAccount, decodeConfig, effectiveConfig,
  encodeAccount, encodeConfig,
} from '../src/protocol/state.ts'

test('account roundtrip', () => {
  const b = encodeAccount({ balance: 1500n })
  assert.deepEqual(decodeAccount(b), { balance: 1500n })
})

test('decode rejects trailing byte', () => {
  const b = encodeAccount({ balance: 1n })
  assert.throws(() => decodeAccount(new Uint8Array([...b, 0])))
})

test('config timelock resolution', () => {
  const c = { current: 250n, next: 500n, nextActivation: 10n }
  assert.equal(effectiveConfig(c, 9n), 250n)
  assert.equal(effectiveConfig(c, 10n), 500n)
  assert.equal(effectiveConfig({ ...c, nextActivation: 0n }, 99n), 250n)
})

test('config key bytes', () => {
  assert.equal(
    new TextDecoder().decode(configKey('fee_basis_points')),
    'config/fee_basis_points',
  )
})
```

- [ ] **Step 2: Run to verify failure, implement, re-run**

Run: `node --test test/state.test.ts`
Expected: PASS. Add to `test` script.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): logical state layout"
```

---

### Task 7: Events, acks, and op payloads

**Files:**
- Create: `src/protocol/events.ts`, `src/protocol/ops.ts`
- Test: `test/events.test.ts`

**Interfaces:**
- Produces `events.ts`, spec section 10 verbatim:
  - `AuthorEventV1 { authorKeyId: Uint8Array; authorSequence: bigint; authorPreviousHash: Uint8Array; operation: number; payload: Uint8Array }` with `encodeAuthorEvent` / `decodeAuthorEvent` (payload max `LIMITS.payload`).
  - `signingInput(eventBytes: Uint8Array)` = `hash('author-signing', eventBytes)`.
  - `eventHash(eventBytes, sig)` = `hash('author-event', eventBytes, sig)`.
  - `GlobalEventRecordV1 { globalSequence: bigint; eventHash: Uint8Array; authorEvent: Uint8Array; authorSignature: Uint8Array }` + codec.
  - `WriteAckV1 { eventHash: Uint8Array; acceptedAtMs: bigint; acceptedAgainstSequence: bigint; mustLandBySequence: bigint; receiptKeyId: Uint8Array }` + codec + `ackSigningInput(ackBytes)` = `hash('write-ack', ackBytes)`.
  - `makeSignedEvent(kp: Keypair, authorSequence: bigint, previousTip: Uint8Array, operation: number, payload: Uint8Array): { event: AuthorEventV1; eventBytes: Uint8Array; signature: Uint8Array; eventHash: Uint8Array }`.
- Produces `ops.ts`, op codes and payload codecs:
  - `OP = { OPEN_ACCOUNT: 1, TRANSFER: 2, SET_CONFIG: 16, COMMIT_MIGRATION: 17, SET_RECEIPT_KEY: 18, SET_AUTHOR: 19 } as const`
  - `OpenAccountV1 { accountId: string; initialBalance: bigint }` (accountId lowercase ASCII, max `LIMITS.accountId`, decoder rejects other bytes)
  - `TransferV1 { from: string; to: string; amount: bigint }`
  - `SetConfigV1 { name: string; value: bigint; activationSequence: bigint }`
  - `SetReceiptKeyV1 { keyId: Uint8Array; status: number }`
  - `SetAuthorV1 { keyId: Uint8Array; role: number; status: number }`
  - `COMMIT_MIGRATION` payload is a canonical `ProgramMigrationV1` (Task 8's codec).

- [ ] **Step 1: Write failing tests**

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import {
  decodeAuthorEvent, encodeAuthorEvent, eventHash, makeSignedEvent, signingInput,
} from '../src/protocol/events.ts'
import { keypairFromLabel, verifySig } from '../src/protocol/keys.ts'
import { ZERO32 } from '../src/protocol/constants.ts'
import { encodeTransfer, OP } from '../src/protocol/ops.ts'

test('author event roundtrip and identity', () => {
  const kp = keypairFromLabel('author-alice')
  const payload = encodeTransfer({ from: 'alice', to: 'bob', amount: 100n })
  const s = makeSignedEvent(kp, 1n, ZERO32, OP.TRANSFER, payload)
  const decoded = decodeAuthorEvent(s.eventBytes)
  assert.equal(decoded.authorSequence, 1n)
  assert.ok(verifySig(signingInput(s.eventBytes), s.signature, kp.publicKey))
  assert.equal(hex(s.eventHash), hex(eventHash(s.eventBytes, s.signature)))
})

test('tampered payload breaks the signature', () => {
  const kp = keypairFromLabel('author-alice')
  const payload = encodeTransfer({ from: 'alice', to: 'bob', amount: 100n })
  const s = makeSignedEvent(kp, 1n, ZERO32, OP.TRANSFER, payload)
  const tampered = s.eventBytes.slice()
  tampered[tampered.length - 1] ^= 1
  assert.ok(!verifySig(signingInput(tampered), s.signature, kp.publicKey))
})

test('transfer payload rejects uppercase account id', () => {
  assert.throws(() => encodeTransfer({ from: 'Alice', to: 'bob', amount: 1n }))
})
```

- [ ] **Step 2: Run to verify failure, implement, re-run**

Run: `node --test test/events.test.ts`
Expected: PASS. Add to `test` script.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): author events and op payloads"
```

---

### Task 8: Program identity and migration objects

**Files:**
- Create: `src/protocol/program.ts`
- Test: `test/program.test.ts`

**Interfaces:**
- Produces: `programId(name: string): Uint8Array` = `hash('program-id', ascii(name))`.
- `PROGRAM = { updateV1: programId('vouch-update-v1'), updateV2: programId('vouch-update-v2'), queryV1: programId('vouch-query-v1'), queryV2: programId('vouch-query-v2') }`.
- `ProgramManifestV1` codec per spec 15.1 (`sourceRepository: bytes`, `sourceCommit: bytes`, `cargoLockHash`, `rustToolchainHash`, `buildRecipeHash`, `guestBinaryHash`, `programId`, `protocolVersion: number`). Stand-in hash fields: `hash('program-id', ascii('<name>-manifest-<field>'))`. `manifestFor(name: string): ProgramManifestV1` + `manifestHash(m)` = `hash('program-id', encodeManifest(m))`.
- `ProgramMigrationV1 { nextUpdateProgramId; nextQueryProgramId; nextProgramManifestHash; activationSequence: bigint; governanceAuthorization: Uint8Array }` codec per spec 16.2.
- `chainNext(prev: Uint8Array, updateId: Uint8Array, queryId: Uint8Array, activationSequence: bigint): Uint8Array` = `hash('program-chain', prev, updateId, queryId, u64be(activationSequence))`.
- `GENESIS_CHAIN = chainNext(ZERO32, PROGRAM.updateV1, PROGRAM.queryV1, 0n)`.

- [ ] **Step 1: Write failing tests**

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import {
  chainNext, GENESIS_CHAIN, PROGRAM, programId,
} from '../src/protocol/program.ts'

test('program ids are stable and distinct', () => {
  assert.equal(hex(PROGRAM.updateV1), hex(programId('vouch-update-v1')))
  assert.notEqual(hex(PROGRAM.updateV1), hex(PROGRAM.updateV2))
})

test('chain advances deterministically and binds activation', () => {
  const a = chainNext(GENESIS_CHAIN, PROGRAM.updateV2, PROGRAM.queryV2, 12n)
  const b = chainNext(GENESIS_CHAIN, PROGRAM.updateV2, PROGRAM.queryV2, 13n)
  assert.notEqual(hex(a), hex(b))
})
```

- [ ] **Step 2: Run to verify failure, implement, re-run**

Run: `node --test test/program.test.ts`
Expected: PASS. Add to `test` script.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): program identity and migration objects"
```

---

### Task 9: State views and the update program

**Files:**
- Create: `src/protocol/view.ts`, `src/protocol/transition.ts`
- Test: `test/transition.test.ts`

**Interfaces:**
- Produces `view.ts`:
  - `interface StateView { get(key: Uint8Array): Uint8Array | null; set(key: Uint8Array, value: Uint8Array): void; root(): Uint8Array }`
  - `interface AccessV1 { op: 1 | 2; key: Uint8Array; value: Uint8Array | null; witness: Witness }` + codec (`op u16 || key bytes || valueOpt(0x00 | 0x01||bytes) || witness`). For `op: 2` (set) `value` is null in the encoded access; the replayer derives written values.
  - `class TreeView implements StateView` — direct `Smt` access.
  - `class ProvingView implements StateView` — wraps an `Smt`, records one `AccessV1` per call in call order (get: witness + value; set: witness of the OLD leaf, then applies to the tree). `accesses(): AccessV1[]`.
  - `class ReplayView implements StateView` — constructed with `(startRoot, accesses)`. `get`: pop next access, assert `op === 1` and key match, `verifyWitness(currentRoot, key, value, witness)` else throw `ReplayError('INVALID_PROOF', rule)`, return value. `set`: pop, assert `op === 2` and key match, verify old-leaf witness against `currentRoot`, `currentRoot = rootAfter(witness, newValue)`. `root()` returns `currentRoot`. `assertDrained()` throws if accesses remain.
  - `class ReplayError extends Error { code: 'INVALID_PROOF'; rule: string }`
- Produces `transition.ts`:
  - `TransitionJournalV1` codec per spec 11.2 (`startRoot, endRoot, startSequence: bigint, endSequence: bigint, batchHash, updateProgramId, activeQueryProgramId, programChainHash`).
  - `batchHash(records: GlobalEventRecordV1[]): Uint8Array` = `hash('event-record', ...records.map((r) => r.eventHash))`.
  - `class RuleError extends Error { rule: string }` — thrown on any update-rule violation.
  - `applyBatch(view: StateView, records: GlobalEventRecordV1[], expectedUpdateId: Uint8Array): { journalFields }` implementing, per record, in order:
    1. `sys/sequence` read; `record.globalSequence === stored + 1n` else `RuleError('global-sequence')`.
    2. Era check: read `sys/program-chain`; `chain.updateProgramId` equals `expectedUpdateId` else `RuleError('wrong-era')`. Migration rollover: read `governance/migration`; if pending and `record.globalSequence === migration.activationSequence`, then before applying the record: assert `expectedUpdateId` equals `migration.nextUpdateProgramId` (else `RuleError('era-boundary')`), write `sys/program-chain = { chainHash: chainNext(chain.chainHash, next ids, activation), ids }`, clear pending (`present: 0`). If pending and `record.globalSequence > migration.activationSequence` under the OLD id: `RuleError('era-boundary')`.
    3. `decodeAuthorEvent(record.authorEvent)`; recompute `eventHash` equals `record.eventHash` else `RuleError('event-hash')`.
    4. Author record exists, `status === 1`, else `RuleError('unauthorized-author')`. Ops 16..19 need `role === 2`; ops 1..2 accept role 1 or 2, else `RuleError('operation-not-permitted')`.
    5. `verifySig(signingInput(record.authorEvent), record.authorSignature, authorKeyId)` else `RuleError('author-signature')`.
    6. `event.authorSequence === author.sequence + 1n` else `RuleError('author-sequence')`; `event.authorPreviousHash` equals `author.tip` else `RuleError('author-tip')`.
    7. Apply the op (payload decode failure → `RuleError('payload')`):
       - `OPEN_ACCOUNT`: account absent else `RuleError('account-exists')`; write balance; write empty `TransferLogV1`.
       - `TRANSFER`: both accounts exist; `amount > 0n`; `from.balance >= amount` else `RuleError('insufficient-funds')`; fee = `amount * effectiveConfig(fee, seq) / 10000n` (v1 floor division; v2 ceiling: `(x + 9999n) / 10000n` applied to the product); `from -= amount`; `to += amount - fee`; append `eventHash` to BOTH transfer logs.
       - `SET_CONFIG`: fold pending if `seq >= nextActivation`; `activationSequence >= seq + TIMELOCK_MIN` else `RuleError('timelock')`; write `{ current, next: value, nextActivation }`.
       - `COMMIT_MIGRATION`: pending must be empty else `RuleError('migration-pending')`; `activationSequence >= seq + TIMELOCK_MIN` else `RuleError('timelock')`; write pending.
       - `SET_RECEIPT_KEY`: write `ReceiptKeyV1 { status, sinceSequence: seq }`.
       - `SET_AUTHOR`: write `AuthorRecordV1 { role, status, sequence: existing?.sequence ?? 0n, tip: existing?.tip ?? ZERO32 }`.
    8. Write author record (sequence + 1, tip = eventHash); write `sys/sequence = record.globalSequence`.
  - `TransparentTransitionProofV1 { journal: Uint8Array; records: GlobalEventRecordV1[]; accesses: AccessV1[] }` + codec (records list max `LIMITS.proofEvents`, accesses max `LIMITS.proofAccesses`).
  - `proveBatch(tree: Smt, records, updateId): TransparentTransitionProofV1` — runs `applyBatch` over a `ProvingView`, emits journal + accesses.
  - `verifyTransition(startRoot: Uint8Array, proof, expectedUpdateId): { endRoot, journal }` — decode journal; assert `journal.startRoot` equals `startRoot`; replay `applyBatch` over `ReplayView`; assert drained; assert replayed end root equals `journal.endRoot`, sequences and `batchHash` match; wrap `RuleError`/`ReplayError` as `{ code: 'INVALID_PROOF', rule }`.

- [ ] **Step 1: Write failing tests**

`test/transition.test.ts` uses a shared fixture builder (exported for later tasks) `src/protocol/genesis.ts` — include it in THIS task:
```ts
// src/protocol/genesis.ts
export interface World { tree: Smt; authors: Record<string, Keypair>; governance: Keypair; receiptKey: Keypair }
export function buildGenesis(): World
```
`buildGenesis()` constructs the tree directly (no events): authors alice + bob (role 1 status 1 sequence 0 tip ZERO32), governance key (role 2), receipt key record (`status 1, sinceSequence 0`), `config/fee_basis_points = { current: 250n, next: 0n, nextActivation: 0n }`, `sys/sequence = 0`, `sys/program-chain = { chainHash: GENESIS_CHAIN, updateProgramId: PROGRAM.updateV1, queryProgramId: PROGRAM.queryV1 }`, `governance/migration = { present: 0 }`. `GENESIS_ROOT` = its root.

Tests:
```ts
test('happy batch applies and replays', () => {
  const w = buildGenesis()
  const startRoot = w.tree.root()
  const records = seqRecords(w, [
    ['alice', OP.OPEN_ACCOUNT, encodeOpenAccount({ accountId: 'alice', initialBalance: 10_000n })],
    ['alice', OP.OPEN_ACCOUNT, encodeOpenAccount({ accountId: 'bob', initialBalance: 0n })],
    ['alice', OP.TRANSFER, encodeTransfer({ from: 'alice', to: 'bob', amount: 1000n })],
  ])
  const proof = proveBatch(w.tree, records, PROGRAM.updateV1)
  const out = verifyTransition(startRoot, proof, PROGRAM.updateV1)
  assert.equal(hex(out.endRoot), hex(w.tree.root()))
  // fee 250bp floor: bob gets 1000 - 25 = 975
  const bob = decodeAccount(w.tree.get(accountKey('bob'))!)
  assert.equal(bob.balance, 975n)
})

test('replay rejects a tampered record', () => {
  // build proof, then flip one byte of records[2].authorEvent payload
  // expect verifyTransition -> { code: INVALID_PROOF, rule: 'author-signature' } via thrown error
})

test('replay rejects author replay', () => {
  // duplicate the signed event as globalSequence 4 -> rule 'author-sequence'
})

test('non-contiguous global sequence rejected', () => {
  // skip a sequence number -> rule 'global-sequence'
})

test('timelock enforced', () => {
  // SET_CONFIG activation = seq + 1 -> rule 'timelock'
})
```
Also include the helper `seqRecords(world, specs): GlobalEventRecordV1[]` in `genesis.ts`: it signs author events with correct per-author sequence/tip bookkeeping and wraps them with contiguous global sequences. The tamper tests construct proofs first, mutate the decoded proof structure, re-encode, and expect the typed failure.

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/transition.test.ts`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement `view.ts`, `genesis.ts`, `transition.ts`**

Order: views first, genesis builder, then `applyBatch` per the numbered rules above. Keep `applyBatch` the ONLY implementation of update semantics: prover and verifier both call it.

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `node --test test/transition.test.ts && pnpm --filter vouch typecheck && pnpm --filter vouch lint`
Expected: PASS. Add to `test` script.

- [ ] **Step 5: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): update program with transparent transition proofs"
```

---

### Task 10: Query programs and transparent query proofs

**Files:**
- Create: `src/protocol/query.ts`
- Test: `test/query.test.ts`

**Interfaces:**
- Produces: `QueryRequestV1 { requestType: number; requestVersion: number; body: Uint8Array }` codec; `requestHash(requestBytes)` = `hash('query-request', requestBytes)`.
- `REQ = { GET_BALANCE: 1, LIST_TRANSFERS: 2 } as const`; body codecs `GetBalanceBodyV1 { accountId: string }`, `ListTransfersBodyV1 { accountId: string; limit: number }`.
- Result codecs: `BalanceResultV1 { exists: boolean; balance: bigint }`, `TransfersResultV1 { entries: Uint8Array[] }`; `resultHash(resultBytes)` = `hash('query-result', resultBytes)`.
- `runQuery(view: StateView, requestBytes: Uint8Array, queryId: Uint8Array): Uint8Array` — decode request strictly; dispatch:
  - `GET_BALANCE`: read `accountKey(id)`; absent → `{ exists: false, balance: 0n }`.
  - `LIST_TRANSFERS`: read `transfersKey(id)`; absent → empty; else last `limit` entries.
  - `queryV1` and `queryV2` behave identically (v2 exists for era-walk scenarios).
- `QueryJournalV1 { stateRoot, stateSequence: bigint, requestHash, resultHash, queryProgramId, programChainHash }` codec per spec 12.4.
- `TransparentQueryProofV1 { journal: Uint8Array; accesses: AccessV1[] }` codec.
- `proveQuery(tree: Smt, requestBytes, meta: { stateSequence: bigint; queryProgramId; programChainHash }): { resultBytes; proof }` — `ProvingView`, run, build journal.
- `verifyQuery(proof, expected: { stateRoot; stateSequence; requestHash; resultHash; queryProgramId; programChainHash }): void` — decode journal, compare all six fields against `expected` (mismatch → `{ code: 'JOURNAL_MISMATCH' }`), replay `runQuery` over `ReplayView(journal.stateRoot, accesses)`, assert drained, assert `resultHash(replayedResult)` equals `journal.resultHash` (else `{ code: 'INVALID_PROOF', rule: 'result' }`).

- [ ] **Step 1: Write failing tests**

```ts
test('balance query proves and replays', () => {
  // genesis + open/transfer batch, proveQuery get-balance(bob),
  // verifyQuery passes with matching expected fields
})

test('completeness: list-transfers returns the witnessed full log tail', () => {
  // 3 transfers, limit 2 -> entries are the LAST two event hashes, replay passes
})

test('a lying result hash fails replay', () => {
  // proveQuery, then swap journal.resultHash for hash of a forged result
  // -> INVALID_PROOF rule 'result'... journal re-encoded; expected fields updated to match the forged journal so the failure comes from replay, not field compare
})

test('non-membership balance verifies', () => {
  // get-balance('ghost') -> exists false, replay passes with non-membership access
})
```

- [ ] **Step 2: Run to verify failure, implement, re-run**

Run: `node --test test/query.test.ts`
Expected: PASS. Add to `test` script.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): query programs with transparent proofs"
```

---

### Task 11: Receipts, heads, trust state, evidence

**Files:**
- Create: `src/protocol/receipt.ts`, `src/protocol/head.ts`, `src/protocol/trust.ts`, `src/protocol/evidence.ts`
- Test: `test/receipt-head.test.ts`

**Interfaces:**
- `receipt.ts`: `QueryReceiptV1 { receiptKeyId, stateRoot, stateSequence: bigint, requestHash, resultHash, queryProgramId, programChainHash, nonce: Uint8Array, issuedAtMs: bigint, proofDeadlineMs: bigint }` codec (spec 13.1 order); `receiptSigningInput(receiptBytes)` = `hash('query-receipt', receiptBytes)`; `proofCacheKey(queryProgramId, stateRoot, reqHash)` = `hash('proof-cache-key', queryProgramId, stateRoot, reqHash)`.
- `head.ts`: `LatestHeadV1 { head: HeadIdV1; latestAsOfMs: bigint; headKeyId }` with `HeadIdV1 { sequence: bigint; stateRoot; updateProgramId; queryProgramId; programChainHash }` (spec 9.3); `headSigningInput(headBytes)` = `hash('latest-head', headBytes)`; `checkFreshness(head, nowMs: bigint, policy): 'ok' | 'STALE_HEAD' | 'FUTURE_HEAD'`.
- `trust.ts`: `ClientTrustStateV1 { protocolVersion: number; highestSequence: bigint; acceptedRoot; programChainHash; activeUpdateProgramId; activeQueryProgramId; activeKeyStateHash; lastLatestAsOfMs: bigint }` codec; `genesisTrust(anchors): ClientTrustStateV1`; `keyStateHash(entries: { keyId, status, sinceSequence }[]): Uint8Array` — sort by keyId hex, canonical list, `hash('state-value', encoded)`.
- `evidence.ts`: `type Taxonomy = 'PREVENTED_BY_MATH' | 'PROVABLE_ON_RECORD' | 'POSSIBLE_UNDER_GOVERNANCE' | 'LIMITATION'`; `interface SignedHead { headBytes: Uint8Array; signature: Uint8Array }`; `interface SignedAck { ackBytes: Uint8Array; signature: Uint8Array }`; `headConflict(a: SignedHead, b: SignedHead): Evidence | null` (same key + same `latestAsOfMs` + different root, or later timestamp with lower sequence); `ackOmission(ack: SignedAck, provenThrough: bigint, included: boolean): Evidence | null` (evidence only when `provenThrough >= mustLandBySequence && !included`); `interface Evidence { kind: 'head-conflict' | 'ack-omission'; taxonomy: 'PROVABLE_ON_RECORD'; detail: string; objects: Uint8Array[] }`.

- [ ] **Step 1: Write failing tests**

```ts
test('receipt roundtrip and signature', () => { /* encode, sign with receipt key, verify */ })
test('proof cache key excludes nonce', () => {
  // two receipts, different nonces, same (program, root, request) -> equal cache keys
})
test('freshness window', () => {
  // now=100_000: asOf=95_000 ok; asOf=30_000 STALE (max 60s); asOf=106_000 FUTURE (skew 5s)
})
test('head conflict detected', () => { /* same ms, different roots -> evidence */ })
test('ack omission requires crossed boundary', () => {
  // provenThrough < mustLandBy -> null; >= and missing -> evidence
})
test('trust state roundtrip', () => { /* codec + genesisTrust fields */ })
```

- [ ] **Step 2: Run to verify failure, implement, re-run**

Run: `node --test test/receipt-head.test.ts`
Expected: PASS. Add to `test` script.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): receipts, heads, trust state, evidence"
```

---

### Task 12: Terminal verifier

**Files:**
- Create: `src/protocol/verify.ts`, `src/protocol/bundle.ts`
- Test: `test/verify.test.ts`

**Interfaces:**
- `bundle.ts`: `interface ResponseBundle { canonicalRequest: Uint8Array; canonicalResult: Uint8Array; receipt: Uint8Array; receiptSignature: Uint8Array; receiptKeyWitness: AccessV1; queryProof: Uint8Array; transitions: Uint8Array[]; migrations: Uint8Array[]; latestHead: Uint8Array | null; latestHeadSignature: Uint8Array | null }` + codec (`encodeBundle`/`decodeBundle`, strict).
- `verify.ts`:
  - `type VerifyErrorCode = 'MALFORMED_TRANSPORT' | 'MALFORMED_CANONICAL_OBJECT' | 'UNSUPPORTED_PROTOCOL_VERSION' | 'INVALID_SIGNATURE' | 'UNAUTHORIZED_KEY' | 'NONCE_MISMATCH' | 'REQUEST_HASH_MISMATCH' | 'RESULT_HASH_MISMATCH' | 'INVALID_PROOF' | 'JOURNAL_MISMATCH' | 'INVALID_PROGRAM_CHAIN' | 'ROLLBACK_DETECTED' | 'STALE_HEAD' | 'FUTURE_HEAD' | 'STATE_PERSISTENCE_FAILED'`
  - `interface VerifyInput { expectedRequest: Uint8Array; expectedNonce: Uint8Array; bundleBytes: Uint8Array; trust: ClientTrustStateV1; nowMs: bigint; requireFreshHead: boolean }`
  - `interface CheckLog { step: number; name: string; pass: boolean; error?: VerifyErrorCode }` — the verifier appends one entry per spec-17 step for the dashboard checklist.
  - `verifyBundle(input): { ok: true; result: Uint8Array; next: ClientTrustStateV1; evidence: Evidence[]; checks: CheckLog[] } | { ok: false; error: VerifyErrorCode; rule?: string; checks: CheckLog[] }`
  - Step mapping (spec section 17, exact order): 1 decode bundle (`MALFORMED_TRANSPORT`); 2 extract byte objects; 3 decode receipt (`MALFORMED_CANONICAL_OBJECT`); 4 receipt key authorized at `stateSequence` via `receiptKeyWitness` against `receipt.stateRoot`: witness valid (`INVALID_PROOF`), decoded `ReceiptKeyV1.status === 1` and `sinceSequence <= stateSequence` (`UNAUTHORIZED_KEY`); 5 `verifySig(receiptSigningInput, receiptSignature, receiptKeyId)` (`INVALID_SIGNATURE`); 6 nonce equality (`NONCE_MISMATCH`); 7-8 request hash (`REQUEST_HASH_MISMATCH`); 9-10 result hash (`RESULT_HASH_MISMATCH`); 11 `stateSequence >= trust.highestSequence` (`ROLLBACK_DETECTED`); 12 `verifyQuery` replay (`INVALID_PROOF`); 13 journal fields vs receipt (`JOURNAL_MISMATCH`); 14 walk `transitions` from `(trust.acceptedRoot, trust.highestSequence)` to `(receipt.stateRoot, receipt.stateSequence)` via `verifyTransition`, era per current chain walk (`INVALID_PROOF`; gap or wrong endpoints → `INVALID_PROOF` rule `'continuity'`); 15 walk `migrations` where journal program ids change: each `ProgramMigrationV1` must match the new ids, `activationSequence` must equal the boundary sequence, chain hash must advance by `chainNext` (`INVALID_PROGRAM_CHAIN`); 16 if `requireFreshHead`: head present, signature valid (`INVALID_SIGNATURE`), key active (`UNAUTHORIZED_KEY`), `checkFreshness` (`STALE_HEAD` / `FUTURE_HEAD`), `head.sequence >= receipt.stateSequence` and `>= trust.highestSequence` (`ROLLBACK_DETECTED`), if equal sequence then equal root (`JOURNAL_MISMATCH`); 17 build next trust state (highest = max of receipt/head sequence, accepted root = the verified endpoint root, chain + program ids from the walked era, `lastLatestAsOfMs`); 18 persistence is the caller's duty; 19 return result.
  - The final-era `queryProgramId` from the chain walk must equal `receipt.queryProgramId` (`INVALID_PROGRAM_CHAIN`), and only registry ids (`PROGRAM.*`) are executable — unknown id → `INVALID_PROGRAM_CHAIN`.

- [ ] **Step 1: Write failing tests**

Build one honest fixture (genesis → 3-event batch → get-balance bundle with fresh head) via a helper `makeHonestBundle(world)` placed in `test/helpers.ts`, then:
```ts
test('honest bundle verifies end to end', () => { /* ok: true, 19 checks, all pass */ })
test('flipped result byte -> RESULT_HASH_MISMATCH', () => { /* mutate canonicalResult */ })
test('wrong nonce -> NONCE_MISMATCH', () => { /* expectedNonce = other bytes */ })
test('zeroed receipt signature -> INVALID_SIGNATURE', () => {})
test('trust ahead of receipt -> ROLLBACK_DETECTED', () => { /* trust.highestSequence = receipt+1 */ })
test('missing transition link -> INVALID_PROOF continuity', () => { /* drop transitions[0] */ })
test('stale head -> STALE_HEAD', () => { /* nowMs far ahead */ })
```

- [ ] **Step 2: Run to verify failure, implement, re-run**

Run: `node --test test/verify.test.ts && pnpm --filter vouch typecheck && pnpm --filter vouch lint`
Expected: PASS. Add to `test` script.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): terminal verifier"
```

---

### Task 13: Golden vectors

**Files:**
- Create: `scripts/vectors.ts`, `fixtures/protocol-v1/vectors.json`, `test/vectors.test.ts`

**Interfaces:**
- Produces `scripts/vectors.ts`: builds `{ meta: { magic: 'VOUCH', protocolVersion: 1, seeds: string[] }, entries: VectorEntry[] }` where `VectorEntry { name: string; kind: 'hash' | 'object' | 'root' | 'signature'; decoded: unknown; hex: string; hash?: string }`. Entries MUST cover: each domain hash over fixed inputs; canonical hex of one instance of every codec (`AuthorEventV1`, `GlobalEventRecordV1`, `WriteAckV1`, every op payload, every state value, `Witness`, `AccessV1`, `TransitionJournalV1`, `TransparentTransitionProofV1`, `QueryRequestV1`, both results, `QueryJournalV1`, `TransparentQueryProofV1`, `QueryReceiptV1`, `LatestHeadV1`, `HeadIdV1`, `ProgramManifestV1`, `ProgramMigrationV1`, `ClientTrustStateV1`, `ResponseBundle`); `EMPTY[0]`, `EMPTY[256]`, `GENESIS_ROOT`, the happy-batch end root; program ids and `GENESIS_CHAIN`; one receipt signature from the seeded receipt key. All sample values from `buildGenesis()` and the Task 9 happy batch. Writes pretty JSON with `node:fs`.
- Produces `test/vectors.test.ts`: imports the same builder function (export `buildVectors()` from the script), reads the committed JSON, deep-equals. A drifted vector fails with the entry name.

- [ ] **Step 1: Write the generator and test, generate, freeze**

Run: `pnpm --filter vouch vectors && node --test test/vectors.test.ts`
Expected: PASS. Inspect the JSON once by eye: magic, sizes, no `undefined`.

- [ ] **Step 2: Verify drift detection**

Temporarily change one byte in the JSON, run the test, expect FAIL naming the entry, revert.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): golden vectors for protocol v1"
```

---

### Task 14: Actors, trace contract, scenario 4 (honest-query)

**Files:**
- Create: `src/actors/server.ts`, `src/actors/client.ts`, `src/scenarios/trace.ts`, `src/scenarios/s04-honest-query.ts`
- Test: `test/scenarios-a.test.ts`

**Interfaces:**
- `trace.ts`:
  ```ts
  export type Actor = 'author' | 'server' | 'client' | 'attacker' | 'peer'
  export type VerdictKind = 'ACCEPT' | 'REJECT' | 'EVIDENCE' | 'LIMITATION'
  export interface TraceObject { name: string; type: string; hex: string; hash?: string; decoded: Record<string, string> }
  export interface TraceStep { actor: Actor; kind: 'act' | 'object' | 'check'; label: string; detail?: string; objects?: TraceObject[]; check?: { name: string; pass: boolean; error?: string } }
  export interface Verdict { kind: VerdictKind; error?: string; note: string }
  export interface Trace { steps: TraceStep[]; verdict: Verdict; checks?: CheckLog[] }
  export interface Scenario { meta: { id: number; slug: string; title: string; taxonomy: Taxonomy; specRefs: string[]; expected: string }; run(): Trace }
  export function obj(name: string, type: string, bytes: Uint8Array, decoded: Record<string, string>): TraceObject
  ```
- `server.ts`: `class Server` — fields PUBLIC on purpose: `tree: Smt`, `log: GlobalEventRecordV1[]`, `world: World`, `updateId`, `queryId`, `chainHash`, `proofCache: Map<string, Uint8Array>`, `clockMs: bigint` (starts `1_754_000_000_000n`, advances 1000n per action). Methods: `submit(record | signedEvent): WriteAck + signature` (validates via a cloned tree, sequences, appends), `sealBatch(): TransparentTransitionProofV1` (proves pending records since last seal, caches), `execute(requestBytes, nonce): { resultBytes; receiptBytes; receiptSig }` (provisional run on `TreeView`, receipt at current root/sequence, `proofDeadlineMs = clock + 30_000n`), `proofFor(receiptBytes): ResponseBundle` (query proof from cache by `proofCacheKey`, transitions since the client checkpoint — parameter `sinceSequence: bigint`, plus migrations + head), `signedHead(): { headBytes; sig }`.
- `client.ts`: `class Client` — `trust: ClientTrustStateV1`, `store: { committed: Uint8Array | null }`, `prng: Prng`. Methods: `request(requestBytes): { nonce }`, `acceptBundle(bundleBytes, nowMs): VerifyOutcome` (calls `verifyBundle`, on ok atomically swaps `store.committed = encodeTrust(next)` then updates `trust`), `highest(): bigint`.
- `s04-honest-query.ts` — the full happy path, emitting trace steps for: genesis anchors (object), three author events (objects with hashes), batch seal (journal object), query request + nonce (act), receipt (object), bundle verify (check per §17 step from `checks`), verdict ACCEPT with note quoting the spec-1 acceptance claim.

- [ ] **Step 1: Write failing tests**

```ts
import { scenario as s04 } from '../src/scenarios/s04-honest-query.ts'

test('s04 honest query accepts', () => {
  const t = s04.run()
  assert.equal(t.verdict.kind, 'ACCEPT')
  assert.ok(t.steps.length >= 8)
  assert.ok(t.steps.some((s) => s.kind === 'check' && s.check?.pass))
})

test('s04 is deterministic', () => {
  assert.deepEqual(s04.run(), s04.run())
})
```

- [ ] **Step 2: Run to verify failure, implement, re-run**

Run: `node --test test/scenarios-a.test.ts`
Expected: PASS. Add to `test` script.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): actors, trace contract, honest-query scenario"
```

---

### Tasks 15-21: The remaining 21 scenarios

Seven tasks, three scenarios each, same structure every time. Per task: create the three scenario files, add asserts to the group test file, run, commit. Scenario files follow the s04 pattern: build world + server + client via shared helpers, perform the listed acts, emit objects for every canonical artifact touched, end with the exact verdict. Each scenario's test asserts `verdict.kind`, `verdict.error` where listed, and determinism (`deepEqual(run(), run())`).

**Task 15** — `test/scenarios-b.test.ts`, commit `feat(vouch): scenarios 1-3`
- `s01-author-concurrency` (ACCEPT): alice and bob interleave a1 b1 a2 b2 as sequences 1-4. Seal. Trace shows both author tips advancing independently. Honest get-balance verifies.
- `s02-payload-tampering` (REJECT `INVALID_PROOF`, rule `author-signature`): attacker flips byte 0 of a signed transfer's payload inside the sequenced record. Server seals anyway (malicious). Client transition replay fails.
- `s03-author-replay` (REJECT `INVALID_PROOF`, rule `author-sequence`): server re-sequences alice's event 1 verbatim as global 2. Trace first shows the honest server refusing at submit (`RuleError` surfaced as a failed check), then the malicious seal, then client rejection.

**Task 16** — `test/scenarios-c.test.ts`, commit `feat(vouch): scenarios 5-7`
- `s05-hidden-algorithm` (REJECT `INVALID_PROOF`, rule `result`): server computes the provisional balance with a hidden `+1000n` bonus function, signs receipt over the lying result hash, forges a matching journal. Replay of the published query program disagrees.
- `s06-shared-proof` (ACCEPT twice): two clients, same request, different nonces. One proof artifact: trace asserts both bundles carry byte-identical `queryProof` and equal `proofCacheKey`, receipts differ only in nonce. Both verify.
- `s07-missing-signature-nonce-replay` (REJECT `INVALID_SIGNATURE`, then `NONCE_MISMATCH`): (a) zero the receipt signature → reject at step 5. (b) replay client A's full bundle to client B → B's nonce check rejects at step 6.

**Task 17** — `test/scenarios-d.test.ts`, commit `feat(vouch): scenarios 8-10`
- `s08-database-swap` (REJECT `INVALID_PROOF`): server builds a shadow tree (alice balance ×100), answers from it, receipt claims the shadow root. Transitions from genesis prove the canonical root; the walk endpoint mismatches → continuity failure.
- `s09-env-var-semantics` (REJECT `INVALID_PROOF`, rule `result`): the server's provisional execution takes the fee from a mutable `env.FEE_BP = 9999n` field instead of the canonical config value 250. The provisional balance and receipt reflect the env fee. Replay with the committed config disagrees. The trace shows the env var as a server-side object labeled untrusted.
- `s10-returning-rollback` (REJECT `ROLLBACK_DETECTED`): client verifies at sequence 6, trust persists. Server then serves a fully valid bundle at sequence 3 (old snapshot kept). Step 11 rejects. Trace highlights: the old bundle is internally valid, only history position fails.

**Task 18** — `test/scenarios-e.test.ts`, commit `feat(vouch): scenarios 11-13`
- `s11-isolated-freeze` (LIMITATION): server stops sequencing. Client re-queries within the freshness window: head is recent, sequence unchanged → ACCEPT verdict on the bundle, scenario verdict LIMITATION with the exact required wording: `Rollback is prevented for returning clients; freezing is not.`
- `s12-head-conflict-gossip` (EVIDENCE): server signs two heads, same `latestAsOfMs`, different roots (canonical + shadow), hands one to each client. Peer exchange runs `headConflict` → evidence object with both signed heads. Taxonomy `PROVABLE_ON_RECORD`.
- `s13-stale-head` (REJECT `STALE_HEAD`): head signed at `now - 61_000` with `requireFreshHead: true`, policy max 60s.

**Task 19** — `test/scenarios-f.test.ts`, commit `feat(vouch): scenarios 14-16`
- `s14-omitted-write` (EVIDENCE): alice submits, gets signed ack `mustLandBySequence = 5`. Server drops the event and seals through sequence 6. Client verifies history to 6, runs `ackOmission(ack, 6n, included: false)` → evidence. Trace contrasts with `provenThrough = 4` returning null (not yet evidence).
- `s15-missed-proof-deadline` (LIMITATION): receipt `proofDeadlineMs` passes with proof pending. Client marks the receipt overdue locally. Trace states: locally observable, not portable proof of omission (spec 6.2).
- `s16-float-config` (REJECT at rule, surfaced `MALFORMED_CANONICAL_OBJECT`): governance submits SET_CONFIG whose payload bytes carry IEEE-754 `0.075` (8 bytes of `3FB3333333333333`) where the canonical `u64` struct is required — decode fails (`rule 'payload'`). Honest server refuses; a forced seal fails client replay the same way.

**Task 20** — `test/scenarios-g.test.ts`, commit `feat(vouch): scenarios 17-19`
- `s17-config-timelock` (ACCEPT): SET_CONFIG fee 500bp at sequence s with `activationSequence = s + 3`. A transfer before the boundary pays 250bp; a transfer at the boundary pays 500bp; both verified by query. A malicious early application (server computes fee 500 one sequence early) fails replay — shown as a failed check inside the trace, final verdict ACCEPT.
- `s18-early-migration` (REJECT `INVALID_PROGRAM_CHAIN`): migration committed with activation A; server rolls the era at A-1 (seals a batch under updateV2 starting before A). The client's migration walk finds the boundary sequence mismatched.
- `s19-migration-chain` (ACCEPT): commit migration v1→v2 (activation A, both program ids change, manifest hash present). Seal to A-1 under v1; seal from A under v2 (rollover writes the new chain state). Post-migration transfer shows the v2 ceiling fee (1000 → fee 25 floor vs ceil visible with amount 999: floor 24 vs ceil 25). Query under v2 receipt. Client walks the chain: `chainNext` advances, ids match, ACCEPT. Taxonomy `POSSIBLE_UNDER_GOVERNANCE`.

**Task 21** — `test/scenarios-h.test.ts`, commit `feat(vouch): scenarios 20-22` — plus the registry
- `s20-key-rotation` (ACCEPT + REJECT `UNAUTHORIZED_KEY`): governance SET_RECEIPT_KEY adds key2 (active) and revokes key1. Post-rotation: receipt signed by key1 → witness shows status 0 → `UNAUTHORIZED_KEY`; receipt by key2 → ACCEPT. Taxonomy `POSSIBLE_UNDER_GOVERNANCE`.
- `s21-first-contact-fork` (LIMITATION): two worlds from the same genesis, different event histories (A: transfer 100; B: transfer 999). A fresh client (genesis trust) receives a fully valid world-B bundle → verifies ok. Trace shows world A existing simultaneously. Note: first contact proves descent, not uniqueness (spec 18).
- `s22-authorized-false-data` (LIMITATION): alice opens account `auditor` with `initialBalance 1_000_000n` — a physical-world lie. Every check passes. Note: the system authenticates authorization and computation, not truth (spec 4).
- Create `src/scenarios/index.ts`: `export const scenarios: Scenario[]` importing all 22, sorted by id. Test asserts: 22 entries, ids 1..22 unique, slugs match DESIGN's table, every `run()` deterministic and matching `meta.expected`.

---

### Task 22: Dashboard shell

**Files:**
- Create: `src/ui/app.ts`, `src/ui/format.ts`, `src/styles.css`
- Modify: `src/main.ts`, `index.html`

**Interfaces:**
- Consumes: `scenarios` from `src/scenarios/index.ts`, `Trace`/`TraceStep` types.
- Produces `format.ts`: `shortHash(hex: string): string` (first 8 + … + last 4), `ms(n: number): string`.
- Produces `app.ts`: `mount(root: HTMLElement): void` — renders header (name, expansion `Verified Output Under Canonical History`, the spec section 1 acceptance claim in a `<pre>`, genesis anchors as hash chips) and the 22-row table (id, title, taxonomy chip, expected, verdict cell, run-time cell). On load, runs all scenarios inside `requestAnimationFrame` batches (one scenario per frame, verdict cells fill progressively; `performance.now()` deltas for the ms column). A `run all` button re-runs.
- `src/main.ts` becomes: `import { mount } from './ui/app.ts'` + css import + `mount(document.querySelector('#app')!)`.

- [ ] **Step 1: Build shell, verify in dev**

Run: `pnpm --filter vouch dev`, open the page. All 22 rows fill with verdicts matching `meta.expected`. Zero console errors.

- [ ] **Step 2: Gates**

Run: `pnpm --filter vouch typecheck && pnpm --filter vouch lint && pnpm --filter vouch test && pnpm --filter vouch build`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): dashboard shell with live verdicts"
```

---

### Task 23: Trace expansion

**Files:**
- Create: `src/ui/trace-view.ts`, `src/ui/inspector.ts`
- Modify: `src/ui/app.ts`, `src/styles.css`

**Interfaces:**
- Consumes: `Trace`, `TraceStep`, `TraceObject`, `CheckLog`.
- Produces `trace-view.ts`: `renderTrace(t: Trace): HTMLElement` — actor-grouped timeline (actor badge + label per step, `detail` as muted line), check steps as pass/fail marks with error codes, the section-17 checklist when `t.checks` present (19 numbered entries), verdict banner (kind, error code, note, taxonomy chip).
- Produces `inspector.ts`: `renderObject(o: TraceObject): HTMLElement` — name + type header, decoded field table, and a decoded/hex toggle; hex view wraps at 32 bytes per line with the object hash beneath.
- Row click toggles expansion; the trace renders lazily on first expand.
- Accessibility: rows are `<button>`-triggered disclosure (`aria-expanded`), toggle is a real control, all interactive elements keyboard reachable.

- [ ] **Step 1: Build, verify in dev**

Open s04 (all-green checklist, inspectable receipt) and s02 (failed check with rule) by hand. Toggle decoded/hex on a receipt object.

- [ ] **Step 2: Gates**

Run: `pnpm --filter vouch typecheck && pnpm --filter vouch lint && pnpm --filter vouch test && pnpm --filter vouch build`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): trace timeline and object inspector"
```

---

### Task 24: README, visual pass, final gates

**Files:**
- Create: `apps/vouch/README.md`
- Modify: `src/styles.css` (visual direction pass)

- [ ] **Step 1: Visual direction**

Invoke the frontend-design skill, propose one direction for the dashboard, get owner sign-off, apply it in `styles.css` only (no markup restructuring beyond classes).

- [ ] **Step 2: README**

The aol pattern: what it is (one paragraph + the acceptance claim), Run, Test, Deploy (Vercel root `apps/vouch`, framework Vite, output `dist`, no env vars), a spec-coverage table (spec section → module), the 22-scenario table (id, slug, verdict), deviations (the three from DESIGN.md), and the golden-vectors note for the future Rust port.

- [ ] **Step 3: Full gates and screenshot**

Run: `pnpm --filter vouch typecheck && pnpm --filter vouch lint && pnpm --filter vouch test && pnpm --filter vouch build`
Expected: all PASS. Then serve `dist` via `pnpm --filter vouch preview` and capture a headless Chrome screenshot of the loaded dashboard with one row expanded. Attach findings; fix rendering issues before commit.

- [ ] **Step 4: Commit**

```bash
git add apps/vouch
git commit -m "feat(vouch): readme and dashboard visual pass"
```
