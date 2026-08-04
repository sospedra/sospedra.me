# Codex order — r15 — Talks / Video Club, bazaar2 identity + neon sign, proportion-locked

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the bazaar2 Video Club asset, USER-DESIGNATED REFERENCE
  ("the ref for videoclub but with neon sign"): the authority for every
  color, the inventory, the cart, the decals — and for NOTHING
  geometric. Image 1 is SHORTER AND WIDER than this order's kiosk:
  reproducing its proportions is the recorded failure — the previous
  render copied Image 1 almost verbatim and was rejected ("the same
  image"). This kiosk is DRAMATICALLY taller, with an upper zone that
  Image 1 does not have. Its painted sign is replaced by the neon
  sign; its counter perspective is superseded by the angle law.
- Image 2 = the PROPORTION GUIDE: the tall narrow stall box, the clerk
  box, the keylines and the ground line at exact canvas positions.
  These boxes are INVISIBLE CONSTRAINTS — obey them, never draw them.
  NONE of Image 2's graphics — the colored boxes, the dashed lines,
  the cyan bar, the text labels — may appear in the output in any
  color, in any form. ALL geometry comes from Image 2 and the numbers
  below.
- Image 3 = the angle law diagram: GREEN construction only (front
  rectangle + one thin top band, vertical sides); RED isometric
  forbidden.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024.
Verify size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r15/gen-talks.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## THE BOX CONTRACT — absolute

Canvas 1536×1024, background flat chroma green #00ff00. The ENTIRE
stall — kiosk, cart AND standee — fits inside the box x=528..1008,
y=120..920. Not one art pixel outside it. The neon sign's top edge
touches y≈120; wheel and base contact shadows sit ON y≈916..920.

## THE SCALE CONTRACT

- A standing adult reference is 328 pixels. The storefront is 800
  pixels tall = 2.44 adults.
- THE CLERK, leaning with her cheek on her right hand, is exactly 240
  pixels from head top to the counter line: head top y≈450, counter
  line y≈690. If her head reaches the posters (above y≈430), she is
  too big and the image is wrong.
- Match Image 2's orange clerk box exactly.
- THE STALL IS TALLER by ruling: the kiosk structure spans y=228..884
  — clearly, dramatically taller than wide. The clerk does not grow.

## LAYOUT — Image 1's inventory, tall-narrow, neon on top

Positions in canvas pixels, ±12 px tolerance; box edges and the clerk
height have none.

1. NEON SIGN on top, x=536..1000, y=120..228, complete: dark board
   #021c2b with hanger tabs #06496a; rounded-rect neon tube frame: 3px
   #0385b8 with a 1px #f3fdfe core; "VIDEO CLUB" tall capitals #dbf6fb
   with #47b8e4 edge. It casts one flat #06496a band, 4px, downward
   onto the cornice beneath it. (Neon values from the approved r13
   neon; everything else in this order from Image 1.)
2. KIOSK SHELL, x=568..928, y=228..884 — height/width ratio ≥ 1.8,
   measure it: navy-blue wood frame — posts
   and rails #1b2a34 body, #34454c light edge, #030506 outline; a
   cornice band y=228..258 with a cream trim lip #e6c38d. The interior
   is OPEN by ruling: no side wall panels — the shelves stand free
   against the DARK RECESSED BACK WALL #151719 (panels with #030506
   joints, one step darker than everything), which alone carries the
   depth. Nothing encloses the sides above the counter.
3. PENDANT LAMP, x=716..800, y=282..368: brass dome #683619 with
   #482614 shadow and a #e6b339 core; thin stem to the cornice; two
   flat warm steps below it on the shelf top: #955919 then #683619.
