# Bonfire shared sessions implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One person hosts a bonfire session. Friends open a link and share the same timer and the same music.

**Architecture:** Host-authoritative state over Nostr relays. The host publishes sealed snapshot events on a hashed topic. Followers subscribe and converge their local SoundCloud widget and countdown. No WebRTC. No audio bytes on the wire.

**Tech Stack:** Next.js 16 client components, node:test, `@noble/ciphers` + `@noble/curves` + `@noble/hashes` (2.2.0, same as irc), the SoundCloud HTML5 widget API.

**Spec:** `docs/superpowers/specs/2026-08-10-bonfire-shared-sessions-design.md`. The spec wins on conflict.

## Global constraints

- Wire protocol name: `bonfire/v0`. Nostr kind: `21315`. Relays: the five irc defaults.
- Seal: XChaCha20-Poly1305 under `HKDF(secret)`, pad buckets `[256, 1024, 4096, 16384]`.
- Cadence: keepalive 10 s, presence 15 s, peer expiry 3 misses (45 s), host silent 30 s, drift tolerance 2 s, nick max 24 chars.
- `seq` seeds from clock seconds. Followers accept `state` only when `seq` increases.
- Test-reachable modules use relative imports with `.ts` extensions. Bare `services/...` paths crash `node --test`.
- Git: commit subjects only, no bodies, no trailers. Never create a branch. Stage listed files only, never `git add -A`: sibling sessions edit this repo in parallel.
- Any `pnpm-lock.yaml` change requires the vouch witness: `pnpm --filter vouch program-id`, then `pnpm --filter vouch vectors`, then a green `pnpm --filter vouch test`.
- All commands run from the repo root `/Users/sospedra/labs/sospedra.me`.
- UI copy stays lowercase and quiet, matching "gathering wood…" and "the working room".
- Code comments: only the three earned cases. Default zero.

---

### Task 1: Crypto dependencies plus lockfile witness

**Files:**
- Modify: `apps/bonfire/package.json` (dependencies)
- Modify: `pnpm-lock.yaml` (via pnpm)
- Modify: whatever `pnpm --filter vouch program-id` and `vectors` regenerate (via those scripts, never by hand)

**Interfaces:**
- Consumes: nothing.
- Produces: `@noble/ciphers@2.2.0`, `@noble/curves@2.2.0`, `@noble/hashes@2.2.0` resolvable from `apps/bonfire`.

- [ ] **Step 1: Add the three packages**

Run: `pnpm --filter bonfire add @noble/ciphers@2.2.0 @noble/curves@2.2.0 @noble/hashes@2.2.0`

- [ ] **Step 2: Run the vouch lockfile witness**

Run, in order:

```bash
pnpm --filter vouch program-id
pnpm --filter vouch vectors
pnpm --filter vouch test
```

Expected: the vouch suite passes. A red vouch suite here means the witness files did not regenerate. Re-run the two scripts. Never edit witness files by hand.

- [ ] **Step 3: Confirm bonfire still passes its gates**

Run: `pnpm --filter bonfire test && pnpm --filter bonfire typecheck`
Expected: PASS (existing tests only).

- [ ] **Step 4: Commit**

```bash
git add apps/bonfire/package.json pnpm-lock.yaml
git status --short
```

Inspect the status. If the vouch scripts changed files, add those exact paths too. Then:

```bash
git commit -m "chore(bonfire): add noble crypto dependencies"
```

---

### Task 2: Port the irc mesh modules

**Files:**
- Create: `apps/bonfire/services/mesh/constants.ts`
- Create: `apps/bonfire/services/mesh/bytes.ts` (copy)
- Create: `apps/bonfire/services/mesh/seal.ts` (copy)
- Create: `apps/bonfire/services/mesh/nostr-event.ts` (copy)
- Create: `apps/bonfire/services/mesh/nostr-pool.ts` (copy, 4 line edits)
- Create: `apps/bonfire/services/mesh/topics.ts` (new, one function)
- Test: `apps/bonfire/services/mesh/bytes.test.ts`, `seal.test.ts`, `nostr-event.test.ts`, `topics.test.ts`
- Modify: `apps/bonfire/package.json` (test script)

**Interfaces:**
- Consumes: `@noble/*` from Task 1.
- Produces:
  - `deriveGroupKey(topicSecret: string): Uint8Array`, `seal(key, nonce, plaintext): Uint8Array`, `open(key, nonce, sealed): Uint8Array | null`
  - `sessionTopic(appId: string, sessionId: string, secret: string): string`
  - `buildEvent(input: { secret: Uint8Array; kind: number; tags: string[][]; content: string; createdAtSec: number }): NostrEvent`, `verifyEvent(value: unknown): NostrEvent | null`, `topicOf(event): string | null`, type `NostrEvent`
  - `class NostrPool` with `start()`, `subscribe(topic, onEvent): string`, `unsubscribe(id)`, `publish(event): number`, `stop()`, constructed with `{ urls, log(line), onState(url, state) }`
  - `toHex`, `fromHex`, `utf8`, `concat`, `randomBytes`, `bytesEqual`, `u32be`, `readU32be`, `u64be`, `isHexOfBytes` from `bytes.ts`
  - Constants: `APP_ID`, `NOSTR_KIND`, `DEFAULT_RELAYS`, `PAD_BUCKETS`, `KEEPALIVE_MS`, `PRESENCE_MS`, `PRESENCE_MISS`, `HOST_SILENT_MS`, `SWEEP_MS`, `DRIFT_TOLERANCE_MS`, `NICK_MAX`

- [ ] **Step 1: Write `constants.ts`**

```ts
export const APP_ID = 'bonfire/v0'

export const NOSTR_KIND = 21_315
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://offchain.pub',
  'wss://nostr.mom',
]

export const PAD_BUCKETS = [256, 1024, 4096, 16_384] as const

export const KEEPALIVE_MS = 10_000
export const PRESENCE_MS = 15_000
export const PRESENCE_MISS = 3
export const HOST_SILENT_MS = 30_000
export const SWEEP_MS = 5_000
export const DRIFT_TOLERANCE_MS = 2_000
export const NICK_MAX = 24
```

- [ ] **Step 2: Copy the verbatim modules**

```bash
cp apps/irc/src/mesh/bytes.ts apps/bonfire/services/mesh/bytes.ts
cp apps/irc/src/mesh/seal.ts apps/bonfire/services/mesh/seal.ts
cp apps/irc/src/mesh/nostr-event.ts apps/bonfire/services/mesh/nostr-event.ts
cp apps/irc/src/platform/nostr-pool.ts apps/bonfire/services/mesh/nostr-pool.ts
```

`bytes.ts`, `seal.ts`, `nostr-event.ts` need zero edits. Their relative imports (`./bytes.ts`, `./constants.ts`) resolve against the new `constants.ts`, which exports the same `APP_ID` and `PAD_BUCKETS` names.

- [ ] **Step 3: Edit `nostr-pool.ts` imports and the subscription prefix**

Replace the three import lines:

```ts
import { randomBytes, toHex } from '../mesh/bytes.ts'
import { NOSTR_KIND } from '../mesh/constants.ts'
import { type NostrEvent, topicOf, verifyEvent } from '../mesh/nostr-event.ts'
```

with:

```ts
import { randomBytes, toHex } from './bytes.ts'
import { NOSTR_KIND } from './constants.ts'
import { type NostrEvent, topicOf, verifyEvent } from './nostr-event.ts'
```

Replace `` const id = `irc-${toHex(randomBytes(4))}` `` with `` const id = `bonfire-${toHex(randomBytes(4))}` ``.

- [ ] **Step 4: Write `topics.ts`**

```ts
import { sha256 } from '@noble/hashes/sha2.js'
import { concat, toHex, utf8 } from './bytes.ts'

export const sessionTopic = (
  appId: string,
  sessionId: string,
  secret: string,
): string => toHex(sha256(concat(utf8(appId), utf8(sessionId), utf8(secret))))
```

- [ ] **Step 5: Copy the tests and fix their imports**

```bash
cp apps/irc/test/bytes.test.ts apps/bonfire/services/mesh/bytes.test.ts
cp apps/irc/test/seal.test.ts apps/bonfire/services/mesh/seal.test.ts
cp apps/irc/test/nostr-event.test.ts apps/bonfire/services/mesh/nostr-event.test.ts
```

In each copied test, change every `'../src/mesh/<name>.ts'` import to `'./<name>.ts'`.

Write `apps/bonfire/services/mesh/topics.test.ts`:

