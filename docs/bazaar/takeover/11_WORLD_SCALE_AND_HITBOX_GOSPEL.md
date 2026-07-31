# World scale and hitbox gospel

Ratified 2026-07-28 during the master-run-20260728 asset campaign. This file
supersedes any earlier bay geometry where they conflict. The boxes below are
the CONTRACT: sprites conform to the boxes, never the other way around.

Reference mockups:

```text
tmp/bazaar3/master-run-20260728/r14/hitboxes.html   (the ratified boxes)
tmp/bazaar3/master-run-20260728/r14/layout.html     (measured-scale diagnostics)
```

## World scale law

- The world unit is the HUMAN: a standing adult is exactly 205 px.
- Scene height 597 px. Stairs span it fully and stand on the front line.
- Parallel projection: depth NEVER changes size. Depth is position.
- The stall line sits 60 px above the front line. That raise reads as the
  stalls standing 2-3 m back into the floor.
- The lobby floor strip between the two lines belongs to the WF layer and
  paints IN FRONT of the stall platforms. Stalls carry their own contact
  shadows.

## Figure scale table

| Figure | Height (px) |
|---|---|
| Standing adult (chef, archivist, clerk standing) | 205 |
| Hearthian agent | 200 |
| w98 robot (tallest figure on its floor) | 240 (r15 ruling, was 215); K-2SO-class derelict, teal #008080 + rust (r15j) |
| Manual robot, floating envelope | 170 |
| Ed, seated cross-legged | 135 |
| Games sister | 135 (r15 ruling: shrinks with the 10% stall) |
| Games brother | 121 (r15 ruling) |
| Clerk leaning on counter | 150 visible |
| Seated customer on stool | 160 |

## Stall hitboxes (world px, ratified)

| Stall | Box W × H | Source of the number |
|---|---|---|
| uses | 500 × 520 | master bay 498; widest by design |
| papers | 480 × 440 | master bay 479 |
| manual | 340 × 500 | master bay 340 |
| console | 325 × 520 | r15 fleet ruling: 10% narrower, pipe height kept |
| talks | 300 × 500 | tall-storefront ruling |
| w98 | 370 × 500 | r15h ruling: height CAP 500 world, max |
| games | 325 × 480 | r15g ruling: box raised — the shortest-stall cap was the real blocker |
| travel | 400 × 480 | r15h ruling: same height as games (taller-stand rule dropped); depth 1 m stays |

r15 fleet rulings (2026-07-28, supersede the rows above where they
conflict): console 10% narrower with the pipe sign at the same height;
games 10% smaller in both dimensions (figures shrink with it); travel
20% wider; w98 keeps 370 × 430 but its render must actually fit it, its
robot grows to 240 world (tallest figure ruling reinforced), and its
plants diversify. A percentage ruling means REGENERATION at the new
geometry — new background becomes visible, content redistributes —
never a mechanical rescale.

Stairs navigation lanes: floor 1 right 214 × 597; floor 2 left 190 × 597;
floor 3 left 180 × 597, up-only.

## Character zones (inside their stall box)

| Zone | Size | Note |
|---|---|---|
| chef | 70 × 205 | behind counter, center-left |
| customer | 70 × 160 | seated at counter front |
| archivist | 70 × 145 | torso; hologram has no legs |
| manual robot | 90 × 170 | floating; hover gap below |
| ed | 110 × 135 | seated on the rug, nest center |
| clerk | 70 × 150 | leaning, cheek on hand |
| w98 robot | 80 × 240 | standing among shelves; K-2SO-class derelict gardener (r15j) |
| sister | 75 × 135 | holds the handheld (r15 ruling) |
| brother | 65 × 121 | beside her, separate zone (r15 ruling) |
| agent | 70 × 140 | torso behind counter |

## Interaction semantics

- One focusable control per stall: the stall box. Hover frames, dialog,
  keyboard and touch all live there. Tab order follows floor order.
- Character zones are hover refinements inside the stall box. Never their
  own tab stop.
