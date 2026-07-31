# Bazaar 3 Underground Integration Bible

Status: preserved long-form production history.

Current authority: read `MASTER_PLAN.md` first. The consolidated master plan
records the latest palette/lighting audit, the rejection of the fixed
`1248×597` workshop treatment, the real mounted Manual status, and the
responsive replacement plan. Where this historical document conflicts with
`MASTER_PLAN.md`, the master plan wins. In particular, sections 31–32 describe
a rejected prototype and are retained only as negative evidence.

This document exists so the complete Bazaar 3 plan survives conversation
compaction and can be reread before every substantial implementation or asset
generation pass. It is not a moodboard and it is not a list of optional ideas.
The words **must**, **never**, **locked**, **frozen**, and **reject** are
acceptance requirements.

Before changing Bazaar 3, read this file and `ART_DIRECTION.md` completely.
When either document conflicts with a later explicit user instruction, the
later explicit instruction wins and both documents must be updated before work
continues.

---

## 0. Executive production order

Bazaar 3 is a controlled evolution of the approved Bazaar 2 underground
market. It is not a redesign.

The job is to make eight radically different places feel physically installed
inside one underground bazaar by rebuilding the world around, behind, beneath,
through, and occasionally in front of them.

The production order is:

1. Preserve the approved stall designs and animation registration.
2. Remove the current generic integration shortcuts.
3. Establish one shared physical scene contract.
4. Prove that contract on the Manual–Console–Talks desktop floor.
5. Approve that floor visually before copying the system elsewhere.
6. Integrate Uses–Papers.
7. Integrate Projects–Games–Travel.
8. Build the dedicated mobile integration treatment for all four pairs.
9. Run the full visual, animation, interaction, responsive, and frozen-street
   validation matrix.

No floor is accepted merely because it is darker, aligned, responsive, or free
of broken images. It must stop reading as transparent PNGs placed over a
background.

---

## 1. Authority and source hierarchy

The source of truth, in descending order, is:

1. The latest explicit user instruction.
2. The approved Bazaar 3 Console C4, Projects C3, and Travel C7 masters.
3. The current approved Bazaar 2 working-tree rendering. Approved uncommitted
   work is authoritative; do not reconstruct it from Git `HEAD`.
4. `ART_DIRECTION.md`.
5. The approved layouts, anatomy, depth, props, signs, materials, and camera
   declarations in `gen-places.html`.
6. This integration bible, which resolves the older source conflicts.
7. Uses and Games as the hard rendering references.
8. The recent accepted Projects and Hearthian Travel render direction as
   positive evidence for the desired flatter rendering and readable depth.

Uses and Games are rendering references, not composition templates.

### Positive image references

Hard Gospel:

- Uses: approved Bazaar 2 base and frames.
- Games: approved Bazaar 2 base and frames.

Recent positive rendering-direction references:

- Projects:
  `tmp/bazaar3/gen-places-round2/projects-exact-c3-flatstyle-raw.png`
- Hearthian Travel:
  `tmp/bazaar3/gen-places-round2/travel-exact-c7-strong-recess-raw.png`

Identity/composition reference:

- Console with Bazaar 2 Ed:
  `tmp/bazaar3/gen-places-round2/console-exact-c4-ed-bazaar2-identity-edit-raw.png`

### Frozen delivered masters

These current idle masters and hashes are immutable during integration:

- Uses:
  `public/images/bazaar3/assets/stalls/uses/frames/idle-1.png`,
  `77395b20a016e716c35475fb16958b6f64390a89df8a8af82621dba26f10253b`
- Papers:
  `public/images/bazaar3/assets/stalls/papers/frames/idle-1.png`,
  `1759c9a47e89e1de7329623c42a91d5698ad21896784b0af5a5ace6442b4e745`
- Manual:
  `public/images/bazaar3/assets/stalls/manual/frames/idle-1.png`,
  `bc4b9d481f6979445dbdd69c8a295a1c15d139790c5f2cc0a6b902ba27d48ad9`
- Console C4:
  `public/images/bazaar3/assets/stalls/console-v2/frames/idle-1.png`,
  `08e836629578b638d003eb3dd6a25c667ce48b94f58208c114bafcc7cdb58589`
- Talks:
  `public/images/bazaar3/assets/stalls/talks/frames/idle-1.png`,
  `ef1bf6071660d131cd77c2a7d990edaa397b615e554a37f2141cafc55aa076a2`
- Projects C3:
  `public/images/bazaar3/assets/stalls/projects-v2/frames/idle-1.png`,
  `8c9fef6a8651d20031d3f3c692ca52ddcd38d0d78a52bc5d28530829b92009fc`
- Games:
  `public/images/bazaar3/assets/stalls/games/frames/idle-1.png`,
  `d98d7ff7614c9dc10d0708874c3ab349d133bf92c5633ff7e179dd6f5d981a1f`
- Travel C7:
  `public/images/bazaar3/assets/stalls/travel-v2/frames/idle-1.png`,
  `1104859af3792904fba61c551f2cf409b8cf4e552fbf8420ee4544766889315b`

The accepted all-stall contact sheet is:

- `scripts/bazaar3/reports/v2/contact-sheet.png`
- SHA-256:
  `1ab717f99a60762b8f872779da7d4a4e91129f16bf724990916517d88c7b8b4c`

Every asset generation result must be surfaced immediately by path for review.
No approved image is silently replaced. Every later approval must record the
exact path and hash. Historical incremental `u` nudges are not replayed; the
current approved rendered baseline is placement authority.

These references define rendering restraint, silhouette clarity, flat value
grouping, outline hierarchy, and readable spatial depth. They are not templates
whose architecture, palette, props, or signs should be copied into other
stalls.

### Negative references

Reject:

- the earlier over-rendered Projects images;
- any output with dense AI microdetail;
- painterly pseudo-pixel art;
- generic matching shop shells;
- the current Bazaar 3 generic CSS rear rectangles, repeated light
  trapezoids, repeated contact polygon, and repeated cable patch;
- any integration that amounts to background darkening plus separators.

---

## 2. Frozen scope and protected work

### Street-level freeze

Street level is outside the Bazaar 3 art pass.

Never:

- regenerate it;
- relight it;
- recolor it;
- reposition buildings, doors, signs, vehicles, shadows, or props;
- change its layer order;
- replay historical street nudges;
- introduce Bazaar 3 underground effects into it.

At the same viewport and state, the Bazaar 3 street must remain visually and
behaviorally identical to the current Bazaar 2 street, apart from documented
browser-rendering nondeterminism.

### No audio

There is no audio work:

- no new audio assets;
- no proximity loops;
- no sound controls;
- no animation synchronized to sound.

### Protected interaction work

Preserve:

- all stall destinations;
- existing dialogs;
- the top-level dialog portal;
- rapid typewriter text;
- keyboard and touch access;
- the stall/stair hitbox ordering;
- desktop and mobile DOM ordering;
- scroll snapping;
- Up/Down navigation targets;
- last-floor no-Down behavior;
- the current mobile full-height stair geometry;
- its bottom and midpoint exits;
- existing stall frame registration.

Decorative integration layers are always noninteractive.

### Protected stall work

Unless the user explicitly asks for a redesign, preserve:

- character identity and species;
- age, clothing premise, posture premise, and role;
- the number and relationship of characters;
- the stall’s structural concept and silhouette;
- the sign, lettering personality, position, and attachment;
- identity-defining furniture, props, clutter, and materials;
- the character’s relationship to the stall;
- the approved five-frame behavioral sequence.

Integration is built around approved work. It is not permission to replace it.

---

## 3. Design thesis

The Bazaar is a hidden, illegal, reclaimed underground night market built
inside the decaying infrastructure of a much older facility.

It mixes:

- Blade Runner noir;
- Japanese back-alley intimacy;
- CRT glow and lo-fi technology;
- improvised Fallout-like repairs;
- rusted industrial service architecture;
- personal, handmade, eccentric occupation;
- warm decay rather than horror;
- serious environmental rendering with playful inhabitants.

Nothing underground was installed as a clean commercial unit. Sellers occupied
abandoned maintenance bays, borrowed power, cut into drains, tied signs to old
beams, patched floors, attached shelves to damaged walls, and constructed
deeply personal places from available materials.

The market should feel:

- dark, intimate, cluttered, and inhabited;
- old but active;
- repaired rather than restored;
- dangerous enough to feel illicit, but welcoming enough to invite wandering;
- visually rich but graphically readable;
- diverse in materials and character;
- coherent in physical laws.

It must never feel like:

- a mall;
- a row of matching franchise storefronts;
- eight collectible cards;
- eight dioramas dropped onto a wallpaper;
- a generic cyberpunk neon wash;
- an evenly lit stage;
- a pile of unrelated trash props;
- a fantasy bazaar;
- a clean game UI wearing pixel-art decoration.

### Signature visual move

The signature move is **physical interleaving**:

- an existing utility passes behind a stall and returns in front;
- a stall’s light reaches the shared wall and floor;
- a hard footprint shadow follows its actual supports;
- the environment shows consequences of that tenant;
- one foreground edge partially occludes the stall;
- the stall remains unmistakably its own design.

This interleaving is what transforms a sprite into an inhabitant.

---

## 4. Integration, never uniformity

The eight places must continue to look as if different inhabitants constructed
them for different purposes.

Keep different:

- widths and heights;
- rooflines and open tops;
- materials;
- degrees of clutter;
- sign construction and lettering;
- structural logic;
- character scale within the shared human reference;
- practical light sources;
- symmetry or asymmetry;
- openness or enclosure;
- behavioral tempo.

Never wrap every stall in:

- the same rectangle;
- the same columns;
- the same I-beam cage;
- the same light shape;
- the same floor pad;
- the same sign hook;
- the same foreground cable;
- the same grime decal.

The bazaar supplies common physical laws, not a common storefront kit.

Integration occurs through:

- shared ambient darkness;
- a shared ground plane;
- coherent camera and scale;
- credible mounting and support;
- stall-specific contact and cast shadows;
- floor-wide utilities;
- tenant-specific environmental wear;
- fixture-driven light and receiver response;
- rear, middle, and front depth relationships;
- selective boundary-crossing props;
- architecture that visibly carries weight.

---

## 5. Absolute rendering language

### 5.1 Core statement

The target is modern production-quality 16-bit-inspired pixel art:

- genuinely authored at low resolution;
- flat, bounded color areas;
- hard square clusters;
- strong near-black structural outlines;
- few tones per material;
- large forms before details;
- crisp nearest-neighbor enlargement;
- expressive characters and readable props;
- no painterly rendering disguised by pixelation.

