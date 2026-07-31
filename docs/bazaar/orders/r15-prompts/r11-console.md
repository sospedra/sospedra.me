# Codex order — r11 — Console stall asset, five refinements

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = EDIT TARGET, the Console stall asset on flat chroma green,
1536×1024. Its composition is APPROVED. Only the five numbered refinements
below change; everything else stays pixel-identical.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit target, size
1536×1024. Verify size; retry once if wrong. Copy the result unmodified to
exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-console-r11.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## STYLE LAW — applies to every pixel you draw

Authored low-resolution pixel art, 3×3 logical blocks. Large flat
single-colour fields, at most three tones per material, strong near-black
outlines, no gradients, no blur, no glow, no antialiasing, no noise. Reuse
only colours already present in Image 1 unless a refinement names a new one.

## THE FIVE REFINEMENTS

### 1. Cable coherence around the power strip

The tan power strip sits at about x655–820, y860–925. Its cables are
currently incoherent: one thick cable exits the bottom-left toward
(640, 925) and crosses the rug's fringe, and several cable stubs end
nowhere. Rebuild this cable system so every cable has a purpose:

- DELETE the cable that leaves the rug at the bottom-left. Nothing may touch
  or cross the rug fringe anywhere.
- The strip keeps its five sockets. Exactly THREE plugs are inserted, each
  with a chunky rectangular plug head and a visible cable that goes
  somewhere real:
  a) one short cable runs right and plugs into the small black power-supply
     box at about (830–930, 780–840);
  b) one cable runs up behind him and disappears into the rack machinery
     behind his back;
  c) one cable runs right along the rug and joins the big cable coil at
     about (960–1120, 700–840).
- The strip's own feed cable exits its left end and coils into a small neat
  loop ON the rug beside it, ending in a visible plug head lying flat.
- The two empty sockets show as simple dark socket holes.
- Every cable stays fully on the rug's woven surface, with rug visible
  between cable and fringe at all times.

### 2. His highlights: coherent bands, not glitches

The pale highlight patches on him currently read as artifacts. Redraw them as
clean stepped bands that follow his shapes. For each lit surface use exactly
TWO steps: a light band on the very top contour, and below it one narrow
mid-tone step that bridges to the base colour. No isolated specks, no
scattered patches, no white pixels floating inside dark areas.

- Hair: one continuous pale-red band, 1-2 blocks thick, tracing the TOP
  outline of the hair spikes only (about y470–500), with a mid red step
  under it. The rest of the hair stays dark red.
- Visor: one thin light-grey line along its full top rim, nothing below.
- Shoulders: one light-brown band on the top edge of each shoulder, with a
  mid-brown step beneath; each band hugs the shoulder curve as one
  continuous run.
- Knees: same treatment on the top of each folded knee.
- Every band uses the same hue family as its base surface, just lighter —
  never grey-white on skin or hair.

### 3. The pizza box changes colour

The open pizza box at about (455–650, 730–890) is currently tan cardboard
like every other box. Repaint it as a classic pizzeria box so it stands
apart:

- Pale CREAM body (lid, walls, base) — clearly lighter and cooler than the
  brown cardboard boxes behind him.
- One faded RED stripe band running along the lid edge and the front wall
  edge.
- A small red unreadable stamp mark centered on the lid's inner face.
- Keep its exact shape, position, open lid, the single pizza slice and the
  grease stains inside. Three tones for the cream, two for the red.

### 4. The sign lettering becomes monospace

The "console" board currently uses rounded, uneven lettering. Redraw the
word in a MONOSPACE terminal style:

- All eight letters lowercase, each occupying the same fixed width cell,
  evenly spaced like terminal output: c o n s o l e.
- Blocky square-cornered glyph shapes, consistent stroke thickness, like an
  old computer font at pixel size.
- Same cream/amber colour on the dark board, one darker step for the glyph
  edges. No serifs, no rounding, no italics.

### 5. The sign gets taller

The sign assembly at about (805–1000, 30–260) grows:

- The board becomes about half again taller than now (from roughly 110px
  tall to roughly 165px), keeping its width, its dark face, its rivets and
  its orange frame. The word sits centered with generous space above and
  below.
- The pole extends accordingly, still descending behind the boxes to the
  floor. The whole assembly may reach a little higher, but nothing touches
  the canvas border.

## IMMUTABLE — do not touch

The rack tower, the static monitor and its chunky static, the dead monitor,
the LED racks, the cardboard box stack and its lit inward faces, the
peripherals box with keyboard and mice, the rug's shape, pattern and fringe,
his pose, proportions, visor shape, tank top, shorts, the flat chroma-green
background. No lamp, no bulb, no new light source, no new readable text —
only "console" exists, now monospace.

## BACKGROUND

One perfectly flat solid #00ff00 everywhere around the asset. No shadows, no
spill, no texture. #00ff00 appears nowhere in the art. Nothing touches the
canvas border.

## SELF-CHECK BEFORE RETURNING

1) Zero cables touching or crossing the rug fringe; three plugged sockets
with traceable destinations, two empty sockets, feed cable coiled with a plug
head; 2) his highlights are continuous two-step bands on hair top, visor rim,
shoulder tops, knee tops — no isolated pale specks; 3) pizza box is cream
with red stripe and stamp, slice and stains kept; 4) "console" in even
monospace cells, blocky terminal glyphs; 5) board ~1.5× taller with longer
pole, nothing at canvas border; 6) three tones per material, flat fields,
strong outlines; 7) flat #00ff00 background; 8) 1536×1024.
