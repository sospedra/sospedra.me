# Bazaar 3 — Consolidated Underground Art Bible

Last reviewed: 2026-07-27  
Status: current planning authority; implementation is not visually approved.

This is the short, current source of truth for Bazaar 3. It consolidates the
approved design conversation, `ART_DIRECTION.md`, `INTEGRATION_BIBLE.md`, the
preserved `gen-places` declarations, the mounted runtime, the asset audits, and
the latest palette and lighting proposal.

The longer documents remain useful evidence, but this file resolves their
contradictions. When an older document conflicts with this file, this file
wins. A later explicit user instruction wins over every document and must be
recorded here before further production work.

The readable companion is:

- `public/bazaar3-art-bible.html`
- local URL: `http://localhost:3000/bazaar3-art-bible.html`

---

## 1. North star

Bazaar 3 is a controlled evolution of the approved Bazaar 2 underground
market, not a redesign.

The eight stalls must remain unmistakably different places made by different
inhabitants. The work is to make them feel physically installed inside one
old underground bazaar through shared physical laws:

- one camera and scale;
- one semantic master palette;
- one value and lighting grammar;
- credible floor contact;
- real support and attachment;
- utilities that continue across stall boundaries;
- tenant-specific wear and material consequences;
- light that touches both stall and environment;
- architecture that passes behind and in front;
- installed stairs and real landings;
- responsive tiled/modular environment construction.

The deciding test is:

> If a stall still looks like a complete illustration placed over a
> background, integration has failed—even if every technical test passes.

The signature visual move is **physical interleaving**: a utility, light,
shadow, floor mark, plant, cable, landing, or structural element crosses the
stall/environment seam in a way that explains function or history.

---

## 2. Authority

Descending authority:

1. Latest explicit user instruction.
2. This consolidated master plan.
3. Approved Bazaar 2 working-tree rendering and interaction baseline.
4. `app/bazaar3/ART_DIRECTION.md`.
5. Approved stall declarations preserved in
   `app/bazaar3/references/gen-places-source.html`.
6. `app/bazaar3/INTEGRATION_BIBLE.md`, except for sections explicitly demoted
   below.
7. Uses as primary camera/rendering Gospel.
8. Games as secondary rendering and handmade-construction Gospel.
9. Approved Projects C3, Console C4, and Hearthian Travel C7 compositions as
   positive identity/layout references.

Never silently promote an image because it is mounted in the runtime. Runtime
presence and human art approval are different states.

### Demoted historical material

The following are evidence and negative lessons, not current design authority:

- the fixed `1248×597` workshop environment and its local receiver/caster/
  contact plates;
- `INTEGRATION_BIBLE.md` sections 31–32 wherever they describe that workshop
  prototype as the route forward;
- the old four-arm/pedestal Manual family;
- rotated, perspective, top-down, or counter-mounted Manual concepts;
- generic CSS rear rectangles, repeated light trapezoids, shared contact
  polygons, whole-floor gradients, and global color grades;
- any pre-approval render with dense AI microdetail or unrelated props.

The deterministic validation tooling from failed experiments may be reused.
Their visual design may not.

---

## 3. Frozen scope

### Street level

Street level is completely frozen.

Do not regenerate, relight, recolor, reposition, re-layer, or otherwise edit:

- buildings;
- doors;
- signs;
- vehicles;
- shadows;
- background;
- props;
- street interactions.

Do not replay historical street-level `u` nudges. Their accumulated Bazaar 2
result is the baseline. Final QA requires a same-viewport street diff.

### No audio

There is no audio work in Bazaar 3.

### Protected interaction

Preserve:

- stall destinations and dialog content;
- the top-level dialog portal;
- fast character-by-character dialog text;
- keyboard, pointer, and touch access;
- stall/stair hitbox ordering;
- current responsive DOM order;
- scroll snapping;
- Up/Down targets;
- no Down sign on the last underground floor;
- current stair navigation lanes;
- decorative layers with `pointer-events: none`.

The dialog is always the highest visible layer.

---

## 4. Current runtime truth

The current route is useful evidence, not an approved final integration.

### Mounted stall families

| Stall | Mounted family | Canvas | Current status |
|---|---|---:|---|
| Uses | `uses/frames` | 1147×904 RGBA | 5 frames; primary Gospel |
| Papers | `papers/frames` | 1056×1309 RGBA | 5 frames; identity approved |
| Manual | `manual-v3/frames/idle-1.png` | 960×1264 RGB | one opaque static calibration candidate; human approval pending |
| Console | `console-v2/frames` | 960×1264 RGBA | 5 frames; approved Ed composition |
| Talks | `talks/frames` | 941×1006 RGBA | 5 frames; identity approved |
| Projects | `projects-v2/frames` | 960×1264 RGBA | 5 frames; approved C3 |
| Games | `games/frames` | 1131×1325 RGBA | 5 frames; secondary Gospel |
| Travel | `travel-v2/frames` | 960×1264 RGBA | 5 frames; approved C7 Hearthian |

