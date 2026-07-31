# Codex order — r16 — Manual — idle frame 2 (frame 2/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Manual static master (idle frame 1) and THE EDIT
  TARGET. It is the authority for every pixel: layout, proportions,
  palette, lighting. Reproduce it exactly; change only THE MOTION
  below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-manual-idle2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 2 of 5 of an in-place animation. At runtime the frames
swap on the same CSS box: any pixel that differs from Image 1 outside
the declared motion region will flicker. Image 1 is law.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same sign plates + chains, lamps, bench, every gear/coil/pipe/valve
  part on the shelves, outlines, colors, lighting and glow shapes.
- The robot FLOATS on a fixed axis: the thruster cone and its blue
  flame tip keep Image 1's exact shape and altitude. The torso is
  rigid: it never translates, never tilts, never "breathes".
- No lighting or brightness change anywhere. Hover light boost is a
  separate runtime layer, never baked into frames.
- ZERO new colors: every pixel value must already occur in Image 1.
- Both hanging lamps, the small spotlight and the wall control panel
  LEDs stay byte-frozen.

## THE MOTION — the only change

Only the three pupils scan, plus one optional spark:

1. Each of the three eyes' dark pupils shifts 1-2 px, each aimed in a
   DIFFERENT direction (left eye left, right eye down, top eye right).
   Eye housings, stalks and bases do not move a pixel.
2. Optionally ONE tiny static spark, 2-3 px, beside one eye stalk,
   drawn with an existing pale hex. Nothing else sparks.
3. Duster arm, wrench arm, free claw, torso, hatch, chevron insignia
   and flame: all byte-identical to Image 1.

## FREEZE CHECK — explicitly unchanged

"manual" letter plates + chains, both hanging lamps + the small
spotlight, wall control panel, steel bench top and frame, gears, coil,
pipe fittings, red valve wheel, blue pipe assembly, oil can, motor
block, cable box, the robot's torso/arms/tools/claw/thruster/flame,
chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the three pupils (+ at most
   one 2-3 px spark).
2) Arms, tools, claw and flame match Image 1 to the pixel.
3) Thruster axis and altitude unchanged; torso rigid.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
