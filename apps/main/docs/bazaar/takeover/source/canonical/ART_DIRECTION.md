# Bazaar 3 Gospel

Status: normative identity, behavior, responsive, and animation contract.
Read `MASTER_PLAN.md` first for the latest authority ledger, current runtime
truth, rejected-workshop correction, and proposed shared palette/lighting
system. Where this file conflicts with a later decision recorded there,
`MASTER_PLAN.md` wins. “Must”, “never”, “locked”, and “byte-identical” are
acceptance requirements, not suggestions.

Mandatory companion: read `INTEGRATION_BIBLE.md` completely before any
underground environment, lighting, structural, grounding, prop, stair, or
stall-integration work. The companion preserves the full recovered production
plan and the extensive shared rendering language; this file supplies the exact
stall identity, animation, responsive, and validation contracts.

Bazaar 3 is a controlled evolution of the approved Bazaar 2 underground
market. It is not a redesign. The goal is to make the stalls feel constructed
inside one physical bazaar while preserving the character, silhouette,
materials, sign, posture, props, and personality that made each approved stall
distinct.

## 1. Authority and frozen scope

The source of truth, in descending order, is:

1. The current working-tree rendering of Bazaar 2. Do not reconstruct it from
   Git `HEAD`; approved work may be uncommitted.
2. The approved designs and declarations recorded in `gen-places.html`.
3. The character, behavior, animation, responsive-layout, and stairs rules in
   this document.
4. Uses and Games as the rendering references.

If a generated result is attractive but conflicts with an approved design, the
approved design wins. Preserve before improving.

### Street-level freeze

Street level is out of scope and must remain visually and behaviorally
identical to the current Bazaar 2 baseline:

- Do not regenerate, restyle, relight, reposition, recolor, or re-layer any
  street building, vehicle, door, sign, shadow, background, or interaction.
- Do not replay earlier street-adjustment instructions. Their accumulated
  result is already part of the frozen baseline.
- Prefer reusing the frozen street assets instead of duplicating them.
- A pixel-diff of the street at the same viewport and state must be empty,
  apart from explicitly documented browser-rendering nondeterminism.

There is no audio work in Bazaar 3. Do not add audio, audio assets,
audio-synchronized behavior, or new sound controls.

## 2. Core design doctrine

### Integration, not uniformity

The eight stalls must continue to look as if different inhabitants built them
for different purposes. Their structures, silhouettes, material palettes,
signs, lettering, clutter, characters, and density must remain different.

Integrate them only through believable environmental seams:

- shared floor contact and compact contact shadows;
- landing plates, wall recesses, brackets, bolts, patched masonry, and beam
  connections;
- pipes, cables, conduit, drains, grime, wear, and small material transitions;
- hard-edged ambient light that affects both stall and surrounding structure;
- carefully chosen foreground overlaps such as a pipe, railing, cable, foliage
  edge, or landing lip;
- coherent depth: rear recess, stall body, stair/landing, foreground edge.

Do not place a generic frame, identical sign, identical beam cage, identical
lighting rig, or repeated prop kit around every stall. Do not erase the visual
contrast between wood, plastic, steel, fabric, hologram, plants, electronics,
and improvised construction.

### The approved designs are Gospel

Do not:

- replace, redesign, “upgrade”, beautify, or recast a character;
- change a character’s species, age, role, pose premise, clothing premise, or
  relationship to the stall;
- replace a stall’s structural concept or distinctive sign;
- remove identity-defining props to make an image cleaner;
- convert asymmetry into a generic centered storefront;
- make Games professionally fabricated;
- make Console tidy, standing, visorless, or conventionally shop-like;
- make Projects a greenhouse, a character poster, or a generic robot kiosk;
- make all stalls share one construction language.

## 3. Rendering contract

Uses is the primary rendering Gospel; Games is the secondary reference for
hand-built structure, readable composition, and grounded clutter.

Every new or re-rendered raster asset must use:

