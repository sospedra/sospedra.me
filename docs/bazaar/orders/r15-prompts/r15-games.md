# Codex order — r15k — Games (accepted content, width-locked)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = r10/crop-games.png — the Games bay from the approved Floor
  3 master: the authority for darkness, chunk, style and inventory.
  Match its DARKNESS and CHUNK exactly; cleaner, rounder or brighter =
  wrong. Copy nothing geometric from it.
- Image 2 = the PROPORTION GUIDE (r15/guide-games.png): the stall box,
  both kid boxes, the keylines and the ground line. INVISIBLE
  CONSTRAINTS — obey them, never draw them. NONE of Image 2's graphics
  may appear in the output.
- Image 3 = the ANGLE LAW diagram (r12/angle-law.png): the GREEN
  construction is the ONLY legal way to draw ANY box, crate, bin,
  cabinet, shelf or floor — front rectangle, vertical sides, ONE thin
  horizontal top band. The RED isometric is FORBIDDEN.
- Image 4 = r15/gen-games-r15j.png — the ACCEPTED previous render.
  The user accepted EVERYTHING about it except its WIDTH. Reproduce
  its content: the same kids, sign, drips, arcade, shelves, crates,
  bins, casts, glow, floor. Its ONE error: it drew the stall too wide.
  Same stall, NARROWER — the width rules below beat Image 4's width.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024.
Verify size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r15/gen-games.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## THE SCALE KILL — read first

The previous render drew the kids at 2.2× their boxes and was
REJECTED. Figure boxes are LAW, not suggestions:

- SISTER: exactly 216 tall — head top y=680, feet ON y=896,
  x=700..782. She is 1.15 m, a small kid.
- BROTHER: exactly 194 tall — head top y=702, feet ON y=896,
  x=792..864. He is 1.04 m, smaller.
- THE ARCADE IS THE RULER: a real arcade cabinet is 70 inches =
  1.78 m. At this canvas scale (adult 328 px = 1.75 m → 187 px/m)
  that is 334 pixels. The cabinet below is EXACTLY 334 tall. Both
  kid heads sit LOWER than the cabinet's top. The stall is 3.5
  sister-heights tall. COUNT heads before returning.

## THE WIDTH KILL — the one error left

The previous render was accepted EXCEPT its width (+49%, rejected).
Canvas 1536×1024, chroma magenta #ff00ff outside. Box x=508..1028,
y=152..920: 520 wide, 768 tall. The wall top sits ON y=152. Three
MEASURABLE rules, check all three:

1. THE ASPECT: the art is TALLER than it is wide — art height ÷ art
   width ≥ 1.45. The art is 768 tall, so the art is AT MOST 530 wide.
   MEASURE BOTH before returning.
2. THE BODY RULE: the whole stall is 1.6 lying adults wide (adult =
   328 px). An adult lying along the floor spans most of the stall; a
   stall wider than one and a half of him is wrong.
3. THE MARGIN RULE: each magenta margin beside the stall is 508 px —
   roughly AS WIDE AS THE STALL ITSELF. If either margin looks
   narrower than the stall, the render is wrong.

Squeeze the content, never spread it: crates hug the arcade, bins hug
post R, the kids stand shoulder to shoulder. Dead sideways space is
the enemy.

## CONSTRUCTION — numbered, exhaustive; nothing else appears

1. POST LEFT, x=508..556, y=152..920: full-height weathered wood.
2. POST RIGHT, x=980..1028, y=536..920: HALF height by ruling —
   floor-anchored, its top at y=536. The wall continues above it.
