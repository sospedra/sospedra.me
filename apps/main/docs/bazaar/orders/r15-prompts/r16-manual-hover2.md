# Codex order — r16 — Manual — hover frame 2 (frame 4/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the generated Manual hover frame 1 and THE EDIT TARGET. It
  is the authority for every pixel outside THE MOTION below.
- Image 2 = the Manual static master (idle frame 1): identity and
  resting-pose reference. Anything ordered to match "the static"
  matches Image 2.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-manual-hover2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 4 of 5 of an in-place animation (second hover frame). At
runtime the frames swap on the same CSS box. Image 1 is law for every
pixel outside the declared motion.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same sign plates + chains, lamps, bench, every part on the shelves,
  outlines, colors, lighting and glow shapes.
- The robot FLOATS on a fixed axis: the thruster cone and its blue
  flame tip keep Image 1's exact shape and altitude. The round torso
  and thruster housing stay RIGID during the bow — only the stalks
  dip.
- No lighting or brightness change anywhere.
- ZERO new colors: every pixel value must already occur in Image 1.
- Both hanging lamps, the small spotlight and the wall control panel
  LEDs stay byte-frozen.

## THE MOTION — the only change

A polite miniature bow, eyes only, tools tucking:

1. The three eye stalks dip: each stalk bends 3-6 px downward from its
   fixed base, lenses tilting down-forward toward the customer.
   Pupils stay on the camera.
2. The tools tuck inward: the duster arm folds so the duster stands
   upright close to the torso's left flank; the wrench arm folds so
   the wrench sits vertical near the chest hatch. Both shoulder roots
   stay fixed; only elbows/wrists articulate.
3. The lower free claw opens wider — a polite open-claw gesture,
   root fixed.
4. The tucked arms must stay inside the space between sign and bench
   and never cross the lamps, the sign chains or the bench top.

The changed region is confined to the three stalks/eyes and the three
arms. Torso plates, insignia, hatch and flame: byte-identical.

## FREEZE CHECK — explicitly unchanged

"manual" letter plates + chains, both hanging lamps + the small
spotlight, wall control panel, steel bench and every shelf part, the
robot's torso shell, chevron insignia, hatch, thruster, flame, chroma
field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to stalks/eyes and the three
   arms.
2) Stalk bases, shoulder roots, torso and flame unmoved.
3) Tools tucked inward; no fixed prop crossed.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