- flat, deliberately limited colors;
- strong near-black external and structural outlines;
- chunky 16-bit-inspired clusters authored at low resolution;
- normally three tones per material: shadow, body, and highlight;
- hard-edged light pools and compact contact shadows;
- simple, readable silhouettes at the asset’s actual in-scene size;
- sparse checker dithering only where it materially helps a deep shadow or
  material transition;
- crisp nearest-neighbor enlargement with no interpolation.

Less is more. Simplify value groups and shapes before adding detail.

Never use:

- painterly modeling, illustration-grade microdetail, fuzzy edges, or the
  densely rendered “classic AI image” look;
- antialiasing, smooth gradients, airbrushed glow, soft photographic shadow,
  glossy 3D rendering, or sub-pixel detail;
- noisy texture that destroys silhouettes;
- fine foliage fronds where a chunky leaf cluster will read better;
- detail that disappears or shimmers at the delivered CSS size.

The style-normalization pass is mandatory for every accepted sprite:

1. Lock the approved layout, silhouette, dimensions, crop, structure, sign,
   character root, and identity props.
2. Re-render those same shapes using flatter colors, fewer value transitions,
   stronger outlines, and chunkier shading.
3. Compare the normalized image to the locked source. Reject it if
   simplification has become redesign.

## 4. Locked stall identities

### Uses — the severe ramen curator

- A stern ramen chef stands upright with folded arms.
- The stall remains a convincing, working ramen stall rather than a themed
  shell.
- He is exacting, quiet, disciplined, and highly opinionated, not hostile.
- Hardware and software are treated like ingredients: only proven things make
  the menu.
- His distinctive stall structure, sign, stool/menu language, cooking props,
  and severe folded-arm silhouette are locked.

### Papers — the holographic archivist

- A smiling, courteous, scholarly holographic archivist holds and reads a
  book.
- The transmission may flicker; the intellect and posture remain composed.
- Glasses, book, holographic treatment, archive context, and the individual
  Papers sign are locked.
- The character offers evidence rather than pretending difficult questions
  have simple answers.

### Manual — the courteous service robot

- A cheerful, hyper-capable repair robot remains continuously useful and
  methodical.
- It always has exactly three eye stalks and exactly three connected arms.
- Its round floating torso, downward thruster, torso center, and three shoulder
  roots are locked and remain fixed. It has no pedestal, legs, wheels, support
  pole, table mount, or counter attachment.
- It floats in the rear aisle behind the foreground counter. The counter
  visibly occludes the lower thruster in every frame.
- Organized parts, maintenance tools, working limbs, and the individual Manual
  sign remain part of the design.
- “Manual” means both instructions and manual labor.

### Console — the immersed infrastructure hermit

- Ed is a red-haired person sitting cross-legged on a rug with a virtual
  reality visor on.
- Ed must remain seated cross-legged and must keep the visor on.
- The rug, racks, servers, cables, pizza, boxes, controls, and dense lived-in
  technical clutter are identity-defining and must remain.
- The mess is capable, comfortable, and self-sufficient, not generic trash.
- Preserve the approved Console structure, silhouette, sign, seated pose, and
  relationship between Ed and the surrounding equipment.
- Integration may connect its cables, racks, heat, and light to the bazaar; it
  must not sanitize or standardize the stall.

### Talks / Video Club — the dry cinephile

- A seasoned video-club clerk rests their cheek on one hand behind the counter.
- Cultivated boredom, deadpan judgment, excellent taste, tapes, CRT, counter,
  and the distinctive Video Club/Talks presentation are locked.
- They are bored by the shift and most choices, not uninterested in films.
- The stall remains a video-club environment, not a generic media kiosk.

### Projects — the patient robot gardener

- A slim mechanical gardener tends an overgrown, roofless garden shop.
- Side projects read as living organisms to nurture, not products to launch.
- The approved robot, plants, creatures, sign, open structure, props, and
  composition are locked in concept. The rendering must be simplified; the
  design must not be replaced.
- The shop architecture is the primary silhouette. The robot is a working
  shopkeeper embedded through overlap, shared shadow, light, and materials—not
  an isolated mascot pasted over foliage.
