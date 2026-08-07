# Codex order — scavenger hover sheet v5 — per-cell palettes, dark to lit

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = the keeper rest sprite: identity, wardrobe, and
SIZE authority: dark green open cape + hood over charcoal and dark
brown technical clothes, bandaged forearms, churchwarden pipe.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536x1024.
Verify size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar-scavenger/jobs/anim6-hover/gen-hover-sheet.png
then print GENERATED=<that path>. No post-processing.

The ENTIRE canvas is flat chroma green #00ff00. SIX cells, each
exactly 460x500: row 1 at x=60..520, x=540..1000, x=1020..1480 with
y=10..510; row 2 same x with y=520..1020. No cell borders.

THE SCALE MATH, exact: seated cells: figure exactly 320 px tall.
Standing cells: figure exactly 426 px tall (legs unfold; the head
NEVER changes size: hood width exactly 110 px at eye level in ALL
cells). Bottom-anchored near each cell's bottom.

THE EYES: cell 1: half-lidded amber slits #f0a63c. Cells 2-6: two
VERTICAL OVAL amber eyes, taller than wide, about 10x16 px. NEVER
crescents, NEVER round dots, NEVER smiling.

LIGHTING LAW: flat lighting in every cell. NO directional light, NO
side light, NO rim light, NO glow. The march from shadow to light
happens ONLY through the palette swap per cell below.

PER-CELL PALETTES, use ONLY the listed colors in that cell (plus
outline #030506, eyes #f0a63c, ember #e07830, pipe #963a23, and from
cell 4 on the clasp):
- CELL 1 and CELL 2, deep shadow: cape #1a2016 / #212819; suit
  #0d0e10 / #111317; brown #241710 / #2c1c13; bandages #38230f /
  #4a2f16; boots #0d0e10.
- CELL 3, one step lighter: cape #212819 / #28301f; suit #111317 /
  #16181d; brown #2c1c13 / #342117; bandages #4a2f16 / #573516;
  boots #0d0e10.
- CELL 4, two steps: cape #28301f / #2f3826; suit #16181d / #1b1e24;
  brown #342117 / #3d271b; bandages #573516 / #684019; boots
  #111317; clasp #8a8f98.
- CELL 5, three steps: cape #2f3826 / #36402c; suit #1b1e24 /
  #21242b; brown #3d271b / #462d1f; bandages #684019 / #785022;
  boots #16181d; clasp #a9a8a5.
- CELL 6, lit at the counter: cape #36402c / #3d4832; suit #21242b /
  #282c34; brown #462d1f / #543626, one thin seam #6b4226; bandages
  #785022 / #885323; boots #1b1e24; clasp #c9c8c5.
Merge strays into the nearest listed value per cell.

THE MOTION:
Cell 1: seated as Image 1 but the pipe hand LOWERS to chest height.
Cell 2: seated, eyes open to vertical ovals, head square, pipe down
at his side.
Cell 3: STANDING, pipe at his side.
Cell 4: first stride forward.
Cell 5: second stride, arriving.
Cell 6: HOLD: leaning slightly forward, near arm reaching forward and
DOWN with an OPEN HAND, PALM UP, fingers spread. THE WHOLE ARM AND
HAND STAY INSIDE THE FIGURE'S SHOULDER SPAN, the hand in front of his
belly, never at a cell edge. Pipe in the other hand at his side.

Every cell: exactly two arms, hood void face, flat pixel chunks, no
gradients, no noise, zero chroma green inside the figure.
