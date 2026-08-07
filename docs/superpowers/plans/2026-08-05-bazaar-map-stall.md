# Bazaar map stall implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the ninth bazaar stall: a narrow map board with a Cheshire-inspired raccoon, linking to `/papers/bazaar`.

**Architecture:** Pure data addition. The stall engine (`scene-stall.tsx`, `market-stall.tsx`, `stall-dialog.tsx`) renders any entry in `STALL_SCENES` + `STALLS`. This plan adds the `map` entry to every data table, generates placeholder PNGs so the stall runs before the art campaign, and moves the floor lists into a testable data module.

**Tech Stack:** Next.js App Router, TypeScript, node:test via `tsx --test`, sharp (installed, 0.35.3), Biome.

**Spec:** `docs/superpowers/specs/2026-08-05-bazaar-map-stall-design.md` (repo root).

## Global constraints

- Working directory for all commands: `apps/main` (`cd /Users/sospedra/labs/sospedra.me/apps/main`).
- Never create a git branch. Work on the current branch.
- Commit subjects only. No bodies. No `Co-Authored-By` trailers.
- No new dependencies.
- Adding `map` to `STALL_SCENES` widens `BazaarStallId`. Four `Record<BazaarStallId, ...>` tables then fail `tsc` until they all carry a `map` entry: `SIM_DIMS`, `STALLS`, `STALL_TUNE`, `STALL_SFX`. Task 1 lands them in one commit. `pnpm typecheck` is the integration checklist.
- Dialog copy is fixed verbatim by the spec. Do not edit it.
- `SIM_DIMS.map` art values (artW 500, artH 884) and `rect` are provisional placeholders. The art campaign replaces them. Display values (dispW 260, dispH 460) are final.
- The new test file must run under `tsx --test`, not `node --test`. App modules use extensionless relative imports and JSON imports, and only tsx resolves both (see the second segment of the `test` script in `package.json`).

## Verified facts (2026-08-05)

- `/papers/bazaar` is a live route: `repo/papers/bazaar/metadata.json` has slug `bazaar`, and `app/papers/[slug]/page.tsx` builds static params from all papers.
- `decor.json` anchors only to `stall:*`, `stairs:0`, `stairs:2` hosts. No `mfloor:*`/`sm:*` hosts exist, so inserting a mobile floor at index 0 shifts no decor.
- No CSS selector matches `data-stall` values. Tint flows through the `--tint` custom property.
- Gates: `pnpm typecheck` (tsc), `pnpm lint` (biome check .), `pnpm test`.

---

### Task 1: map stall data, placeholder art, layer-file test

**Files:**
- Modify: `app/bazaar/stalls-manifest.ts` (add `map` to `STALL_SCENES` and `SIM_DIMS`; add `layerFiles` helper)
- Modify: `app/bazaar/scene-stall.tsx:26-43` (delete local `layerFiles`, import it)
- Modify: `app/bazaar/stall-catalog.ts` (add `MAP_DIALOG`, `STALLS.map`)
- Modify: `app/bazaar/decor.ts:94-104` (add `STALL_TUNE.map`)
- Modify: `app/bazaar/sounds.ts:147-213` (add `STALL_SFX.map`)
- Modify: `package.json` (append test file to the `tsx --test` segment)
- Create: `app/bazaar/stall-data.test.ts`
- Create: `public/images/bazaar/map/*.png` (11 placeholder files, via a throwaway script)

**Interfaces:**
- Consumes: existing `StallScene`, `StallLayer`, `StallSpec` types.
- Produces: `BazaarStallId` now includes `'map'`. `layerFiles(layer: StallLayer): string[]` exported from `./stalls-manifest`. Task 2 relies on `'map'` being a valid `BazaarStallId`.

- [ ] **Step 1: Write the test file**

Create `app/bazaar/stall-data.test.ts`:

```ts
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { STALLS } from './stall-catalog'
import { layerFiles, STALL_SCENES } from './stalls-manifest'

const bazaarImages = join(import.meta.dirname, '../../public/images/bazaar')

test('every stall layer file exists on disk', () => {
  for (const [id, scene] of Object.entries(STALL_SCENES)) {
    for (const layer of scene.layers) {
      for (const file of layerFiles(layer)) {
        const path = join(bazaarImages, id, file)
        assert.ok(existsSync(path), `missing ${id}/${file}`)
      }
    }
  }
})

test('map stall routes to the bazaar paper', () => {
  assert.equal(STALLS.map.href, '/papers/bazaar')
  assert.deepEqual(STALLS.map.links, [
    { label: 'read the bazaar paper', href: '/papers/bazaar' },
  ])
  const paper = join(import.meta.dirname, '../../repo/papers/bazaar/index.mdx')
  assert.ok(existsSync(paper), 'bazaar paper mdx missing')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsx --test app/bazaar/stall-data.test.ts`
Expected: FAIL. `layerFiles` is not exported yet, so the import throws. This is the red state.

- [ ] **Step 3: Move `layerFiles` into the manifest**

In `app/bazaar/stalls-manifest.ts`, add at the top:

```ts
import { uniq } from 'es-toolkit'
```

Add after the `StallScene` type (before `STALL_SCENES`):

```ts
export const layerFiles = (layer: StallLayer): string[] => {
  if (layer.role === 'plate') return [layer.file ?? 'plate-key.png']
  if (layer.role === 'effect') {
    const hover = Array.isArray(layer.hover)
      ? layer.hover
      : layer.hover
        ? [layer.hover]
        : []
    return uniq([...layer.frames.map((frame) => frame.file), ...hover])
  }
  if (layer.role === 'prop') {
    return uniq([layer.rest, ...(layer.hover ?? [])])
  }
  return uniq([
    ...layer.idle.map((frame) => frame.file),
    ...layer.hover.map((frame) => frame.file),
  ])
}
```

In `app/bazaar/scene-stall.tsx`, delete the local `layerFiles` const (lines 26-43) and the now-unused `uniq` import, and add `layerFiles` to the import from `./stalls-manifest`:

```ts
import {
  type BazaarStallId,
  type FxFrame,
  layerFiles,
  STALL_SCENES,
  type StallLayer,
} from './stalls-manifest'
```

- [ ] **Step 4: Add the `map` scene and dims**

In `app/bazaar/stalls-manifest.ts`, add to `STALL_SCENES` after `travel`:

```ts
map: {
  layers: [
    { id: 'plate', role: 'plate' },
    {
      id: 'fx-dot',
      role: 'effect',
      zorder: 1,
      frames: [
        { file: 'fx-dot-f1.png', ms: 600 },
        { file: 'fx-dot-f2.png', ms: 600 },
        { file: 'fx-dot-f3.png', ms: 600 },
      ],
    },
    {
      id: 'char',
      role: 'char',
      zorder: 2,
      idle: [
        { file: 'char-f1.png', ms: 1800 },
        { file: 'char-f2.png', ms: 200 },
        { file: 'char-f3.png', ms: 200 },
      ],
      hover: [
        { file: 'char-h1.png', ms: 150 },
        { file: 'char-h2.png', ms: 150 },
        { file: 'char-h3.png', ms: 150 },
        { file: 'char-h4.png', ms: 0 },
      ],
    },
  ],
  rect: { left: 518, top: 70, width: 500, height: 884 },
},
```

Add to `SIM_DIMS` after `travel`:

```ts
map: {
  artW: 500,
  artH: 884,
  dispW: 260,
  dispH: 460,
},
```

- [ ] **Step 5: Add the catalog entry**

In `app/bazaar/stall-catalog.ts`, add after `TRAVEL_DIALOG`:

```ts
const MAP_DIALOG = [
  'Mrh. You woke me.',
  'Lost? We are all lost here.',
  'Every stall is a door.',
  'u are here.',
].join('\n')
```

Add to `STALLS` after `papers`:

```ts
map: {
  label: 'map',
  href: '/papers/bazaar',
  tint: '#c86fd6',
  desc: MAP_DIALOG,
  links: [{ label: 'read the bazaar paper', href: '/papers/bazaar' }],
},
```

If `tsc` rejects `'/papers/bazaar'` against the `Route` type, cast it: `href: '/papers/bazaar' as Route`. The `[slug]` dynamic route makes the literal valid in typed-routes builds, so the cast is a fallback only.

- [ ] **Step 6: Add tune and sfx entries**

In `app/bazaar/decor.ts`, add to `STALL_TUNE` after `travel`:

