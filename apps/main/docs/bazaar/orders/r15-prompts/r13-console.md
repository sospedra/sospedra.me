# Codex order — r13 — Console asset: flatten, fix perspective, broken-pipe sign

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = EDIT TARGET, the Console stall asset on flat chroma green
  #00ff00. Composition and nest layout are right; rendering and perspective
  are wrong.
- Image 2 = camera gospel (a countertop): the ONLY allowed angle. Front face
  dominant, thin horizontal top band, zero side faces.
- Image 3 = the angle law diagram: the GREEN construction (front rectangle +
  thin top band, vertical side edges) is the only legal way to draw any flat
  object; the RED crossed-out isometric construction is forbidden.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit target, size
1536×1024. Verify size; retry once if wrong. Copy the result unmodified to
exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-console-r13.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## EDIT SPEC

### PALETTE LAW — the complete color list of the whole image

Every pixel is one of these or the #00ff00 background. Nothing else exists:
#020307 #080c12 #111923 #1c2731 #2b3741 #414c55 #606970 #898e8d
#321a0f #4b2816 #6b391c #925022
#786852 #a38b69 #cfad7e #edd09c
#361015 #5c171c #882225 #b83932 #dd6048
#7b4514 #ad6a1e #df9e32 #ffd26b
#542b22 #80442f #ad6744
#4b6220

FLATTEN EVERYTHING to this list: each material exactly three tones. Rack
faces become plain flat panels (#1c2731 body, #111923 recess, #2b3741 edge)
with sparse LED dots (#df9e32, #b83932, a few #4b6220) — no dense micro
detail, no texture. Cables: #111923 with #2b3741 highlight only. Cardboard:
#786852/#a38b69/#cfad7e. Merge every small noisy cluster into its parent
field.

### PERSPECTIVE — the countertop angle everywhere

Redraw every flat object per Image 2 and the GREEN construction of Image 3:

- THE RUG: currently a deep perspective diamond — forbidden. Redraw it as a
  frontal-oblique BAND: a wide rectangle with horizontal top and bottom
  edges and vertical left and right edges (corners may cut at 45° for 6-8
  pixels only). Its height is about one quarter of its width. Pattern:
  flat border bands #5c171c and #882225 with one row of simple diamond
  motifs #925022 on the #361015 field. Ed sits centered on it; the pizza
  box, power strip, cables, coil and peripherals box keep their placements
  ON it.
- Every box and the peripherals crate: front rectangle + top band one fifth
  of the width, vertical sides, ZERO side faces, exactly the green
  construction.
- The rack tower and monitors: front faces with thin top bands only.

### THE SIGN — bent half-broken pipe, at least twice as tall

Delete the current pole. The board now hangs from a STEEL PIPE:
- The pipe (#414c55 body, #606970 light edge, #2b3741 shadow edge, couplings
  #606970 with #898e8d bolt dots) rises from behind the boxes to AT LEAST
  TWICE the previous sign height — the board's top edge lands between y=25
  and y=45 on the canvas.
- Halfway up, the pipe has a visible 30-degree BEND with a coupling ring at
  the joint. Near the top, the pipe is HALF BROKEN: a jagged snapped end
  (#2b3741 with #020307 crack lines), tilted 20 degrees off vertical.
- The compact board (face #111923, frame #ad6a1e, rivets #df9e32) hangs from
  that broken end by two short chains (#2b3741 links). The word "console"
  stays MONOSPACE lowercase, #df9e32 glyphs with #7b4514 edge, small padding.

### KEEP EXACTLY

Ed (pose, dark skin tones #542b22/#80442f/#ad6744, red hair #882225/#b83932
with #dd6048 top band, visor #111923 with #edd09c top rim line, dull tank
#a38b69/#cfad7e), the nest arrangement, the static monitor (screen static in
#020307/#606970/#edd09c blocks) with its white halo (#898e8d then #606970),
the dead monitor, the stronger shadows beneath, the peripherals box
contents, the cream pizza box with #b83932 stripe and one slice, the power
strip with its three plugged cables and coiled feed, the cable coil.

Background perfectly flat #00ff00, nothing at the canvas border. Text: only
"console". Rendering: strict 3×3 grid, flat fields, #020307 outlines, no
gradients, no glow hazes, no noise.

Self-check: 1) rug is a flat horizontal band, not a diamond; 2) every box
green-construction, zero side faces; 3) pipe bent, half broken, board top at
y 25-45, monospace console; 4) whole image within the palette list; 5) flat
#00ff00 background; 6) 1536×1024.
