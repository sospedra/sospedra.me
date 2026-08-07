# vouch proof campaign, track A implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove and repair the vouch reference model: spec vendored and revised to v0.1.1, the governance hole closed, theorems written, and a mechanical adversary installed.

**Architecture:** The chain hash gains full-migration coverage through one digest. The trust state binds the proven receipt-key record. `PROOFS.md` states the theorems and maps every claim to a rule string, a scenario, and a vector. A mutation harness and seeded fuzzers keep the proofs honest.

**Tech Stack:** TypeScript strict, Vite 8, `node --test`, biome, `@noble/curves`, `@noble/hashes`. Zero new dependencies.

## Global Constraints

- Working directory for all commands: `apps/vouch`. All paths below are relative to it unless they start with `docs/`.
- Node engine 24.x. Tests run with `pnpm test`, gates are `pnpm typecheck` and `pnpm lint`.
- Zero new dependencies. No new package.json entries beyond `scripts`.
- Wire protocol stays v1. Byte changes are sanctioned: fixtures regenerate only through `pnpm vectors` and `pnpm program-id`, never by hand.
- The source spec is gospel. After task 2, `apps/vouch/SPEC.md` v0.1.1 is the gospel text. Code follows spec text, in that order.
- Docs use ASD-STE100 style: short sentences, active voice, no em dashes, no contractions.
- Commits: imperative subject only, no body, no trailers. Never create a branch.
- The concurrent session owns unrelated staged files. Stage explicit paths only: `git add <files>`, never `git add -A` or `git commit -a`, and `git commit` only with explicit pathspecs if anything unrelated is staged.
- Two program-identity tests fail today because sibling work holds an uncommitted root `pnpm-lock.yaml` edit. Task 3 regenerates the manifest fixture and heals them. If the suite shows other failures before your task, stop and report.

---

### Task 1: Vendor the spec

**Files:**
- Create: `apps/vouch/SPEC.md`
- Modify: `apps/vouch/DESIGN.md` (rule of interpretation section)

**Interfaces:**
- Produces: `apps/vouch/SPEC.md`, the gospel document all later tasks cite by section number.

- [ ] **Step 1: Copy the spec verbatim**

```bash
cp /Users/sospedra/labs/crypto-verificable-promises/docs/VERIFIABLE_ARCHITECTURE_TECH_SPEC.md apps/vouch/SPEC.md
```

- [ ] **Step 2: Prepend the vendoring header and changelog section**

Insert at the very top of `SPEC.md`, before the existing title:

```markdown
> Vendored verbatim from the source repository on 2026-08-07. This file is
> the gospel text for `apps/vouch`. Revisions append to the changelog below.

## changelog

- v0.1.0 (2026-08-03): vendored baseline.

---
```

- [ ] **Step 3: Point DESIGN.md at the vendored spec**

In `apps/vouch/DESIGN.md`, in the "rule of interpretation" section, replace the sentence naming the source spec location with: `The source spec is vendored at apps/vouch/SPEC.md.`

- [ ] **Step 4: Commit**

```bash
git add apps/vouch/SPEC.md apps/vouch/DESIGN.md
git commit -m "docs(vouch): vendor the source spec"
```

### Task 2: Write spec revision v0.1.1

**Files:**
- Modify: `apps/vouch/SPEC.md` (changelog, sections 15.1, 16.2, 18)
- Modify: `apps/vouch/DESIGN.md` (deviations section)

**Interfaces:**
- Produces: the v0.1.1 normative text that tasks 3, 4, and 5 implement. Key terms: `migration digest`, `manifest pair hash`, `key state hash`.

- [ ] **Step 1: Add the changelog entry**

