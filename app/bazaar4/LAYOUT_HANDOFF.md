# bazaar4 layout system — session handoff

Date: 2026-07-31. Branch: `codex/midnight-io-design-system`. Production code
is untouched. Everything this session produced lives in scratch files. The
deliverable is a validated layout system in a standalone prototype, ready to
port into `app/bazaar4/bazaar4.module.css`.

## What happened

1. Audited the current bazaar4 layout against the user's spec. It fails the
   spec structurally.
2. Specified a complete responsive layout system with the user over several
   iterations.
3. Built the system as a standalone prototype with live gap-measurement
   rulers: `public/bz4-layout-proto.html`.
4. Verified every regime with headless Chrome screenshots and CDP geometry
   measurement at 500–1900px widths. All gap equalities hold.

## The spec (user's notation)

```
_  = gap, dynamic size, ALL EQUAL within a floor
x  = gap, undefined leftover
|  = screen edges
sc/ec = start/end of a 1400px container
a  = stall        S = stairs (desktop)      SM = stairs mobile

>=1400px      |xS_sc_a_a_a_ecx|
700..1400px   |S_a_a_a_|
<700px        |SM_a_|     one floor = ONE SM + TWO stalls,
              |SM_a_|     one stall per story, stacked
```

Rules, all user-ratified:

1. `a` never overlaps another `a` or S/SM. Gaps are computed, so this holds
   by construction.
2. S/SM may slide offscreen up to HALF their own width when needed.
   Desktop: progressive hide starts at 1200px, reaches exactly half at the
   700px handoff. Mobile: SM is ~47–50% hidden by 570px.
3. Floor height = S/SM height. Aspect ratio of the stairs is never
   modified. Composition freezes at the cap; the page growing past it only
   grows the `x` leftovers.
4. Stall count per floor is variable (`a_a` and `a_a_a_a_a_a` are both
   valid). The gap formula generalizes: n+1 equal gaps for n stalls.