- Absolutely no roof, canopy, glass, greenhouse, arch, or roof surface.
- Preserve the ragged plant-and-post open top, rusted riveted iron, warped wood
  shelving/trellis, rope, pulley, terracotta, seed trays, soil, tools, broad
  leaf clusters, shared grounded base, and dark central work bay.
- A chipped wooden sign hangs by rope from the upper-left post, slightly askew,
  and reads exactly lowercase `projects`. No other readable text is allowed.
- A single string of 9–11 warm bulbs sags between the uneven posts.
- The slim dark olive-gray robot has a compact rectangular head, two round lens
  eyes with one dimmer, a small bent antenna, segmented torso, exposed pistons
  and cables, oversized three-finger grippers, moss on one shoulder, a vine
  crossing an arm/apron edge, and a worn gardener’s apron.
- The robot remains gently stooped at the work bay, tending a seedling with a
  dented watering can. Bench, pots, tools, foliage, and shared shadow partially
  occlude it; do not display a clean isolated full-body contour.
- Keep two quiet, uncaged, unmistakably alien creatures:
  - On the upper-right shelf, a dozing six-limbed indigo creature with three
    amber eyes in a vertical row, moss on its back, and a curled tail ending in
    one muted dusty-rose glow dot.
  - In the lower-left pot cluster, a small round four-legged creature with no
    mammal anatomy, three short dorsal fins, two feather-like antennae,
    asymmetrical eyes, and a dim dusty-rose belly patch.
- Keep three practical light families only: warm string bulbs, one dim violet
  seed lamp deep in the trellis, and the creatures’ tiny dusty-rose glow.
- Plants are thriving but chunky; no fine fronds, chroma-green foliage, Earth
  animals, cages, bulky armor, pale skeleton robot, or mascot composition.

#### Projects canvas correction

The authored low-resolution grid is `320 × 421`. Enlarging it exactly 3×
produces `960 × 1263`, not `960 × 1264`.

The production rule is therefore:

- author/render the artwork on `320 × 421`;
- enlarge exactly 3× nearest-neighbor to `960 × 1263`;
- append exactly one fully transparent padding row to make the processed
  delivery canvas `960 × 1264`;
- never stretch, interpolate, duplicate an art row, or use a fractional scale
  to fill the final pixel.

Raw keyed generations may use flat `#ff00ff`, but the processed asset must have
clean transparency, no key-colored spill, and the one explicit padding row.

### Games — the siblings’ kid-built stall

- Two young siblings share a handheld.
- The sister is immediately social, confident, and excited; the brother is
  serious, suspicious, and protective of the choice.
- Preserve both distinct characters, their relationship, the handheld, their
  fixed seated/lower-body arrangement, the individual Games sign, and all
  approved props.
- The stall must remain obviously kid-made: cheap wood, plastic, improvised
  joints, and playful construction. Do not professionalize it.
- Integration may ground and connect the stall to the bazaar, but must retain
  its handmade silhouette and material contrast.

### Travel — the last-seats cosmic agent

- A friendly four-eyed Hearthian operates the booth marked exactly
  `LAST SEATS`.
- The Hearthian is welcoming, adventurous, experienced, charmingly urgent,
  and an enthusiastic travel agent rather than a generic space mascot.
- Preserve the Hearthian species design, astronaut gear, ticketing props,
  booth structure, individual Travel sign, and route/last-seat premise.
- The back wall sits roughly one meter behind the agent and counter. Thick
  side returns, a soffit return, overlap, and a darker rear floor gap make that
  depth explicit without perspective convergence.

## 5. Animation architecture

The customer is the camera/viewer. Every stall, sign, structural prop, floor
pixel, and character root remains registered across all frames. Only declared
facial, head, jointed limb, tool, carried object, effect, or screen regions may
change.

### Required layered construction

Each stall animation is assembled from:

1. **Immutable rear plate** — structural frame, sign, interior, fixed furniture,
   fixed clutter, rear lighting, and rear occluders.
