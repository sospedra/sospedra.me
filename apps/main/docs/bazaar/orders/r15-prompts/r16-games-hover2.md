# Codex order — r16 — Games — hover frame 2 (frame 4/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the generated Games hover frame 1 and THE EDIT TARGET. It
  is the authority for every pixel outside THE MOTION below.
- Image 2 = the Games static master (idle frame 1): identity and
  resting-pose reference.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-games-hover2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 4 of 5 of an in-place animation (second hover frame) —
the loudest frame of the set, and still nothing but arms and faces
move. Image 1 is law for every pixel outside the declared motion.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same "games" sign, bulb string, plank wall, arcade cabinet, shelves
  and consoles, crates, cartridges, boxes, floor, outlines, colors,
  lighting and glow shapes.
- EACH child has an independent fixed torso anchor and fixed soles.
  NO bouncing, NO jumping, NO body displacement. The wave is an ARM
  gesture; the torso does not rise a single pixel. Nothing rescales.
- No lighting or brightness change anywhere.
- ZERO new colors: every pixel value must already occur in Image 1.
- The arcade screen, every bulb and the handheld's glow shape stay
  byte-frozen.

## THE MOTION — the only change

"NEW CHALLENGER!!!":

1. THE SISTER's viewer-left arm releases the handheld and shoots
   straight up: fully extended above her head, open hand mid-wave.
   The arm must top out at least 12 px BELOW the bulb string and
   never touch the sign or bulbs. Where the arm now covers the plank
   wall, it occludes it; where her old arm pose revealed wall, the
   wall must CONTINUE Image 2's exact plank pattern.
2. The handheld stays at its exact Image 1 position, now held by her
   other hand alone — redraw that hand's grip to carry it solo.
3. Her mouth opens into a big shout-grin; eyes stay wide on the
   camera.
4. THE BROTHER closes protectively: both his forearms pull in against
   his chest, hands in small fists. His suspicious face from Image 1
   hardens one px further.

The changed region is confined to: her left arm column + right-hand
grip + mouth, his two forearms + 1 px of face. Torsos, legs, soles:
byte-identical.

## FREEZE CHECK — explicitly unchanged

"games" wood sign + bolts, colored bulb string, plank wall pattern
(continued exactly where newly revealed), arcade cabinet + screen,
shelves and every console/box, cartridge crates, tan box, cable bins,
wooden floor, both kids' torsos/shorts/legs/shoes, the handheld's
position and glow, chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the declared arm/hand/face
   regions.
2) Her raised hand stays ≥12 px below the bulb string; handheld
   position unchanged.
3) Both torso anchors and all four soles unchanged — nobody jumped.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
