# Codex order — r15 — Horizontal separator beam module (tileable, rich pass)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the ceiling band crop from the approved Floor 1 master:
  color and construction authority for the slab, wall top and pipe
  rail.
- Image 2 = the floor strip crop from the same master: color authority
  for the fascia lip and the underside void.
- Image 3 = the PROPORTION GUIDE: the band box and the periodic joint
  grid. INVISIBLE CONSTRAINTS — obey them, never draw them. NONE of
  Image 3's graphics may appear in the output.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024.
Verify size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r15/gen-beam-h.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## THE BOX CONTRACT — absolute

Canvas 1536×1024, background flat chroma green #00ff00. The band fills
the box x=96..1440, y=400..760 exactly: 1344 wide, 360 tall, flush on
all four box edges — exactly 96 px of chroma left and right. MEASURE:
art exactly 1344 wide and 360 tall, no more. This is the BETWEEN-FLOORS separator, top to
bottom: fascia lip of the floor above, dark underside, then the
ceiling band of the floor below with its pipe rail. This rich pass
doubles the detail of the rejected flat pass.

## THE PERIODICITY CONTRACT — the reason this asset exists

STRICTLY PERIODIC every 192 px in the INTERIOR. Vertical joints at
x = 96, 288, 480, 672, 864, 1056, 1248, 1440. Every interior 192-wide
module is IDENTICAL — plates, bolts, couplings, brackets, stains all
repeat at the same relative positions. One interior module will be
cut and tiled; any deviation breaks the tile and the image is wrong.
THE BAND HAS ENDS by ruling: the outermost 24 px on each side
(x=96..120 and x=1416..1440) are END PLATES, excluded from the tile
cut — vertical steel caps #31393d, full band height, with a #545a5d
outer edge line, a #0e151a inner shadow line, three bolts (#382514
heads, #29231d rims) spaced down each plate, and #030405 outlines.
The pipe rail and conduit TERMINATE INTO the end plates with a
coupling flange, not a cropped cut.

## THE SCALE CONTRACT

A standing adult reference is 328 pixels. The band is 360 tall ≈ 1.1
adults: fascia lip 40, underside 96, ceiling band 224.

## CONSTRUCTION — top to bottom, per 192 module

1. FASCIA LIP, y=400..440: a #524a42 walked-edge light row (4px) at
   the very top, then a #382c22 warm-brown fascia band with wood
   grain gaps #2c1a10 (two short horizontal dashes per module), a
   #050504 shadow line under the lip, and a #12191e recess row at the
   base. One plate seam #050504 at every joint x with two bolt heads
   #221e1a beside it.
2. UNDERSIDE VOID, y=440..536: near-black #010306 with two faint
   horizontal structure lines #12181c and #1d2328 running unbroken,
   and per module one hanging drip stain #070d12 (3 px wide, 22 px
   tall) from the fascia's shadow at the same relative x.
3. SLAB LINE, y=536..556: a #10161b slab edge band with a #010204
   shadow row and a 1px #252d32 light row at its top.
4. WALL TOP, y=556..704: dark navy panels #0d1319 with #010204 joint
   lines at every joint x, a #1c252a panel light edge on each joint's
   left side, and per module two bolt heads #221e1a at y≈580 plus one
   faint damp streak #070d12 (5 px wide, 60 px tall).
5. PIPE RAIL, y=704..744: iron pipe, richer by ruling: body #141619
   with a #574838 warm top light row AND a #29231d rust mid row, a
   #070d12 shadow row beneath; at EVERY joint x one coupling ring
   12 px wide: #231d17 with a #382514 warm edge, a #54493c glint
   pixel and #030405 outlines; one mounting bracket #29231d with a
   #382514 foot dropping 8 px to the wall at each coupling; and one
   thin secondary conduit line #10161b with #252d32 top light running
   straight 6 px below the pipe, full width, unbroken.
6. BASE ROW, y=744..760: #0d1319 wall continuing, quiet.

## LIGHT

Flat ambient only. The warm pipe rows are material, not emission. No
pools, no receivers, no gradients.

## ANGLE LAW

Front faces with horizontal and vertical edges only. Zero side faces,
zero receding lines.

## COLOR LAW

PALETTE CLAMP: #524a42 #382c22 #2c1a10 #12191e #050504 #221e1a
#010306 #12181c #1d2328 #070d12 #10161b #252d32 #010204 #0d1319
#1c252a #141619 #574838 #29231d #231d17 #382514 #54493c #030405 —
22 values, the complete palette (up from the rejected 7 by ruling).
Sample against Image 1 and Image 2; keep the masters' darkness.

## TEXT

None. Nothing readable anywhere.

## EXCLUDE

No elbows, no junction boxes, no vents, no hooks, no sagging cables —
separate props. No beams crossing the band. Strict periodic geometry
only.

## SELF-CHECK before returning

1) Box: art exactly x 96..1440 / y 400..760, flush all four edges;
   chroma clean outside.
2) Overlay-check: every INTERIOR 192 module identical — plates,
   bolts, couplings, brackets, drips, streaks all on the grid.
2b) Both END PLATES present at x 96..120 and x 1416..1440, three
   bolts each; the pipe terminates into them with flanges.
3) Top to bottom: light lip, grained fascia, shadow, void with two
   lines + drip, slab with light row, wall panels with bolts, pipe
   with TWO warm rows + couplings + secondary conduit, base row.
4) Twenty-two palette values only; perfectly straight horizontals.
5) Flat #00ff00 outside the box.
6) 1536×1024.
