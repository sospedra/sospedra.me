# Codex order — r15 — Games, proportion-locked, lights that actually cast

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the PREVIOUS APPROVED-STYLE render: its darkness, its
  chunk, its kids, its inventory ARE the style law. The latest render
  drifted bright and cartoonish and was rejected as a disaster — if
  your output looks cleaner, rounder or brighter than Image 1, it is
  wrong. Copy Image 1's style exactly; geometry still comes ONLY from
  Image 2 and the numbers below — this order makes the stall TALLER
  than Image 1 draws it.
- Image 2 = the PROPORTION GUIDE: the stall box, both kid boxes, the
  keylines (floor top, arcade screen top) and the ground line at exact
  canvas positions. These boxes are INVISIBLE CONSTRAINTS — obey them,
  never draw them.
  NONE of Image 2's graphics — the colored boxes, the dashed lines,
  the cyan bar, the text labels — may appear in the output in any
  color, in any form. ALL geometry comes from Image 2 and the numbers
  below.
- Image 3 = the angle law diagram. The GREEN construction is the ONLY
  legal way to draw ANY box, crate, bin, cabinet, shelf or floor: front
  rectangle with vertical sides plus ONE thin horizontal top band. The
  RED crossed-out isometric construction is FORBIDDEN. Any side face =
  the image is wrong.
- Image 4 = camera gospel (a countertop): the only allowed angle.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024.
Verify size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r15/gen-games-A.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## THE BOX CONTRACT — absolute

Canvas 1536×1024, background flat chroma magenta #ff00ff. The ENTIRE
stall fits inside the box x=508..1028, y=152..920 — 768 tall, the
box itself RAISED by ruling so the stall stands visibly taller than
its neighbors. Not one art pixel
outside it. COVERAGE: the stall covers the
CENTRAL THIRD of the canvas width; each chroma margin is about 508 px.
THE POSTS ARE THE BOX EDGES: zero art left of the left post or right
of the right post — the sign, the light string, the crates and the
bins all live between the posts. THE STALL FILLS ITS HEIGHT: the post
tops and the rear wall's top edge TOUCH y=152 — a squat render that
leaves air above the wall is wrong. ASPECT IS A KILL RULE, the third
rejection on this: the drawn structure is TALLER THAN IT IS WIDE —
art height 768, art width ≤ 520, height greater than width, measure
both before returning. The post tops and rear wall's
top edge touch y≈304; the floor's front edge board sits ON y=920.

## THE ANGLE — READ THIS FIRST, the last render died here

The stall is a FLAT STOREFRONT seen dead-on. It is NOT a room, NOT a
stage, NOT a diorama, NOT an interior with depth. There is no side
wall, no ceiling, no receding platform. The wooden floor is a THIN
HORIZONTAL STRIP, exactly 48 px of top band — if the floor reads as a
plane the kids stand INSIDE, the image is wrong and must be redone.
Every box: front rectangle + one thin top band, vertical sides,
nothing else. Compare against Image 3's GREEN construction and Image
4's countertop before returning.

## THE SCALE CONTRACT

- A standing adult reference is 328 pixels. The stall is 768 pixels
  tall — the tallest ruling yet; the wall and posts carry it. The children are CHILDREN:
- THE SISTER is exactly 216 pixels head-to-sole: head top y≈668, soles
  y≈884.
- THE BROTHER is exactly 194 pixels head-to-sole: head top y≈690,
  soles y≈884.
- The arcade cabinet (y≈420..852) is twice the sister's height. If
  either kid's head reaches above the arcade screen's top (y≈478),
  the kids are too big and the image is wrong.
- Match Image 2's orange kid boxes exactly. If your output's
  kids-to-structure ratio matches Image 1's, the image is wrong.

## LAYOUT — Image 1's inventory at the new proportions

Positions in canvas pixels, ±12 px tolerance; box edges and both kid
heights have none.

1. Structure: two wooden posts x=508..551 and x=985..1028, y=152..898
   (#6b3615 body, #a75824 light, #2c170b shadow); between them the
   stall's own rear wall of vertical planks #2c170b with #0d0804 joints,
   y=152..852 — flat and quiet.
2. SIGN attached to the LEFT POST, x=522..788, y=166..266: crooked
   plank #49260d with #2c170b edge shadow; its left
   end overlaps the post with two #0d0804 nail dots and a #2b3741
   bracket; a support wire runs from its right end up to the right
   post top. Letters lowercase "games", each with a #0d0804 outline:
   g #e58809, a #126e9b, m #ba2a1a, e #e58809, s #126e9b — PAINTED BY
   THE KIDS, badly: uneven letter heights and a wobbly baseline (each
   letter sits 2-6 px off its neighbor), strokes of uneven thickness,
   the "m" tilted a few degrees, two thin paint drips (#e58809 and
   #126e9b, 2 px wide, 8-14 px long) running down from letter bottoms,
   one #ba2a1a brush blotch beside the "s". NOT a clean font — a
   child's brushwork.
3. CHRISTMAS LIGHTS THAT ACTUALLY CAST. The string: wire #1d100a
   sagging from the sign across to the right post, y=178..300. TWELVE
   bulbs, cycling #b83932 red, #126e9b blue, #df9e32 amber, #4bd2e1
   cyan. EVERY SINGLE BULB gets all three of these, hard flat blocks,
   no exceptions:
   a) a #ffe3a1 core pixel pair inside the bulb;
   b) a glow ring of the bulb's own color, 4-6 px thick, concentric
      flat blocks around the bulb;
   c) a LIT PATCH of the bulb's own color, 8-14 px wide, painted on
      the nearest surface below or behind it — on the sign board, the
      posts, the wall planks, the arcade top. Twelve bulbs = TWELVE
      crisp patches; the sign board shows overlapping colored patches
      across its face. The patches are opaque flat bands, not hazes.