Uses is the primary rendering Gospel. Games is the secondary Gospel. The recent
accepted Projects and Hearthian Travel renders demonstrate the correct
direction for flatter surfaces, quieter internal texture, and clearer depth.

### 5.2 Authored pixel grid

For primary stalls:

- author at the declared low-resolution grid;
- normally around `320 × 421`;
- enlarge exactly 3× with nearest-neighbor scaling;
- every authored pixel becomes one uniform `3 × 3` output block;
- never interpolate;
- never stretch to fill a destination canvas;
- never introduce 1 px or 2 px final-resolution detail;
- never use a high-resolution painting followed by a pixel filter.

Projects’ exact delivery rule:

- authored artwork: `320 × 421`;
- exact 3× art: `960 × 1263`;
- append one fully transparent padding row;
- delivered canvas: `960 × 1264`;
- never stretch or duplicate an art row.

Smaller props may use smaller canvases, but their effective displayed authored
pixel size must match the stalls.

### 5.3 Flat color dominance

Every material begins as one strong graphic mass.

Directional distribution:

- 60–75% dominant base color;
- 20–30% shadow;
- 5–10% highlight or wear.

This is a hierarchy, not a histogram requirement.

A wooden board must first read as a brown board, not a mosaic of brown noise.
A leaf cluster must first read as a plant mass, not dozens of illustrated
leaves. A server rack must first read as a dark machine volume, not hundreds of
vents and lights.

### 5.4 Three-tone material rule

Most materials receive:

1. deep shadow;
2. dominant local color;
3. controlled highlight.

A fourth tone is permitted only for:

- emitted light;
- severe damage;
- an important reflection;
- focal character readability.

Reject five-to-eight-step ramps, smooth gradients, volumetric airbrushing, and
many nearly identical colors.

### 5.5 Shadow language

Internal shadows are:

- large;
- hard-edged;
- connected;
- graphic;
- clustered;
- caused by an understandable source;
- usually near-black with a restrained floor tint.

Use one shadow mass across a face, limb, fabric section, machine side, or
recess. Do not model every small plane.

Scene grounding uses two distinct systems:

1. **Contact shadow:** very dark, compact, following true contact points.
2. **Cast shadow:** broader, directional, and tied to a visible fixture.

Never substitute a generic ellipse, generic polygon, or large browser blur.

### 5.6 Highlight language

Highlights are sparse:

- a short hard edge cluster;
- a narrow metal shine;
- one visor line;
- a bright screen edge;
- a lit cheek or hand;
- a few illuminated leaf tips;
- a worn front edge.

Do not rim-light every object. Do not scatter isolated bright pixels to create
false detail.

### 5.7 Dithering

Dithering is rare and controlled.

Permitted:

- one large shadow transition;
- smoke or steam;
- a flat glow edge;
- atmospheric recession;
- severely worn material.

Use a deliberate checker or sparse pattern on the authored grid. Never spread
noise over an entire sprite.

### 5.8 Pixel clusters

Build forms with deliberate clusters:

- foliage as overlapping masses and broad leaves;
- cables as stepped curves with credible thickness;
- hair as large silhouettes before accents;
- fabric folds as broad angular blocks;
- rust as small causal patches;
- smoke as stepped clouds;
- circles as hand-controlled stair-stepped forms;
- reflections as short broken bands;
- light as flat stepped halos.

Important areas may be denser. Quiet surfaces must remain quiet.

### 5.9 Outline hierarchy

Strongest to weakest:

1. complete stall silhouette;
2. character silhouette;
3. major structure and furniture;
4. interactive/held object;
5. material division;
6. surface accent.

Rules:

- one authored-pixel near-black contour is the default;
- two authored pixels are reserved for important overlaps;
- outer contours may break on a directly lit edge;
- internal divisions may use a dark local color;
- deep overlaps receive heavier separation;
- no semi-transparent outline;
- no antialiased fringe;
- characters must not melt into inventory or walls.

If texture competes with the stall or character silhouette, remove texture.

### 5.10 Detail hierarchy and “less is more”

Establish first:

- the complete silhouette;
- character silhouette;
- sign;
- main counter, rug, platform, or machine;
- two or three major clutter masses;
- dominant source of light;
- ground footprint.

Only then add secondary information.

Group repeated objects:

- one cable bundle plus two loose cables, not twelve equal cables;
- several book-stack masses plus one focal book, not forty individual books;
- five or six foliage masses plus selected leaves, not every leaf;
- rack panels plus grouped ventilation marks, not every component.

Most detail belongs near:

- faces;
- hands;
- the sign;
- the primary interactive object;
- the current action.

Dark corners, wall panels, fabric areas, shelf interiors, and unlit floors need
breathing room.

### 5.11 Explicit AI-rendering failures

Reject:

- painterly pseudo-pixel art;
- high-resolution illustration pixelated afterward;
- hundreds of equally important objects;
- micro-scratches on every surface;
- every plant leaf rendered individually;
- soft gradients;
- excessive glowing edges;
- unexplained rim light;
- decorative mechanisms with no function;
- random tubes and rivets added for intricacy;
- melted hands, tools, cables, or materials;
- mixed pixel densities;
- texture noise in place of material design;
- concept-art lighting;
- detail invisible at actual CSS size;
- smooth ellipses and vector curves;
- muddy darkness that erases material separation.

When uncertain, remove detail.

---

## 6. Camera, scale, geometry, and projection

### 6.1 Camera

All underground art obeys a frontal oblique RPG camera:

- parallel projection;
- no vanishing point;
- no lens distortion;
- no 30° or 45° isometric rotation;
- vertical faces nearly straight-on;
- posts remain vertical;
- side faces are absent unless the approved design explicitly uses a shallow
  stepped return;
- horizontal surfaces are compressed bands;
- depth is indicated by vertical contact offset, overlap, shading, and
  atmospheric loss;
- shadows fall primarily straight down with a small floor-specific lateral
  component.

The camera is low—approximately 12° for the environment language. It reveals
enough upper surface to understand clutter without becoming top-down.

### 6.2 Horizontal surfaces

Countertops, shelves, rugs, platforms, floor plates, pot rims, and crate tops
must be shallow.

- Low-camera environment tops use roughly one-fifth vertical compression.
- Existing approved stall declarations using half-scale authored depth remain
  authoritative for their internal composition.
- Round tops are shallow stepped bands, normally around a 0.2 height-to-width
  ratio.
- A round top above 0.25 reads as the wrong camera.
- No deep elliptical tabletop.
- No perspective trapezoid implying a vanishing point.

### 6.3 Shared scale

- Scene placement uses the existing viewport grid:
  `1u = 1vw` horizontally and `1u = 1svh` vertically.
- Source design uses the declared production-unit system:
  normally `1 source u = 8 px`.
- A standing adult is approximately `70 source u = 560 px`.
- Seated, crouched, alien, and mechanical characters derive from the same
  credible reference.
- Furniture, doors, counters, racks, stools, tools, and exits must respect this
  scale.
- Do not confuse viewport `u` with sprite-source `u`.

Different stall sizes are desirable. Different human scales are not.

### 6.4 Depth planes

Every stall and integrated floor identifies:

1. back wall;
2. rear infrastructure/recess;
3. rear stall structure;
4. character plane;
5. display/counter plane;
6. ground-contact objects;
7. foreground spill.

Different depths must not share accidental contact lines.

### 6.5 Silhouette

Every place remains readable before its sign is read:

- Uses: broad social ramen bar with stools and lanterns.
- Papers: tall archive kiosk with canopy and freestanding racks.
- Manual: dense mechanical parts shop and multi-armed robot.
- Console: low technological nest around seated Ed.
- Talks: video-club counter, shelving, CRT, tapes, and standee.
- Projects: roofless plant-broken structure.
- Games: crooked child-built arcade stand.
- Travel: theatrical, deep, enclosed handmade cosmic booth.

Silhouettes should be:

- asymmetrical;
- broken by signs, cables, posts, foliage, props, or awnings;
- surrounded by meaningful negative space;
- readable at thumbnail size;
- free from generic opaque backplates.

Not everything is a stall. Console is a rug-based technological nest. Projects
is an open garden structure. Games is an improvised play space. Preserve that.

---

## 7. Material bible

### 7.1 Metal

- Blue-black, brown-black, or violet-black shadow.
- Desaturated steel, iron, olive-gray, or tarnished brass body.
- Small hard highlights.
- Rust concentrated at joints, scratches, welds, and water paths.
- Rough repairs and mismatched plates.
- No evenly distributed orange speckle.
- Must feel heavy and aged.

### 7.2 Wood

- Warped, split, chipped, or misaligned.
- Broad grain only where it helps orientation.
- Dark gaps between boards.
- Pale exposed color at recent breaks.
- Mismatched repairs are welcome.
- Games uses cheaper, somewhat brighter wood, but it remains worn.
- No fine grain over every surface.

### 7.3 Concrete and masonry

- Large quiet shapes.
- No brick pattern.
- Sparse structural cracks.
- Damp stains, chipped corners, embedded mesh, old paint, and patches.
- Decoration occurs in separated clusters, not wall-to-wall noise.

### 7.4 Fabric, tarp, and canvas

- Broad folds and flat bands.
- Tension visible between attachment points.
- Torn, dirty lower edges.
- Faded pigments.
- Patch seams and rope ties.
- No gradient-modeled cloth.

### 7.5 Plastic

- Harder highlight than wood or metal.
- Scratches, sticker ghosts, discoloration, and bleaching.
- Games may use stronger cheap blue or toy-like accents.
- Dark outlines and grime keep plastic inside the underground world.

### 7.6 Paper

- Warm gray, cream, or yellowed white.
- Never large pure-white areas.
- Folded corners and grouped stacks.
- Dark bundle masses.
- Sparse marks; only approved text is readable.
- Cyan hologram light may create controlled edge accents.

### 7.7 Plants

- Two or three deep foliage greens.
- Darker, yellower, and less saturated than chroma green.
- Chunky overlapping clusters.
- A few characteristic leaf families.
- Vines wrap around real structure.
- Plants interrupt and occlude construction.
- No fine botanical fronds.

### 7.8 Glass, screens, holograms, and emissions

- Screens are flat bounded shapes.
- Hologram translucency is normally faked with color and authored dithering.
- Glow uses one bright core and one or two flat bands.
- No browser blur as the primary rendering.
- Emissive pixels are brighter than their receivers.
- Reflected light is dimmer and spatially adjacent.

---

## 8. Age, repair, grime, and causal history

Nothing underground appears newly installed unless unusual cleanliness has a
specific narrative purpose.

Possible history:

