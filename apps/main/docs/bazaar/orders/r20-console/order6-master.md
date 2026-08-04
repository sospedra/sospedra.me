# Codex order - r20.6 - console master (stall + Ed), flat-elevation rebuild

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the COMPOSITION BOARD, the single visual authority.
  file: tmp/bazaar3/master-run-20260728/r20-console/composition6.png
  view: http://localhost:8377/r20-console/composition6.png
  It contains four things:
  1. LEFT: the GAMES stall, the WORLD CAMERA GOSPEL. Copy its camera,
     its floor angle, its flatness EXACTLY. Copy ZERO content, zero
     composition, zero colors from it.
  2. CENTER: the STALL PLAN, a red frame with dashed element boxes.
     These are INVISIBLE CONSTRAINTS: obey the layout, never draw the
     frame, the dashed boxes, the labels, or any caption text.
  3. TOP-RIGHT: the CORNER LAW, vectorized. GREEN is the top surface:
     back and front edges horizontal, and at an exposed corner the
     edge slants down-forward 23 px across per 27 px down. MAGENTA is
     the front face: dead-vertical sides, a straight band below the
     top surface. Draw every counter, platform, cabinet and shelf
     corner with THIS construction.
  4. RIGHT: two painted proofs of the corner law, a w98 floor corner
     and the papers countertop. Copy their ANGLE only, zero content.
  Nothing that appears on the board may be drawn into the output: no
  boxes, no labels, no games art, no crops. Only obey them.
- Image 2 = the angle law diagram.
  file: tmp/bazaar3/master-run-20260728/r12/angle-law.png
  view: http://localhost:8377/r12/angle-law.png
  The GREEN construction is the ONLY legal way to draw ANY box, rack,
  CRT, cabinet, crate or floor: front rectangle with vertical sides
  plus ONE thin horizontal top band. The RED crossed-out isometric
  construction is FORBIDDEN. Any visible side face = the image is
  wrong.

GENERATE the redesigned CONSOLE stall on canvas 1536x1024, flat
chroma green #00ff00 everywhere except the stall.

## 1. CAMERA LAW - read this before anything else

- The camera is the games stall's camera (Image 1, left): a FLAT
  STOREFRONT ELEVATION seen dead-on, straight in front, at standing
  eye height. The exact same angle of floor as the games stall. Not
  lower, not higher, not tilted.
- The stall is NOT a room, NOT a stage, NOT a diorama, NOT an
  interior with depth. There is no side wall, no ceiling, no corner
  room, no receding platform, no space Ed sits "inside".
- ONE GROUND LINE: y=920. Every object's base sits ON y=920: the left
  tower, the monitor cabinet, the right shelving, the peripherals
  box, Ed's leg bundle. Nothing floats, nothing stands deeper or
  shallower. There IS no deeper.
- The floor is a THIN HORIZONTAL STRIP: the rug band, 48 px tall,
  behind and under the feet. If the floor reads as a walkable plane
  receding into the scene, the image is wrong and must be redone.
- DEPTH IS OVERLAP, NOTHING ELSE: a nearer object overlaps a farther
  one. Depth is NEVER shown by rotation, foreshortening, convergence,
  or perspective size change.
- Before returning, COUNT the ground lines. More than one baseline =
  REJECTION.

## 2. AXONOMETRIC RULES - how every object is constructed

- Every vertical edge dead vertical. Every horizontal edge dead
  horizontal. NO diagonal receding lines anywhere except corner
  edges per the corner law below. NO vanishing points, NO isometric
  rotation.
- Every box-like object (rack, CRT, cabinet, crate, cardboard box)
  shows exactly TWO surfaces: its front rectangle plus ONE thin
  horizontal top band, about a fifth of its width deep. NEVER a third
  surface. A visible left or right side face = REJECTION.
- THE CORNER LAW (Image 1, top-right vector): where a top surface
  reaches an exposed left or right corner, its end edge slants
  down-forward 23 px across per 27 px down, meeting the front face.
  The front face below keeps dead-vertical sides. This is the ONLY
  legal diagonal in the whole image. The w98 crate corner and the
  papers countertop on the board show it painted.
- All furniture faces the viewer square-on. Nothing rotates toward
  Ed, nothing angles inward, nothing "encloses" anything.
- Objects lying on the floor obey the same construction:
  - THE RUG is a FLAT STRAIGHT HORIZONTAL BAND: left and right edges
    VERTICAL, top and bottom edges HORIZONTAL and PARALLEL. Pattern
    rows run horizontally, compressed toward the top edge. NEVER a
    trapezoid, NEVER a diamond, NEVER converging, NEVER rotated.
  - The pizza box, power strip and peripherals box footprints: front
    face plus a shallow parallel top band, edges parallel.

## 3. COMPOSITION SCHEMA - pixel boxes (each +/-10 px), all bases on y=920

Image 1's center plan draws every box below. Total art EXACTLY the
frame width: 608 px (x=464..1072), 736 tall (y=184..920), ground
line y=920.

- HANGING SIGN "console" x=840..1048, y=197..270, RIGHT-ALIGNED over
  the right shelving: a riveted steel plate held by a TWISTED, BROKEN
  scrap pipe pole, bent twice, one visible fracture with a hanging
  bolt, rust bites. The pole drops from the sign at x=992..1053,
  y=264..584 and DISAPPEARS BEHIND the right shelving's top edge, an
  overlap, never a depth cue. The ONLY readable word. NO other pipes
  anywhere.