```ts
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { sessionTopic } from './topics.ts'

const sha256hex = (...parts: Buffer[]) =>
  createHash('sha256').update(Buffer.concat(parts)).digest('hex')

test('sessionTopic is sha256(appId || sessionId || secret)', () => {
  const topic = sessionTopic('bonfire/v0', 'fire-1', 's3cret')
  const expected = sha256hex(
    Buffer.from('bonfire/v0'),
    Buffer.from('fire-1'),
    Buffer.from('s3cret'),
  )
  assert.equal(topic, expected)
  assert.equal(topic.length, 64)
})

test('sessionTopic changes with every component', () => {
  const base = sessionTopic('bonfire/v0', 'fire-1', 's3cret')
  assert.notEqual(sessionTopic('bonfire/v1', 'fire-1', 's3cret'), base)
  assert.notEqual(sessionTopic('bonfire/v0', 'fire-2', 's3cret'), base)
  assert.notEqual(sessionTopic('bonfire/v0', 'fire-1', 'other'), base)
})
```

- [ ] **Step 6: Extend the test script**

In `apps/bonfire/package.json` replace the test line with:

```json
"test": "node --test services/time.test.ts services/soundcloud.test.ts services/mesh/bytes.test.ts services/mesh/seal.test.ts services/mesh/topics.test.ts services/mesh/nostr-event.test.ts",
```

- [ ] **Step 7: Run the gates**

Run: `pnpm --filter bonfire test && pnpm --filter bonfire typecheck && pnpm --filter bonfire lint`
Expected: PASS. The seal test proves the 256-byte bucket padding. The nostr-event test proves NIP-01 signing.

- [ ] **Step 8: Commit**

```bash
git add apps/bonfire/services/mesh apps/bonfire/package.json
git commit -m "feat(bonfire): port the irc nostr mesh modules"
```

---

### Task 3: Session core, link and codec

**Files:**
- Create: `apps/bonfire/services/session.ts`
- Test: `apps/bonfire/services/session.test.ts`
- Modify: `apps/bonfire/package.json` (test script, add `services/session.test.ts`)

**Interfaces:**
- Consumes: Task 2 mesh exports.
- Produces:
  - Types `SessionLink = { sessionId: string; secret: string }`, `SessionSnapshot = { plan: PlanMode | null; planEpoch: number; trackIndex: number; positionMs: number; playing: boolean; positionEpoch: number; seq: number }`, `SessionPayload = ({ type: 'state' } & SessionSnapshot) | { type: 'presence'; nick: string } | { type: 'bye' }`
  - `INITIAL_SNAPSHOT: SessionSnapshot`
  - `createSessionLink(): SessionLink`, `sessionHash(link): string`, `parseSessionHash(hash: string): SessionLink | null`
  - `encodePayload(key: Uint8Array, payload: SessionPayload): string`, `decodePayload(key: Uint8Array, content: string): SessionPayload | null`
  - `snapshotTarget(snapshot: SessionSnapshot, nowMs: number): number`

- [ ] **Step 1: Write the failing tests**

Create `apps/bonfire/services/session.test.ts`:

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deriveGroupKey } from './mesh/seal.ts'
import {
  createSessionLink,
  decodePayload,
  encodePayload,
  INITIAL_SNAPSHOT,
  parseSessionHash,
  sessionHash,
  type SessionPayload,
  snapshotTarget,
} from './session.ts'

const key = deriveGroupKey('secret')

test('session link roundtrips through the hash', () => {
  const link = createSessionLink()
  assert.equal(link.sessionId.length, 16)
  assert.equal(link.secret.length, 32)
  assert.deepEqual(parseSessionHash(sessionHash(link)), link)
})

test('parseSessionHash rejects foreign hashes', () => {
  assert.equal(parseSessionHash(''), null)
  assert.equal(parseSessionHash('#other'), null)
  assert.equal(parseSessionHash('#s=only-id'), null)
  assert.equal(parseSessionHash('#s=.only-secret'), null)
})

test('payload codec roundtrips every type', () => {
  const payloads: SessionPayload[] = [
    { type: 'state', ...INITIAL_SNAPSHOT, plan: 'long', seq: 7 },
    { type: 'presence', nick: 'keeper' },
    { type: 'bye' },
  ]
  for (const payload of payloads) {
    assert.deepEqual(decodePayload(key, encodePayload(key, payload)), payload)
  }
})

test('decodePayload rejects the wrong key, tampering and junk', () => {
  const content = encodePayload(key, { type: 'bye' })
  assert.equal(decodePayload(deriveGroupKey('other'), content), null)
  const tampered = `${content.slice(0, -2)}00`
  assert.equal(decodePayload(key, tampered), null)
  assert.equal(decodePayload(key, 'not-hex'), null)
  assert.equal(decodePayload(key, ''), null)
})

test('decodePayload rejects sealed junk shapes', () => {
  const junk = encodePayload(key, { type: 'presence', nick: '' } as SessionPayload)
  assert.equal(decodePayload(key, junk), null)
  const long = encodePayload(key, {
    type: 'presence',
    nick: 'x'.repeat(25),
  } as SessionPayload)
  assert.equal(decodePayload(key, long), null)
})

