# Codex order — r16 patch — Uses hover frame 1 — notice patch

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
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/patch/uses-hover1-raw.png
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
- The chef's hair mass, ears, neck, body, folded arms, clothing, the
  shelves, kettles, pots and sign fragments all stay exactly where
  Image 1 has them.

## IDENTITY PIN — the recorded failure this retry fixes

A previous attempt gave him a moustache. REJECTED. Hard rules:

- The chef is CLEAN-SHAVEN. The dark shape under his nose in Image 1
  is a stern frowning MOUTH over a chin crease — it stays a mouth.
  NO moustache, NO beard, NO stubble.
- Keep Image 1's EXACT brow shape: thin, hard, angled stern brows.
  Do not thicken, soften or re-style them.
- Keep Image 1's eye SIZE: same sockets, same footprint. Only the
  gaze changes; the eyes do not get bigger or rounder.
- Same wrinkles, same nose, same jaw shape, same grey hair mass.

## THE CHANGE — the only thing that differs

The chef notices the customer in front of him (the camera):

1. His eyes aim straight at the viewer: pupils centered, awake and
   sharp, using the eye colors already present.
2. His chin rises slightly: jaw and mouth shift UP by one pixel-cluster
   step (~8-12 px on this upscaled canvas). The head outline and hair
   mass stay where they are — only the face features carry the lift.
3. The stern expression becomes attentive: the frown holds, the brows
   ease half a step at most.

Nothing else changes. Body, arms, clothing, background: identical.

## SELF-CHECK before returning

1) Flipping between Image 1 and the output, ONLY the eyes, brow, jaw
   and mouth move.
2) Outer 48 px border pixel-identical.
3) No new colors, no smoothing, same chunky cluster look.
4) 1536×1024 exactly.
