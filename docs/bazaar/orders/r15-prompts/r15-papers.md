# Codex order — r15 — Papers, full kiosk restored, proportion-locked

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Papers bay crop from the approved Floor 1 master. It is
  the authority for the kiosk's structure, its interior, its darkness and
  its colors — Image 1's proportions are CORRECT. The previous attempt
  LOST the kiosk body and the interior glow — both come back exactly as
  Image 1 has them.
- Image 2 = the PROPORTION GUIDE: it maps Image 1's proportions onto the
  exact canvas box — stall box, archivist box, keylines, ground line.
  These boxes are INVISIBLE CONSTRAINTS — obey them, never draw them.
  NONE of Image 2's graphics — the colored boxes, the dashed lines,
  the cyan bar, the text labels — may appear in the output in any
  color, in any form.
  ALL canvas geometry comes from Image 2 and the numbers below.
- Image 3 = the APPROVED Manual stall asset: rendering flatness, outline
  weight and cleanliness standard.
- Image 4 = the angle law diagram: GREEN construction only (front
  rectangle + one thin top band, vertical sides); RED isometric forbidden.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024.
Verify size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r15/gen-papers.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## THE BOX CONTRACT — absolute

Canvas 1536×1024, background flat chroma magenta #ff00ff. The ENTIRE
kiosk, including both wheeled racks, fits inside the box x=384..1152,
y=216..920. Not one art pixel outside it. The awning's top edge touches
y≈216; wheels and base sit ON y=920.

## THE SCALE CONTRACT

- A standing adult reference is 328 pixels. The kiosk is 704 pixels tall
  = 2.15 adults. No figure in this image stands.
- The HOLOGRAM ARCHIVIST appears from the counter line UP and is exactly
  232 pixels from head top to the counter line: head top y≈440, counter
  line y≈672. If his head reaches the awning, he is too big and the
  image is wrong.
- Match Image 2's orange archivist box exactly.

## LAYOUT — the complete kiosk of Image 1

All positions in canvas pixels, ±12 px tolerance; box edges and the
archivist height have none.

1. Awning, x=384..1152, y=216..330: alternating vertical stripes of teal
   (#153a3c body, #0a2628 shadow, #1c4a4e light) and cream (#b88d5a
   body, #a98557 shadow, #c9995f light). Along its bottom edge a row of
   scalloped CREAM tabs (#a98557), each tab carrying one dark teal
   #153a3c lowercase letter spelling exactly  p a p e r s  — six tabs,
   six letters, one s — with a small #153a3c diamond mark on the tab at
   each end. The awning has one thin top band per the green construction.
2. Side posts, x=384..432 and x=1104..1152, y=330..872: PLAIN TEAL WOOD
   planks — zero rivets, zero steel: #153a3c body, #0a2628 shadow edge,
   #1c4a4e light edge, outline #020507. Each post carries three small
   pinned paper cards (#b88d5a with #a98557 shadow and 2-3 print dashes
   #564a37).
3. INTERIOR — one step darker than everything, exactly Image 1's
   darkness: back panel field #010b14 with panel joints #021926. Two
   shelf rows y=360..640 (frame #0a2628/#153a3c): tied cream paper
   bundles (#685945 body, #564a37 shadow, #7a6a50 light, string
   #4c4334) and book spines as flat blocks in #052a47, #042639, #073749,
   #571011, #443153. The interior reads recessed and cool.
4. THE HOLOGRAM ARCHIVIST, centered x≈768: translucent cyan figure built
   from hard horizontal scanline rows alternating #013968 and #024577,
   edge highlight rows #015588, 4-6 core pixels #03d8f6; round glasses
   rims #03e7f7; composed, smiling faintly, scholarly. He holds ONE
   physical open book: pages #423d17 with #171808 shadow (paper under cyan light reads olive-cream — keep Image 1's
   values, NOT bright cream), cover #33210f. He appears from the counter
   line UP: torso, arms, book, head. NO legs, NO lower body, NO
   projector pad. Two or three detached square hologram fragments
   #024577 float within 30 pixels of his shoulders.
5. INTERIOR GLOW — mandatory, this is the "internal glowing" that was
   lost: one flat #042639 wash step on the shelf faces and back panel
   directly behind him, a #135a52-toned band on the counter top in front
   of him, and a 2-pixel #073749 edge on both posts' inner faces. Hard
   flat steps, no blur, no radial gradient.
6. Counter, x=432..1104, y=672..856: top board y=672..712 in wood
   #6a583c with #564a37 shadow and #7a6a50 front lip; the glow band from
   item 5 lies on it in front of the archivist. Front panels y=712..856:
   #153a3c field with #0a2628 recessed rectangles and #1c4a4e top edge.
   On the counter: a blue pen cup #011c33 with pens #b83932, #df9e32,
   #48b8e4; a small brass bell #c77904 with #482905 base and one #fbe4a6
   glint; a flat closed ledger #564a37 with #443a2c spine.
7. A-frame rack, front-left, x=400..576, y=600..920, on small wheels:
   frame #292a28 with #4c4334 light edge; three rows of leaned cream
   sheets (#b88d5a, shadow #a98557, print dashes #564a37); wheels
   #171818 with #4c4334 rims; a 2px #020507 contact shadow row under
   each wheel at y≈916.
8. Wheeled tower rack, front-right, x=944..1140, y=536..920: pole with
   ball finial #4c4334/#63635b; four wire tiers, frame #2b373a with
   #4c4334 light; pockets filled with small cards in #b88d5a, #a98557,
   #571011, #052a47, #443153; caster wheels #171818, contact shadows at
   y≈916.
9. Warm shelf strip: one thin #c77904 strip under the awning's inner
   edge, y≈336..344, with a single #7a4a10 step below it.

## ANGLE LAW

Per Image 4's GREEN construction: awning, counter, shelves, racks and
every card stack show a front rectangle plus ONE thin top band, vertical
sides, zero side faces, zero receding diagonals.

## COLOR LAW

PALETTE CLAMP: the 41 hexes named in this order are the complete
meaningful palette of the asset. Every art pixel reads as one of
them; merge any stray shade into its nearest listed value. No new
hues, no intermediate blends.

Sample every color from Image 1 — the kiosk stays as DARK as Image 1;
the hexes above are anchors measured from it. Do not brighten the
interior, do not pastel the awning. Three tones per material. Continuous
near-black #020507 outlines. Flat and chunky exactly as Image 3. No
gradients, no blur, no antialiasing, no noise, no melted glyphs; the
glasses are two clean circles.

## TEXT

Only "papers", one letter per tab. Everything else is unreadable dashes.

## EXCLUDE

No H-beams (Image 1 shows one at its right edge — leave it out), no
background wall beyond the kiosk's own back panel, no concrete floor, no
neighbors. The asset floats on chroma.

## SELF-CHECK before returning

1) Box: zero art outside x 384..1152 / y 216..920; awning top at y≈216;
   wheels on y=920.
2) The kiosk BODY exists: awning + two teal wood posts + dark interior +
   counter — the archivist sits INSIDE a booth, not floating over racks.
3) Interior glow present: wash behind him, band on the counter, edges on
   the posts.
4) Archivist head top at y≈440 — measure it against Image 2's box —
   legless, scanlined, holding the olive-lit book.
5) Six cream tabs spell p-a-p-e-r-s in dark teal.
6) Posts are plain teal wood with pinned cards — zero rivets, zero steel.
7) Both racks complete with wheels and contact shadows, inside the box.
8) As dark as Image 1, as flat as Image 3, green construction everywhere.
9) Flat #ff00ff background, nothing touching the canvas border.
10) 1536×1024.