Technical presence of five files does not by itself prove that an animation is
visually accepted. Manual has only one mounted frame and is deliberately
static.

### Known runtime contradictions

- Manual candidate 4 is mounted but the written approval record still says
  human review is pending.
- Manual is opaque RGB, so rear light/integration plates cannot illuminate
  through it.
- The prefetcher still points Manual at the obsolete family instead of
  `manual-v3`.
- `workshop-desktop` is marked `prototype`.
- Only the rejected workshop `environment-base.png` is registered as the
  floor-wide stage.
- Fifteen local Manual/Console/Talks plates are mounted, while most of the
  generated full-floor package is not.
- All other desktop and all mobile authored integration packages remain
  legacy.
- Current runtime tints are semantically arbitrary and must not become palette
  authority.

### Current environment ingredients

- `mkt-env-1.png`, `mkt-env-2.png`, `mkt-env-3.png`: responsive tiled baseline
  and material evidence, currently over-graded by CSS.
- `slabs/slab-{pipes,cables-a,cables-b}{,-bg}.png`: inter-floor separator
  pairs.
- `h-beam-horizontal.png`, `h-beam-vertical.png`, `h-beam-joint.png`:
  useful geometry, not a complete integration solution.
- Existing desktop and mobile stair cores: protected geometry and interaction
  baseline; palette may be harmonized later.

---

## 5. Creative thesis

The underground Bazaar is a hidden reclaimed night market occupying the
decaying service infrastructure of an older facility.

It combines:

- Japanese back-alley intimacy;
- Blade Runner noir;
- CRT and lo-fi technology;
- improvised Fallout-like repair;
- rusted industrial architecture;
- warm decay;
- playful inhabitants rendered with serious environmental logic.

The market feels old but active, illicit but inviting, repaired rather than
restored, cluttered but graphically readable.

It must not feel like:

- a mall;
- a row of matching storefronts;
- eight collectible cards;
- unrelated sprites over wallpaper;
- one global cyberpunk tint;
- a clean commercial UI;
- a fixed concept-art illustration that cannot respond to the viewport.

Integration never means uniformity. Stall widths, silhouettes, materials,
signs, lettering, clutter density, light sources, symmetry, and enclosure stay
different.

---

## 6. Rendering Gospel

Uses is the absolute camera and rendering reference. Games is the secondary
reference for kid-built construction, readable clutter, and distinct color.

Every new or re-rendered sprite must use:

- genuinely low-resolution authorship;
- flat bounded color regions;
- strong near-black silhouette and structural outlines;
- chunky square pixel clusters;
- normally three tones per material;
- large connected shadow masses;
- sparse hard highlights;
- nearest-neighbor enlargement only;
- readable silhouette at actual CSS size;
- deliberately quiet surfaces.

### Less is more

Simplify rendering, never the approved layout or identity.

Establish in this order:

1. complete stall silhouette;
2. character silhouette;
3. sign;
4. primary counter/rug/platform/machine;
5. two or three major clutter groups;
6. visible light source;
7. ground footprint.

Only then add selected detail around faces, hands, signs, tools, held objects,
and current action.

Reject:

- the classic overdrawn AI look;
- painterly pseudo-pixel art;
- smooth gradients and airbrushed glow;
- antialiased fringes;
- every surface covered in scratches;
- random cables, tubes, mechanisms, or colored pixels;
- fine botanical fronds;
- deep perspective rooms;
- high-resolution illustration pixelated afterward;
- details that disappear at display size;
- material noise used instead of material design.

### Material rule

Most materials use:

1. deep shadow;
2. dominant body;
3. controlled highlight.

A fourth value is reserved for actual emission, severe wear, or a focal
reflection.

### Pixel-grid delivery

When a new master uses the standard grid:

- authored canvas: `320×421`;
- exact enlargement: 3× nearest-neighbor;
- artwork result: `960×1263`;
- delivery: append one fully transparent row to reach `960×1264`;
- never stretch or interpolate.

Approved legacy families retain their existing canvas dimensions. Do not
normalize every stall to one canvas.

---

## 7. Camera, scale, and depth

Camera is front-facing shallow axonometric / frontal oblique RPG projection:

- parallel projection;
- no vanishing point;
- no lens distortion;
- zero stall rotation;
- all posts, racks, walls, and character centerlines vertical;
- all primary counter faces, beams, shelf runs, and floor seams horizontal;
- shallow compressed top bands;
- no deep ellipse or trapezoid;
- no perspective side-wall wedge.

