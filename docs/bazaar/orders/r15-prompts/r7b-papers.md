# Codex order — r7 strategy B — Floor 1 Papers bay crop (v2 canvas)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = EDIT TARGET, a 1536×1024 padded crop from the Floor 1
master. Black border = matte, keep it perfectly flat. Only the content inside
the paste window x540–1011, y213–810 will be kept; everything outside it will
be DISCARDED at paste time — do not spend effort preserving it, only keep the
seam edges consistent where they meet the window.

Steps: call image_gen ONCE in EDIT mode, size 1536×1024 (wide landscape),
spec below. Verify the output is exactly 1536×1024; retry once if wrong.
Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r7/gen-papers.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## EDIT SPEC

Rebuild the Papers bay clean (the previous pass introduced render
aberrations), in the same chunky flat pixel style as the surroundings (3×3
blocks, three tones per material, near-black outlines). Requirements:

1. The teal kiosk and its shelving span the FULL paste window width: wider
   scalloped cream/teal awning with lowercase "papers" lettering, side
   shelving to both edges, no dead wall strip. Pamphlet rack and wheeled rack
   complete with exact floor contacts.
2. The hologram archivist rises from a HIDDEN FLOOR PROJECTOR inside the
   kiosk: his glowing torso, book and head are visible from the counter line
   (y≈560) upward; his lower body does NOT exist below the counter line and
   there is NO projector pad visible on the counter. Glasses, composed
   posture, physical open book at chest height, hard cyan scanline steps,
   a few bounded square fragments. Hologram center near (800,480).
3. Hologram light bathes the stall interior slightly blue, hard flat steps:
   - interior shelves and books: one blue step over rect (620,380 370×170);
   - awning underside: rect (600,335 400×25);
   - counter top band: rect (600,560 400×25);
   - both flanking beam inner faces, faint: rects (524,400 16×160) and
     (1011,400 16×160).
4. The weak warm shelf strip under the awning stays secondary.
5. Rear plane of the kiosk one step darker than its front.

Only "papers" is readable. No aberrations: lettering, glasses, book and rack
wires stay crisp. Flat steps only, no glow, no gradients.
