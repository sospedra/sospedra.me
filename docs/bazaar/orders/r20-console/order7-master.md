# Codex order - r20.7b - console master (stall + Ed) on the slab

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the COMPOSITION PLAN.
  file: tmp/bazaar3/master-run-20260728/r20-console/composition7.png
  view: http://localhost:8377/r20-console/composition7.png
  A drawn diagram: the red stall frame, the slab (green top face,
  magenta front face), the amber rug, dashed element boxes, text
  panels. ALL of it is an INVISIBLE CONSTRAINT: obey the layout and
  the written doctrine, never draw the frame, the outlines, the
  dashed boxes, the labels or any text into the output.
- Image 2 = the SLAB ANGLE DIAGRAM, the strict angle authority.
  file: tmp/bazaar3/master-run-20260728/r20-console/in/slab-angles.png
  view: http://localhost:8377/r20-console/in/slab-angles.png
  GREEN top face: a symmetric trapezoid, interior corners clockwise
  from top-right 130, 50, 50, 130 degrees. Its side slope is EXACTLY
  68 px inward per 81 px down. MAGENTA front face: a rectangle, 90
  degrees at all four corners. The console stall's slab copies these
  angles EXACTLY. The diagram's flat green and magenta are LABELS
  for the two faces, never art colors: the real slab is WOOD.
- Image 3 = ED, the character gospel (a Cowboy Bebop film still).
  file: tmp/bazaar3/master-run-20260728/r20-console/in/bebop-ed.png
  view: http://localhost:8377/r20-console/in/bebop-ed.png
  Copy the KID: skinny, tan skin, a mop of spiky red hair, big round
  goggles with pale green lenses pushed up on the hairline, a loose
  white tee, dark bike shorts, barefoot. Copy the CLUTTER VIBE only
  as categories (dead electronics, boxes, cable spaghetti) and
  invent every instance fresh. Copy ZERO camera from it: Image 3
  looks DOWN from high above; this order's camera is a flat
  storefront elevation. Copy zero layout and zero specific objects.

GENERATE the redesigned CONSOLE stall on canvas 1536x1024. The flat
chroma green #00ff00 is the BACKGROUND KEY: it fills everything
outside the stall art and never appears inside it.

## 1. CAMERA LAW - read this before anything else

- The camera: a FLAT STOREFRONT ELEVATION seen dead-on, straight in
  front, at standing eye height. Not lower, not higher, not tilted,
  no vanishing points, no isometric rotation.
- The stall is NOT a room, NOT a stage-set interior, NOT a diorama.
  No side walls, no ceiling, no room corners, no space Ed sits
  "inside".
- THE SLAB IS THE BASE: the whole stall stands on a low platform
  slab. Its TOP FACE is the ONLY GROUND PLANE in the image: a
  symmetric trapezoid with Image 2's angles. Its FRONT FACE is a
  plain rectangle, 90 degrees throughout. The front face's bottom
  edge at y=920 is the art's lowest pixel: NOTHING exists below it,
  no shadow, no reflection, only chroma.
- Furniture top bands and prop top faces (section 2) are shallow
  SURFACE REVEALS of this same projection. They are not new ground
  planes, not interior depth. There is exactly ONE ground plane:
  the slab top face.
- BASES LIVE ON THE SLAB FACE: every object's base sits ON the top
  face, between its back edge (y=775) and its front edge (y=856).
  Further back = higher on the face. Back row bases y=812..816, Ed
  y=852, front props y=850..852. A floating base or a base off the
  face = REJECTION.
- THE STALL IS TALLER THAN ITS FURNITURE: the frame is 800 px tall
  (y=120..920) as a LIMIT, not a fill target; the art itself spans
  y=133 (sign top) to y=920. Everything above y=310 is SIGN AIR:
  only the hanging sign and its broken pole live up there.
  Furniture never grows past its schema box to fill the height.
- Furniture depth is OVERLAP: a nearer object overlaps a farther
  one, and nearer objects sit LOWER on the face. Never rotation,
  never perspective size change.

## 2. AXONOMETRIC RULES - how every object is constructed

- Every vertical edge dead vertical. Every horizontal edge dead
  horizontal.
- THE ANGLE, maximum priority: every trapezoid side in this image
  slopes EXACTLY 68 px inward per 81 px down (the Image 2 slope, 50
  degrees). This applies to the slab top face, the rug, and every
  prop top face. A wrong slope is a REJECTION.
- THE SLAB: top face back edge x=532..1004 at y=775, front edge
  x=464..1072 at y=856, 81 px deep, side inset 68 px per side
  (exact). Front face x=464..1072, y=856..920, 64 px tall, corners
  90 degrees. The slab MAY touch the frame edges: it defines them.
