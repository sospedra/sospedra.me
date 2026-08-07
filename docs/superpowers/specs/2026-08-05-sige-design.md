# sige: sealed-identity escrow PoC

Status: approved by owner, 2026-08-05.
Target: `apps/sige` in this monorepo.
Doubt rule: the SIGE spec is the gospel. When a choice is unclear, follow
`~/labs/crypto-verificable-promises/docs/SEALED_IDENTITY_TECH_SPEC.md`.
The reframe below changes fixtures and copy. It never changes protocol semantics.

## 1. What this is

A fully client-side demonstrator of the sealed-identity signature-gated escrow
system (SIGE). Every account binds to one legal identity. The binding stays
sealed against the operator and any database dump. The seal opens only along a
path that is publicly logged and arithmetically delayed. The demo runs the real
cryptography (two-gate IBE KEM over BLS12-381, RSW timed commitment, Merkle
transparency log, chained congestion work) and labels every simulated
institution with an honesty tier: `MATH`, `CUSTODY`, or `ASSUMED`.

## 2. Sources and precedents

- Logic source: `~/labs/crypto-verificable-promises/packages/sige-demo`
  (~3.9k lines TS, 12 modules, 14 scenarios, noble 1.x). The port is TS to TS.
- Spec: `docs/SEALED_IDENTITY_TECH_SPEC.md` in that repo. Companion demo spec
  and implementation notes live beside it.
- Stack precedent: `apps/aol` (Vite 8, noble 2.2.0, node --test, biome,
  `@repo/*` workspace configs).

## 3. Decisions log

1. Name: `sige`, picked over `plica` (2026-08-05).
2. Approach: port `sige-demo` into a Vite app. No Python heritage, no
   clean-room rewrite, no Next.
3. Reframe: jurisdiction-neutral. An external authority with mandatory public
   records is the only actor that can trigger an unseal. Spain becomes one
   example profile, not the frame.
4. Doubt rule: spec wins. See header.

## 4. Shape and stack

Vite 8 app, aol pattern. Runtime dependencies: `@noble/curves`,
`@noble/ciphers`, `@noble/hashes`, all 2.2.0 exact. Dev: `@repo/biome-config`,
`@repo/typescript-config`, `typescript`, `vite`, `@types/node` (catalog).
Fully client-side: no server, no storage, no network calls.

```
apps/sige/
  index.html  vite.config.ts  biome.json  tsconfig.json  package.json
  src/
    core/        bytes.ts hash.ts aead.ts kem.ts puzzle.ts merkle.ts chain.ts congestion.ts
    world/       world.ts profile.ts docket.ts
    scenarios/   scenarios.ts
    ui/          main.ts ledger.ts runner.ts worker.ts style.css
  test/          *.test.ts
```

Package scripts mirror aol: `dev`, `build`, `preview`, `lint`, `typecheck`,
`test` (node --test over explicit test files).

## 5. Core port

The eight core modules copy from `sige-demo/src` with one change: migrate
noble 1.x APIs to 2.2.0 (point classes, key helpers, import paths; verify each
against installed 2.2.0, aol is the local reference). No logic changes. The
KEM stays CPA-level. The RSW puzzle keeps the client-held trapdoor. Both are
recorded demo-profile deltas in the spec (section 19) and stay tagged in the
ledger copy.

## 6. Reframe: authority profiles and reconciliation

Two pieces. Both are new code around unchanged protocol machinery.

### 6.1 AuthorityProfile

`world.ts` stops hardcoding `Role = "judge" | "prosecutor" | "police"`. Roles
become data:

```ts
interface AuthorityProfile {
  id: string;                 // "generic" | "es" | ...
  roles: string[];            // every role that can sign an order
  acceptedRoles: string[];    // subset the warrant gate accepts
  recordHorizonBlocks: number; // mandatory-publication deadline, in sim blocks
}
```

`createWorld` takes a profile. Two fixtures ship:

- `generic` (default): roles `court`, `oversight`, `agency`; accepted:
  `court`, `oversight`.
- `es` (worked example): `judge`, `prosecutor`, `police`; accepted: `judge`,
  `prosecutor`. Same semantics as the current code, kept as data to prove the
  policy is pluggable.

The roles scenario runs against the active profile. The UI exposes a profile
switch to show one machine under two legal skins. Leaf fields keep
`issuing_role` in the clear, per spec section 6.2.3.

### 6.2 Docket reconciliation (new module + scenario)

The owner's invariant, made runnable: the authority must publish its records
once the process closes. `docket.ts` models it:

- The authority publishes case records on its own clock (fixture-driven).
- A keyless verifier joins every unseal leaf against the published docket by
  authorization hash.
- Before `recordHorizonBlocks`, an unmatched leaf is `pending`.
- Past the horizon, it flags `presumptively out-of-policy`. Flag only, never
  auto-reveal, per spec section 8.2.

New scenario `reconciliation`: unseal three accounts, publish two records,
advance the chain past the horizon, show the third leaf flagged. Tier:
`CUSTODY` for the flagging, `ASSUMED` for the promise itself.

### 6.3 Copy

Scenario copy drops Spain as the frame. Spec section references stay. The
`DemoScenario` and `DemoStep` contracts stay as in the source.

## 7. Scenario inventory (15)

| id | tier |
|---|---|
| enrollment | MATH |
| unseal | MATH + CUSTODY |
| single-gate | MATH |
| wrong-account | MATH |
| k-reconstruction | MATH |
| forged-order | CUSTODY |
| log-refusals | CUSTODY |
| timed-commitment | MATH |
| congestion | MATH + CUSTODY |
| equivocation | MATH |
| roles | CUSTODY |
| bypass | ASSUMED |
| release-control | CUSTODY |
| epoch-rotation | CUSTODY |
| reconciliation (new) | CUSTODY + ASSUMED |

## 8. Web surface

One page, two views.

- Honesty ledger lands first: the tier-tagged claims table, each row linking
  to its scenario runner.
- Runner: streams a scenario's `DemoStep`s with pass marks and tier badges.
  `solvePuzzle` reports progress, so timelock scenarios show a live countdown
  and the congestion scenario shows difficulty doubling per unseal.

All crypto runs in a module Web Worker. The main thread renders only. Art
direction is decided at implementation time under the route-theming rule
(bold, per-route, not the site palette).

## 9. Tests and parameters

- One `node --test` case per scenario asserting `run()` resolves true.
- Unit tests: KEM round-trip, single-share failure, wrong-account failure,
  Merkle inclusion, equivocation detection, puzzle monotonicity in `t`,
  congestion formula, AEAD tamper rejection.
- Relative `.ts` imports in every test-reachable module (node --test trap).
- `SIGE_FAST=1` shrinks `t` and `dFloor` for CI. Browser defaults tune the
  timelock to a few live seconds.

## 10. Non-goals

No HTTP services. No real Bitcoin anchor. No ZK circuit. No persistence. No
Vercel wiring in this pass: deploy cutover is its own later step (wkc
precedent). Nothing else ports from the sibling repo (walkthrough web app,
api, mobile, rust, proto all stay behind).