4. ARCADE CABINET, left, x=520..682, y=420..852, green construction:
   front #02315c with #021d36 shadow; ONE thin
   top band; marquee #02315c with zigzag #d7831d; screen field
   #022244 with two low-poly fighters — one #db6603, one #caab86,
   both outlined #0d0804 — a ground line and three title dashes
   #05f5fc; joystick ball #ba2a1a on a dark stick, buttons #ba2a1a
   and #964902; base #02182d.
   THE SCREEN CASTS a #06d8eb rim, 2 px, along the sister's entire
   left silhouette edge (arm, hoodie side, leg) — and NOTHING on the
   floor: no band, no pool, no reflection under the cabinet. A floor
   reflection = the image is wrong.
5. THE CHILDREN, center x=700..872, sharing ONE handheld:
   - Sister (216 px): brown ponytail #49260d with #542b11 light row
     and #2c170b shadow, blue hair tie; cobalt hoodie #024384 body,
     #022244 shadow, #023c78 light, front pocket; dark shorts
     #22272c with #12181c shadow; blue sneakers #02315c with #d9b68a
     trim and dark soles; skin #d48d52 body, shadow one step
     darker sampled from Image 1. She ALONE holds the handheld
     in both hands at chest height.
   - Brother (194 px): black hair #12181c with #12181c shadow;
     striped tee in alternating #872512 and #caab86 rows; blue
     shorts #023c78 with #02315c shadow; red sneakers #872512 with
     #d9b68a trim; same skin family; flat serious mouth, suspicious
     eyes toward the screen; his hands are EMPTY — only the sister
     holds the handheld.
   - The handheld: body #12181c, screen #06e5f7 with one #fbfefd
     core pixel; it casts a 2px #06d8eb edge on both chins and both
     chest fronts. Clean simple faces: eye dots, one mouth line each.
6. SHELF UNIT, right, x=856..1016, y=400..744, green construction:
   wood frame #49260d with #0d0804 shadow; three rows: top a grey
   console #4f453e with a dark unit #12181c;
   middle a tan console #9d7244 with #3a2918 shadow;
   bottom a row of cartridge boxes as flat blocks #bb5a01, #c66302,
   #66140d, #bb5a01 with dark slot lines.
7. FLOOR BOXES, front, all green construction with thin top bands:
   left x=512..672, y=716..912: a red crate #66140d with #8a1912
   light and #390a04 shadow holding cartridges (#02182d, #66140d,
   #c66302 blocks), stacked on a blue crate #02315c with #02315c mid
   and #021d36 shadow; a tan box #8c5e32 body / #55391c shadow beside
   them. Right x=852..1024, y=728..912: one blue bin #02315c body /
   #021d36 shadow with cable coils #12181c with #22272c
   highlights, and a second blue bin with a grey controller #4f453e
   and a joystick (ball #a62213, dark stick).
8. FLOOR, exactly two surfaces: a horizontal plank top band
   y=852..900, EXACTLY 48 px tall (planks #6b3615 with #2c170b gaps)
   and below it a front edge board #2c170b, y=900..920, with a #0d0804
   shadow row. The floor's left and right ends are vertical cuts. No
   trapezoid, no receding plane, no stage.
9. Contact shadows: a 2px #0d0804 row under every crate and bin, both
   children's shoes, and the shelf legs.

## ANGLE RULES, absolute

- The viewer stands exactly in front, at the children's eye height.
- Every vertical edge perfectly vertical; every horizontal edge
  perfectly horizontal; NO diagonal receding lines anywhere.
- Every box shows exactly TWO surfaces: front rectangle + one thin
  top band (a fifth of its width). Never a third surface.

## COLOR LAW

PALETTE CLAMP: the 45 hexes named in this order are the complete
meaningful palette of the asset. Every art pixel reads as one of
them; merge any stray shade into its nearest listed value. No new
hues, no intermediate blends.

Sample every color from Image 1; the hexes above are anchors measured
from Image 1. STYLE IS A KILL RULE, twice-rejected: match Image 1's
DARKNESS and CHUNK exactly — deep navy #02315c family on the arcade,
dark wall planks, heavy near-black outlines, hard 3×3+ pixel clusters,
muted skin, zero pastel. Brighter, softer or rounder than Image 1 =
wrong, immediately. Three tones per material, large flat
fields, continuous #0d0804 outlines, no gradients, no soft glow, no
antialiasing, no noise, clean faces.

## TEXT

Only "games". All else unreadable dashes.

## EXCLUDE

No H-beams, nothing beyond the stall's own plank wall, no concrete
lobby floor, no neighbors. The asset floats on chroma.

## SELF-CHECK before returning

1) Box: zero art outside x 508..1028 / y 152..920; wall top ON y≈152;
   floor edge on y=920.
1b) Measure the floor band: 48 px of plank top band, not one pixel of
   receding plane — a stage or room = redo.
2) Sister exactly 216 px, brother exactly 194 px, soles on y≈884 —
   measure both against Image 2's kid boxes; heads below the arcade
   screen top.
3b) The sign reads kid-painted: wobbly baseline, uneven strokes,
   tilted m, two drips, one blotch.
3) Count the lit patches: twelve bulbs, twelve crisp colored patches
   on surfaces, opaque flat blocks.
4) The sister's left silhouette carries the #06d8eb arcade rim; the
   floor carries ZERO cast — no reflection under the cabinet.
5) Scan every box: front + thin top band only, vertical sides — any
   side face = redo.
6) Floor is a flat band with vertical ends.
7) Kids share one handheld with chin/chest edges; clean faces.
8) Colors match Image 1's darkness; flat #ff00ff background, nothing
   at the canvas border.
9) 1536×1024.
