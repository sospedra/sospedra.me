# Codex order — r16 — Console — idle frame 2 (frame 2/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Console static master (idle frame 1) and THE EDIT
  TARGET. It is the authority for every pixel: layout, proportions,
  palette, lighting. Reproduce it exactly; change only THE MOTION
  below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-console-idle2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 2 of 5 of an in-place animation. At runtime the frames
swap on the same CSS box: any pixel that differs from Image 1 outside
the declared motion region will flicker. Image 1 is law.

- Canvas 1536×1024, flat chroma green #00ff00 background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same racks, servers, CRT, sign + bent pipe, boxes, cables, rug,
  pizza, power strip, outlines, colors, lighting and glow shapes.
- Ed's seated root is fixed: pelvis and crossed legs keep Image 1's
  exact position on the rug. The torso never translates left or
  right. Nothing rescales.
- The visor STAYS ON in every frame.
- No lighting or brightness change anywhere. Hover light boost is a
  separate runtime layer, never baked into frames.
- ZERO new colors: every pixel value must already occur in Image 1.
- CRT static pattern, every rack LED dot, and all cable runs stay
  byte-frozen. Only the visor glyphs named below may change.

## THE MOTION — the only change

A small interface tick and a precise tap:

1. Two to four tiny glyph pixels along the visor's front band change
   state, using only hexes already on the visor. The visor's outline
   and glow shape do not change.
2. The viewer-right hand's fingers lift 2-3 px in a precise tap over
   the invisible interface. Wrist and forearm stay put.
3. Ed's torso, head, hair mass, tank top, crossed legs, other hand:
   byte-identical to Image 1.

## FREEZE CHECK — explicitly unchanged

"console" sign + bent pipe + chain, CRT + its static, speaker box,
every rack unit and LED, stacked cartons, keyboard/headphone box,
cable spool, power strip + plugs, pizza box + slice, rug + fringe,
Ed's body except the named fingers, chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to visor glyph pixels and one
   hand's fingers.
2) Rack LEDs and CRT static match Image 1 to the pixel.
3) Seated root and torso x unchanged; visor on.
4) No new hexes; no lighting or glow-shape change.
5) 1536×1024; clean #00ff00 chroma field.
