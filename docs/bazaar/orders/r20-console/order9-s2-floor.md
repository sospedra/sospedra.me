# Codex order - r20.9-s2 floor group, corrective

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the COMPOSITION PLAN (drawn diagram). Red frame, slab
  outlines, green checkpoint dots, amber rug, dashed boxes, text:
  ALL invisible constraints. Obey the layout, never draw any of it.
- Image 2 = the ANGLE VERDICT: the LEFT construction (50 degrees,
  68 inward per 81 down) is the ONLY legal slab shape; the RIGHT
  construction (62 degrees, crossed out red) is a REJECTION. Its
  green and magenta are LABELS, never art colors: the slab is WOOD.
- Image 3 = ED, the character gospel (a film still). Copy the KID:
  skinny, tan skin, spiky red hair, round goggles with pale green
  lenses, loose white tee, dark bike shorts, barefoot. Copy ZERO
  camera (it looks down from above; this order is a flat storefront
  elevation), zero layout, zero specific objects.
- Image 4 = an APPROVED PREVIOUS RENDER: its materials, character,
  inventory and its floor angle direction are the target look. Its
  remaining faults are listed in the rules: crooked tilted racks
  (must be dead vertical), sign too low (must float high on a long
  pole), too much texture (must be flatter), and the slab still 5
  degrees too steep (must be exactly 50). Keep its wins, fix these.

GENERATE ONLY THE FLOOR GROUP of the console stall: the slab, the
rug, Ed and the floor clutter. NO racks, NO shelving, NO sign, NO
pole: those are a separate layer. Canvas 1536x1024, flat chroma
green #00ff00 everywhere except this floor group.

## THE ANGLE - maximum priority

- A previous render drew the slab sides at 62 degrees. REJECTED.
- THE LAW: every slab and prop trapezoid side edge slopes EXACTLY
  68 px inward per 81 px down. 50 degrees. Corners 130/50/50/130.
- SLAB VERTICES, absolute canvas pixels:
  top face: back-left (532,775), back-right (1004,775),
  front-right (1072,856), front-left (464,856).
  front face: (464,856) (1072,856) (1072,920) (464,920).
- CHECKPOINTS the edges pass through:
  left: (532,775) (515,795) (498,815) (481,835) (464,856).
  right: (1004,775) (1021,795) (1038,815) (1055,835) (1072,856).
- Steeper or flatter than 68:81 = REJECTION. Check before returning.

## CAMERA LAW

- FLAT STOREFRONT ELEVATION, dead-on, standing eye height. No
  vanishing points, no isometric rotation, no tilt.
- NOT a room, NOT an interior. No walls, no ceiling, no corners.
  Chroma directly behind everything.
- VERTICALITY ABSOLUTE: every rack, shelf, box, pole segment and
  furniture edge stands DEAD VERTICAL. Nothing tilts, nothing
  leans, nothing is crooked. The clutter surrounds Ed by PLACEMENT
  and OVERLAP only, never by tilting.
- Depth between objects is OVERLAP only; nearer sits lower.
- Tall furniture: front rectangle + ONE thin top band, a fifth of
  its width deep, NEVER a side face. Floor props: top face a 68:81
  trapezoid, front face 90 degrees.

## COMPOSITION - the floor group only

- THE SLAB first: worn dark wood, horizontal planks on the top
  face, vertical plank butts with sparse nail dots on the front
  face, three wood tones, near-black seams. NEVER green.
- THE RUG fills the face: concentric trapezoid, same 68:81 sides,
  front edge x=490..1046 at y=852, back edge x=530..1006 at y=804.
  Chunky flat rectangles in 3 tones, fringe dots on the front edge.
- ED x=700..912, y=577..852, base y=852 on the rug, cross-legged,
  facing the viewer, leaning slightly forward, hands on his
  ankles. GOGGLES ON HIS EYES: round pale-green lenses, VR goggles
  in eyeglass shape; ONE cable runs from the left temple down into
  the cable pool. NO game controller anywhere. Red spiky hair,
  loose white tee, dark bike shorts, barefoot. HEAD GUARD: head
  top above y=560 = REJECTION.
- PIZZA BOX x=548..644, y=816..852: open, lid flat LEFT, two
  slices.
- POWER STRIP x=660..756, y=832..850: four plugs, one lit switch.
  NOT a keyboard.
- HANDHELD PILE x=760..840, y=820..852: dead handhelds, screens
  dark.
- PERIPHERALS BOX x=880..1008, y=748..848, base y=848: open
  cardboard, flaps out, two beige keyboards leaning at half scale,
  one mouse hanging by its cable.
- CABLE SPAGHETTI x=520..1020, y=804..854, plus Ed's goggle cable.

Ed's goggle cable ends in the cable pool. Cables may run toward
the rug's back edge and stop: the rack layer lands behind later.

WIDTH LAW: art EXACTLY 608 px wide (x=464..1072). COVERAGE GUARD:
each side keeps a chroma margin about 464 px, about 3/4 as wide as
the stall. Thinner margins = art too wide = REJECTION.

## STYLE - flat chunks, 15 colors

Authored low-res 16-bit pixel art. FLATNESS ABSOLUTE: zero
stipple, zero mottle, zero weave, zero per-pixel noise, zero
gradients. Every surface is 2-3 flat tones in blocks no smaller
than 4x4 px. Rust = one or two flat darker patches with hard
edges, never speckle. The rug pattern = large flat rectangles in 3
tones. A dead screen = one dark tone + one flat diagonal glare
band. LOW DETAIL everywhere.

EXACTLY 15 COLORS for the art, nothing else (#00ff00 is the
background key, zero art pixels):
#020307 #111923 #2b3741 #5a5a58 #9b9a98 #f2f1ee
#4c2815 #6e3d20 #8f5a2e #96795a
#dc7707 #f5b749 #8f2f1f #8faf6f #2f7f78
Scoped: #8f2f1f only Ed's hair, #8faf6f only his goggle lenses,
#2f7f78 only LED dots. None of the three ever on a screen.

## AVOID - hard rejections

Gradients, noise, stipple, mottle, weave, antialiasing, blur,
glow, painterly shading, persian detail, more than 15 colors. Slab
sides at any slope but 68:81. Tilted or leaning furniture, crooked
racks. Perspective convergence, side faces, a second ground plane,
floating bases, interior walls. TV stacks behind Ed, game
controllers, goggles on the forehead, a broken or floating pole, a
sign hugging the racks. Cyan or blue screens, extra lit screens,
extra text, watermarks, art outside the frame, pixels below y=920,
chroma green inside art. Drawing plan graphics. Copying the film
still's camera or objects.

Call image_gen once to GENERATE at 1536x1024. Copy the result
unmodified to /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r20-console/gen9-s2-floor.png and print GENERATED=<path>.
