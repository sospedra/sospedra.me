# Codex order — r16 — Papers — idle frame 2 (frame 2/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Papers static master (idle frame 1) and THE EDIT
  TARGET. It is the authority for every pixel: layout, proportions,
  palette, lighting. Reproduce it exactly; change only THE MOTION
  below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-papers-idle2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 2 of 5 of an in-place animation. At runtime the frames
swap on the same CSS box: any pixel that differs from Image 1 outside
the declared motion region will flicker. Image 1 is law.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same kiosk, awning, sign, shelves, racks, counter, outlines, colors,
  lighting and glow shapes.
- The archivist is a cyan HOLOGRAM: his torso column and the book's
  anchor height are fixed. The torso never translates left or right.
  Nothing rescales.
- In THIS frame only hologram-cyan pixels may change. Not one pixel of
  wood, canvas, paper, brass, book or floor may differ.
- No lighting or brightness change anywhere. Hover light boost is a
  separate runtime layer, never baked into frames.
- ZERO new colors: every pixel value must already occur in Image 1.
- Bell, pen cup, closed book, card racks, page-boards and sign stay
  byte-frozen.

## THE MOTION — the only change

The hologram signal briefly desynchronizes:

1. Two or three 1-px-tall horizontal slices of the cyan figure shift
   1-2 px sideways (classic scanline tear), inside the figure's
   silhouette plus a 2 px halo. Different slices than any other frame
   would pick — one through the head, one through the shoulders.
2. The glasses' glint pixels flicker to a different existing cyan.
3. Three to five floating cyan fragment pixels around the figure move
   to new positions within 12 px of their Image 1 spots.
4. His reading pose, hands and the tan book DO NOT move: the flicker
   passes over a still body.

## FREEZE CHECK — explicitly unchanged

Awning + "papers" lettering, kiosk posts, wall shelves and every
book/bundle on them, pinned page-boards left and right, counter top +
plank front, bell, pen cup, closed dark book, the TAN OPEN BOOK in his
hands (physical object: zero change this frame), both wheeled racks
and every card in them, wheels, floor shadows, chroma field.

## SELF-CHECK before returning

1) Every changed pixel is a cyan hologram pixel inside/near the
   figure's silhouette.
2) The tan book, counter and all wood match Image 1 to the pixel.
3) Torso column and book anchor height unchanged.
4) No new hexes; no lighting or glow-shape change.
5) 1536×1024; clean #ff00ff chroma field.
