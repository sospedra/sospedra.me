# Codex order — r16 patch — Uses hover frame 3 — nod patch (head)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = an INTERIOR CROP from a much larger pixel-art scene,
  upscaled ×4 (pixel clusters are chunky ~12 px squares). The scene
  continues beyond all four edges — a window into a big image, NOT a
  complete composition. It shows a stern grey-haired ramen chef from
  hair to chest: he looks straight at the viewer, one arm folded
  across the chest, the other arm extended down out of frame;
  shelves, kettles and a sign fragment behind him. Image 1 is THE
  EDIT TARGET and the law for every pixel. Do not re-stage,
  re-frame, recenter or zoom. No background, no green.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/patch/uses-hover3-head-raw.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IDENTITY PIN — recorded failure class, hard rules

- The chef is CLEAN-SHAVEN. The dark shape under his nose is a stern
  MOUTH over a chin crease — it stays a mouth. NO moustache, NO
  beard, NO stubble.
- Keep Image 1's EXACT brow shape, eye size and eye sockets.
- Same wrinkles, same nose, same jaw shape, same grey hair mass.

## PATCH LAW — absolute

- Output is the SAME image: same composition, same positions, same
  colors, same chunky cluster rendering, same outlines, same
  lighting.
- The outer 48 px border must be pixel-identical to Image 1.
- ZERO new colors.
- FROZEN, pixel-identical: everything below the collar — both arms,
  apron, shirt — plus all shelves, kettles, pots and the sign
  fragment.

## THE CHANGE — the only thing that differs

A restrained nod, held:

1. The whole head drops by ONE pixel-cluster step (~8-12 px on this
   canvas): hair mass, face and jaw shift down together by that one
   step. The neck/collar line absorbs it; shoulders do not move.
2. The eyes STAY OPEN and STAY on the viewer through the nod.
3. The stern frown softens one notch: composed, quietly inviting,
   not smiling.

Nothing else changes.

## SELF-CHECK before returning

1) Flipping between Image 1 and the output, ONLY the head moves
   (one step down) and the mouth softens.
2) Eyes open, on the viewer. No facial hair. Same brows, same eye
   size.
3) Both arms and everything below the collar pixel-identical.
4) Outer 48 px border pixel-identical; no new colors; 1536×1024.
