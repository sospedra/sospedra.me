# bazaar blog notes — the raw material

Written 2026-08-01, end of the r20 console war session. This is NOT the
blog. It is the memory dump the blog gets written from. Every doc stands
alone; together they cover the whole campaign from bazaar2 to bazaar5.

## The one-paragraph story

The bazaar is a pixel-art night market that works as the site's index.
Eight stalls, one per section of the site, run by characters who talk.
Every asset is AI-generated through Codex CLI (gpt-image class models)
under a supervision harness that treats the model as a talented, unreliable
contractor: verbose orders, drawn geometry contracts, mechanical
verification, adversarial rounds, and a human art director with final say.
The layout is a one-knob responsive system validated in a standalone
prototype before porting. Nothing is hand-drawn; everything is
hand-directed.

## The docs

1. `01-idea-and-world.md` — the concept, the characters, how stalls map to
   routes, the theme references.
2. `02-codex-asset-pipeline.md` — THE BIG ONE. Fleets, orders, instruments,
   the wars, verification, keying. Images in `assets/`.
3. `03-axonometric-camera.md` — the camera doctrine: two-surface law, angle
   law, the slab gospel, 68:81.
4. `04-palette-and-flatness.md` — limited palettes, clamps, the flatness
   laws, scoped hexes.
5. `05-layout-responsive.md` — from broken bazaar4 to the validated
   one-knob system and bazaar5.
6. `06-editor-and-pixel-perfect.md` — the in-page layout editor, export
   JSON, bake-responsively doctrine.
7. `07-light-glows-fx.md` — glows, reflections, neon rhythm, causal light
   law, CSS-projected light.
8. `08-animation-architecture.md` — r17 layers, occluders, pose chains,
   the opacity-stack runtime.
9. `09-lessons.md` — the meta-lessons about directing image models. The
   blog's probable thesis.
10. `10-stall-integration.md` — extraction, keying, scale contracts,
    walkway strips, occluders, z-sandwich: how eight strangers become
    one market.
11. `11-props.md` — the r19 decoration campaign: 92 sprites, sheet
    fleets, lamp law, deterministic geometry, placement doctrine.
12. `12-street.md` — the street level: the kit, the restyle wars, the
    tileable floor stitch, why it's a sealed component.
13. `13-stairs.md` — desktop S and mobile SM: the assets that define
    floor height, the crop rules, art-wins knobs.
14. `14-home-car-connection.md` — the drive from home to the bazaar:
    the SVG car, the departure state machine, signature vs express
    rides, the shared easing curve, the bus loop back.
15. `15-sound.md` — the 237-line synthesizer: two primitives,
    procedural reverb, per-stall leitmotifs, one audio file total.
16. `16-human-craft.md` — the work outside the pipeline: pen-and-paper
    sketches first, the midnight design language, Affinity cleanup and
    hand-repainting, CSS as the second art medium.

## Editorial review (2026-08-01 pass)

Expansion opportunities, ranked:

1. SOUND: closed, `15-sound.md` written from the real engine.
2. Doc 01 could grow the INTERACTION design: typewriter mechanics
   (9ms/char, link reveal order, games turn pauses), tab-order
   machinery, mobile first-tap-opens-dialog guard.
3. Doc 02 wants a NUMBERS APPENDIX for the blog: the measured
   convergence tables (62 -> 55.5 -> 50; width 900/1130/974; display
   projections) as one table instead of prose scattered.
4. Doc 05 references the verified gap numbers; embedding the
   LAYOUT_HANDOFF measurement table would make it standalone.
5. A short LINEAGE timeline (bazaar v1 -> v5 with dates and what each
   version proved) would anchor the post's narrative.

Compaction opportunities:

1. The angle war lives in both 02 (case study) and 03 (doctrine): keep
   03, shrink 02's entry to the verdict + a pointer.
2. Palette rules appear in 02's order anatomy and all of 04: trim 02.
3. Occluders are explained in 08 and again in 10: keep the mechanism in
   08, keep only the z-sandwich role in 10.
4. 09's lessons restate 02's instrument hierarchy: fine for notes,
   merge to one telling in the final post.

## Canon imported from the campaign

- `takeover/` — the complete BAZAAR3_TAKEOVER package: the twelve
  numbered docs (the bible: decision ledger, art/camera/palette laws,
  stalls + animation, responsive architecture, master-first workflow,
  file map, prompts, chronology, and 11 = the world-scale + hitbox
  GOSPEL), plus masters/, source/, and visual-references/ (camera
  gospels, character refs, approved directional sets).
- `doctrine/` — the run-dir doctrine docs rescued from tmp:
  RUN_SUMMARY.md, ANIM_ORDERS.md (r16), DOCTRINE.md and
  HOVER-DOCTRINE.md (r17 layered animation).

## Where the artifacts live

- `assets/` (this folder): the key images plus composed blog shots
  (convergence strip, war mosaics, stall lineup, prop grid, proto
  captures) and `rescue/` with 140+ files pulled from disposable
  locations. Full manifest: `assets/ASSETS.md`. `compose.mjs`
  regenerates the composed set.
- `tmp/bazaar3/master-run-20260728/` — the full campaign run dir: every
  order (prompts/, r20-console/order*.md), every gen, every gallery HTML,
  logs. DISPOSABLE location; archive before deleting tmp.
- `public/images/bazaar4/` — the shipped assets (stalls layered, arch,
  street, deco). Source of truth, partially hand-polished in place.
- `app/bazaar4/` — shipped view, manifests, editor v1, LAYOUT_HANDOFF.md.
- `app/bazaar5/` — the layout-system port + editor v5.
- `public/bz4-layout-proto.html` — the validated layout prototype with
  measurement rulers.
- Memory: `~/.claude/.../memory/bazaar3-master-pipeline.md` — the compact
  doctrine ledger, kept current across sessions.