Uses’ countertop angle is Gospel.

Round and horizontal top planes normally have about a `0.2` height-to-width
ratio. Counter fronts remain visually dominant over their top surfaces.

Shared depth sequence:

1. back wall;
2. rear infrastructure/recess;
3. rear stall structure;
4. character plane;
5. counter/display plane;
6. ground contacts;
7. foreground spill/lobby.

The stalls occupy the rear of each market floor. The lower/front portion is a
shared lobby/aisle, not part of the stall illustration. Props must not be
cropped at the lobby boundary.

Do not confuse:

- scene placement units: `1u = 1vw` horizontally and `1u = 1svh` vertically;
- source-design units, commonly `1 source u = 8px`.

Historical incremental `u` edits are superseded by the current rendered
baseline and reviewed screenshots.

---

## 8. Master palette Proposal A

Harmonization means exact shared swatches, not global desaturation.

The library contains 64 colors in semantic ramps. A normal stall selects about
18–28. A new prop normally selects 10–16. Architecture stays primarily in the
neutral ramp and borrows a tenant hue only where light or material physically
crosses the boundary.

This 64-color proposal supersedes the earlier 66-color exploratory board. It
is the one current proposal, but it still requires explicit user approval
before becoming a production palette.

### N — ink / steel

`#020307 #080c12 #111923 #1c2731 #2b3741 #414c55 #606970 #898e8d`

### C — cream / paper

`#4b4236 #786852 #a38b69 #cfad7e #edd09c`

### W — wood / leather

`#1d100a #321a0f #4b2816 #6b391c #925022 #bd7133`

### R — red lacquer

`#361015 #5c171c #882225 #b83932 #dd6048`

### P — violet / purple

`#171221 #2a1e38 #443153 #674870 #966d94`

### B — blue / cyan

`#071421 #0a2942 #0d486d #126e9b #1f9cc8 #4bd2e1`

### T — teal

`#071c1d #0e3534 #165652 #267c73 #56b4a4`

### G — foliage

`#10180e #1e2d14 #31461a #4b6220 #6b7e2d #95a247`

### K — dusty rose

`#2e1723 #50283b #784159 #a95f77 #d68b9a`

### A — amber emission

`#4a280d #7b4514 #ad6a1e #df9e32 #ffd26b`

### S — skin

`#2f1915 #542b22 #80442f #ad6744 #d18d5a #efbd82`

### E — light cores

`#ffe3a1 #8be9e7`

### Stall allocations

- Uses: W + R dominate; P/K canopy accents; tiny B/T electronics.
- Papers: T structure; C paper; B/cold core hologram; restrained W.
- Manual: N steel; W brass/wood; C sign; A work lamp.
- Console: N servers; W cardboard; R hair/rug; T/B visor and screens.
- Talks: W mahogany; C sign; S clerk; B/T CRT; restrained R.
- Projects: G foliage; W soil/terracotta; N robot; P/K creatures; A bulbs.
- Games: W handmade structure; B arcade; C/S children; A bulbs.
- Travel: W/C booth; N/B Hearthian and deep interior; A lanterns; tiny P/B
  navigation accents.
- Architecture: 80–90% N; 5–10% W rust; local receiver colors only.

The palette must be applied semantically by material. Blind nearest-color
replacement is prohibited.

---

## 9. Shared lighting grammar

Darkness is not integration. Lighting must be causal, shared, and authored in
palette colors.

### Common value ladder

| Role | Approximate L* |
|---|---:|
| outline / deepest occlusion | 2–5 |
| deep shadow | 8–12 |
| ambient shadow | 17–22 |
| material body | 29–36 |
| top/key plane | 43–52 |
| selected highlight | 58–68 |
| emissive core | 82–92 |

### Shared environmental light

- Cool low-chroma underground ambient comes from upper/front-left.
- Ambient is a fill, not a visible glow.
- Proposed calibration direction: a weak aisle/service key casts hard shadows
  down-right at roughly 2:1. The exact lateral component is not locked until it
  is tested beside Uses.
- Undersides/deep recesses are two material steps darker.
- Right/far faces are one step darker.
- Front faces use the material base.
- Upward shallow planes are one step brighter.
- Only selected metal/plastic edges reach another step.
- Background architecture remains one material step below foreground stalls.
- The lobby stays open; local spill enters only the rear 8–12u.

### Local source chain

Every illuminated treatment must contain:

1. a visible source;
2. receiver pixels on the stall/character;
3. receiver pixels on adjacent shared architecture;
4. a matching contact/cast response.

Use at most three hard light bands:

1. source core;
2. immediate/direct receiver;
3. weaker spill receiver.