- oxidation;
- grease;
- dampness;
- dust;
- scraping;
- patched holes;
- chipped paint;
- heat discoloration;
- handling wear;
- cable abrasion;
- tape repairs;
- rough welds;
- accumulated debris.

Damage follows cause:

- rust below water and around fasteners;
- grease around cooking and machines;
- soot above heat;
- scratches beside moved stools and crates;
- dirt at lower edges;
- cable wear at corners;
- clean patches where hands repeatedly touch;
- protected rectangles behind removed equipment;
- paper trapped by rack wheels;
- moss around sustained dampness.

Never apply one generic grime texture across everything.

---

## 9. Palette and color system

### 9.1 World palette

The underground base is approximately:

- 55–65% neutral structure;
- 35–45% tenant color and emitted light.

Shared neutrals:

- midnight purple;
- black-blue;
- deep violet;
- dark asphalt;
- graphite;
- dark slate;
- rusted iron;
- desaturated timber;
- dirty concrete;
- dark soil;
- dusty fabric;
- tarnished brass.

Selective ambient accents:

- cyan;
- electric blue-cyan;
- muted teal that never becomes green;
- muted magenta;
- vapor pink;
- cobalt;
- dirty yellow;
- sodium amber;
- faded peach;
- desaturated red.

Warm colors remain controlled accents.

### 9.2 Stall accents

- Uses: deep red, warm orange, muted purple, amber.
- Papers: faded teal, cream, holographic cyan.
- Manual: steel, brass, workshop amber, restrained cyan.
- Console: olive-gray electronics, cardboard, rug colors, amber LEDs, screen
  cyan/green as light only.
- Talks: warm worn wood, faded media colors, CRT blue-white, small teal/amber.
- Projects: deep greens, muted violet, dusty rose, rust.
- Games: cheap blue plastic, warm wood, playful clothing, arcade blue.
- Travel: faded canvas, rust-orange, cream, tarnished brass, amber, restrained
  cosmic cyan/violet.

These accents remain different but are interpreted through the same ambient.

### 9.3 Palette limits

- Target roughly 24–32 meaningful colors for a primary stall.
- New integration props should normally use about 10–16 colors.
- Most materials use three tones.
- Reserve bright colors for actual emissions.
- Reject large pure white.
- Reject chroma green inside delivered art.
- Reject hot magenta inside delivered art.
- Reject large neon fields.
- Reject nearly identical shades used only to fake complexity.

The final production pipeline should define:

- shared neutral/material ramps;
- floor-specific ambient ramps;
- per-stall accent slots;
- reserved emissive ramps;
- reserved contact/cast-shadow ramps.

---

## 10. Lighting contract

### 10.1 The whole floor receives ambient first

The environment and stall cannot be graded independently.

Required sequence:

1. Compose environment, architecture, utilities, stalls, props, stairs, and
   grounding in one scene color space.
2. Apply the floor’s ambient darkness and color.
3. Add internal stall emissions.
4. Add authored wall/floor receiver light.
5. Add cast shadows and foreground occlusion.
6. Keep wayfinding and dialog in their appropriate UI layers.

The current environment-only `brightness()` approach is a known failure and
must be removed.

### 10.2 Visible sources

Every illuminated area must trace to a visible:

- bulb;
- tube;
- socket;
- cage;
- lamp shade;
- screen;
- hologram;
- lantern;
- creature emission;
- instrument.

No unexplained glow, global neon wash, or generic light trapezoid.

### 10.3 Light behavior

- Tight localized pools.
- Quick falloff.
- Hard stepped boundaries.
- Sparse authored dithering only at the outside edge.
- Reflections directly below or beside sources.
- Occlusion by counters, shelves, foliage, signs, and racks.
- Deep recesses approach near-black.
- Characters stay readable through selected face, hand, and tool highlights.
- Light color responds to the receiver material.

### 10.4 Stall fixture map

Uses:

- warm lantern/cooking source;
- wall, counter, stools, steam, and lower rail receive it.

Papers:

- cyan hologram is dominant;
- restrained warm shop light is secondary;
- papers, sill, rack edges, and nearby wall receive cyan.

Manual:

- hard workshop bulb and work lamp;
- tools, counter, oil, wall bracket, and cast arm shadows respond.

Console:

- screens/visor plus a bare practical bulb;
- rug, face, knees, rack edges, cable trench, and wall service plate respond.

Talks:

- CRT blue-white rectangular spill;
- warm counter/back-shelf fixture;
- counter, nearby floor, shelf edges, and standee receive light.

Projects:

- warm string bulbs;
- one violet seed light;
- tiny dusty-rose creature emission;
- foliage creates broken pools and shadow gaps.

Games:

- arcade blue is dominant;
- handmade bulbs and handheld are smaller sources;
- floor wedge, timber, siblings, cable, and nearby drain receive light.

Travel:

- practical amber lanterns;
- restrained cosmic instrument light;
- counter, side returns, rear wall edges, queue marks, and nearby architecture
  receive them.

### 10.5 Hover lighting

Hover may increase a relevant source by roughly 8–12%.

The emitter and its receivers change together on a declared effect layer.
Never brighten or saturate the complete stall image as a UI card.

Reduced motion uses a stable representative light state.

---

## 11. Grounding and shadow system

Each stall receives authored metadata and assets:

- exact ground anchor;
- exact contact points;
- hard contact mask;
- cast-shadow mask;
- fixture origin;
- shadow direction;
- front overlap allowance;
- rear overlap allowance.

### Contact shadows

Follow:

- posts;
- feet;
- pedestal;
- rug edge;
- platform feet;
- wheels;
- counter legs;
- crates;
- foliage pots;
- stair base.

They are compact, very dark, and do not float away from their contact.

### Cast shadows

Follow:

- the actual stall silhouette;
- the dominant external practical light;
- wall/floor geometry;
- obstruction and depth.

They may use hard shapes or sparse authored-grid dithering. Do not use a large
soft CSS blur.

### Environmental contact response

The footprint also receives appropriate:

- scrape;
- grease;
- paper;
- oil;
- dampness;
- rug wear;
- floor wedge;
- debris trap;
- queue wear;
- root crack.

---

## 12. Runtime scene-layer architecture

The visual stack, back to front:

1. base environment/back wall;
2. rear structural recesses and cast darkness;
3. floor-wide rear utilities;
4. stall-specific rear connections;
5. floor or landing top plane;
6. authored contact/caster layers;
7. immutable stall rear plate;
8. character/core animation;
9. stall animated prop/effect cel;
10. immutable stall front plate;
11. middle utilities and between-stall props;
12. staircase core;
13. foreground cables, pipes, rails, chains, plants, and landing lips;
14. between-floor fascia/separator;
15. wayfinding;
16. portalled dialog.

Implementation details may divide these into additional stacking contexts, but
the visible order cannot change.

### Required stall integration package

Where needed, derive from the approved stall:

```text
stall-core
stall-rear
stall-front
stall-emissive
stall-contact
stall-caster
```

Animation still uses:

```text
immutable rear plate
character cel
animated prop/effect cel
immutable front plate
```

Do not generate five unrelated complete scenes and hope that structure remains
stable. If complete registered frames remain the runtime format, the build
pipeline must still reconstruct them from locked plates and narrow changes.

### Required floor integration package

```text
floor-environment
floor-rear-structure
floor-rear-utilities
floor-ground
floor-mid-utilities
floor-front-occluders
floor-receiver-light
floor-cast-shadow
floor-decals
stairs-rear
stairs-core
stairs-front
stairs-light
```

### Boundary-crossing rule

Every stall needs at least one authored physical connection that crosses the
stall/environment seam:

- cable behind and then in front;
- pipe behind roof/post;
- vine around existing infrastructure;
- floor drain receiving water;
- rug edge under an external cable;
- platform wedged to shared floor;
- rack bolted to wall plate;
- reflected light crossing the transparent boundary.

The crossing must explain function or history. Decoration alone does not count.

---

## 13. Shared utility networks

Utilities belong to floors, not wrappers.

Possible networks:

- power bus;
- electrical drops;
- cable tray;
- cable trench;
- ventilation line;
- water feed;
- drain;
- patch panels;
- ceiling lamp rail;
- waste point;
- previous-tenant mounting marks.

They must visibly continue across multiple stall zones and react to obstacles.
They may bend around stairs, enter service plates, pass behind stall structure,
and reappear at another depth.

Do not restart the same decorative utility inside each stall.

---

## 14. Floor integration blueprints

### 14.1 Uses + Papers

Narrative:

An industrial archive and night-service lane. Stall level is warm and active;
the upper wall and infrastructure remain cold.

Shared architecture:

- aged welded metal/concrete service wall;
- continuous rusted cable tray;
- one meter/support column between occupations;
- shallow floor drain;
- old mounting marks;
- dirty amber fixtures, including one defective light;
- cold blue-black upper ambient;
- warm pools near working height.

Material transition:

- Uses grease, heat, and scrape;
- transition through mixed dirt and service wear;
- Papers paper fragments and dry dust.

Uses connections:

- an approved roof/awning edge passes behind shared overhead structure;
- lantern wiring visibly enters the utility rail;
- cooking soot and grease reach the wall/floor;
- stool and crate contact is authored;
- a foreground crate/cable edge crosses the seam;
- warm light touches nearby metal.

Papers connections:

- archive pipes or conduit attach to the rear wall;
- paper collects at rack wheels and curb;
- cyan hologram receiver light reaches wall, sill, and papers;
- rack wheel contact/cast shadows are authored;
- one foreground paper/rack edge crosses the floor seam.

### 14.2 Manual + Console + Talks — first proof floor

Narrative:

A maintenance and obsolete-media sector. Functional infrastructure is dense,
old, and repeatedly modified.

Shared architecture:

- heavy ceiling structural beam;
- repaired concrete/metal wall;
- floor-wide tool rail and patch panel;
- continuous cable trench;
- ventilation line and service drops;
- worn grated or concrete floor zones;
- service markings;
- oil, abrasion, and localized static reflections;
- occasional small steam burst from a real pipe.

Manual connections:

- rear mounting brackets;
- tool/power conduit;
- hard work-light cone and cast arm/tool shadows;
- oil footprint;
- parts-counter contact;
- foreground scrap partially occluding a lower corner.

Console connections:

- Ed, visor, cross-legged pose, rug, racks, servers, boxes, pizza, and cable
  clutter remain intact;
- server racks bolt into real wall/floor anchors;
- a power drop enters a service plate;
- a ventilation hose or cable tray passes behind a rack;
- selected cables disappear behind equipment and return across the rug/front
  plane;
