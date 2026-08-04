# Codex order — r15 — Wall + floor tile module (tileable, rich pass)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the floor strip crop from the approved Floor 1 master:
  color authority for the concrete floor, its seams and the front lip.
- Image 2 = the ceiling band crop from the same master: color
  authority for the wall panels.
- Image 3 = the PROPORTION GUIDE: the band box, the wall/floor
  keyline and the periodic joint grid. INVISIBLE CONSTRAINTS — obey
  them, never draw them. NONE of Image 3's graphics may appear in the
  output.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024.
Verify size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r15/gen-wf.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## THE BOX CONTRACT — absolute

Canvas 1536×1024, background flat chroma green #00ff00. The band fills
the box x=48..1488, y=35..990 exactly: 1440 wide, 955 tall. Art is
flush against ALL FOUR box edges by design; only the canvas margins
outside the box stay chroma — exactly 48 px of chroma left and right,
35 top, 34 bottom. MEASURE: art exactly 1440 wide, no wider.

This is the empty scene backdrop: the full-height back wall and the
lobby floor strip. Stalls, stairs and beams paint OVER it. This rich
pass doubles the detail of the rejected flat pass — more material
story, still quiet planes, still strictly periodic.

## THE PERIODICITY CONTRACT — the reason this asset exists

The band is STRICTLY PERIODIC every 480 px — the tile now has THE
SAME DIMENSIONS AS THE STAIRS MODULE (480 × 955) by ruling. Vertical
joints at x = 48, 528, 1008, 1488: exactly THREE identical modules.
Every 480-wide module is IDENTICAL to the others — panels, bolts,
seams, patches, streaks, stains all repeat at the same relative
positions. A single 480px module will be cut and tiled; any deviation
between modules breaks the tile and the image is wrong.

## THE SCALE CONTRACT

A standing adult reference is 328 pixels. The band is 955 tall = 2.9
adults: wall 859, floor strip 96 (the stall-line raise).

## CONSTRUCTION — top to bottom, per 192 module

1. WALL, y=35..894: dark navy panels — each 480 module holds FOUR
   vertical panels of 120, alternating #0d1319 / #10161b / #0d1319 /
   #10161b; #010204 joint lines at every panel edge, with the module
   joints (x=48, 528, 1008, 1488) drawn one pixel heavier; a single
   #1c252a panel light edge, 1px, on the left side of each module
   joint.
   Inside each module, at identical relative positions: two bolt-head
   pairs #221e1a with #010204 outlines at the tops of panels 1 and 3
   (y≈60); one rust drip #382c22, 4 px wide, 40 px tall, falling from
   the left bolt pair; one horizontal hairline seam #010204 at y=422
   with a 1px #1c252a light row beneath it, running the full module;
   one concrete repair patch #1c252a (28×16 px) centered on panel 2,
   y=560..576, outlined #010204; two faint damp streaks #070d12
   (6 px wide, 90 px tall) from y=700 on panels 1 and 4; one small
   scuff pair #171919 near y=860 on panel 3.
2. WALL-FLOOR CONTACT, y=894..902: a #010204 contact shadow band, 8px,
   full width, unbroken.
3. FLOOR STRIP, y=902..990: concrete #4b433b body with a #524a42 light
   row at y=902..906 (the walked-on top course); per 480 module, at
   identical relative positions: one vertical expansion joint #2a2b2a
   (2px) at the module joint x plus one lighter mid-joint at center;
   two short diagonal hairline cracks #2a2b2a (24 px); two worn
   patches #373632 (32×10 px); one darker oil stain band #171919
   (20×6 px); four pebble dots #33312e. The strip's bottom row
   y=986..990 is a #010204 shadow line.

## LIGHT

Flat ambient only. No pools, no receivers, no gradients — stall light
is painted by stall assets and props, never baked into the tile.

## ANGLE LAW

Front faces only: perfectly vertical joints, perfectly horizontal
seams. The floor strip is a flat horizontal band — no trapezoid, no
receding plane, zero side faces.

## COLOR LAW

PALETTE CLAMP: #0d1319 #10161b #1c252a #010204 #070d12 #221e1a
#382c22 #171919 #4b433b #524a42 #2a2b2a #373632 #33312e — 13 values,
the complete palette (doubled from the rejected 6 by ruling). Sample
against Image 1 and Image 2; keep the masters' darkness. Large quiet
planes; the detail list above is exhaustive — nothing else appears.

## TEXT

None. Nothing readable anywhere.

## EXCLUDE

No beams, no pipes, no stalls, no props, no drains, no up/down signs,
no fascia band, no posters. Periodic backdrop only.

## SELF-CHECK before returning

1) Box: art exactly x 48..1488 / y 35..990, flush all four edges;
   chroma clean outside.
2) Overlay-check: the three 480 modules are identical — panels, bolts,
   drip, seam, patch, streaks, scuffs, floor joints, cracks, stains,
   pebbles all on the grid.
3) Wall/floor contact shadow at y=894..902; floor strip 96 tall with
   light top course and bottom shadow line.
4) Thirteen palette values only; quiet planes; no noise, no speckle.
5) Flat #00ff00 outside the box.
6) 1536×1024.
