# User decision ledger

This file records the latest task-specific instructions and supersessions from
the Bazaar 2/Bazaar 3 collaboration. Later entries override earlier ones.

## Project objective

Clone the approved Bazaar 2 experience into Bazaar 3 and redesign only the
underground floors so the stalls feel physically installed in one responsive,
old, reclaimed underground market.

The outcome must retain the eight distinctive shops and characters. It is not a
mall, a uniform franchise grid, or a set of PNG cards over a darker background.

## Current approval state

- No complete Bazaar 3 floor is approved.
- No complete three-floor master set is approved.
- The live Bazaar 3 integration was explicitly rejected.
- The three latest 1536×1024 PNGs were explicitly rejected.
- A mounted asset or passing report is not evidence of human approval.
- The earlier Floor 3 v5 master is positive rendering-direction evidence only.
- Uses is the primary approved camera/rendering reference.
- Games is the secondary approved clean-rendering/handmade-stall reference.
- Approved Bazaar 2 stall designs and the preserved `gen-places` declarations
  are Gospel and must not be redesigned.

## Frozen scope

### Street level

Street level is frozen.

Do not:

- regenerate it;
- recolor or relight it;
- reposition or re-layer it;
- edit buildings, doors, signs, vehicles, props, shadows, or background;
- replay the historical Bazaar building nudges;
- replay the historical street shadow tuning.

The current dirty Bazaar 2 working tree is the baseline. A same-viewport street
diff must be empty.

### Audio

No new audio work.

### Existing interaction

Preserve:

- destinations and dialog content;
- current Bazaar 2 hitbox/DOM ordering, including stairs;
- keyboard, pointer, focus, and touch access;
- scroll snapping;
- Up/Down targets;
- final-floor no-Down;
- navigation lanes;
- decorative `pointer-events: none`.

## Integration doctrine

Integration means common physical laws, not uniformity.

Preserve every stall's:

- width and silhouette;
- openness or enclosure;
- structure and roofline;
- material mix;
- sign shape, lettering, and placement;
- palette identity;
- practical-light identity;
- clutter density and organization;
- character identity and behavioral rhythm;
- symmetry or asymmetry.

Every stall must gain:

- exact support/contact islands;
- a source-tied compact caster;
- at least one purposeful seam crossing;
- architecture behind it and selected architecture/props in front;
- tenant-specific environmental consequences;
- shared camera, scale, pixel density, palette grammar, and light physics.

Good seam crossings include:

- a cable that passes behind equipment and returns in front;
- a pipe that visibly feeds a shop;
- Projects water reaching a shared drain;
- a vine wrapping a shared H-beam or pipe;
- Console's rug passing under an exterior cable;
- a server rack bolted into a shared plate;
- a stair landing wedged into a floor assembly;
- light touching both stall and wall/floor/beam;
- grease, dust, roots, scratches, or transit wear continuing outside the stall.

H-beams are required at real bay seams and stair/floor junctions. They are not
permission to wrap every stall in the same rectangular cage.

Stalls belong in rear bays. The lower/front part of every floor is an open
shared market lobby/walking aisle. Props may not be clipped at the module or
lobby boundary.

Stall-internal identity props stay with the stall. Environmental props should
be independent and placeable for responsive layouts. Never add random filler
trash.

## World and mood

The underground bazaar is:

- a hidden reclaimed night market inside old service infrastructure;
- Japanese back-alley intimate;
- Blade Runner noir without a generic cyberpunk wash;
- CRT/lo-fi technological;
- improvised and repaired in a Fallout-like way;
- rusted, damp, old, and active;
- illicit but inviting;
- cluttered yet graphically readable;
- playful in inhabitants, serious in environmental logic.

It must not resemble:

- a mall;
- matching franchise booths;
- a card grid;
- clean interface panels;
- generic fantasy market art;
- one global brown/teal/cyberpunk tint;
- a fixed concept illustration used directly as a responsive page.

## Rendering decisions

- Uses' countertop angle is absolute camera Gospel.
- Games is the secondary Gospel for clean readable clutter, handmade
  construction, and retained color.
- Simplify rendering, never approved layout or identity.
- Author at low resolution.
- Use large flat bounded regions and chunky square clusters.
- Use strong near-black outer and structural outlines.
- Normally use three tones per material: shadow, body, highlight.
- A fourth tone is reserved for real emission, severe wear, or a focal
  reflection.
- Use large connected shadow masses and sparse hard highlights.
- Enlarge with nearest-neighbor only.
- Keep quiet surfaces and spend detail on faces, hands, signs, tools, and the
  current action.
- Establish silhouette, character, sign, primary counter/rug/platform/machine,
  two or three clutter groups, source, and footprint before small detail.
- Make art readable at actual CSS size and around 300 px preview width.

Reject:

- classic overdrawn AI illustration;
- high-resolution illustration pixelated after generation;
- painterly modeling;
- gradients, airbrush, blur, glow, and antialiasing;
- fine one-pixel texture;
- scratch/rivet noise everywhere;
- random tubes, cables, mechanisms, or colored pixels;
- fine plant fronds;
- confetti pixels;
- mixed pixel density;
- smooth/deep ellipses;
- deep perspective rooms;
- malformed anatomy or props;
- details invisible at display size.

