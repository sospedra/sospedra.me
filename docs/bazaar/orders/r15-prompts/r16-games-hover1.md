# Codex order — r16 — Games — hover frame 1 (frame 3/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Games static master (idle frame 1) and THE EDIT
  TARGET. It is the authority for every pixel: layout, proportions,
  palette, lighting. Reproduce it exactly; change only THE MOTION
  below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-games-hover1.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 3 of 5 of an in-place animation (first hover frame). At
runtime the frames swap on the same CSS box. Image 1 is law.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same "games" sign, bulb string, plank wall, arcade cabinet, shelves
  and consoles, crates, cartridges, boxes, floor, outlines, colors,
  lighting and glow shapes.
- EACH child has an independent fixed torso anchor and fixed soles.
  No bouncing, no body displacement. Nothing rescales.
- No lighting or brightness change anywhere.
- ZERO new colors: every pixel value must already occur in Image 1.
- The arcade screen, every bulb, the handheld and its glow stay
  byte-frozen this frame.

## THE MOTION — the only change

Two opposite reactions to the same customer:

1. THE SISTER looks up with immediate excitement: her head tilts up
   toward the camera (silhouette shift ≤3 px), eyes wide open, mouth
   opening into a small thrilled grin. Her hands keep the handheld
   exactly where Image 1 has it.
2. THE BROTHER gives the customer a suspicious sideways look: pupils
   slide toward the camera corner-eyed, brows pinch into a squint,
   head turns at most 1-2 px. His raised hand and body stay put.

The changed region is confined to the two head boxes. All four arms
and both bodies match Image 1.

## FREEZE CHECK — explicitly unchanged

"games" wood sign + bolts, colored bulb string, plank wall, arcade
cabinet + screen content, both shelf columns and every console/box,
cartridge crates, tan box, cable bins + joystick + controller,
wooden floor, both kids' bodies below the neck, the handheld + both
gripping hands, chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the two head boxes.
2) Handheld, arcade screen and bulbs match Image 1 to the pixel.
3) Both torso anchors and all four soles unchanged.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
