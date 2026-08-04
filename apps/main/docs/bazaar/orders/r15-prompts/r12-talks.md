# Codex order — r12 — Talks / Video Club, clean regeneration, exact palette

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Video Club bay crop from the Floor 2 master. Source of truth
  for layout and shapes.
- Image 2 = the APPROVED Manual stall asset. Its rendering density, outline
  weight and flatness are the exact standard to match.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-talks-r12.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Rebuild the Video Club from Image 1 as one isolated sprite on flat chroma
green #00ff00. Same layout and silhouette as Image 1, rendered exactly as
flat and chunky as Image 2. The previous attempt carried melted-detail
artifacts; here every shape is simple, blocky and clean.

PALETTE LAW: every pixel of the art uses ONLY hexes named below.

1. Neon sign, COMPLETE and uncut at the top: dark backing board #111923 with
   outline #020307 and two hanger tabs #2b3741; a rounded-rectangle neon
   tube frame drawn as a 3-pixel #1f9cc8 line with a 1-pixel #8be9e7 core
   line inside it; the words "VIDEO CLUB" in tall blocky capitals, letter
   strokes #8be9e7 with a #1f9cc8 edge step. The sign casts ONE flat
   downward band onto the shelf tops below: #126e9b, 4 pixels tall, hard
   edges.
2. Rear wall: panels #1c2731 with #111923 joints. On it: left poster —
   frame #321a0f, field #071421, ringed planet #df9e32 with ring #cfad7e,
   three star dots #edd09c; right poster — frame #321a0f, field #361015,
   standing figure silhouette #111923 with #dd6048 rim accents; between
   them a small framed chart #4b2816 frame, #a38b69 field, tape row dashes
   #321a0f.
3. Pendant lamp centered above the clerk: brass dome #ad6a1e with #7b4514
   shadow and #df9e32 rim, short stem #414c55; beneath it one flat warm
   pool step #df9e32 (4 px) then #ad6a1e (4 px) on the shelf top below.
4. VHS shelf columns flanking both sides: frames #165652 with #0e3534
   shadow; tape spines as simple 4×14 blocks in exactly these colors:
   #0d486d, #126e9b, #443153, #882225, #b83932, #ad6a1e, #cfad7e, #267c73,
   each spine one flat color with a #020307 outline, no lettering.
5. The clerk: a Congolese woman with DARK skin: skin tones exactly #321a0f
   shadow, #542b22 body, #80442f light; braided hair #1d100a with #321a0f
   highlights, pulled back; gold hoop earrings #df9e32; teal shirt #165652
   with #0e3534 shadow; yellow vest #df9e32 with #ad6a1e shadow and a small
   name tag #b83932. Pose exactly as Image 1: leaning on the counter, cheek
   resting on her right hand, elbow planted, deadpan, gaze drifting left.
   Her face is simple and clean: two eye pixels-groups, one flat mouth line,
   no extra detail.
6. CRT television, the ONLY object on the counter, at the counter's left
   end, angled slightly toward the image center: casing #786852 with
   #4b4236 shadow and #a38b69 light; screen with vertical SMPTE bars in
   exactly seven columns: #edd09c, #df9e32, #4bd2e1, #4b6220, #a95f77,
   #b83932, #0d486d; screen outline #020307; a 2-pixel #4bd2e1 light edge
   on the counter directly in front of the screen.
7. Counter: top slab #cfad7e with #a38b69 shadow edge and #edd09c front
   lip; front of vertical panels #cfad7e framed #165652 with two thin
   #df9e32 trim lines.
8. Red wheeled bin, front left: box #882225 with #5c171c shadow and #b83932
   light edges; tan label patch #a38b69 with three #4b4236 stencil dashes;
   four caster wheels #1c2731 with #414c55 rims; overflowing tapes as flat
   blocks of #0d486d, #443153, #ad6a1e, #b83932.
9. Exact contacts: a 2-pixel #020307 contact shadow row under the bin
   wheels and the counter base.

Rendering: strict 3×3 logical pixel grid; large flat fields; the exact
tones listed; continuous #020307 outlines; no gradients, no blur, no glow,
no antialiasing, no noise. Clean simple face, clean blocky letters.

EXCLUDE: H-beams, wall around the recess, concrete floor, neighbors.
Background: perfectly flat #00ff00, generous padding, nothing at the border.

Text: only "VIDEO CLUB". Everything else unreadable dashes.

Self-check: 1) complete neon sign with tube frame and downward band;
2) clerk dark-skinned, cheek on hand, clean simple face; 3) SMPTE bars in
the seven listed colors, TV alone on the counter, angled center; 4) every
color from the spec list only; 5) as flat as Image 2, zero melted shapes;
6) flat #00ff00 background; 7) 1536×1024.
