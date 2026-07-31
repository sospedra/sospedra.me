# Codex subagent order — Bazaar 3 Floor 1 master (round 4: beam-pair split only)

You are an image-generation subagent. Execute exactly this task and nothing else.

The attached images are, in order:

- Image 1: EDIT TARGET — the round-3 Floor 1 master. Everything in it is approved direction except the beam layout.
- Image 2: geometry guide v2 (beam positions: grey strips; wall gaps: dark-blue slots).

Steps:

1. Call your built-in image_gen tool ONCE in EDIT mode with Image 1 as the edit
   target, at size 1536×1024 (wide landscape), using the EDIT SPEC below.
2. Verify the output PNG is exactly 1536×1024. If not, retry (max 2 attempts).
3. Copy the final PNG unmodified to exactly:
   /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/candidates/floor-1-r4.png
4. Print one line: GENERATED=<that absolute path>
5. No post-processing. No repository edits. No other commands.

## EDIT SPEC

Use case: precise-object-edit. Keep the ENTIRE scene exactly as in Image 1 —
stalls, chef, eating customer, archivist, hologram, signs, lanterns, stools,
racks, stairs, lobby, lighting, rendering style, matte — except the H-beam
corrections below. Do not move, restyle, add or remove anything else.

Beam corrections (match Image 2's grey strips):
1. Add one riveted steel H-beam tight against the LEFT edge of the Uses stall
   (between the wall utilities and the stall), running ceiling to floor, same
   design as the existing beams.
2. Replace the single wide beam column between Uses and Papers with TWO
   identical narrower riveted H-beams separated by a strip of plain dark wall,
   as in Image 2: the left beam touches Uses' right edge, the right beam
   touches Papers' left edge, plain wall between them.
3. The existing beam right of Papers stays as Papers' right beam; keep the
   plain wall gap between it and the stair tile.
4. Every beam runs ceiling to floor with rivet lines, restrained wear, one
   value step darker than the stalls, and never overlaps stall pixels.

Everything else is immutable: same palette, same flat pixel rendering on the
3×3 grid, same lighting (rear planes darker than fronts; lanterns, bulb, ember
glow, hologram, shelf strip), same text ("uses" with katakana, "papers",
nothing else), no arrows, no drains, matte perfectly flat #020307.
