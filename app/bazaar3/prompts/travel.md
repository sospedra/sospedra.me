# Travel ImageGen production prompts

Normative source: `../ART_DIRECTION.md`. If this file and the Gospel conflict,
the Gospel wins. Nothing here authorizes a street-level or audio change.

## Approved identity and composition

Travel is the approved **C7 enclosed cosmic ticket booth** operated by a
friendly **Hearthian**. It is not a frog stall and must never regress to one.

- Accepted raw master:
  `public/images/bazaar3/sources/approved/travel-c7-i1-raw.png`.
- Production master:
  `public/images/bazaar3/assets/stalls/travel-v2/frames/idle-1.png`.
- Rendering references only: Bazaar2 Uses first, Games second.
- Identity reference: a simplified four-eyed Hearthian with gray-blue skin,
  broad side ears, compact mouth, warm practical flight jacket, scarf and
  ticket-agent manner.
- Composition authority: C7 itself. Earlier Travel generations and the old
  frog booth are not composition references.

The stall is frontal-oblique/axonometric in the same RPG view as Uses. The
front counter uses the Uses countertop angle as the projection Gospel.
Verticals remain vertical and horizontal top bands remain shallow parallel
planes. There is no perspective vanishing point and no isometric diamond grid.

The booth must retain:

- the striped patched canopy and tall side posts;
- thick left/right structural returns and an overhead soffit;
- a genuinely recessed rear wall approximately one metre behind the
  Hearthian, with a dark floor gap and visible side depth;
- the individual hanging `travel` sign;
- the small `LAST SEATS` board;
- three route cards on the rear wall;
- lanterns, rolled maps, helmet and suit display, tickets, orbital model,
  desk machine, route card, telescope, counter, front storage, crate and
  small rocket;
- a distinctly hand-built, worn construction rather than a clean sci-fi
  kiosk.

The Hearthian stands behind and contacts the counter. The fixed torso, pelvis,
counter-contact seam and stall structure are never translated or rescaled.
The character is welcoming, seasoned, adventurous and charmingly urgent.

## Rendering contract

- Raw edits use one flat `#ff00ff` backing with no variation.
- Production output is exactly `960 × 1264`.
- The authored grid is `320 × 421`, enlarged exactly 3× nearest-neighbour to
  `960 × 1263`, plus one fully transparent padding row.
- Final production palette: at most 20 opaque colours, all drawn from idle 1.
- Use broad flat clusters, strong near-black outlines and normally three hard
  tones per material.
- Keep the warm canvas/brown/brass/cream booth palette, gray-blue Hearthian and
  small amber practical lights.
- No antialiasing, soft gradients, painterly modelling, glossy 3D, fuzzy
  edges, AI micro-detail, sub-grid marks or soft photographic shadows.
- Simplify rendering, never layout. Do not uniformise Travel into Uses or
  Games; its sign, enclosure, props and character remain its own.

## Full-frame generation rule

Every pose is an **independent precise edit of accepted C7 idle 1**. Never
chain a new pose from another generated pose. A raw ImageGen edit is only a
candidate: the production build remaps it to idle 1’s palette and copies idle
1 back over every pixel outside that pose’s declared motion mask.

The fixed stall, rear wall, depth returns, canopy, sign, board, route cards,
counter, props, torso and root therefore remain byte-identical even when a raw
candidate subtly re-renders them.

## Base normalization prompt

```text
Use case: style-transfer / precise composition-preserving edit
Asset type: one production sprite for Bazaar3 Travel

Image 1 is the accepted C7 Travel composition and absolute authority for
layout, silhouette, depth, character position, stall structure, signs, props,
occlusion and counter contact. Images 2 and 3 are Uses and Games, rendering
references only.

Preserve C7’s exact enclosed front-facing axonometric booth: striped canopy,
thick side returns and soffit, rear wall visibly about one metre behind the
Hearthian, dark floor gap, Uses-angle counter, travel sign, LAST SEATS board,
route cards, lanterns, maps, suit display, tickets, instruments, storage,
crate and rocket. Preserve the same friendly four-eyed gray-blue Hearthian,
flight jacket, scarf, torso position and counter contact. This is not a frog.

Change only the rendering language: flatter deliberately limited colours,
strong near-black outlines, broad chunky 16-bit-inspired clusters, three hard
tones per material and sparse intentional dither. Less is more. Keep Travel’s
own warm hand-built identity.

Return exactly one PNG on perfectly flat #ff00ff. Do not move, scale, recrop,
mirror, rotate, add, remove, replace, tidy, professionalise or redraw any
layout element. No vanishing point, isometric view, soft gradient,
antialiasing, painterly detail, extra character, extra readable text,
watermark, street element or audio reference.
```

## Animation prompts

All prompts below use accepted C7 idle 1 as the sole edit target. Everything
not explicitly named stays fixed.

### Idle 2 — four-eye blink and ticket shuffle

```text
Create one independent alternate idle pose from accepted C7. Close/blink all
four Hearthian eyes in a readable paired rhythm and articulate only fingers
and wrist for a tiny ticket shuffle at working height. Keep head silhouette,
neck, shoulders, torso, pelvis, counter contact, scale, booth and every prop
fixed. The ticket marks remain abstract.

Return exactly one full-canvas PNG on flat #ff00ff. Do not redraw or relight
the stall. No body bob, translation, rescale, recrop or new detail.
```

### Hover 1 — welcoming viewer contact

```text
Create one independent hover pose from accepted C7. Brighten/open all four
Hearthian eyes into direct welcoming contact with the camera and allow only a
tiny head angle around the fixed neck. Keep arms, ticket, shoulders, torso,
root, counter contact, booth and every prop fixed.

Return exactly one full-canvas PNG on flat #ff00ff. No body slide, booth
change, added effect, rescale or recrop.
```

### Hover 2 — selected ticket raised

```text
Create one independent hover pose from accepted C7. Keep friendly four-eye
contact. Articulate one arm upward from its fixed shoulder chain and raise one
selected ticket with calm urgency. The other hand remains planted at the
counter. Keep torso, pelvis, counter-contact seam, scale, booth and all props
fixed. The ticket stays inside the open character bay and has unreadable
marks.

Return exactly one full-canvas PNG on flat #ff00ff. No structure redraw, body
translation, rescale, recrop or extra ticket.
```

### Hover 3 — ticket held, improbable route indicated

```text
Create one independent hover pose from accepted C7. Hold the selected ticket
high with one arm and articulate the other arm from its fixed shoulder into a
clear point toward the central improbable route card. Keep the gesture warm
and enthusiastic, not frantic. Preserve all four-eye contact, torso, pelvis,
counter-contact seam, scale, booth depth and every prop.

Return exactly one full-canvas PNG on flat #ff00ff. Do not redraw the route
card or add route text/effects. No body slide, rescale, recrop or booth change.
```

## Production verification

Build and verify with:

```sh
node scripts/bazaar3/build-v2-frames.mjs --family travel
node scripts/bazaar3/verify-v2-frames.mjs
```

Acceptance requires:

- exact `960 × 1264` canvas and binary alpha;
- exact 3× nearest-neighbour blocks and transparent padding row;
- no opaque colour outside idle 1’s 20-colour palette;
- zero changed pixels outside each declared motion mask;
- byte-identical torso and counter/root patches;
- one identical surrounding-structure hash across all five frames;
- correct five-beat read: neutral, blink/shuffle, eye contact, ticket raise,
  ticket held plus route point;
- live Chrome checks at desktop and mobile breakpoints;
- no street or audio asset change.