```markdown
- v0.1.1 (2026-08-07): migration digest covers the full canonical migration
  object in the program chain. Manifest pair hash defined. Client trust state
  binds the proven receipt-key record. Genesis chain link is the era-0
  migration object. Hash magic renamed VAPI to VOUCH (8.2). Program manifest
  gains an execution-mode discriminant (15.1). Migration authorization
  validity is the governance-role event gate; the chain digest gives
  substitution-proofness only (16.2, 32 item 8).
```

- [ ] **Step 2: Revise section 16.2**

After the existing requirements list, add:

```markdown
Revision v0.1.1. The program chain link MUST commit the digest of the full
canonical migration object:

    migration_digest = H("program-migration", encode(ProgramMigrationV1))
    chain_next = H("program-chain", previous_chain, migration_digest)

A client walking migrations MUST recompute the digest from the presented
migration bytes. A presented migration that differs in any byte from the
committed one, including `next_program_manifest_hash` and
`governance_authorization`, MUST fail the walk.

`next_program_manifest_hash` MUST be the manifest pair hash of the next
era's update and query manifests:

    manifest_pair_hash = H("program-manifest-pair", encode(update_manifest), encode(query_manifest))

When an era's manifests are published, the pair hash MUST derive that era's
program ids, and a verifier holding the manifests MUST check both derived
ids against the migration's next ids. Eras with simulated programs commit
the pair hash as an opaque value.

The genesis chain link is the digest of the era-0 migration object: the
genesis program ids, the genesis manifest pair hash, activation sequence 0,
and an empty governance authorization. Genesis needs no governance
authorization because the client pins genesis directly.

The chain digest gives substitution-proofness: the migration bytes the
client walks are the committed bytes. Authorization validity is a separate
control: `OP.COMMIT_MIGRATION` MUST be accepted only from an author holding
the governance role, enforced in transition replay. The internal structure
of `governance_authorization` stays an open engineering decision per
section 32 item 8.
```

- [ ] **Step 3: Revise section 15.1**

Add one paragraph at the end of 15.1:

```markdown
Revision v0.1.1. The manifest carries an `execution_mode` u8 discriminant:
1 = source (Phase 0, verifier re-executes from source, identity field is
`program_source_hash`), 2 = guest (zkVM era, identity field is
`guest_binary_hash`). The discriminant is encoded, so a fixed-field decoder
never guesses the identity field's meaning.
```

Also revise section 8.2 in place: the domain-separation magic is `VOUCH`.
DESIGN.md deviation 1 promised this rename at the next spec revision. Add
one changelog-referencing sentence at the 8.2 edit.

- [ ] **Step 4: Revise section 18**

Add one paragraph after the `ClientTrustStateV1` block:

```markdown
Revision v0.1.1. `active_key_state_hash` MUST equal
H("key-state", value) where value is the canonical receipt-key record the
verifier proved at the accepted root in step 4. The field is diagnostic:
steps 4 and 14 already authenticate key state, and the proofs document shows
the redundancy.
```

- [ ] **Step 5: Rewrite DESIGN.md deviation 5**

Replace the deviation 5 item body with: `Closed by spec revision v0.1.1 and the migration-digest chain. See SPEC.md changelog.` Keep the item number so cross-references hold. Update deviation 4's last sentence to cite the 15.1 field rule.

- [ ] **Step 6: Commit**

```bash
git add apps/vouch/SPEC.md apps/vouch/DESIGN.md
git commit -m "docs(vouch): spec revision v0.1.1"
```

### Task 3: Migration digest in the program chain

**Files:**
- Modify: `apps/vouch/src/protocol/hash.ts` (Domain union)
- Modify: `apps/vouch/src/protocol/program.ts:192-213` (`chainNext`, `GENESIS_CHAIN`)
- Modify: `apps/vouch/src/protocol/transition.ts:188` (seal site)
- Modify: `apps/vouch/src/protocol/verify.ts` (`advanceEra` chain recompute)
- Modify: `apps/vouch/src/scenarios/s18-early-migration.ts`, `apps/vouch/src/scenarios/s19-migration-chain.ts` (call sites and narrative labels)
- Test: `apps/vouch/test/program.test.ts`

