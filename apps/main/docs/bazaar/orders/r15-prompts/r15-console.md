# Codex order — r15k — Console (Ed's den, floor band by picture)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = r10/console-alpha-r11.png — THE IDENTITY. The user
  designated this render's Ed as THE good Ed. Copy from Image 1: Ed
  exactly (red dread mass falling around the visor, dark visor, gentle
  smile, slim shoulders, white tank, dark shorts, barefoot cross-legged),
  every machine face, every prop, the color
  temperature and darkness. Copy NOTHING geometric from it: its layout
  overflowed and its floor concept is superseded below: THERE IS NO
  RUG IN THIS STALL. Never draw one.
- Image 2 = the PROPORTION GUIDE (r15/guide-console.png): the stall
  box, Ed's box, the keylines and the ground line. INVISIBLE
  CONSTRAINTS — obey them, never draw them. NONE of Image 2's graphics
  may appear in the output.
- Image 3 = the ANGLE LAW diagram (r12/angle-law.png): green legal
  construction, red forbidden isometric.
- Image 4 = THE RUG LAW: a straight rug band built from this stall's
  own certified weave. Copy its MATERIAL (dark maroon diamond weave,
  border ring, fringe teeth) and its EDGE GEOMETRY (constant width on
  every row, perfectly VERTICAL left and right ends, one straight
  bottom edge). Your rug is DEEPER than Image 4's band — the exact
  pixels are in item 9 — but its edges obey Image 4 exactly: zero
  flare, zero trapezoid, zero receding sides. (No previous render of
  this stall is attached, ON PURPOSE: compose fresh from the numbered
  construction below.)

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024.
Verify size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r15/gen-console.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## THE CAMERA — read first, the reason the last render was rejected

The camera of this whole market is LOW and FRONTAL: eye level at a
standing adult's chest, parallel projection. At that height the
FLOOR AREA IS COMPRESSED: standing characters' stalls show floors as
thin 70-110 px bands. Console's character SITS cross-legged on a
rug, so his rug shows MORE rows — 160 px, item 9 — because his legs
and his props occupy it. That extra depth is encoded by POSITION
ONLY: the rug's top edge sits higher on the canvas. The PROJECTION
STAYS PARALLEL: the rug's left and right ends are perfectly VERTICAL
lines, its width is CONSTANT on every row, its bottom edge is ONE
straight horizontal line, and NOTHING in the scene converges,
recedes or flares. Machine tops show at most a thin 1/5 top band;
Ed and every machine face are seen straight-on. THE KILL: side edges
that flare outward toward the bottom (every previous render died on
this — 82 px, 40 px, 136 px, 128 px of flare, all rejected). Width
at the rug's top row EQUALS width at its bottom row. MEASURE BOTH.

## THE WIDTH KILL — read second

Renders keep drawing too wide (+97%, then +38% — both rejected). The
box is x=508..1028, y=88..920 on a 1536×1024 canvas, chroma green
#00ff00 outside. Three MEASURABLE rules, check all three:

1. THE ASPECT: the art is TALLER than it is wide — art height ÷ art
   width ≥ 1.6. The art is 832 tall, so the art is AT MOST 520 wide.
   MEASURE BOTH before returning.
2. THE BODY RULE: the whole stall is 1.6 lying adults wide. Imagine
   an adult (328 px) lying along the floor: the stall barely fits one
   and a half of him. A stall wider than that is wrong.
3. THE MARGIN RULE: each chroma margin beside the stall is 508 px —
   roughly AS WIDE AS THE STALL ITSELF. If either green margin looks
   narrower than the stall, the render is wrong.

The surround goes VERTICAL, never sideways: monitors stack ON towers,
boxes lean ON racks, props sit ON the floor band. Nothing pokes past
the box.

## THE SCALE CONTRACT

A standing adult reference is 328 pixels. Ed seated is a 240-tall
figure zone: head top y=650, base y=890, x=656..856. The stall is 832
tall = 2.54 adults.

## CONSTRUCTION — numbered, exhaustive; nothing else appears

