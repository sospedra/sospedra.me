# Codex order — r9 — Uses stall extraction, maximum verbosity

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = the Uses stall crop from the approved Floor 1 master,
1536×1024, scene content roughly x389–1147, y213–810 in this canvas. Image 1
is the ONLY source of truth for every color and every shape.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r9/gen-stall-uses-verbose.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Reproduce the Uses ramen stall from Image 1 as one isolated sprite on flat
chroma green. This is a COPY task, not a design task: every element keeps its
position, size, silhouette and colors from Image 1. Sample every color
directly from Image 1. Do not invent, move, restyle, recolor or omit
anything. Positions below are Image 1 canvas coordinates; keep the same
arrangement in your output, centered, with padding on all sides.

Element inventory (all from Image 1):
1. Canopy, x≈390–940 y≈215–280: top band with red sections at both ends and
   one wide purple section left of center; below it a red-and-cream striped
   valance with scalloped fringe, visible left and right of the sign. Exact
   stripe widths and colors from Image 1.
2. Sign, x≈610–820 y≈265–310: dark wood plank hung by two ropes, cream
   lowercase "uses", smaller amber ラーメン row beneath. Same lettering
   shapes.
3. Two red-orange paper lanterns with dark square emblem marks: left at
   x≈395–450 y≈300–390, right at x≈890–940 y≈300–390, each with dark cap and
   tail, warm core and glow step from Image 1.
4. Hanging bulb on a short cord at x≈520 y≈285, small warm core, no pool.
5. Cyan vertical menu screen at x≈480–505 y≈405–470 with tiny unreadable
   glyph marks, mounted near the left post; small utility boxes on the post.
6. Back shelving x≈470–930 y≈370–530, two rows of dark wood shelves packed
   with steel kettles, canisters, stacked tins, pots; a large copper pot on
   the counter left at x≈540–610 y≈480–535 with a small flat steam wisp; an
   amber lidded jar at x≈835–875; a utensil pot with chopsticks at
   x≈895–930.
7. The chef, x≈630–710 y≈355–535: older man, grey hair lighter on top, stern
   face, arms folded, indigo-navy work top with rolled sleeves, dark apron.
   Exact pose and colors from Image 1.
8. The customer, x≈655–800 y≈480–740: black hair, seen from behind, PURPLE
   hoodie with a PINK CAT face motif on the back and small pink trim marks
   on the shoulders, dark pants, pink shoes resting on the stool rung,
   seated on a stool with a GREEN cushion top, right arm raised with
   chopsticks toward a small bowl with a steam wisp on the counter at
   x≈655–680 y≈535–555.
9. Counter x≈430–930 y≈530–700: warm lit wood top strip, vertical plank
   front, one grey metal patch plate at x≈855–895 y≈595–690, bolt heads.
10. Empty stool x≈480–555 y≈595–740 with RED cushion top, wooden legs and
    rungs, exact contacts.
11. Left stack x≈390–470 y≈520–720: three green bottles standing on a red
    bottle crate, a blue crate below, a tan crate behind. Complete, nothing
    cropped.
12. Platform slab under the whole stall x≈400–930 y≈735–775 with its front
    edge board. The stall stands on this platform; include it.

Lighting stays as in Image 1: warm lantern receivers on the canopy
underside, chef and counter top; the cyan screen glow; all as hard flat
steps.

EXCLUDE (not part of the asset): the vertical riveted H-beam and its utility
boxes at the left (the dark column crossing the canopy edge), the background
wall, the ceiling band and its pipes, the lobby floor and fascia, everything
right of the stall (the neighboring kiosk sliver and its racks).

Style: exactly Image 1's rendering — chunky flat pixel art on a strict 3×3
logical grid, large single-color fields, at most three tones per material,
strong continuous near-black outlines, sparse hard highlights, zero noise,
zero antialiasing, zero gradients, zero soft glow.

Background: one perfectly flat solid #00ff00 everywhere around the stall. No
shadows, no reflections, no glow spill, no texture on the background. #00ff00
appears nowhere in the art. Crisp edges, generous padding, nothing touching
the canvas border.

Text: only "uses" and its ラーメン row, exactly as in Image 1. Nothing else
readable.

Self-check before returning: 1) side-by-side with Image 1, every numbered
element present at the same relative position with the same colors; 2) the
purple hoodie has its pink cat; 3) canopy stripe order matches; 4) no beam,
wall, floor or neighbor content; 5) flat #00ff00 background, no spill;
6) 1536×1024.