```ts
map: { lift: 55 },
```

In `app/bazaar/sounds.ts`, add to `STALL_SFX` after `papers`:

```ts
map: () => {
  tone({ shape: 'sine', from: 90, to: 60, duration: 0.28, peak: 0.1 })
  tone({ shape: 'triangle', from: 520, duration: 0.06, peak: 0.03, at: 0.06 })
},
```

- [ ] **Step 7: Verify types are whole**

Run: `pnpm typecheck`
Expected: clean exit. If it reports another `Record<BazaarStallId, ...>` missing `map`, add the entry it names and re-run.

- [ ] **Step 8: Run the test to see the placeholder gap**

Run: `pnpm exec tsx --test app/bazaar/stall-data.test.ts`
Expected: FAIL with `missing map/plate-key.png` (and only map files). The eight existing stalls must pass; if one of them fails, stop and report, that is a pre-existing asset gap.

- [ ] **Step 9: Generate placeholder art**

Create `scripts/map-placeholders.mjs`:

```js
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const OUT = 'public/images/bazaar/map'
const W = 500
const H = 884
mkdirSync(OUT, { recursive: true })

const rect = (width, height, background) =>
  sharp({ create: { width, height, channels: 4, background } }).png().toBuffer()

const layer = async (file, blocks) => {
  const base = {
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }
  await sharp(base).composite(blocks).png().toFile(`${OUT}/${file}`)
}

const plate = await rect(W, H, { r: 28, g: 35, b: 51, alpha: 1 })
await sharp(plate).toFile(`${OUT}/plate-key.png`)

const fur = { r: 132, g: 138, b: 152, alpha: 1 }
const dark = { r: 96, g: 102, b: 118, alpha: 1 }
const grin = { r: 240, g: 240, b: 245, alpha: 1 }

const sleeping = async (file, shade) =>
  layer(file, [{ input: await rect(190, 110, shade), left: 155, top: 60 }])

await sleeping('char-f1.png', fur)
await sleeping('char-f2.png', dark)
await sleeping('char-f3.png', fur)

const waking = async (file, drop) =>
  layer(file, [
    { input: await rect(190, 110, fur), left: 155, top: 60 },
    { input: await rect(90, 24, grin), left: 205, top: 60 + drop },
  ])

await waking('char-h1.png', 40)
await waking('char-h2.png', 90)
await waking('char-h3.png', 160)
await waking('char-h4.png', 260)

const dot = async (file, alpha) =>
  layer(file, [{ input: await rect(20, 20, { r: 230, g: 57, b: 70, alpha } ), left: 240, top: 430 }])

await dot('fx-dot-f1.png', 0.45)
await dot('fx-dot-f2.png', 0.75)
await dot('fx-dot-f3.png', 1)
```

Run: `node scripts/map-placeholders.mjs`
Then: `ls public/images/bazaar/map` — expected 11 files.
Then delete the script: `rm scripts/map-placeholders.mjs`. It is throwaway; the PNGs are the artifact.

- [ ] **Step 10: Run the test to verify it passes**

Run: `pnpm exec tsx --test app/bazaar/stall-data.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 11: Register the test in the suite**

In `package.json`, the `test` script has a second segment: `tsx --test app/travel/radio-stations.test.ts`. Append the new file to that segment:

```
tsx --test app/travel/radio-stations.test.ts app/bazaar/stall-data.test.ts
```

Run: `pnpm test`
Expected: PASS, all segments.

- [ ] **Step 12: Commit**

```bash
git add app/bazaar/stalls-manifest.ts app/bazaar/scene-stall.tsx app/bazaar/stall-catalog.ts app/bazaar/decor.ts app/bazaar/sounds.ts app/bazaar/stall-data.test.ts package.json public/images/bazaar/map
git commit -m "feat(bazaar): map stall data, placeholder art, layer file test"
```

---

### Task 2: floors data module with map slots

**Files:**
- Create: `app/bazaar/floors.ts`
- Modify: `app/bazaar/bazaar-view.tsx:109-128` (delete local floor types and consts, import them)
- Modify: `app/bazaar/stall-data.test.ts` (add coverage tests)

**Interfaces:**
- Consumes: `BazaarStallId` from `./stalls-manifest` (includes `'map'` after Task 1).
- Produces: `DESKTOP_FLOORS: DesktopFloor[]`, `MOBILE_FLOORS: MobileFloor[]`, and both types, exported from `./floors`. `MobileFloor.stalls` is `[BazaarStallId] | [BazaarStallId, BazaarStallId]`.

- [ ] **Step 1: Add the failing coverage tests**

Append to `app/bazaar/stall-data.test.ts`:

```ts
import { DESKTOP_FLOORS, MOBILE_FLOORS } from './floors'
```

(place the import with the others at the top), and at the bottom:

```ts
const allStallIds = Object.keys(STALL_SCENES).sort()

