# Console ImageGen production prompts

Normative source: `../ART_DIRECTION.md`. If this file conflicts with the
Gospel, the Gospel wins. Nothing here authorizes street-level or audio work.

## Approved identity and composition

Console is the approved **C4 infrastructure-hermit booth**, with the character
corrected to the Bazaar2 **Ed from Cowboy Bebop** identity.

- Accepted raw master:
  `public/images/bazaar3/sources/approved/console-c4-ed-i1-raw.png`.
- Production master:
  `public/images/bazaar3/assets/stalls/console-v2/frames/idle-1.png`.
- C4 is the layout/structure authority.
- Bazaar2 Console is the Ed identity, clothes, seated-pose and behavioural
  authority.
- Uses is the primary rendering reference; Games is secondary.

The composition is not negotiable:

- a tall crooked post with the individual `console` sign above the booth;
- Ed, unmistakably Ed, with enormous wild red hair, tan skin, black VR visor,
  white sleeveless top, dark shorts and bare feet;
- Ed remains seated cross-legged on the patterned rug in every frame;
- laptop/control at working height;
- mismatched CRTs, racks, servers, cable bundles and coils, boxes, pizza,
  drink can, power strip and loose technical clutter;
- deliberately asymmetric, lived-in chaos that reads as competence, never as
  cleanup debt;
- all structure and clutter grounded on the same stall plane.

Do not revert to any earlier replacement character. Do not clean, standardise
or professionally rack the stall. The distinct sign, irregular booth and Ed’s
character are the point.

## Rendering contract

- Raw edits use perfectly flat `#ff00ff`.
- Production output is exactly `960 × 1264`.
- Authored grid is `320 × 421`, enlarged exactly 3× nearest-neighbour to
  `960 × 1263`, plus one transparent padding row.
- Final production palette: at most 18 opaque colours, all from idle 1.
- Use flat broad colour clusters, strong near-black outlines and normally
  three hard tones per material.
- Retain red hair, tan skin, warm rug/cardboard and black-blue machines, but
  keep the scene dark enough to belong underground.
- No antialiasing, smooth gradient, painterly modelling, airbrush, glossy 3D,
  fuzzy edge, AI micro-detail, extra hair strands or sub-grid noise.
- Simplify rendering, never layout or identity.

## Full-frame generation rule

Each animation source is an independent edit of accepted C4 idle 1. Never
chain animation edits. Raw candidates may re-render the whole image, but the
production build remaps them to idle 1’s palette and restores idle 1 over
every pixel outside the declared head/arm/hand mask.

The post, sign, racks, servers, screens, cables, boxes, pizza, rug, laptop,
legs, seated pelvis/root and fixed torso are therefore byte-identical across
all five production cels.

## Base normalization prompt

```text
Use case: precise composition-preserving style edit
Asset type: Bazaar3 Console production sprite

Image 1 is accepted C4 and the absolute authority for composition, crop,
silhouette, sign/post, machines, clutter, rug and placement. Image 2 is
Bazaar2 Console and is the absolute Ed identity/pose authority. Images 3 and 4
are Uses and Games, rendering references only.

Keep the complete C4 booth exactly: tall crooked console sign/post, CRT stack,
racks, servers, laptop, boxes, pizza, drink can, cable coils, power strip,
patterned rug and every overlap. Replace no structure and tidy nothing.

Keep Bazaar2 Ed exactly in spirit and identity: huge unruly red hair, tan
skin, black VR visor worn at all times, white sleeveless top, dark shorts,
bare feet, playful smile and cross-legged seated posture on the rug. Ed is an
immersed infrastructure hermit, not a generic gamer, child or technician.

Change only rendering density: flatter deliberately limited colours, strong
near-black outlines, broad chunky 16-bit-inspired clusters and hard
three-tone ramps like Uses/Games. Less is more.

Return exactly one PNG on perfectly uniform #ff00ff. Do not move, recrop,
rescale, rotate, mirror, add, remove, tidy, replace or professionalise any
approved part. No soft gradient, antialiasing, painterly detail, glossy 3D,
extra character, extra readable text, watermark, street element or audio
reference.
```

## Animation prompts

Every prompt below independently edits accepted C4 idle 1. The visor remains
on. Legs, pelvis/root, torso, rug and surrounding stall never move.

### Idle 2 — visor tracking and fingertip tap

```text
Create one independent alternate idle pose. Change only a few hard visor
interface pixels, a tiny head/visor tracking angle and one precise fingertip
tap at the existing laptop/control. Preserve hair silhouette outside the head
mask, shoulders, torso, seated pelvis, crossed legs, feet, laptop, rug and all
clutter.

Return one full-canvas PNG on flat #ff00ff. No breathing scale, body bob,
translation, recrop, rescale or environmental flicker.
```

### Hover 1 — notices the visitor

```text
Create one independent hover pose. Ed notices the camera without removing the
visor: only a small head/visor angle and paused control hand. Keep the fixed
torso, seated root, crossed legs, rug, laptop and booth unchanged.

Return one full-canvas PNG on flat #ff00ff. No standing, body slide, booth
redraw, added effect, rescale or recrop.
```

### Hover 2 — quick peace sign

```text
Create one independent hover pose. Keep the visor on and articulate the
screen-left forearm from its fixed shoulder chain into a large readable
two-finger peace sign beside Ed’s head. Keep the other hand at the controls.
Torso, seated root, crossed legs, feet, rug and all structure remain fixed.

Return one full-canvas PNG on flat #ff00ff. No extra hand, body translation,
standing, uncrossing, rescale, recrop or stall change.
```

### Hover 3 — peace held, interface resumed

```text
Create one independent hover pose. Hold the same casual peace sign and keep
the visitor-facing visor angle. The other hand resumes the existing invisible
interface/control position. Preserve shoulders, torso, seated pelvis/root,
crossed legs, feet, laptop, rug and booth.

Return one full-canvas PNG on flat #ff00ff. No body movement, environmental
flicker, rescale, recrop or new prop.
```

## Production verification

```sh
node scripts/bazaar3/build-v2-frames.mjs --family console
node scripts/bazaar3/verify-v2-frames.mjs
```

Acceptance requires:

- exact `960 × 1264` canvas and 3× block grid;
- at most 18 idle-1 palette colours;
- zero changed pixels outside each motion mask;
- byte-identical torso, seated root, legs, rug and surrounding structure;
- correct five-beat read: neutral, visor/tap, notice, peace sign, peace held;
- Ed remains recognisable and seated cross-legged in every cel;
- live Chrome desktop/mobile animation and z-index checks;
- no street or audio asset change.
