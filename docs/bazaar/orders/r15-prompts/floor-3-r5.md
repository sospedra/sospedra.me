# Codex subagent order — Bazaar 3 Floor 3 master (round 5: style repair + corrections)

You are an image-generation subagent. Execute exactly this task and nothing else.

The attached images are, in order:

- Image 1: EDIT TARGET — the round-3 Floor 3 master.
- Image 2: STYLE AND STAIR CANON — the round-4 Floor 1 master. Its chunky flat rendering and its spiral stair are the standard this floor must match.
- Image 3: geometry guide v2 (bay boundaries and stall footprints).
- Image 4: Travel agent proportion reference (Hearthian on chroma-magenta sheet).

Steps:

1. Call your built-in image_gen tool ONCE in EDIT mode with Image 1 as the edit
   target, at size 1536×1024 (wide landscape), using the EDIT SPEC below.
2. Verify the output PNG is exactly 1536×1024. If not, retry (max 2 attempts).
3. Copy the final PNG unmodified to exactly:
   /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/candidates/floor-3-r5.png
4. Print one line: GENERATED=<that absolute path>
5. No post-processing. No repository edits. No other commands.

## EDIT SPEC

THE SINGLE MOST IMPORTANT RULE: one consistent rendering style across the whole
floor, identical to Image 2 — chunky flat pixel art, large single-color
fields, at most three tones per material, strong near-black outlines, no dense
microdetail or noise. Every correction below must land in exactly that style.

Keep the overall composition, camera, beam pairs, signs (w98, games, travel,
LAST SEATS) and identities of Image 1. Apply these corrections:

1. w98 bay style repair (the bay currently breaks the floor's style):
   re-render the ENTIRE w98 bay in the Image 2 style — big flat overlapping
   leaf masses instead of noisy foliage, fewer and bigger terracotta pots,
   large readable shelf boards, flat soil bags. Keep the rope-hung askew w98
   sign, string bulbs, violet grow lamp, creatures and the robot's pose.
2. w98 robot color: worn industrial YELLOW-OCHRE plating — faded
   construction-yellow with rust wear at the edges — replacing the current
   red. Keep the exact design: compact rectangular head, two round lenses (one
   dimmer), bent antenna, segmented torso with pistons and cables, oversized
   three-finger grippers, apron only, gentle stoop, watering can over the
   seedling, partially occluded by shelves and plants.
3. Lower-left creature anatomy: exactly FOUR visible legs, THREE dorsal fins
   along its back, two feather antennae, asymmetric eyes, dim dusty-rose
   belly. Same position inside the stall footprint, same size.
4. Games camera: hide the platform's top plane completely — only its front
   edge board shows, with a thin lit seam and a dark shadow band beneath it.
   The children's feet sit on that edge line. No floor plane spreading toward
   the viewer anywhere in the bay.
5. Games sign lights: wrap the games sign in a multicolor christmas string
   light (small red, green, amber and cyan bulbs), with matching small flat
   glow receivers on the sign board and tiny colored dots of light on the
   wood right below. Remove or repurpose the current plain bulb string into
   this christmas string.
6. Games children lighting: the siblings stay BRIGHT but causally lit — cool
   handheld glow on both faces and chests, warm multicolor spill from the
   sign lights above on their hair and shoulders, compact contact shadows
   under their shoes. They must read integrated, not pasted.
7. Travel agent proportions: correct the Hearthian to Image 4's adult
   proportions — head noticeably smaller relative to broad shoulders, torso
   visible down to mid-chest above the counter, longer arms, larger gloved
   hands. Keep: blue-grey skin, four amber eyes in two clear pairs, long
   pointed side ears, compact mouth, red scarf, tan flight jacket, one hand on
   the counter, one raising the ticket. Keep the radar as the only counter
   object with its green sweep glow.
8. Stairs: re-render the left stair tile to match Image 2's stair exactly,
   mirrored — same drum design, tread contrast, aperture and landing, clean
   and readable, nothing muddy.

Everything else is immutable: beam pairs, w98/games/travel/LAST SEATS text
(no arrows, no other text), Tekken-style low-poly arcade intro screen, deep
high-contrast Travel booth with dark rear wall and bright front, suit and
helmet, lanterns, luggage and queue posts inside the footprint, rear planes
darker than fronts, no drains or water, flat #020307 matte.
