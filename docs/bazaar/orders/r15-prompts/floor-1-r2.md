# Codex subagent order — Bazaar 3 Floor 1 master (round 2: rendering normalization)

You are an image-generation subagent. Execute exactly this task and nothing else.

The attached images are, in order:

- Image 1: EDIT TARGET — the round-1 Floor 1 master.
- Image 2: geometry guide (matte window, rails, zones).

Steps:

1. Call your built-in image_gen tool ONCE in EDIT mode with Image 1 as the edit
   target, at size 1536×1024 (wide landscape), using the EDIT SPEC below as the
   prompt. Pass the spec faithfully.
2. Verify the output PNG is exactly 1536×1024. If not, retry with the size
   corrected (maximum 2 generation attempts total).
3. Copy the final PNG unmodified to exactly:
   /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/candidates/floor-1-r2.png
4. Print one line: GENERATED=<that absolute path>
5. Do NOT post-process, resize, crop, quantize, sharpen or color-correct the
   image yourself. Do not edit any repository files. Do not run other commands.

## EDIT SPEC

Use case: style-transfer rendering normalization of Image 1. Keep the existing
layout, composition, architecture, stall designs, character identities and
poses, sign shapes and positions, prop placement and light-source positions
EXACTLY as they are in Image 1. This pass changes rendering and two listed
corrections, nothing else.

Rendering normalization: re-render the same scene as strict authored
low-resolution pixel art. Treat the whole image as authored on a 512×341
logical-pixel canvas and enlarged exactly 3× nearest-neighbor: every visible
pixel is one crisp uniform 3×3 square, aligned to one global grid. Flatten
every surface into large connected single-color fields with at most three flat
tones per material (shadow, body, highlight). Merge all texture, grain,
speckle, micro-shading and fabric noise into those flat fields. Strengthen
continuous near-black outlines around every stall, character, structure and
prop. Keep tiny hard highlights only on focal edges (faces, hands, sign
letters, cookware, the hologram, lantern cores). Quiet large surfaces:
concrete, wood, tarp and metal read as flat bands, not textured planes.

Color: use ONLY colors from this 64-color library and aim for fewer than 56
distinct colors in the whole image: #020307 #080c12 #111923 #1c2731 #2b3741
#414c55 #606970 #898e8d #4b4236 #786852 #a38b69 #cfad7e #edd09c #1d100a
#321a0f #4b2816 #6b391c #925022 #bd7133 #361015 #5c171c #882225 #b83932
#dd6048 #171221 #2a1e38 #443153 #674870 #966d94 #071421 #0a2942 #0d486d
#126e9b #1f9cc8 #4bd2e1 #071c1d #0e3534 #165652 #267c73 #56b4a4 #10180e
#1e2d14 #31461a #4b6220 #6b7e2d #95a247 #2e1723 #50283b #784159 #a95f77
#d68b9a #4a280d #7b4514 #ad6a1e #df9e32 #ffd26b #2f1915 #542b22 #80442f
#ad6744 #d18d5a #efbd82 #ffe3a1 #8be9e7.

Matte (mandatory): the output must have a perfectly solid, uniform #020307
border on all four sides exactly as in Image 2 — left and right 144px, top
213px, bottom 214px. No scene content, texture or gradient in the border. The
painted scene occupies only the inner 1248×597 window, edge to edge.

Rails: the four red lines in Image 2 mark edge heights only. In the output
they are crisp architecture value-step boundaries (ceiling edge, wall-to-floor
contact, fascia top edge, underside edge), perfectly horizontal, never drawn
as red or colored lines.

Corrections (the only layout changes allowed):
1. Move the cyan Down arrow blade from its current position beside the stairs
   to the far upper-LEFT edge of the scene, above the Uses stall, mirroring the
   pink Up blade that stays on the stair side.
2. Nothing else moves, appears or disappears.

Lighting stays causal and flat: each source keeps a tiny bright core, one hard
receiver band and one weaker spill band as flat palette steps; compact contact
shadows trend down-right; the lobby stays dark. No glow, bloom, halo, gradient
or noise anywhere.

Text stays exactly: "uses" with its small katakana row, "papers", the pink Up
arrow blade, the cyan Down arrow blade. Nothing else readable.

Avoid: antialiasing, dithering, noise, painterly shading, soft edges, mixed
pixel densities, off-palette colors, any redesign or repositioning beyond the
two listed corrections.
