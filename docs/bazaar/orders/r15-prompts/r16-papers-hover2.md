# Codex order — r16 — Papers — hover frame 2 (frame 4/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the generated Papers hover frame 1 and THE EDIT TARGET. It
  is the authority for every pixel outside THE MOTION below.
- Image 2 = the Papers static master (idle frame 1): identity and
  resting-pose reference.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-papers-hover2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 4 of 5 of an in-place animation (second hover frame). At
runtime the frames swap on the same CSS box. Image 1 is law for every
pixel outside the declared motion.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same kiosk, awning, sign, shelves, racks, counter, outlines, colors,
  lighting and glow shapes.
- The archivist's torso column is fixed. The torso never translates
  left or right. Nothing rescales.
- THIS frame may change: hologram-cyan hand/arm pixels AND the tan
  open book. Nothing else — no other wood, canvas, paper or brass
  pixel may differ.
- No lighting or brightness change anywhere.
- ZERO new colors: every pixel value must already occur in Image 1.
- Bell, pen cup, closed book, card racks, page-boards and sign stay
  byte-frozen.

## THE MOTION — the only change

He finds the relevant passage:

1. The tan open book opens wider: both covers spread a few px flatter,
   page block redrawn with its existing tan/olive hexes. The book's
   anchor height stays exactly Image 1's — it opens in place, it does
   not lift.
2. One cyan hand shifts so its index finger rests on the right page,
   locating a line. The other hand keeps its grip on the cover.
3. Head and eyes hold hover frame 1's state exactly: face to camera.

The changed region is confined to the book and the two hologram
hands/forearms.

## FREEZE CHECK — explicitly unchanged

Awning + "papers" lettering, kiosk posts, wall shelves and every
book/bundle, pinned page-boards, counter top + plank front, bell, pen
cup, closed dark book, both wheeled racks and every card, wheels,
floor shadows, the hologram head/torso (as Image 1), chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the book + hands/forearms.
2) Book anchor height unchanged; covers wider, finger on page.
3) Torso column unchanged; head identical to Image 1.
4) No new hexes; no lighting or glow-shape change.
5) 1536×1024; clean #ff00ff chroma field.
