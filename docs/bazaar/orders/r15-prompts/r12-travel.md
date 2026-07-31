# Codex order — r12 — Travel stall, full regeneration, strict palette, full width

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Travel bay crop from the Floor 3 master. Source of truth for
  layout and content.
- Image 2 = the APPROVED Manual stall asset. Its rendering density, outline
  weight, flatness and color restraint are the exact standard. The previous
  Travel attempt violated the rendering rules — too much detail, too many
  colors. This one matches Image 2 or it is wrong.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-travel-r12.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Rebuild the Travel booth from Image 1 as one isolated sprite on flat chroma
magenta #ff00ff — WIDE: the booth spans nearly the full canvas, from about
x=60 to about x=1480, with only that small padding to the borders. Keep the
booth's proportions from Image 1 but stretched wider, counter running the
full width.

PALETTE LAW — this is the complete color list of the whole image. Every
pixel is one of these or #ff00ff background. Nothing else exists:
#020307 #111923 #1c2731 #2b3741 #414c55 #606970 #898e8d
#321a0f #4b2816 #6b391c #925022
#4b4236 #786852 #a38b69 #cfad7e #edd09c
#5c171c #882225 #b83932 #dd6048
#7b4514 #ad6a1e #df9e32 #ffd26b #ffe3a1
#071421 #0a2942 #126e9b
#1e2d14 #31461a #4b6220 #6b7e2d #95a247

Three tones per material, never more. Big flat fields. Quiet surfaces.

1. Tarp marquee across the full booth top: canvas #31461a body, #1e2d14
   shadow folds, #4b6220 light folds; strap tabs #4b2816 with grommet dots
   #ad6a1e; outline #020307.
2. Triangular sign centered on the tarp, COMPLETE with its apex: border
   band #edd09c with #cfad7e shadow edge; inner triangle field #071421 with
   five star dots #edd09c; a small rocket: body #dd6048, dome #df9e32,
   flame #ffd26b; lower band #edd09c carrying "Travel Ventures" in #111923
   block capitals-and-lowercase, clean simple glyphs; outline #020307.
3. Booth walls, full width: corrugated panels drawn as vertical stripes
   alternating #898e8d and #606970 with #414c55 shadow lines and sparse
   rust streaks #6b391c (at most one streak per panel); wood frame posts
   and rails #4b2816 body, #321a0f shadow, #6b391c light.
4. Interior rear wall, one step darker than everything: field #071421 with
   faint chart lines #0a2942 (2-3 lines only). On it: three route cards
   #a38b69 with #786852 shadow, planet dots #b83932, #df9e32, #606970; a
   brass helmet #ad6a1e with #7b4514 shadow and #df9e32 rim; the BANJO
   below it: body face #786852, rim #6b391c, neck #321a0f, four string
   lines #a38b69 — all sitting dark against the wall.
5. LAST SEATS board, left interior: #edd09c board, #cfad7e shadow edge,
   "LAST SEATS" in #111923 capitals, hung by one #4b4236 string.
6. The agent, centered behind the counter: skin #606970 body, #414c55
   shadow, #898e8d light; exactly FOUR eyes in two pairs, each #df9e32 with
   a #7b4514 rim and a #020307 pupil dot; long pointed side ears in the
   same three skin tones; a wide simple SMILE: one #111923 curved line with
   two corner pixels. Vest: #882225 body, #5c171c shadow, #b83932 light,
   zipper line #414c55, wing patch #edd09c with #a38b69 shadow, round badge
   #df9e32 with #7b4514 rim. Under-suit sleeves #786852 with #4b4236
   shadow. Gloves #321a0f with #4b2816 light edge. His right glove rests
   flat ON the counter top; his left hand raises a ticket #cfad7e with
   #a38b69 shadow and three #4b4236 stamp dashes.
7. CANDLES, three sets, all with the same construction — wax #edd09c with
   #cfad7e shadow, one wick pixel #111923, flame: core pixel #ffe3a1,
   flame body #ffd26b, and a two-step flat halo #df9e32 then #ad6a1e:
   a) a brass dish #ad6a1e with three candles on the counter's left end;
   b) a pair of candles on a small interior shelf INSIDE the booth at the
      rear wall's right side — these light the interior;
   c) a pair on the counter's right wing beside the radar.
8. CANDLE LIGHT — mandatory receivers, all flat hard bands: the interior
   pair casts #4b2816 warm patches on the rear wall around itself and a
   #925022 edge on the shelf board; the counter candles cast a #925022
   band along the counter top's near edge, a #b83932 warm edge up the
   agent's vest front and glove, and a #cfad7e brightening on the LAST
   SEATS board's near edge. Every candle set lights its neighborhood;
   nothing is unlit next to a flame.
9. The RADAR, seated DEAD SOLID on the counter's right wing: casing
   #4b2816 with #6b391c light and brass corners #ad6a1e; its BOTTOM EDGE
   is a straight horizontal line lying exactly ON the counter top band,
   with a 2-pixel #020307 contact shadow row along its full base — no gap,
   no float; round scope: bezel #ad6a1e, screen field #1e2d14, two ring
   lines #31461a, sweep wedge #6b7e2d, three blip dots #95a247; one small
   antenna #414c55. One flat #31461a glow band on the counter directly in
   front of the scope.
10. Counter, full width: top band #925022 with #6b391c shadow — a plain
    horizontal strip whose height is about one fifth of the counter's
    front height; front of corrugated panels (#898e8d/#606970/#414c55)
    framed by wood rails #4b2816/#6b391c; outline #020307.
11. Queue posts in front, spread across the full width: four brass posts
    #ad6a1e with #7b4514 shadow and #df9e32 caps, rope #882225 with
    #5c171c shadow sagging between them; 2-pixel #020307 contact shadows.
12. Luggage trunk, front left: #4b2816 body, #321a0f shadow, #6b391c
    light, brass corners and clasp #ad6a1e with #df9e32 glints, winged
    emblem #df9e32; contact shadow row #020307.

Rendering: strict 3×3 logical pixel grid; large flat single-color fields;
exactly the tones listed per material; continuous #020307 outlines; no
gradients, no blur, no soft glow, no antialiasing, no noise, no texture
speckle. Restraint like Image 2: quiet corrugated walls, sparse details,
clean simple face.

EXCLUDE: H-beams, anything beyond the booth, concrete floor. Background:
perfectly flat #ff00ff, nothing touching the canvas border.

Text: only "Travel Ventures" and "LAST SEATS". Ticket and route cards stay
unreadable dashes.

Self-check: 1) booth spans x≈60 to x≈1480; 2) every pixel from the palette
list; 3) radar bottom edge flat on the counter with full-length contact
shadow, zero float; 4) three candle sets, each with flame cores, halos AND
lit surfaces around them, interior pair lighting the rear wall; 5) agent
smiling, four paired #df9e32 eyes, #882225 vest; 6) complete triangle sign
reading Travel Ventures; 7) as flat and quiet as Image 2; 8) flat #ff00ff
background; 9) 1536×1024.