2. **Character cel** — a full-canvas transparent cel containing only approved
   moving anatomy.
3. **Animated prop/effect cel** — a full-canvas transparent cel for declared
   steam, water, holographic fragments, displays, tickets, sprout changes, or
   similar motion.
4. **Immutable front plate** — counters, foliage, cables, boxes, rails, and
   other foreground occluders.

Immutable plates are reused byte-for-byte across every idle and hover frame.
Do not generate separate full-stall images and hope that the surroundings stay
similar.

### Universal frame and anchor contract

- Every stall has exactly two idle frames and three hover frames.
- The idle loop alternates only the declared small motion.
- Hover plays frames 1 → 2 → 3 once and holds frame 3 while hover/focus
  remains.
- All five frames use an identical canvas, crop, transparent bounds, CSS box,
  scale, transform, transform origin, and in-scene placement.
- Nothing rescales between frames.
- No full-canvas or layer translation is allowed.
- The stall structure and surrounding environment never change.
- The character’s root is fixed. Depending on the pose, this is the feet,
  seat/pelvis, or pedestal contact.
- The torso never translates left or right.
- A character may lean, bend, bow, straighten, turn the head, extend an arm,
  or present an object only through articulation around the fixed root.
- A fixed torso may not “breathe” by scaling.
- Moving parts may extend beyond the idle silhouette only inside a declared
  motion envelope that cannot clip or collide with navigation.
- Keyboard focus triggers the same response as pointer hover.
- Reduced-motion mode shows stable representative states and disables looping
  animation, typewriter playback, parallax, motes, and smooth scrolling.

## 6. Exact animation cards

### Uses

Idle, 2 frames:

1. The chef stands upright with folded arms, silently assessing the room.
2. A slow blink plus a tiny finger or eyebrow adjustment. The body, folded-arm
   mass, feet, and stall remain fixed.

Hover, 3 frames:

1. His eyes meet the customer; his chin rises slightly.
2. One arm unfolds and two fingers indicate the empty stool/menu.
3. A restrained nod and open palm communicate: “Omakase.”

### Papers

Idle, 2 frames:

1. The archivist reads calmly with the book held at a fixed height.
2. Scanlines briefly desynchronize; glasses, page edges, and a few holographic
   fragments flicker. The body and book anchor remain fixed.

Hover, 3 frames:

1. The signal stabilizes and the archivist looks up.
2. The book opens wider; one finger locates the relevant passage.
3. The open book is offered toward the customer.

### Manual

Idle, 2 frames:

1. The three connected arms remain occupied: duster, wrench work, and one
   available courteous claw. The robot looks happily industrious.
2. Only the three pupils scan independently, optionally with one tiny static
   spark. Torso, thruster housing, eye bases, shoulder roots, counter
   occlusion, and surrounding structure do not move.

Hover, 3 frames:

1. All three eyes snap toward the customer in a quick cascade; the working arms
   pause without shifting their roots.
2. The eye stalks dip like a miniature bow while the round floating torso and
   thruster housing remain rigid. Tools tuck inward and one claw opens
   politely.
3. The eyes rise; one claw presents the counter while the other arms cautiously
   resume their jobs.

### Console

Idle, 2 frames:

1. Ed remains cross-legged on the rug, visor on, immersed in invisible
   interfaces with hands near the controls.
2. A small visor/interface change and precise finger tap register activity.
   Ed’s seated root, torso, legs, rug, racks, servers, cables, pizza, boxes, and
   structural clutter remain fixed.

Hover, 3 frames:

1. Ed notices the customer through the visor; the head/visor angles slightly
   while one hand pauses. The visor stays on.
2. One forearm articulates upward into a quick peace sign. The pelvis, torso,
   crossed legs, and other hand remain registered.
3. The peace sign is held casually while the other hand resumes tracking the
   invisible interface.

### Talks / Video Club

Idle, 2 frames:

1. The clerk leans on one hand during a long shift, surrounded by tapes and the
   humming CRT.
