# Codex order - r20.11 - portrait console, 20pct wider than videoclub

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = THE MASTER (gen10-p2): layout and paint are APPROVED and
  FROZEN, with ONE deliberate change ordered below (the sign system).
  Reproduce everything else exactly: same objects, same relative
  positions, same overlaps, same flat 15-color paint, same Ed.
- Image 2 = the PORTRAIT GUIDE: red frame, slab outlines, green
  checkpoint dots, dashed boxes. ALL invisible constraints: obey the
  layout, never draw any of it.
- Image 3 = the ANGLE VERDICT: the LEFT slab construction (50
  degrees, 68 inward per 81 down) is the law; the crossed-out RIGHT
  one is a rejection.

GENERATE at 1024x1536 PORTRAIT. This canvas is TALL: the stall is a
TALL NARROW den and the canvas finally matches it. If the tool
cannot produce 1024x1536, STOP and print SIZE-REJECTED: never fall
back to landscape.

Flat chroma green #00ff00 outside the art. Art EXACTLY 664 px
wide (x=180..844), 800 tall (y=568..1368). Each side keeps a
chroma margin of about 180 px. Ground line y=1368.

## THE ANGLE - unchanged law

- Slab top face: back edge x=248..776 at y=1223, front edge
  x=180..844 at y=1304. Sides EXACTLY 68 px inward per 81 down.
- Checkpoints the edges pass through:
  left: (248,1223) (231,1243) (214,1263) (197,1283) (180,1304)
  right: (776,1223) (793,1243) (810,1263) (827,1283) (844,1304)
- Front face: x=180..844, y=1304..1368, corners 90 degrees.
- Steeper or flatter = REJECTION.

## THE ONE CHANGE - the sign system

The master's hanging sign and bent pole are RETIRED. New system:
- A scavenged street LAMP POST, x=814..834, y=600..930: ONE straight
  DEAD-VERTICAL dark steel post, base disappearing behind the
  shelving; a small DEAD square lamp head on top, x=800..840, y=568..600,
  unlit glass.
- THE SIGN PLATE x=564..828, y=590..687: the same rusted riveted plate
  reading "console" in gold lowercase glyphs, the ONLY readable
  word. It is MOUNTED ONTO the post's left side in a visibly HACKY
  way: two fat solder blobs, one bent mismatched bolt, a short wire
  lash wrapped around the post. The plate itself hangs level; the
  attachment reads improvised. NO hanging arm, NO bent pipe, NO
  chain.

## THE LAYOUT - frozen, remapped to portrait

Same objects as the master, at these boxes (tolerance +/-10 px
INWARD only):
- SERVER RACK A x=224..386, y=860..1260, dead vertical, LED dot rows,
  one band ajar. ON TOP the ONLY LIT SCREEN: CRT x=240..380, y=772..860,
  white-grey static as flat two-tone bands.
- SERVER RACK B x=434..610, y=904..1264, dead vertical, directly behind
  Ed: dark panels, patch bay, stacked dead receivers. No TVs.
- ED x=444..656, y=1025..1300: cross-legged on the rug, goggles ON his eyes
  with pale green lenses, ONE cable from the left temple into the
  cable pool, no controller, hands on ankles, red spiky hair, white
  tee, dark shorts, barefoot.
- OPEN SHELVING x=642..802, y=928..1264, dead vertical: dead amp, three
  tape decks, coiled cables.
- PERIPHERALS BOX x=652..780, y=1196..1296: open cardboard, two beige
  keyboards leaning out, mouse hanging by its cable.
- PIZZA BOX x=264..360, y=1264..1300, lid flat left, two slices.
- POWER STRIP x=404..500, y=1280..1298: four plugs, one lit switch.
- HANDHELD PILE x=504..584, y=1268..1300: dead handhelds.
- RUG x=206..818, y=1252..1300: fills the slab face, concentric trapezoid,
  same 68:81 sides, 3 flat tones, plain rectangles, front fringe.
- Cables pool across the face around every base.

## THE PAINT - frozen

Same 15 colors as the master, nothing else (#00ff00 background
only): #020307 #111923 #2b3741 #5a5a58 #9b9a98 #f2f1ee #4c2815
#6e3d20 #8f5a2e #96795a #dc7707 #f5b749 #8f2f1f #8faf6f #2f7f78.
Scoped: #8f2f1f hair, #8faf6f goggle lenses, #2f7f78 LED dots.
FLATNESS ABSOLUTE: zero stipple, mottle, weave, noise, gradients;
blocks never under 4x4 px; 2-3 flat tones per surface; one flat
diagonal glare band per dead screen.

## AVOID

Landscape composition, art wider than 676 px, tilted or
leaning furniture, hanging sign arms, bent pipes, chains, broken
poles. Gradients, noise, persian detail, more than 15 colors, side
faces, second ground planes, floating bases, TVs behind Ed, game
controllers, goggles on the forehead, cyan or blue screens, extra
lit screens, extra text, watermarks, pixels below y=1368, chroma
inside the art, drawn guide graphics.

Call image_gen once to GENERATE at 1024x1536. Copy the result
unmodified to /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r20-console/gen11-b.png and print GENERATED=<path>.
