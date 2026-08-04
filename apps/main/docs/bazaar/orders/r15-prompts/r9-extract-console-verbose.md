# Codex order — r9 — Console stall extraction, maximum verbosity

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Console bay crop from the Floor 2 master, 1536×1024. Scene
  content sits at x523–1013, y187–837. This is the source of truth for every
  color, every object and every character detail.
- Image 2 = Ed proportion reference (chroma sheet). Use it for anatomy and
  proportions only.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r9/gen-stall-console-verbose.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Build the Console stall from Image 1 as one isolated sprite on flat chroma
green. Keep every object's design, color and material from Image 1. The ONE
thing that changes is the ARRANGEMENT: the clutter must be recomposed into a
tight nest around the character, per the layout rules below. Sample every
color directly from Image 1. All coordinates are Image 1 canvas coordinates.

### The nest rule (the most important instruction)

In Image 1 the machinery sits in two separated piles with dead space around
the character. That is wrong. Rebuild it as ONE DENSE NEST enclosing him:

- The rack tower and stacked monitors form the nest's REAR WALL, directly
  behind his back and shoulders, close enough to touch, not parked to one
  side.
- Machinery, boxes and cable coils WRAP AROUND both sides of him, curving
  forward toward the viewer like a horseshoe, so he sits inside a cocoon of
  equipment.
- No dead gap anywhere between the character and his junk: every object is
  within arm's reach of him.
- The finished asset is ONE compact connected silhouette, roughly x600–960,
  y200–830, never three separate islands. Nothing extends left of x600 or
  right of x965.

### Element inventory (from Image 1; keep design, apply the nest rule)

1. The character, seated cross-legged, x693–833 y469–692, head x715–803
   y469–537: wild spiky RED hair, dark VR visor covering the eyes, small
   calm grin, white tank top, dark shorts, barefoot, hands resting near the
   ankles. Slim adult proportions per Image 2, head about one third of
   seated height. NO laptop. He stays exactly at this position and size.
2. The ornate red-brown patterned rug beneath him: tighten it to x630–930,
   y655–800 with its fringed edges. He sits centered on it.
3. Rack tower, currently x668–773 y332–622: move it directly BEHIND his
   back, spanning about x655–800, y300–640, stacked server modules with
   small warm LED dots and vent slots.
4. One CRT monitor at the top of that tower showing WHITE STATIC NOISE,
   about x665–740 y247–317. This is the stall's ONLY light source.
5. A second DEAD monitor beside it, dark screen with a black burn hole,
   about x740–800 y264–319.
6. Right-hand rack column with red/amber LED rows, currently x800–868
   y274–497: bring it in to about x805–880, y280–520, angled to close the
   nest's right side.
7. Cardboard box stack, currently x868–948 y357–477: restack to about
   x860–935, y330–500, leaning in toward him.
8. The open box of dark rocks, currently x840–925 y544–622: place it on the
   rug's right edge, about x845–925, y545–625, unreadable stencil dashes on
   its side, NO readable letters.
9. Pizza box with an open lid, currently x595–700 y679–769: MOVE IT ONTO THE
   RUG at his left, about x640–730, y690–775.
10. Power strip with plugs, currently x553–643 y777–832: MOVE IT ONTO THE RUG
    at the lower left, about x635–705, y765–805, with a short cable.
11. Coiled cable bundles: one at about x880–950, y620–690 on the rug's right,
    plus thick cables running behind him and returning in front, crossing the
    rug edge. Keep the cable spaghetti dense inside the nest envelope.
12. The tall thin sign pole with the small "console" board, currently
    x805–903 y202–259: include the COMPLETE pole and board, board around
    x800–900 y200–260, pole descending behind the nest to the floor. The
    board is plain wood with lowercase "console" and NO arrow glyph.

### Lighting

This stall has NO lamp and NO hanging bulb — do not add one, and do not draw
any dangling cord where one used to be. The character sits DARK: render him
one to two value steps darker than a lit character, his visor black, his
skin and tank top muted. The only illumination:

- the white-static monitor casting a faint flat white step on the rack tops
  around it and on the TOP OF HIS HAIR only;
- tiny warm LED dots on the racks;
- a compact dark contact shadow under him and under each object on the rug.

Hard flat steps only. No glow, no bloom, no gradients.

### Style

Exactly Image 1's rendering: chunky flat pixel art on a strict 3×3 logical
grid, large single-color fields, at most three tones per material, strong
continuous near-black outlines, sparse hard highlights, zero noise, zero
antialiasing, zero gradients.

### Isolation

EXCLUDE: the riveted steel wall panels and their rivets, the H-beam columns
on both sides, the concrete lobby floor, the neighboring bays. The asset's
bottom silhouette is the rug, the box bases and the pole foot with their
contact shadows. Nothing touches the canvas border.

### Background

One perfectly flat solid #00ff00 everywhere around the asset. No shadows, no
reflections, no glow spill, no texture. #00ff00 appears nowhere in the art.
Crisp hard edges, generous padding.

### Text

Only "console" on the sign board. Every other label, box stencil and screen
is unreadable marks. No arrows.

### Self-check before returning

1) One connected nest silhouette within x600–965, nothing outside it;
2) rack tower directly behind his back, machinery wrapping both sides, no
dead gap; 3) pizza box and power strip ON the rug, not beside it; 4) he is
dark, only static-monitor white on his hair top and LED dots; 5) no lamp, no
bulb, no dangling cord; 6) red hair, visor, tank top, barefoot, no laptop;
7) complete sign pole with "console", no arrow; 8) no wall, no beam, no
floor; 9) flat #00ff00 background, no spill; 10) 1536×1024.