2. A slow bored blink, with at most one fingertip tapping the counter. The
   planted elbow, torso, counter, tapes, and CRT remain fixed.

Hover, 3 frames:

1. The clerk slowly notices and evaluates the customer.
2. They articulate upright around the fixed root and select a tape, briefly
   checking its label.
3. The tape is offered across the counter with a faint knowing smile.

### Projects

Idle, 2 frames:

1. The gardener remains stooped at the fixed work-bay root, carefully tipping
   the watering can toward the seedling while the creatures rest.
2. One lens adjusts, the can/gripper articulates by a few authored pixels, and
   the declared water pixels change. At most one creature blinks. Robot root,
   torso anchor, bench, plants, creatures’ bodies, sign, bulbs, posts, shelves,
   and shop structure remain registered.

Hover, 3 frames:

1. The gardener notices the customer: head and lens turn while the watering
   motion pauses. The pelvis/root and torso position remain fixed.
2. The free gripper inspects or parts the leaves and redirects attention to the
   seedling; a creature may make one masked eye/antenna response.
3. The gripper proudly presents a newly visible sprout toward the customer
   while the gardener holds a gentle, attentive head angle. The sprout change
   is confined to its declared effect mask.

### Games

Each child has an independent fixed torso anchor. The stall and both lower
bodies remain pixel-identical throughout.

Idle, 2 frames:

1. Both siblings are absorbed in the handheld: the sister confidently plays
   while her brother studies the screen.
2. Only the handheld flashes, a button changes, and eyes/eyebrows react. There
   is no bouncing or body displacement.

Hover, 3 frames:

1. The sister looks up with immediate excitement; the brother gives the
   customer a suspicious sideways look.
2. Her arm articulates into an enormous wave—“NEW CHALLENGER!!!”—while his arms
   close protectively. Both torso anchors remain fixed.
3. She presents the available game with an inviting arm—“Best of three?”—while
   he folds his arms or makes a small deciding gesture: “I choose.”

### Travel

Idle, 2 frames:

1. The Hearthian remains stationed at the booth, managing the last-seat
   tickets.
2. A slow four-eye blink and a small ticket shuffle occur. The Hearthian’s
   root and torso, booth, deep rear wall, `LAST SEATS` sign, counter, and
   surrounding props remain fixed.

Hover, 3 frames:

1. The Hearthian notices the customer and makes bright, welcoming four-eye
   contact.
2. One arm raises a selected ticket with charming urgency.
3. The ticket remains proudly raised while the other hand points toward an
   improbable route.

## 7. Responsive layout contract

The current Bazaar 2 responsive DOM, scroll-snap behavior, breakpoints, and
hitbox ordering are the baseline. Decorative integration layers must not
change the interaction layout.

### Desktop: `min-width: 701px`

Underground floor groups are:

1. Uses + Papers + stairs.
2. Manual + Console + Talks + stairs.
3. Projects + Games + Travel + stairs.

The approved special-width composition remains valid: a desktop scene may
present three stalls plus stairs, or Uses plus one stall plus stairs, according
to the current responsive implementation. Do not infer a new grid from sprite
width alone.

### Mobile: `max-width: 700px`

Every mobile viewport/floor contains exactly two stalls stacked vertically and
one continuous full-height stairs lane:

1. Uses above Papers; stairs on the right.
2. Manual above Talks; stairs on the left.
3. Console above Projects; stairs on the right.
4. Games above Travel; stairs on the left.

The existing hitbox/DOM ordering, including the stair lane, is locked.
Decorative layers are noninteractive.

### Layout units

Do not mix scene units with sprite-source units:

- A scene `u` follows the existing viewport QA grid: horizontally `1u = 1vw`
  and vertically `1u = 1svh`.
- A source-art pixel scale is recorded separately in the asset manifest; for
  example, Projects uses 3× authored pixels.

All final placement is frozen from the rendered baseline or a reviewed Bazaar
3 screenshot, not by replaying a history of incremental `u` nudges.

