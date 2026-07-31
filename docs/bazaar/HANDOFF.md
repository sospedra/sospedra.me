# bazaar — AI handoff

Single entry point for any AI picking up this work. Current as of
2026-08-01, branch codex/midnight-io-design-system. History and
reasoning live in the numbered notes (00-INDEX.md); THIS file is the
operating state: what is true, what is law, what is open.

## Current state

- `/bazaar4` is the shipped market: r17 layered animated stalls, r15
  architecture, r19 decorations, baked layout. The console stall
  renders STATIC (STATIC_STALLS map in bazaar4-view.tsx, asset
  `public/images/bazaar4/console/static-master.png`, the r20 war
  winner). Its r17 layer files exist but are dormant.
- `/bazaar5` is the rebuild on the validated layout system: street
  level + stalls + stairs ONLY (no props, no glows, no signs). It is
  mid hand-tuning by the user with the in-page editor. Expect layout
  JSONs to arrive; decode them as INTENT and bake responsively.
- The generation campaign is CLOSED. tmp/bazaar3 is deleted. All
  fundamentals are archived under docs/bazaar/ (notes, takeover/,
  doctrine/, orders/, assets/).
- A blog post about the whole campaign is planned; the 16 notes are
  its raw material. Pen-and-paper sketch photos are pending from the
  user; file them into assets/ and the manifest when they appear.

## Standing laws (violating any of these is a regression)

1. HAND-POLISH LAW: files in `public/images/bazaar4/**` are the source
   of truth and may be hand-edited by the user in place. NO script may
   overwrite them. Exporters skip existing files; `--force` only on
   the user's explicit word. Write new files under new names.
2. THE EYE IS THE GATE: the user rules by looking. Measurements inform
   the conversation; they never overrule the ruling. Present numbers,
   accept verdicts.
