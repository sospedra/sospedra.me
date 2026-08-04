# Codex order — r10 — Papers stall extraction, maximum verbosity

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = the Papers bay crop from the approved Floor 1 master,
1536×1024, content roughly x498–1038, y213–810. Image 1 is the ONLY source of
truth for every color and every shape.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-stall-papers.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Reproduce the Papers archive kiosk from Image 1 as one isolated sprite on
flat chroma magenta. This is a COPY task, not a design task: every element
keeps its position, size, silhouette and colors from Image 1. Sample every
color directly from Image 1. Do not invent, move, restyle, recolor or omit
anything. Coordinates below are Image 1 canvas coordinates; keep the same
arrangement, centered, with padding on all sides.

TOP PARTS ARE STALL, NOT WALL — the full awning and its frame are part of
the asset.

Element inventory (all from Image 1):
1. Awning, x≈520–920 y≈215–330: teal and cream striped canopy, sloping
   gently, ending in scalloped cream tabs; across the tabs the lowercase
   letters of "papers" in dark teal, one letter per tab, with small diamond
   marks flanking. Exact stripe rhythm and letter shapes from Image 1.
2. Kiosk frame and interior, x≈555–900 y≈335–585: teal wood posts and
   shelves; top shelf with tied cream paper bundles left and dark blue book
   spines right; middle shelf with more bundles and books; the whole
   interior washed one step blue by the hologram.
3. The hologram archivist, x≈660–820 y≈375–570: cyan-blue translucent
   figure with hard scanline rows — bald head, round glasses, collared
   shirt and tie, composed smile — holding one physical open book (tan
   pages, gold edge) at chest height. He rises from a hidden floor
   projector: NO lower body below the counter line, NO projector pad
   visible. A few bounded square hologram fragments may float beside him.
4. Side pamphlet columns built into the kiosk frame, left x≈555–610 and
   right x≈845–900, y≈340–560: small pinned cards and mini-posters in
   cream, red and blue.
5. Counter, x≈610–920 y≈585–750: teal paneled front with two recessed
   rectangles; on its top: a blue cup with colored pens x≈625–660, a small
   gold service bell x≈665–690, and a flat dark ledger book at the right
   x≈845–905.
6. A-frame rack on small wheels, left, x≈500–660 y≈575–790: dark metal
   frame, three rows of cream newspapers and pamphlets with unreadable
   print marks.
7. Wheeled tower rack, right, x≈865–1010 y≈480–790: four wire tiers packed
   with postcards and booklets in cream, red, blue and purple; center pole
   with a ball finial; caster wheels with exact contacts.
8. The kiosk's warm shelf strip under the awning stays as the secondary
   light; the hologram's cyan receivers on book, hands, counter sill and
   interior stay exactly as Image 1.

Style: exactly Image 1's rendering — chunky flat pixel art on a strict 3×3
logical grid, large single-color fields, at most three tones per material,
strong continuous near-black outlines, sparse hard highlights, zero noise,
zero antialiasing, zero gradients, zero soft glow.

EXCLUDE: the riveted H-beam columns at both edges, the background wall, the
concrete floor, the neighboring bays. The asset floats on chroma with only
its own base contacts and compact contact shadows.

Background: one perfectly flat solid #ff00ff everywhere around the asset. No
shadows, no reflections, no glow spill, no texture. #ff00ff appears nowhere
in the art. Crisp edges, generous padding, nothing touching the canvas
border.

Text: only "papers" across the awning tabs — p a p e r s, six letters, ONE
letter s at the end. Everything else stays unreadable marks.

Self-check before returning: 1) side-by-side with Image 1: every numbered
element present, same relative position, same colors; 2) "papers" spelled
with exactly six letters; 3) hologram has no lower body and no pad;
4) interior washed blue, booth not washed cyan outside; 5) no beam, wall or
floor; 6) flat #ff00ff background, no spill; 7) 1536×1024.