- the rug remains a rug, not a standardized industrial platform;
- a small grated equipment pad may support racks without replacing the rug;
- screen/visor light reaches Ed, rug, cable trench, rack edges, and wall;
- floor wear and dust collect around the rug and rack bases;
- the Console sign remains unique and attached to its tall approved post.

Talks connections:

- the video-club shop recess ties into the rear wall;
- shelf depth remains readable;
- the CRT creates a low rectangular wall/floor receiver;
- tape debris and worn media-store floor marks extend outside the PNG;
- the standee and/or bargain bin participates in foreground occlusion;
- no standardized booth shell is introduced.

Proof-floor acceptance:

- architecture clearly passes behind and in front of all three places;
- one continuous utility network is readable across the floor;
- three distinct authored footprints replace the generic shadow;
- all lights have visible sources and receivers;
- the places remain radically different;
- at actual display size, none reads as a self-contained image pasted over the
  wall.

Do not roll the system to other floors before this proof passes a user visual
review.

### 14.3 Projects + Games + Travel

Narrative:

A reclaimed leisure and transit sector where dampness and life are slowly
breaking through improvised infrastructure.

Shared architecture:

- patched timber and scrap metal;
- plywood/tarp service wall;
- floor-wide drainage channel;
- mixed old transit markings;
- utility line and junctions;
- dampness concentrated around real water paths;
- controlled blue, violet, and amber light.

Projects connections:

- water feed and drain;
- roots enter real wall/floor cracks;
- vines climb one shared pipe or bracket;
- dampness and moss cross the PNG boundary;
- foreground foliage partially occludes an architectural edge;
- the shop remains completely roofless;
- its plant-broken top remains open;
- no greenhouse, canopy, glass, or enclosing frame.

Games connections:

- child-built wood/plastic structure remains crooked and improvised;
- wooden platform rests on visible wedges/blocks or bridges a shared floor
  patch;
- power cable follows the drain/utility route into a junction;
- blue arcade light reaches the tunnel and nearby floor;
- plastic crates touch shared debris;
- cable/litter overlaps the platform edge;
- no professional metal arcade bay.

Travel connections:

- the operator is a friendly four-eyed Hearthian, never a frog;
- the deep enclosed booth remains approximately one meter behind the agent;
- side returns, soffit, and darker rear floor gap preserve that depth;
- booth structure visibly attaches to the shared bay without becoming generic;
- lantern light reaches surrounding architecture;
- queue wear, transit arrows, stickers, tags, and luggage marks extend outside
  the booth;
- the handmade Outer-Wilds-like wood/canvas/brass identity remains;
- `LAST SEATS` remains exact.

---

## 15. Stall identity and integration cards

### Uses

Identity:

- stern ramen curator;
- folded arms;
- disciplined, still, exacting;
- broad working ramen stall;
- stools, customers, lanterns, cooking equipment, sign.

Integration:

- heat, grease, soot, foot traffic;
- visible lantern power;
- shared beam behind approved roof;
- hard stool/crate contact;
- warm receiver light;
- foreground crate or cable edge.

Never:

- redesign the chef;
- remove folded-arm severity;
- standardize the awning;
- turn the stall into a clean restaurant box.

### Papers

Identity:

- courteous holographic archivist;
- book;
- archive/news kiosk;
- canopy, racks, cyan projection, individual sign.

Integration:

- archive conduit;
- paper accumulation;
- rack-wheel grounding;
- hologram receiver light;
- rear shelf shadow;
- foreground paper/rack overlap.

Never:

- replace the book with a screen;
- make the character solid flesh;
- remove the walk-in gap;
- use a generic cyan aura.

### Manual

Identity:

- cheerful, methodical service robot;
- exactly three eye stalks;
- exactly three connected arms;
- fixed round floating torso and downward thruster;
- rear-aisle hover position behind the foreground counter;
- lower thruster consistently occluded by that counter;
- no pedestal, legs, wheels, support pole, table mount, or counter attachment;
- organized parts and tools;
- individual Manual sign.

Integration:

- wall brackets;
- tool/power conduit;
- oil and maintenance wear;
- hard work-light shadow;
- front scrap overlap.

Never:

- humanoid replacement;
- chaotic junk pile;
- independent floating arms;
- a pedestal, support, or robot sitting on/emerging from the counter;
- matching generic booth.

### Console

Identity:

- Ed-like red-haired infrastructure hermit based on the approved Bazaar 2 Ed;
- seated cross-legged;
- visor stays on;
- rug;
- racks, servers, monitors, boxes, pizza, controls, cables;
- lived-in technological nest;
- tall post with Console sign above.

Integration:

- rack anchors;
- wall service plate;
- power and ventilation;
- cable behind/foreground continuity;
- rug/floor contact;
- screen and visor receiver light;
- dust and heat evidence.

Never:

- standing;
- visor removal;
- counter or conventional shop;
- cleanup;
- rug replacement;
- lost clutter;
- generic metal cage.

### Talks / Video Club

Identity:

- seasoned deadpan clerk;
- cheek rests on one hand;
- cultivated boredom;
- tapes, CRT, counter, shelves, standee;
- video-club environment.

Integration:

- actual wall recess;
- CRT rectangular receiver;
- tape debris;
- worn floor;
- foreground bargain-bin/standee overlap.

Never:

- energetic retail greeting;
- generic media kiosk;
- loss of the resting silhouette.

### Projects

Identity:

- roofless overgrown garden shop;
- slim 90s-anime-informed mechanical gardener, translated into the shared pixel
  style;
- visible pistons, joints, cables, grippers;
- apron only—no additional clothing;
- watering can and seedling;
- rope-hung lowercase `projects` sign;
- two alien creatures;
- abundant chunky plants;
- rusted posts, warped wood, tools, pots, string lights.

Integration:

- real water and drain connection;
- vines on existing infrastructure;
- roots in shared cracks;
- dampness/moss;
- foreground foliage crossing a seam;
- broken bulb pools.

Never:

- roof, canopy, glass, arch, greenhouse;
- bulky armor;
- cute generic mascot;
- Earth animals;
- fine fronds;
- over-rendered foliage;
- isolated full-body robot poster.

### Games

Identity:

- two siblings sharing a handheld;
- sister immediately social;
- brother serious and protective;
- cheap kid-built timber and plastic;
- crooked sign and naïve engineering;
- arcade cabinet, console shelves, crates.

Integration:

- visible wedges;
- improvised power;
- blue arcade receiver;
- floor scratches;
- cable/drain junction;
- foreground crates/litter.

Never:

- professional fabrication;
- polished metal shell;
- conventional retail behavior;
- separated children;
- removed plastic or handmade asymmetry.

### Travel

Identity:

- four-eyed Hearthian;
- seasoned, welcoming, adventurous cosmic agent;
- handmade wood/canvas/brass booth;
- exact `LAST SEATS`;
- ticketing, route, instrument, luggage, and travel props;
- wall approximately one meter behind the agent;
- thick side/soffit returns;
- deep rear floor gap.

Integration:

- structural attachment;
- lantern receiver light;
- queue marks;
- transit arrows/stickers;
- luggage wear;
- floor contact and cast shadow;
- retained deep recess.

Never:

- frog;
- generic alien mascot;
- flat wall directly behind the keeper;
- clean corporate kiosk;
- lost handmade space-program character.

---

## 16. Signs and typography

The individual signs are a central strength.

Possible construction:

- carved wood;
- painted board;
- fabric banner;
- metal plate;
- crooked street pole;
- reused commercial object;
- child-painted scrap;
- rope-hung plaque.

Shared rules:

- pixel-authored lettering;
- only approved text is readable;
- wording remains exact;
- construction reflects the owner;
- visible physical attachment;
- chipped, faded, uneven, or worn treatment;
- tilt and sag where approved;
- no shared font;
- no standardized sign frame;
- no polished branding.

Consistency comes from pixel scale, ambient, outline, wear, and attachment—not
matching typography.

---

## 17. Clutter

Clutter explains personality and function.

Good clutter:

- forms a few strong groups;
- creates depth through overlap;
- leaves space around faces and actions;
- becomes heavier near the ground;
- collects against structures;
- has clear ownership;
- uses repeated object families;
- includes quiet gaps.

Vocabulary:

- Uses: bowls, pots, utensils, crates, stools, food-service wear.
- Papers: bundles, racks, books, pamphlets, archive boxes.
- Manual: tools, parts, trays, bins, containers.
- Console: cables, racks, servers, monitors, boxes, pizza, electronics.
- Talks: tapes, CRT, rewinder, bargain media, standee.
- Projects: pots, tools, soil, vines, creatures, growing equipment.
- Games: cartridges, controllers, plastic crates, improvised attachments.
- Travel: tickets, luggage, maps, tags, instruments, handmade space artifacts.

Do not add generic crates and trash merely to fill empty space.

---

## 18. New asset families

### Structural

- bay columns;
- crossbeams;
- aperture frames;
- wall brackets;
- mounting plates;
- conduit junctions;
- vent elbows;
- floor grates;
- drain sections;
- service hatches;
- ceiling chains;
- sign hooks;
- curb/landing edges.

### Surface response

- rust drips;
- damp patches;
- soot;
- oil;
- scraped concrete/metal/asphalt;
- protected clean rectangles;
- bolt holes;
- moss seams;
- paper accumulation;
- electrical scorch;
- queue and foot-traffic wear.

### Foreground occluders

- pipe corner;
- hanging chain;
- cable bundle;
- broken barrier;
- crate edge;
- trash cage;
- drain grate;
- plant branch;
- torn tarp;
- low railing;
- landing lip.

### Ambient/effect

- localized steam;
- condensation drip;
- dust only inside a declared light cone;
- screen/CRT flicker;
- bulb variation;
- paper flutter;
- electrical pulse;
- water reflection/ripple;
- route indicator;
- holographic fragments.

No screen-wide particle field.

### Tileable separator bands

Maintain the `gen-places.html` requirements:

- authored at `256 × 64`, enlarged 3×;
- delivered `768 × 192`;
- fully opaque;
- quiet repeating structural rhythm;
- calm outer 64 px edge zones;
- at most two sparse off-center features;
- no feature that implies edge continuation;
- around 14 flat colors;
- three-tone materials;
- no gradients/noise.

Separators are background rhythm, not attractions.

### Bridge props

The original exact family remains useful:

- long floor cable;
- short cable with coil/mat;
- shallow puddle;
- quiet trash drift;
- worn mat;
- vertical power drop;
- faded bunting.

They must be assigned deliberately and cannot substitute for floor-wide
utilities or stall-specific integration.

---

## 19. Desktop stairs

Desktop stairs are installed building infrastructure.

Preserve:

- position;
- dimensions;
- side;
- navigation lane;
- hitbox;
- no midpoint floor.

Required layers:

```text
stairs-rear
stairs-core
stairs-front
stairs-light
```

### Ceiling connection

- deep aperture;
- reinforced collar/frame;
- cut beams or patched plates;
- pipes/cables bending around the opening;
- hard disappearance shadow;
- guardrail where appropriate;
- rust/water streaks.

### Wall connection

- rail/post/step cast shadows;
- wall brackets;
- local recess;
- shared pipe/cable wrapping behind;
- restrained light response.

### Landing

- real top plane or grate;
- hard base contact;
- wider directional shadow;
- scraped approach;
- wear/debris;
- bolts/welds;
- clear walking threshold.

Adjacent stall clutter never blocks the navigation lane.

Floor-specific stair treatment:

- Uses/Papers: industrial service access with warm/cyan edge response.
- Manual/Console/Talks: reinforced maintenance stair, junction, conduit, grated
  landing.
- Projects/Games/Travel: mixed repair, drain/dampness, restrained vine/blue/
  amber edge response.

---

## 20. Mobile stairs and intermediate floor

Every mobile floor contains:

- exactly two vertically stacked stalls;
- exactly one continuous full-height stair column;
- one bottom exit;
- one midpoint exit;
- one real midpoint floor supporting the upper stall.

Required registered assets:

```text
mobile-stairs-column
mobile-bottom-landing
mobile-midpoint-platform
mobile-midfloor-top
mobile-midfloor-fascia
mobile-midfloor-underside-shadow
```

Requirements:

- column continues through midpoint;
- midpoint is not a separate scroll target;
- platform and floor are one aligned walkable plane;
- upper stall stands on the visible top plane;
- authored contact and wear occur on that plane;
- fascia is the floor’s front face, not the floor itself;
- underside separates lower space;
- normal orientation is left;
- right-side assembly mirrors stair and platform consistently;
- platform paints above stair core at their connection;
- structural pixels never change on hover;
- all architecture is noninteractive.

Mobile pairs:

1. Uses above Papers; stairs right.
2. Manual above Talks; stairs left.
3. Console above Projects; stairs right.
4. Games above Travel; stairs left.

Mobile-specific integration adds:

- defined wall bay/ledge per stall;
- one utility line spanning both stalls;
- one rear practical fixture per tenant;
- one foreground/contact treatment per tenant;
- dedicated lower-density mobile props;
- deliberate stair/column framing and slight occlusion.

Do not simply shrink desktop clutter.

---

## 21. Wayfinding, dialogs, z-order, and interaction

Wayfinding:

- Up is on the stairs side.
- Down is opposite.
- Every sign targets the correct floor.
- Final underground floor has no Down.
- Below 1024 px, signs sit inside the rail edges.
- At/above 1024 px, signs use available outer gutters without causing overflow.

Relative paint order:

1. environment;
2. rear recess/shadow/conduit;
3. floor/landing top;
4. contact/caster;
5. stalls;
6. stairs;
7. foreground overlap/landing lip;
8. separator;
9. wayfinding;
10. dialog portal.

The dialog is always the highest element.

Hover/focus never:

- changes structural z-order;
- moves a hitbox;
- hides stairs, floor, separator, sign, or adjacent stall;
- changes architecture;
- rescales a stall.

All decorative layers use `pointer-events: none`, including transparent image
regions.

Reduced motion:

- no looping animation;
- no typewriter playback;
- no parallax/motes/smooth scroll;
- representative static states remain readable.

---

## 22. Animation contract

Every stall has:

- exactly two idle frames;
- exactly three hover frames;
- hover 1 → 2 → 3 once;
- frame 3 held while hover/focus remains.

Absolute invariants:

- same canvas;
- same crop;
- same transparent bounds;
- same CSS box;
- same responsive group scale;
- same transform and origin;
- no frame translation;
- no frame rescale;
- no whole-stall bounce;
- no whole-stall brightness pulse;
- same ground anchor;
- same sign;
- same structure;
- same fixed clutter;
- same character root;
- no torso translation left/right.

Characters may articulate:

- head;
- face;
- jointed limb;
- tool;
- held object;
- controlled lean/bow around the fixed root.

Environment effects remain separate declared masks.

The exact character-specific five-frame cards in `ART_DIRECTION.md` are
normative and must be reread before changing animation code or frames.

---

## 23. Generation and processing workflow

### 23.1 Preservation first

Do not regenerate all eight places from prose.

Use:

- approved stall art;
- deterministic layer extraction;
- authored masks;
- new integration assets around/between them;
- localized edits only where the approved art cannot interleave.

### 23.2 New generated asset prompt structure

Every prompt specifies:

- asset’s role and exact z-plane;
- neighboring stall/floor context;
- authored grid and exact canvas;
- flat chroma backing when isolation is required;
- camera/projection;
- palette and color budget;
- visible light source;
- material and age;
- edge/margin rules;
- exact contacts/continuations;
- prohibited detail;
- self-check.

The prompt must say:

- simplified rendering, not simplified layout;
- Uses/Games rendering density is Gospel;
- large flat regions;
- near-black outlines;
- three-tone materials;
- no antialiasing/gradient/painterly AI detail.

### 23.3 Chroma extraction

For opaque isolated props:

- use a flat key color that does not occur in the art;
- keep clean padding except declared connection edges;
- process key to binary alpha;
- despill;
- verify transparent corners and outline integrity;
- snap/quantize to the authored grid and approved palette.

### 23.4 Approval loop

1. Freeze reference and checksum.
2. Define canvas/grid/anchors.
3. Define semantic masks.
4. Generate one asset or one localized edit.
5. Inspect full size.
6. Inspect at actual CSS size.
7. Remove excess color/detail.
8. Validate grid/palette/alpha.
9. Composite in the actual floor.
10. Inspect all relevant z-overlaps.
11. Reject if it works only in isolation.
12. Surface the image path immediately for user review.

The last two accepted render directions prove that fewer colors, stronger
outlines, and larger bounded surfaces are the target. Do not drift back toward
the overdrawn style while generating architecture.

---

## 24. Integration manifest

Create a durable manifest for every floor and stall.

Per stall:

```ts
type StallIntegrationContract = {
  stallId: string
  sourceCanvas: { width: number; height: number }
  authoredPixelScale: number
  groundAnchor: { x: number; y: number }
  rootAnchor: { x: number; y: number }
  torsoLockRegion: string
  staticStructureHash: string
  signMask: string
  rearMask?: string
  frontMask?: string
  contactMask: string
  casterMask: string
  dominantFixture: { x: number; y: number; color: string }
  receiverMasks: string[]
  rearConnections: ConnectionContract[]
  frontConnections: ConnectionContract[]
  desktopPlacement: PlacementContract
  mobilePlacement: PlacementContract
}
```

Per floor:

```ts
type FloorIntegrationContract = {
  floorId: string
  ambientPalette: string[]
  shadowPalette: string[]
  emissivePalette: string[]
  groundLine: number
  utilityNetworks: UtilityContract[]
  rearAssets: AssetContract[]
  midAssets: AssetContract[]
  frontAssets: AssetContract[]
  lightAssets: AssetContract[]
  stairs: StairsIntegrationContract
}
```

Connections record:

- source;
- destination;
- z transition;
- exact alignment point;
- allowed overlap;
- desktop/mobile variant;
- whether a front/rear continuation must match.

This prevents visual tuning from becoming undocumented CSS nudges.

---

## 25. Validation harness

### 25.1 Sprite invariants

Hard failure:

- canvas/crop mismatch;
- frame scale/transform mismatch;
- root movement;
- torso translation;
- structure/sign/fixed prop change;
- changed pixel outside mask;
- broken nearest-neighbor grid;
- unintended partial alpha;
- key-color spill;
- palette explosion;
- motion envelope collision.

### 25.2 Integration invariants

Hard failure:

- missing contact/caster asset;
- contact not aligned to stall support;
- fixture with no visible source;
- receiver light disconnected from source;
- utility discontinuity at a declared connection;
- boundary-crossing prop only behind or only in front when both are required;
- generic wrapper visible as a rectangle;
- architecture covering character/sign/hitbox;
- foreground occluder intercepting input;
- floor/stair asset changing on hover;
- stall brighter than the ambient world without a source;
- horizontal overflow.

### 25.3 Reports

Retain:

- immutable-region byte diffs;
- motion heatmaps;
- root/torso deltas;
- alpha/palette/grid reports;
- onion skins;
- five-frame contact sheets;
- contact and caster overlays;
- light-source/receiver overlays;
- rear/mid/front composite breakdown;
- desktop/mobile screenshots;
- before/after style-normalization comparisons;
- street-level diff.

### 25.4 Chrome matrix

At minimum:

- small phone;
- tall phone;
- 700 px;
- 701 px;
- 1023 px;
- 1024 px;
- 1025 px;
- 1248 px;
- 1440 px;
- 1728 px;
- pointer hover;
- keyboard focus;
- touch;
- reduced motion;
- every dialog;
- every five-frame sequence;
- every Up/Down target;
- no-Down last floor;
- transparent-layer pointer interception;
- mobile midpoint contact;
- desktop stair aperture/landing/lane;
- unchanged street.

Chrome is the final authority for stacking, hitboxes, breakpoints, scrolling,
animation, and visual integration.

---

## 26. Current implementation removals

Before building the proof floor, remove or replace:

- environment-only brightness grading;
- generic `.integrationRear` rectangles;
- generic light trapezoids;
- one shared contact polygon;
- repeated per-stall cable patch;
- global screen-wide mote field;
- automatic identical H-beam insertion as the complete bay solution.

Do not delete responsive, stairs, dialog, hitbox, or animation work that already
passes.

H-beam tiles may be reused as ingredients inside authored structures. They may
not remain the sole visual explanation for installation.

---

## 27. Execution phases

### Phase 0 — freeze and instrument

- Hash approved stall/frame assets.
- Record current anchors and responsive placement.
- Capture street baseline.
- Add integration manifests.
- Confirm existing animation tests still pass.

### Phase 1 — Manual–Console–Talks proof floor

- Establish floor ambient/material palette.
- Design rear wall and ground.
- Produce floor-wide beam, patch panel, tool rail, trench, vent, and fixtures.
- Produce three authored contact/caster systems.
- Produce stall-specific rear/front connections.
- Produce fixture receiver layers.
- Install runtime rear/mid/front/light layers.
- Integrate desktop stairs with the same floor system.
- Capture desktop and representative mobile proof.
- Stop for user visual approval.

### Phase 2 — Uses–Papers

