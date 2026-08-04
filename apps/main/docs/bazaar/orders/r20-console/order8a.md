# Codex order - r20.8a - console master, nest edition

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the COMPOSITION PLAN (drawn diagram). The red frame, the
  slab outlines, the green checkpoint dots, the amber rug, dashed
  boxes, text panels: ALL invisible constraints. Obey the layout,
  never draw any of it.
- Image 2 = the SLAB ANGLE DIAGRAM: green top face, corners
  130/50/50/130, side slope EXACTLY 68 px inward per 81 px down;
  magenta front face, 90 degrees throughout. The diagram's flat
  green and magenta are LABELS, never art colors: the real slab is
  WOOD.
- Image 3 = ED, the character gospel (a Cowboy Bebop film still).
  Copy the KID: skinny, tan skin, spiky red hair, round goggles
  with pale green lenses, loose white tee, dark bike shorts,
  barefoot. Copy the CLUTTER VIBE as categories only; invent every
  instance. Copy ZERO camera (Image 3 looks down from above; this
  order is a flat storefront elevation), zero layout, zero specific
  objects.

GENERATE the redesigned CONSOLE stall on canvas 1536x1024. Flat
chroma green #00ff00 is the BACKGROUND KEY: everything outside the
stall art, zero pixels inside it.

## 1. THE ANGLE - maximum priority, the previous render failed it

- The PREVIOUS attempt drew the slab side edges rising 96 px while
  moving only 50 px inward: 62 degrees. REJECTED.
- THE LAW: every slab and prop trapezoid side edge slopes EXACTLY
  68 px inward per 81 px down. 50 degrees. Interior corners
  130/50/50/130 per Image 2.
- THE SLAB VERTICES, absolute canvas pixels:
  top face: back-left (532,775), back-right (1004,775),
  front-right (1072,856), front-left (464,856).
  front face: (464,856) (1072,856) (1072,920) (464,920).
- CHECKPOINTS, the edges pass through these exact points:
  left edge: (532,775) (515,795) (498,815) (481,835) (464,856).
  right edge: (1004,775) (1021,795) (1038,815) (1055,835)
  (1072,856).
  Image 1 draws these as green dots. Hit them.
- A slab drawn steeper (edges more vertical, face deeper) or
  flatter than 68:81 is a REJECTION. Check before returning.

## 2. CAMERA LAW

- A FLAT STOREFRONT ELEVATION seen dead-on at standing eye height.
  No vanishing points, no isometric rotation, no tilt.
- NOT a room, NOT an interior. No side walls, no ceiling, no
  corners. Chroma directly behind the furniture.
- THE SLAB IS THE BASE and its top face is the ONLY GROUND PLANE.
  Front face bottom y=920 is the art's lowest pixel: nothing below
  it, no shadow, no reflection.
- Furniture top bands and prop top faces are shallow surface
  reveals of the same projection, never new ground planes.
- BASES LIVE ON THE SLAB FACE (y=775 back edge to y=856 front
  edge). Further back = higher. Racks y=812..816, Ed y=852, front
  props y=848..852. Floating base or base off the face =
  REJECTION.
- TALLER STALL: the frame is 800 tall (y=120..920) as a LIMIT; art
  spans y=133..920; above y=310 is SIGN AIR where only the sign
  and pole live.
- Depth between objects is OVERLAP only, and nearer sits lower on
  the face. Never rotation in depth, never size change.

## 3. AXONOMETRIC RULES

- Verticals dead vertical, horizontals dead horizontal, except:
  the 68:81 trapezoid sides, and the NEST LEAN below.
- THE RUG fills the slab face: concentric trapezoid, same 68:81
  sides. Front edge x=490..1046 at y=852, back edge x=530..1006
  at y=804. Chunky square pattern rows in 3 flat tones, compressed
  toward the back, fringe dots on the front edge only. NEVER
  persian ornament, never fine detail.
- TALL FURNITURE shows exactly TWO surfaces: front rectangle + ONE
  thin top band, a fifth of its width deep. NEVER a side face.
- FLOOR PROPS BELOW ED (peripherals box, pizza box, power strip,
  handheld pile) follow the gospel: top face a 68:81 trapezoid,
  front face 90 degrees.
- THE NEST LEAN: rack A and the shelving LEAN toward Ed by 3-6
  degrees: a flat 2D tilt in the picture plane, top toward center,
  bases planted on the face. The lean NEVER reveals a side face,
  never becomes 3D rotation. Rack B stays vertical.
- DIAGONAL SCOPE: trapezoid sides and the nest lean are the only
  constructed diagonals. Organic drawing is exempt: Ed's hair and
  limbs, cables, the bent pole, one flat glare band per dead
  screen.
- Contents inside open boxes (keyboards, flaps) may lean as
  drawing, not as rotated construction.

## 4. COMPOSITION SCHEMA - pixel boxes, tolerance +/-10 px INWARD only

- THE SLAB first: worn dark wood, horizontal planks on the top
  face, vertical plank butts with sparse nail dots on the front
  face, three wood tones, near-black seams. NEVER green.
- THE RUG on it, as ruled above.
- SIGN "console" x=800..1064, y=133..230: a TALL riveted steel
  plate, rusted, gold lowercase glyphs, the ONLY readable word.
  Its pole x=960..1050, y=230..480 is CONTINUOUS STRUCTURAL STEEL:
  bent twice, rust bites, but ONE unbroken load-bearing piece,
  ending bolted INTO the shelving's top rail with a visible rusted
  bracket. Nothing floats, nothing is severed. NO other pipes.