2b. UPPER ZONE, y=258..430 — the zone Image 1 lacks, the reason this
   kiosk is taller: on the recessed back wall, a high band holding
   THREE hanging film reel tins (#151719 tins, center dots #dda23c,
   #963a23, #33a2b5) on thin strings from the cornice, and one wide
   high chart (frame #482614, field #0c141a, tape-row dashes #e6b339
   and #e8d2b4). The tape towers pass through this zone on both
   sides, packed to their tops.
4. REAR WALL ROW, y=430..560, on the interior wall:
   - left poster x=584..676, y=436..556: frame #d39d56, field
     #1b2a34, ringed planet #6b4c2b with #d39d56 ring, star dots
     #e8d2b4;
   - center chart x=692..840: frame #482614, field #151719, three
     rows of small tape dashes in #e6b339, #e8d2b4, #b73522, #33a2b5;
   - right poster x=836..912: frame #d39d56, field #994727 with
     #351d12 shadow, dark figure silhouette #130c0a;
   - hanging ornaments right, x=872..928, y=282..420: a gold star
     #dda23c and below it a small rocket (body #d6a767, nose and fins
     #672914), each on a thin chain from the cornice.
5. TAPE SHELVES, warm wood frames #482614 with #26150c shadow:
   - left tower x=568..648, y=268..690, a free-standing open shelf
     column (no wall behind it but the recessed back wall): five rows
     packed with tape spines — flat blocks in #963a23, #1b2a34, #1b497d, #dda23c,
     #e8d2b4, #67231d with #030506 outlines, no lettering;
   - behind-clerk shelf x=664..912, y=430..560: top row of round film
     reel tins (#151719 tins with center dots #dda23c, #963a23,
     #33a2b5), bottom row of spines;
   - right column x=848..928, y=268..690, free-standing and open:
     spines, and at y=560..660 a leaning tape display box (#885323 box, tapes #1b2a34 and #963a23
     with cream labels).
6. BOOMBOX, x=820..912, y=368..470, on the right shelf: body #977856
   with #86694a shadow, two dark speaker circles #151719, small dial
   dots, a top handle.
7. THE CLERK, x=664..840, head top y≈450: Congolese woman, skin
   #94522a body, #683619 shadow, #885323 mid; braided hair #130c0a
   with #482614 braid lines; one gold hoop earring #d59734; navy tee
   #1b2a34 with #151719 shadow; yellow vest #d59734 with #955919
   shadow and a small badge (#b73522 with #e8d2b4 stripe). Cheek
   resting on her right hand, elbow on the counter, deadpan: two
   simple eye groups, one flat mouth line.
8. COUNTER, x=568..928, GREEN construction: top band y=690..730,
   #482614 with #79462b light lip and #26150c shadow edge — a plain
   horizontal strip, no receding top. Front y=730..870: vertical
   planks #482614 with #351d12 gaps and #26150c shadow. On the front,
   two worn DECALS: a cream tape-X patch x=664..760, y=740..830
   (#d39d56 body, #885323 shadow, #e8d2b4 tape strips) and a blue
   rewind icon x=792..872, y=740..812 (#1b2a34 rounded square, #151719
   shadow, two cream triangles #d6a767 pointing left, worn edges).
9. COUNTER ITEMS:
   - SMPTE TV, left end x=536..668, y=560..690, slightly toward
     center: casing #272626 with #151719 shadow; V antenna #1b2a34
     rods with ball tips rising to y≈470; screen showing SIX vertical
     bars, left to right exactly: #e8d2b4, #e6b339, #33a2b5, #a63983,
     #b73522, #1b497d, with one thin dark strip row #030506 below
     them; a 2px #33a2b5 edge on the counter in front of the screen;
   - card box x=760..856, y=620..690: tan box #885323 holding upright
     cream index cards #d39d56 with #d59a4b shadow, a small tape-cross
     mark on its front;
   - brass bell x=868..908, y=640..690: dome #c8852a, base #875519,
     shadow #482614, one light glint.
10. RED TAPE CART, front-left, x=528..688, y=700..916, GREEN
    construction: rusty red metal box #67231d body, #461a17 shadow,
    #8a2f25 worn light edges, rust patches #683619; a cream label
    patch #d39d56 with tape corners on its front; FULL of tapes
    leaning every way — flat blocks #151719, #482614, #482558,
    #963a23 with cream label dashes; caster wheels #151719 with
    #030506 tires; 2px contact shadow rows at y≈916.
11. Every object: front face + thin top band + vertical sides, ZERO
    side faces, exactly the green construction of Image 3.

## COLOR LAW

PALETTE CLAMP: the 48 hexes named in this order are the complete
meaningful palette of the asset. Every art pixel reads as one of them;
merge any stray shade into its nearest listed value. No new hues, no
intermediate blends.

Sample every color from Image 1 (except the neon values, from the
approved r13 neon); the hexes above are anchors measured from Image 1.
Keep its warm darkness. Three tones per material, large flat fields,
continuous near-black outlines, no gradients, no glow hazes, no
antialiasing, no noise, clean simple faces and glyphs.

## TEXT

Only "VIDEO CLUB". Tape spines, labels, chart, badge and decals are
unreadable dashes.

## EXCLUDE

No H-beams, no wall beyond the kiosk, no concrete floor, no neighbors.
The asset floats on chroma.

## SELF-CHECK before returning

1) Box: zero art outside x 528..1008 / y 120..920; neon top y≈120;
   kiosk spans y 228..884 with height/width ≥ 1.8 — MEASURE IT; a
   render with Image 1's squat proportions = redo;
1b) The UPPER ZONE exists: reels + high chart between the tower tops;
   contact shadows on y≈916..920.
2) Clerk head top y≈450, lean height 240 px — measure against Image
   2's clerk box; cheek on right hand, deadpan.
3) NO standee — it was removed by ruling; nothing stands right of the
   counter.
4) The CART exists: red, rusty, full of tapes, wheels, front-left.
5) Counter decals: cream tape-X patch + blue rewind icon.
6) SMPTE TV with antenna and exactly six bars + dark strip; cyan edge
   on the counter.
7) Reel tins row, boombox, star + rocket ornaments, card box, bell,
   pendant with two warm steps.
8) Complete neon with the downward band.
9) Green construction everywhere, zero side faces; colors match
   Image 1's warm darkness; flat #00ff00 background; nothing at the
   canvas border.
10) 1536×1024.