No blur, radial gradient, translucent wash, `color-mix()`, arbitrary opacity,
or global saturation/brightness filter. Light pixels are exact master-palette
colors. Occlusion by counters, racks, signs, foliage, and bodies must fragment
receiver shapes.

Emitter cores occupy roughly less than 1% of a stall. Direct receiver colors
are 1–2 material steps above the same unlit material, remain below the source,
and usually cover less than 8% of the sprite.

### Stall source map

- Uses: two lanterns plus hanging bulb; compact warm pools on chef, counter,
  posts, stools, and nearby metal.
- Papers: cyan hologram dominant; weak warm strip secondary; cyan reaches book,
  hands, sill, paper edges, and adjacent wall.
- Manual: upper work lamp; amber reaches dome, eye-stalk rims, tools, arms,
  counter, bracket, and rear aisle.
- Console: visor/laptop/selected rack screens in teal-cyan plus one weak amber
  practical; receivers touch Ed, hands, knees, rug, racks, wall plate, and
  trench.
- Talks: warm pendant plus localized rectangular CRT blue-white; separate
  receivers, never two huge overlapping slabs.
- Projects: warm bulbs fragmented by foliage, one violet seed light, tiny
  dusty-rose creature response.
- Games: arcade cyan on siblings, hands, cabinet, and threshold; warm bulbs on
  sign/post/top only.
- Travel: properly bright amber lanterns on face, suit, counter, and posts;
  restrained cool navigation light only when a visible instrument causes it.

### Quantization protection

The current flat Console, Projects, and Travel conversions lost their small
emissive pixels. The processing harness must reserve semantic source/receiver
masks before quantization. Frequency-only quantization is prohibited.

---

## 10. Integration system

Integration is assembled from responsive modules and registered layers, not
one fixed full-floor illustration.

### Environment requirements

- Preserve responsive tiling.
- Wall, floor, fascia, beam, stair, and utility modules share palette, pixel
  density, camera, and plane-lighting law.
- The foreground lower floor is a lobby/aisle.
- Stalls sit in credible rear bays.
- No prop is clipped by a module edge unless the edge intentionally occludes
  it.
- No random decorative pixels.
- Every prop explains use, support, power, drainage, traffic, repair, or
  ownership.

### Per-stall physical package

As needed:

```text
stall-rear
stall-character
stall-effect
stall-front
stall-emissive/receiver
stall-contact
stall-caster
stall-rear-connection
stall-front-connection
```

### Shared floor package

Responsive/tileable equivalents of:

```text
wall/base modules
ceiling/beam modules
rear utility network
ground/lobby modules
mid utilities
front occluders
receiver-light modules
decals/wear
stairs rear/core/front/light
separator top/fascia/background
```

### Boundary crossing

Every stall needs at least one meaningful seam-crossing relationship:

- a cable disappears behind equipment and returns in front;
- a pipe feeds the stall;
- a vine wraps shared infrastructure;
- a floor drain receives water;
- a rug passes under an external cable;
- a rack bolts to a shared plate;
- a platform wedges into the floor;
- light crosses onto shared wall/floor;
- tenant wear continues outside the PNG.

### Grounding

Every stall has:

- exact root/ground anchor;
- separate compact contact islands at true support points;
- a simplified caster tied to a visible source;
- tenant-specific floor response;
- no generic ellipse or common polygon.

Architecture should occasionally pass in front, but never cover a face, sign,
action, hitbox, or navigation lane.

---

## 11. Floor narratives

### Archive/service floor — Uses + Papers

- Cold upper industrial/archive infrastructure; warm active stall level.
- Continuous cable tray, meter/support, drain, mounting scars.
- Uses contributes heat, grease, soot, scrape, lantern wiring.
- Papers contributes dry dust, paper accumulation, archive conduit, hologram
  light.
- Material and dirt transition gradually between them.

### Workshop/media floor — Manual + Console + Talks

- Dense repaired maintenance and obsolete-media sector.
- Shared power/tool rail, patch panel, cable trench, ventilation, service
  drops, floor wear.
- Manual remains organized, floating behind its counter.
- Console remains a low rug-based technical nest.
- Talks remains a deep video-club recess.
- The rejected fixed-floor prototype is not reused; this floor must be rebuilt
  from responsive modules under the new palette and lighting law.

### Reclaimed leisure/transit floor — Projects + Games + Travel

- Patched timber/scrap metal, drainage, dampness, transit markings, utilities.
- Projects contributes water, roots, moss, and plants.
- Games contributes improvised power, cheap wood/plastic, arcade light.
- Travel contributes queue wear, luggage marks, transit arrows, lantern light.

---

## 12. Stall Gospel and behavior

### Uses — severe ramen curator

Lock:

