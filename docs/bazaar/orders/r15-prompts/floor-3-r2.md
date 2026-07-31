# Codex subagent order — Bazaar 3 Floor 3 master (round 2: rendering normalization)

You are an image-generation subagent. Execute exactly this task and nothing else.

The attached images are, in order:

- Image 1: EDIT TARGET — the round-1 Floor 3 master.
- Image 2: geometry guide (matte window, rails, zones).
- Image 3: Projects identity reference (robot and creatures; chroma-magenta sheet).
- Image 4: Travel identity reference (Hearthian eyes; chroma-magenta sheet).

Steps:

1. Call your built-in image_gen tool ONCE in EDIT mode with Image 1 as the edit
   target, at size 1536×1024 (wide landscape), using the EDIT SPEC below as the
   prompt. Pass the spec faithfully.
2. Verify the output PNG is exactly 1536×1024. If not, retry with the size
   corrected (maximum 2 generation attempts total).
3. Copy the final PNG unmodified to exactly:
   /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/candidates/floor-3-r2.png
4. Print one line: GENERATED=<that absolute path>
5. Do NOT post-process, resize, crop, quantize, sharpen or color-correct the
   image yourself. Do not edit any repository files. Do not run other commands.

## EDIT SPEC

Use case: style-transfer rendering normalization of Image 1 plus five listed
corrections. Keep the existing layout, composition, architecture, stall
designs, character poses (the sister holding the one handheld with the brother
pointing at it stays exactly), sign shapes and positions, prop placement and
light-source positions EXACTLY as they are in Image 1 except where a listed
correction says otherwise.

Rendering normalization: re-render the same scene as strict authored
low-resolution pixel art. Treat the whole image as authored on a 512×341
logical-pixel canvas and enlarged exactly 3× nearest-neighbor: every visible
pixel is one crisp uniform 3×3 square, aligned to one global grid. Flatten
every surface into large connected single-color fields with at most three flat
tones per material (shadow, body, highlight). Merge all texture, grain,
speckle, micro-shading and foliage noise into chunky flat leaf masses and flat
bands. Strengthen continuous near-black outlines around every stall,
character, structure and prop. Keep tiny hard highlights only on focal edges
(faces, lenses, the handheld, sign letters, tickets, lantern cores). Quiet
large surfaces.

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

Corrections (the only changes allowed):
1. Remove the thin red horizontal lines crossing the scene at ceiling and
   fascia heights. Those heights stay as crisp architecture value-step edges
   (ceiling edge, wall-to-floor contact, fascia top edge, underside edge),
   perfectly horizontal, never colored lines.
2. The gardener robot's plating becomes dark olive-grey (mix #2b3741 #414c55
   with a #31461a tint), never pale silver; keep its exact pose, apron,
   watering can, two lenses (one dimmer), bent antenna and moss.
3. The upper-right shelf creature shows exactly six limbs and three amber eyes
   in a vertical row, moss on its back, curled tail with its muted dusty-rose
   dot, as in Image 3.
4. The lower-left ground creature shows exactly four legs, three dorsal fins
   along its back, two feather antennae and a dim dusty-rose belly.
5. The Travel agent's four amber eyes read clearly as two pairs (two larger
   central, two smaller outer), as in Image 4; blue-grey skin and pointed ears
   stay.
6. Nothing else moves, appears or disappears. There is still NO Down sign.

Lighting stays causal and flat: warm string bulbs, the violet seed lamp, tiny
dusty-rose creature glows, arcade cyan on the children, bright amber Travel
lanterns; each source keeps a tiny bright core, one hard receiver band and one
weaker spill band as flat palette steps; compact contact shadows trend
down-right; water still reaches the drain; the lobby stays dark. No glow,
bloom, halo, gradient or noise anywhere.

Text stays exactly: "projects", "games", "travel", "LAST SEATS", the pink Up
arrow blade. Nothing else readable; route cards and cartridge labels stay
unreadable marks.

Avoid: antialiasing, dithering, noise, painterly shading, soft edges, mixed
pixel densities, off-palette colors, fine plant fronds, chroma-green foliage,
any redesign or repositioning beyond the listed corrections.
