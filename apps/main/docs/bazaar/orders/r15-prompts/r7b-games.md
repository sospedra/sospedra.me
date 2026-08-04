# Codex order — r7 strategy B — Floor 3 Games bay crop (v2 canvas)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = EDIT TARGET, a 1536×1024 padded crop from the Floor 3 master.
  Black border = matte, keep it flat. Only the content inside the paste
  window x618–918, y213–810 will be kept; everything outside it will be
  DISCARDED at paste time — do not spend effort preserving it, only keep the
  seam edges consistent where they meet the window.
- Image 2 = camera gospel (Uses countertop crop): the exact top-band ratio.

Steps: call image_gen ONCE in EDIT mode, size 1536×1024 (wide landscape),
spec below. Verify the output is exactly 1536×1024; retry once if wrong.
Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r7/gen-games.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## EDIT SPEC

Fix the Games bay camera; keep everything else (siblings sharing the one
handheld, christmas-light sign, Tekken-style arcade screen, shelves, crates)
in the same chunky flat pixel style. Requirements:

1. EXACT CAMERA, no interpretation: pure front-facing parallel projection at
   standing eye level, zero rotation, zero look-down. Every horizontal
   surface in this bay (arcade cabinet top, shelf boards, crate lids, the
   platform) shows AT MOST a thin top band whose height is EXACTLY one fifth
   of its width — the same ratio as the countertop in Image 2. Absolutely no
   floor plane spreading toward the viewer: the stall floor is invisible
   except its front edge board with a thin lit seam and a dark shadow band
   beneath it. The children are seen straight on, feet on the edge line.
2. Light, exact geometry, hard flat steps:
   - the multicolor christmas lights wrap the sign (around (765,265)); small
     red/green/amber/cyan glow dots on the sign board and the wood below:
     rect (695,290 150×25);
   - the arcade CRT (near (715,420)) puts a faint cyan step on the sister's
     near side: rect (735,430 60×120);
   - the handheld (near (825,478)) puts a cool step on both children's faces
     and chests: rect (790,430 75×45);
   - both children stay bright but grounded with compact contact shadows
     under their shoes.
3. Rear plane of the stall one step darker than the front.

Only "games" is readable; the arcade screen stays unreadable low-poly marks.
No aberrations: faces, hands, the handheld and sign glyphs stay crisp. Flat
steps only, no glow, no gradients.
