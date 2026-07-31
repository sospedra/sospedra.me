# Codex order — r16 — w98 — idle frame 2 (frame 2/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the w98 static master (idle frame 1) and THE EDIT TARGET.
  It is the authority for every pixel: layout, proportions, palette,
  lighting. Reproduce it exactly; change only THE MOTION below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-w98-idle2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 2 of 5 of an in-place animation. At runtime the frames
swap on the same CSS box: any pixel that differs from Image 1 outside
the declared motion region will flicker. Image 1 is law.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same "w98" sign, posts, string bulbs, red lamp, shelf towers, every
  pot/plant/leaf, tools, barrel, bucket, spilled pot + soil, outlines,
  colors, lighting and glow shapes.
- The robot's two feet keep their exact ground contacts. The torso
  never translates left or right. Nothing rescales. The apron and the
  watering-can arm stay put.
- No lighting or brightness change anywhere. Hover light boost is a
  separate runtime layer, never baked into frames. Every string bulb
  and the red lamp stay byte-frozen.
- ZERO new colors: every pixel value must already occur in Image 1.
- The blue spider creature on the right shelf stays byte-frozen.

## THE MOTION — the only change

Small tending motions while the creatures rest:

1. One of the robot's round eye lamps adjusts: its inner iris dot
   shifts 1-2 px. The other eye and the head do not move.
2. The free (sprinkle) hand's gripper fingers articulate 2-3 px over
   the seedling pot — a fine sprinkling adjustment. Arm root fixed.
3. The in-air violet seed pixels move to new positions inside the
   same narrow fall column between gripper and pot (same count ±2,
   same existing violet/cyan hexes).
4. The bottom-left blue creature BLINKS: both amber eyes drawn as
   closed lids using its existing body hexes. Its body, antennae and
   mouth do not move.

## FREEZE CHECK — explicitly unchanged

"w98" sign + post + hardware, string bulbs + wire, red lamp, both
shelf towers and every pot/plant on them, hanging vines, garden tools
on hooks, barrel, wooden bucket, tipped pot + spilled soil, seedling
pot body and its plant (leaves unchanged this frame), the watering
can and its arm, robot head/torso/apron/legs/feet, the spider
creature, chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to: one iris dot, gripper
   fingers, the seed-fall pixels, the creature's two eyes.
2) Every bulb, plant and pot matches Image 1 to the pixel.
3) Feet contacts and torso x unchanged.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
