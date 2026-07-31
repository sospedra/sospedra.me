# Codex order — r10 — w98 stall extraction, maximum verbosity

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = the w98 bay crop from the approved Floor 3 master,
1536×1024, content roughly x548–988, y213–810. Image 1 is the ONLY source of
truth for every color and every shape.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-stall-w98.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Reproduce the w98 garden stall from Image 1 as one isolated sprite on flat
chroma magenta. This is a COPY task, not a design task: every element keeps
its position, size, silhouette and colors from Image 1. Sample every color
directly from Image 1. Coordinates below are Image 1 canvas coordinates;
keep the same arrangement, centered, with padding on all sides.

TOP PARTS ARE STALL, NOT WALL — the bulb string, its wire, the sign and its
ropes, and the lamp cord are all part of the asset. And one repair: in Image
1 the outer foliage is cropped where the bay met its beams; in your output
every plant mass ends in a complete ragged organic silhouette — no straight
vertical cut edges anywhere.

Element inventory (all from Image 1):
1. String of warm bulbs, y≈230–290: about nine amber bulbs on a wire sagging
   between the two rusty posts, each bulb a small warm core with a flat glow
   dot; the wire's ends anchor to the post tops.
2. Sign, x≈600–760 y≈280–350: chipped dark wood plank hung by two ropes from
   the left post arm, tilted slightly askew, reading lowercase "w98" in
   cream pixel letters.
3. Purple grow lamp, x≈640–700 y≈350–390: dark dome lamp on a cord from the
   left post, with a violet core and hard flat violet light steps on the
   plants below it.
4. Left shelf wing, x≈590–740 y≈390–750: dark warped-wood shelving, four
   tiers; the top two tiers hold violet-lit purple leaf plants in terracotta
   pots; the lower tiers hold green seedlings in pots. Terracotta uses its
   three tones from Image 1.
5. The gardener robot, x≈740–870 y≈330–690: worn industrial YELLOW-OCHRE
   plating with rust wear; compact boxy head with two round amber lenses and
   a bent antenna; segmented neck; cream gardener apron over the torso;
   articulated arms — the right hand tips a grey watering can, pouring over
   the center pot; exposed piston legs with visible joints. Exact pose and
   colors from Image 1.
6. Right shelf wing, x≈850–950 y≈380–620: rough post and shelves with viney
   green plants, terracotta pots, vines hanging from the post top; a dark
   planter box; garden tools (dark trowel and fork) hanging on the post at
   x≈890–930 y≈560–620.
7. Upper-right creature, x≈850–940 y≈330–400: the six-limbed velvet-indigo
   creature dozing on its small shelf platform — purple body, six visible
   limbs, three amber eyes in a vertical row, moss patch, curled tail with a
   dusty-rose tip.
8. Lower-left creature, x≈610–710 y≈590–690: the round purple creature among
   the pots — two feather antennae with pink tips, asymmetric amber-rose
   eyes, small legs, dusty-rose belly patch.
9. Ground cluster along the bottom, y≈580–750: the big potted seedling at
   x≈800–870, a tipped terracotta pot spilling dark soil at x≈860–930, a row
   of small pots and seedlings, a grey wooden bucket at x≈750–810, and a
   barrel piece at the far right. All complete, with compact contact
   shadows.

Style: exactly Image 1's rendering — chunky flat pixel art on a strict 3×3
logical grid, large single-color fields, at most three tones per material,
strong continuous near-black outlines, chunky overlapping leaf masses (no
fine fronds), sparse hard highlights, zero noise, zero antialiasing, zero
gradients, zero soft glow.

EXCLUDE: the riveted H-beam columns at both edges, the dark bay wall, the
concrete lobby floor, the neighboring bays. The asset floats on chroma with
only its own ground contacts.

Background: one perfectly flat solid #ff00ff everywhere around the asset. No
shadows, no reflections, no glow spill, no texture. #ff00ff appears nowhere
in the art. Crisp edges, generous padding, nothing touching the canvas
border.

Text: only "w98" on the sign. Nothing else readable.

Self-check before returning: 1) side-by-side with Image 1: every numbered
element present, same relative position, same colors; 2) sign reads exactly
w98; 3) robot is yellow-ochre with two lenses, apron, watering can pose;
4) both creatures present with correct anatomy; 5) foliage silhouettes end
ragged and complete, no straight cut edges; 6) no beam, wall or floor;
7) flat #ff00ff background, no spill; 8) 1536×1024.