**Interfaces:**
- Consumes: `encodeMigration(m: ProgramMigrationV1): Uint8Array`, `manifestHash`, `hash(domain, ...parts)`.
- Produces:
  - `migrationDigest(m: ProgramMigrationV1): Uint8Array` in `program.ts`.
  - `manifestPairHash(update: ProgramManifestV1, query: ProgramManifestV1): Uint8Array` in `program.ts`.
  - `chainNext(prev: Uint8Array, migration: ProgramMigrationV1): Uint8Array`, new signature.
  - `GENESIS_MIGRATION: ProgramMigrationV1` in `program.ts`.

- [ ] **Step 1: Write the failing tests**

Append to `test/program.test.ts`:

```ts
test('chainNext binds every byte of the migration object', () => {
  const base: ProgramMigrationV1 = {
    nextUpdateProgramId: PROGRAM.updateV2,
    nextQueryProgramId: PROGRAM.queryV2,
    nextProgramManifestHash: new Uint8Array(32).fill(7),
    activationSequence: 9n,
    governanceAuthorization: new Uint8Array(64).fill(3),
  }
  const chain = chainNext(GENESIS_CHAIN, base)
  const forgedAuthorization = chainNext(GENESIS_CHAIN, {
    ...base,
    governanceAuthorization: new Uint8Array(64).fill(4),
  })
  const forgedManifest = chainNext(GENESIS_CHAIN, {
    ...base,
    nextProgramManifestHash: new Uint8Array(32).fill(8),
  })
  assert.notDeepEqual(chain, forgedAuthorization)
  assert.notDeepEqual(chain, forgedManifest)
})

test('the genesis chain is the digest of the era-0 migration object', () => {
  assert.deepEqual(GENESIS_MIGRATION.nextUpdateProgramId, PROGRAM.updateV1)
  assert.equal(GENESIS_MIGRATION.activationSequence, 0n)
  assert.equal(GENESIS_MIGRATION.governanceAuthorization.length, 0)
  assert.deepEqual(GENESIS_CHAIN, chainNext(ZERO32, GENESIS_MIGRATION))
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test 2>&1 | grep -E "✖|fail"`
Expected: FAIL. `chainNext` rejects the object argument, `GENESIS_MIGRATION` is not exported.

- [ ] **Step 3: Implement**

In `hash.ts`, extend the `Domain` union with `'program-migration'` and `'program-manifest-pair'` and `'key-state'` (task 5 uses the third; add all three here so the union changes once).

In `program.ts`, add `executionMode: number` to `ProgramManifestV1` with value 1 for both Phase 0 manifests. `encodeManifest` writes it as u8 first, `decodeManifest` reads and rejects values other than 1 or 2. Spec 15.1 v0.1.1 defines the discriminant. Extend the task test with a round-trip assertion and a rejection assertion for mode 0.

In `program.ts`, replace `chainNext` and `GENESIS_CHAIN`:

```ts
export function manifestPairHash(
  update: ProgramManifestV1,
  query: ProgramManifestV1,
): Uint8Array {
  return hash('program-manifest-pair', encodeManifest(update), encodeManifest(query))
}

export function migrationDigest(m: ProgramMigrationV1): Uint8Array {
  return hash('program-migration', encodeMigration(m))
}

export function chainNext(
  prev: Uint8Array,
  migration: ProgramMigrationV1,
): Uint8Array {
  return hash('program-chain', prev, migrationDigest(migration))
}

export const GENESIS_MIGRATION: ProgramMigrationV1 = {
  nextUpdateProgramId: PROGRAM.updateV1,
  nextQueryProgramId: PROGRAM.queryV1,
  nextProgramManifestHash: manifestPairHash(manifestFor('update'), manifestFor('query')),
  activationSequence: 0n,
  governanceAuthorization: new Uint8Array(0),
}

export const GENESIS_CHAIN = chainNext(ZERO32, GENESIS_MIGRATION)
```

