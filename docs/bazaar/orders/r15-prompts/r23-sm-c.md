# Codex order — r23c — SM probe C: heavy platforms

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the STYLE authority: the approved market spiral drum
  (public/images/bazaar4/arch/stairs.png). The ONLY authority for
  material, tread construction, rail grammar and every color. The
  r15 drum design is canon (user ruling).
- Image 2 = the PROPORTION GUIDE (guides/r23-sm-guide.png): the shaft
  box, the two platform boxes, the threshold keylines and the
  crop-safe line at exact canvas positions. INVISIBLE CONSTRAINTS —
  obey them, never draw them. NONE of Image 2's graphics or colors
  may appear in the output.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1024x1536
(portrait). Verify size; retry once if wrong. Copy the result
unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r23/gen-sm-c.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## WHAT THIS IS — user ruling, absolute

An OPEN spiral stairwell. There are NO doors, NO doorways, NO
apertures, NO door frames, NO jambs, NO cage, NO enclosure of any
kind. The helix is fully visible top to bottom. The module has
exactly TWO platforms and nothing else: a landing deck halfway up
and a landing pad at the ground.

## WHY THE GEOMETRY IS LAW — the layout contract

SM serves one market floor of TWO stacked stories. The runtime
derives three hard facts from this file:

1. The art's vertical midpoint IS the upper story's floor line. The
   halfway deck's walking surface must sit ON it exactly.
2. The art's bottom edge IS the lower story's floor line. The ground
   pad sits flush on it.
3. At runtime the OUTER (left) half of the trimmed art slides
   offscreen, up to exactly half its width. Both platforms and both
   lit strips must live in the inner (right) zone, x >= 600.

Platforms extend RIGHT. Left-side floors are produced later by
mirroring this asset; never draw a left variant.

## THE BOX CONTRACT — absolute

Canvas 1024x1536, background flat chroma green #00ff00.

- SHAFT: exactly x=320..720, y=8..1528 — 400 wide, 1520 tall, flush
  top and bottom by design. Left/right stay clear of canvas borders.
- UPPER PLATFORM: x=720..857, top walking surface ON y=768 (the
  midpoint of the art's vertical extent: (8+1528)/2 = 768), steel
  slab 88 px thick (y=768..856), ending flush at x=857 with a plain
  squared edge. Three support brackets beneath, anchored to the shaft
  post. The tread that reaches y=768 lands flush onto this deck —
  open connection, no frame around it.
- GROUND PAD: x=720..820, y=1496..1528 — a low boarding pad of two
  flat stacked bands, flush with the bottom edge at y=1528. The
  bottom-most tread lands onto it — open connection, no frame.
- Everything outside these boxes stays flat chroma green #00ff00.
- Expected trim: x 320..857, y 8..1528 = 537 x 1520 (aspect 0.353).

## THE SCALE CONTRACT

- A standing adult reference is 400 pixels. The shaft is 1520 tall =
  two stories of 760, each ~1.9 adults — interior architecture, not
  furniture.
- Tread risers are 50 px: two continuous spiral flights of about
  fifteen treads each, one flight per story, one unbroken helix
  around the pole.
- The deck slab (72 px) is thick enough to read structural: a human
  stands on it credibly.

## CONSTRUCTION — Image 1's drum language, exactly

1. FLANKING POSTS, x=320..384 and x=656..720, full height: the
   drum's riveted steel posts (#453d34 body, #584a3c light edge,
   #16191a shadow edge, #020406 outline), one bolt dot #382514 with
   #282825 rim every 96 px down each post; simple square capitals at
   top and base. NOTHING between the posts except the open helix and
   the recess dark: no bars, no mesh, no panels.
2. THE RECESS, between the posts: near-black interior #020406 with a
   #0b1216 back-glow zone behind the spiral.
3. CENTER POLE, x=496..544, full height: steel mast #16191a body,
   #282825 light line, #1d2224 mid, coupling rings every 192 px
   (#282825 with #020406 outlines).
4. SPIRAL TREADS: flat steel treads (#282825 top, #16191a front
   edge, #020406 outline) winding around the pole at 50 px risers,
   full-width facing the viewer, foreshortened stubs behind the
   pole; thin 3 px balusters #16191a rising from the tread ends,
   carrying one continuous warm-brown handrail #584a3c with #37322b
   shadow, both flights, unbroken.
5. UPPER PLATFORM, x=720..857, y=768..840: two flat stacked bands
   per the drum's base grammar: upper band #282825 with #16191a
   shadow and a #584a3c warm top course; lower band #16191a with
   #453d34 top row. Two support brackets #453d34 with #020406
   outlines beneath, anchored to the right post. Top course sits
   exactly ON y=768. The helix meets it openly at that height.
6. GROUND PAD, x=720..820, y=1496..1528: the same two-band grammar,
   compressed: #282825 top band with #584a3c warm top course,
   #16191a lower band, flush at y=1528. The final tread lands onto
   it.
7. THRESHOLD LIGHT STRIPS: one inset amber strip per platform, the
   drum's light language — frame #453d34, lit core #6a523b with a
   #584a3c step. Upper strip on the deck's front face x=728..824,
   y=776..792. Lower strip on the pad's front face x=728..808,
   y=1504..1520.
8. CONTINUITY: posts and bolt rows run unbroken full height; the
   helix is visible for its entire run, interrupted by nothing.
9. WORN APPROACH: up to three scuff marks #37322b near each
   platform, none larger than 12x4 px.

## LIGHT

The two amber strips are the module's only sources: core #6a523b,
one step #584a3c, spill #453d34 then #37322b — hard flat steps,
nothing else lit. The recess stays near-black. No glow beyond the
strips' immediate spill bands.

## ANGLE LAW

Front faces with thin top bands, vertical verticals, horizontal
horizontals, no ellipse deeper than 0.25, zero side faces, zero
receding lines. Platforms are drawn as stacked flat bands, never as
perspective slabs.

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

NO doors, NO doorways, NO apertures, NO door frames, NO jambs, NO
cage, NO bars, NO mesh. No ceiling collar, no wall, no ground beyond
the platforms, no neighbors, no props, no signs, no left-side
platforms. The open shaft alone on chroma.

## AVOID — hard rejections

Antialiasing, gradients, blur, soft glow, bloom, painterly shading,
high-resolution illustration pixelated afterwards, pseudo-pixel
microtexture, fine one-pixel noise, mixed pixel densities, added
elements, moved elements, watermarks.

## SELF-CHECK before returning

1) ZERO doors or enclosures anywhere — the helix is visible for its
   full run. If any doorway exists, the image is wrong.
2) Upper platform walking surface sits ON y=768 — measure it: the
   art's exact vertical midpoint. The single most important pixel
   row in the asset.
3) Ground pad flush at y=1528.
4) Both platforms and both amber strips fully right of x=600.
5) Box: shaft exactly x 320..720 / y 8..1528; nothing outside
   x 320..857; chroma clean elsewhere.
6) Count treads: ~fifteen per story, 50 px risers, one continuous
   helix. Ten palette values only; no ellipse deeper than 0.25.
7) 1024x1536.