1. PIPE, x=930..970, y=88..390: dark iron column, the TALLEST element
   (top at y=88), with a short elbow arm at the top; it drops INTO the
   server rack's top. Colors from Image 1's dark rack family.
2. SIGN, x=744..956, y=140..216: Image 1's plate exactly — dark face,
   orange rim, amber "console" glyphs written ONCE. NO mirrored text,
   NO doubled glyphs, NO reflection of the letters anywhere — by
   ruling. CLEAR AIR IS A KILL RULE (the previous render broke it):
   between the sign's bottom (y=216) and the monitor tops (y=360) run
   144 rows containing ZERO machine pixels — only chroma, the pipe
   and the chains. Count that empty band before returning.
3. STATIC MONITOR, x=530..680, y=360..490, sitting ON the left tower:
   Image 1's static-noise screen, beige shell.
4. LEFT TOWER, x=516..690, y=490..820: two stacked beige units from
   Image 1 — vents, switches, small LEDs. REDUCED HEIGHT by ruling:
   its top is y=490, no taller. SURROUND RULING: the tower is turned
   slightly TOWARD Ed — its front face plus ONE narrow right-side
   face (at most 1/5 of the front's width), vertical edges stay
   vertical. It looks at him.
5. BROKEN MONITOR, x=700..860, y=360..490: Image 1's cracked dark
   screen with the hole, sitting ON the center rack.
6. CENTER RACK, x=690..870, y=490..760: Image 1's khaki console faces
   — knobs, sliders, patch cables. It stands BEHIND Ed; his shoulders
   overlap its lower face.
7. SERVER RACK, x=870..1010, y=390..820: Image 1's black rack with
   amber/red/green LED rows. The pipe enters its top. REDUCED: top at
   y=390. SURROUND RULING: the rack is turned slightly TOWARD Ed —
   its front face plus ONE narrow left-side face (at most 1/5 of the
   front's width), vertical edges stay vertical. It looks at him.
8. ED, x=656..856, head y=650, base y=890: Image 1's Ed EXACTLY,
   cross-legged ON the rug (legs on rows 800..890). FIVE overlaps,
   count them: (1) the center rack behind his shoulders, (2) the left
   tower's corner over the rug's left end, (3) the server rack's
   corner over the rug's
   right end, (4) the power strip in front of his legs, (5) the open
   box beside his right knee. He is nested IN the clutter.
9. THE RUG, x=508..1028, y=760..920 — Image 4's material and edge
   law at these exact pixels. Construction, top to bottom:
   (a) woven course y=760..896: dark maroon diamond weave with a
   3 px border ring running along x=508..511, x=1025..1028, and
   y=760..763; (b) fringe teeth y=896..920. The bottom edge is ONE
   PERFECTLY STRAIGHT horizontal line at y=920 — not one fringe
   pixel below it, nothing below but chroma. The left end is a
   VERTICAL line at x=508 on EVERY row from 760 to 920; the right
   end is a VERTICAL line at x=1028 on EVERY row from 760 to 920.
   Width at y=761 = width at y=919 = 520 pixels — MEASURE BOTH
   BEFORE RETURNING; five renders died on flared sides. Occupancy
   arithmetic (why 160 rows): the machines' front feet stand on
   rows 780..820 of the rug's back strip; Ed's crossed legs cover
   rows 800..890 of its middle; the props' bases sit on rows
   860..904 of its front strip; the fringe closes 896..920. It all
   fits — nothing needs to stand below y=920 or outside x=508..1028.
   ZERO reflections on the rug.
10. PROPS ON THE RUG, bases at y≈860..904, inside x=520..1020:
    - pizza box OPEN, x=524..672, lid up as Image 1, one slice.
    - power strip, x=688..856, y=848..900: Image 1's strip, four
      black plugs, cables running to Ed and the PSU.
    - PSU, x=872..952, y=836..900: black box, red button, from
      Image 1.
    - OPEN BOX, x=860..1016, y=732..860, leaning the server rack:
      keyboard grid + mouse + headphones, from Image 1.
    CUT by ruling — do NOT draw: the closed cardboard box stack, the
    cable coil.
11. CABLES: Image 1's dark cable curls behind and between machines
    only; none exits the box.

## LIGHT — THE REFLECTION LAW (gradients, never stamps)

A reflection starts at the receiving surface's body value and ends at
that value pre-mixed 40-60% with the light color nearest the source,
in 3-6 monotonic steps, following the surface plane, stopping at its
silhouette. Source cores stay crisp; outlines and material shading
stay hard-stepped.

- R1 THE STATIC GLOW, three receivers: the wall sliver behind the
  static monitor, the tower face directly below it (y=490..560), and
  the broken monitor's left edge. Pale cool pre-mix, 3-6 steps each.
- R3 SCREEN SPILL: both monitors spill a faint 2-3 step light onto
  the center rack's top edge, y=490..520.
- R4 ED RIM, by ruling — the previous render SKIPPED this, do not:
  Ed's hair top, both shoulders and both knees take VISIBLE 2-3 px
  rim runs, 2-3 steps each — COOL pale from the static monitor on his
  left side, WARM amber from the rack LEDs on his right side. The
  rims hug his silhouette and read at arm's length.
- THE RUG: ZERO reflections. No pools, no glow on it.
- LED dots and screen cores stay crisp; the pipe has no emission.

## ANGLE LAW

Front faces, horizontal + vertical edges, zero receding lines (Image
3's green construction). Depth is a HIGHER base line, never a smaller
size, never a diagonal. Machine tops are flat 1/5 top bands at most.
THE SURROUND EXCEPTION, by ruling: ONLY the left tower and the right
server rack turn slightly toward Ed — each shows one narrow inward
side face (≤ 1/5 of its front width), vertical edges still perfectly
vertical. Everything else — center rack, monitors, props, sign — has
ZERO side faces. The rug is Image 4's edge law at item 9's pixels:
vertical ends, constant width, straight bottom.

## COLOR LAW

Sample EVERYTHING from Image 1 and keep its darkness and warmth.
REDUCED AGAIN by ruling: TOTAL distinct fills ≤ 32. The LED fields
share exactly THREE colors (one amber, one red, one green) at one
intensity each. The machine faces share Image 1's beige, khaki and
black families — no new material colors. NO per-pixel noise: every
fill is a flat region or a 2-3 step ramp. The static screen is the
one textured region, exactly as Image 1 draws it.

## TEXT

Only "console" on the sign plate, written ONCE. Nothing else readable
anywhere. NO mirrored or doubled letters.

## EXCLUDE

NO FLARED RUG SIDES — the single most rejected error of this stall's
history; side edges that widen toward the bottom = instant
rejection. No second rug, no floor visible outside the rug (only
Image 4's
gentle slant). No mirrored or doubled sign glyphs. No floor light
pools. No closed box stack. No cable coil. No second pizza box. No
standee. Nothing outside the box columns.

## SELF-CHECK before returning

1) MEASURE the art: height 832, width ≤ 520, height ÷ width ≥ 1.6;
   each green margin roughly as wide as the stall; pure chroma
   outside.
2) RUG measured: width at y=761 == width at y=919 == 520 px;
   vertical ends at x=508 and x=1028 on every row 760..920; weave
   760..896 with border ring; fringe 896..920; bottom edge ONE
   straight line at y=920; zero flare.
3) Ed: head y=650, well below the monitor bases (y=490); base y=890;
   Image 1 identity; FIVE overlaps counted.
4) Pipe tallest at y=88; the 144-row empty band between sign bottom
   and monitor tops counted; sign text written ONCE, no mirror.
5) The two flanking stacks each show ONE narrow inward side face —
   they look at Ed; center rack + monitors + props stay frontal.
6) R1 three receivers + R3 rack-top spill + R4 VISIBLE
   hair/shoulder/knee rims, all gradient-built.
7) Fills ≤ 32, LEDs three colors; no noise; flat #00ff00 outside;
   1536×1024.
