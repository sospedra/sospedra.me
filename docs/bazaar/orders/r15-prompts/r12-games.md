# Codex order — r12 — Games stall, clean regeneration, exact palette

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Games bay crop from the Floor 3 master. Source of truth for
  layout and shapes.
- Image 2 = the APPROVED Manual stall asset. Its rendering density, outline
  weight and flatness are the exact standard to match.
- Image 3 = camera gospel (a countertop). Its top-band geometry is the angle
  law for every box below.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-games-r12.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Rebuild the Games stall from Image 1 as one isolated sprite on flat chroma
magenta #ff00ff. Same layout as Image 1, rendered exactly as flat and chunky
as Image 2, with the box-angle law and light rules below. The previous
attempt had melted details, floating light dots and wrongly angled boxes —
all banned here.

PALETTE LAW: every pixel of the art uses ONLY hexes named below.

THE BOX-ANGLE LAW, applies to every crate, bin and box: draw the FRONT face
as a flat rectangle with horizontal top and bottom edges and vertical
sides; draw the TOP face as a single band whose height is EXACTLY one fifth
of the front face's width, top edge horizontal; NO side faces, NO rotation,
NO tilt — exactly like the countertop in Image 3.

1. Sign: rough plank #4b2816 with #321a0f edge and #6b391c chipped
   highlights, ATTACHED to the left post: the plank's left end overlaps the
   post with two nail dots #020307 and a small bracket #2b3741 — plus one
   support wire #4b4236 from its right end to the right post top. Letters
   lowercase "games", one flat color each with #020307 outline: g #df9e32,
   a #126e9b, m #b83932, e #df9e32, s #126e9b.
2. Christmas light string: a #1d100a wire wrapping the sign and sagging to
   the right post top. Bulbs, 10 to 12, alternating exactly #b83932,
   #126e9b, #df9e32, #4bd2e1. EVERY bulb sits ON the wire and emits: a
   1-pixel core of #ffe3a1 inside the bulb, a 3-to-5 pixel glow step of the
   bulb's own color around it, and a small lit patch of the same color on
   the nearest surface (sign board, post, or wall plank) — flat blocks, no
   floating dots detached from the wire.
3. Left post and stall frame: #4b2816 body, #321a0f shadow, #6b391c light.
   Rear wall planks: #321a0f body, #1d100a joints, #4b2816 light edge.
4. Arcade cabinet, left: body #0d486d with #0a2942 shadow and #126e9b light
   edges; marquee band #0a2942 with zigzag #df9e32; screen field #0a2942
   with two low-poly fighters: bodies #d18d5a and #efbd82 with #542b22
   outlines, ground line #126e9b, three unreadable title dashes #4bd2e1;
   joystick ball #b83932, two buttons #b83932, one #df9e32; base #1c2731.
   THE SCREEN EMITS: a flat #126e9b band, 3 to 4 pixels, on the floor
   directly in front of the cabinet, and a #1f9cc8 edge band 2 pixels wide
   along the SISTER'S BACK silhouette (her hoodie's left edge glows cyan).
5. The sister: hoodie #0d486d body, #0a2942 shadow, #126e9b light; shorts
   #1c2731; hair #4b2816 with #6b391c top; skin #ad6744 body, #80442f
   shadow, #d18d5a light; sneakers #126e9b with #edd09c trim and soles.
   She holds the handheld (#1c2731 body, screen #4bd2e1 with #8be9e7 core
   pixel) in both hands at chest height, head tilted down to it, simple
   clean face: two eye dots, one small smile line.
6. The brother: hair #1d100a with #321a0f edge; tee with horizontal stripes
   alternating #b83932 and #edd09c; shorts #126e9b with #0d486d shadow;
   sneakers #b83932 with #edd09c trim; skin same three tones as the sister.
   He stands at her right, watching the handheld, serious flat mouth line.
   The handheld screen casts one #4bd2e1 2-pixel edge on both children's
   chins and chests.
7. Shelf unit, right: frame #4b2816/#321a0f/#6b391c; on it a grey console
   #606970 with #414c55 shadow, a tan console #a38b69 with #786852 shadow,
   and a cartridge row of flat blocks #b83932, #ad6a1e, #df9e32, #882225.
8. Floor boxes, all obeying THE BOX-ANGLE LAW: left — a red crate #882225
   (#5c171c shadow, #b83932 light) full of cartridge blocks #1c2731 and
   #ad6a1e, sitting inside a blue crate #0d486d (#0a2942 shadow, #126e9b
   light); beside it a small tan box #a38b69 (#786852 shadow, #cfad7e
   light). Right — one blue bin with coiled cable blocks #1c2731 with
   #414c55 highlights, and a second blue bin with a grey controller
   #606970 and a joystick with ball #b83932 and stick #1c2731.
9. The wooden floor: a single-level plank platform, planks #6b391c body,
   #4b2816 gaps, #925022 light rows; its top drawn per the same one-fifth
   band law; front edge board #321a0f with a 3-pixel shadow row #1d100a
   below it. Everything stands on this floor with 2-pixel #020307 contact
   shadow rows.

Rendering: strict 3×3 logical pixel grid; large flat fields; exactly the
tones listed; continuous #020307 outlines around every object and child;
no gradients, no blur, no glow hazes, no antialiasing, no noise. Faces are
simple and clean.

EXCLUDE: H-beams, the dark bay backdrop beyond the stall's own plank wall,
the concrete lobby floor, neighbors. Background: perfectly flat #ff00ff,
generous padding, nothing at the border.

Text: only "games". Everything else unreadable dashes.

Self-check: 1) every box passes the one-fifth-band law, zero tilted boxes;
2) every bulb on the wire with a core, its glow step AND a lit patch on the
nearest surface; 3) the sister's back edge glows #1f9cc8 from the arcade,
floor band #126e9b in front of the cabinet; 4) sign attached to the left
post with nails and bracket; 5) both kids share the one handheld, clean
faces; 6) only spec colors; 7) as flat as Image 2; 8) flat #ff00ff
background; 9) 1536×1024.