- LEFT: a slim SERVER TOWER x=477..667, y=520..920, base ON the
  ground line. Three closed bands with vent slots, amber/teal LED
  dot rows, one band ajar. FRONTAL: front rectangle + thin top band,
  no side face. ON ITS TOP the ONLY LIT SCREEN in the stall: a CRT
  x=498..640, y=432..520, alive with flat two-tone WHITE-GREY static,
  two knobs.
- CENTER-BACK: the MONITOR STACK x=690..870. A dark closed media
  cabinet x=690..870, y=780..920, base ON the ground line, and ON it
  a 2x2 stack of mismatched dead CRTs y=560..780 (two tan, one grey,
  one dark), ALL FOUR DARK dead screens with one diagonal glare band
  each, rabbit ears on the top-right. The stack STANDS on its
  cabinet; nothing is wall-mounted, nothing floats.
- ED x=688..848, y=700..916: a skinny kid sitting cross-legged ON
  the rug, IN FRONT of the monitor cabinet, overlapping its lower
  half. Wild red dreads, a visor pushed up on the forehead, a game
  controller held in the lap with both hands, sock feet tucked under
  the knees. Drawn with the same dead-on camera as everything else:
  face toward the viewer, leg bundle a wide flat base ON the ground
  line.
- RIGHT: an OPEN SHELVING frame x=867..1059, y=584..920, base ON the
  ground line. A DIFFERENT construction than the left tower and
  SHORTER: angle-iron uprights with bolt dots, top shelf a dead amp
  with a hanging patch cable, middle shelf three stacked tape decks,
  bottom shelf a coiled cable pile. FRONTAL, no side face.
- PERIPHERALS BOX x=851..979, y=820..920, base ON the ground line,
  standing IN FRONT of the shelving's lower shelf (overlap): an open
  cardboard box spilling two beige keyboards and a mouse hanging by
  its cable.
- RUG, FULL STALL WIDTH x=464..1072, y=872..920: a THIN flat band,
  48 px tall, three tones, horizontal pattern rows, fringe dots along
  the front edge at y=914..920. Every object's base overlaps it.
- PIZZA BOX x=522..618, y=876..916 on the rug, open, two slices.
- MULTI-OUTLET POWER STRIP (no keyboard anywhere) x=704..848,
  y=896..916 on the rug in front of Ed: four plugs in, one lit
  switch.
- CABLE SPAGHETTI x=496..1040, y=880..918: cables pool along the
  rug band only inside this zone.

WIDTH LAW, the redo reason, absolute: the stall is a TALL NARROW
den. MEASURE the width before returning: art wider than 620 px is a
REJECTION. Racks are SLIM towers, never wide cabinets.

## LIGHT LAW - causal, single source

The ONE lit CRT shows WHITE-GREY static (pale grey bands, never cyan,
never blue) and throws one flat PALE WHITE-GREY receiver band toward
Ed and one small white-grey pool on the rug under it. Rack LEDs give
thin amber spill strips only. Nothing else emits.

## STYLE - the bazaar doctrine

Authored low-res 16-bit pixel art, large flat bounded color regions,
chunky square clusters, near-black outlines, exactly three tones per
material, sparse hard highlights, LOW DETAIL.

Color palette: use ONLY these colors, nothing else:
#020307 #111923 #2b3741 #606970 #644d35 #7d6144 #96795a #dc7707
#f5b749 #7b7a78 #5a5a58 #9b9a98 #c9c8c5 #f2f1ee #4c2815 #6e3d20
#8f5a2e #180802 #471907 #58240c #ad6a1e #df9e32 #ffd26b

## AVOID - hard rejections

Antialiasing, gradients, blur, glow, bloom, painterly shading,
microtexture, noise. Perspective convergence, isometric rotation, ANY
visible side face, furniture rotated toward Ed, a floor that reads as
a plane, a deep rug, more than one ground line, wall-mounted or
floating objects, interior walls, ceilings, room corners. Cyan or
blue screens, extra lit screens, wall pipes, extra readable text,
watermarks, art outside the frame, art touching the frame, characters
other than Ed. Drawing anything that appears on the composition
board: its boxes, labels, frame, games art or crops.

## THE INVENTORY - verbose, draw all of it

The sign plate rusted steel with gold lowercase glyphs on its twisted
broken pipe arm. The left server tower: three closed bands with vent
slots, LED dot rows, one band ajar. The lit CRT on top: two knobs,
static in two tones. The monitor stack: dark media cabinet, four
mismatched dead CRTs, rabbit ears top-right. Ed: red dreads, visor
up, controller in lap, sock feet. The right shelving: angle-iron
uprights with bolt dots, dead amp with hanging patch cable, three
stacked tape decks, coiled cable pile. The peripherals box: flaps
open, two beige keyboards leaning out, one mouse hanging by its
cable. Thin rug band: three tones, horizontal pattern rows, front
fringe. Open pizza box with two slices. The multi-outlet strip with
four plugs and one lit switch.

Call image_gen once to GENERATE at 1536x1024. Copy the result
unmodified to r20-console/gen6-master.png and print GENERATED=<path>.
