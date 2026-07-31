# Codex order — r8 — extract the Uses stall from Floor 1

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = the Uses stall crop from the approved-direction Floor 1
master (with beams and surroundings as context).

Steps: call image_gen ONCE to GENERATE (not edit) a NEW image at size
1536×1024 (wide landscape), spec below. Verify the size; retry once if wrong.
Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r8/gen-stall-uses.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Use case: stylized-concept. Asset: one isolated game-asset stall sprite for
chroma keying.

Redo the Uses ramen stall from Image 1 as ONE isolated asset. Keep the EXACT
same layout, structure, silhouette, proportions and poses as Image 1 — the
same striped red/purple/grey canopy, the rough "uses" sign with its small
ラーメン row, the two red japanese lanterns and hanging bulb, the stern
grey-haired chef with folded arms behind the counter, the back-facing seated
customer eating on a stool, the empty stool, the cookware shelves, kettles,
copper pot, jars, the plank-front counter, the crates and bottles at the
left, and the stall's own low platform base with its floor contacts.
Simplified in rendering, NOT in layout.

Rendering: flatter colors — large single-color fields, at most three tones
per material (shadow, body, highlight); strong continuous near-black
outlines around the stall, characters, furniture and props; chunky
16-bit-inspired shading on a strict 3×3 logical pixel grid; sparse hard
highlights; zero texture noise, zero antialiasing, zero gradients, zero soft
glow. Keep the stall's own light identity as flat receivers: warm lantern
receivers on canopy, chef and counter; the small cyan menu screen; steam as
two or three flat pixels.

Isolation: include ONLY the stall and its platform base. EXCLUDE the H-beams,
the background wall, the lobby floor, wayfinding, and anything from
neighboring bays. Nothing may be cut off: the complete silhouette floats on
the background with generous padding on all four sides.

Background: the ENTIRE background is one perfectly flat solid chroma green
#00ff00. No gradients, no shadows, no reflections, no glow spill, no texture
on the background. The color #00ff00 must not appear anywhere in the art
itself. Crisp hard edges between art and chroma.

Text: only "uses" and its small ラーメン row. Nothing else readable.

Self-check: 1) same layout and poses as Image 1; 2) flat chunky three-tone
rendering, strong outlines; 3) no beams, wall or floor included; 4) perfectly
flat #00ff00 background with no spill or shadow; 5) complete silhouette,
generous padding, 1536×1024.
