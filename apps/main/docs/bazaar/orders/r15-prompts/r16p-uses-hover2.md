# Codex order — r16 patch — Uses hover frame 2 — invite patch

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = an INTERIOR CROP from a much larger pixel-art scene,
  upscaled ×4 (pixel clusters are chunky ~12 px squares). The scene
  CONTINUES beyond all four edges — this is a small window into a
  big image, NOT a complete composition. It shows, from just below a
  man's chin down to his counter: his indigo work shirt with rolled
  sleeves, a brown apron with straps, his two FOLDED ARMS resting at
  counter height, kettle and pot fragments behind him, a warm-lit
  counter top strip below, and at the lower right the back of a
  black-haired customer's head. Image 1 is THE EDIT TARGET and the
  law for every pixel.

A previous attempt on a wider window re-framed the whole scene to
fit the canvas. REJECTED. Do not re-stage, re-frame, recenter or
zoom. Do not pull off-crop elements into view. Do not add any
background or any green. Every element stays at its exact Image 1
position and scale, cut by the canvas edges exactly where Image 1
cuts it.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/patch/uses-hover2-raw.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## PATCH LAW — absolute

This crop will be pasted back into the scene pixel-for-pixel. Any
drift outside the declared change will show as a glitch seam.

- Output is the SAME image: same composition, same element positions,
  same colors, same chunky ~12 px pixel-cluster rendering, same
  outlines, same lighting. Do not sharpen, smooth or "improve".
- The outer 48 px border of the canvas must be pixel-identical to
  Image 1.
- ZERO new colors: every color must already occur in Image 1.
- FROZEN, pixel-identical: the customer's head and shoulders (lower
  right), the counter top strip and its lit bands, every kettle/pot
  fragment behind the man, the shirt collar at the top edge.

## THE CHANGE — the only thing that differs

The man unfolds one arm to invite someone to sit:

1. His screen-LEFT arm unfolds from the folded-arm mass: the forearm
   extends down toward the lower left, ending in a hand with TWO
   fingers extended, pointing down-left. The hand stops ABOVE the
   counter top strip and touches nothing.
2. His screen-RIGHT arm stays folded across the chest, redrawn as
   the natural remainder of the folded pose: same rolled sleeve,
   same skin tones, same resting height.
3. Where the opened arm reveals the apron and shirt behind it,
   continue the apron brown and indigo shirt colors exactly as they
   appear around that area in Image 1.

Nothing else changes. Collar, customer, counter, kettles, pots:
identical.

## SELF-CHECK before returning

1) Flipping between Image 1 and the output, ONLY the two arms and
   the revealed chest/apron area change.
2) The customer is pixel-identical. The counter strip is
   pixel-identical.
3) Two-finger point aims down-left; the hand floats above the
   counter.
4) Outer 48 px border pixel-identical; no new colors; no re-framing;
   1536×1024.
