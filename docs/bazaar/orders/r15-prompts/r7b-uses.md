# Codex order — r7 strategy B — Floor 1 Uses bay crop (v2 canvas)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = EDIT TARGET, a 1536×1024 padded crop from the Floor 1
master. The black border is matte: keep it perfectly flat. Only the content
inside the paste window x445–1105, y213–810 will be kept; everything outside
it will be DISCARDED at paste time — do not spend effort preserving it, only
keep the seam edges (wall values, beam edges, floor lines) consistent where
they meet the window.

Steps: call image_gen ONCE in EDIT mode, size 1536×1024 (wide landscape),
spec below. Verify the output is exactly 1536×1024; retry once if wrong.
Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r7/gen-uses.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## EDIT SPEC

Keep the Uses ramen stall exactly as it is — chef, folded arms, canopy,
sign, stools, eating customer, crates, cookware — in the same chunky flat
pixel style (3×3 blocks, three tones per material, near-black outlines).
Apply ONLY:

1. Katakana: the small worn row under "uses" reads exactly ラーメン.
2. Do NOT add any bowl or new prop on the counter.
3. Lantern light, exact geometry. The two red japanese lanterns are the
   primary sources (left lantern centered near (498,330), right near
   (933,330)). Paint hard flat one-step warm receivers on:
   - canopy underside bands at rect (463,380 240×25) and (743,380 220×25);
   - the chef's near side at rect (673,410 90×90);
   - counter top ends at rects (453,555 200×25) and (773,555 190×25);
   - the left beam inner face at rect (429,300 16×120), faint.
   Each lantern keeps a tiny bright core and one compact contact shadow.
4. The hanging bulb near (623,270) becomes decorative: tiny core, NO pool.
5. Rear plane of the stall stays one step darker than the front.

Flat palette steps only. No glow, no gradients, no new colors, no text
changes beyond the katakana, no aberrations: faces, hands and sign glyphs
stay crisp.