- Produce archive/service utility network.
- Integrate warmth/cold split.
- Produce grease-to-paper environmental transition.
- Produce stall-specific contacts, connections, and receiver lights.
- Integrate stairs.

### Phase 3 — Projects–Games–Travel

- Produce reclaimed leisure/transit utility network.
- Integrate drain, water, roots, arcade power, queue wear.
- Produce stall-specific contacts, connections, and receiver lights.
- Integrate stairs.

### Phase 4 — mobile-specific pass

- Produce defined wall bays and ledges.
- Simplify utility density.
- Build per-pair rear lights and foreground contacts.
- Integrate stair framing/occlusion.
- Verify real midpoint support.

### Phase 5 — ambient behavior

- Add only declared localized loops.
- Couple hover source and receiver.
- Pause offscreen loops.
- implement reduced-motion states.

### Phase 6 — final QA

- Run sprite harness.
- Run integration harness.
- Run full Chrome matrix.
- Run street diff.
- Run TypeScript/lint/build.
- Retain reports and screenshots.

---

## 28. Proof-floor visual approval questions

Before approving Manual–Console–Talks, answer:

1. Do the three places share one ambient world?
2. Does each still retain its unique silhouette and construction?
3. Can the eye trace real power/ventilation/service infrastructure across the
   floor?
4. Does every place touch the floor with its own footprint?
5. Does every practical light affect both the stall and nearby architecture?
6. Does architecture pass behind and in front of each place?
7. Does Console still read as Ed on a rug inside capable chaos?
8. Does Manual remain organized and mechanically precise?
9. Does Talks remain a deep, deadpan video club?
10. Do the stairs belong to the same building?
11. Is any generic rectangular wrapper visible?
12. At thumbnail and actual display size, do the places still read clearly?

Any “no” blocks rollout.

---

## 29. Final definition of done

Bazaar 3 integration is complete only when:

- all eight approved identities remain intact;
- Uses/Games-level flat, chunky rendering is maintained;
- recent accepted render direction is not diluted by new overdrawn assets;
- every floor shares ambient, utilities, ground, and depth;
- every stall has an authored contact and caster;
- every stall has at least one meaningful physical connection;
- every stall has at least one real boundary-crossing depth relationship;
- every practical source has a receiver response;
- environment wear reflects the tenant;
- desktop and mobile stairs are installed architecture;
- mobile upper stalls stand on real midpoint floors;
- dialogs, signs, hitboxes, routes, and animation registration remain correct;
- no decorative layer intercepts input;
- no horizontal overflow exists;
- reduced motion works;
- the street-level diff is empty;
- no audio work exists;
- the production build passes;
- the user accepts the actual in-scene visual result.

The deciding test is simple:

> If a stall still looks like a completed illustration placed over a background,
> integration has failed—even if every technical check passes.

---

## 30. Preserved source and supersession ledger

The complete `gen-places.html` source used during the original design session is
archived at:

- `references/gen-places-source.html`
- SHA-256:
  `e1e5e86ad2a85d341ab5a6a66a44f5466217a5e27aa5c1a37c40d6ef6ae12ab7`

This local snapshot is the reference source. Do not depend on the ephemeral
`localhost:8123` copy.

The snapshot contains older exploratory clauses. The following later approvals
supersede them:

- Travel is the accepted 960-pixel Hearthian composition, never the old frog
  brief.
- Console uses the approved Ed-inspired red-haired keeper with a VR visor,
  cross-legged on the rug; not the old generic goggles/laptop keeper.
- Projects uses the accepted apron-only, visible-mechanics gardener embedded in
  abundant plants; not the earlier isolated clean robot.
- Current full-frame v2 animation families are authoritative. Do not revert
  them to the older proposed rear/keeper/front runtime.
- Approved source canvases differ by stall. A universal 320-by-421 authoring
  canvas does not override the approved full-frame families.
- Animation delivery is exactly two idle frames and three hover frames.
- Mobile uses one continuous full-height stair column with a bottom exit and a
  midpoint exit, not three independent exits.

---

## 31. Phase-one proof floor: exact measured contract

The first proof is desktop Manual–Console–Talks. These measurements describe the
current accepted page at a 1440-by-900 viewport and a canonical displayed market
frame of 1248 by 597 pixels. They are frozen registration, not suggestions.

### Existing placement

- Floor-frame origin: `0,0`.
- Left stair intrusion inside the frame: `x=0..96`. Its outer portion remains
  beyond the frame. Keep the navigation lane clear.
- Existing ceiling band: approximately `y=0..28`.
- Manual wrapper: `x=162..468`, `y=137..544`, approximately `305x407`.
  Approved source frame: `988x1310`.
- Manual–Console separation: `x=468..506`, approximately 38 pixels.
- Console wrapper: `x=506..756`, `y=237..562`, approximately `251x326`.
  Approved source frame: `960x1264`. Console is intentionally lower and more
  forward. Do not lift or horizontally move it.
- Console–Talks separation: `x=756..794`, approximately 38 pixels.
- Talks wrapper: `x=794..1174`, `y=137..544`, approximately `380x407`.
  Approved source frame: `941x1006`.
- Right service margin: `x=1174..1248`.
- Existing lower rail starts around `y=562` and ends near `y=584`.
- Market frame ends at `y=597`.

### Canonical integration grid

- Author every registered full-floor plate on a `416x199` logical grid.
- Enlarge exactly 3x with nearest-neighbor sampling to `1248x597`.
- All registered floor plates use that same transparent canvas, origin, CSS
  box, transform, and responsive scaling.
- One logical art pixel becomes one 3-by-3 output block.
- Exterior and major structural outlines are two logical pixels.
- Interior seams are one logical pixel.
- Bolts occupy one or two logical pixels.
- Draw nothing finer than one logical pixel.
- Structure, contact, caster, and connection plates use binary alpha.
- Only declared light receiver and small steam plates may use a tiny,
  documented stepped alpha set.
- Never use blur or continuous gradients.

### Required authored floor package

The proof floor requires a newly authored environmental base. Do not keep
`mkt-env-2` as wallpaper and attempt to repair it with more overlays.

All full-floor plates below are `1248x597`, except a deliberately cropped local
effect with a manifest anchor:

1. `environment-base.png`: opaque repaired concrete/metal wall plus the true
   oblique floor plane; shared neutrals only.
2. `structure-rear.png`: ceiling run, stair bulkhead, non-identical supports,
   return planes, bolt plates, and recess lips.
3. `utility-rear.png`: continuous tool/power rail, patch panel, ventilation
   line, service drops, and cable tray.
4. `ground-top.png`: grated cable trench, worn steel/concrete plates, curb cuts,
   access hatches, and equipment-anchor holes.
5. `decals.png`: causal oil, abrasion, clean protected rectangles, tape/static
   dust, and removed-rack scars.
6. `utility-mid.png`: utility sections that reappear between or beside stalls
   after disappearing behind them.
7. `front-occluders.png`: sparse floor cable or pipe lip, washers/scrap, and one
   low curb or rail section.
8. `ceiling-front.png`: selected flange, chain, and cable foreground sections
   completing the heavy overhead assembly.
9. `contacts/manual.png`.
10. `contacts/console.png`.
11. `contacts/talks.png`.
12. `casters/manual.png`.
13. `casters/console.png`.
14. `casters/talks.png`.
15. `connections/manual-rear.png`.
16. `connections/manual-front.png`.
17. `connections/console-rear.png`.
18. `connections/console-front.png`.
19. `connections/talks-rear.png`.
20. `connections/talks-front.png`.
21. `receivers/manual-idle.png`.
22. `receivers/manual-hover.png`.
23. `receivers/console-idle.png`.
24. `receivers/console-hover.png`.
25. `receivers/talks-idle-1.png`.
26. `receivers/talks-idle-2.png`.
27. `receivers/talks-hover.png`.
28. `effects/steam-idle-1.png`.
29. `effects/steam-idle-2.png`.
30. `stairs-rear.png`.
31. `stairs-front.png`.
32. `stairs-light.png`.

A single flattened proof composite may be produced to judge the composition
quickly. It must then be decomposed into the locked plates above before runtime
acceptance.

### Shared floor composition

- Build a reinforced stair bulkhead/junction at roughly `x=96..150`.
  The tool/power rail and trench visibly begin here. A vent elbow wraps the stair
  aperture and the landing becomes a grate belonging to the same floor system.
- Make the overhead structure visually substantial at approximately
  `y=48..82`, `x=96..1218`: one authored patched run with trolley/tool rail and
  irregular mounting history, not a repeated tile.
- Carry the rear tool/power rail around `y=104..132`, `x=112..1215`. It passes
  behind Manual, remains readable through the gaps and open wall over Console,
  and terminates inside Talks' wall return.
- Place the ventilation line around `y=146..174`. Its main elbow and drop pass
  behind Console's left rack; a smaller service/coax branch feeds Talks.
- Place a patch panel around `x=520..612`, `y=174..228`, in the open upper-left
  wall region behind Console without colliding with its sign.
- Manual receives only glimpses of an asymmetrical steel service niche around
  `x=145..485`, with mounting ears and a shallow header shadow. Do not place it
  inside a generic box.
- Console is a low occupied equipment alcove around `x=492..780`. Preserve the
  open wall above it. Clamp the existing tall sign post into the shared rail;
  never redraw or replace the sign.
- Talks receives a shallow retail recess around `x=782..1190`, with real top
  and side returns and a dark reveal following the approved outer shelf
  silhouette.
- Run a continuous cable trench from the stair landing through
  `x=105..1225`, approximately `y=548..576`. It is intermittently hidden by
  actual footprints and uses removable grates and junctions.
- Reserve `y=574..597` for the readable floor threshold/fascia and very sparse
  foreground overlap.

### Manual interleaving

- Two asymmetrical rear brackets bolt its existing frame to the bay.
- The shared rail disappears behind the stall.
- One conduit enters the approved upper-right work area.
- A black/orange cable leaves the approved lower-right coil/tool crate, passes
  behind a support, returns in front, and terminates in the floor trench near
  Console.
- The contact plate has three separate islands following the actual pixels:
  left cans/pipe cluster, main cabinet sill, and right toolbox/coil.
- The caster is a compact hard work-light/tool shadow, about 30–36 output pixels
  deep and offset slightly down-left, using two flat shadow values.
- Existing internal lamps remain the sources. Their receiver blocks touch the
  nearby bracket, counter edge, causal oil, and floor.

### Console interleaving

- Add rear wall/floor anchor plates only beneath the approved racks.
- Drop a ventilation hose behind the left stack from the shared rear line.
- Feed one power drop into a visible service plate.
- Clamp the existing sign post into the rail without touching the sign pixels.
- One cable disappears behind the left rack/rug, returns across the front-left
  rug edge, and enters the trench.