3. SCREENS ARE WHITE-GREY: every screen, static, and receiver band is
   pale white-grey (#9b9a98/#c9c8c5/#f2f1ee family). Never cyan, never
   blue. Teal exists only as tiny LED dots.
4. THE SLAB GOSPEL: platform top faces are symmetric trapezoids,
   interior corners 130/50/50/130, side slope EXACTLY 68 px inward per
   81 px down. Front faces are 90-degree rectangles. Floor props copy
   the construction; tall furniture is frontal two-surface (front
   rectangle + thin top band, never a side face). Verticals dead
   vertical; nothing tilts.
5. FLATNESS: authored 16-bit pixel look. Limited scoped palettes
   (~15 hexes for the console master), blocks >= 4x4 px, no stipple,
   no gradients, three tones per material, near-black outlines.
6. STREET IS SEALED: the street level is its own svh-based component
   with its own variables (bazaar4's scene context). Never port it
   onto the market layout system; host it in a context wrapper (see
   bazaar5-view.tsx streetHost).
7. STAIRS DEFINE THE WORLD: floor height = stairs height, aspect never
   modified. S = 324x597 su. SM knobs are measured from the art:
   ar 0.464, deck split 0.497 (`arch/sm.png`).
8. Reviews of orders/plans are read-only; report findings, edit only
   on approval. Fleet rounds always stop for the user's gate.

## If you generate images again (the pipeline in one block)

Codex CLI (`codex exec`, image_gen gpt-image class), detached jobs
(nohup + status files), prompt via stdin (`- < order.md`), ONE
working dir per concurrent job (temp collisions produce byte-identical
outputs; verify hashes), sizes 1536x1024 / 1024x1536 only. Canvas
orientation composes: portrait canvas is the only reliable
tall-narrow instrument. Instrument hierarchy, strongest first:
corrective attachment of the model's own rejected render with its
measured numbers -> layout-lock repaint ("layout is CLOSED, paint
only") -> drawn plans with vertex/checkpoint coordinates -> camera and
style gospels -> verbal geometry (weakest; always include, never
trust). Post: chroma key (g>96, g>r+48, g>b+48), de-green clamp
(g <= max(r,b)+24), bbox crop-back, verify on hostile background.
Measure every landing: dims, art bbox, aspect, slab slope, display-px
projection vs the family (approved seated Ed = 170 display px = a
standing games kid). Full doctrine: notes 02-04, orders/ for 313 real
examples, doctrine/ for the animation architecture.

## The layout system (bazaar5)

One knob: `--su-cap: 0.9` px/su at cap; `--su = min(cap, (100vw +
shift) * cap / 1690)`. Regime A (>=1690px): 1400px container, n+1
equal gaps, stairs outside with one more equal gap. Regime B
(700-1690): full bleed, stairs flush, soft crop ramp `--shift =
clamp(0, (1200px - 100vw) * 0.132, 66px)` feeding back into su.
Mobile (<700): one SM spans two stories, shared stall width makes all
four gaps equal, SM slides out by ramp + demand, capped at half.
Sides alternate by DOM order (S/SM last = right); sprites mirror with
scaleX(-1). Spec, derivations, retune math: app/bazaar4/
LAYOUT_HANDOFF.md and the rescued proto
(docs/bazaar/assets/rescue/layout-proto/bz4-layout-proto.html).
Raising --su-cap: keep worst floor (1156 su) * cap under 1400 and
re-derive VSTAR + both ramp constants.

## The editor (bazaar5 version)

app/bazaar5/layout-editor.tsx. Pick = smallest [data-edit-id] under
pointer. Drag = move. EIGHT handles: corners scale aspect-locked,
edges scale one axis, sensitivity damped (SCALE_DAMP 0.4 = full
element-width drag changes scale 40%). Origin bottom-center. Panel:
z/bright/opacity nudges, anchor picking, delete, reset, copy. Export
JSON `{su, items:[{id, floor, x, y, w, h, scale, scaleY, z, bright,
opacity, anchor?, ax?, ay?}], removed}` in sim units, band-local
against [data-stage]. Exports are INTENT: translate into responsive
rules (tune factors, anchors), never paste absolute coordinates.

## Asset map

- `public/images/bazaar4/<stall>/` — r17 layers per stall: plate-key,
  fx-*, char-f1..f3 (idle), char-h1..h4 (hover). Console adds
  static-master.png (the shipped static). Runtime mounts all frames
  once and flips opacity (scene-stall.tsx); rest composite is
  byte-identical to the approved static by construction.
- `public/images/bazaar4/arch/` — stairs.png (desktop S,
  hand-polished), sm.png (mobile SM), wf-tile + wf-min-a2/b2 (walls),
  beam-h-tile, beam pairs.
- `public/images/bazaar4/street/` — the sealed street kit (bg, floor
  1920 seamless, buildings, bus, door frames, neon pair, tower).
- `public/images/bazaar4/deco/` — 92 props + sign family + glow-less
  lamps. Placement lives in app/bazaar4/decor-manifest.ts (baked
  editor sessions; absolute coords, die in any relayout — the known
  migration debt).
- `docs/bazaar/` — notes 00-16, assets/ (+ASSETS.md manifest),
  takeover/ (the bible + gospels), doctrine/, orders/.
- Sounds: app/bazaar/sounds.ts, all synthesized except
  /sounds/door.webm.

## Open threads, priority order

1. bazaar5 pixel-perfect pass: user drives the editor; you bake the
   JSONs. Then decide bazaar5 vs bazaar4 promotion.
2. Decor migration: bazaar4's absolute-coordinate props need
   re-anchoring (per-stall containers) before they can ride the new
   layout. The hard 20% of the port.
3. Console stall animation: dormant r17 layers do not match the new
   static master. If animation returns, rebuild layers FROM
   static-master.png (plate extraction + Ed pose chains per
   doctrine/).
4. Sketch photos -> assets/ + manifest + human-craft note.
5. Console boot chime swap (serve-boot-audio memory), Vercel node-24
   setting, BotFather token rotation (nextjs-16 memory) — adjacent
   debts, not bazaar-blocking.
6. Blog writing itself: start from 09-lessons.md's candidate
   structure; images are curated in assets/.

## Memory

The cross-session ledger is
`~/.claude/.../memory/bazaar3-master-pipeline.md`. Keep it current
when laws change or threads close; it is how future sessions find
this file.
