# Codex order — r10 — Talks / Video Club stall extraction, maximum verbosity

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = the Video Club bay crop from the approved Floor 2 master,
1536×1024, content roughly x583–953, y213–810. Image 1 is the ONLY source of
truth for every color and every shape.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-stall-talks.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Reproduce the Video Club stall from Image 1 as one isolated sprite on flat
chroma green. This is a COPY task, not a design task: every element keeps its
position, size, silhouette and colors from Image 1. Sample every color
directly from Image 1. Coordinates below are Image 1 canvas coordinates;
keep the same arrangement, centered, with padding on all sides.

TOP PARTS ARE STALL, NOT WALL — and one repair: Image 1 clips the very top of
the neon sign at the canvas edge. In your output the sign is COMPLETE: the
full rounded-rectangle neon tube frame with its hanger tabs, nothing cut.

Element inventory (all from Image 1):
1. Neon sign, complete: rounded-rect cyan neon tube outline framing the
   glowing words "VIDEO CLUB" in tall neon capitals, cyan-white core with a
   cyan step, on a dark backing board with two hanger tabs. It casts one
   hard flat cyan band DOWNWARD onto the shelf tops directly below it —
   flat steps, no soft glow.
2. Rear wall, x≈620–950 y≈250–360: dark blue-grey panels carrying two framed
   posters — left a gold-on-navy ringed-planet poster x≈678–735 y≈255–335,
   right a dark poster with a standing figure silhouette and red accents
   x≈832–888 y≈255–335 — and between them a small framed tape chart
   x≈740–815 y≈265–325.
3. Warm pendant lamp: brass dome on a short stem, centered x≈775–805
   y≈235–280, with a warm flat glow step below it.
4. VHS shelving: packed multicolor tape spines (navy, purple, orange, red,
   cream) in teal-framed shelf columns on both flanks, left x≈620–685 and
   right x≈878–950, y≈340–520, plus a low tape row running behind the clerk.
5. The clerk, x≈735–870 y≈350–520: a Congolese woman with DARK skin, braids
   pulled back, gold hoop earrings, teal shirt under a yellow vest with a
   small red name tag. She leans on the counter, cheek resting on her right
   hand, elbow planted, deadpan bored expression, gaze drifting left. Keep
   her exact skin tone from Image 1.
6. CRT television on the counter's left end, x≈620–725 y≈465–555: grey-beige
   rounded casing, angled slightly toward the viewer's left (toward the
   image center), screen showing vertical SMPTE color bars — white, yellow,
   cyan, green, magenta, red, blue columns. The TV is the ONLY object on the
   counter.
7. Counter, x≈615–950 y≈520–720: pale cream plastic top slab; front of
   vertical cream plastic panels framed in teal with thin gold trim lines.
8. Red wheeled tape bin, front left, x≈610–780 y≈600–805: worn red metal
   cart on four casters, a tan label patch with unreadable stencil dashes on
   its face, overflowing with tapes in navy, purple and orange.
9. Exact floor contacts: bin casters and counter base with compact contact
   shadows.

Style: exactly Image 1's rendering — chunky flat pixel art on a strict 3×3
logical grid, large single-color fields, at most three tones per material,
strong continuous near-black outlines, sparse hard highlights, zero noise,
zero antialiasing, zero gradients, zero soft glow.

EXCLUDE: the H-beam columns at both edges, the background wall around the
recess, the concrete floor, the neighboring bays. The asset floats on chroma
with only its own base contacts.

Background: one perfectly flat solid #00ff00 everywhere around the asset. No
shadows, no reflections, no glow spill, no texture. #00ff00 appears nowhere
in the art. Crisp edges, generous padding, nothing touching the canvas
border.

Text: only "VIDEO CLUB" in the neon sign. Poster titles, tape spines and the
bin label stay unreadable marks.

Self-check before returning: 1) side-by-side with Image 1: every numbered
element present, same relative position, same colors; 2) the neon sign is
complete and uncut with its downward cyan band; 3) the clerk's skin is dark,
cheek on hand, deadpan; 4) SMPTE bars on the TV, and the TV is the only
counter object; 5) no beam, wall or floor; 6) flat #00ff00 background, no
spill; 7) 1536×1024.
