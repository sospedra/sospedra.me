# Codex order — r15 — Travel, narrow deep booth, proportion-locked

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Travel bay crop from the approved Floor 3 master: the
  authority for the booth's rear-wall depth, its darkness, its colors,
  its materials and its props — and NOT for its width. Image 1's booth
  is TOO NARROW for this order: the ruling is 20% WIDER. Copy
  materials, depth cues and props from it; copy zero width from it.
  The previous regen copied Image 1's width and was rejected.
- Image 2 = the PROPORTION GUIDE: it maps Image 1's proportions onto
  the exact canvas box — booth box, agent box, keylines, ground line.
  These boxes are INVISIBLE CONSTRAINTS — obey them, never draw them.
  NONE of Image 2's graphics — the colored boxes, the dashed lines,
  the cyan bar, the text labels — may appear in the output in any
  color, in any form.
  ALL canvas geometry comes from Image 2 and the numbers below.
- Image 3 = the APPROVED Manual stall asset: rendering flatness,
  outline weight and color restraint standard.
- Image 4 = the angle law diagram: GREEN construction only (front
  rectangle + one thin top band, vertical sides); RED isometric
  forbidden.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024.
Verify size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r15/gen-travel.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## THE BOX CONTRACT — absolute

Canvas 1536×1024, background flat chroma magenta #ff00ff. The ENTIRE
booth fits inside the box x=448..1088, y=152..920. Not one art pixel
outside it. The booth is 640 wide by 768 tall — the SAME HEIGHT AS
THE GAMES STALL by ruling (the taller-stand rule is dropped);
everything else is preserved.
COVERAGE: the booth covers the CENTRAL 42% of the canvas width; each
chroma margin is about 448 px. SIZE IS A KILL RULE in BOTH directions:
the counter's ends touch x≈464 and x≈1072, the tarp's top edge touches
y≈152; a booth narrower than 600 px or shorter than 744 px is wrong.
The queue posts' and trunk's contact shadows sit ON y≈916..920.
Nothing stretches toward the canvas edges.

## THE SCALE CONTRACT

- A standing adult reference is 328 pixels. The booth is 768 pixels
  tall = 2.34 adults — the same height as the games stall.
- COLOR RESTRAINT is a kill rule: the previous pass carried too many
  colors on the Hearthian and the props. The agent uses ONLY the
  fourteen values named in item 5. Every prop keeps at most TWO tones
  plus outline.
- THE AGENT is a standing adult Hearthian, 320 pixels head-to-sole,
  hidden below the waist by the counter: head top y≈382, counter line
  y≈612, hidden soles y≈702 on the recessed interior floor. If his
  head reaches the fascia (above y≈312), he is too big and the image
  is wrong.
- Match Image 2's orange agent box exactly.

## THE DEPTH CONTRACT — one metre, by position and overlap only

Parallel projection: no receding lines, no size changes. The depth
reads through exactly these cues:
- The REAR WALL (item 4) is one full value step darker than every
  front surface, exactly as Image 1.
- A soffit shadow band #020b14, 12-16 px tall, runs under the fascia
  across the rear wall's top, y≈292..308.
- Thick corrugated SIDE RETURNS (item 3) overlap the rear wall by a
  visible dark seam on both sides.
- A darker floor gap #020b14 shows behind the counter at both sides of
  the agent, y≈600..612.

## THE REFLECTION LAW — supersedes hard-step receivers, all lights

A reflection is a GRADIENT, never a flat patch and never a hard-edged
band. The canon example is the Manual counter: warm lamp left, cool
lamp right, each blending smoothly into the steel across the
countertop. Construction, exact:
- start: the surface's own body value where the light cannot reach;
- end: the surface body PRE-MIXED with the light color at 40-60%
  strength, at the point nearest the source;
- between: a smooth monotonic blend along the light's direction —
  3-6 intermediate steps at this pixel scale, each step 2-6 px deep,
  no banding jumps, no dither noise;
- the gradient's shape follows the RECEIVING surface: horizontal
  along countertops and boards, vertical along poles and posts, and
  it STOPS at the surface's silhouette — it never spills onto
  neighbors or the background;
- the source's own core stays crisp (1-2 px, no gradient);
- outlines and material shading stay hard-stepped — ONLY reflections
  blend.

## LAYOUT — Image 1's booth at the new proportions

Positions in canvas pixels, ±12 px tolerance; box edges and the agent
height have none.