- stern chef;
- upright folded arms;
- working ramen stall;
- stools/menu/cooking props;
- individual sign and warm lantern identity.

Behavior:

- Idle 1: silent assessment.
- Idle 2: slow blink plus tiny finger/eyebrow adjustment.
- Hover 1: eye contact and slight chin rise.
- Hover 2: one arm unfolds; two fingers indicate stool/menu.
- Hover 3: restrained nod and open palm—“Omakase.”

Integrate through grease, soot, scrape, power, compact stool contacts, warm
receiver light, and one foreground seam crossing.

Never soften the character into generic friendliness or standardize the stall.

### Papers — holographic archivist

Lock:

- smiling scholarly hologram;
- book and glasses;
- archive/news-kiosk context;
- individual sign;
- composed posture.

Behavior:

- Idle 1: calm reading.
- Idle 2: scanline/glasses/page-edge flicker; body anchored.
- Hover 1: signal stabilizes and looks up.
- Hover 2: book opens; finger finds passage.
- Hover 3: book is offered.

Integrate through archive conduit, paper accumulation, rack-wheel contact,
cyan receiver light, and shelf depth.

Never replace the book with a screen or wash the whole booth cyan.

### Manual — courteous floating service robot

Lock:

- original Codsworth-like but non-copying floating domestic-service orb;
- exactly three connected eye stalks;
- exactly three connected articulated arms;
- compact round/ovoid torso;
- one downward thruster;
- no legs, pedestal, wheels, pole, or counter attachment;
- floats in the rear aisle behind a substantial foreground counter;
- counter occludes lower thruster;
- organized tools/parts;
- individual Manual sign.

Current mounted candidate is not human-approved and is opaque.

Behavior:

- Idle 1: three arms work independently.
- Idle 2: only pupils scan and possibly one tiny spark.
- Hover 1: eyes snap toward customer; arms pause.
- Hover 2: eye stalks dip in a bow; tools tuck; one claw opens.
- Hover 3: one claw presents counter; other arms resume.

Integrate through rear brackets, tool/power conduit, work lamp, oil/maintenance
wear, rear-aisle thruster receiver, and foreground scrap.

Never mount the robot on or over the counter.

### Console — immersed infrastructure hermit

Lock:

- approved Bazaar 2 Ed identity;
- red hair;
- cross-legged seated pose on a rug;
- visor always on;
- tall post with `console` sign above;
- racks, servers, cables, pizza, boxes, controls, technical clutter.

Behavior:

- Idle 1: tracks invisible interfaces.
- Idle 2: visor/interface change plus finger tap; root fixed.
- Hover 1: notices visitor through visor.
- Hover 2: quick peace sign.
- Hover 3: holds peace sign while other hand resumes work.

Integrate through rack anchors, power/vent, cables passing behind and in front,
rug contact, screen light, heat, dust, and trench connection.

Never tidy the nest, remove the visor/rug, stand Ed up, or add a conventional
counter.

### Talks / Video Club — dry cinephile

Lock:

- seasoned clerk;
- cheek resting on one hand;
- deadpan cultivated boredom;
- tapes, CRT, counter, shelves, standee;
- individual Video Club presentation.

Behavior:

- Idle 1: long quiet shift.
- Idle 2: slow blink; at most one fingertip tap.
- Hover 1: slowly evaluates customer.
- Hover 2: straightens around fixed root and selects tape.
- Hover 3: offers tape with faint knowing smile.

Integrate through a real wall recess, CRT rectangular receiver, tape debris,
worn floor, and standee/bin foreground contact.

Never turn the clerk energetic or the stall into a generic media kiosk.

### Projects — patient robot gardener

Lock:

- completely roofless overgrown garden shop;
- open ragged plant-and-post top;
- rope-hung lowercase `projects` sign;
- slim 90s-anime-informed mechanical gardener;
- visible pistons, joints, cables, grippers;
- apron only;
- watering can and seedling;
- abundant chunky plants;
- two specified alien creatures;
- rusty posts, warped wood, pots, tools, string lights.

Behavior:

- Idle 1: carefully waters seedling.
- Idle 2: one lens/can/gripper and declared water pixels change.
- Hover 1: notices customer; watering pauses.
- Hover 2: parts/inspects leaves.
- Hover 3: proudly presents a new sprout.

Integrate through real water/drain, roots in cracks, vines on shared
infrastructure, dampness/moss, foreground foliage, and fragmented bulb light.

Never add roof, glass, greenhouse, Earth animals, bulky armor, clothing beyond
the apron, fine fronds, or isolated mascot composition.

### Games — siblings’ kid-built stall

Lock:

- two siblings sharing a handheld;
- sister social and excited;
- brother serious and protective;
- cheap wood and plastic;
- crooked handmade engineering;
- individual sign and props.

