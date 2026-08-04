# Codex order — r7 strategy B — Floor 2 Console bay crop (v2 canvas)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = EDIT TARGET, a 1536×1024 padded crop from the Floor 2 master.
  Black border = matte, keep it flat. Only the content inside the paste
  window x603–933, y213–810 will be kept; everything outside it will be
  DISCARDED at paste time — do not spend effort preserving it, only keep the
  seam edges consistent where they meet the window.
- Image 2 = Ed identity and proportion reference (chroma-green sheet).

Steps: call image_gen ONCE in EDIT mode, size 1536×1024 (wide landscape),
spec below. Verify the output is exactly 1536×1024; retry once if wrong.
Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r7/gen-console.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## EDIT SPEC

Rebuild the Console bay completely (position, proportions and lighting were
wrong; earlier passes introduced aberrations), in the same chunky flat pixel
style as the surroundings (3×3 blocks, three tones per material, near-black
outlines). Requirements:

1. Ed placement, exact geometry: Ed sits cross-legged, hands resting near his
   ankles, entirely inside the silhouette box x720–820, y590–720. His head
   top sits at y≈595. His ornate red-brown rug fits inside x680–860,
   y700–745. NOTHING (rug fringe, cables, boxes, pizza) crosses y745 toward
   the lobby. He is clearly deeper inside the bay than before.
2. Ed proportions, from Image 2: slim adult seated low; head about one third
   of his seated height; wild red hair; dark visor covering the eyes; white
   tank top; dark shorts; barefoot. NO laptop.
3. NO lamp and NO hanging bulb anywhere in this bay. Remove the current bulb.
4. The only lights: small warm rack LEDs, plus ONE monitor in the upper rack
   stack (screen centered near (800,275)) showing WHITE STATIC NOISE. Its
   white light faintly tints, as hard flat steps:
   - the upper rack tops band: rect (740,300 190×30);
   - the stall rear wall upper band: rect (740,245 190×40);
   - the top of Ed's hair: rect (835,560 45×18).
5. Dense purposeful machinery fills both sides: stacked vintage racks and
   servers, a second dead monitor, cardboard boxes (one holding rocks), thick
   coiled cable spaghetti passing behind Ed and returning in front, a power
   strip, pizza box and energy can — all inside the bay footprint.
6. The very tall thin pole with the small lowercase "console" sign at its top
   stays (no arrow on it).
7. The bay remains the darkest on the floor; Ed's rear plane darker than his
   front; compact contact shadow under him.

Only "console" is readable. No aberrations: hair, visor, fingers, sign
glyphs crisp. Flat steps only, no glow, no gradients.
