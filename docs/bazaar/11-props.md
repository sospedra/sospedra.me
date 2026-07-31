# 11 — the props campaign (r19 decorations)

92 placeable sprites that turn architecture into a lived-in market:
stall props, floor ambience, wall decals, wall lights, ceiling pieces,
neo-tokyo extras, the sign family, and the recess. Four fleet rounds,
one inventory, one placement doctrine.

## Why props are separate assets

Baked backgrounds die in responsive layouts. Every decoration is its own
keyed sprite, placed by coordinates (later: by anchors), so composition
stays editable forever. The decor manifest resolves anchored items
against their stall at module load; the layout editor moves everything
live and exports intent.

## The sheet-fleet recipe (what worked)

- 1536x1024 SHEETS with pixel-boxed cells (±6 tolerance), one prop per
  cell, sliced by a post script.
- PER-CELL PALETTES sampled from the previous approved round, capped at
  8 hexes per prop. "All of them have many colors" was the first
  rejection; sampling + capping was the answer.
- FRONT-FACING LAW: dead-on + shallow top band, stated per cell — codex
  drifts isometric on cylinders (barrels, pots) without it.
- COMPLETENESS LAW with max-footprint numbers: croppers recur (toolbox,
  standee, tv-cart, hung bicycle, lantern string all came back cut).
  Escalation ladder: tall 330x944 cells -> roomy singles -> a drawn
  frame-guide attachment with the never-draw clause.
- LAMP LAW: the emitter is LIT (bright bulb, banded halo hugging the
  glass) but NO projected light in the sprite — CSS projects. If the
  sampled palette lacks bright hexes, relighting fails: append emission
  ramps to the palette.
- Sheet gens ignore box contracts ~30% of the time (the square 1254
  preset strikes again): post always bbox-detects and crops back.
- Signs came back on opaque teal twice: border-flood + tight pocket key
  (~14k px each) instead of regen.
- GREEN REMNANTS: strict chroma predicates miss mid-greens trapped in
  sprites (torii gate, ramen machine, trash, paper table). Looser
  predicate on named sprites, remnants converted to TRANSLUCENT BLACK
  feathered toward edges — the keying error becomes a shadow.

## Deterministic beats diffusion for geometry

Two props refused to be generated correctly and were CODED instead:
- THE RECESS (a one-point niche): codex rounds kept breaking symmetry;
  final asset drawn deterministically (thin 84px side reveals, darkest
  back wall, base slab, exact mirror symmetry).
- WF-MIN TILES: the wall+floor split enforced by SPLICING the approved
  tile's floor strip (true split row measured, 177px strip) under newly
  generated walls; tiling seams fixed by column-luminance trimming.
  Bonus lesson: two variant files shipped content-swapped and were
  caught by luminance fingerprinting, not by eye.

## Placement doctrine

- The user places props with the in-page editor (doc 06); exports are
  intent, baked responsively with anchors.
- CODEX AS DESIGN REVIEWER works: feed it the manifest + stall x-ranges,
  ask for at most 6 JSON adjustments, then VERIFY each against
  coordinates. Five of six suggestions were true hits (props parked
  behind stalls). Reviewer, not oracle.
- GLOW LAYER: ~30 editor-placed radial glows (including black=multiply
  shadow pools) bake into the manifest as first-class items.
- Personality props: five graffiti pieces ("pertinax vincit",
  "@sospedra", three free), pachinko, torii gate, ramen machine, dead
  vending, crt shrine — the world's in-jokes live in the inventory.

## The purge lesson (bazaar5)

"Final assets, no props" — bazaar5 mounts clean architecture only. The
inventory survives untouched in the manifest and deco files; placement
is a layer you can unplug because props were never baked in. The
separation earned its cost the day the layout system changed.