Behavior:

- Idle 1: sister plays; brother studies.
- Idle 2: screen/button/eyes change only.
- Hover 1: sister excited; brother suspicious.
- Hover 2: enormous wave; brother closes posture.
- Hover 3: she presents the game; he decides.

Both children keep independent fixed torso anchors and fixed lower bodies.

Integrate through visible wedges, improvised power, arcade receiver light,
scratches, cable/drain junction, and foreground crates/litter.

Never professionalize or unify the kid-built structure.

### Travel — last-seats Hearthian

Lock:

- friendly four-eyed Hearthian, never a frog;
- astronaut gear;
- exact `LAST SEATS`;
- handmade wood/canvas/brass booth;
- tickets, routes, instruments, luggage;
- back wall roughly one meter behind the agent;
- thick side/soffit returns and dark rear floor gap.

Behavior:

- Idle 1: manages tickets.
- Idle 2: four-eye blink plus ticket shuffle.
- Hover 1: bright eye contact.
- Hover 2: raises selected ticket.
- Hover 3: holds ticket and points to improbable route.

Integrate through booth attachment, warm lantern receivers, queue/transit wear,
tags, luggage marks, and retained deep recess.

Never turn the Hearthian into a frog, flatten the booth, or make it corporate.

---

## 13. Animation invariants

Every stall ultimately has exactly:

- two idle frames;
- three hover frames;
- hover plays 1 → 2 → 3 once;
- frame 3 holds while hover/focus remains.

Absolute invariants across all five frames:

- identical canvas, crop, bounds, scale, transform, and origin;
- no frame rescale or whole-layer translation;
- no structural or surrounding change;
- sign, counter, floor, fixed clutter, and architecture byte-identical;
- fixed character root;
- torso never translates left or right;
- no fake breathing by scaling;
- motion only inside declared masks;
- source and receiver may change together only inside declared effect masks.

A character may articulate head, face, arms, tools, or held objects; extend an
arm; lean; or bow around the fixed root. It may not slide.

The customer is the camera/viewer.

---

## 14. Responsive composition and stairs

### Desktop, `min-width: 701px`

- Floor 1: Uses + Papers + stairs right.
- Floor 2: Manual + Console + Talks + stairs left.
- Floor 3: Projects + Games + Travel + stairs left.
- The responsive composition is either three stalls plus stairs, or Uses plus
  one stall plus stairs, following the current Bazaar 2 baseline.
- Desktop stairs have no midpoint floor.

Desktop stairs must gain:

- ceiling aperture and reinforced collar;
- rear recess and wall brackets;
- real landing/top plane;
- compact contact/cast shadow;
- floor-wide utility turns;
- selected front railing/lip overlap;
- clear navigation lane.

### Mobile, `max-width: 700px`

Every mobile floor contains exactly:

- two stalls stacked vertically;
- one continuous full-height stair column;
- one bottom exit;
- one midpoint exit;
- one real midpoint floor supporting the upper stall.

Pairs:

1. Uses above Papers; stairs right.
2. Manual above Talks; stairs left.
3. Console above Projects; stairs right.
4. Games above Travel; stairs left.

Required static assembly:

```text
mobile-stairs-column
mobile-bottom-landing
mobile-midpoint-platform
mobile-midfloor-top
mobile-midfloor-fascia
mobile-midfloor-underside-shadow
```

The right-side assembly mirrors the whole stair/platform system. Platform and
floor remain registered relative to the stairs. The platform paints above the
stair core. Hover never changes architecture.

### Wayfinding

- Up is on the stairs side.
- Down is opposite.
- Last floor has no Down.
- Below 1024px signs sit inside the content rail.
- At/above 1024px signs sit in outer gutters.

---

## 15. Scene-layer order

Back to front:

1. base tiled environment;
2. rear recesses/structural shadow;
3. floor-wide rear utilities;
4. tenant rear connections;
5. lobby/floor/landing top;
6. casters;
7. contacts;
8. stall rear;
9. character animation;
10. animated effect/emission;
11. stall front;
12. mid utilities and between-stall structure;
13. stair rear/core/front;
14. sparse foreground occluders and landing lips;
15. separator/fascia;
16. wayfinding;
17. portalled dialog at global maximum.

Floor-darkening and ambient treatments paint behind characters and
merchandise.

---

## 16. Generation and verification loop

Never regenerate all stalls from prose in one pass.

### Before generation

1. Freeze the approved identity and source hash.
2. Record exact canvas, pixel scale, root, ground anchor, sign, structure,
   immutable props, and motion envelopes.
3. Build an exact low-color geometry guide.
4. Overlay the guide against Uses camera and actual target placement.
5. Declare visible sources, receivers, depth planes, and key-color policy.