- A second short lead crosses forward from the approved right-side power strip.
- Preserve Ed, visor, cross-legged pose, rug, pizza, boxes, coils, servers, and
  cables.
- Small grated pad islands may exist under racks only. Ed remains seated on the
  rug, never on an industrial platform.
- Contact islands follow the left coil/pizza cluster, the irregular rug/Ed
  nest, and the right boxes/coil/power-strip cluster.
- Add one caged bare practical in the rear architecture around
  `x=650..680`, `y=145..175`. Its hard amber receiver reaches a wall plate and
  trench.
- Visor/screen cyan-green is a separate low rectangular receiver affecting Ed,
  rack edges, rug, and trench. It is never a halo around the whole sprite.
- The compact caster projects forward from the rack/rug contact with a small
  lateral offset justified by the practical.

### Talks interleaving

- Rear recess returns appear immediately beyond the approved shelf edges.
- Shared rail/coax enters the left CRT side.
- One bracket ties the booth side to the wall.
- Preserve the approved shelves, pendant, sign, clerk, CRT, bargain bin, and
  standee.
- Bargain-bin wheels cross the floor curb.
- Two to four loose tapes or labels spill beyond the left image boundary into
  the shared floor.
- The standee base receives an exact contact and may be crossed only by a very
  low worn strip.
- Separate contact islands follow the bargain bin/wheels, booth plinth, and
  standee base.
- Existing pendant remains the warm source.
- The CRT creates a low hard rectangular blue-white receiver on adjacent wall
  and floor, approximately `x=800..950`, `y=390..565`.
- Talks idle frame two changes only the lowest CRT receiver band.
- Hover raises the source and receiver together by only 8–12 percent.
- Bin, booth, and standee retain distinct attached caster shapes.

### Proof-floor palette and restraint

- Each new prop asset uses roughly 10–16 colors.
- The entire shared floor system should stay within roughly 20 meaningful
  non-emissive colors.
- Bias the base toward the actual accepted near-blacks:
  `#010204`, `#020811`, `#05070a`, `#090d12`, `#0d1012`, `#111821`,
  `#181c24`.
- Use broad steel/concrete masses, not mid-gray noise.
- Rust, cardboard, and tarnished metal occupy large flat blocks derived from
  the positive renders: muted families near `#332214`, `#573318`, `#60402d`,
  `#814f22`, `#8a5130`, `#aa7e45`.
- Reserve emission colors for Manual amber, Console muted cyan/teal, Talks
  blue-white CRT, and the small warm pendant.
- Receiver values are darker and less saturated than their emitters.
- Usually use shadow, body, and highlight only.
- Rust clusters under bolts and water paths; never scatter uniform speckles.
- Allow at most one sparse checker transition in a true deep recess.
- At a 300-pixel-wide preview, the overhead beam, rail, trench, each tenant
  connection, and the three different footprints must still read. Delete or
  enlarge anything that does not.

### Proof-floor runtime order

From back to front:

1. New environment base.
2. Rear structure.
3. Rear utilities.
4. Tenant-specific rear connections.
5. Correctly placed receiver plates and ground-top plate.
6. Caster plates.
7. Contact plates.
8. Approved five-frame stall art, byte-identical.
9. Mid utilities.
10. Tenant-specific front connections.
11. Sparse front occluders.
12. Stair core and selected ceiling foreground.
13. Between-floor fascia.
14. Wayfinding at its existing high layer.
15. Portalled dialog at the global maximum.

All integration layers have no pointer events. Hover may swap only receiver or
declared local-effect plates. Architecture, ground, utilities, contacts,
casters, stairs, stall position, and stall scale remain pixel-identical.

### Proof-floor blocking tests

- With stall art hidden, the empty floor still reads as three believable,
  differently occupied retrofit bays.
- With integration hidden, all approved five-frame image hashes remain
  identical.
- Every stall has structure behind and in front.
- Every visible emitter has a visible receiver.
- Every stall has one unmistakable seam-crossing utility.
- No generic rear rectangle, repeated H-beam cage, global mote field,
  trapezoid light, or shared polygon shadow remains.
- Endpoints, contacts, casters, sources, receivers, and stair junctions are
  manifest coordinates and automated validation targets.
- At thumbnail scale Manual stays organized and busy, Console stays low and
  chaotic with Ed on the rug, and Talks stays a deep deadpan video club.
- The floor reads as one maintenance/media sector.
- No other floor is migrated before this desktop proof is visually approved.

---

## 32. Current production checkpoint

This section is a mutable work log. Update it after every promoted proof or
approval so a resumed session can continue without reconstructing state.

### Runtime status

- `workshop-desktop` is currently `prototype`, not final.
- Only the desktop Manual–Console–Talks floor uses the authored integration
  renderer.
- Manual, Console, and Talks desktop stall variants are `prototype` only to
  suppress the rejected generic CSS rear/light/front/contact treatment.
- Every other desktop floor and all four mobile compositions remain `legacy`.
- No rollout is authorized until the live workshop proof is visually approved.
- Street level, stall frames, animation behavior, responsive ordering,
  hitboxes, dialogs, navigation, and stair core geometry remain frozen.

### Concept evolution

- Concept A, full integrated relationship study:
  `scripts/bazaar3/sources/integration/workshop/concept-a-integrated.png`
  (`9eb4e960ec3dbbc31f2f29489dbc754518025756e9051aad99509ee1beb4eeaf`).
  It proved the physical thesis but altered stall pixels and was too detailed.
- Concept B, empty environmental study:
  `scripts/bazaar3/sources/integration/workshop/concept-b-environment.png`
  (`416515cce19e8f56ef71b91f4f2054f79960741475b005c4139d11225e38f143`).
  It established quiet wall, rail, vent, and trench masses.
- Concept C, exact-aspect registered environment:
  `scripts/bazaar3/sources/integration/workshop/concept-c-environment-registered.png`
  (`623884515e09c27e8d79105ddf6d4d60bdbd4fc1ca44c23c84eff955bda0d583`).
  It established the 1248:597 composition but painted a duplicate staircase.
- Concept D, tenant-specific relationship study:
  `scripts/bazaar3/sources/integration/workshop/concept-d-tenant-connections.png`
  (`6ebdf424f83d57169cdad25149a8bde48f458e58c6c22afc0a226bb838269859`).
  It is the relationship authority for boundary-crossing utilities.
- Concept E, current neutral base source:
  `scripts/bazaar3/sources/integration/workshop/concept-e-environment-stair-aperture.png`
  (`dad2aeb331027382793584813b3e92a63545e296ec4b3df42a9ab25924e40676`).
  It removes the duplicate steps and leaves the approved stair core a dark
  aperture, collar, landing, vent turn, and trench start.

Concept images are design sources only. None may replace an approved stall
frame.

### Exact-stage prototype package

The current generator is:

- `scripts/bazaar3/build-workshop-integration.mjs`

It converts Concept E to the `416x199 -> 1248x597` registered stage and
deterministically authors the boundary layers. Current output root:

- `public/images/bazaar3/assets/integration/floors/workshop-desktop/`

Current package:

- one opaque 16-color environment base;
- Manual, Console, and Talks rear connections;
- Manual, Console, and Talks front connections;
- Manual, Console, and Talks receiver plates;
- Manual, Console, and Talks unique contact plates;
- Manual, Console, and Talks unique caster plates;
- one mid-utility plate;
- one sparse front-occluder plate;
- stair rear and stair front plates.

All 20 delivered files are exactly `1248x597`. Every transparent prototype
plate has alpha values `{0,255}` only. Every deterministic plate is authored on
the logical grid and enlarged exactly 3x nearest-neighbor.

Current environment base:

- `public/images/bazaar3/assets/integration/floors/workshop-desktop/environment-base.png`
- SHA-256:
  `b3ca7208d6e50455c091ce5dafff8e4f0540ebb078fd8e226c071b6576973cc4`

Current exact approved-stall layer-order proof:

- `scripts/bazaar3/reports/integration/workshop/proof-e-runtime-layer-order.png`
- SHA-256:
  `7def779901c4d0c714fc60eab6f91217128f437a6df3694d0d0b2dac0e3835b6`

Current generated-asset report:

- `scripts/bazaar3/reports/integration/workshop/integration-assets.json`

### Current technical validation

- Biome passes for the integration runtime and build scripts.
- TypeScript `--noEmit` passes.
- Existing Bazaar 3 v2 five-frame verification passes.
- Workshop integration verification passes 43/43 checks across all 20 assets,
  six frozen idle-frame hashes, exact registration, 3x blocks, palette/alpha
  policy, package completeness, manifest URLs, pointer safety, and transform
  locks:
  `scripts/bazaar3/reports/integration/workshop/verification.md`.
- Production `next build` passes.
- The local route returns all 20 declared workshop assets.
- Chrome visual matrix is still required before promotion from `prototype` to
  `ready`.

---

## 33. Manual regeneration lock and reusable geometry gate

This section records the latest explicit Manual direction and therefore
supersedes every older Manual statement that conflicts with it, including the
frozen Manual master, the four-arm/pedestal description, and any prior
composition that places the robot on the counter. The older Manual image may
still inform the cheerful service personality and organized workshop inventory,
but it is no longer anatomy, support, placement, or rendering authority.

### 33.1 Manual character and placement override

Manual is reimagined as an **original Codsworth-like floating domestic-service
orb**, interpreted through the Bazaar rendering law rather than copied from an
existing franchise design.

The robot must have:

- one compact round or ovoid mechanical torso;
- exactly **three eye stalks**, visibly connected to the torso;
- exactly **three articulated service arms**, visibly connected to the torso;
- three different useful end-effectors or tools appropriate to a courteous
  repair attendant;
- one central downward thruster;
- a readable open-air gap below the thruster;
- no pedestal;
- no legs;
- no hidden pole, countertop mount, table support, or other physical support;
- no independent floating eyes or arms;
- a cheerful, capable, domestic-service character rather than a combat,
  industrial-loader, or humanoid character.

The robot floats in the **rear work aisle behind a real foreground counter**.
It never floats on top of the counter. The counter is a substantial,
independent architectural/display object between the customer/camera and the
robot. Its front face and shallow top band partially occlude the robot's lower
thruster assembly. That occlusion is required depth evidence, not an optional
decorative overlap.

The thruster's hard-edged light/shadow receiver belongs on the rear-aisle floor
behind the counter. It must never appear on the countertop. Enough of the
receiver may remain visible through the gap beneath or around the counter to
prove that the robot occupies the rear aisle and is unsupported.