## 8. Stairs and floor architecture

Stairs must read as installed architecture, especially on desktop. They may not
look like transparent sprites floating beside the stalls.

### Desktop stairs

Each underground desktop floor uses one assembled staircase with these layers:

1. **Rear integration:** wall/ceiling aperture, dark recess, brackets, bolts,
   and cast shadows.
2. **Stair core:** the approved floor-specific staircase sprite and side.
3. **Landing:** a real floor plate/top plane, compact contact shadow, and worn
   approach that stall occupants could physically step onto.
4. **Front integration:** landing lip, railing overlap, and selected pipe/cable
   overlap.

Requirements:

- The top enters a believable ceiling aperture; the bottom reaches a real
  landing.
- There is no midpoint floor on desktop.
- Preserve the current stair side and navigation lane for every floor.
- One shared CSS measurement/token controls both rendered stair width and the
  stall row’s reserved stair space at all desktop widths.
- Floor-specific grime, cabling, brackets, and lighting may vary; the
  structural grammar remains coherent.

### Mobile stairs

Every mobile floor has one uninterrupted full-height stair column with two
exits:

1. the approved bottom exit;
2. a midpoint exit that creates the actual floor for the upper stall.

The complete assembly contains:

- `mobile-stairs-column`;
- `mobile-bottom-landing`;
- `mobile-midpoint-platform`;
- `mobile-midfloor-top`, a shallow visible walkable plane behind the upper
  stall;
- `mobile-midfloor-fascia`, a narrow front lip in front of the upper-stall
  contact;
- `mobile-midfloor-underside-shadow`, separating the lower stall below.

Requirements:

- The column continues through the midpoint; it never restarts as a second
  staircase.
- The midpoint remains inside the same market floor and is not a separate
  scroll target.
- The upper stall stands on the visible top plane with an authored contact
  shadow and wear.
- The platform is centered/aligned with the stair column and paints above the
  stair core.
- Normal stairs are used on the left. A right-side assembly mirrors the whole
  stair/platform system consistently.
- Deck, fascia, shadow, platform, column, and separator layers remain static
  during stall hover.

## 9. Wayfinding, dialogs, z-order, and interaction

### Wayfinding

- Up is on the stairs side.
- Down is on the opposite side.
- Every sign scrolls to the correct corresponding floor.
- The last underground floor has no Down sign.
- Below `1024px`, ceiling signs sit inside the content rail at its edges.
- At and above `1024px`, ceiling signs sit in the outer gutters beyond the
  content max-width.

### Paint order

Preserve this relative order even if implementation-specific numeric values
change:

1. environment/background;
2. rear recesses, structural shadows, and rear conduits;
3. floor/landing top planes;
4. stalls and their contact shadows;
5. stair core;
6. landing lips, midpoint platform, railings, and selected foreground
   overlaps;
7. between-floor fascia/separator layers;
8. Up/Down wayfinding controls;
9. the portalled dialog, above every other scene element.

The existing floor-darkening treatment must paint behind stalls and their
hitboxes. It may darken the environment but never cover the characters or
merchandise.

Hover/focus must never:

- alter a stall wrapper’s structural z-order;
- hide or replace any stair, floor, separator, ceiling, sign, or adjacent stall
  asset;
- cause between-floor assets to disappear;
- move an interaction hitbox.

All decorative layers, including transparent image regions, use
`pointer-events: none`. Verify this in Chrome rather than assuming transparent
pixels cannot intercept input.

### Dialog behavior

- The dialog is rendered through a top-level portal and is always the highest
  z-index in the experience, including above stairs, platforms, and ceiling
  signs.
- Text renders quickly character by character like a typewriter.
- The completed text remains readable without animation.
- Focus/touch access must not depend on hover-only behavior.
- Reduced-motion mode displays the completed text without typewriter playback.

## 10. Ambient motion and lighting

Ambient treatment supports integration without changing the approved drawing:

