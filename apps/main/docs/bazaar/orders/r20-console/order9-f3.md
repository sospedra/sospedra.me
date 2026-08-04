# Codex order - r20.9-f3 one-shot, short corrective

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the ANGLE VERDICT: the LEFT construction (50 degrees,
  68 inward per 81 down) is the ONLY legal slab shape; the RIGHT
  construction (62 degrees, crossed out red) is a REJECTION. Its
  green and magenta are LABELS, never art colors: the slab is WOOD.
- Image 2 = an APPROVED PREVIOUS RENDER: its materials, character,
  inventory and its floor angle direction are the target look. Its
  remaining faults are listed in the rules: crooked tilted racks
  (must be dead vertical), sign too low (must float high on a long
  pole), too much texture (must be flatter), and the slab still 5
  degrees too steep (must be exactly 50). Keep its wins, fix these.
- Image 3 = ED, the character gospel (a film still). Copy the KID:
  skinny, tan skin, spiky red hair, round goggles with pale green
  lenses, loose white tee, dark bike shorts, barefoot. Copy ZERO
  camera (it looks down from above; this order is a flat storefront
  elevation), zero layout, zero specific objects.

GENERATE the CONSOLE stall on canvas 1536x1024, chroma green
#00ff00 outside the art. The approved render (attached) is the
look; apply these corrections and laws:

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

## CORRECTIONS

1. RACKS DEAD VERTICAL: nothing tilts, nothing leans, nothing
   crooked. The clutter surrounds Ed by placement and overlap.
2. SIGN HIGH: the "console" plate (x=800..1064, y=133..230) floats
   250 px above the shelving top; only its continuous bolted pole
   (x=960..1050, y=230..480) crosses the gap. Never broken.
3. FLATTER: zero stipple, mottle, weave, gradients. Blocks >= 4x4
   px, 2-3 flat tones per surface, chunky rectangles for the rug.
4. Slab exactly 50 degrees per the vertices above.
5. Ed keeps goggles ON with the temple cable, no controller, hands
   on ankles. One lit white-grey CRT on the left rack, all else
   dark.

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
unmodified to /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r20-console/gen9-f3.png and print GENERATED=<path>.
