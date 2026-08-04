# Codex order — r15 — Vertical H-beam module (rich pass)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = a beam-pair crop from the approved Floor 1 master: the
  authority for every color and the beam's construction. It shows TWO
  beams — you draw exactly ONE.
- Image 2 = the PROPORTION GUIDE: the beam box and the ground line.
  INVISIBLE CONSTRAINTS — obey them, never draw them. NONE of Image
  2's graphics may appear in the output.
- Image 3 = the angle law diagram: GREEN construction only; RED
  isometric forbidden.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024.
Verify size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r15/gen-beam-v.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## THE BOX CONTRACT — absolute

Canvas 1536×1024, background flat chroma green #00ff00. ONE vertical
beam fills the box x=704..832, y=35..990: the SHAFT is exactly 96 wide
(x=720..816) and the beam now has ENDS by ruling — a TOP CAP and a
FOOT PLATE, each 128 wide (x=704..832), so the column reads complete
instead of cropped. WIDTH IS A KILL RULE: two renders drew about
twice too wide and were rejected. THE ARITHMETIC IS THE BEAM: left
flange 16 + web 64 + right flange 16 = EXACTLY 96 px. COVERAGE: the
beam is a thin sliver on the canvas — over 93% of the canvas width
stays pure chroma, about 720 px of margin on each side. Count the
beam's width before returning; 97 px is wrong.

## THE SCALE CONTRACT

A standing adult reference is 328 pixels. The beam is 955 tall = 2.9
adults and exactly 96 wide = 0.29 adult — a slender full-height
column, not a wall. It is used in PAIRS; perfect left-right symmetry
except the wear marks.

## CONSTRUCTION — Image 1's beam, richer by ruling

0. TOP CAP, x=704..832, y=35..95: a flanged steel cap plate #31393d
   with a #545a5d top light row, #0e151a shadow row beneath, four
   bolts (construction below) across its face, and a 1px #030405
   outline. The shaft meets it centered.
0b. FOOT PLATE, x=704..832, y=930..990: the same construction
   mirrored — #31393d plate, #545a5d top light row, #0e151a shadow,
   four bolts, standing ON y=990.
1. THE WEB (front face), x=736..800, y=95..930: steel #2c363b body; a
   1px center seam line #252d32 down the middle; near-black outline
   #030405.
2. TWO FLANGE EDGES, x=720..736 and x=800..816, y=95..930: recessed strips
   #0e151a with a 1-2px light edge line #545a5d on the outer rims and
   a #4c5254 inner rim step where they meet the web.
3. BOLT ROWS: two vertical columns of square bolt heads at x≈748 and
   x≈788, one bolt every 88 px starting at y=79 (11 per column). Each
   bolt: 8×8 px, #382514 head, #29231d rim, #54493c top glint pixel,
   #030405 outline. All identical, perfectly aligned.
4. SPLICE PLATES at y=352..384 and y=672..704: full-width plate bands
   #31393d with #0e151a shadow rows above and below, four bolts each
   (same construction), and a 1px #545a5d top light row.
5. WEAR, the rich pass: one rust streak #382c22 (4 px wide, 60 px
   tall) bleeding down from one bolt of each splice plate; one oil
   stain #171919 (14×8 px) low on the web at y≈820; four scuff marks
   #1c252a and two #37322b, none larger than 10×6 px; a #29231d rust
   edge, 1px, along 80 px of one flange rim. Nothing else — no
   scratch noise, no speckle.

## LIGHT

Flat ambient only: outer flange lights #545a5d, inner steps #4c5254,
bolt glints #54493c. No receiver pools, no gradients — the beam
receives stall light only in composition.

## ANGLE LAW

Per Image 3's GREEN construction: pure front face with two recessed
flange strips. Perfectly vertical edges, zero side faces, zero
receding lines.

## COLOR LAW

PALETTE CLAMP: #2c363b #31393d #252d32 #0e151a #545a5d #4c5254
#54493c #1c252a #37322b #382514 #29231d #382c22 #171919 #030405 —
14 values, the complete palette (doubled from the rejected 7 by
ruling). Sample against Image 1's beams; keep their darkness.

## TEXT

None. Nothing readable anywhere.

## EXCLUDE

No second beam, no wall, no ceiling, no floor, no utility boxes, no
pipes, no cables. One beam alone on chroma.

## SELF-CHECK before returning

1) Box: art exactly x 704..832 / y 35..990 — shaft 96 wide, caps 128
   wide; MEASURE the shaft: 96 px, not one more.
1b) Both ENDS present: top cap and foot plate, 128 wide, four bolts
   each.
2) Bolts: two columns × 11 + four per splice plate, identical,
   aligned, each with its glint pixel.
3) Two splice plates with light rows; rust streaks under one bolt of
   each.
4) Fourteen palette values only; perfect verticals.
5) Flat #00ff00 everywhere outside the box.
6) 1536×1024.
