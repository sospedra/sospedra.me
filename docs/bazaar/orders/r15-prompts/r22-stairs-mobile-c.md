# Codex order — r22c — SM probe C: railed deck, lit thresholds

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the STYLE authority: the approved market spiral drum
  (public/images/bazaar4/arch/stairs.png). The ONLY authority for
  material, cage language, tread construction and every color. The
  r15 drum design is canon (user ruling).
- Image 2 = the PROPORTION GUIDE (guides/r22-sm-guide.png): the shaft
  box, the two exit apertures, the landing deck, the threshold
  keylines and the crop-safe line at exact canvas positions.
  INVISIBLE CONSTRAINTS — obey them, never draw them. NONE of Image
  2's graphics or colors may appear in the output.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1024x1536
(portrait). Verify size; retry once if wrong. Copy the result
unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r22/gen-stairs-mobile-c.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## WHY THIS ASSET EXISTS — the layout contract

SM is the mobile stairwell. One SM serves one market floor of TWO
stacked stories. The runtime layout derives three hard facts from
this file, so they are geometry law, not art direction:

1. The art's vertical midpoint IS the upper story's floor line. The
   upper exit threshold must sit ON it exactly.
2. The art's bottom edge IS the lower story's floor line. The lower
   exit threshold IS that edge.
3. At runtime the OUTER (left) half of the trimmed art slides
   offscreen, up to exactly half its width. Everything functional —
   both apertures, the deck, both thresholds' lit strips — must
   live in the inner (right) zone, x >= 600.

Exits open RIGHT. Left-side floors are produced later by mirroring
this asset; never draw a left variant.

## THE BOX CONTRACT — absolute

Canvas 1024x1536, background flat chroma green #00ff00.

- SHAFT: exactly x=320..720, y=8..1528 — 400 wide, 1520 tall, flush
  top and bottom by design (it meets the separator band and the
  story floor in composition). Left/right stay clear of canvas
  borders.
- UPPER EXIT APERTURE: on the shaft's RIGHT face, x=620..720,
  y=608..768. The cage bars stop; a dark doorway shows the spiral
  behind.