Update every `chainNext` call site to pass the full migration object. At `transition.ts:188` the seal already holds the committed migration. In `verify.ts` `advanceEra`, recompute the chain from the presented migration bytes: decode, digest, compare. The existing failure stays `{ error: 'INVALID_PROGRAM_CHAIN', rule: 'migration-chain-hash' }`. In `s18` and `s19`, pass their `migration` objects. In `s19`, rewrite the two `Coverage` labels and the closing `note` to say the manifest hash and governance authorization are now covered by the chain digest.

- [ ] **Step 4: Regenerate fixtures**

Run: `pnpm program-id && pnpm vectors`
Expected: both scripts rewrite `fixtures/protocol-v1/`. `git diff --stat fixtures/` shows changed vectors and manifest.

- [ ] **Step 5: Run the full suite and gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, including the two program-identity tests red before this task.

- [ ] **Step 6: Commit**

```bash
git add apps/vouch/src apps/vouch/test apps/vouch/fixtures
git commit -m "feat(vouch): migration digest covers the full object in the program chain"
```

### Task 4: Forged-governance scenario s23

**Files:**
- Create: `apps/vouch/src/scenarios/s23-forged-governance.ts`
- Modify: `apps/vouch/src/scenarios/index.ts` (registry)
- Modify: `apps/vouch/test/registry.test.ts` (count and id assertions)
- Test: `apps/vouch/test/scenarios-h.test.ts`

**Interfaces:**
- Consumes: `buildGenesis`, `Server`, `seqRecords`, `encodeMigration`, trace helpers from `src/scenarios/helpers.ts` and `trace.ts`, the s19 module as the structural template.
- Produces: scenario id `s23-forged-governance`, verdict kind `REJECT`, rule `migration-chain-hash`.

- [ ] **Step 1: Write the failing test**

Append to `test/scenarios-h.test.ts`, mirroring the file's existing scenario test shape:

```ts
test('s23: a forged governance authorization inside an honest migration rejects', () => {
  const trace = s23.run()
  const verdict = trace.verdict
  assert.equal(verdict.kind, 'REJECT')
  assert.equal(verdict.error, 'INVALID_PROGRAM_CHAIN')
  assert.equal(verdict.rule, 'migration-chain-hash')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test 2>&1 | grep -E "✖|s23"`
Expected: FAIL, module `s23-forged-governance.ts` does not exist.

- [ ] **Step 3: Write the scenario**

Copy the s19 structure. The server commits an honest migration and seals eras exactly like s19. The bundle handed to the client swaps one byte:

```ts
const forged: ProgramMigrationV1 = {
  ...migration,
  governanceAuthorization: flipFirstByte(migration.governanceAuthorization),
}
const bundle = { ...honestBundle, migrations: [encodeMigration(forged)] }
```

`flipFirstByte` is a local helper: copy the array, XOR index 0 with 1. The scenario claim: the client's walk recomputes the migration digest from presented bytes and the chain no longer matches. Taxonomy `PREVENTED_BY_MATH`. The rejection is the subject, so the verdict kind is `REJECT` per the DESIGN.md verdict-kind rule.

- [ ] **Step 4: Register it**

Add s23 to `src/scenarios/index.ts` after s22. Update `test/registry.test.ts` scenario count from 22 to 23 and add the new id to any exhaustive id list the file asserts.

- [ ] **Step 5: Run the suite**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS. The dashboard picks the scenario up from the registry with no UI change.

- [ ] **Step 6: Commit**

```bash
git add apps/vouch/src/scenarios apps/vouch/test
git commit -m "feat(vouch): s23 forged governance authorization rejects"
```

### Task 5: Bind the key state hash