Manual's shop remains organized rather than sterile:

- tools, sorted parts, trays, bins, lamps, and repair stock have deliberate
  places;
- one or more of the three arms may work independently;
- the counter remains useful display/work furniture rather than a robot base;
- the individual `manual` sign remains readable and structurally mounted;
- wall brackets, power, task lighting, wear, and floor contact connect the
  workshop to the bazaar architecture;
- visual density must still obey the Uses/Games restraint: large flat masses,
  few colors, strong outlines, chunky three-tone materials, and no AI
  microtexture.

### 33.2 Uses camera is absolute

The Uses camera is an immutable construction rule, not a stylistic suggestion.
For Manual and every future regenerated stall:

- the view is a front-facing elevation with shallow oblique top information;
- projection is parallel;
- every post, rack upright, wall edge, and character centerline is vertical;
- the principal counter face, ceiling beam, shelf runs, and floor seams are
  long horizontals;
- the stall has zero rotation;
- parallel edges never converge toward a vanishing point;
- no side wall may open as a perspective wedge;
- counter, shelf, crate, and floor tops are shallow compressed bands only;
- the counter front remains dominant over its top surface;
- no deep trapezoid, deep ellipse, diagonal shop shell, or three-quarter
  perspective room is permitted.

“Reimagine from scratch” grants freedom over the robot's original mechanical
design and the shop's tenant-specific details. It never grants freedom to move
the camera, rotate the bay, change the registered layout, alter the shared
scale, or abandon the Uses projection.

### 33.3 Mandatory pre-generation geometry guide

No future full-stall generation starts from prose alone. Before the creative
render, create and approve a low-color geometry guide at the exact target
canvas and authored pixel grid.

The guide must declare:

1. exact canvas bounds, authored grid, and delivery scale;
2. one robot centerline and fixed torso/root box;
3. three eye-stalk attachment zones and three arm attachment zones;
4. robot rear-aisle depth and the visible open-air thruster gap;
5. rear-aisle floor receiver area;
6. foreground-counter front face, shallow top band, and occlusion mask;
7. long ceiling-beam and counter horizontals;
8. vertical posts, racks, wall rails, and sign support;
9. rear wall, rear aisle, counter, foreground spill, and floor-contact planes;
10. sign, lamp, organized-stock, and negative-space reservations;
11. required links into the shared bazaar architecture;
12. zones that animation may alter and all zones that must remain immutable.

The guide must be composited with the Uses reference and the actual target
floor registration before generation. The image-generation prompt must include
the guide and explicitly require the renderer to preserve its geometry. A
beautiful image that departs from the guide is a rejection, not a candidate
for later correction.

### 33.4 Mandatory post-generation perspective-verification gate

Every generated stall must pass a perspective gate before anatomy, lighting,
palette, or atmosphere is judged. This order prevents an attractive but
geometrically invalid image from becoming a new reference.

The harness must produce a review overlay showing:

- the generated image beneath the original geometry guide;
- sampled vertical construction lines;
- sampled long horizontal construction lines;
- top-band depth measurements;
- robot centerline and root box;
- counter front/top boundary and required thruster occlusion;
- rear-aisle receiver bounds;
- silhouette and target-floor registration bounds.

Reject automatically or manually when any of these is true:

- a key upright differs from canvas vertical by more than approximately one
  degree;
- a key beam, counter face, shelf run, or floor seam differs from horizontal
  by more than approximately one degree;
- nominally parallel line families visibly converge or diverge;
- the bay is rotated, has perspective side walls, or implies a vanishing point;
- a shallow top band exceeds the existing camera ratios in section 6.2;
- the counter no longer occludes the lower thruster;
- the thruster receiver lands on the countertop or foreground plane;
- the robot touches a counter, pedestal, pole, leg, or hidden support;
- the visible anatomy count is not exactly three connected eye stalks and
  exactly three connected articulated arms;
- the robot torso/root, counter, sign, structure, or canvas scale drifts from
  the guide;
- the result cannot register over the target floor without rotation,
  non-uniform scaling, or corrective perspective transforms.

Only after the perspective gate passes may the normal checks evaluate camera
scale, anatomy, inventory, palette count, 3x pixel blocks, alpha/key quality,
flat shading, light sources and receivers, material restraint, animation
registration, and actual-size floor integration.

This geometry-guide → render → perspective-overlay → reject-or-continue loop is
mandatory for every later stall. Manual is the calibration case for the whole
Bazaar 3 regeneration pipeline.

### 33.5 Composite concept versus runtime assets

An integrated Manual render with wall, floor, counter, robot, lighting, and
occlusion is a **design master only**. It exists to settle the complete spatial
relationship. The flattened rectangle is never pasted into Bazaar 3.

After approval, reconstruct or extract the approved composition into
pixel-registered runtime layers:

1. continuous shared floor/wall/beam environment;
2. Manual rear bay and fixed infrastructure;
3. static counter, sign, stock, and robot structure where appropriate;
4. tightly bounded animated eye/head/arm/tool patches;
5. thruster and work-light receiver plates;
6. rear-aisle contact/cast-shadow plates;
7. foreground counter face, lip, stock, or cable occluders.

All layers use the same canvas, origin, scale, camera, and geometry guide.
Layer separation must reproduce the approved composite without introducing a
rectangle boundary or changing the robot's registered root.

### 33.6 Rejected Manual evidence

The following concepts are negative references and must not seed another
generation:

- The pedestal/on-counter family, including
  `/Users/sospedra/.codex/generated_images/019fa3c5-777c-79b2-bf6b-0f8e616e8fdc/call_LtClUNFPefaMLYRZ1NkpupiN.png`
  and
  `/Users/sospedra/.codex/generated_images/019f9eb3-341d-7870-be61-60ed831f4d88/call_bBr9K7wXVSQjVLTbgOOc5dRY.png`,
  is rejected because the robot reads as attached to, supported by, or
  hovering over the countertop instead of floating in the rear aisle behind
  it.
- The rotated perspective-bay concept,
  `/Users/sospedra/.codex/generated_images/019f9eb3-341d-7870-be61-60ed831f4d88/call_inYdRn0aej35ClXx2I4LerZP.png`,
  is rejected because the counter rotates and recedes, line families
  converge, the camera is too top-down, side walls form perspective wedges,
  and top surfaces become deep trapezoids.

Do not salvage those compositions by repainting details. Restart from the
approved geometry guide whenever a render fails the camera or depth-placement
gate.

### 33.7 Current calibration candidate and executable gate

The current review candidate is Manual candidate 4. It is not promoted to a
runtime or approved master until human art review accepts it.

- preserved ImageGen source:
  `scripts/bazaar3/manual-camera/candidates/manual-candidate-4/source.png`
- exact normalized review delivery:
  `scripts/bazaar3/manual-camera/candidates/manual-candidate-4/normalized-960x1264.png`
- source SHA-256:
  `3aa5c9ec1239acee7e64ac8a4ac08bc9fb58206d1b2daf5a947f78f5c8b11f43`
- normalized SHA-256:
  `19b977fb2e427c83304a93678a95387b3bb0203a9ac6f8c8f668b0a08511fc7b`

The canonical prompt is:

- `app/bazaar3/prompts/manual-integrated-bay-camera-locked.md`

The executable geometry and delivery gate is:

- `scripts/bazaar3/manual-camera/build-guide.mjs`
- `scripts/bazaar3/manual-camera/verify-camera.mjs`
- `scripts/bazaar3/manual-camera/normalize-delivery.mjs`
- `scripts/bazaar3/manual-camera/build-manual-registration-overlay.mjs`
- `scripts/bazaar3/manual-camera/verify-five-frame.mjs`
- `scripts/bazaar3/manual-camera/five-frame-manifest.schema.json`
- `scripts/bazaar3/manual-camera/manifests/manual-calibration.json`
- `scripts/bazaar3/manual-camera/five-frame-self-test.mjs`
- `scripts/bazaar3/manual-camera/README.md`

Candidate 4 currently passes the machine-checkable delivery stage:

- exact `960x1264` canvas;
- exact authored `320x421` logical grid enlarged 3x, with the required copied
  final row;
- 100% uniform `3x3` blocks in the authored area;
- 16-color normalized derivative;
- front-facing camera;
- required horizontal and vertical architecture families;
- zero suspicious long architectural diagonals;
- zero plausible convergence pairs;
- source file unchanged by normalization.

Machine success is not art approval. Human review must still accept anatomy,
identity, rear-aisle floating read, counter/thruster occlusion, light
source/receiver logic, Uses/Games rendering character, readable tools, and the
absence of malformed generation artifacts.

The Manual positioning overlay is:

- `scripts/bazaar3/manual-camera/artifacts/manual-design-registration-overlay-960x1264.png`

The generic five-frame verifier is intentionally strict and manifest-driven.
It requires exactly two idle and three hover states and hard-fails missing
frames, nonmatching dimensions or final-row policy, nonbinary alpha, broken
3x blocks, palette-family drift, changes outside motion masks, immutable
structure changes, sign/counter/floor/background changes, torso/root/shoulder
root changes, distributed-anchor drift, whole-frame translation, and
scale/crop evidence. It emits a contact sheet, onion sheet, motion heatmap,
hashes, and JSON/Markdown evidence.

Its regression test proves that a one-logical-pixel whole-frame shift, a
one-logical-pixel-per-edge inset/scale, and a one-logical-pixel sign/structure
mutation all fail:

- `scripts/bazaar3/manual-camera/reports/five-frame-self-test/self-test.md`

The current Manual five-frame report correctly remains red because only the
design master exists; four animation frames are not fabricated or silently
substituted:

- `scripts/bazaar3/manual-camera/reports/manual-five-frame-calibration/five-frame-audit.md`

The reusable generation loop is:

1. freeze a stall-specific written identity and behavior card;
2. author an exact low-resolution geometry guide;
3. generate one complete design master against the guide and actual Gospel
   references;
4. run the camera gate before judging surface beauty;
5. run a controlled rendering-only restyle when geometry is correct but the
   finish is too noisy;
6. derive exact dimensions, palette, and 3x blocks without stretching;
7. rerun the camera gate on the derived image;
8. require human visual approval;
9. freeze the accepted master hash and split immutable environment, character,
   effect, receiver, and foreground-occluder plates;
10. generate only bounded character/effect cels for idle and hover motion;
11. composite against byte-identical static plates;
12. hard-fail any scale, crop, torso/root, shoulder-root, sign, structure,
   counter, floor, light-receiver, or outside-motion-mask change;
13. review contact sheets, heatmaps, onion skins, and actual Bazaar 3 desktop
   and mobile captures before promotion.
