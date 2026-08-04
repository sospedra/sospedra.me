# Codex order — r24b — SM probe B: tread-perspective emphasis

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the STYLE authority: the approved market spiral drum
  (public/images/bazaar4/arch/stairs.png). The ONLY authority for
  material, palette, base construction and the interior background.
  The r15 drum design is canon (user ruling).
- Image 2 = the PROPORTION GUIDE (guides/r24-sm-guide.png): the shaft
  box, the halfway platform box, the FRONTAL base box, the threshold
  keylines and the crop-safe line. INVISIBLE CONSTRAINTS — obey them,
  never draw them. NONE of Image 2's graphics or colors may appear in
  the output.
- Image 3 = the TREAD authority (r23/trim-b.png): a previous probe.
  The ONLY thing it authorizes is the tread construction — the
  per-step perspective, the flat top band + front edge reading of
  each individual step (user ruling: "very good perspective of each
  step"). EVERYTHING ELSE in Image 3 is WRONG: its platform height is
  wrong, its bottom pad is wrong, its pitch-black background is
  wrong, its palette drift is wrong. Copy ONLY the tread rendering.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1024x1536
(portrait). Verify size; retry once if wrong. Copy the result
unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r24/gen-sm-b.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## WHAT THIS IS — user ruling, absolute

An OPEN spiral stairwell serving one market floor of two stacked
stories. NO doors, NO doorways, NO apertures, NO frames, NO cage, NO
bars. Exactly TWO exits:

- HALFWAY: a landing platform extending RIGHT, walking surface ON the
  exact vertical midpoint.
- BOTTOM: a FRONTAL slab-step base, exactly like Image 1's drum base —
  the stair exits toward the viewer, not to the side.

## THE MIDLINE LAW — the one row that matters

The art's vertical midpoint of its extent (y = (8+1528)/2 = 768) IS
the upper story's floor line at runtime. The halfway platform's TOP
WALKING SURFACE sits ON y=768. Not near it. ON it. The previous probe
placed it 51 px high and was rejected for exactly this. The deck slab
and its brackets hang BELOW the line; only the guard rail rises above
it.

## THE BOX CONTRACT — absolute

Canvas 1024x1536, background flat chroma green #00ff00.

- SHAFT: exactly x=320..720, y=8..1528 — 400 wide, 1520 tall, flush
  top and bottom by design.
- HALFWAY PLATFORM: x=720..857, top surface ON y=768, steel slab
  72 px thick (y=768..840), flush squared end at x=857. Two support
  brackets beneath, anchored to the right post. At the outer end a
  40 px guard rail: two 3 px balusters #16191a carrying a warm-brown
  top rail #584a3c with #37322b shadow. THE HELIX CONNECTS: the
  upper flight's arriving tread lands flush ONTO the platform at
  y=768 — continuous circulation, zero gap between stair flow and
  deck. A floating, unconnected platform is a rejection.
- FRONTAL BASE, x=384..656, y=1440..1528: Image 1's base grammar,
  exactly — a stepped pedestal drawn as TWO stacked flat bands:
  upper band #282825 with #16191a shadow and a #584a3c warm top
  course; lower band wider, #16191a with #453d34 top row. Centered
  on the upper band's front face: an inset amber light strip
  x=488..552, y=1464..1480 — frame #453d34, lit core #6a523b with a
  #584a3c step. The bottom-most treads land onto the pedestal; the
  exit faces the VIEWER. Flush at y=1528 with two flat spill rows.
- The halfway platform, its rail and its strip live fully right of
  x=600 (the outer left half may crop offscreen at runtime). The
  frontal base centers like Image 1's — exempt from that rule by
  user ruling.
- Everything outside these boxes stays flat chroma green #00ff00.
- Expected trim: x 320..857, y 8..1528 = 537 x 1520 (aspect 0.353).

## THE SCALE CONTRACT

- A standing adult reference is 400 pixels. Two stories of 760 each.
- Tread risers are 50 px: about fifteen treads per story, one
  unbroken helix around the pole.

## CONSTRUCTION — Image 1's drum language

1. FLANKING POSTS, x=320..384 and x=656..720, full height: riveted
   steel posts (#453d34 body, #584a3c light edge, #16191a shadow
   edge, #020406 outline), one bolt dot #382514 with #282825 rim
   every 96 px; square capitals top and base. Nothing between the
   posts except the helix and the interior — no bars, no mesh.
2. THE INTERIOR — like Image 1, never pitch black: base #020406 with
   the drum's back treatment: a #0b1216 back-glow zone behind the
   spiral and subtle vertical panel seams #1d2224 every ~96 px.
   Sample Image 1's recess; reproduce that depth.
3. CENTER POLE, x=496..544, full height: #16191a body, #282825 light
   line, #1d2224 mid, coupling rings every 192 px.
4. SPIRAL TREADS — reproduce Image 3's step rendering VERBATIM: the
   same tread depth, the same top-band-to-front-edge ratio, the same
   highlight placement. each tread an
   individually readable flat step (top band + front edge + #020406
   outline), 50 px risers, full-width facing the viewer,
   foreshortened stubs behind the pole; 3 px balusters carrying one
   continuous handrail #584a3c / #37322b shadow, both flights,
   unbroken.
5. THE ARRIVING TREAD at y=768 merges into the platform top course —
   the connection reads as one continuous walking line.
6. WORN APPROACH: up to three scuff marks #37322b near each exit,
   none larger than 12x4 px.

## LIGHT

Two amber strips only (platform front face x=744..808 y=776..792,
base front face x=488..552 y=1464..1480): core #6a523b, one step
#584a3c, spill #453d34 then #37322b — hard flat steps. Nothing else
lit.

## FLATNESS LAW — user ruling: chunkier, flatter, fewer

- Exactly three tones per material. Zero blends between clamp values.
- Minimum color cluster 3x3 px. No single-pixel dithering, no 1 px
  noise, no per-tread tonal variation.
- Outlines 3 px, near-black, continuous.
- Any 16x16 px square anywhere in the art contains at most 4 distinct
  colors.

## ANGLE LAW

Front faces with thin top bands, vertical verticals, horizontal
horizontals, no ellipse deeper than 0.25, zero side faces, zero
receding lines. Platforms and base are stacked flat bands, never
perspective slabs. Treads follow Image 3.

## COLOR LAW

PALETTE CLAMP: #453d34 #16191a #020406 #584a3c #0b1216 #282825
#1d2224 #37322b #6a523b #382514 — 10 values, the complete palette.
Sample against Image 1; keep its darkness.

## TEXT

None. Nothing readable anywhere. No up/down signs.

## EXCLUDE

NO doors, doorways, apertures, frames, jambs, cage, bars, mesh. No
ceiling collar, no wall, no ground beyond the base spill, no
neighbors, no props, no signs, no left-side platform. The shaft alone
on chroma.

## AVOID — hard rejections

Antialiasing, gradients, blur, soft glow, bloom, painterly shading,
high-resolution illustration pixelated afterwards, pseudo-pixel
microtexture, fine one-pixel noise, mixed pixel densities, added
elements, moved elements, watermarks.

## SELF-CHECK before returning

1) Platform walking surface ON y=768 — measure it. The single most
   important row. 10 px off = wrong image.
2) An arriving tread physically touches the platform — no floating
   deck.
3) Bottom = frontal two-band pedestal with centered amber strip,
   flush at y=1528, exit facing the viewer. NO side pad.
4) Interior shows Image 1's back treatment — not flat black.
5) Zero doors or enclosures; helix fully visible; treads read like
   Image 3's.
6) Platform + rail + its strip right of x=600.
7) Flatness: 3-tone materials, 3x3 clusters, 10 clamp values only.
8) 1024x1536; chroma clean outside the boxes.