### Generate

1. Generate one design master or one bounded asset.
2. Surface its exact file path immediately and label it **unverified
   candidate**, never keeper/master/approved.
3. Run the untouched source through
   `scripts/bazaar3/verify-master-candidate.mjs`.
4. If any machine check fails, record the report and reject immediately. Do
   not normalize, downscale, quantize, extract, or continue semantic review to
   rescue it.
5. Only after machine PASS, inspect full size, the geometry overlay, the style
   failure overlay, and the generated 300px preview.
6. Complete every hard semantic review item against the candidate SHA.
7. Reject camera, rendering, identity, anatomy, layout, integration, lighting,
   scale, text, and aberration failures. Any missing/unrun item is failure.
8. Only a machine PASS plus semantic PASS may be called a keeper candidate.
   Production promotion additionally requires the user-approved SHA.

### Master-source hard gate

The master gate exists specifically to catch failures an agent can recognize
but might otherwise describe only after surfacing the render.

Automatic hard failures include:

- accidental palette shades or more than 64 opaque colors;
- off-library color pixels;
- non-binary alpha;
- broken 3× blocks, sub-grid edges, or mixed pixel density;
- excessive changed-neighbor edges;
- isolated/confetti pixels and tiny connected components;
- high local color entropy characteristic of richly textured pseudo-pixel
  illustration;
- missing/noisy disposable matte;
- missing canonical ceiling, wall/floor, fascia, or underside rails.

Semantic hard failures include the explicit “richly textured pseudo-pixel
illustration” read, weakened outline hierarchy, generic or substituted
characters, lost stall behavior/identity, camera drift, false integration,
non-causal light, bad scale, clipped props, and malformed AI artifacts.

The semantic review is mandatory and hash-bound. A stale review cannot approve
changed bytes. The verifier itself never changes the source.

### Camera gate

Reject when:

- key vertical/horizontal lines drift beyond about one degree;
- line families converge;
- the bay rotates or opens in perspective;
- top bands become deep;
- root, counter, sign, or structure moves;
- placement requires corrective rotation, non-uniform scale, or perspective.

### Style-normalization gate

After geometry is accepted, produce or inspect a rendering-only alternative:

- exact same layout and shapes;
- fewer colors;
- flatter surfaces;
- stronger outlines;
- chunkier 16-bit-inspired shading;
- less microdetail.

Reject if simplification changes design, silhouette, anatomy, sign, prop
relationships, or depth.

### Animation construction

Build five frames from byte-identical static plates plus bounded moving
character/effect cels. Do not generate five unrelated complete stalls.

### Chroma/alpha processing

- flat key absent from valid art;
- binary alpha unless a declared stepped emission needs otherwise;
- despill;
- transparent corners;
- no key holes;
- exact nearest-neighbor blocks;
- emissive masks protected before palette quantization.

---

## 17. Validation harness

### Sprite hard failures

- dimensions/crop/scale/transform mismatch;
- root or torso translation;
- immutable structure/sign/fixed-prop mutation;
- changed pixel outside allowed mask;
- broken authored pixel blocks;
- partial-alpha fringe;
- key spill or punched holes;
- palette explosion;
- motion-envelope collision;
- whole-frame shift or inset/scale.

### Integration hard failures

- stall still reads as a rectangle over wallpaper;
- no real contact/caster;
- receiver without visible source;
- source without stall and architecture receiver;
- utility discontinuity;
- architecture clips sign/character/action;
- prop clipped unintentionally;
- floor/stair changes during hover;
- off-palette post-processing;
- horizontal overflow;
- decorative input interception.

### Lighting hard failures

- palette-index mismatch;
- source L* not at least 12 above receiver;
- receiver not 8–16 L* above unlit material;
- background non-emissive values exceed intended architecture cap;
- broad unexplained halo;
- light layer hidden behind opaque art;
- quantization deletes source cores.

### Required reports

- five-frame contact sheet;
- onion sheet;
- motion heatmap;
- immutable-byte diff;
- root/torso delta;
- palette/grid/alpha report;
- source/receiver overlay;
- contact/caster overlay;
- rear/mid/front breakdown;
- desktop/mobile screenshots;
- street-level diff.

### Chrome matrix

Test at minimum:

- small phone and tall phone;
- 700 and 701px;
- 1023, 1024, and 1025px;
- 1248, 1440, and 1728px desktop;
- pointer, keyboard, touch, reduced motion;
- all dialogs and frame sequences;
- all Up/Down targets;
- final-floor no-Down;
- mobile midpoint support;
- desktop stair aperture/landing/lane;
- unchanged street.

Chrome is the final authority for visual stacking, hitboxes, breakpoints,
scrolling, animation, and integration.

