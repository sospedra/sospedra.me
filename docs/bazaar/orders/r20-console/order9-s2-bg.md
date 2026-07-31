# Codex order - r20.9-s2 background group, corrective

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the COMPOSITION PLAN (drawn diagram). Red frame, slab
  outlines, green checkpoint dots, amber rug, dashed boxes, text:
  ALL invisible constraints. Obey the layout, never draw any of it.
- Image 2 = the ANGLE VERDICT: the LEFT construction (50 degrees,
  68 inward per 81 down) is the ONLY legal slab shape; the RIGHT
  construction (62 degrees, crossed out red) is a REJECTION. Its
  green and magenta are LABELS, never art colors: the slab is WOOD.
- Image 3 = an APPROVED PREVIOUS RENDER: its materials, character,
  inventory and its floor angle direction are the target look. Its
  remaining faults are listed in the rules: crooked tilted racks
  (must be dead vertical), sign too low (must float high on a long
  pole), too much texture (must be flatter), and the slab still 5
  degrees too steep (must be exactly 50). Keep its wins, fix these.

GENERATE ONLY THE BACKGROUND GROUP of the console stall: two
server racks, the open shelving, the hanging sign and its pole.
NO slab, NO rug, NO Ed, NO floor clutter: those are a separate
front layer that will overlap this one. Canvas 1536x1024, flat
chroma green #00ff00 everywhere else.

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

## COMPOSITION - the background group only

- LEFT, SERVER RACK A x=508..670, y=412..812, base y=812, DEAD
  VERTICAL: three closed bands with vent slots, LED dot rows, one
  band ajar. ON ITS TOP, centered: the ONLY LIT SCREEN, a CRT
  x=524..664, y=324..412, WHITE-GREY static as flat two-tone
  horizontal bands, never noise. Two knobs.
- CENTER-BACK, SERVER RACK B x=690..866, y=456..816, base y=816,
  DEAD VERTICAL, directly behind Ed: a wider double-bay junk rack
  of DEAD equipment: dark panels, a patch bay with hanging cords, a
  shelf of stacked receivers, all screens dark. NO televisions.
- RIGHT, OPEN SHELVING x=870..1030, y=480..816, base y=816, DEAD
  VERTICAL: angle-iron uprights with bolt dots, top shelf a dead
  amp with a hanging patch cable, middle shelf three stacked tape
  decks, bottom shelf a coiled cable pile.
- SIGN "console" x=800..1064, y=133..230: a TALL riveted steel
  plate, rusted, gold lowercase glyphs, the ONLY readable word. It
  FLOATS HIGH: its bottom edge sits 250 px above the shelving top.
  Between sign and racks: clear chroma crossed ONLY by the pole.
  The pole x=960..1050, y=230..480: ONE continuous vertical steel
  pipe with two hard elbows, rusted but unbroken, ending bolted
  INTO the shelving's top rail with a visible bracket. Dead
  vertical segments, never diagonal, never severed. NO other pipes.

- BASES: all three units end as raw straight bottoms at y=830; the
  platform layer will overlap and hide the cut. Draw no feet, no
  ground, no floor of any kind.

WIDTH LAW: art EXACTLY 608 px wide (x=464..1072). COVERAGE GUARD:
each side keeps a chroma margin about 464 px, about 3/4 as wide as
the stall. Thinner margins = art too wide = REJECTION.

## LIGHT LAW

The ONE lit CRT throws one flat pale white-grey receiver band and
one small pool. Nothing else emits. Never cyan, never blue.

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
unmodified to /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r20-console/gen9-s2-bg.png and print GENERATED=<path>.