test('snapshotTarget projects position only while playing', () => {
  const base = { ...INITIAL_SNAPSHOT, positionMs: 10_000, positionEpoch: 1_000 }
  assert.equal(snapshotTarget({ ...base, playing: true }, 4_000), 13_000)
  assert.equal(snapshotTarget({ ...base, playing: false }, 4_000), 10_000)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter bonfire exec node --test services/session.test.ts`
Expected: FAIL, cannot find `./session.ts`.

- [ ] **Step 3: Write `services/session.ts` (codec half)**

```ts
import { fromHex, randomBytes, toHex, utf8 } from './mesh/bytes.ts'
import { NICK_MAX } from './mesh/constants.ts'
import { open, seal } from './mesh/seal.ts'
import type { PlanMode } from './plans.ts'

export type SessionLink = { sessionId: string; secret: string }

export type SessionSnapshot = {
  plan: PlanMode | null
  planEpoch: number
  trackIndex: number
  positionMs: number
  playing: boolean
  positionEpoch: number
  seq: number
}

export type SessionPayload =
  | ({ type: 'state' } & SessionSnapshot)
  | { type: 'presence'; nick: string }
  | { type: 'bye' }

export const INITIAL_SNAPSHOT: SessionSnapshot = {
  plan: null,
  planEpoch: 0,
  trackIndex: 0,
  positionMs: 0,
  playing: false,
  positionEpoch: 0,
  seq: 0,
}

export const createSessionLink = (): SessionLink => ({
  sessionId: toHex(randomBytes(8)),
  secret: toHex(randomBytes(16)),
})

export const sessionHash = (link: SessionLink): string =>
  `#s=${link.sessionId}.${link.secret}`

export const parseSessionHash = (hash: string): SessionLink | null => {
  if (!hash.startsWith('#s=')) return null
  const [sessionId, secret] = hash.slice(3).split('.')
  if (!sessionId || !secret) return null
  return { sessionId, secret }
}

const NONCE_LENGTH = 24

export const encodePayload = (
  key: Uint8Array,
  payload: SessionPayload,
): string => {
  const nonce = randomBytes(NONCE_LENGTH)
  const sealed = seal(key, nonce, utf8(JSON.stringify(payload)))
  return toHex(nonce) + toHex(sealed)
}

export const decodePayload = (
  key: Uint8Array,
  content: string,
): SessionPayload | null => {
  const bytes = tryFromHex(content)
  if (bytes === null || bytes.length <= NONCE_LENGTH) return null
  const opened = open(key, bytes.slice(0, NONCE_LENGTH), bytes.slice(NONCE_LENGTH))
  if (opened === null) return null
  return parsePayload(new TextDecoder().decode(opened))
}

const tryFromHex = (content: string): Uint8Array | null => {
  try {
    return fromHex(content)
  } catch {
    return null
  }
}

const parsePayload = (text: string): SessionPayload | null => {
  try {
    const value: unknown = JSON.parse(text)
    return isSessionPayload(value) ? value : null
  } catch {
    return null
  }
}

const PLAN_MODES: readonly (PlanMode | null)[] = ['long', 'short', null]

const isSnapshotShape = (raw: Record<string, unknown>): boolean =>
  PLAN_MODES.includes(raw.plan as PlanMode | null) &&
  typeof raw.planEpoch === 'number' &&
  typeof raw.trackIndex === 'number' &&
  typeof raw.positionMs === 'number' &&
  typeof raw.playing === 'boolean' &&
  typeof raw.positionEpoch === 'number' &&
  typeof raw.seq === 'number'

export const isSessionPayload = (value: unknown): value is SessionPayload => {
  if (typeof value !== 'object' || value === null) return false
  const raw = value as Record<string, unknown>
  if (raw.type === 'state') return isSnapshotShape(raw)
  if (raw.type === 'presence') return isNick(raw.nick)
  return raw.type === 'bye'
}

const isNick = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= NICK_MAX

export const snapshotTarget = (
  snapshot: SessionSnapshot,
  nowMs: number,
): number =>
  snapshot.playing
    ? snapshot.positionMs + (nowMs - snapshot.positionEpoch)
    : snapshot.positionMs
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter bonfire exec node --test services/session.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Add the file to the test script and commit**

Append `services/session.test.ts` to the `test` line in `apps/bonfire/package.json`. Run the full gates: `pnpm --filter bonfire test && pnpm --filter bonfire typecheck && pnpm --filter bonfire lint`.

```bash
git add apps/bonfire/services/session.ts apps/bonfire/services/session.test.ts apps/bonfire/package.json
git commit -m "feat(bonfire): add the session link and sealed payload codec"
```

---

### Task 4: Session core, timeline and runtime reducer

**Files:**
- Modify: `apps/bonfire/services/session.ts` (append)
- Modify: `apps/bonfire/services/session.test.ts` (append)

**Interfaces:**
- Consumes: Task 3 types, `PRESENCE_MS`, `PRESENCE_MISS`, `HOST_SILENT_MS` from constants, `Segment` from `./plans.ts`.
- Produces:
  - `initialSeq(nowMs: number): number`, `acceptsSeq(lastSeq: number | null, seq: number): boolean`
  - `timelineAt(plan: Segment[], elapsedMs: number): { index: number; remaining: number } | null`
  - `type Peer = { nick: string; lastSeenMs: number }`
  - `type SessionPhase = 'solo' | 'host' | 'gate' | 'seated'`
  - `type SessionRuntime = { phase: SessionPhase; link: SessionLink | null; nick: string; selfPubkey: string | null; snapshot: SessionSnapshot | null; lastSeq: number | null; hostPubkey: string | null; hostSeenMs: number | null; hostLeft: boolean; peers: Record<string, Peer>; openRelays: number; everOpen: boolean }`
  - `INITIAL_RUNTIME: SessionRuntime`
  - `type SessionEvent` (variants below), `reduceSession(state: SessionRuntime, event: SessionEvent): SessionRuntime`

- [ ] **Step 1: Append the failing tests**

Append to `services/session.test.ts`:

```ts
import { PLANS } from './plans.ts'
import {
  acceptsSeq,
  INITIAL_RUNTIME,
  initialSeq,
  reduceSession,
  type SessionRuntime,
  timelineAt,
} from './session.ts'

test('initialSeq and acceptsSeq order events', () => {
  assert.equal(initialSeq(1_722_718_800_500), 1_722_718_800)
  assert.equal(acceptsSeq(null, 1), true)
  assert.equal(acceptsSeq(5, 6), true)
  assert.equal(acceptsSeq(5, 5), false)
  assert.equal(acceptsSeq(5, 4), false)
})

test('timelineAt walks the plan and ends in null', () => {
  const plan = PLANS.short
  assert.deepEqual(timelineAt(plan, -50), { index: 0, remaining: plan[0].time })
  assert.deepEqual(timelineAt(plan, 0), { index: 0, remaining: plan[0].time })
  assert.deepEqual(timelineAt(plan, 60_000), {
    index: 0,
    remaining: plan[0].time - 60_000,
  })
  assert.deepEqual(timelineAt(plan, plan[0].time), {
    index: 1,
    remaining: plan[1].time,
  })
  const total = plan.reduce((sum, segment) => sum + segment.time, 0)
  assert.deepEqual(timelineAt(plan, total - 1), {
    index: plan.length - 1,
    remaining: 1,
  })
  assert.equal(timelineAt(plan, total), null)
})

const hosted = (): SessionRuntime =>
  reduceSession(INITIAL_RUNTIME, {
    type: 'hosted',
    link: { sessionId: 'aa', secret: 'bb' },
    nick: 'keeper',
    selfPubkey: 'me',
    snapshot: { ...INITIAL_SNAPSHOT, seq: 100 },
  })

const seated = (): SessionRuntime => {
  const gated = reduceSession(INITIAL_RUNTIME, {
    type: 'gated',
    link: { sessionId: 'aa', secret: 'bb' },
  })
  return reduceSession(gated, { type: 'seated', nick: 'wanderer', selfPubkey: 'me' })
}

const state = (seq: number) =>
  ({ type: 'state', ...INITIAL_SNAPSHOT, plan: 'short', planEpoch: 5, seq }) as const

test('hosted and seated set their phases', () => {
  assert.equal(hosted().phase, 'host')
  assert.equal(hosted().lastSeq, 100)
  assert.equal(seated().phase, 'seated')
  assert.equal(seated().snapshot, null)
})

test('a follower applies state by growing seq only', () => {
  const first = reduceSession(seated(), {
    type: 'received',
    payload: state(10),
    pubkey: 'host',
    nowMs: 1_000,
  })
  assert.equal(first.snapshot?.plan, 'short')
  assert.equal(first.lastSeq, 10)
  assert.equal(first.hostPubkey, 'host')
  assert.equal(first.hostSeenMs, 1_000)
  const stale = reduceSession(first, {
    type: 'received',
    payload: state(9),
    pubkey: 'host',
    nowMs: 2_000,
  })
  assert.equal(stale.lastSeq, 10)
  assert.equal(stale.hostSeenMs, 1_000)
})

test('a host ignores foreign state', () => {
  const runtime = reduceSession(hosted(), {
    type: 'received',
    payload: state(999),
    pubkey: 'other',
    nowMs: 1_000,
  })
  assert.equal(runtime.lastSeq, 100)
})

test('presence tracks peers and skips self', () => {
  const withPeer = reduceSession(seated(), {
    type: 'received',
    payload: { type: 'presence', nick: 'ember' },
    pubkey: 'friend',
    nowMs: 1_000,
  })
  assert.deepEqual(withPeer.peers.friend, { nick: 'ember', lastSeenMs: 1_000 })
  const self = reduceSession(withPeer, {
    type: 'received',
    payload: { type: 'presence', nick: 'me-again' },
    pubkey: 'me',
    nowMs: 1_000,
  })
  assert.equal(self.peers.me, undefined)
})

test('bye removes a peer and flags the host', () => {
  const base = reduceSession(seated(), {
    type: 'received',
    payload: state(10),
    pubkey: 'host',
    nowMs: 1_000,
  })
  const withPeer = reduceSession(base, {
    type: 'received',
    payload: { type: 'presence', nick: 'ember' },
    pubkey: 'friend',
    nowMs: 1_000,
  })
  const friendGone = reduceSession(withPeer, {
    type: 'received',
    payload: { type: 'bye' },
    pubkey: 'friend',
    nowMs: 2_000,
  })
  assert.equal(friendGone.peers.friend, undefined)
  assert.equal(friendGone.hostLeft, false)
  const hostGone = reduceSession(friendGone, {
    type: 'received',
    payload: { type: 'bye' },
    pubkey: 'host',
    nowMs: 2_000,
  })
  assert.equal(hostGone.hostLeft, true)
})

test('a fresh state clears the host-left flag', () => {
  const base = reduceSession(seated(), {
    type: 'received',
    payload: state(10),
    pubkey: 'host',
    nowMs: 1_000,
  })
  const left = reduceSession(base, {
    type: 'received',
    payload: { type: 'bye' },
    pubkey: 'host',
    nowMs: 2_000,
  })
  const back = reduceSession(left, {
    type: 'received',
    payload: state(11),
    pubkey: 'host',
    nowMs: 3_000,
  })
  assert.equal(back.hostLeft, false)
})

test('swept expires quiet peers and a silent host', () => {
  const base = reduceSession(seated(), {
    type: 'received',
    payload: state(10),
    pubkey: 'host',
    nowMs: 0,
  })
  const withPeer = reduceSession(base, {
    type: 'received',
    payload: { type: 'presence', nick: 'ember' },
    pubkey: 'friend',
    nowMs: 0,
  })
  const early = reduceSession(withPeer, { type: 'swept', nowMs: 44_000 })
  assert.notEqual(early.peers.friend, undefined)
  assert.equal(early.hostLeft, true)
  const late = reduceSession(withPeer, { type: 'swept', nowMs: 46_000 })
  assert.equal(late.peers.friend, undefined)
})

test('a silent host never flags a hosting tab', () => {
  const runtime = reduceSession(hosted(), { type: 'swept', nowMs: 999_000 })
  assert.equal(runtime.hostLeft, false)
})

test('relay states fold into a count and a memory', () => {
  const open = reduceSession(seated(), { type: 'relays', open: 3 })
  assert.equal(open.openRelays, 3)
  assert.equal(open.everOpen, true)
  const down = reduceSession(open, { type: 'relays', open: 0 })
  assert.equal(down.openRelays, 0)
  assert.equal(down.everOpen, true)
})

test('commanded updates a host snapshot only', () => {
  const next = { ...INITIAL_SNAPSHOT, plan: 'long' as const, seq: 101 }
  const host = reduceSession(hosted(), { type: 'commanded', snapshot: next })
  assert.equal(host.snapshot?.plan, 'long')
  assert.equal(host.lastSeq, 101)
  const follower = reduceSession(seated(), { type: 'commanded', snapshot: next })
  assert.equal(follower.snapshot, null)
})
```

Note the extra imports merge into the existing import block from Task 3.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter bonfire exec node --test services/session.test.ts`
Expected: FAIL, `reduceSession` not exported.

- [ ] **Step 3: Append the implementation to `services/session.ts`**

Change the type-only plans import to `import type { PlanMode, Segment } from './plans.ts'` and extend the constants import to include `HOST_SILENT_MS`, `PRESENCE_MISS`, `PRESENCE_MS`. Then append:

```ts
export const initialSeq = (nowMs: number): number => Math.floor(nowMs / 1000)

export const acceptsSeq = (lastSeq: number | null, seq: number): boolean =>
  lastSeq === null || seq > lastSeq

export type TimelinePoint = { index: number; remaining: number }

export const timelineAt = (
  plan: Segment[],
  elapsedMs: number,
): TimelinePoint | null => {
  const elapsed = Math.max(0, elapsedMs)
  let start = 0
  for (const [index, segment] of plan.entries()) {
    const end = start + segment.time
    if (elapsed < end) return { index, remaining: end - elapsed }
    start = end
  }
  return null
}

export type Peer = { nick: string; lastSeenMs: number }

export type SessionPhase = 'solo' | 'host' | 'gate' | 'seated'

export type SessionRuntime = {
  phase: SessionPhase
  link: SessionLink | null
  nick: string
  selfPubkey: string | null
  snapshot: SessionSnapshot | null
  lastSeq: number | null
  hostPubkey: string | null
  hostSeenMs: number | null
  hostLeft: boolean
  peers: Record<string, Peer>
  openRelays: number
  everOpen: boolean
}

export const INITIAL_RUNTIME: SessionRuntime = {
  phase: 'solo',
  link: null,
  nick: '',
  selfPubkey: null,
  snapshot: null,
  lastSeq: null,
  hostPubkey: null,
  hostSeenMs: null,
  hostLeft: false,
  peers: {},
  openRelays: 0,
  everOpen: false,
}

export type SessionEvent =
  | {
      type: 'hosted'
      link: SessionLink
      nick: string
      selfPubkey: string
      snapshot: SessionSnapshot
    }
  | { type: 'gated'; link: SessionLink }
  | { type: 'seated'; nick: string; selfPubkey: string }
  | { type: 'renamed'; nick: string }
  | { type: 'commanded'; snapshot: SessionSnapshot }
  | { type: 'received'; payload: SessionPayload; pubkey: string; nowMs: number }
  | { type: 'swept'; nowMs: number }
  | { type: 'relays'; open: number }

export const reduceSession = (
  state: SessionRuntime,
  event: SessionEvent,
): SessionRuntime => {
  switch (event.type) {
    case 'hosted':
      return {
        ...INITIAL_RUNTIME,
        phase: 'host',
        link: event.link,
        nick: event.nick,
        selfPubkey: event.selfPubkey,
        snapshot: event.snapshot,
        lastSeq: event.snapshot.seq,
      }
    case 'gated':
      return { ...INITIAL_RUNTIME, phase: 'gate', link: event.link }
    case 'seated':
      return {
        ...state,
        phase: 'seated',
        nick: event.nick,
        selfPubkey: event.selfPubkey,
      }
    case 'renamed':
      return { ...state, nick: event.nick }
    case 'commanded':
      return state.phase === 'host'
        ? { ...state, snapshot: event.snapshot, lastSeq: event.snapshot.seq }
        : state
    case 'received':
      return applyReceived(state, event)
    case 'swept':
      return applySweep(state, event.nowMs)
    case 'relays':
      return {
        ...state,
        openRelays: event.open,
        everOpen: state.everOpen || event.open > 0,
      }
  }
}

const applyReceived = (
  state: SessionRuntime,
  event: { payload: SessionPayload; pubkey: string; nowMs: number },
): SessionRuntime => {
  switch (event.payload.type) {
    case 'state':
      return applyState(state, event.payload, event.pubkey, event.nowMs)
    case 'presence':
      return applyPresence(state, event.payload.nick, event.pubkey, event.nowMs)
    case 'bye':
      return applyBye(state, event.pubkey)
  }
}

const applyState = (
  state: SessionRuntime,
  payload: { type: 'state' } & SessionSnapshot,
  pubkey: string,
  nowMs: number,
): SessionRuntime => {
  if (state.phase === 'host' || state.phase === 'solo') return state
  if (!acceptsSeq(state.lastSeq, payload.seq)) return state
  const { type: _type, ...snapshot } = payload
  return {
    ...state,
    snapshot,
    lastSeq: payload.seq,
    hostPubkey: pubkey,
    hostSeenMs: nowMs,
    hostLeft: false,
  }
}

const applyPresence = (
  state: SessionRuntime,
  nick: string,
  pubkey: string,
  nowMs: number,
): SessionRuntime => {
  if (pubkey === state.selfPubkey) return state
  return {
    ...state,
    peers: { ...state.peers, [pubkey]: { nick, lastSeenMs: nowMs } },
  }
}

const applyBye = (state: SessionRuntime, pubkey: string): SessionRuntime => {
  const peers = Object.fromEntries(
    Object.entries(state.peers).filter(([key]) => key !== pubkey),
  )
  const hostLeft = state.hostLeft || pubkey === state.hostPubkey
  return { ...state, peers, hostLeft }
}

const applySweep = (state: SessionRuntime, nowMs: number): SessionRuntime => {
  const cutoff = PRESENCE_MS * PRESENCE_MISS
  const peers = Object.fromEntries(
    Object.entries(state.peers).filter(
      ([, peer]) => nowMs - peer.lastSeenMs <= cutoff,
    ),
  )
  const following = state.phase === 'seated' || state.phase === 'gate'
  const hostSilent =
    following &&
    state.hostSeenMs !== null &&
    nowMs - state.hostSeenMs > HOST_SILENT_MS
  return { ...state, peers, hostLeft: state.hostLeft || hostSilent }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter bonfire exec node --test services/session.test.ts`
Expected: PASS, 18 tests.

- [ ] **Step 5: Full gates and commit**

Run: `pnpm --filter bonfire test && pnpm --filter bonfire typecheck && pnpm --filter bonfire lint`

```bash
git add apps/bonfire/services/session.ts apps/bonfire/services/session.test.ts
git commit -m "feat(bonfire): add the session timeline and runtime reducer"
```

---

### Task 5: Widget surface for sync

**Files:**
- Modify: `apps/bonfire/services/soundcloud.ts` (widget type)
- Modify: `apps/bonfire/services/use-playback.ts`

**Interfaces:**
- Consumes: `SessionSnapshot`, `snapshotTarget` from Task 3, `DRIFT_TOLERANCE_MS` from constants.
- Produces, on the `usePlayback` return value:
  - `readState(): Promise<{ trackIndex: number; positionMs: number; playing: boolean } | null>`
  - `applySnapshot(snapshot: SessionSnapshot): Promise<void>`
  - New `usePlayback` prop: `onTransport?: () => void`, called after the widget flips between play and pause.

- [ ] **Step 1: Extend the widget type**

In `services/soundcloud.ts` replace the `SoundCloudWidget` type with:

```ts
export type SoundCloudWidget = {
  bind: (
    event: string,
    listener: (payload?: SoundCloudProgress) => void,
  ) => void
  getCurrentSound: (callback: (sound: SoundCloudSound) => void) => void
  getCurrentSoundIndex: (callback: (index: number) => void) => void
  getPosition: (callback: (position: number) => void) => void
  isPaused: (callback: (paused: boolean) => void) => void
  pause: () => void
  play: () => void
  seekTo: (milliseconds: number) => void
  skip: (soundIndex: number) => void
  unbind: (event: string) => void
}
```

- [ ] **Step 2: Extend `use-playback.ts`**

Add imports:

```ts
import { DRIFT_TOLERANCE_MS } from './mesh/constants.ts'
import { type SessionSnapshot, snapshotTarget } from './session.ts'
```

Add a promisify helper and the widget readers above `usePlayback`:

```ts
const fromCallback = <T,>(run: (done: (value: T) => void) => void): Promise<T> =>
  new Promise((resolve) => run(resolve))

const readWidget = async (widget: SoundCloudWidget) => {
  const trackIndex = await fromCallback<number>((done) =>
    widget.getCurrentSoundIndex(done),
  )
  const positionMs = await fromCallback<number>((done) =>
    widget.getPosition(done),
  )
  const paused = await fromCallback<boolean>((done) => widget.isPaused(done))
  return { trackIndex, positionMs, playing: !paused }
}

const convergeWidget = async (
  widget: SoundCloudWidget,
  snapshot: SessionSnapshot,
) => {
  const trackIndex = await fromCallback<number>((done) =>
    widget.getCurrentSoundIndex(done),
  )
  const target = Math.max(0, snapshotTarget(snapshot, Date.now()))
  if (trackIndex !== snapshot.trackIndex) {
    widget.skip(snapshot.trackIndex)
    widget.seekTo(target)
  } else {
    const position = await fromCallback<number>((done) =>
      widget.getPosition(done),
    )
    if (Math.abs(position - target) > DRIFT_TOLERANCE_MS) widget.seekTo(target)
  }
  if (snapshot.playing) widget.play()
  else widget.pause()
}
```

Extend the hook signature with the transport callback:

```ts
export const usePlayback = (props: {
  ambience: RefObject<HTMLAudioElement | null>
  iframe: HTMLIFrameElement | null
  apiReady: boolean
  onTransport?: () => void
}) => {
  const { ambience, iframe, apiReady, onTransport } = props
```

Keep the callback fresh without re-binding the widget:

```ts
  const transportRef = useRef<(() => void) | undefined>(undefined)
  useEffect(() => {
    transportRef.current = onTransport
  }, [onTransport])
```

Inside the existing effect, notify after both transport flips:

```ts
    const onPlay = () => {
      if (pristineRef.current) {
        pristineRef.current = false
        ambience.current?.play().catch(() => undefined)
      }
      widget.getCurrentSound((sound) => dispatch({ type: 'play', sound }))
      transportRef.current?.()
    }
```

and change the pause binding to:

```ts
      widget.bind(events.PAUSE, () => {
        dispatch({ type: 'pause' })
        transportRef.current?.()
      })
```

Extend the return value:

```ts
  return {
    ...state,
    play: () => widgetRef.current?.play(),
    pause: () => widgetRef.current?.pause(),
    readState: async () => {
      const widget = widgetRef.current
      return widget ? readWidget(widget) : null
    },
    applySnapshot: async (snapshot: SessionSnapshot) => {
      const widget = widgetRef.current
      if (widget) await convergeWidget(widget, snapshot)
    },
  }
```

- [ ] **Step 3: Gates**

Run: `pnpm --filter bonfire test && pnpm --filter bonfire typecheck && pnpm --filter bonfire lint`
Expected: PASS. No runtime harness exists for hooks. The manual sweep in Task 10 covers behavior.

- [ ] **Step 4: Commit**

```bash
git add apps/bonfire/services/soundcloud.ts apps/bonfire/services/use-playback.ts
git commit -m "feat(bonfire): extend the widget wrapper for session sync"
```

---

### Task 6: The use-session transport hook

**Files:**
- Create: `apps/bonfire/services/use-session.ts`

**Interfaces:**
- Consumes: everything from Tasks 2-4, `useInterval` from `./use-interval.ts`.
- Produces:

```ts
export type PlaybackState = {
  trackIndex: number
  positionMs: number
  playing: boolean
}
export type PlaybackSource = () => Promise<PlaybackState | null>
export type Session = {
  runtime: SessionRuntime
  shareSession: (nick: string) => void
  seat: (nick: string) => void
  rename: (nick: string) => void
  startPlan: (mode: PlanMode) => void
  finishPlan: () => void
  publishNow: () => void
  bindPlayback: (source: PlaybackSource | null) => void
}
export const useSession: () => Session
```

- [ ] **Step 1: Write `services/use-session.ts`**

```ts
'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { PlanMode } from './plans.ts'
import { randomBytes } from './mesh/bytes.ts'
import {
  APP_ID,
  DEFAULT_RELAYS,
  KEEPALIVE_MS,
  NOSTR_KIND,
  PRESENCE_MS,
  SWEEP_MS,
} from './mesh/constants.ts'
import { buildEvent } from './mesh/nostr-event.ts'
import { NostrPool, type RelayState } from './mesh/nostr-pool.ts'
import { deriveGroupKey } from './mesh/seal.ts'
import { sessionTopic } from './mesh/topics.ts'
import {
  createSessionLink,
  decodePayload,
  encodePayload,
  INITIAL_RUNTIME,
  INITIAL_SNAPSHOT,
  initialSeq,
  parseSessionHash,
  reduceSession,
  sessionHash,
  type SessionLink,
  type SessionPayload,
  type SessionRuntime,
  type SessionSnapshot,
} from './session.ts'
import { useInterval } from './use-interval.ts'

export type PlaybackState = {
  trackIndex: number
  positionMs: number
  playing: boolean
}

export type PlaybackSource = () => Promise<PlaybackState | null>

export type Session = {
  runtime: SessionRuntime
  shareSession: (nick: string) => void
  seat: (nick: string) => void
  rename: (nick: string) => void
  startPlan: (mode: PlanMode) => void
  finishPlan: () => void
  publishNow: () => void
  bindPlayback: (source: PlaybackSource | null) => void
}

type Transport = {
  pool: NostrPool
  key: Uint8Array
  topic: string
  signer: Uint8Array
  pubkey: string
}

const hostMarkerKey = (sessionId: string): string => `bonfire-host:${sessionId}`

type HostMarker = { nick: string; snapshot: SessionSnapshot }

const readHostMarker = (sessionId: string): HostMarker | null => {
  try {
    const raw = window.sessionStorage.getItem(hostMarkerKey(sessionId))
    return raw === null ? null : (JSON.parse(raw) as HostMarker)
  } catch {
    return null
  }
}

export const useSession = (): Session => {
  const [runtime, dispatch] = useReducer(reduceSession, INITIAL_RUNTIME)
  const runtimeRef = useRef(runtime)
  const transportRef = useRef<Transport | null>(null)
  const sourceRef = useRef<PlaybackSource | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    runtimeRef.current = runtime
  }, [runtime])

  const publish = useCallback((payload: SessionPayload) => {
    const transport = transportRef.current
    if (!transport) return
    const event = buildEvent({
      secret: transport.signer,
      kind: NOSTR_KIND,
      tags: [['t', transport.topic]],
      content: encodePayload(transport.key, payload),
      createdAtSec: Math.floor(Date.now() / 1000),
    })
    transport.pool.publish(event)
  }, [])

  const publishState = useCallback(async () => {
    const base = runtimeRef.current.snapshot ?? INITIAL_SNAPSHOT
    const audio = (await sourceRef.current?.()) ?? null
    seqRef.current += 1
    const snapshot: SessionSnapshot = {
      ...base,
      ...(audio ? { ...audio, positionEpoch: Date.now() } : {}),
      seq: seqRef.current,
    }
    dispatch({ type: 'commanded', snapshot })
    publish({ type: 'state', ...snapshot })
    const link = runtimeRef.current.link
    if (link) persistHostMarker(link.sessionId, runtimeRef.current.nick, snapshot)
  }, [publish])

  const openTransport = useCallback(
    (link: SessionLink) => {
      const signer = randomBytes(32)
      const relayStates = new Map<string, RelayState>()
      const pool = new NostrPool({
        urls: DEFAULT_RELAYS,
        log: (line) => console.debug(`bonfire mesh: ${line}`),
        onState: (url, state) => {
          relayStates.set(url, state)
          const open = [...relayStates.values()].filter(
            (value) => value === 'open',
          ).length
          dispatch({ type: 'relays', open })
        },
      })
      const transport: Transport = {
        pool,
        key: deriveGroupKey(link.secret),
        topic: sessionTopic(APP_ID, link.sessionId, link.secret),
        signer,
        pubkey: '',
      }
      transportRef.current = transport
      pool.start()
      pool.subscribe(transport.topic, (event) => {
        const payload = decodePayload(transport.key, event.content)
        if (payload === null) return
        const before = runtimeRef.current
        dispatch({
          type: 'received',
          payload,
          pubkey: event.pubkey,
          nowMs: Date.now(),
        })
        const isNewPeer =
          payload.type === 'presence' &&
          event.pubkey !== transport.pubkey &&
          before.peers[event.pubkey] === undefined
        if (before.phase === 'host' && isNewPeer) void publishState()
      })
      return transport
    },
    [publishState],
  )

  useEffect(() => {
    const link = parseSessionHash(window.location.hash)
    if (link === null) return
    const marker = readHostMarker(link.sessionId)
    if (marker === null) {
      dispatch({ type: 'gated', link })
      return () => transportRef.current?.pool.stop()
    }
    const transport = openTransport(link)
    transport.pubkey = selfPubkeyOf(transport)
    seqRef.current = Math.max(initialSeq(Date.now()), marker.snapshot.seq + 1)
    dispatch({
      type: 'hosted',
      link,
      nick: marker.nick,
      selfPubkey: transport.pubkey,
      snapshot: marker.snapshot,
    })
    publish({ type: 'state', ...marker.snapshot, seq: seqRef.current })
    publish({ type: 'presence', nick: marker.nick })
    return () => transportRef.current?.pool.stop()
    // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only hash read
  }, [])

  const shareSession = useCallback(
    (nick: string) => {
      if (runtimeRef.current.phase !== 'solo') return
      const link = createSessionLink()
      window.history.replaceState(null, '', sessionHash(link))
      const transport = openTransport(link)
      transport.pubkey = selfPubkeyOf(transport)
      seqRef.current = initialSeq(Date.now())
      const snapshot = { ...INITIAL_SNAPSHOT, seq: seqRef.current }
      persistHostMarker(link.sessionId, nick, snapshot)
      dispatch({
        type: 'hosted',
        link,
        nick,
        selfPubkey: transport.pubkey,
        snapshot,
      })
      publish({ type: 'state', ...snapshot })
      publish({ type: 'presence', nick })
    },
    [openTransport, publish],
  )

  const seat = useCallback(
    (nick: string) => {
      const { phase, link } = runtimeRef.current
      if (phase !== 'gate' || link === null) return
      const transport = openTransport(link)
      transport.pubkey = selfPubkeyOf(transport)
      dispatch({ type: 'seated', nick, selfPubkey: transport.pubkey })
      publish({ type: 'presence', nick })
    },
    [openTransport, publish],
  )

  const startPlan = useCallback(
    (mode: PlanMode) => {
      if (runtimeRef.current.phase !== 'host') return
      const base = runtimeRef.current.snapshot ?? INITIAL_SNAPSHOT
      seqRef.current += 1
      const snapshot: SessionSnapshot = {
        ...base,
        plan: mode,
        planEpoch: Date.now(),
        seq: seqRef.current,
      }
      dispatch({ type: 'commanded', snapshot })
      publish({ type: 'state', ...snapshot })
      const link = runtimeRef.current.link
      if (link) persistHostMarker(link.sessionId, runtimeRef.current.nick, snapshot)
    },
    [publish],
  )

  const finishPlan = useCallback(() => {
    if (runtimeRef.current.phase !== 'host') return
    const base = runtimeRef.current.snapshot ?? INITIAL_SNAPSHOT
    seqRef.current += 1
    const snapshot: SessionSnapshot = {
      ...base,
      plan: null,
      planEpoch: 0,
      seq: seqRef.current,
    }
    dispatch({ type: 'commanded', snapshot })
    publish({ type: 'state', ...snapshot })
    const link = runtimeRef.current.link
    if (link) persistHostMarker(link.sessionId, runtimeRef.current.nick, snapshot)
  }, [publish])

  useInterval(() => {
    if (runtimeRef.current.phase === 'host') void publishState()
  }, KEEPALIVE_MS)

  useInterval(() => {
    const { phase, nick } = runtimeRef.current
    if (phase === 'host' || phase === 'seated')
      publish({ type: 'presence', nick })
  }, PRESENCE_MS)

  useInterval(() => {
    if (runtimeRef.current.phase !== 'solo')
      dispatch({ type: 'swept', nowMs: Date.now() })
  }, SWEEP_MS)

  useEffect(() => {
    const sayBye = () => {
      const phase = runtimeRef.current.phase
      if (phase === 'host' || phase === 'seated') publish({ type: 'bye' })
    }
    window.addEventListener('beforeunload', sayBye)
    return () => window.removeEventListener('beforeunload', sayBye)
  }, [publish])

  return {
    runtime,
    shareSession,
    seat,
    rename: useCallback((nick: string) => dispatch({ type: 'renamed', nick }), []),
    startPlan,
    finishPlan,
    publishNow: useCallback(() => void publishState(), [publishState]),
    bindPlayback: useCallback((source: PlaybackSource | null) => {
      sourceRef.current = source
    }, []),
  }
}

const persistHostMarker = (
  sessionId: string,
  nick: string,
  snapshot: SessionSnapshot,
): void => {
  window.sessionStorage.setItem(
    hostMarkerKey(sessionId),
    JSON.stringify({ nick, snapshot }),
  )
}

const selfPubkeyOf = (transport: Transport): string => {
  const probe = buildEvent({
    secret: transport.signer,
    kind: NOSTR_KIND,
    tags: [],
    content: '',
    createdAtSec: 0,
  })
  return probe.pubkey
}
```

- [ ] **Step 2: Gates**

Run: `pnpm --filter bonfire test && pnpm --filter bonfire typecheck && pnpm --filter bonfire lint`
Expected: PASS. The reducer logic already carries the unit tests. This file is the thin shell.

- [ ] **Step 3: Commit**

```bash
git add apps/bonfire/services/use-session.ts
git commit -m "feat(bonfire): add the use-session transport hook"
```

---

### Task 7: Countdown derives from an epoch

**Files:**
- Modify: `apps/bonfire/ui/countdown.tsx`
- Modify: `apps/bonfire/ui/timer.tsx`

**Interfaces:**
- Consumes: `timelineAt` from `services/session`.
- Produces: `Countdown(props: { mode: PlanMode; epoch: number; done: () => void })`. Solo `Timer` behavior stays identical to today from the outside.

- [ ] **Step 1: Rewrite `ui/countdown.tsx`**

Keep the JSX return block byte-identical. Replace the imports, state, and interval logic:

```tsx
'use client'

import clsx from 'clsx'
import { Fragment, useEffect, useRef, useState } from 'react'
import { PLANS, type PlanMode, type Segment } from 'services/plans'
import { timelineAt } from 'services/session'
import { toTime } from 'services/time'
import { useInterval } from 'services/use-interval'
import css from './countdown.module.css'

const TICK_MS = 1000
const PIPS_LEAD_MS = 5000

const phaseLabel = (plan: Segment[], index: number): string => {
  const segment = plan[index]
  if (segment.type === 'rest') return 'rest'
  const workDone = plan.slice(0, index + 1).filter((s) => s.type === 'work')
  const workTotal = plan.filter((s) => s.type === 'work')
  return `work ${workDone.length} of ${workTotal.length}`
}

export function Countdown(props: {
  mode: PlanMode
  epoch: number
  done: () => void
}) {
  const pips = useRef<HTMLAudioElement>(null)
  const doneFired = useRef(false)
  const plan = PLANS[props.mode]
  const [nowMs, setNowMs] = useState(() => Date.now())

  useInterval(() => setNowMs(Date.now()), TICK_MS)

  const timeline = timelineAt(plan, nowMs - props.epoch)
  const ending = timeline !== null && timeline.remaining <= PIPS_LEAD_MS

  useEffect(() => {
    if (ending) pips.current?.play().catch(() => undefined)
  }, [ending])

  useEffect(() => {
    if (timeline !== null || doneFired.current) return
    doneFired.current = true
    props.done()
  })

  if (timeline === null) return null
  const status = { index: timeline.index, countdown: timeline.remaining }

  return (
    // ... the existing JSX block, unchanged, from <div> to </div>
  )
}
```

The JSX references `status.index`, `status.countdown`, and `ending`, all still defined. Copy the original JSX verbatim into the return.

- [ ] **Step 2: Update solo `ui/timer.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { PlanMode } from 'services/plans'
import { Countdown } from 'ui/countdown'
import { Start } from 'ui/start'

type SoloPlan = { mode: PlanMode; epoch: number }

export function Timer() {
  const [solo, setSolo] = useState<SoloPlan | null>(null)
  const phase = solo === null ? 'idle' : 'running'

  return (
    <div className='mb-10 w-full'>
      <div className='swap-in' key={phase}>
        {solo === null ? (
          <Start onSelect={(mode) => setSolo({ mode, epoch: Date.now() })} />
        ) : (
          <Countdown
            done={() => setSolo(null)}
            epoch={solo.epoch}
            mode={solo.mode}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Gates plus a solo smoke check**

Run: `pnpm --filter bonfire test && pnpm --filter bonfire typecheck && pnpm --filter bonfire lint`
Expected: PASS.

Run `pnpm --filter bonfire dev`, open `http://localhost:3010`, start a short session. Expected: countdown runs from 20:00, pips near segment end, segment handoff, idle after the plan. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add apps/bonfire/ui/countdown.tsx apps/bonfire/ui/timer.tsx
git commit -m "refactor(bonfire): derive the countdown from a start epoch"
```

---

### Task 8: Host surface

**Files:**
- Create: `apps/bonfire/ui/share.tsx`
- Modify: `apps/bonfire/ui/home.tsx`
- Modify: `apps/bonfire/ui/timer.tsx`
- Modify: `apps/bonfire/ui/player.tsx`

**Interfaces:**
- Consumes: `useSession`, type `Session` from `services/use-session`; `readState`, `applySnapshot`, `onTransport` from Task 5.
- Produces: `Share(props: { session: Session })`, `Timer(props: { session: Session })`, `Player(props: { ambience; playlistID: string; session: Session })`, plus `storedNick(fallback: string): string` and `storeNick(nick: string): void` exported from `ui/share.tsx` for Task 9.

- [ ] **Step 1: Write `ui/share.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { sessionHash } from 'services/session'
import type { Session } from 'services/use-session'

const NICK_KEY = 'bonfire-nick'

export const storedNick = (fallback: string): string =>
  window.localStorage.getItem(NICK_KEY) ?? fallback

export const storeNick = (nick: string): void =>
  window.localStorage.setItem(NICK_KEY, nick)

export function Share(props: { session: Session }) {
  const { runtime, shareSession, rename } = props.session
  const [copied, setCopied] = useState(false)

  if (runtime.phase === 'gate' || runtime.phase === 'seated') return null

  if (runtime.phase === 'solo') {
    return (
      <button
        className='mt-3 w-full rounded-lg border border-white/15 px-3 py-2 text-xs text-ash transition duration-150 ease-out-strong hover:border-ember hover:text-ember active:scale-[0.98]'
        onClick={() => shareSession(storedNick('keeper'))}
        type='button'
      >
        share the fire
      </button>
    )
  }

  const link =
    runtime.link === null
      ? ''
      : `${window.location.origin}${window.location.pathname}${sessionHash(runtime.link)}`

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
  }

  return (
    <div className='mt-3 flex flex-row items-center gap-2'>
      <input
        aria-label='your nick'
        className='min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-firelight transition-colors duration-150 focus:border-ember/60'
        maxLength={24}
        onChange={(event) => {
          rename(event.target.value)
          storeNick(event.target.value)
        }}
        value={runtime.nick}
      />
      <button
        className='rounded-lg border border-ember/50 px-3 py-2 text-xs text-ember transition duration-150 ease-out-strong hover:bg-ember/10 active:scale-[0.98]'
        onClick={copy}
        type='button'
      >
        {copied ? 'copied' : 'copy link'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Thread the session through `ui/home.tsx`**

```tsx
'use client'

import { useRef } from 'react'
import { useSession } from 'services/use-session'
import { AmbienceToggle } from 'ui/ambience'
import { Background } from 'ui/background'
import { Footer } from 'ui/footer'
import { Player } from 'ui/player'
import { Settings } from 'ui/settings'
import { Share } from 'ui/share'
import { Timer } from 'ui/timer'

export function Home(props: { playlistID: string }) {
  const ambience = useRef<HTMLAudioElement>(null)
  const session = useSession()

  return (
    <div>
      <aside>
        <Background />
      </aside>

      <header className='rise-in fixed top-0 left-0 z-10 p-5 lg:p-8'>
        <h1 className='font-display text-2xl tracking-tight italic [text-shadow:0_0_24px_rgba(255,158,69,0.25)]'>
          Bonfire
        </h1>
        <p className='mt-1 text-[10px] tracking-[0.3em] text-ash uppercase'>
          the working room
        </p>
      </header>

      <div className='fixed right-0 flex h-screen w-full flex-col items-center justify-between bg-linear-to-r from-transparent to-night/90 p-4 lg:left-1/3 lg:w-2/3 lg:p-12'>
        <main className='flex w-full max-w-md flex-1 flex-col justify-center'>
          <div className='rise-in'>
            <Timer session={session} />
          </div>

          <div className='rise-in w-full rounded-2xl border border-white/10 bg-smoke/55 p-4 shadow-lg shadow-black/40 backdrop-blur-md [animation-delay:80ms]'>
            <Player
              ambience={ambience}
              playlistID={props.playlistID}
              session={session}
            />
            <AmbienceToggle audioRef={ambience} />
            <Share session={session} />
          </div>
        </main>

        <Settings />
        <div className='rise-in [animation-delay:160ms]'>
          <Footer />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Host branch in `ui/timer.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { PlanMode } from 'services/plans'
import type { Session } from 'services/use-session'
import { Countdown } from 'ui/countdown'
import { Start } from 'ui/start'

type SoloPlan = { mode: PlanMode; epoch: number }

export function Timer(props: { session: Session }) {
  const { runtime, startPlan, finishPlan } = props.session
  const [solo, setSolo] = useState<SoloPlan | null>(null)

  const hosted = runtime.phase === 'host' ? runtime.snapshot : null
  const active =
    runtime.phase === 'host'
      ? hosted?.plan
        ? { mode: hosted.plan, epoch: hosted.planEpoch, done: finishPlan }
        : null
      : solo
        ? { ...solo, done: () => setSolo(null) }
        : null

  const onSelect =
    runtime.phase === 'host'
      ? startPlan
      : (mode: PlanMode) => setSolo({ mode, epoch: Date.now() })

  return (
    <div className='mb-10 w-full'>
      <div className='swap-in' key={active === null ? 'idle' : 'running'}>
        {active === null ? (
          <Start onSelect={onSelect} />
        ) : (
          <Countdown done={active.done} epoch={active.epoch} mode={active.mode} />
        )}
      </div>
    </div>
  )
}
```

Follower branches land in Task 9. Until then `gate` and `seated` render the `Start` fallback, which is acceptable mid-plan.

- [ ] **Step 4: Host wiring in `ui/player.tsx`**

```tsx
'use client'

import clsx from 'clsx'
import Script from 'next/script'
import { type RefObject, useEffect, useState } from 'react'
import { playlistEmbedUrl, SOUNDCLOUD_WIDGET_SCRIPT } from 'services/soundcloud'
import { usePlayback } from 'services/use-playback'
import type { Session } from 'services/use-session'
import { PauseIcon, PlayIcon } from 'ui/icons'
import css from './player.module.css'

const CONTROL =
  'grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-firelight transition duration-150 ease-out-strong hover:border-ember hover:text-ember active:scale-95'

export function Player(props: {
  ambience: RefObject<HTMLAudioElement | null>
  playlistID: string
  session: Session
}) {
  const { runtime, publishNow, bindPlayback } = props.session
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null)
  const [apiReady, setApiReady] = useState(false)
  const hosting = runtime.phase === 'host'
  const playback = usePlayback({
    ambience: props.ambience,
    apiReady,
    iframe,
    onTransport: hosting ? publishNow : undefined,
  })

  const { readState } = playback
  useEffect(() => {
    if (!hosting) return
    bindPlayback(readState)
    return () => bindPlayback(null)
  }, [hosting, bindPlayback, readState])

  return (
    <div>
      <Script
        onReady={() => setApiReady(true)}
        src={SOUNDCLOUD_WIDGET_SCRIPT}
      />
      <div className='hidden'>
        <iframe
          allow='autoplay'
          ref={setIframe}
          src={playlistEmbedUrl(props.playlistID)}
          title='SoundCloud player'
        />
      </div>

      <div className='flex flex-row items-center gap-3'>
        <p
          className={clsx(
            'min-w-0 flex-1 truncate text-sm',
            playback.songTitle ? 'text-firelight' : 'text-ash italic',
          )}
        >
          {playback.songTitle || 'gathering wood…'}
        </p>
        {playback.isPlaying ? (
          <button
            aria-label='pause'
            className={CONTROL}
            onClick={playback.pause}
            type='button'
          >
            <PauseIcon />
          </button>
        ) : (
          <button
            aria-label='play'
            className={CONTROL}
            onClick={playback.play}
            type='button'
          >
            <PlayIcon />
          </button>
        )}
      </div>
      <div className='mt-2 flex flex-row items-center gap-2 font-mono text-[11px] text-ash'>
        <span>{playback.time}</span>
        <progress
          className={clsx('h-1.5 flex-1', css.progress)}
          max={playback.progressEnd}
          value={playback.progress}
        />
        <span>{playback.duration}</span>
      </div>
    </div>
  )
}
```

Note: `readState` returns a new function identity per render, so the bind effect re-runs per render. The re-bind writes one ref and stays cheap. Do not memoize inside `usePlayback` for this.

- [ ] **Step 5: Gates plus a host smoke check**

Run: `pnpm --filter bonfire test && pnpm --filter bonfire typecheck && pnpm --filter bonfire lint`
Expected: PASS.

Run `pnpm --filter bonfire dev`, open `http://localhost:3010`:
1. Press "share the fire". Expected: the URL gains `#s=<16 hex>.<32 hex>`, the nick field shows `keeper`, copy link works.
2. Open devtools. Expected: `bonfire mesh:` debug lines only on relay notices, no errors. Network tab shows the five relay sockets.
3. Start a long plan and press play. Expected: countdown runs, music plays.
4. Reload the tab. Expected: the session resumes as host with the plan intact (from the `sessionStorage` marker).
5. Solo regression: open `http://localhost:3010` in a plain new tab, no hash. Expected: today's behavior.

- [ ] **Step 6: Commit**

```bash
git add apps/bonfire/ui/share.tsx apps/bonfire/ui/home.tsx apps/bonfire/ui/timer.tsx apps/bonfire/ui/player.tsx
git commit -m "feat(bonfire): host a shareable session"
```

---

### Task 9: Follower surface

**Files:**
- Create: `apps/bonfire/ui/join.tsx`
- Create: `apps/bonfire/ui/peers.tsx`
- Modify: `apps/bonfire/ui/timer.tsx`
- Modify: `apps/bonfire/ui/player.tsx`
- Modify: `apps/bonfire/ui/home.tsx`

**Interfaces:**
- Consumes: `Session`, `storedNick`, `storeNick` from Task 8, `timelineAt` from `services/session`, `applySnapshot` from Task 5.
- Produces: `Join(props: { session: Session })`, `Peers(props: { session: Session })`.

- [ ] **Step 1: Write `ui/join.tsx`**

```tsx
'use client'

import { type FormEvent, useEffect, useState } from 'react'
import type { Session } from 'services/use-session'
import { storedNick, storeNick } from 'ui/share'

export function Join(props: { session: Session }) {
  const [nick, setNick] = useState('')

  useEffect(() => {
    setNick(storedNick(''))
  }, [])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = nick.trim() || 'wanderer'
    storeNick(name)
    props.session.seat(name)
  }

  return (
    <form className='flex w-full flex-col gap-4' onSubmit={submit}>
      <p className='text-center text-[11px] tracking-[0.3em] text-ash uppercase'>
        a fire burns here
      </p>
      <div className='flex w-full flex-row gap-3'>
        <input
          aria-label='your nick'
          className='min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-firelight transition-colors duration-150 placeholder:text-white/25 focus:border-ember/60'
          maxLength={24}
          onChange={(event) => setNick(event.target.value)}
          placeholder='wanderer'
          value={nick}
        />
        <button
          className='rounded-xl border border-ember/60 bg-ember/10 px-4 py-3 text-sm font-semibold text-firelight transition duration-150 ease-out-strong hover:border-ember hover:bg-ember/15 active:scale-[0.98]'
          type='submit'
        >
          sit by the fire
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Write `ui/peers.tsx`**

```tsx
'use client'

import type { Session } from 'services/use-session'

export function Peers(props: { session: Session }) {
  const { runtime } = props.session
  if (runtime.phase === 'solo' || runtime.phase === 'gate') return null

  const others = Object.entries(runtime.peers)
  const relaysDown = runtime.everOpen && runtime.openRelays === 0

  return (
    <div className='mt-3 flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ash'>
      <Nick label={`${runtime.nick} (you)`} />
      {others.map(([pubkey, peer]) => (
        <Nick key={pubkey} label={peer.nick} />
      ))}
      {relaysDown && <span className='italic'>the fire flickers alone</span>}
      {runtime.hostLeft && (
        <span className='italic'>the keeper left · the fire burns down</span>
      )}
    </div>
  )
}

function Nick(props: { label: string }) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span className='inline-block size-1.5 rounded-full bg-ember' />
      {props.label}
    </span>
  )
}
```

- [ ] **Step 3: Follower branches in `ui/timer.tsx`**

Full file after this step:

```tsx
'use client'

import { useState } from 'react'
import { PLANS, type PlanMode } from 'services/plans'
import { timelineAt } from 'services/session'
import type { Session } from 'services/use-session'
import { Countdown } from 'ui/countdown'
import { Join } from 'ui/join'
import { Start } from 'ui/start'

type SoloPlan = { mode: PlanMode; epoch: number }
type ActivePlan = { mode: PlanMode; epoch: number; done: () => void }

export function Timer(props: { session: Session }) {
  const { runtime } = props.session
  const [solo, setSolo] = useState<SoloPlan | null>(null)
  const [endedEpoch, setEndedEpoch] = useState(0)

  const active = activePlan(props.session, solo, setSolo, endedEpoch)
  const body = timerBody(props.session, active, setSolo, setEndedEpoch)

  return (
    <div className='mb-10 w-full'>
      <div className='swap-in' key={bodyKey(runtime.phase, active)}>
        {body}
      </div>
    </div>
  )
}

const bodyKey = (phase: string, active: ActivePlan | null): string =>
  `${phase}-${active === null ? 'idle' : 'running'}`

const activePlan = (
  session: Session,
  solo: SoloPlan | null,
  setSolo: (plan: SoloPlan | null) => void,
  endedEpoch: number,
): ActivePlan | null => {
  const { runtime, finishPlan } = session
  const snapshot = runtime.snapshot
  if (runtime.phase === 'solo')
    return solo ? { ...solo, done: () => setSolo(null) } : null
  if (runtime.phase === 'gate') return null
  if (!snapshot?.plan || snapshot.planEpoch === endedEpoch) return null
  const expired =
    timelineAt(PLANS[snapshot.plan], Date.now() - snapshot.planEpoch) === null
  if (runtime.phase === 'seated' && expired) return null
  return {
    mode: snapshot.plan,
    epoch: snapshot.planEpoch,
    done: runtime.phase === 'host' ? finishPlan : () => undefined,
  }
}

const timerBody = (
  session: Session,
  active: ActivePlan | null,
  setSolo: (plan: SoloPlan) => void,
  setEndedEpoch: (epoch: number) => void,
) => {
  const { runtime, startPlan } = session
  if (runtime.phase === 'gate') return <Join session={session} />
  if (active !== null) {
    const done =
      runtime.phase === 'seated'
        ? () => setEndedEpoch(runtime.snapshot?.planEpoch ?? 0)
        : active.done
    return <Countdown done={done} epoch={active.epoch} mode={active.mode} />
  }
  if (runtime.phase === 'seated') {
    return (
      <p className='text-center text-[11px] tracking-[0.3em] text-ash uppercase'>
        the keeper tends the fire
      </p>
    )
  }
  const onSelect =
    runtime.phase === 'host'
      ? startPlan
      : (mode: PlanMode) => setSolo({ mode, epoch: Date.now() })
  return <Start onSelect={onSelect} />
}
```

- [ ] **Step 4: Follower branch in `ui/player.tsx`**

Add the apply effect after the bind effect, and gate the transport buttons. The changed pieces:

```tsx
  const seatedSnapshot =
    runtime.phase === 'seated' ? runtime.snapshot : null
  const { applySnapshot } = playback
  useEffect(() => {
    if (seatedSnapshot === null) return
    void applySnapshot(seatedSnapshot)
    // biome-ignore lint/correctness/useExhaustiveDependencies: converge once per accepted snapshot
  }, [seatedSnapshot])
```

and replace the transport button block with:

```tsx
        {runtime.phase !== 'seated' &&
          (playback.isPlaying ? (
            <button
              aria-label='pause'
              className={CONTROL}
              onClick={playback.pause}
              type='button'
            >
              <PauseIcon />
            </button>
          ) : (
            <button
              aria-label='play'
              className={CONTROL}
              onClick={playback.play}
              type='button'
            >
              <PlayIcon />
            </button>
          ))}
```

- [ ] **Step 5: Render `Peers` in `ui/home.tsx`**

Add `import { Peers } from 'ui/peers'` and render `<Peers session={session} />` directly under `<Share session={session} />`.

- [ ] **Step 6: Gates**

Run: `pnpm --filter bonfire test && pnpm --filter bonfire typecheck && pnpm --filter bonfire lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/bonfire/ui/join.tsx apps/bonfire/ui/peers.tsx apps/bonfire/ui/timer.tsx apps/bonfire/ui/player.tsx apps/bonfire/ui/home.tsx
git commit -m "feat(bonfire): join a shared session"
```

---

### Task 10: Verification sweep

**Files:** none new. Fixes ride separate commits with real subjects.

- [ ] **Step 1: Full gates with pasted output**

Run: `pnpm --filter bonfire test && pnpm --filter bonfire typecheck && pnpm --filter bonfire lint`
Expected: PASS. Paste the tail of the output into the summary.

- [ ] **Step 2: Two-browser session check**

Run `pnpm --filter bonfire dev`. Then:

1. Browser A (normal profile): open `http://localhost:3010`, press "share the fire", copy the link, press play, start a long plan.
2. Browser B (fresh incognito profile): open the copied link. Expected: join panel, no timer controls.
3. In B, set a nick and sit. Expected within 10 s: the countdown appears within one second of A's, the same track plays within 2 s of A's position, both nick rows show both nicks.
4. In A, pause the music. Expected in B: pause within about one second.
5. In A, press play again. Expected in B: playback resumes near A's position.
6. Close A. Expected in B within 30 s: "the keeper left · the fire burns down", the countdown keeps running, music keeps playing.
7. Reopen the link in A (same tab session gone: this is a new join, not a host resume). Expected: A lands on the join panel. Host resume only survives a reload of the original tab.
8. Solo regression: open `http://localhost:3010` plain. Expected: today's app, no session artifacts.

Record any deviation, fix, and re-run the affected step before moving on.

- [ ] **Step 3: Update the spec status line**

In `docs/superpowers/specs/2026-08-10-bonfire-shared-sessions-design.md` change the status line to `Status: implemented 2026-08-10.` Commit:

```bash
git add docs/superpowers/specs/2026-08-10-bonfire-shared-sessions-design.md
git commit -m "docs(bonfire): mark the shared-sessions spec implemented"
```

---

## Known risks carried from the spec

- Geo-blocked tracks can shift indexes between members. Accepted v0.
- The seal authenticates the group, not the host. Accepted v0.
- Clock skew moves follower timers by wall-clock error. Accepted v0.
- Relay `since` filters replay up to 3 minutes of history. Ephemeral kinds rarely persist, and seq acceptance drops stale replays.
