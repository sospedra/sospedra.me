# Codex order — r16 — Travel — hover frame 2 (frame 4/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the generated Travel hover frame 1 and THE EDIT TARGET.
  It is the authority for every pixel outside THE MOTION below.
- Image 2 = the Travel static master (idle frame 1): identity and
  resting-pose reference.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-travel-hover2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 4 of 5 of an in-place animation (second hover frame). At
runtime the frames swap on the same CSS box. Image 1 is law for every
pixel outside the declared motion.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same triangle sign, booth frame, corrugated walls, LAST SEATS
  plate, planet route cards, diving helmet, banjo, candles, radar
  unit, counter, chest, queue posts + rope, outlines, colors,
  lighting and glow shapes.
- The Hearthian's torso column at the counter is fixed. The torso
  never translates left or right. Nothing rescales.
- No lighting or brightness change anywhere.
- ZERO new colors: every pixel value must already occur in Image 1.
- Candle flames and the radar's green sweep stay byte-frozen.

## THE MOTION — the only change

The ticket rises with charming urgency:

1. The ticket arm lifts 12-14 px: forearm rotates up from the elbow,
   the ticket ending held high and upright, just BELOW the LAST
   SEATS plate. The ticket must not touch or occlude a single letter
   of the plate, and must not touch the wall cards or the helmet.
2. The head tips 1-2 px toward the raised ticket; all four wide eyes
   stay on the camera.
3. The resting gloved hand on the counter: byte-identical to
   Image 1.

The changed region is confined to the ticket arm (elbow up) + ticket
and ≤2 px of head tilt.

## FREEZE CHECK — explicitly unchanged

Triangle sign + saucer art, booth frame + rivets, corrugated walls,
star-map rear wall, planet route cards, LAST SEATS plate (fully
readable), diving helmet, banjo, candles + flames, radar + sweep,
counter, chest, queue posts + rope, his vest/jacket/torso, the
resting hand, chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the ticket arm/ticket and
   head tilt.
2) LAST SEATS plate fully visible; ticket below it, touching
   nothing.
3) Torso column unchanged; elbow root unmoved.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
