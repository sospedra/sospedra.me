# 03 — the axonometric camera

The single hardest thing in the whole campaign. Diffusion models default
to perspective; the bazaar needs a flat, authored, game-like projection.
The doctrine took ~14 rounds to converge and ended user-vectorized.

## The final doctrine (as shipped)

- FLAT STOREFRONT ELEVATION: camera dead-on, standing eye height. No
  vanishing points, no isometric rotation, no room interiors, no side
  walls, no ceilings.
- TWO-SURFACE LAW for tall furniture: front rectangle + ONE thin
  horizontal top band (~1/5 of width deep). A visible left/right side
  face = rejection. Depth between objects is OVERLAP ONLY.
- VERTICALITY ABSOLUTE: every vertical dead vertical. (A brief "racks
  lean toward Ed" experiment produced "tilted and crooked" and died; the
  intended surrounding is done by PLACEMENT and overlap.)
- THE SLAB: stalls stand on a platform slab. Top face = symmetric
  trapezoid, interior corners 130/50/50/130; side slope EXACTLY 68 px
  inward per 81 px down (the user's SVG numbers, coprime integers, ~50
  degrees). Front face = plain rectangle, 90 degrees throughout. The slab
  top face is the ONLY ground plane; bases live on it; further back =
  higher. The rug is a concentric trapezoid with the same slope.
- PROP GOSPEL: floor props (boxes, pizza, power strips) copy the slab
  construction: 130/50 trapezoid tops over 90-degree fronts. Tall
  furniture keeps the thin band instead — tops near eye height read
  thin, floor objects read as walkable-plane citizens.
- DIAGONAL SCOPE: constructed diagonals are ONLY the 68:81 sides.
  Organic drawing (hair, limbs, cables, bent poles, glare bands) is
  exempt — an early absolute diagonal ban made the order unsatisfiable
  (codex review finding: the bent pole and spiky hair were illegal).
- ONE ground line at the page contact; nothing below it, no invented
  shadows on the chroma.

## How it was enforced (the instruments)

1. assets/angle-law.png — the original drawn law: GREEN legal
   construction (front rect + top band) vs RED crossed-out isometric.
   Attached to every scene order since r13.
2. Camera gospels: attach an approved stall ("copy the camera, zero
   content"). Painted corner proofs cut from shipped stalls
   (assets/corner-w98.png, assets/counter-papers.png) taught the corner
   construction better than words.
3. The user's vectors: assets/corner-vector-crop.png (first corner SVG,
   23:27 ~ 40deg draft) then assets/slab-angles.png (the final 130/50
   trapezoid + 90 front face). "It defines strict angles." Orders then
   restated the slope as the diagram's own integers: 68:81, because any
   rounded restatement (60:72 = 50.19deg) was flagged by the adversarial
   review as not-the-authority.
4. Vertex pixels + checkpoints: the slab's six vertices as absolute
   canvas coordinates plus checkpoint dots every ~20 rows that the edges
   must pass through, drawn as green dots on the plan AND listed as
   coordinate pairs in text. assets/composition9.png shows the final
   form.
5. The verdict card (assets/angle-verdict.png): the RIGHT construction
   next to the WRONG one (the model's own previous 62-degree failure,
   crossed out red, with its measured numbers). Naming the failure's
   numbers in-image and in-text is what finally moved the needle.

## The measurement side

Slope is measured, never eyeballed, from the rendered art: walk the art
bbox's left edge across the slab ramp rows, fit dx over dy, atan. The war
log: gen7 62.0deg -> gen8a 61.7 (rules only) -> gen8b 55.5 (corrective
attachment) -> gen11 series accepted by eye. The corrective instrument is
the only one whose deltas were ever nonzero.

## The camera family across stalls

The games stall is the world-camera authority (assets/games-composed.png):
floor as a thin strip, kids' feet on one line, arcade frontal. The r15
phrasing that produced it is canon: "a FLAT STOREFRONT seen dead-on...
NOT a room, NOT a stage, NOT a diorama... the floor is a THIN HORIZONTAL
STRIP... every box: front rectangle + one thin top band, vertical sides,
nothing else." When a new stall's order contradicts that language (the
r20 stall-war body did: "camera slightly LOWER", "rug band is DEEP",
"rotated toward Ed"), every render fails identically and the order is the
bug. Winning words travel: copy the working construction's language
verbatim across assets.

## The slab as depth compromise

The slab reconciles two contradictory demands: "flat like games" and
"the rug must tilt toward the viewer". Resolution: the world stays a flat
elevation, but the stall stands on a shallow platform whose top face is
the one legal foreshortened plane. Depth returns as a bounded, vectorized,
checkpointed surface instead of a free-floating camera opinion. That
compromise — give the model exactly one plane to be deep in — is probably
the blog's best diagram.
