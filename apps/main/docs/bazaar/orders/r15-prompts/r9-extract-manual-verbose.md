# Codex order — r9 — Manual stall extraction, maximum verbosity

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = the Manual stall crop from the approved Floor 2 master,
1536×1024, scene content roughly x540–995, y213–810. Image 1 is the ONLY
source of truth for every color and every shape.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r9/gen-stall-manual-verbose.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Reproduce the Manual stall from Image 1 as one isolated sprite on flat
chroma magenta. This is a COPY task, not a design task: every element keeps
its position, size, silhouette and colors from Image 1. Sample every color
directly from Image 1. Do not invent, move, restyle, recolor or omit
anything. Coordinates below are Image 1 canvas coordinates; keep the same
arrangement, centered, with padding on all sides.

TOP PARTS ARE STALL, NOT WALL — include all of them: the ransom-note sign
plates with their hanging chains, and both lamp cords. Do not treat anything
above the robot as background.

Element inventory (all from Image 1):
1. Sign, x≈700–990 y≈213–265: lowercase "manual" spelled across six
   mismatched ransom-note plates (varying cream, rust and steel tones), each
   plate hanging from its own chain; include the plates and chain stubs.
2. The robot, x≈770–950 y≈265–510: elongated ovoid torso in olive
   military-green plating with rust wear, a small orange double-chevron
   stencil on the chest, rivets, a small red hatch. Exactly THREE eye stalks
   whose eyes read as camera lenses (dark objective rings). Exactly THREE
   articulated arms: left arm holds a tan feather duster (x≈720–780), right
   arm holds a silver wrench raised under the task lamp, a third lower open
   C-claw at x≈900–940 y≈440–490. Downward thruster cone at the torso base
   with a tiny blue flame core and a visible hover gap above the counter.
3. Two hanging lamps, both included with their cords: an AMBER dome lamp at
   x≈690–740 y≈300–350 with a warm flat glow step, and a COOL-WHITE task
   lamp at x≈900–960 y≈310–360 angled toward the wrench with a cool flat
   glow step. Their receivers stay split exactly as in Image 1: warm on the
   robot's left torso half, cool on the right shoulder and wrench arm.
4. Rear stall furniture from Image 1: the dark control box at x≈735–790
   y≈470–510 and the small dark schematic board with red dots and unreadable
   marks at x≈950–995 y≈430–500.
5. Counter, x≈665–995 y≈515–545: riveted grey steel slab with a brass front
   edge trim; warm receiver on its left end, cool on its right, as Image 1.
6. Compartment shelving below, x≈670–995 y≈545–745, riveted steel frame with
   four bays: top-left two interlocked brass gears plus a small gear;
   top-right a copper coil and blue and red pipe elbows; bottom-left a red
   valve wheel with small blue fittings; bottom-right an amber canister and
   one LARGE grey salvaged engine/gear module. All complete, all colorful,
   exactly as Image 1.
7. Stall base strip under the shelving, y≈745–775.

Style: exactly Image 1's rendering — chunky flat pixel art on a strict 3×3
logical grid, large single-color fields, at most three tones per material,
strong continuous near-black outlines, sparse hard highlights, zero noise,
zero antialiasing, zero gradients, zero soft glow.

EXCLUDE: the background wall panels, the H-beam and wall gap at the left,
the stairs, the concrete floor, the neighboring bay. The asset floats on
chroma with only its own base strip.

Background: one perfectly flat solid #ff00ff everywhere around the stall. No
shadows, no reflections, no glow spill, no texture. #ff00ff appears nowhere
in the art. Crisp edges, generous padding, nothing touching the canvas
border.

Text: only "manual" across the sign plates, exactly as Image 1. The
schematic board and any labels stay unreadable marks.

Self-check before returning: 1) side-by-side with Image 1: every numbered
element present, same relative position, same colors; 2) exactly three
camera-lens eye stalks and three arms; 3) both lamps present with split
warm/cool receivers; 4) sign spells m-a-n-u-a-l across mismatched plates;
5) no wall, beam or floor; 6) flat #ff00ff background, no spill;
7) 1536×1024.
