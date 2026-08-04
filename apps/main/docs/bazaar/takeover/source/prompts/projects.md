# Projects ImageGen production prompts

Normative source: `../ART_DIRECTION.md`. If this file conflicts with the
Gospel, the Gospel wins. Nothing here authorizes street-level or audio work.

## Approved identity and composition

Projects is the accepted **C3 roofless overgrown garden shop**. The current
design is approved; do not redesign it.

- Accepted raw master:
  `public/images/bazaar3/sources/approved/projects-c3-i1-raw.png`.
- Production master:
  `public/images/bazaar3/assets/stalls/projects-v2/frames/idle-1.png`.
- C3 is the layout, silhouette, robot, plant, creature and prop authority.
- Uses is the primary rendering reference; Games is secondary.

The approved component map is non-negotiable:

- a free-standing, completely roofless shop with magenta/open air above;
- two uneven post-and-shelf wings drowning in broad-leaf plants;
- a rope of small warm bulbs between the posts;
- an askew rope-hung lowercase `projects` sign at upper left;
- dense pots, seed trays, terracotta, tools, soil and foreground plant spill;
- a dark central work bay with a slim mechanical robot gardener;
- the robot has a small two-lens head, bent antenna, visible segmented neck,
  pistons, cables, mechanical joints and grippers;
- the robot wears only a worn gardener’s apron—no shirt, trousers, coat or
  other clothes—and its machinery remains visible;
- its design carries simplified 1990s-anime service-robot character after the
  project’s pixel-rendering rules are applied;
- a three-eyed indigo shelf creature and a small antenna-bearing creature near
  the lower-left pots remain part of the living shop;
- watering can and central seedling interaction stay readable.

The robot is a patient builder treating side projects as living organisms,
not a mascot posed in front of plants.

## Rendering contract

- Raw edits use perfectly flat `#ff00ff`, including through the open roof and
  every foliage/rail gap.
- Production output is exactly `960 × 1264`.
- Authored grid is `320 × 421`, enlarged exactly 3× nearest-neighbour to
  `960 × 1263`, plus one transparent padding row.
- Final production palette: at most 24 opaque colours, all from idle 1.
- Broad flat clusters, strong near-black outlines and normally three hard
  tones per material.
- Plants use chunky overlapping leaf masses, never fine fronds.
- Greens stay dark, desaturated and yellow-biased; robot metal stays
  olive-gray/iron; wood and terracotta stay warm and worn.
- No antialiasing, soft gradient, painterly modelling, airbrush, glossy 3D,
  fuzzy edge, AI micro-detail, tiny foliage noise or illustration overdraw.
- Simplify rendering, never the approved layout, plant abundance, creatures or
  character identity.

## Full-frame generation rule

Every animation source is an independent precise edit of accepted C3 idle 1.
Never chain one generated pose into the next. The production build remaps each
candidate to idle 1’s palette, admits only declared head/arm/can/sprout pixels
and restores idle 1 everywhere else.

Posts, bulbs, sign, shelves, plants, creatures, tools, pots, fixed torso,
pelvis/feet root and surrounding shop therefore remain byte-identical across
all five production frames.

## Base normalization prompt

```text
Use case: precise composition-preserving style edit
Asset type: Bazaar3 Projects production sprite

Image 1 is accepted C3 and the absolute authority for composition, silhouette,
character, plants, creatures, props, occlusion and root. Images 2 and 3 are
Uses and Games, rendering references only.

Keep C3 exactly: roofless ragged top, two uneven planted shelf wings, rope
bulbs, askew lowercase projects sign, dark central work bay, abundant pots,
seed trays, tools, soil, foreground plant spill and both alien creatures.

Keep the same slim 1990s-anime-influenced mechanical gardener: compact
two-lens head, bent antenna, visible segmented neck and torso, pistons,
cables, joint hardware, mechanical grippers, moss/vine accents and worn
gardener’s apron only. Do not add clothes or cover the machinery. Preserve the
watering can, seedling interaction, torso position and planted feet.

Change only rendering density: flatter deliberately limited colours, strong
near-black outlines, broad chunky 16-bit-inspired clusters, hard three-tone
ramps and sparse intentional dither like Uses/Games. Less is more.

Return exactly one PNG on perfectly uniform #ff00ff, including the entire
open top and all gaps. Do not move, recrop, rescale, rotate, mirror, add,
remove, replace, tidy or professionalise any approved part. No roof, canopy,
greenhouse, glass, fine foliage, smooth gradient, antialiasing, painterly
detail, glossy 3D, extra character, extra readable text, watermark, street
element or audio reference.
```

## Animation prompts

All animation prompts independently edit accepted C3 idle 1. The torso and
feet/root never translate. Plants, creatures and stall structure stay fixed.

### Idle 2 — lens scan, can adjustment, water tick

```text
Create one independent alternate idle pose. Change only the two lens-eye
states, a tiny head/antenna scan, a small wrist articulation on the existing
watering can and a short hard-edged water tick toward the same seedling.
Preserve torso, apron, pelvis, feet, shoulder roots, can working envelope,
plant, creatures and structure.

Return one full-canvas PNG on flat #ff00ff. No body bob, breathing scale,
plant sway, creature motion, booth redraw, rescale or recrop.
```

### Hover 1 — notices the visitor

```text
Create one independent hover pose. The robot notices the camera with a small
head angle and brighter lens contact. Keep both arms, watering can, torso,
apron, pelvis, feet, seedling and entire stall fixed.

Return one full-canvas PNG on flat #ff00ff. No body slide, added effect,
structure change, rescale or recrop.
```

### Hover 2 — inspects the living work

```text
Create one independent hover pose. Keep the fixed torso/root. Articulate the
head toward the nearby leaves and one mechanical arm/gripper into a careful
inspection gesture; the other arm continues controlling the same watering
can. Exposed pistons and cables remain readable and mechanically connected.

Return one full-canvas PNG on flat #ff00ff. Do not move plants or creatures,
redraw the stall, cover the robot with clothing, translate the body, rescale
or recrop.
```

### Hover 3 — proudly presents a sprout

```text
Create one independent hover pose. Keep the torso, apron, pelvis and feet
fixed. Articulate one arm from its fixed shoulder chain to present a tiny new
sprout in the gripper with quiet pride; the other hand/can stays in its
approved working area. The sprout uses two or three broad pixel-leaf clusters.

Return one full-canvas PNG on flat #ff00ff. No stall, plant-bed or creature
redraw; no body translation, extra clothing, rescale or recrop.
```

## Production verification

```sh
node scripts/bazaar3/build-v2-frames.mjs --family projects
node scripts/bazaar3/verify-v2-frames.mjs
```

Acceptance requires:

- exact `960 × 1264` canvas and exact 3× block grid;
- at most 24 colours, all from idle 1’s palette;
- zero changed pixels outside each declared motion mask;
- byte-identical torso, feet/root and surrounding shop hash;
- correct read: neutral watering, lens/water tick, notice, inspect, present
  sprout;
- roofless open silhouette and abundant plants survive every frame;
- robot stays mechanical, slim, apron-only and integrated in the work bay;
- live Chrome desktop/mobile animation and z-index checks;
- no street or audio asset change.