The normal new-stall delivery convention is:

```text
author:   320 × 421
enlarge:  exact 3× nearest-neighbor
art:      960 × 1263
deliver:  960 × 1264 with one transparent padding row
```

Approved legacy families retain their native dimensions.

## Camera and scale decisions

The camera is a front-facing shallow frontal-oblique/axonometric RPG view.

- Parallel projection.
- No vanishing point, lens distortion, or bay rotation.
- Vertical posts, walls, racks, H-beams, and character centerlines.
- Horizontal counter fronts, beams, shelves, floor seams, and fascia.
- Thin compressed top bands, normally about 0.2 height-to-width and never
  deeper than 0.25.
- No 30°/45° isometric camera.
- No perspective wedges or convergence.
- No deep ellipses.

For full-floor masters, these rails are canonical:

1. ceiling/slab line;
2. wall-to-floor contact line;
3. front floor/fascia line.

All stalls, stairs, props, and shadows must obey them.

Depth order:

1. back wall;
2. rear infrastructure/recess;
3. rear stall structure;
4. character;
5. counter/display;
6. contacts;
7. foreground lobby/spill.

Do not place different depth planes on the same accidental contact line.

Source scale guidance:

- one source-art unit is approximately 8 px;
- a standing adult is approximately 70 source units / 560 px;
- children are smaller than adult Hearthians and robots;
- luggage is not child-sized;
- stairs and furniture must remain credible against people.

The responsive CSS `u` system is separate:

- horizontal `1u = 1vw`;
- vertical `1u = 1svh`.

Historical per-element `u` nudges are tuning evidence only. Preserve the
reviewed current Bazaar 2 baseline rather than replaying deltas.

## Palette decisions

Use a broad harmonized semantic library, not a small global tint.

The principle is:

- Uses can retain several browns, reds, purples, and pink;
- Projects can retain several greens, greys, purples, and creature colors;
- a semantic purple shared by two stalls is literally the same swatch;
- architecture, stairs, beams, and floors use compatible shared ramps;
- each stall uses a different subset and proportion.

Harmonization must not erase wood, plastic, foliage, hologram, CRT, rug, skin,
canvas, brass, terracotta, or creature distinctions.

`MASTER_PLAN.md` contains a 64-color Proposal A. It is a proposal, not explicit
production approval. Calibrate or revise it against Uses before enforcing it.

Expected identities:

- Uses: warm wood/red, purple/rose canopy, tiny electronics;
- Papers: teal/cream/cyan;
- Manual: steel/brass/cream/amber;
- Console: dark servers/cardboard, red hair/rug, teal/cyan screens;
- Talks: wood/cream/skin/CRT;
- Projects: foliage/terracotta/robot/purple-rose creatures/amber;
- Games: handmade wood/cheap blue plastic/skin/amber;
- Travel: canvas/wood/steel/blue-grey Hearthian/amber/purple accents;
- architecture: mostly neutral, borrowing tenant hue only where material or
  light physically crosses a boundary.

Typical target:

- stall: roughly 18–32 meaningful colors;
- prop: roughly 10–16;
- material: normally three tones.

No large pure-white fields, chroma green, hot magenta, or broad neon regions.

## Lighting decisions

Lighting inconsistency was identified as a root failure.

Darkness is not integration.

Each local light must visibly form:

1. source;
2. receiver pixels on character/stall/prop;
3. receiver pixels on adjacent shared architecture;
4. matching compact contact/cast response.

Use hard palette-selected steps:

- source core;
- direct receiver;
- weaker spill.

Do not use:

- blur;
- radial or smooth gradients;
- translucent global washes;
- arbitrary opacity;
- `color-mix`;
- whole-stall brightness/saturation filters;
- broad halos;
- unexplained rim lights.

The shared ambient is cool and low-chroma. Background architecture sits about
one material step below the stalls. Recesses can approach near-black. The lobby
stays open and receives only short local spill near its rear edge.

Upper/front-left ambient and a hard down-right caster are calibration
directions, not yet an approved exact angle.

Small emissive masks must be protected before quantization. Hover changes a
source and its declared receivers together, never the whole stall.

## Responsive composition decisions

Desktop at `min-width: 701px`:

1. Uses + Papers, stairs right.
2. Stairs left + Manual + Console + Talks.
3. Stairs left + Projects + Games + Travel.

This is “three stalls + stairs, or Uses + one stall + stairs,” not a uniform
equal-column grid.

Mobile at `max-width: 700px`, four 100svh compositions:

1. Uses above Papers, stair right.
2. Manual above Talks, stair left.
3. Console above Projects, stair right.
4. Games above Travel, stair left.

Each mobile floor has exactly two vertical stalls and one continuous full-height
stair column. Reduce environmental prop density on mobile; do not shrink all
desktop clutter into noise.