- THE RUG lies ON the top face and FILLS almost all of it: a
  CONCENTRIC trapezoid, sides at the same slope. Front edge
  x=490..1046 at y=852, back edge x=530..1006 at y=804. Bare slab
  wood shows only as a thin margin. Pattern rows run horizontally,
  compressed toward the back edge as the face's own foreshortening.
  Fringe dots along the front edge only.
- TALL FURNITURE (server tower, media cabinet, CRT stack, open
  shelving) shows exactly TWO surfaces: its front rectangle plus
  ONE thin horizontal top band, about a fifth of its width deep.
  NEVER a third surface. A visible left or right side face =
  REJECTION. The shelving FRAME obeys the same law: each shelf
  shows only a thin front edge band; contents sit frontal inside
  the openings.
- FLOOR PROPS BELOW ED (peripherals box, pizza box, power strip)
  follow the ANGLE GOSPEL like the slab: top face a symmetric
  trapezoid at the exact 68:81 slope, front face 90 degrees. Their
  verticals stay dead vertical.
- DIAGONAL SCOPE: the 68:81 trapezoid sides are the only legal
  diagonal SURFACE EDGES. Organic and detail drawing is exempt:
  Ed's hair and limbs, cables, the bent sign pole, screen glare
  bands, antennae. Those are lines and shapes, not constructed
  surfaces.
- All furniture faces the viewer square-on. Nothing rotates toward
  Ed, nothing angles inward, nothing "encloses" anything. Contents
  INSIDE an open box (keyboards, flaps) may lean as drawing, not
  as rotated box construction.

## 3. COMPOSITION SCHEMA - pixel boxes

Image 1 draws every box below. Tolerance +/-10 px INWARD ONLY for
elements at an edge: nothing may move outward past the frame, off
the slab face, or above its declared top. Total art EXACTLY the
frame width: 608 px (x=464..1072).

- THE SLAB (draw it first): worn dark wood. Top face planks run
  horizontally across the trapezoid; front face is a band of
  vertical plank butts with sparse nail dots. Three wood tones,
  near-black seams. NEVER green: the diagram's green is a label.
- THE RUG on the slab: three tones, horizontal pattern rows, front
  fringe.
- HANGING SIGN "console" x=840..1048, y=133..206, RIGHT-ALIGNED
  over the right shelving, HIGH in the sign air: a riveted steel
  plate held by a TWISTED, BROKEN scrap pipe pole, bent twice, one
  visible fracture with a hanging bolt, rust bites. The pole drops
  from the sign at x=992..1050, y=200..500 and DISAPPEARS BEHIND
  the right shelving's top edge (overlap, never depth). The ONLY
  readable word. NO other pipes anywhere.
- LEFT: a slim SERVER TOWER x=508..670, y=412..812, base ON the
  slab face at y=812. Three closed bands with vent slots, LED dot
  rows, one band ajar. FRONTAL: front rectangle + thin top band,
  no side face. ON ITS TOP the ONLY LIT SCREEN in the stall: a CRT
  x=524..664, y=324..412, alive with WHITE-GREY static drawn as
  flat two-tone horizontal bands, NEVER noise texture. Two knobs.
- CENTER-BACK: the MONITOR STACK x=690..866. A dark closed media
  cabinet x=690..866, y=696..816, base at y=816, and ON it TWO
  large mismatched dead CRTs stacked in a column, x=690..866,
  y=456..696 (one tan, one grey, landscape screens), BOTH DARK
  dead screens with one diagonal glare band each. Rabbit ears on
  the top CRT may rise into y=436..456 and nothing else may. The
  stack STANDS on its cabinet; nothing is wall-mounted, nothing
  floats.
- ED x=700..912, y=577..852: the Image 3 kid, sitting cross-legged
  ON the rug facing the viewer, base of the leg bundle at y=852,
  seat plane near y=815. He sits IN FRONT of the monitor stack:
  his body hides most of the cabinet and the lower half of the
  bottom CRT; the top CRT stays fully visible. His right arm
  fronts the shelving's lower-left corner. Red spiky hair, goggles
  up on the hairline, loose white tee, dark bike shorts, barefoot,
  a game controller held in the lap with both hands, one cable
  running from the controller into the cable pool. HEAD GUARD: if
  Ed's head top rises above y=560, he is too big, REJECTION. The
  stall column reads about 2.9 Eds tall; the racks tower over him.
- RIGHT: an OPEN SHELVING frame x=870..1030, y=480..816, base at
  y=816. A DIFFERENT construction than the left tower and SHORTER:
  angle-iron uprights with bolt dots, top shelf a dead amp with a
  hanging patch cable, middle shelf three stacked tape decks,
  bottom shelf a coiled cable pile. FRONTAL, no side face.