---

## 18. Corrected production plan

The failed fixed workshop floor is not the new starting point.

### Phase 0 — governance and baseline

- Treat this document as the current source of truth.
- Hash approved masters.
- Record current placement and interaction baseline.
- Capture street baseline.
- Resolve the Manual mounted/unapproved contradiction.
- Correct stale asset declarations only when implementation resumes.

### Phase 1 — palette and light calibration

- Approve or revise master palette Proposal A.
- Build semantic palette validation and protected emitter masks.
- Define exact plane-shading lookup and material mappings.
- Create one responsive calibration bay using Uses, one H-beam division,
  current stairs, tiled wall, and lobby floor.
- Prove the system at mobile and multiple desktop widths.

This is a calibration composition, not a replacement Uses stall and not a
fixed full-floor bitmap.

### Phase 2 — responsive environment kit

- Re-author/quantize wall, floor, beam, separator, stair, and utility modules
  into the shared palette and pixel density.
- Preserve tiled responsiveness.
- Establish the foreground lobby and rear tenant bays.
- Validate seams, repetitions, depth, and absence of cropped props.

### Phase 3 — stall masters

- Preserve approved composition and character identity.
- Re-render only assets that fail camera, opacity, palette, light, or surface
  rules.
- Manual requires human design approval and transparent/layered delivery.
- Console keeps Ed/rug/clutter/sign-post.
- Projects keeps the approved roofless gardener composition.
- Travel keeps the approved deep Hearthian booth.
- Each regenerated master passes geometry first, style normalization second.

### Phase 4 — workshop/media proof

- Integrate Manual, Console, and Talks using responsive modules.
- Establish one continuous power/vent/trench network.
- Add unique contacts, casters, connections, and causal receivers.
- Integrate desktop stairs.
- Stop for visual approval before rollout.

### Phase 5 — remaining desktop floors

- Uses + Papers archive/service.
- Projects + Games + Travel reclaimed leisure/transit.
- Keep each floor narrative distinct while sharing palette/light/physics.

### Phase 6 — dedicated mobile pass

- Build all four two-stall vertical compositions.
- Use one continuous stair and real midpoint floor.
- Reduce prop density rather than shrinking desktop clutter.
- Verify upper-stall contact and whole-system mirroring.

### Phase 7 — animation

- Complete missing Manual five-frame family.
- Audit all existing five-frame families visually and mechanically.
- Couple hover sources and receivers.
- Verify static environment and torso/root locks.

### Phase 8 — final QA

- Run sprite and integration harnesses.
- Run full Chrome matrix.
- Run street diff.
- Run TypeScript, lint, and production build.
- Retain reports and screenshots.
- Final acceptance is visual, in scene, at real responsive sizes.

---

## 19. Rejection ledger

Never repeat:

- “integration” achieved only by darkening the background;
- a fixed floor illustration that breaks responsive tiling;
- different camera angles between stall and environment;
- stalls placed in the foreground instead of rear bays;
- unifying every tenant into one brown/grey palette;
- generic lighting plates with no visible cause;
- random cable-like colored pixels;
- clipped props at module edges;
- rescaled/over-detailed pseudo-pixel art;
- disproportionate stairs;
- repeated H-beam cages as the whole solution;
- one standardized sign or stall shell;
- an opaque Manual that blocks its own environment/light;
- a Manual mounted on a counter;
- a frog Travel character;
- Projects with roof/glass/greenhouse;
- Console without Bazaar 2 Ed, rug, visor, or clutter;
- generation that changes approved layout while claiming to simplify style.

---

## 20. Approval checklist

Before a floor or stall is promoted, confirm:

1. Approved identity and distinctive construction are intact.
2. Uses camera is obeyed.
3. Rendering is flatter, outlined, chunky, and quiet.
4. Palette swatches are semantic and exact.
5. Every light has source, stall receiver, environment receiver, and response.
6. Stall touches the floor with unique contact islands.
7. Architecture passes behind and in front.
8. A meaningful seam crossing exists.
9. Shared lobby remains readable and uncropped.
10. Stairs belong to the same building.
11. Responsive tiling works at all required widths.
12. Animation structure, scale, and torso/root are locked.
13. Dialog, signs, hitboxes, and scroll targets remain correct.
14. Street diff is empty.
15. The actual in-scene result no longer reads as a pasted image.

Any “no” blocks promotion.

---

## 21. Open decisions

- Human approval or rejection of the currently mounted Manual candidate.
- Approval/revision of master palette Proposal A.
- Exact first calibration composition after palette approval.
- Which approved legacy stalls need a rendering-only normalization pass versus
  environment integration alone.

Nothing else requires a new design decision before calibration work begins.
