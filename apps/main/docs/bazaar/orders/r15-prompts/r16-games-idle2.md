# Codex order — r16 — Games — idle frame 2 (frame 2/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Games static master (idle frame 1) and THE EDIT
  TARGET. It is the authority for every pixel: layout, proportions,
  palette, lighting. Reproduce it exactly; change only THE MOTION
  below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-games-idle2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 2 of 5 of an in-place animation. At runtime the frames
swap on the same CSS box: any pixel that differs from Image 1 outside
the declared motion region will flicker. Image 1 is law.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same "games" sign, bulb string, plank wall, arcade cabinet, shelves
  and consoles, crates, cartridges, boxes, floor, outlines, colors,
  lighting and glow shapes.
- EACH child has an independent fixed torso anchor and fixed soles.
  No bouncing, no body displacement, no left/right torso translation.
  Nothing rescales.
- No lighting or brightness change anywhere. Hover light boost is a
  separate runtime layer, never baked into frames.
- ZERO new colors: every pixel value must already occur in Image 1.
- The ARCADE SCREEN (fighters, health bars, joystick, buttons) and
  every colored bulb stay byte-frozen in every frame. The handheld's
  cyan GLOW SHAPE on floor/bodies stays frozen; only its screen face
  is declared below.

## THE MOTION — the only change

Only the game reacts, and their faces react to it:

1. The handheld's screen face flashes: its few screen pixels change
   to a different arrangement using only the cyans/darks already on
   that screen. The handheld body and both gripping hands do not
   move.
2. ONE face button on the handheld changes state (1-2 px).
3. The sister's eyes narrow ~1 px in focus.
4. The brother's eyebrows rise ~1 px, studying the screen.

No limb moves. Both bodies are byte-identical to Image 1 outside the
named eye/brow pixels.

## FREEZE CHECK — explicitly unchanged

"games" wood sign + bolts, colored bulb string, plank wall, arcade
cabinet (marquee, screen content, joystick, buttons, door), both
shelf columns and every console/box on them, cartridge crates, tan
box, cable bins + joystick + controller, wooden floor, both kids'
bodies, hair, clothes and shoes, the handheld's body and glow,
chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the handheld screen face,
   one button, and eye/brow pixels on both faces.
2) Arcade screen and bulbs match Image 1 to the pixel.
3) Both torso anchors and all four soles unchanged.
4) No new hexes; no lighting or glow-shape change.
5) 1536×1024; clean #ff00ff chroma field.