- PERIPHERALS BOX x=880..1008, y=748..848, base at y=848: an open
  cardboard box standing BETWEEN shelving (behind it) and Ed's
  right arm (in front of it): flaps open, two beige keyboards
  leaning out at half scale, partially hidden by the flaps, one
  mouse hanging by its cable. GOSPEL CONSTRUCTION: open top a
  68:81 trapezoid, front face 90.
- PIZZA BOX x=548..644, y=816..852 on the rug's left: open, the
  lid lying flat open to the LEFT on the rug, two slices in the
  base. GOSPEL CONSTRUCTION: lid and base tops are 68:81
  trapezoids, front edges 90.
- MULTI-OUTLET POWER STRIP x=660..756, y=832..850 on the rug,
  poking out from behind Ed's left knee: four plugs in, one lit
  switch. The strip is NOT a keyboard; the ONLY keyboards in the
  stall are inside the peripherals box. GOSPEL CONSTRUCTION: top
  face a 68:81 trapezoid strip, front face 90.
- CABLE SPAGHETTI x=520..1020, y=804..854: cables pool across the
  slab face around the furniture bases, only inside this zone.

WIDTH LAW, the redo reason, absolute: the stall is a TALL NARROW
den. COVERAGE GUARD: the art occupies only the middle ~40% of the
1536-wide canvas; each side keeps a chroma margin about 464 px
wide, i.e. each margin is about 3/4 as wide as the stall itself.
If either margin looks thinner than that, the art is TOO WIDE:
REJECTION. Racks are SLIM towers, never wide cabinets.

## LIGHT LAW - causal, single source

The ONE lit CRT shows WHITE-GREY static (pale grey bands, never
cyan, never blue) and throws one flat PALE WHITE-GREY receiver band
toward Ed and one small white-grey pool on the slab under it. Rack
LEDs give thin amber and deep-teal dots only, each at most 3 px,
never on any screen. Nothing else emits.

## STYLE - the bazaar doctrine

Authored low-res 16-bit pixel art, large flat bounded color
regions, chunky square clusters, near-black outlines, exactly three
tones per material, sparse hard highlights, LOW DETAIL.

Color palette for the STALL ART, use ONLY these colors inside the
art (#00ff00 is reserved for the background key and appears in zero
art pixels):
#020307 #111923 #2b3741 #606970 #644d35 #7d6144 #96795a #dc7707
#f5b749 #7b7a78 #5a5a58 #9b9a98 #c9c8c5 #f2f1ee #4c2815 #6e3d20
#8f5a2e #180802 #471907 #58240c #ad6a1e #df9e32 #ffd26b #8faf6f
#2f7f78
The last two are scoped: #8faf6f ONLY for Ed's goggle lenses;
#2f7f78 ONLY for LED dots. Neither ever appears on a screen.

## AVOID - hard rejections

Antialiasing, gradients, blur, glow, bloom, painterly shading,
microtexture, noise. Perspective convergence, isometric rotation,
ANY visible side face on furniture, furniture rotated toward Ed, a
second ground plane, a floor deeper than the slab face, floating
bases, wall-mounted objects, interior walls, ceilings, room
corners. Cyan or blue screens, extra lit screens, wall pipes,
extra readable text, watermarks, art crossing outside the frame,
any pixel below y=920. Chroma green inside the art or wood drawn
as green. Drawing anything from the diagrams: frames, dashed
boxes, outlines, labels. Copying Image 3's camera, layout or
specific objects.

## THE INVENTORY - verbose, draw all of it

The slab: worn dark wood, horizontal planks on the top face,
vertical plank butts on the front face, three tones, near-black
seams. The rug: three tones, horizontal pattern rows, front
fringe. The sign plate: rusted steel with gold lowercase glyphs on
its twisted broken pipe arm. The left server tower: three closed
bands with vent slots, LED dot rows, one band ajar. The lit CRT on
top: two knobs, static as flat two-tone bands. The monitor stack:
dark media cabinet, two large mismatched dead CRTs stacked, rabbit
ears on the top one. Ed: red spiky hair, goggles up with pale
green lenses, white tee, dark shorts, barefoot, controller in lap.
The right shelving: angle-iron uprights with bolt dots, dead amp
with hanging patch cable, three stacked tape decks, coiled cable
pile. The peripherals box: flaps open, two beige keyboards leaning
out at half scale, one mouse hanging by its cable. Open pizza box,
lid flat to the left, two slices. The multi-outlet strip with four
plugs and one lit switch. Cable spaghetti pooling around every
base.

Call image_gen once to GENERATE at 1536x1024. Copy the result
unmodified to r20-console/gen7-master.png and print
GENERATED=<path>.