test('desktop floors cover every stall exactly once', () => {
  const ids = DESKTOP_FLOORS.flatMap((floor) => floor.stalls)
  assert.deepEqual([...ids].sort(), allStallIds)
})

test('mobile floors cover every stall exactly once', () => {
  const ids = MOBILE_FLOORS.flatMap((floor) => floor.stalls)
  assert.deepEqual([...ids].sort(), allStallIds)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsx --test app/bazaar/stall-data.test.ts`
Expected: FAIL. `./floors` does not exist.

- [ ] **Step 3: Create the floors module**

Create `app/bazaar/floors.ts` with the floor data moved from `bazaar-view.tsx`, plus the map slots:

```ts
import type { BazaarStallId } from './stalls-manifest'

export type DesktopFloor = { stalls: BazaarStallId[]; stairsRight: boolean }
export type MobileFloor = {
  stalls: [BazaarStallId] | [BazaarStallId, BazaarStallId]
  smRight: boolean
}

/* S sides: R, L, R (spec rule 5) */
export const DESKTOP_FLOORS: DesktopFloor[] = [
  { stalls: ['uses', 'papers', 'map'], stairsRight: true },
  { stalls: ['manual', 'console', 'talks'], stairsRight: false },
  { stalls: ['w98', 'games', 'travel'], stairsRight: true },
]

/* SM sides: L, R, L, R, L (spec rule 5); solo map floor sits at the entrance */
export const MOBILE_FLOORS: MobileFloor[] = [
  { stalls: ['map'], smRight: false },
  { stalls: ['uses', 'papers'], smRight: true },
  { stalls: ['manual', 'talks'], smRight: false },
  { stalls: ['console', 'w98'], smRight: true },
  { stalls: ['games', 'travel'], smRight: false },
]
```

Desktop: `map` sits last on floor 0, the stairs end (`stairsRight: true` renders the band first, so the last array item is nearest the stairs). Mobile: the solo floor takes `smRight: false`, which keeps the existing four pairs on their current sides (R, L, R, L) while the sequence alternates from the top.

- [ ] **Step 4: Point the view at the module**

In `app/bazaar/bazaar-view.tsx`:

1. Delete lines 109-128: the `DesktopFloor` type, `MobileFloor` type, both `/* S sides ... */` comments, `DESKTOP_FLOORS`, and `MOBILE_FLOORS`.
2. Add the import (keep `type` specifiers, Biome enforces them):

```ts
import {
  DESKTOP_FLOORS,
  type DesktopFloor,
  MOBILE_FLOORS,
  type MobileFloor,
} from './floors'
```

`MarketFloor` and `MobileMarketFloor` keep their `spec: DesktopFloor` / `spec: MobileFloor` props unchanged. Nothing else in the file changes.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec tsx --test app/bazaar/stall-data.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Verify types and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both clean. `MobileMarketFloor` reads `spec.stalls.map(...)` and `Math.min(...spec.stalls.map(...))`, both fine on a 1-tuple.

- [ ] **Step 7: Commit**

```bash
git add app/bazaar/floors.ts app/bazaar/bazaar-view.tsx app/bazaar/stall-data.test.ts
git commit -m "feat(bazaar): floors module, map stall on both trees"
```

---

### Task 3: full gates and rendered smoke check

No file changes. No commit. This task proves the stall renders in both trees.

- [ ] **Step 1: Run every gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all clean. Paste the tail of the output into the task report.

- [ ] **Step 2: Boot the dev server**

Run: `pnpm dev` in the background. Wait for the ready line (predev scripts run first; allow ~30s).

- [ ] **Step 3: Assert the stall is in the SSR payload**

Run: `curl -s http://localhost:3000/bazaar | grep -o 'data-stall="map"' | wc -l`
Expected: `2` (desktop tree + mobile tree).

Run: `curl -s http://localhost:3000/bazaar | grep -o 'images/bazaar/map/plate-key.png' | wc -l`
Expected: `2` or more. Use `grep -o | wc -l`, never `grep -c`: the payload is one minified line.

- [ ] **Step 4: Assert the paper route answers**

Run: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/papers/bazaar`
Expected: `200`.

- [ ] **Step 5: Stop the dev server**

Kill the background dev process. Report the four command outputs verbatim.

---

### Task 4: art order brief for the codex campaign

**Files:**
- Create: `docs/bazaar/orders-map-stall.md`

**Interfaces:**
- Consumes: the shipped placeholder file names from Task 1 (the campaign must deliver identical names).
- Produces: a self-contained order document for a future codex imagegen session.

- [ ] **Step 1: Write the brief**

Create `docs/bazaar/orders-map-stall.md`:

```markdown
# order: map stall (ninth stall)

Target: 11 files under `public/images/bazaar/map/`, replacing the
placeholder rectangles shipped 2026-08-05. File names are a contract with
`app/bazaar/stalls-manifest.ts`. After delivery, update `SIM_DIMS.map`
(artW/artH) and `STALL_SCENES.map.rect` to the real crop, then run
`pnpm test` (the layer-file test guards the names).

## concept

A narrow freestanding directory board at a market entrance. Backlit
panel, pixel map of a market. THE MAP IS ILLUSTRATIVE: any plausible
pixel market map. No fidelity to the real bazaar layout. Board label:
"U ARE HERE". A raccoon sleeps on the top ledge, Cheshire Cat energy:
the grin stays faintly visible through sleep, and the wake starts with
the grin.

## structural inventory (verbose, per doc 02)

1. board panel: backlit, rounded pixel frame, occupies the middle band
2. two legs: simple posts to the floor
3. top ledge: deep enough for a curled raccoon
4. raccoon: curled ball, striped tail hanging over the panel edge
5. map illustration: streets + stall blocks, decorative
6. label strip: "U ARE HERE" in pixel caps
7. red dot on the map: rendered as a SEPARATE fx layer, not in the plate

## laws in force

- camera: doc 03 axonometric doctrine, front-facing board like the
  manual/talks fronts
- palette: midnight base, orchid accent #c86fd6, flatness laws doc 04
- scale (display px currency, doc 10): board total ~460 display tall;
  curled raccoon ~95 display; calibration: seated Ed 170, w98 robot 294
- target display box: 260 x 460 su (narrowest stall; travel is 341)
- keying: doc 10 official keyer, NO --despill (orchid is a purple; the
  w98 violet execution warning applies), binary alpha, hostile-color
  composite audit
- r17 rest assert: plate + char-f1 + fx-dot-f1 composite must byte-match
  the master key render
- r18 pose doctrine: chain minimal diffusion edits on the ISOLATED
  raccoon, one change per step

## deliverables

- `plate-key.png` — booth + board + map + label. NO raccoon. NO red dot.
- `char-f1.png` — curled sleep, faint grin (rest anchor)
- `char-f2.png` — breath rise (minimal diff from f1)
- `char-f3.png` — tail-tip flick (minimal diff from f1)
- `char-h1.png` — grin widens, eyes still shut
- `char-h2.png` — eyes snap open, too wide
- `char-h3.png` — body unfurls, hangs head-first over the board edge
- `char-h4.png` — paw pins the red dot, tail curled into a question mark
- `fx-dot-f1.png` / `fx-dot-f2.png` / `fx-dot-f3.png` — dot pulse,
  dim -> mid -> bright glow

All files pre-cropped to one shared content rect inside the 1536x1024
master canvas. Report the rect with the delivery.
```

- [ ] **Step 2: Commit**

```bash
git add docs/bazaar/orders-map-stall.md
git commit -m "docs(bazaar): map stall art order"
```

---

## After the plan (user steps, not tasks)

1. Run the codex art campaign from the brief. Swap placeholders, update `SIM_DIMS.map` + `rect`, re-run `pnpm test`.
2. Open the decor editor on `/bazaar` and re-tune floor 0 spacing plus `STALL_TUNE.map.lift` against the real art.