5. S/SM alternates sides per floor. Desktop R, L, R; mobile R, L, R, L
   (matches production's current rhythm). Patterns mirror; rules unchanged.
6. Mobile: max floor height 100vh. ONE SM spans both stories (that is why
   SM is a distinct asset from S). All four gaps of a mobile floor are
   equal, across BOTH stories, not just within one row.

## The model

One scale constant derives everything. Full derivations live in the header
comment of `public/bz4-layout-proto.html` (lines 7–95).

- `--su-cap: 0.9` — px per sim unit at the cap. THE knob.
- `--su = min(su-cap, (100vw + shift) * su-cap / VSTAR)`.
- Stall boxes: sim dims from `app/bazaar4/stalls-manifest.ts` (`SIM_DIMS`
  dispW/dispH). S = 324×597 su (matches `arch/stairs.png`, 528×974,
  aspect 0.542).
- Floor height = 597·su. Freezes at the cap (rule 3).
- Gaps per floor = leftover / (n+1). Never hand-placed.
- VSTAR = 1690px. Derivation: the 1400 container + one gap + HALF of S
  must fit (rule 2). Binding floor is the 2-stall one:
  `g1 = (1400 − 1077·0.9)/3 = 143.6; group = 291.6 + 143.6 + 1400 = 1835.2;
  VSTAR = 1835.2 − 145.8 ≈ 1690`. Consequence: the literal 1400px container
  only materializes at vw ≥ 1690. Between 1400 and 1690 the full-bleed
  regime keeps running. A hard switch at 1400 is impossible: S would be
  100% offscreen, violating rule 2.

### Regime A — vw ≥ 1690 (`@media (min-width: 1690px)`)

Stalls live in a 1400px container with n+1 equal gaps inside
(`--gc = (1400px − su·Σw)/(n+1)`), S outside `sc` separated by one more
`--gc`. The group (S + gap + container) centers; when the window tightens,
the container edge pins first and S crops on its own side, clamped by the
VSTAR boundary to ≤ half:

- left-stairs floor: `margin-left: min((100vw−group)/2, 100vw−group)`
- right-stairs floor: `margin-left: max((100vw−group)/2, 0px)`

### Regime B — 700..1690px (full bleed)

Flex row. S flush to its screen edge, `--g = (100vw + shift − S − su·Σw)/(n+1)`,
trailing gap included via padding on the stall side. Soft crop:
`--shift: clamp(0px, (1200px − 100vw) * 0.132, 66px)`, applied as a negative
margin on S's own side. The shift feeds back into `--su`, so reclaimed width
grows STALLS, not gaps. Constants are the fixpoint of
`shift = 162·su(700+shift)`; retune 0.132 and 66px if `--su-cap` or VSTAR
change (derivation in the proto header).

### Mobile — <700px (`@media (max-width: 699px)`)

One `.mfloor` = one SM (full floor height, on the alternating side) + a
`.stack` of two `.storyRow`s. Floor height `--mfloor-h = min(--sm-h, 100svh)`,
`--sm-h: 75svh` (the real SM asset targets 70–80vh).

Equality across both stories is structural, not tuned:

- `--a-cap = mfloor-h · 0.48 · --armin` — armin = min aspect of the floor's
  stall pair (inline style per `.mfloor`). The width the TALLEST stall can
  spend without bursting its story.
- `--slot-target = min(--slot-min, --a-cap)`, `--slot-min: 62vw`.
- `--shift-ramp = (700px − 100vw) · 0.8` — SM slides out from the handoff,
  ~47–50% by 570px.
- `--shift-demand = slot-target − natural slot`.
- `--shift-m = clamp(0, max(ramp, demand), sm-w/2)`.
- Stall width = `min(--slot, --a-cap)`, SHARED by both stories → identical
  widths → all four gaps equal. Gap floor knob `--mg: 4vw`; when a-cap
  binds, gaps grow past --mg but stay equal.
- `--sm-split` — the story divider fraction. Grid rows:
  `calc(var(--sm-split, 0.5) * 100%) 1fr`. Calibrates the layout to the SM
  art's measured platform line ("art wins, layout bends").

### Side alternation mechanics

DOM order carries the side: S/SM LAST in the floor = stairs right. No flex
reversal, stall order stays honest. `.floor.r` / `.mfloor.r` flip padding
and the crop-margin side. Sprites mirror with `scaleX(-1)` so stair
platforms/exits always face the stalls (`.floor:not(.r) .s` and
`.mfloor.r .sm` — the base art faces right-placement).

## Files

### The prototype (the deliverable)

- `public/bz4-layout-proto.html` — self-contained, served at
  `http://localhost:3000/bz4-layout-proto.html`. Three parts:
  - Header comment (lines 7–95): the full doctrine, every formula, every
    derivation, retune instructions. Read this first.
  - CSS (lines 96–280): the entire layout system. This is what gets ported.
  - JS (lines ~330–470): measurement harness only, NOT part of the system.
    Draws dashed rulers between boxes: green = all `_` gaps on that floor
    equal within 1.5px (mobile pools both stories), red = broken,
    grey = `x` leftovers, amber = S/SM crop with %. HUD shows regime, su,
    floor height. This harness is how every claim above was verified.
- Floor data in the proto markup: desktop floors carry `--sum` (Σ stall su
  widths) and `--n`; stalls carry `--w`/`--h`; mobile floors carry
  `--armin`; mobile stalls carry `--ar`.

### SM sprite (layout-relevant state only)

- `public/bz4-sm-b2.png` — USER-GATED ("fantastic"). r24 probe B,
  handrail erased in post, despilled key. Trim 705×1518, ar 0.464,
  platform line at 49.7%. Wired in the proto: `--sm-ar: 0.464;
  --sm-split: 0.497`.
- `public/bz4-sm-b.png`, `public/bz4-sm-c.png` — superseded r23
  candidates, kept for reference only.
- `public/bz4-sm-gate/` — side-by-side gate pages per round; r24 current.
- Contract for any future SM regen: measure trim aspect → `--sm-ar`,
  measure the platform row fraction → `--sm-split`. Desktop S keeps using
  `public/images/bazaar4/arch/stairs.png` unchanged.

### Production files audited (unchanged, the port target)

- `app/bazaar4/bazaar4-view.tsx` — view. `DESKTOP_MARKETS`/`MOBILE_MARKETS`
  (lines ~1002–1013) define floors and `stairsFirst` sides. `MarketFloor`,
  `FloorStage`, `Stairs` are the components the port touches.
- `app/bazaar4/bazaar4.module.css` — the CSS to replace. Current `--su` law
  at lines 26–30 (1440px-based, wrong vs spec), hand-shift stage centering
  at lines 1546–1552, mobile grids `.mGridL/.mGridR` at lines 829+.
- `app/bazaar4/decor-manifest.ts` — `STAGE` holds BAKED absolute stall
  coordinates (e.g. floor 2: manual x=178.5, console x=656.9, talks x=1130).
  These die in the port; see open problems.
- `app/bazaar4/stalls-manifest.ts` — `SIM_DIMS` + `STALL_SCENES.rect`; the
  proto's stall boxes come from here and stay the source of truth.

## Audit findings that motivated the rework (all verified by measurement)

1. No 1400px container exists anywhere. Three disagreeing widths: su cap
   from 1440−120 (`bazaar4.module.css:26`), vignette `--mkt-w` from
   1248px+10svh (line 7), `.mktFrame` 1248px (line 733).
2. Gaps are baked and unequal everywhere. At 1680w: floor 2 = 130/89/68px;
   floor 3 = 89/12.7/2.2px (games nearly touches travel; travel touches the
   stairs); floor 1 = 138/40px.
3. Stairs sit flush against the stall band (0–2px), spec wants one equal gap.
4. The 700–1400 regime doesn't exist: fixed 68px margins, floors shrink to a
   ~200–320px filmstrip because floor height rides width-driven su.
5. Old `stairs-mobile.png` rendered squashed 3.9×: Tailwind preflight
   `img { max-width: 100% }` clamps it to the 24vw lane while CSS pins
   `height: 97svh` (`bazaar4.module.css:937`). Also the lane/sprite contract
   was broken by design (asset 684×1536 vs 24vw lane).
6. Stale bits: `decor-manifest.ts:159` comment says floor 3 stairs left,
   code renders right; dead CSS `.mktRow` (the view still sets `--row-gap`
   for it), `.walkStrip`, `.decorBand`, `.mktGroundShade`, `--stairs-w` +
   its 1024px media query; `.mktFrame` is a no-op under 700px.

## Verified numbers (from the proto, macOS overlay scrollbars)

- 1900w regime A: floor 1 gaps 143.6×4, floor 2 gaps 96.9×4, x = 32.4.
- 1600w regime B: floor 1 gaps 135.4, floor 2 gaps 91.3×4. No container by
  design.
- 1000w regime B + ramp: crop 26.4px (15%), gaps 86.9 / 58.6 per floor.
- 700w: crop 66px = exactly 50% of S. Gaps 64.8 / 43.7 / 40.6 per floor.
- 650w mobile: all four gaps 26px per floor (= 4vw); capped floors grow
  gaps equally (45.2). SM crop demand-driven, ≤ half.
- 570w mobile: SM ~44–47% hidden (ramp), gaps still equal.

## Open problems for the port

1. Decor migration. `STAGE_RESOLVED` positions everything in absolute band
   coordinates. Under distributed gaps, stall x-positions become
   layout-driven. `anchored()` items (relative to a stall) survive if the
   anchor resolution switches to per-stall containers. Absolute-x `deco`/
   `glow`/`sign` items need re-anchoring (nearest stall or floor-relative).
   This is the hard 20% of the port.
2. Crop uniformity (mobile): `--shift-m`'s demand term differs per floor
   (175px vs 43px at 650w). Legal, but if the user wants uniform stairwell
   recession per viewport, globalize demand to the max across floors.
3. `--su-cap: 0.9` is provisional. Raising it: Σw·su-cap must stay under
   1400 (worst floor 1156 su → cap ~1.15), and VSTAR + both ramp constants
   must be re-derived (formulas in the proto header).
4. Floor 1 has two stalls; the spec diagram shows three. The n+1 formula
   covers it (user confirmed a-count is variable). Gaps there are just
   bigger; user may want a `--slot-min`-style cap later.
5. Scrollbar: gap formulas use 100vw. Exact on overlay-scrollbar platforms;
   ~15px skew on Windows-style scrollbars. Consider `scrollbar-gutter` or
   container queries at port time.
6. The B-vs-C SM gate is pending user ruling; the port shouldn't block on
   it (both wire identically via the two knobs).
7. Scratch cleanup before ship: everything `public/bz4-*` is disposable and
   currently deployable (public/ is served). Delete or move before merge.

## How to verify any change

Open the proto and resize 500→1900. Every floor must show green rulers at
every width; amber crop labels must never exceed 50%. Headless check:
`chrome --headless=new --hide-scrollbars --window-size=W,H
--screenshot=/tmp/x.png http://localhost:3000/bz4-layout-proto.html`.
The dev server runs on :3000.
