# 17 — the scavenger campaign (2026-08-06)

The eleventh stall, built in one day: nine master rounds, a character
redefinition, an animation system, and a live tuning session. It
produced doctrine that notes 02, 04, and 08 do not cover. Everything
here is measured against that one campaign; treat it as the second
generation of the pipeline.

## The no-attachment ruling (hyperfitting)

Round 6 flew four probes with four attached gospels (angle law, camera
gospel, two correctives). All four converged near-identical: the
attachment chain overfits and variance dies. Standing law since round
7: scene masters attach ZERO images. The supervisor reads the gospels
and transcribes them into the order as prose: the paint manner as
text, the camera construction as text ("front rectangle + ONE thin
top band about 1/5 deep"), the full numbered inventory, and every
recorded failure with its measured numbers ("you drew 1333x945,
aspect 1.41; the law is 1.12"). Identity landed from prose alone,
round after round. The old instrument hierarchy survives only for
pose sheets: an isolated sprite still needs its anchor attached.

## Flatness instruments (the round-9 war)

Four text-side instruments, one per probe, same layout and clamp:

1. LEAN order (the s3 lesson): flatter than baseline, lowest raw
   color count.
2. PER-OBJECT BUDGET (max 4 hexes + 6 flat shapes per object, from
   the r19 8-hex prop cap): weakest this round.
3. UPSCALED-SPRITE GRID: "you are rendering a 384x256 sprite enlarged
   exactly 4x with nearest-neighbor; if a detail cannot be drawn on
   that grid, it does not exist." THE WINNER by eye: big flat boards,
   thick outlines, chunky everything.
4. SURFACE DICTATION (a chunk budget table per surface): nearly as
   flat, zero text fouls.

Raw exact-color counts never track macro flatness (all four measured
120k-160k). The eye rules; the counts only catch regressions.

## Palettes per sprite, ladders per frame

The shadow-to-light march is PER-FRAME PALETTES. The supervisor
computes a five-step lightness ladder for every material (greens,
darks, khaki, bone) and each sheet cell lists its own complete hex
set. Flat lighting is law: "no directional light, no side light, no
rim light; the march happens ONLY through the palette swap per cell."
Enforce it twice: in the order, and as deterministic post multipliers
(x0.55 idle to x1.00 at the counter) with preserved features (eyes,
ember) excluded from the multiply.

Related result from round 8: DESCRIPTIVE reduction works. "Build the
palette yourself: one midnight-navy family of three, one bone pair,
one wood pair, one gold, plus these fixed scoped accents" matched or
beat explicit hex clamps on law compliance. Families + scoped accents
transfer intent better than long hex lists.

## The character pipeline

Keying black-on-black is impossible. The settled architecture:
generate the CHARACTER ON CHROMA GREEN and paint the stall black
where he sits. The plate hole is one rectangle fill; the sprite keys
perfectly; the cloak olives are chosen keyer-safe by construction
(g <= r+24 passes both the chroma predicate and the de-green clamp).

Design iterates as ONE-CHANGE loops on a standalone character master:
translate the concept art via prose, show the render, apply single
rulings ("no weapon", "the cape is dark green", "flatten, fewer
colors"), regenerate. The cheapest loop in the whole campaign: one
gen per verdict. A wardrobe redefinition is a total reset: regenerate
the master, then every sheet chains from its keyed rest.

## Fixed-canvas animation

The user's doctrine, now law: character frames live in ONE viewport,
full stall height and about 2.2x the doorway width, at a fixed plate
offset. The approach effect is DRAWN, never post-scaled into a
clipping box: every cell declares its exact figure height and head
line inside that fixed window.

The numbers are negotiated ON the page:

1. A pink proposal div renders the candidate canvas over the live
   stall (border-only so the art shows).
2. A 20-line lettered grid (A at the canopy, T at the floor, 48.5 px
   per step) turns size talk into "the head starts at H and ends
   between E and F".
3. The user tunes the baked frames with the in-page tool and returns
   offsets as JSON.

Scale rulers all lie. Eye-span rulers break because sheets draw eyes
oversized; hood-span rulers break because the pipe hand and smoke sit
at eye height. The settled instruments: the lettered grid for rulings
and a three-scale visual comparison for the base factor. Never trust
a single-feature ruler on diffusion output.

## Sprite assembly lessons

- Slicing: cluster by column occupancy with ROW-COUNT noise filters.
  Diffusion "flat black" carries faint noise that inflates naive
  bboxes to the whole canvas. Add min-size filters: smoke fragments
  read as clusters.
- Anchoring: bottom-anchor for planted figures; head-line anchor when
  the user rules head positions.
- Preserved features die by threshold: the left eye dimmed three
  times under "preserve bright warm pixels" predicates. The
  deterministic fix is a pristine-pixel paste of the feature window
  over the processed sprite.
- Skin leaks separate from khaki on the red-green gap (r > g+22),
  not on warmth: khaki is warm too.
- In-place transforms compose: mirror = bbox flip + repaste at the
  same bbox; shifts = crop-paste. EVERY char move drags three
  dependents in the same change: the CSS eyes box, the smoke anchor,
  and the clip polygons. Ship them together or the stall drifts
  apart.

## Runtime: fewer assets, more CSS

- The counter occluder asset is dead. Depth is clip-path: char frames
  clip at the counter band line, so legs read behind the counter and
  the geometry survives any retuning. scene-stall stamps `data-layer`
  and `data-frame` on every img, so CSS can target one stall, one
  layer, or ONE FRAME.
- The hold frame's palm lies ON the counter through a user-traced
  18-point finger polygon: the clip hugs each finger, no notch box.
  Per-frame clips make one sprite carry two depths.
- The idle eyes are HTML+CSS, zero assets: a black mask over the
  baked slits plus two yellow dots, one element, rotate(180deg)
  mirrors the glance direction. Hidden on hover and focus, frozen
  under reduced motion.
- The idle is a single static dark sprite (w98 precedent) + a smoke
  fx loop + the CSS eyes. Effects carry hover-blank frames (the
  engine's effect.hover string): he stops smoking the moment he
  wakes.

## In-page tuning harnesses

When the eye must rule on numbers, build the ruler INTO the page and
let the user export the verdict as data:

- A dev HUD tool spread all six frames horizontally in place over the
  market, nudged per-frame offsets, played the real cycle in situ,
  and round-tripped `{"1":20,...,"6":120}` JSON via clipboard.
- The same tool grew a CLIP mode (draggable polygon points over the
  live stall) and a PLACE mode (drag and resize the eyes box, drag
  the smoke sprite; export percentages and art px).
- A standalone 400% zoom clip editor (one HTML file, file://, no
  server) for finger-precision polygon work; output is the CSS
  `polygon(...)` string itself.
- Hand-polish round-trips the same way in reverse: hand the keyed
  plate OUT as a file, the polished background comes back through
  Downloads, and every dependent gets re-verified against the new art
  before shipping.

Editors are disposable; the numbers are the deliverable. The tuner
was deleted the moment the numbers were baked.

## Where the artifacts live

- `orders/scavenger/master.md`: the final master order (text-only,
  fixed-canvas, per-cell palettes).
- `orders-scavenger-stall.md`: the brief with every ruling in
  chronological force.
- `tmp/bazaar-scavenger/`: the campaign dir (orders, jobs, refs
  including the user's polished background, galleries r1-r9 + anim).
  DISPOSABLE location: archive before deleting.
- `public/images/bazaar/scavenger/`: the shipped set (plate,
  char-idle, char-h1..h6, fx-smoke x3 + blank). Ten files total; the
  first stall whose depth and eyes ship as CSS.
- `tmp/bazaar-scavenger/clip-editor.html`: the standalone 400% clip
  editor, kept for future stalls.
