# Codex order — r16 — Uses — idle frame 2 (frame 2/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Uses static master (idle frame 1) and THE EDIT TARGET.
  It is the authority for every pixel: layout, proportions, palette,
  lighting. Reproduce it exactly; change only THE MOTION below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-uses-idle2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 2 of 5 of an in-place animation. At runtime the frames
swap on the same CSS box: any pixel that differs from Image 1 outside
the declared motion region will flicker like a glitch. Image 1 is law.

- Canvas 1536×1024, flat chroma green #00ff00 background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same structure, sign, shelves, props, floor, outlines, colors,
  lighting and glow shapes.
- The chef's stance is fixed: hidden soles and waist keep Image 1's
  exact position. The torso never translates left or right. Nothing
  rescales. A fixed torso may not "breathe" by scaling.
- The seated customer is FROZEN: not one customer pixel may change.
- No lighting or brightness change anywhere. Hover light boost is a
  separate runtime layer, never baked into frames.
- ZERO new colors: every pixel value must already occur in Image 1.
- Both steam wisps, the hanging bulb, the lantern glows and the cyan
  menu screen stay byte-frozen.

## THE MOTION — the only change

A slow blink plus a tiny adjustment:

1. Both of the chef's eyes close: draw lowered lids using his existing
   skin and shadow hexes. Stern brow keeps its angle; one eyebrow may
   drop 1-2 px.
2. At most a few pixels of one hand's fingers shift on the folded-arm
   mass — a small grip adjustment, silhouette essentially unchanged.

The changed region is confined to the chef's face box and the fingers
of his folded arms. His hair, head outline, body, apron and arm mass
stay put.

## FREEZE CHECK — explicitly unchanged

Marquee ridge, canopy bands, valance, "uses" sign + ropes, both
lanterns, hanging bulb, cyan menu screen + utility boxes, shelving and
every kettle/pot/tin/jar on it, counter top + plank front + patch
plate, the customer (hoodie, cat motif, chopstick arm, bowl, steam),
both stools, bottle crates + bottles, platform slab, chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the chef's eyes/brow and a few
   finger pixels.
2) Customer, steam and menu screen match Image 1 to the pixel.
3) Chef's root and torso x unchanged; folded-arm silhouette intact.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #00ff00 chroma field.