- Beams, WF, decorative props, creatures: `pointer-events: none`.
- Stall boxes never overlap each other or the navigation lane. The wall gaps
  guarantee the separation.
- Hitboxes ride the sprite. Scale and the 60 px depth raise do not move
  them.

## Proportion law for asset generation

Character inflation is the recorded failure mode of every image-model regen:
figures grow relative to their structure (measured: chef 555 px inside an
843 px stall = ratio 1.5 vs the master's 2.5). Therefore:

- The structure-to-adult ratio target is 2.1-2.5 (stall box heights above).
- Every generation order carries the figure heights AND the structure box.
- A sprite that does not fit its ratified box after character calibration is
  rejected, regenerated, and never rescued by scaling.

## Proven generation instruments (in the run directory)

- Angle-law diagram attachment (`r12/angle-law.png`): green legal
  construction, red forbidden isometric. Pictures beat prose for geometry.
- Colors from the master crop; hex lists are a ceiling, not a replacement.
  Raw library hexes without the master's darkness produce sticker art.
- Verbose numbered inventories; codex is never allowed to infer.
- Keying: official codex remover + geometric partial resolver
  (`r10/key-official.mjs`); binary alpha always.
- THE REFLECTION LAW (r15i ruling, 2026-07-29): reflections are
  GRADIENTS that mix and blend into the receiving surface — start at
  the surface body value, end at the surface pre-mixed with the light
  color (40-60%) nearest the source, 3-6 monotonic steps, following
  the surface plane, stopping at its silhouette; source cores stay
  crisp; outlines and material shading stay hard-stepped. Canon
  example: the Manual counter. This supersedes the hard-step receiver
  doctrine for reflections only.
- r15j w98 ruling (2026-07-29): greenhouse variety — at least 10
  distinct species (three green families, three flower colors,
  succulents, trailing pothos) and FOOD crops (tomato vine with red
  fruit, strawberry planter, herb row, veg crate). The grow lamp's
  red reflects on ALL plants below it per the reflection law. The
  tower creature sleeps. The robot is restyled: K-2SO-class derelict
  (Rogue One silhouette — domed head, twin pale round eyes, long
  segmented limbs) in teal #008080 (the /w98 desktop background) with
  rust blooms; apron and watering can stay; a good robot, no menace.
  Dome top is the tallest figure point (240 world). Render repacks
  into the ratified 370 × 500 box.
- r15j composition instruments (2026-07-29): per-stall blueprint
  pages (r15/composition.html) with exact element rects, kill
  keylines, two-surface split lines and dotted reflection zones are
  approved BEFORE order rewrites. Floors and rugs share one
  construction: the 68px two-surface strip ("a strip not a stage").
  Real-world arithmetic beats ratio prose: state object sizes in
  meters against the 187 px/m scale (arcade 70in = 334 px), and
  depth as +40 px base height per meter.
- r15k width instruments (2026-07-29): absolute pixel counting never
  bites; RELATIVE rules do — the aspect kill (height ÷ width floor,
  measure both), the BODY RULE (stall width in lying 328px adults),
  the MARGIN RULE (chroma margin compared to the stall's own width).
  Result: games +49% -> +8% (approved at 352 world), w98 +50% ->
  +25% (approved at 463 world). Approved widths ride the sprite;
  contract boxes stay as interaction hitboxes.
- r15k console rulings (2026-07-29): THE CARPET LAW image is the
  fleet-6 carpet crop (r15/carpet-law.png) — the user-certified size
  and angle: grand full-base carpet, straight fringed bottom, GENTLE
  side slant only, subdued dark weave. A geometry law image must
  agree with the material text (the wooden rug-law crop vs "maroon
  woven" contradiction caused two trapezoid rounds). Sign glyphs
  appear ONCE — mirrored/doubled sign text is banned. Console palette
  reduced again: ≤ 32 fills, LED fields share exactly three colors.
  THE SURROUND EXCEPTION — the first sanctioned angle-law exception:
  the two flanking machine stacks each show one narrow inward side
  face (≤ 1/5 front width, vertical edges vertical) so they "look at"
  Ed; everything else stays zero-side-face.