- LEFT, SERVER RACK A x=508..670, y=412..812, base y=812, leaning
  4 degrees toward Ed: three closed bands with vent slots, LED dot
  rows, one band ajar. ON TOP the ONLY LIT SCREEN: a CRT
  x=524..664, y=324..412, WHITE-GREY static as flat two-tone
  horizontal bands, never noise. Two knobs.
- CENTER-BACK, SERVER RACK B x=690..866, y=456..816, base y=816,
  VERTICAL, directly behind Ed: a wider double-bay junk rack of
  DEAD equipment: dark panels, a patch bay with hanging cords, a
  shelf of stacked receivers, all screens dark. NO televisions, NO
  CRT stack here.
- ED x=700..912, y=577..852, base y=852 on the rug, seat plane
  near y=815: cross-legged, facing the viewer, leaning slightly
  forward, hands resting on his ankles. GOGGLES ON HIS EYES: round
  pale-green lenses, VR goggles in eyeglass shape, and ONE cable
  runs from the left temple down into the cable pool toward the
  racks. NO game controller anywhere in the stall. Red spiky hair,
  loose white tee, dark bike shorts, barefoot. HEAD GUARD: head
  top above y=560 = too big = REJECTION. The stall reads about
  2.9 Eds tall; the racks tower over him.
- RIGHT, OPEN SHELVING x=870..1030, y=480..816, base y=816,
  leaning 4 degrees toward Ed: angle-iron uprights with bolt dots,
  top shelf a dead amp with a hanging patch cable, middle shelf
  three stacked tape decks, bottom shelf a coiled cable pile.
- PERIPHERALS BOX x=880..1008, y=748..848, base y=848, between
  shelving (behind) and Ed's right arm (in front): open cardboard,
  flaps out, two beige keyboards leaning at half scale, one mouse
  hanging by its cable.
- PIZZA BOX x=548..644, y=816..852: open, lid flat to the LEFT on
  the rug, two slices.
- POWER STRIP x=660..756, y=832..850, poking from behind Ed's left
  knee: four plugs, one lit switch. NOT a keyboard; the only
  keyboards live in the peripherals box.
- HANDHELD PILE x=760..840, y=820..852, in front of Ed's knees: a
  small heap of dead handheld consoles, screens dark.
- CABLE SPAGHETTI x=520..1020, y=804..854: cables pool across the
  face around every base; Ed's goggle cable joins it. The clutter
  SURROUNDS Ed on all sides.

WIDTH LAW, absolute: the stall is a TALL NARROW den, art EXACTLY
608 px wide (x=464..1072). COVERAGE GUARD: each side keeps a
chroma margin about 464 px wide, about 3/4 as wide as the stall
itself. A thinner margin = art too wide = REJECTION.

## 5. LIGHT LAW - causal, single source

The ONE lit CRT throws one flat pale white-grey receiver band
toward Ed and one small pool on the slab under it. LED dots give
nothing. Nothing else emits. Never cyan, never blue.

## 6. STYLE - flat chunks, reduced palette

Authored low-res 16-bit pixel art. EVERY color region is a LARGE
FLAT CHUNK: zero gradients anywhere, including screens. A dead
screen's glare is ONE flat diagonal band of one tone. A CRT bezel
is two flat tones plus outline. LOW DETAIL everywhere.

EXACTLY 18 COLORS for the stall art, nothing else (#00ff00 stays
background-only):
#020307 #111923 #2b3741 #5a5a58 #9b9a98 #c9c8c5 #f2f1ee
#4c2815 #6e3d20 #8f5a2e #644d35 #96795a
#58240c #dc7707 #f5b749 #8f2f1f #8faf6f #2f7f78
Scoped: #8f2f1f only Ed's hair, #8faf6f only his goggle lenses,
#2f7f78 only LED dots. None of the three ever on a screen.

## 7. AVOID - hard rejections

Antialiasing, gradients, blur, glow, bloom, painterly shading,
noise, persian rug detail, more than 18 colors. Slab sides at any
slope but 68:81. Perspective convergence, isometric rotation, side
faces on furniture, a second ground plane, floating bases,
wall-mounted objects, interior walls or corners. TV or CRT stacks
behind Ed, any game controller, goggles worn on the forehead, a
broken or floating sign pole. Cyan or blue screens, extra lit
screens, extra readable text, watermarks, art crossing outside the
frame, any pixel below y=920, chroma green inside the art. Drawing
plan graphics: frames, dashed boxes, dots, labels. Copying Image
3's camera, layout or objects.

## 8. THE INVENTORY - draw all of it

The slab and rug as ruled. The tall rusted sign on its continuous
bent pole with bracket. Rack A: vent slots, LED dot rows, one band
ajar, lit CRT with two knobs on top. Rack B: dark panels, patch
bay with hanging cords, stacked dead receivers. Ed: red spiky
hair, goggles ON with pale green lenses and temple cable, white
tee, dark shorts, barefoot, hands on ankles. Shelving: angle-iron
uprights, dead amp with patch cable, three tape decks, coiled
cable pile. Peripherals box with two keyboards and hanging mouse.
Open pizza box, lid flat left, two slices. Power strip, four
plugs, lit switch. Handheld pile, screens dark. Cable spaghetti
everywhere around the bases.

Call image_gen once to GENERATE at 1536x1024. Copy the result
unmodified to r20-console/gen8a.png and print GENERATED=<path>.
