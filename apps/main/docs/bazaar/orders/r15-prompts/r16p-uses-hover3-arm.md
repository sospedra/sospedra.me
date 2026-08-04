# Codex order — r16 patch — Uses hover frame 3 — palm patch (arm)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = an INTERIOR CROP from a much larger pixel-art scene,
  upscaled ×4 (pixel clusters are chunky ~12 px squares). The scene
  continues beyond all four edges — a window into a big image, NOT a
  complete composition. It shows, from just below a man's chin down
  to his counter: his indigo work shirt, brown apron, one arm folded
  across the chest, the OTHER arm extended down-left with two
  fingers pointing down; a warm-lit counter strip below; the back of
  a black-haired customer's head at the lower right. Image 1 is THE
  EDIT TARGET and the law for every pixel. Do not re-stage,
  re-frame, recenter or zoom. No background, no green.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/patch/uses-hover3-arm-raw.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## PATCH LAW — absolute

- Output is the SAME image: same composition, same positions, same
  colors, same chunky cluster rendering, same outlines, same
  lighting.
- The outer 48 px border must be pixel-identical to Image 1.
- ZERO new colors.
- FROZEN, pixel-identical: the folded arm, the collar, the apron
  straps, the customer's head and shoulders, the counter strip,
  every kettle/pot fragment.

## THE CHANGE — the only thing that differs

The pointing hand relaxes into a silent offer — "Omakase":

1. The extended hand's two pointing fingers open: the hand turns
   into an OPEN PALM facing upward, all fingers relaxed.
2. The forearm rotates up slightly from the elbow so the open palm
   rests at mid-chest height, roughly one pixel-cluster step higher
   than the current fingertip. The elbow and upper arm stay exactly
   where Image 1 has them.
3. Where the hand's old position uncovers counter or apron pixels,
   continue Image 1's counter and apron patterns exactly.

Nothing else changes. The gesture must read calm and settled — this
frame HOLDS on screen while the customer keeps looking.

## SELF-CHECK before returning

1) Flipping between Image 1 and the output, ONLY the extended
   forearm/hand changes.
2) Open palm faces up at mid-chest; elbow unmoved; folded arm
   pixel-identical.
3) Customer and counter pixel-identical.
4) Outer 48 px border pixel-identical; no new colors; 1536×1024.