1. Tarp across the booth top, x=448..1088, y=152..200: canvas #39351d
   body, #282716 shadow folds; strap tabs
   #46280c with grommet dots #8a5410; outline #020304. It lies over
   the wood top rail.
2. TRIANGULAR SIGN centered on the fascia, x=656..880, y=152..288,
   COMPLETE with its apex: border band #b88b5a with #b88b5a shadow
   edge; inner triangle field #020b14 with five star dots #b88b5a;
   the small grey saucer-rocket: body #414c55 with #414c55 shadow and
   #7b7367 light, amber dome #c77904; lower cream band #b88b5a
   carrying "Travel Ventures" in #020304 clean block glyphs; outline
   #020304.
3. Booth shell: fascia band y=200..292 and both SIDE RETURNS
   x=448..496 and x=1040..1088, y=200..880: corrugated panels drawn
   as vertical stripes #776657 body, #4c4334 shadow lines, #937c69
   light stripes, sparse rust streaks #693915 (at most one per
   panel); wood frame posts and rails #46280c body, #281808 shadow.
4. INTERIOR REAR WALL, x=496..1040, y=292..640, one step darker than
   everything: field #020b14 with 2-3 faint chart lines #0a1a2b. On
   it, all sitting dark:
   - three route cards x=560..690, y=324..404: #8a6843 with #8a6843
     shadow, planet dots #b83932, #df9e32, #57667a, connected by one
     thin line;
   - a brass diving helmet x=900..990, y=316..412: #46280c body,
     #281808 shadow, #8a5410 rim, dark round porthole;
   - the BANJO x=830..915, y=394..614: face #8a6843, rim #693915,
     neck #0c1605 pointing down, four string lines #a58a69;
   - the LAST SEATS board x=510..604, y=354..444: #96642d board, "LAST SEATS" in #0c1605 capitals, hung by
     one #4c4334 string.
5. THE AGENT, centered x=668..868, behind the counter (head top
   y≈382): blue-grey
   Hearthian skin #57667a body, #485669 shadow;
   exactly FOUR eyes in two pairs, each #d88818 with a #7b4514 rim
   and a #020304 pupil dot; long pointed side ears in the same skin
   trio; a wide simple SMILE: one #0c1605 curved line with two corner
   pixels. Head top y≈430. Vest #79230c body, #581808
   shadow, zipper line #414c55, cream wing patch #b88b5a, round badge
   #c77904. Under-suit sleeves #553619 with #46280c shadow. Gloves
   #281808 with #46280c light edge. His right glove rests flat ON the
   counter top; his left hand raises a ticket #b58a4a with #ab7842
   shadow and three #46280c stamp dashes.
6. CANDLES, three sets, identical construction — wax #cfad7e with
   #b88b5a shadow, one wick pixel #0c1605, flame: core pixel #ffe3a1,
   body #ffd26b, then a two-step flat halo #df9e32 then #9a530a:
   a) a brass dish #8a5410 with two candles on the counter's left
      end, x=500..576, y=532..612;
   b) a pair on a small bracket shelf ON the rear wall's right side,
      x=940..1010, y=444..524 — these light the interior;
   c) the radar keeps them company: no third counter set — instead
      one small candle beside the radar on the right wing.
7. CANDLE LIGHT — COUNTED receivers, each per THE REFLECTION LAW
   (gradients blending into the surface). SIX, count them:
   a) counter dish → the counter top blends toward #693915 in a
      40-70 px zone around the dish, strongest beside the flames;
   b) counter dish → the agent's vest front and left glove blend
      toward #9c3212 on their dish-facing edges, fading in 6-10 px;
   c) interior pair → the rear wall blends toward #46280c in a
      30-50 px halo zone around the flames, fading outward;
   d) interior pair → its shelf board's top edge blends toward
      #693915;
   e) interior pair → the LAST SEATS board's near edge blends toward
      #b58a4a, strongest on the candle side;
   f) radar candle → the radar casing's near side blends toward
      #693915 across 6-10 px.
   Every flame lights its neighborhood with a blend; a candle with a
   flat patch or no receiver = the image is wrong.
8. THE RADAR, COLOCATED by ruling: seated DEAD SOLID on the counter
   top's right end, x=928..1048, y=512..628 — its base centered on
   the counter band, its right edge exactly 24 px inside the
   counter's right end (x=1048 vs 1072), its left edge at least 16 px
   clear of the agent's resting glove; nothing overlaps it: casing #46280c with #281808 shadow and
   brass corners #8a5410; its BOTTOM EDGE is a straight horizontal
   line lying exactly ON the counter top band, with a 2px #020304
   contact shadow row along its full base — no gap, no float; round
   scope: bezel #8a5410, screen field #0c1605, two ring lines
   #172509, sweep wedge #4b6220, three blip dots #95a247; one small
   antenna #414c55. One flat #172509 band on the counter directly in
   front of the scope.