- hard-edged pools or bands of light may bridge a stall and the wall/floor;
- steam, screen flicker, water, bulbs, holographic fragments, route lights, and
  tiny dust/mote effects may animate only within explicit masks;
- pipes, cables, and clutter may cross a seam or foreground edge when they
  reinforce the stall’s identity;
- global effects must not wash all stalls into one palette;
- no soft fog layer may cover characters, signs, or hitboxes;
- no effect may change structural registration between frames.

## 11. Sprite and positioning validation harness

Validation is a production requirement, not a final spot-check. Each asset has
a manifest containing:

- stable asset/stall ID and state/frame number;
- source and delivered dimensions;
- authored pixel scale and enlargement method;
- alpha bounds;
- root/contact anchor;
- torso anchor or fixed-body region;
- immutable plate hashes;
- allowed-motion masks and maximum motion envelope;
- sign/structure masks;
- expected palette/grid rules;
- in-scene CSS box, scale, transform, and transform origin.

### Automatic hard failures

Reject a frame set when any of the following occurs:

- width, height, crop, CSS box, scale, transform, or transform origin differs
  between frames;
- an immutable plate differs by one byte;
- any changed pixel lies outside an allowed-motion mask;
- the root/contact anchor moves by even one authored pixel;
- the torso translates left or right;
- a sign, frame, floor, fixed prop, or surrounding structure changes;
- a whole layer has been translated or rescaled;
- an animated limb/tool leaves its permitted envelope or clips incorrectly;
- nearest-neighbor pixel blocks are broken;
- unintended antialiasing or partial-alpha fringe pixels appear;
- chroma-key green/magenta remains, spills into outlines, or punches holes in
  valid art;
- a declared flat glow changes shape outside its mask;
- the accepted flatter rendering pass changes layout or identity.

Processed pixels should be fully opaque or fully transparent unless the
manifest explicitly allows a fixed, hard-edged partial-alpha glow. Never accept
unexplained partial alpha.

### Required reports

Produce, retain, and review:

- immutable-region byte diffs;
- changed-pixel heatmaps;
- motion-mask violations;
- root and torso-anchor deltas;
- alpha, palette, and pixel-grid reports;
- onion-skin comparisons;
- five-frame contact sheets;
- in-scene desktop and mobile captures;
- before/after normalization comparisons proving that shapes stayed fixed
  while rendering became flatter.

### Responsive and interaction matrix

At minimum, test:

- small and tall phones;
- `700px` and `701px`;
- `1023px`, `1024px`, and `1025px`;
- desktop widths `1248px`, `1440px`, and `1728px`;
- pointer hover, keyboard focus, touch access, and reduced motion;
- all dialogs and all five-frame sequences;
- every Up/Down target and final-floor no-Down behavior;
- transparent decorative-layer hit interception;
- upper-mobile-stall contact with the real midpoint floor;
- desktop stair aperture, landing, and reserved lane;
- unchanged street-level rendering.

Chrome is the final runtime authority for visual, hitbox, breakpoint, stacking,
scroll, and animation verification.

## 12. Acceptance gates

A stall or environment pass is accepted only when all gates pass:

1. **Identity:** the approved character, posture premise, structure, sign,
   distinctive materials, props, and personality remain unmistakably intact.
2. **Rendering:** flat colors, strong outlines, chunky low-resolution shading,
   and simplified value groups match Uses/Games; there is no overdrawn AI look.
3. **Animation:** immutable plates, roots, torso constraints, masks,
   dimensions, scale, and frame registration pass automatically.
4. **Integration:** contact, depth, light, seams, stairs, floor plates, and
   foreground overlaps make the stall inhabit the bazaar without making stalls
   uniform.
5. **Responsive interaction:** desktop/mobile compositions, stair sides,
   hitboxes, signs, scroll targets, dialog stacking, and accessibility pass in
   Chrome.
6. **Frozen scope:** the street-level visual diff is empty and no audio work
   was introduced.

No asset is accepted merely because it looks good in isolation. It must pass in
the actual Bazaar 3 environment at every required breakpoint.
