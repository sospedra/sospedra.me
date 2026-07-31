# Codex order — r12 — Console asset: sign geometry, monitor glow, shadows

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = EDIT TARGET, the Console stall asset on flat chroma green
#00ff00, 1536×1024. Everything is APPROVED except the three corrections
below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit target, size
1536×1024. Verify size; retry once if wrong. Copy the result unmodified to
exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-console-r12.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## EDIT SPEC

### 1. Sign: shorter board, taller post

The current sign board is too tall. Rebuild the assembly at the same x
position:
- The board becomes a compact horizontal plate just big enough for the word:
  about 210 pixels wide and 55 pixels tall. Face #111923, frame border 4px
  #ad6a1e with corner rivets #df9e32, outline #020307.
- The word "console" stays MONOSPACE lowercase, blocky terminal glyphs, each
  letter in an equal-width cell, letter color #df9e32 with a #7b4514 edge
  step, centered with 10 to 14 pixels of padding on every side.
- The POLE gets taller: a straight vertical pole of #414c55 with left light
  edge #606970 and right shadow edge #2b3741, 8 to 10 pixels wide, rising so
  the board's top edge sits between y=30 and y=45 on the canvas. The pole
  descends behind the boxes to the floor as now. Do not change the canvas
  size.

### 2. White glow around the ON monitor

The static monitor at the top of the rack tower emits light. Around its
casing paint a hard two-step halo on the surfaces behind and beside it:
- first step, directly touching the casing silhouette: #898e8d;
- second step outside that: #606970;
- both steps are flat bands 3 to 5 pixels thick following the casing shape,
  with NO blur and NO gradient. The dead monitor beside it gets NO halo.

### 3. Stronger shadows beneath the monitor

Everything below the ON monitor darkens for contrast:
- the rack faces in the 60 pixels directly beneath the monitor drop one
  step: repaint their base tone areas to #111923 and their darker recesses
  to #080c12;
- every object standing in that zone (cable loops, rack feet) gets a hard
  contact shadow row of #020307, 2 to 3 pixels tall, directly beneath it;
- the shadows are flat and hard-edged, no gradients.

Nothing else changes: Ed, his highlights, the rug, the pizza box, the power
strip and its cables, the peripherals box, the box stack, the cable coil,
the static screen content — all pixel-identical. Style stays chunky flat
pixel art on a 3×3 grid, three tones per material, near-black outlines.
Background stays perfectly flat #00ff00, nothing touching the canvas border.
Use ONLY the hex colors named above for the new pixels.
