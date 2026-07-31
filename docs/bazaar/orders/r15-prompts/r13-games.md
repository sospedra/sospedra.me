# Codex order — r13 — Games stall: THE ANGLES, and lights that actually cast

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Games bay crop from the Floor 3 master: layout and inventory.
- Image 2 = the APPROVED Manual stall asset: rendering flatness to match.
- Image 3 = camera gospel (a countertop): the only allowed angle.
- Image 4 = the angle law diagram. The GREEN construction is the ONLY legal
  way to draw ANY box, crate, bin, cabinet, shelf or floor: a front
  rectangle with vertical sides, plus ONE thin horizontal top band. The RED
  crossed-out isometric construction is FORBIDDEN. If any object in your
  output shows a side face or a rotated top, the image is wrong.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-games-r13.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Rebuild the Games stall as one isolated sprite on flat chroma magenta
#ff00ff. Same inventory as Image 1, flat as Image 2, every object in the
GREEN construction of Image 4.

PALETTE LAW — every pixel is one of these or the background:
#020307 #111923 #1c2731 #2b3741 #414c55 #606970
#1d100a #321a0f #4b2816 #6b391c #925022
#786852 #a38b69 #cfad7e #edd09c
#5c171c #882225 #b83932
#7b4514 #ad6a1e #df9e32 #ffe3a1
#0a2942 #0d486d #126e9b #1f9cc8 #4bd2e1 #8be9e7
#80442f #ad6744 #d18d5a

THE ANGLE RULES, absolute:
- The viewer stands exactly in front, at the children's eye height.
- Every vertical edge in the image is perfectly vertical. Every horizontal
  edge is perfectly horizontal. There are NO diagonal receding lines
  anywhere.
- Every box shows exactly TWO surfaces: its front rectangle and one thin
  top band (height = one fifth of the box's width). Never a third surface.
- The wooden floor shows exactly TWO surfaces: a horizontal top band
  (planks #6b391c with gaps #4b2816 and light rows #925022) about 55 pixels
  tall, and below it a front edge board #321a0f, 12 pixels tall, with a
  #1d100a shadow row under it. The floor's left and right ends are vertical
  cuts. No trapezoid, no receding plane.

1. SIGN, attached to the LEFT POST: plank #4b2816 with #321a0f edge and
   #6b391c chips; its left end overlaps the post with two #020307 nail dots
   and a #2b3741 bracket; a support wire #4b2816 runs from its right end up
   to the right post top. Letters lowercase "games": g #df9e32, a #126e9b,
   m #b83932, e #df9e32, s #126e9b, each with a #020307 outline.
2. CHRISTMAS LIGHTS THAT ACTUALLY CAST LIGHT. The string: wire #1d100a
   sagging from the sign across to the right post. Twelve bulbs, cycling
   #b83932, #126e9b, #df9e32, #4bd2e1. EVERY SINGLE BULB gets all three of
   these, no exceptions:
   a) a #ffe3a1 core pixel pair inside the bulb;
   b) a glow ring of the bulb's own color, 4 to 6 pixels thick, drawn as
      flat concentric blocks around the bulb;
   c) a LIT PATCH of the bulb's own color, 8 to 14 pixels wide, painted on
      the nearest surface below or behind it — on the sign board, on the
      post, on the wall planks, on the arcade top. Twelve bulbs means
      TWELVE visible lit patches. The sign board, carrying several bulbs,
      shows overlapping colored patches across its face.
3. ARCADE CABINET, left, green construction: front #0d486d with #0a2942
   shadow and #126e9b light edge; thin top band; marquee #0a2942 with
   zigzag #df9e32; screen #0a2942 with two low-poly fighters, one #d18d5a
   and one #cfad7e, both outlined #321a0f, ground line #126e9b, three title
   dashes #4bd2e1; joystick ball #b83932, buttons #b83932 #df9e32; base
   #1c2731.
   THE SCREEN CASTS: a #126e9b flat band, 4 pixels, on the floor directly
   in front of the cabinet, AND a #1f9cc8 rim, 2 pixels, along the
   sister's entire left silhouette edge (arm, hoodie side, leg).
4. THE CHILDREN, center, sharing ONE handheld: sister taller — ponytail
   #4b2816 with #6b391c top row, hoodie #0d486d body #0a2942 shadow
   #126e9b light, shorts #1c2731, sneakers #126e9b with #edd09c trim, skin
   #ad6744 body #80442f shadow #d18d5a light; she holds the handheld
   (#1c2731, screen #4bd2e1 with one #8be9e7 core pixel) in both hands.
   Brother smaller — hair #1d100a, striped tee in alternating #b83932 and
   #edd09c rows, shorts #126e9b, sneakers #b83932 with #edd09c trim, same
   skin tones; he watches the handheld, flat serious mouth. The handheld
   casts a #4bd2e1 2-pixel edge on both chins and chests. Clean simple
   faces: eye dots, one mouth line each.
5. SHELF UNIT, right, green construction: frame #4b2816/#321a0f/#6b391c;
   grey console #606970 with #414c55 shadow; tan console #a38b69 with
   #786852 shadow; cartridge row of flat blocks #b83932 #ad6a1e #df9e32
   #882225.
6. FLOOR BOXES, all green construction with thin top bands: left, a red
   crate #882225/#5c171c/#b83932 of cartridges #1c2731 and #ad6a1e inside
   a blue crate #0d486d/#0a2942/#126e9b; a small tan box #a38b69/#786852/
   #cfad7e beside it. Right, one blue bin with cable coils #1c2731 with
   #414c55 highlights, and a second blue bin with a controller #606970 and
   a joystick (ball #b83932, stick #1c2731).
7. Rear wall of the stall: vertical planks #321a0f with #1d100a joints and
   #4b2816 light edges — flat, quiet.
8. Contact shadows: a 2-pixel #020307 row under every box, both children's
   shoes, and the shelf legs.

Rendering: strict 3×3 grid, flat single-color fields, three tones per
material, continuous #020307 outlines, no gradients, no soft glow, no
antialiasing, no noise, clean faces.

EXCLUDE: H-beams, anything beyond the stall's own plank wall, the concrete
lobby floor, neighbors. Background: perfectly flat #ff00ff, generous
padding, nothing at the border.

Text: only "games". All else unreadable dashes.

Self-check, in order: 1) scan every box — each shows exactly front + thin
top band, vertical sides, like the GREEN construction; any side face =
redo; 2) count the lit patches — twelve bulbs, twelve colored patches on
surfaces; 3) the sister's left silhouette carries the #1f9cc8 arcade rim;
4) floor is a flat band with vertical ends; 5) kids share one handheld,
clean faces; 6) only palette colors; 7) flat #ff00ff background;
8) 1536×1024.