- UPPER LANDING DECK: x=720..857, top surface ON y=768 (the canvas
  midline of the art's vertical extent: (8+1528)/2 = 768), steel
  slab 72 px thick (y=768..840), ending flush at x=857 with a plain
  squared edge. Two support brackets beneath. Above the deck the
  opening stays clear up to y=608.
- LOWER EXIT APERTURE: on the shaft's RIGHT face, x=620..720,
  y=1368..1528. Threshold IS the shaft's bottom edge at y=1528 — no
  deck, no step: the doorway meets the ground line flush.
- Everything outside these boxes stays flat chroma green #00ff00.
- Expected trim: x 320..857, y 8..1528 = 537 x 1520 (aspect 0.353).

## THE SCALE CONTRACT

- A standing adult reference is 400 pixels. The shaft is 1520 tall =
  two stories of 760, each ~1.9 adults — interior architecture, not
  furniture.
- Tread risers are 50 px: two continuous spiral flights of about
  fifteen treads each, one flight per story, winding one unbroken
  helix around the pole.
- The deck slab (72 px) is thick enough to read structural: a human
  stands on it credibly.

## CONSTRUCTION — Image 1's drum language, exactly

1. CAGE SHAFT, x=320..720 full height: the drum's riveted steel
   posts (#453d34 body, #584a3c light edge, #16191a shadow edge,
   #020406 outline) at both shaft edges, one bolt dot #382514 with
   #282825 rim every 96 px down each post; thin vertical cage bars
   #16191a between them; near-black recess #020406 with a #0b1216
   back-glow zone behind the spiral.
2. CENTER POLE, x=496..544, full height: steel mast #16191a body,
   #282825 light line, #1d2224 mid, coupling rings every 192 px
   (#282825 with #020406 outlines).
3. SPIRAL TREADS: flat steel treads (#282825 top, #16191a front
   edge, #020406 outline) winding around the pole at 50 px risers,
   full-width facing the viewer, foreshortened stubs behind the
   pole; thin 3 px balusters #16191a carrying one continuous
   warm-brown handrail #584a3c with #37322b shadow, both flights.
4. UPPER EXIT: at x=620..720, y=608..768 the cage bars STOP — clean
   squared jambs in post steel (#453d34 / #584a3c / #020406
   outline). Doorway interior near-black #020406; one or two treads
   visible inside at #16191a. The spiral passes BEHIND the aperture
   and continues.
5. UPPER LANDING DECK: x=720..857, y=768..840 — two flat stacked
   bands per the drum's base grammar: upper band #282825 with
   #16191a shadow and a #584a3c warm top course; lower band #16191a
   with #453d34 top row. Two support brackets #453d34 with #020406
   outlines beneath, anchored to the shaft post. Deck top course
   sits exactly ON y=768. At the deck's outer end a 40 px guard
   rail: two 3 px balusters #16191a carrying a warm-brown top rail
   #584a3c with #37322b shadow — the drum's rail grammar.
6. LOWER EXIT: at x=620..720, y=1368..1528 — same jamb construction,
   same near-black interior, threshold flush with y=1528. The
   bottom-most treads land into it.
7. THRESHOLD LIGHT STRIPS: one inset amber strip per exit, the
   drum's light language — frame #453d34, lit core #6a523b with a
   #584a3c step. Upper strip on the deck's front face x=728..824,
   y=776..792. Lower strip inside the lower aperture at ground,
   x=628..712, y=1500..1516. Each strip casts a spill of exactly two
   flat steps (#453d34 then #37322b) reaching no farther than 24 px.
8. CAGE CONTINUITY: above and below both apertures the cage resumes
   normally — bars, posts, bolt rows unbroken.
9. WORN APPROACH: up to three scuff marks #37322b near each
   threshold, none larger than 12x4 px.

## LIGHT

The two amber threshold strips are the module's only sources: core
#6a523b, one step #584a3c, spill #453d34 then #37322b — hard flat
steps, nothing else lit. The recess stays near-black. No glow beyond
the strips' immediate spill bands.

## ANGLE LAW

Front faces with thin top bands, vertical verticals, horizontal
horizontals, no ellipse deeper than 0.25, zero side faces, zero
receding lines. The deck is drawn as stacked flat bands, never as a
perspective slab.

## STYLE

Authored low-resolution 16-bit pixel art enlarged nearest-neighbor.
Large flat bounded color regions, chunky square clusters, strong
near-black outlines, exactly three tones per material, large
connected shadow masses, sparse hard highlights, LOW DETAIL.

## COLOR LAW

PALETTE CLAMP: #453d34 #16191a #020406 #584a3c #0b1216 #282825
#1d2224 #37322b #6a523b #382514 — 10 values, the complete palette.
Sample against Image 1; keep its darkness.

## TEXT

None. Nothing readable anywhere. No up/down signs — wayfinding is a
separate prop.

## EXCLUDE

No ceiling collar, no wall, no ground beyond the threshold spill
zones, no neighbors, no props, no signs, no left-side exits. The
shaft alone on chroma.

## AVOID — hard rejections

Antialiasing, gradients, blur, soft glow, bloom, painterly shading,
high-resolution illustration pixelated afterwards, pseudo-pixel
microtexture, fine one-pixel noise, mixed pixel densities, added
elements, moved elements, watermarks.

## SELF-CHECK before returning

1) Box: shaft exactly x 320..720 / y 8..1528, flush top and bottom;
   nothing outside x 320..857; chroma clean elsewhere.
2) Upper deck top course sits ON y=768 — measure it: the art's
   exact vertical midpoint. This is the single most important pixel
   row in the asset.
3) Lower threshold flush at y=1528, no step, no deck.
4) Both apertures and both amber strips fully right of x=600.
5) Count treads: ~fifteen per story, 50 px risers, one continuous
   helix interrupted only by the two apertures.
6) Ten palette values only; no ellipse deeper than 0.25.
7) 1024x1536.
