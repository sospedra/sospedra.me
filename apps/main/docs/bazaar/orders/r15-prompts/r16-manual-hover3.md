# Codex order — r16 — Manual — hover frame 3, held (frame 5/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the generated Manual hover frame 2 and THE EDIT TARGET. It
  is the authority for every pixel outside THE MOTION below.
- Image 2 = the Manual static master (idle frame 1): identity and
  resting-pose reference. Anything ordered to match "the static"
  matches Image 2.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-manual-hover3.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 5 of 5 — the HELD hover frame: it stays on screen while
hover/focus remains, so it must read calm and stable. Image 1 is law
for every pixel outside the declared motion.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same sign plates + chains, lamps, bench, every part on the shelves,
  outlines, colors, lighting and glow shapes.
- The robot FLOATS on a fixed axis: the thruster cone and its blue
  flame tip keep Image 1's exact shape and altitude. The torso is
  rigid.
- No lighting or brightness change anywhere.
- ZERO new colors: every pixel value must already occur in Image 1.
- Both hanging lamps, the small spotlight and the wall control panel
  LEDs stay byte-frozen.

## THE MOTION — the only change

The bow ends; the claw presents the counter; work resumes:

1. The three eye stalks rise back to Image 2's height. Pupils stay
   locked on the camera.
2. The lower free claw sweeps into a presenting gesture: open claw
   angled down-outward above the bench top — "here is my counter" —
   without touching the bench or any part on it.
3. The duster arm and the wrench arm RETURN to Image 2's exact working
   poses (copy those two arms from Image 2, cautiously back at their
   jobs).

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
2) Duster and wrench arms match Image 2's poses; claw presents the
   bench without touching it.
3) Stalk bases, torso and flame unmoved; pupils on camera.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