**Files:**
- Modify: `apps/vouch/src/protocol/verify.ts:780-812` (`BuildTrustParams`, `stageBuildNextTrust`, orchestration at line 863)
- Test: `apps/vouch/test/verify.test.ts`

**Interfaces:**
- Consumes: `hash('key-state', ...)` domain from task 3, `bundle.receiptKeyWitness.value` (non-null after step 4), `AccessV1`.
- Produces: `NextClientTrustState.activeKeyStateHash` equals `hash('key-state', receiptKeyWitness.value)`.

- [ ] **Step 1: Write the failing test**

Append to `test/verify.test.ts`, using the file's existing happy-path bundle builder:

```ts
test('the accepted trust state binds the proven receipt-key record', () => {
  const { input, bundle } = happyBundle()
  const result = verifyBundle(input)
  assert.ok(result.ok)
  const expected = hash('key-state', bundle.receiptKeyWitness.value)
  assert.deepEqual(result.trust.activeKeyStateHash, expected)
  assert.notDeepEqual(result.trust.activeKeyStateHash, input.trust.activeKeyStateHash)
})
```

Adapt `happyBundle` to whatever builder name `verify.test.ts` already uses. If the genesis anchors value already equals the proven record hash in the happy path, rotate the receipt key in the fixture first so the two differ.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test 2>&1 | grep -E "✖|key-state"`
Expected: FAIL, `activeKeyStateHash` still carries the input trust value.

- [ ] **Step 3: Implement**

Extend `BuildTrustParams` with `keyStateHash: Uint8Array`. In `stageBuildNextTrust`, set `activeKeyStateHash: params.keyStateHash`. At the orchestration site (line 863), pass `keyStateHash: hash('key-state', input.bundle.receiptKeyWitness.value)`. Step 4 already rejected null values, so no branch is needed at the call site; if the type still admits null there, throw on null with a one-line invariant error.

- [ ] **Step 4: Run the suite and gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/vouch/src/protocol/verify.ts apps/vouch/test/verify.test.ts
git commit -m "feat(vouch): trust state binds the proven receipt-key record"
```

### Task 6: Check-flip mutation harness

**Files:**
- Create: `apps/vouch/scripts/mutants.ts`
- Test: `apps/vouch/test/mutants-table.test.ts`

**Interfaces:**
- Consumes: `src/protocol/verify.ts` source text, the suite via `node --test`.
- Produces: `MUTANTS: Mutant[]` where `Mutant = { rule: string; file: string; find: string; replace: string }`, and the script `pnpm mutants`.

- [ ] **Step 1: Write the failing completeness test**

Create `test/mutants-table.test.ts`:

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { MUTANTS } from '../scripts/mutants.ts'

const VERIFY_URL = new URL('../src/protocol/verify.ts', import.meta.url)

test('every verifier rule string has at least one mutant', () => {
  const source = readFileSync(VERIFY_URL, 'utf8')
  const rules = [...source.matchAll(/rule: '([a-z0-9-]+)'/g)].map((m) => m[1])
  assert.ok(rules.length >= 26)
  const covered = new Set(MUTANTS.map((m) => m.rule))
  for (const rule of new Set(rules)) {
    assert.ok(covered.has(rule), `no mutant for rule ${rule}`)
  }
})

test('the transition role gate and activation boundary have named mutants', () => {
  const covered = new Set(MUTANTS.map((m) => m.rule))
  assert.ok(covered.has('commit-migration-role-gate'))
  assert.ok(covered.has('activation-boundary'))
})

