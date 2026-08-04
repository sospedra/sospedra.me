# Codex order — r16 — Uses — hover frame 1 (frame 3/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Uses static master (idle frame 1) and THE EDIT TARGET.
  It is the authority for every pixel: layout, proportions, palette,
  lighting. Reproduce it exactly; change only THE MOTION below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-uses-hover1.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 3 of 5 of an in-place animation (first hover frame). At
runtime the frames swap on the same CSS box: any pixel that differs
from Image 1 outside the declared motion region will flicker. Image 1
is law.

- Canvas 1536×1024, flat chroma green #00ff00 background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same structure, sign, shelves, props, floor, outlines, colors,
  lighting and glow shapes.
- The chef's stance is fixed: hidden soles and waist keep Image 1's
  exact position. The torso never translates left or right. Nothing
  rescales.
- The seated customer is FROZEN: not one customer pixel may change.
- No lighting or brightness change anywhere.
- ZERO new colors: every pixel value must already occur in Image 1.
- Both steam wisps, the hanging bulb, the lantern glows and the cyan
  menu screen stay byte-frozen.

## THE MOTION — the only change

The chef notices the customer at the stall (the viewer):

1. His eyes aim straight at the camera — pupils centered on the
   viewer, awake and sharp.
2. His chin rises slightly: the head tilts up 2-3 px. Jaw line, mouth
   and hairline redraw inside the head box to carry the tilt. The
   stern expression becomes attentive, not friendly yet.

The changed region is confined to the chef's head box. Arms stay
folded exactly as Image 1; shoulders and body do not move.

## FREEZE CHECK — explicitly unchanged

Marquee ridge, canopy bands, valance, "uses" sign + ropes, both
lanterns, hanging bulb, cyan menu screen + utility boxes, shelving and
every kettle/pot/tin/jar on it, counter top + plank front + patch
plate, the customer (hoodie, cat motif, chopstick arm, bowl, steam),
both stools, bottle crates + bottles, platform slab, chroma field,
the chef's folded arms and body below the neck.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the chef's head box.
2) Customer, steam, folded arms match Image 1 to the pixel.
3) Chef's root and torso x unchanged; head tilt ≤3 px.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #00ff00 chroma field.
