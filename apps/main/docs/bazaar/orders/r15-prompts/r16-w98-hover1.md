# Codex order — r16 — w98 — hover frame 1 (frame 3/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the w98 static master (idle frame 1) and THE EDIT TARGET.
  It is the authority for every pixel: layout, proportions, palette,
  lighting. Reproduce it exactly; change only THE MOTION below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-w98-hover1.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 3 of 5 of an in-place animation (first hover frame). At
runtime the frames swap on the same CSS box. Image 1 is law.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same "w98" sign, posts, string bulbs, red lamp, shelf towers, every
  pot/plant/leaf, tools, barrel, bucket, spilled pot + soil, outlines,
  colors, lighting and glow shapes.
- The robot's two feet keep their exact ground contacts. The torso
  never translates left or right. Nothing rescales.
- No lighting or brightness change anywhere. Every string bulb and
  the red lamp stay byte-frozen.
- ZERO new colors: every pixel value must already occur in Image 1.
- BOTH creatures stay byte-frozen this frame (bottom-left eyes open,
  exactly as Image 1).

## THE MOTION — the only change

The gardener notices the customer; the watering pauses:

1. The boxy head turns a few degrees toward the camera: redraw the
   head faces inside the head box so both round eye lamps face the
   viewer. The antenna sways 1-2 px with the turn.
2. The watering PAUSES: remove the in-air violet seed pixels — the
   fall column is empty this frame. The gripper hand freezes in
   place, exactly where Image 1 has it.
3. Both arms, the can, apron, torso, legs: byte-identical to Image 1.

The changed region is confined to the head box + antenna and the
seed-fall column (removed pixels only).

## FREEZE CHECK — explicitly unchanged

"w98" sign + post + hardware, string bulbs + wire, red lamp, both
shelf towers and every pot/plant, hanging vines, garden tools,
barrel, bucket, tipped pot + soil, seedling pot + plant, watering can
+ both arms + gripper, robot torso/apron/legs/feet, both creatures,
chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the head box/antenna and the
   removed seed pixels.
2) Both creatures and every plant match Image 1 to the pixel.
3) Feet contacts and torso x unchanged; head turn ≤ a few degrees.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