test('every mutant find-string is unique in its file', () => {
  for (const mutant of MUTANTS) {
    const source = readFileSync(new URL(`../${mutant.file}`, import.meta.url), 'utf8')
    const first = source.indexOf(mutant.find)
    assert.ok(first >= 0, `${mutant.rule}: find-string missing`)
    assert.equal(source.indexOf(mutant.find, first + 1), -1, `${mutant.rule}: find-string not unique`)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test 2>&1 | grep -E "✖|mutant"`
Expected: FAIL, `scripts/mutants.ts` does not exist.

- [ ] **Step 3: Write the harness**

`scripts/mutants.ts` exports the table and, under `import.meta.main`, runs it:

```ts
export type Mutant = { rule: string; file: string; find: string; replace: string }

export const MUTANTS: Mutant[] = [
  {
    rule: 'receipt-key-witness',
    file: 'src/protocol/verify.ts',
    find: "if (\n    !verifyWitness(receipt.stateRoot, access.key, access.value, access.witness)\n  ) {\n    return { error: 'INVALID_PROOF', rule: 'receipt-key-witness' }",
    replace: "if (false) {\n    return { error: 'INVALID_PROOF', rule: 'receipt-key-witness' }",
  },
  // one entry per rule string; the completeness test enforces the inventory
]
```

The runner, for each mutant: copy `src/` to `mkdtempSync` scratch, apply the single string replacement (throw if `find` is absent), copy `test/` and `fixtures/` and `scripts/` beside it, run `node --test` in the scratch via `spawnSync`, and record whether the suite went red. Print one line per mutant: `killed` or `SURVIVED`. Exit 1 if any mutant survived. Skip-list: none. Build the full table by reading every `rule: '...'` site in `verify.ts` and flipping its guard, the same shape as the example. Each `find` must include enough surrounding lines to be unique; the uniqueness test enforces this.

Two mutants target `src/protocol/transition.ts` instead of `verify.ts`: rule `commit-migration-role-gate` empties the `[OP.COMMIT_MIGRATION]: [GOVERNANCE_ROLE]` entry (line 261) so any author may commit a migration, and rule `activation-boundary` flips the activation-sequence comparison the old update program enforces. The rule names are harness-local labels, not verify.ts strings. Both mutants must die like the rest.

Add to `apps/vouch/package.json` scripts: `"mutants": "node scripts/mutants.ts"`.

- [ ] **Step 4: Run the harness to verify every mutant dies**

Run: `pnpm mutants`
Expected: every line `killed`, exit 0. A `SURVIVED` line means a verifier check no test exercises. Do not weaken the mutant. Add a scenario or vector test that kills it, in this task.

- [ ] **Step 5: Run the suite and gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/vouch/scripts/mutants.ts apps/vouch/test/mutants-table.test.ts apps/vouch/package.json
git commit -m "test(vouch): check-flip mutation harness over the verifier"
```

### Task 7: Seeded property fuzzers

**Files:**
- Create: `apps/vouch/test/fuzz-encode.test.ts`
- Create: `apps/vouch/test/fuzz-smt.test.ts`
- Create: `apps/vouch/test/fuzz-chain.test.ts`
- Modify: `apps/vouch/package.json` (append the three files to the `test` script list)

**Interfaces:**
- Consumes: `Prng` from `src/protocol/rand.ts` (seeded PRNG), encode and decode pairs from `program.ts`, `receipt.ts`, `events.ts`, `Smt` and `verifyWitness` from `smt.ts`.
- Produces: three deterministic fuzz suites, fixed seeds, no wall-clock dependence.

- [ ] **Step 1: Write fuzz-encode**

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeMigration, encodeMigration } from '../src/protocol/program.ts'
import { Prng } from '../src/protocol/rand.ts'

const ROUNDS = 256

function randomMigration(rng: Prng) {
  return {
    nextUpdateProgramId: rng.bytes(32),
    nextQueryProgramId: rng.bytes(32),
    nextProgramManifestHash: rng.bytes(32),
    activationSequence: rng.u64(),
    governanceAuthorization: rng.bytes(rng.int(0, 256)),
  }
}

test('migration encoding round-trips over a seeded corpus', () => {
  const rng = new Prng('fuzz-encode-migration')
  for (let i = 0; i < ROUNDS; i += 1) {
    const migration = randomMigration(rng)
    assert.deepEqual(decodeMigration(encodeMigration(migration)), migration)
  }
})

test('no single-byte mutation round-trips to the original bytes', () => {
  const rng = new Prng('fuzz-encode-mutation')
  const bytes = encodeMigration(randomMigration(rng))
  for (let i = 0; i < bytes.length; i += 1) {
    const mutated = bytes.slice()
    mutated[i] = mutated[i] ^ 0xff
    const survives = (() => {
      try {
        const decoded = decodeMigration(mutated)
        return encodeMigration(decoded).every((b, j) => b === bytes[j])
      } catch {
        return false
      }
    })()
    assert.equal(survives, false, `byte ${i}: mutation decoded back to the original`)
  }
})
```

Adapt `Prng` construction and method names to what `rand.ts` actually exports; the seeded-corpus and mutation-sweep shapes stay. The mutation property asserts a flip never round-trips to the original bytes, which is what canonical one-representation encoding promises. A content flip that decodes to a DIFFERENT valid object is correct decoder behavior, authentication rejects it later, so the property is uniqueness, not rejection. Add a third test in the same file for malformed encodings: truncation at every length, one trailing byte, an oversized length prefix, and an invalid enum discriminant must throw.

- [ ] **Step 2: Write fuzz-smt**

Same file conventions. Properties, 256 seeded rounds each: inserted keys verify inclusion against the root, absent keys verify exclusion, and a witness with any single sibling hash flipped fails `verifyWitness`.

- [ ] **Step 3: Write fuzz-chain**

Build two independent seeded era chains A and B with two migrations each, through `chainNext` from task 3. Property: walking A's journals against a receipt whose `programChainHash` comes from B fails with `INVALID_PROGRAM_CHAIN`, at every splice point.

- [ ] **Step 4: Wire into the test script and run**

Append the three files to the `test` script in `apps/vouch/package.json`. Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, total test count grows, runtime stays under a minute.

- [ ] **Step 5: Commit**

```bash
git add apps/vouch/test apps/vouch/package.json
git commit -m "test(vouch): seeded property fuzzers for encoding, smt, chain"
```

### Task 8: PROOFS.md

**Files:**
- Create: `apps/vouch/PROOFS.md`
- Test: `apps/vouch/test/proofs-coverage.test.ts`

**Interfaces:**
- Consumes: rule strings from `verify.ts`, scenario ids from `src/scenarios/index.ts`, vector names from `fixtures/protocol-v1/`, spec section numbers from `SPEC.md`.
- Produces: the paper appendix source. Theorems T1 to T7, the safety induction, completeness, the evidence lemma, two redundancy lemmas, assumption discharge, and the audit matrix.

- [ ] **Step 1: Write the failing coverage test**

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('PROOFS.md cites every verifier rule string', () => {
  const rules = [...read('../src/protocol/verify.ts').matchAll(/rule: '([a-z0-9-]+)'/g)].map((m) => m[1])
  const proofs = read('../PROOFS.md')
  for (const rule of new Set(rules)) {
    assert.ok(proofs.includes('`' + rule + '`'), `PROOFS.md missing rule ${rule}`)
  }
})

test('PROOFS.md cites every scenario id', () => {
  const proofs = read('../PROOFS.md')
  for (let i = 1; i <= 23; i += 1) {
    const id = `s${String(i).padStart(2, '0')}`
    assert.ok(proofs.includes(id), `PROOFS.md missing scenario ${id}`)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test 2>&1 | grep -E "✖|PROOFS"`
Expected: FAIL, `PROOFS.md` does not exist.

- [ ] **Step 3: Write the document**

Structure, all sections mandatory:

```markdown
# vouch proofs

## assumptions
SHA-256 collision resistance. Ed25519 existential unforgeability. Spec 5.3.

## definitions
Verifier, bundle, trust state, era walk. Each term names its type and file.

## scope
The steps vouch models. Steps 1 and 2 (Protobuf transport) have no
counterpart per DESIGN deviation 3. Step 18 is proved for the in-memory
persistence model. State the boundary before any theorem.

## theorem S: safety induction
Statement: every trust state the verifier accepts descends from the pinned
genesis through valid authenticated transitions, PROVIDED the input trust
state is the pinned genesis or the atomically persisted output of a prior
accepting run (spec 5.2, 18). State the hypothesis in the theorem.
Proof: induction over walkTransitionSegments and advanceEra. Base: genesis
anchors. Step: each journal extends the accepted root chain or the walk
fails. Case analysis over the rules each step can raise.

## theorems T1 to T7
One subsection per spec 6.1 item, the statement from the design doc table
as amended 2026-08-07: T2 covers receipt, head, author, and governance
signatures (steps 4, 5, 14, 16). T3 spans steps 12 and 14. T4 is
conditional on proof-system and verifier correctness per spec 5.3. T5
chains steps 7-10, 12, 13, and 15. T6 carries the client-nonce-freshness
hypothesis. T7 needs descent (step 14) plus persisted monotonicity (11,
18). Each proof: assume the verifier accepts the forbidden behavior, name
the check that passed, derive a collision or a forgery. Cite each rule
string in backticks and the scenario plus vector that exercise it.

## theorem C: completeness
An honest server passes all 19 steps. Witness: the honest scenario beats and
the golden vectors.

## lemma E: equivocation evidence
Two conflicting signed heads for one window form portable evidence. Cite
s12-head-conflict-gossip.

## lemma R1: era check subsumption
The chain digest commits the full migration, so a walked era whose
updateProgramId diverges from the receipt fails `final-chain-hash` before
any updateProgramId comparison could run. The absent guard is sound.

## lemma R2: key state redundancy
Steps 4 and 14 authenticate the receipt-key record; the bound
activeKeyStateHash is diagnostic. Spec 18 v0.1.1.

## assumption instantiation
The theorems stay conditional on spec 5.3 in every mode. Replay mode
replaces the zkVM soundness assumption with evaluator and runtime
correctness. Track C instantiates it with a concrete audited proof system
and a real guest_binary_hash. Neither mode discharges an assumption. State
the per-mode assumption set.

## audit matrix
One row per spec 6.1 item: lemma, verify.ts rule strings, scenario ids,
vector files. No empty cells.
```

Write full prose for every proof. The two `<!-- -->`-free skeleton sections above define structure, not content. STE style throughout.

- [ ] **Step 4: Run the coverage test and gates**

Run: `pnpm test && pnpm lint`
Expected: PASS. Every rule string and scenario id is cited.

- [ ] **Step 5: Commit**

```bash
git add apps/vouch/PROOFS.md apps/vouch/test/proofs-coverage.test.ts
git commit -m "docs(vouch): proofs with audit matrix"
```

### Task 9: Sync pass

**Files:**
- Modify: `apps/vouch/README.md`
- Modify: `apps/vouch/DESIGN.md`

**Interfaces:**
- Consumes: final test count from `pnpm test`, scenario count 23.

- [ ] **Step 1: Update README**

Scenario count 22 becomes 23 everywhere. Test count updates to the real number from `pnpm test`. Add two links under the title: `SPEC.md` (gospel, v0.1.1) and `PROOFS.md` (theorems and audit matrix). Update the deviations summary sentence: deviation 5 is closed by v0.1.1.

- [ ] **Step 2: Update DESIGN.md status line**

Status gains: `proofs: PROOFS.md, spec: SPEC.md v0.1.1`.

- [ ] **Step 3: Full gates**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm mutants`
Expected: all PASS, zero survivors.

- [ ] **Step 4: Commit**

```bash
git add apps/vouch/README.md apps/vouch/DESIGN.md
git commit -m "docs(vouch): sync readme and design to the proof campaign"
```
