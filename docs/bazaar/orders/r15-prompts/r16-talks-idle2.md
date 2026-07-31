# Codex order — r16 — Talks — idle frame 2 (frame 2/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Talks static master (idle frame 1) and THE EDIT
  TARGET. It is the authority for every pixel: layout, proportions,
  palette, lighting. Reproduce it exactly; change only THE MOTION
  below.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-talks-idle2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 2 of 5 of an in-place animation. At runtime the frames
swap on the same CSS box: any pixel that differs from Image 1 outside
the declared motion region will flicker. Image 1 is law.

- Canvas 1536×1024, flat chroma green #00ff00 background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same neon sign, kiosk, tape walls, posters, CRT, cart, standee,
  counter and every prop, outlines, colors, lighting and glow shapes.
- The clerk's seat behind the counter is fixed. The torso never
  translates left or right. Nothing rescales.
- The planted elbow stays planted in this frame: her head keeps
  resting on that palm.
- No lighting or brightness change anywhere. Hover light boost is a
  separate runtime layer, never baked into frames.
- ZERO new colors: every pixel value must already occur in Image 1.
- The CRT's SMPTE color bars and the neon tube glow stay byte-frozen
  in every frame.

## THE MOTION — the only change

A slow bored blink and one tap:

1. Both of the clerk's eyes close: lowered lids drawn with her
   existing skin hexes. The long-shift expression stays.
2. ONE fingertip of her counter-resting hand lifts 2-3 px mid-tap.
   The rest of that hand, and the whole propping arm, stay put.

The changed region is confined to her eyes and one fingertip.

## FREEZE CHECK — explicitly unchanged

"VIDEO CLUB" neon + mounts, kiosk frame, both tape walls and every
spine, saturn + fire posters, price board, vinyl discs, boombox,
rocket + star ornaments, hanging lamp, CRT + antennas + SMPTE bars,
tape cart + every tape in it, decals, rewind badge, bell, card box,
display stand + covers, the standee (suit man + easel), counter body,
her body/hair/earring/uniform, chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to her eyes and one fingertip.
2) SMPTE bars, neon and standee match Image 1 to the pixel.
3) Seat root, planted elbow and torso x unchanged.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #00ff00 chroma field.
