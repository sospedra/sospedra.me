# Codex subagent order — Bazaar 3 Floor 2 master (round 4: beam-pair split only)

You are an image-generation subagent. Execute exactly this task and nothing else.

The attached images are, in order:

- Image 1: EDIT TARGET — the round-3 Floor 2 master. Everything in it is approved direction except the beam layout.
- Image 2: geometry guide v2 (beam positions: grey strips; wall gaps: dark-blue slots).

Steps:

1. Call your built-in image_gen tool ONCE in EDIT mode with Image 1 as the edit
   target, at size 1536×1024 (wide landscape), using the EDIT SPEC below.
2. Verify the output PNG is exactly 1536×1024. If not, retry (max 2 attempts).
3. Copy the final PNG unmodified to exactly:
   /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/candidates/floor-2-r4.png
4. Print one line: GENERATED=<that absolute path>
5. No post-processing. No repository edits. No other commands.

## EDIT SPEC

Use case: precise-object-edit. Keep the ENTIRE scene exactly as in Image 1 —
the military-green camera-eyed floating robot, its metallic counter and junk
bins, Ed on his rug with all machinery, wires, boxes, pizza, the tall console
sign pole, the neon VIDEO CLUB recess, clerk, SMPTE CRT, tape cart, standee,
stairs, lobby, lighting, rendering style, matte — except the H-beam
corrections below. Do not move, restyle, add or remove anything else. The
standee stays complete and fully visible.

Beam corrections (match Image 2's grey strips):
1. Replace the single beam column between Manual and Console with TWO identical
   narrower riveted H-beams separated by a strip of plain dark wall: the left
   beam touches Manual's right edge, the right beam touches Console's left
   edge.
2. Replace the single beam column between Console and Talks the same way: left
   beam touches Console's right edge, right beam touches Talks' left edge,
   plain wall between.
3. Keep the existing beam at Manual's left edge and the beam at Talks' right
   edge; keep the plain wall gap between the stair tile and Manual's left beam.
4. Every beam runs ceiling to floor with rivet lines, restrained wear, one
   value step darker than the stalls, and never overlaps stall pixels.

Everything else is immutable: same palette, same flat pixel rendering on the
3×3 grid, same lighting (rear planes darker than fronts; work lamp, task glow,
screens, LEDs, hanging bulb, pendant, CRT, neon sign), same text ("manual",
"console" with no arrow, "VIDEO CLUB", nothing else), no arrows, no drains,
matte perfectly flat #020307.
