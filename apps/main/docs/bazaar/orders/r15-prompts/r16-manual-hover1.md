# Codex order — r16 — Manual — hover frame 1 (frame 3/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Manual static master (idle frame 1) and THE EDIT
  TARGET. It is the authority for every pixel: layout, proportions,
  palette, lighting. Reproduce it exactly; change only THE MOTION
  below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-manual-hover1.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 3 of 5 of an in-place animation (first hover frame). At
runtime the frames swap on the same CSS box. Image 1 is law.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same sign plates + chains, lamps, bench, every part on the shelves,
  outlines, colors, lighting and glow shapes.
- The robot FLOATS on a fixed axis: the thruster cone and its blue
  flame tip keep Image 1's exact shape and altitude. The torso is
  rigid.
- No lighting or brightness change anywhere.
- ZERO new colors: every pixel value must already occur in Image 1.
- Both hanging lamps, the small spotlight and the wall control panel
  LEDs stay byte-frozen.

## THE MOTION — the only change

All three eyes snap to the customer; the work pauses:

1. All three pupils lock onto the camera — centered on the viewer.
   Eye housings, stalks and bases do not move a pixel.
2. The arms PAUSE without shifting their roots: duster, wrench and
   free claw keep Image 1's exact positions. A pause is stillness —
   render them byte-identical.

The changed region is confined to the three pupils. This is the
smallest frame of the set: three pupils, nothing else.

## FREEZE CHECK — explicitly unchanged

"manual" letter plates + chains, both hanging lamps + the small
spotlight, wall control panel, steel bench and every shelf part, the
robot's torso, both tool arms, free claw, thruster, flame, chroma
field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the three pupils.
2) Arms, tools, claw and flame match Image 1 to the pixel.
3) Thruster axis and altitude unchanged; torso rigid.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
