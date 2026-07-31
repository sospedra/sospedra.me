# Codex order — r10 — Console stall asset, six corrections

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = EDIT TARGET, the Console stall asset on flat chroma green,
1536×1024. Its composition is APPROVED. Every object keeps its identity,
position and size except where a numbered correction below says otherwise.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit target, size
1536×1024. Verify size; retry once if wrong. Copy the result unmodified to
exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-console-r10.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## STYLE LAW — applies to every pixel you draw

This is authored low-resolution pixel art, enlarged with nearest-neighbour so
every logical pixel is one crisp 3×3 block. Obey all of it:

- Large flat single-colour fields. At most THREE tones per material: shadow,
  body, highlight.
- Strong continuous near-black outlines around every object and every
  character.
- Sparse hard highlights only. No soft shading, no gradients, no blur, no
  glow, no bloom, no antialiasing, no dithering, no noise texture.
- Limited palette. Do not introduce new hues; reuse the colours already
  present in Image 1.
- Chunky shapes. Any new detail must be readable as blocks at 3× zoom, never
  fine speckle or thin one-pixel lines.

If a correction below could be drawn either smoothly or chunkily, always draw
it chunkily.

## THE SIX CORRECTIONS

### 1. Nothing leaves the carpet

Every prop, every cable end, every contact shadow must sit fully inside the
rug's woven surface.

- Walk each object in the lower half of the asset: the open pizza box, the tan
  power strip, the small black power-supply box, the coiled cable bundle at
  the right, and every loose cable end.
- CONTAINMENT TEST per object: the rug's woven pattern or its fringe must be
  visible on ALL FOUR sides of that object. If any part of it reaches, crosses
  or overhangs the rug's outer boundary or its fringe, move it inward until
  the test passes.
- Cables may run behind the machinery, but any cable that comes forward must
  end on the rug, never past the fringe.
- Outside the rug there is nothing at all: only flat chroma green.

### 2. The pizza box has exactly one slice left

The open pizza box currently holds a full pizza. Redraw its interior so the
box is nearly empty:

- Exactly ONE triangular slice remains, sitting off-centre inside the box.
- The slice is a chunky wedge: pale dough crust edge, a warm ochre cheese
  field, two or three dark round pepperoni blocks.
- The rest of the box interior is bare greasy cardboard: a flat pale tone with
  two or three small dark stain blotches.
- The box, its open lid and its position on the rug do not change.

### 3. The static monitor shows real television static, not swirls

The screen at the top of the rack tower currently shows a curling swirl
pattern. That is wrong. Replace its content with genuine TV static:

- Fill the screen rectangle with randomly scattered chunky blocks in exactly
  three tones: near-black, mid-grey, and pale grey-white.
- The blocks are square and coarse, arranged in short horizontal runs of one
  to four blocks, scattered irregularly with no curves, no spirals, no
  swirls, no recognisable shapes and no letters.
- A couple of longer pale horizontal streaks may cross the screen as scanline
  interference.
- Keep the monitor's casing, size and position exactly as they are.

### 4. The monitor light lands on him in four places

The static monitor is the only light source in this asset. It sits ABOVE and
slightly LEFT of him, so it lights upward-facing surfaces only. Add a hard
flat pale-grey highlight band, one to two blocks thick, on each of these, and
nowhere else on his body:

- the TOP of his hair, following the silhouette of the spikes;
- the TOP edge of his visor, a thin bright line along its upper rim;
- the TOP of each shoulder;
- the TOP of each knee, where his crossed legs face upward.

Everything else about him stays as it is: dark shadowed brown skin, dull
grey tank top, black shorts, black visor, dark red hair, same pose. Do not
brighten his arms, chest, face or feet.

### 5. The same light lands on the cardboard boxes

The stacked cardboard boxes to his right, and any box face turned toward the
monitor, catch the same light:

- On each box, the face that turns TOWARD the monitor (the inward-facing
  side) gets one flat pale step, clearly lighter than the box's other faces.
- The box tops also catch a thin pale edge.
- Faces turned away stay dark. Keep the boxes' shapes, stacking and stencil
  marks unchanged.

### 6. The floor box nearest him holds computer peripherals

The open cardboard box on the rug at his right currently holds dark round
rocks. Replace the contents entirely:

- Fill it with chunky computer peripherals stacked and jumbled: a beige
  keyboard seen at an angle with its key grid drawn as small blocks, one or
  two computer mice with their cables, a small dark hub or adapter, and a
  coiled cable.
- Everything reads as blocky salvage: three tones per object, strong
  outlines, no fine keycap detail.
- The box itself, its size, its open flaps, its position on the rug and its
  contact shadow all stay exactly as they are.

## IMMUTABLE — do not touch

The rack tower and its stacked servers, the dead monitor with its burn hole,
the LED racks and their coloured dots, the cardboard box stack's shapes, the
cable spaghetti behind and around him, the coiled cable bundle, the rug's
shape and pattern and fringe, the "console" sign board and its pole, his
pose, his proportions, his hair shape, his visor, his clothing shapes, the
overall silhouette, and the flat chroma-green background.

Do NOT add a lamp, a bulb, a hanging cord, or any second light source. Do not
brighten the racks, the rug or the sign.

## BACKGROUND

One perfectly flat solid #00ff00 everywhere around the asset. No shadows, no
reflections, no glow spill, no texture. #00ff00 appears nowhere in the art.
Crisp hard edges. Nothing touches the canvas border.

## TEXT

Only "console" on the sign board. Every box stencil and screen stays
unreadable marks. No new readable text anywhere.

## SELF-CHECK BEFORE RETURNING

1) Every prop passes the containment test with rug visible on all four sides;
nothing outside the rug at all. 2) Pizza box holds exactly one slice, rest is
bare cardboard. 3) Monitor shows scattered chunky static blocks, zero swirls.
4) Pale highlight bands on hair top, visor top rim, both shoulder tops, both
knee tops, and nowhere else on him. 5) Inward-facing box faces are one step
lighter, outward faces dark. 6) The floor box holds a keyboard, mice and a
hub, no rocks. 7) Three tones per material, flat fields, strong outlines, no
gradients or noise texture. 8) Flat #00ff00 background. 9) 1536×1024.