3. WALL, x=508..1028, y=152..852: Image 1's dark vertical planks.
4. SIGN, x=560..880, y=160..272: KID-PAINTED wooden board — wobbly
   baseline, two paint drips, one blotch, tilted letters, mixed
   letter colors reading "games" (Image 1's palette). Slight board
   tilt.
5. BULB STRING, x=556..980, y=200..300: two swags of colored bulbs
   (red, blue, amber, teal), cores crisp.
6. ARCADE CABINET, x=566..716, top y=522, base y=856: EXACTLY 334
   tall = 70 inches. Its base sits at y=856 — 40 px ABOVE the kids'
   stand line, because it stands 1 m deeper into the stall. Depth is
   a higher base line, never a smaller size. Marquee band y=522..560
   (lightning motif), dark screen y=576..680 with two tiny fighter
   sprites, joystick + three buttons panel, dark blue body (Image
   1's arcade colors).
7. SHELVES, x=808..976, y=460..640: TWO wall boards — top board:
   grey console decks; bottom board: cartridge boxes row (amber/red
   spines). Wall-mounted, deeper than the kids.
8. SISTER, x=700..782, head y=680, feet ON y=896: Image 1's kid
   style — ponytail, hoodie, sneakers. She holds THE ONLY handheld
   with both hands at chest height, screen toward her.
9. BROTHER, x=792..864, head y=702, feet ON y=896: striped tee,
   shorts, sneakers, hands free, leaning slightly toward her screen,
   watching.
10. FLOOR PROPS, every one built as Image 3's green construction —
    front face + flat top band (top 1/5), bases on the floor's top
    surface:
    - red crate, x=560..648, y=690..790: cartridges poking from the
      top band.
    - blue crate, x=560..648, y=790..896, under the red one.
    - wooden chest, x=652..696, y=836..896.
    - bin A, x=812..888, y=764..896: black cable coils inside.
    - bin B, x=896..972, y=764..896: coils + one gamepad with a red
      joystick resting on its top band.
11. FLOOR, x=508..1028, y=852..920: TWO SURFACES — walked plank top
    course y=852..900 (horizontal grain), darker front edge
    y=900..920. The bottom edge is a PERFECTLY STRAIGHT horizontal
    line at y=920. Vertical ends flush with the box. NO corner
    splay, NO apron, NO trapezoid.

## LIGHT — THE REFLECTION LAW (gradients, never stamps)

A reflection starts at the receiving surface's body value and ends at
that value pre-mixed 40-60% with the light color nearest the source,
in 3-6 monotonic steps, following the surface plane, stopping at its
silhouette. Source cores stay crisp; outlines and material shading
stay hard-stepped.

- R4 THE BULB CASTS: 12 gradient casts from the string bulbs washing
  DOWN the wall planks, each toward its pre-mixed end — reds toward
  #6e2a1a, blues toward #274a66, ambers toward #8a5a20, teals toward
  #2f6a72 — fading out by y=430.
- R5 KISSES: the bulb light also grazes (a) the arcade marquee's top
  band, (b) the top shelf's front edge, (c) the LEFT post's upper
  zone y=200..360. 2-3 steps each.
- R6 HANDHELD: the handheld screen throws a faint 2-step glow up
  onto sister's hands and chin. Tiny.
- THE FLOOR: ZERO reflections. The old under-arcade reflection
  stays dead. No pools anywhere.

## ANGLE LAW

Front faces only, horizontal + vertical edges, zero receding lines,
zero side faces. Every crate, bin, chest, cabinet, shelf and the
floor follow Image 3's green construction. Depth = higher base line
(the arcade demonstrates it), never a diagonal.

## COLOR LAW

Sample everything from Image 1 and keep its darkness and chunk.
TOTAL distinct fills ≤ 48. NO per-pixel noise: every fill is a flat
region or a 2-3 step ramp; the wall wash and casts are the R-zone
gradients above, nothing else gradients.

## TEXT

Only "games" on the kid-painted sign. Nothing else readable.

## EXCLUDE

No second handheld or console in hands. No cardboard standee. No
reflection under the arcade. No trapezoid floor or apron. No side
faces. No adults.

## SELF-CHECK before returning

1) MEASURE the kids: sister 216 (head 680, feet 896), brother 194
   (head 702). Both heads LOWER than the arcade top at y=522.
2) MEASURE the arcade: 334 tall, base y=856 (40 above the stand
   line), top y=522.
3) MEASURE the art: height 768, width ≤ 530, height ÷ width ≥ 1.45;
   each magenta margin roughly as wide as the stall; chroma pure
   outside.
4) Floor: two surfaces, bottom edge perfectly straight at y=920, no
   splay; post R half height (top y=536); post L full.
5) R4 twelve casts fading by y=430 + R5 three kisses + R6 handheld
   glow present, all gradient-built; floor reflection-free.
6) Kid-painted sign with drips + blotch + tilt; sister-only
   handheld; fills ≤ 48; flat #ff00ff outside; 1536×1024.
