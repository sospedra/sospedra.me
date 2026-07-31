# Codex order — r16 patch — Uses idle frame 2 — blink patch

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = a 1536×1024 CROP from a larger pixel-art scene: a stern
  grey-haired ramen chef with folded arms behind his counter, shelves
  and kettles behind him. The art is upscaled ×4, so pixel clusters
  are chunky ~12 px squares. Image 1 is THE EDIT TARGET and the law
  for every pixel.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/patch/uses-idle2-raw.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## PATCH LAW — absolute

This crop will be pasted back into the scene pixel-for-pixel. Any
drift outside the declared change will show as a glitch seam.

- Output is the SAME image: same composition, same element positions,
  same colors, same chunky ~12 px pixel-cluster rendering, same
  outlines, same lighting. Do not restage, recenter, sharpen, smooth
  or "improve" anything.
- The outer 48 px border of the canvas must be pixel-identical to
  Image 1.
- ZERO new colors: every color in the output must already occur in
  Image 1. No gradients, no antialiasing, no glow.
- The chef's head outline, hair, ears, neck, body, folded arms,
  clothing, the shelves, kettles, pots and sign fragments all stay
  exactly where Image 1 has them.

## THE CHANGE — the only thing that differs

A slow blink, mid-close:

1. Both eyes CLOSE: replace the open eyes with lowered lids — simple
   dark lid lines with the surrounding skin tones above/below, built
   from hexes already on his face.
2. The stern brow may drop one pixel-cluster step.
3. Optionally, 1-2 pixel-clusters of one hand's fingers on the folded
   arms may shift as a tiny grip adjustment.

Nothing else changes. Face shape, mouth, wrinkles, hair: identical.

## SELF-CHECK before returning

1) Flipping between Image 1 and the output, ONLY the eyes/brow (and
   at most a tiny finger adjustment) move.
2) Outer 48 px border pixel-identical.
3) No new colors, no smoothing, same chunky cluster look.
4) 1536×1024 exactly.
