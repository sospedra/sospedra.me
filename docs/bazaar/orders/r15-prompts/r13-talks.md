# Codex order — r13 — Talks / Video Club: tall stall, full richness, flat rendering

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Video Club bay crop from the Floor 2 master: the layout,
  richness and element inventory to reproduce. The stall must feel THIS
  full — the previous attempt was stripped-down and stubby and was rejected.
- Image 2 = the APPROVED Manual stall asset: rendering flatness and outline
  weight to match.
- Image 3 = the angle law diagram: every flat object uses the GREEN
  construction (front rectangle + thin top band, vertical sides); the RED
  isometric construction is forbidden.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-talks-r13.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Rebuild the Video Club as one isolated sprite on flat chroma green #00ff00 —
TALL: the stall is a high storefront, its art spanning from about y=110 to
about y=880 on the canvas, clearly taller than it is wide. Same element
inventory as Image 1, rendered as flat as Image 2.

PALETTE LAW — every pixel is one of these or the background:
#020307 #111923 #1c2731 #2b3741 #414c55 #606970
#321a0f #4b2816 #6b391c
#4b4236 #786852 #a38b69 #cfad7e #edd09c
#5c171c #882225 #b83932 #dd6048
#7b4514 #ad6a1e #df9e32
#0e3534 #165652 #267c73
#071421 #0a2942 #0d486d #126e9b #1f9cc8 #4bd2e1 #8be9e7
#443153 #a95f77

1. NEON SIGN on top, complete: dark board #111923 with hanger tabs #2b3741;
   rounded-rect tube frame: 3px #1f9cc8 with 1px #8be9e7 core; "VIDEO CLUB"
   tall capitals #8be9e7 with #1f9cc8 edge. It casts a flat #126e9b band,
   4px, downward onto the fascia below it.
2. TALL SHELVING FLANKS, the height-makers: two full-height tape shelf
   towers, one per side, frames #165652 with #0e3534 shadow and #267c73
   light edge, each tower five shelf rows tall, every row packed with tape
   spines — flat 4×14 blocks in #0d486d #126e9b #443153 #882225 #b83932
   #ad6a1e #cfad7e #267c73 with #020307 outlines, no lettering.
3. RECESS between the towers: back wall #1c2731 panels with #111923 joints.
   On it: left poster (frame #321a0f, field #071421, ringed planet #df9e32
   ring #cfad7e, star dots #edd09c), right poster (frame #321a0f, field
   #5c171c, figure silhouette #111923 with #dd6048 rim), center chart
   (frame #4b2816, field #a38b69, tape-row dashes #321a0f).
4. PENDANT LAMP centered above the clerk: dome #ad6a1e, shadow #7b4514, rim
   #df9e32, stem #414c55; beneath it two flat warm steps on the shelf top:
   #df9e32 then #ad6a1e.
5. THE CLERK, center, behind the counter: Congolese woman, DARK skin in
   exactly these three tones: #321a0f shadow, #4b2816 body, #6b391c light;
   braided hair #111923 with #321a0f row lines; gold hoops #df9e32; teal
   shirt #165652 with #0e3534 shadow; yellow vest #df9e32 with #ad6a1e
   shadow and name tag #b83932. Cheek on her right hand, elbow on the
   counter, deadpan, simple clean face: two eye groups, one flat mouth
   line.
6. CRT TELEVISION, the only counter object, left end, angled slightly
   toward the image center: casing #786852 with #4b4236 shadow and #a38b69
   light; SMPTE bars in seven columns: #edd09c #df9e32 #4bd2e1 #4b6220-
   substitute #267c73 #a95f77 #b83932 #0d486d; a 2px #4bd2e1 edge on the
   counter in front of the screen.
7. COUNTER, GREEN construction per Image 3: top band #cfad7e with #a38b69
   shadow edge and #edd09c lip, height one fifth of the front; front of
   vertical panels #cfad7e framed #165652 with two #df9e32 trim lines.
8. RED WHEELED BIN, front left, green construction: box #882225 with
   #5c171c shadow and #b83932 light; label #a38b69 with #4b4236 dashes;
   caster wheels #1c2731 rims #414c55; tapes inside as flat blocks #0d486d
   #443153 #ad6a1e #b83932.
9. Every object: front face + thin top band + vertical sides, ZERO side
   faces, exactly the green construction of Image 3. Contact shadows: 2px
   #020307 rows under bin wheels and counter base.

Rendering: strict 3×3 grid, flat single-color fields, three tones per
material, continuous #020307 outlines, no gradients, no glow hazes, no
antialiasing, no noise, clean simple faces and glyphs.

EXCLUDE: H-beams, wall beyond the stall, concrete floor, neighbors.
Background: perfectly flat #00ff00, generous padding, nothing at the border.

Text: only "VIDEO CLUB". All else unreadable dashes.

Self-check: 1) stall clearly TALLER than wide, y span ≈110-880; 2) five-row
tape towers both sides, packed; 3) complete neon with downward band;
4) dark-skinned clerk, cheek on hand, clean face; 5) SMPTE TV alone on the
counter, angled center; 6) every object green-construction, no side faces;
7) only palette colors; 8) flat as Image 2; 9) flat #00ff00 background;
10) 1536×1024.