The early “swap Papers for Games” instruction is superseded by these explicit
final groupings.

## Stair decisions

Desktop stairs must be installed architecture:

- ceiling/wall aperture;
- deep rear recess;
- reinforced collar, brackets, bolts, and caster;
- real landing top;
- compact contact and worn approach;
- selected front lip/rail overlap;
- utilities turning around or connecting to the opening;
- clear navigation lane.

Desktop has no midpoint floor.

Mobile uses one continuous stair with:

- bottom landing/exit;
- midpoint platform/exit;
- real midfloor top;
- fascia;
- underside shadow;
- one column that does not restart.

The platform is registered to and painted above the stair core. The whole
column/platform system mirrors on right-side layouts. Hover changes none of it.

Up is on the stairs side. Down is opposite. The final underground floor has no
Down.

- under 1024 px: signs sit inside content-rail edges;
- at/above 1024 px: signs move to outside gutters past max-width.

Between-floor bands are darker background rhythm. They must never disappear on
hover. Floor darkening always paints behind stalls and merchandise.

## Dialog and z-order decisions

- Dialog is portalled.
- Dialog has the global highest z-index.
- It remains above H-beams, stairs, platforms, separators, and Up/Down signs.
- Text appears quickly character by character; approximately 9 ms is acceptable.
- Reduced motion reveals full text immediately.
- Hover/focus cannot hide architecture, change structural z-order, move a
  hitbox, or hide adjacent stalls.
- Keyboard/focus and touch receive equivalent behavior.

## Master-first production decision

This later decision supersedes earlier advice to avoid whole-floor generation.

1. Generate a complete visual master for each desktop floor.
2. Show the real PNG before runtime implementation.
3. Stop for explicit user approval.
4. Use the master as composition/lighting/relationship truth, not as the final
   fixed runtime bitmap.
5. After approval, recreate responsive modules:
   - empty tileable wall/floor;
   - matching stair section;
   - each clean layerable stall retaining its internal identity props;
   - each environmental seam prop separately;
   - rear/front/receiver/contact layers as needed.
6. Reconstruct the approved relationship responsively.

The full master itself must already contain:

- wall and ceiling;
- all three camera rails;
- rear stalls and open foreground lobby;
- correct proportions;
- H-beam seams;
- shared utilities;
- meaningful seam props;
- source/receivers/casters;
- ambient and local light;
- shadows;
- stair aperture/landing;
- Up/Down signs;
- Bazaar 2 environmental visual effects;
- deliberate full-height crop corridors.

Integration may not be deferred to later CSS.

Do not feed rejected/downscaled current composites into generation. Use long,
specific written descriptions and exact placement. Do not regenerate from a
downscaled master crop. Preserve approved shapes at full quality or request a
precise background-removal-only operation.

Every generated PNG must be surfaced immediately with an exact path and labeled
**UNVERIFIED**. User approval is required before promotion.

## Historical approval and correction ledger

- Uses: approved primary visual/camera Gospel.
- Papers: historical review item approved.
- Manual: must gain distinct sale inventory in several front boxes/bins; later
  floating three-eye/three-arm design supersedes four-arm and pedestal prompts;
  no final Manual is approved.
- Console: must preserve Bazaar 2 Ed, visor, crossed legs, large rug, surrounding
  servers/machines/cables/pizza/boxes, darker bay, and much taller sign post.
- Talks: TV must show SMPTE color bars.
- Projects: historical concept/design direction approved; later corrections
  require more plants, 90s-anime mechanical construction, apron only, flatter
  rendering, and no mascot isolation.
- Games: approved structure and identity; never professionalize it.
- Travel: Hearthian character direction was liked; booth needs real rear depth
  and background detail while surfaces remain simplified. Frog versions and
  over-detailed versions are rejected.
- Earlier Projects C3, Console C4, and Travel C7 are directional positive
  references, not approved final floors.
- Floor 3 v5 was comparatively good direction, not an approved master.

## Negative ledger

Never repeat:

- generic background darkening as integration;
- CSS rectangles and giant colored receiver panels;
- repeated light trapezoids or contact polygons;
- fixed master bitmap as runtime;
- separately generated complete stalls over generic wallpaper;
- mismatched stall/wall/floor/stair camera;
- foreground stalls with no lobby;
- one desaturated/brown/teal palette;
- lighting without a visible source and world receiver;
- random blue cable pixels or random props;
- cropped boxes, luggage, plants, or foliage;
- downscaled image-to-image extraction;
- sprite rescaling to hide proportion errors;
- floating/disproportionate stairs;
- missing mobile midpoint floor;
- missing H-beams or identical beam cages;
- dense pseudo-pixel microtexture;
- Manual mounted on a counter, pedestal, legs, or obsolete four-arm design;
- Console without Ed/rug/visor/clutter/tall post;
- frog or flat corporate Travel;
- roofed/glazed/greenhouse Projects;
- professionalized Games;
- hover that hides floor architecture or puts dialog below signs;
- citing mechanical/browser PASS as visual approval.