9. COUNTER, x=464..1072: top band y=612..660, #46280c with #693915
   light lip and #281808 shadow — a plain horizontal strip about one
   fifth of the counter's front height; front y=660..820 of
   corrugated panels (#776657 / #4c4334 / #937c69) framed by wood
   rails #46280c / #46280c; below it a corrugated base skirt
   y=820..880: vertical stripes #776657 body, #4c4334 shadow lines,
   #937c69 light stripes, framed by a wood base rail #46280c with
   #46280c light edge; outline #020304.
10. Queue posts in front, COLOCATED by ruling: FIVE brass posts at
    x = 530, 646, 762, 878, 994 (even 116 px spacing), all bases on
    ONE line y≈876,
    #8a5410 body with #46280c shadow and #c77904 caps, red rope
    #79230c with #581808 shadow sagging between them; 2px #020304
    contact shadows at y≈916.
11. Luggage trunk, front left, COLOCATED: its left edge aligned with
    the counter's left end at x=464, base on the same y≈876 line as
    the posts, x=464..624, y=700..876 — NAVY LEATHER by ruling (a
    distinct hue, clean to key): body #1d3247, shadow #0a1a2b, light
    edge #2c4a63, brass corners and clasp #8a5410 with #c77904
    glints, winged emblem #c77904; contact shadow row at y≈876.

## ANGLE LAW

Per Image 4's GREEN construction: counter, trunk, radar casing, boards
and shelves show a front rectangle plus ONE thin top band, vertical
sides, zero side faces, zero receding diagonals.

## COLOR LAW

PALETTE CLAMP: the 41 hexes named in this order are the complete
meaningful palette of the asset. Every art pixel reads as one of
them; merge any stray shade into its nearest listed value. No new
hues, no intermediate blends.

Sample every color from Image 1 — the booth stays as DARK and as quiet
as Image 1; the hexes above are anchors measured from it. EIGHT HUE
FAMILIES ONLY — count them: wood browns, corrugated warm-greys, navy
wall, cream/tan paper, vest red family, skin blue-grey, amber/brass,
radar green. The previous render carried extra colors and was
rejected; any pixel outside these eight families is wrong.
FLATTER AND CHUNKIER by ruling (aggressive cut): 41 values total is the ceiling —
prefer fewer. Large single-color fields; detail chunks into blocks of
3×3 px or larger; exactly three tones per material and NEVER a fourth;
zero per-plank micro texture, zero speckle, zero tiny highlights. If a
detail is invisible at 300 px preview width, it does not exist. Restraint
like Image 3: quiet corrugated walls, sparse details, clean simple
face. Three tones per material, large flat fields, continuous
near-black outlines, no gradients, no blur, no soft glow, no
antialiasing, no noise.

## TEXT

Only "Travel Ventures" and "LAST SEATS". Ticket and route cards stay
unreadable dashes.

## EXCLUDE

No H-beams (Image 1 shows one at its left edge — leave it out), no
concrete lobby floor, no neighbors, nothing beyond the booth. The
asset floats on chroma.

## SELF-CHECK before returning

1) Box: zero art outside x 448..1088 / y 152..920; MEASURE the booth:
   600-640 wide and 744-768 tall, counter ends near x=464 and
   x=1072, tarp top at y≈88; tarp top y≈200;
   contact shadows on y≈916..920. The booth is NARROW — it does not
   approach the canvas edges.
2) Agent head top y≈382 — measure it against Image 2's agent box; four
   paired #d88818 eyes, smile, vest, raised ticket.
3) Depth: rear wall one step darker, soffit shadow band, side-return
   overlap seams, dark floor gap behind the counter.
4) Radar bottom edge flat on the counter with a full-length contact
   shadow, zero float.
5) COUNT the six candle receivers (a-f above); every one present.
6) Complete triangle sign with apex, saucer-rocket, "Travel Ventures";
   LAST SEATS board readable.
7) Banjo, helmet and route cards dark against the rear wall.
8) Five queue posts with sagging red rope; trunk with brass and
   emblem; all with contact shadows.
9) As dark as Image 1, as flat as Image 3; green construction
   everywhere; flat #ff00ff background; nothing at the canvas border.
10) 1536×1024.
