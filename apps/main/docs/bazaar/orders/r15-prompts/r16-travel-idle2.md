# Codex order — r16 — Travel — idle frame 2 (frame 2/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Travel static master (idle frame 1) and THE EDIT
  TARGET. It is the authority for every pixel: layout, proportions,
  palette, lighting. Reproduce it exactly; change only THE MOTION
  below. NOTE: in this stall's idle pose the ticket is ALREADY held
  up — that is correct and stays.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-travel-idle2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 2 of 5 of an in-place animation. At runtime the frames
swap on the same CSS box: any pixel that differs from Image 1 outside
the declared motion region will flicker. Image 1 is law.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same triangle sign, booth frame, corrugated walls, LAST SEATS
  plate, planet route cards, diving helmet, banjo, candles, radar
  unit, counter, chest, queue posts + rope, outlines, colors,
  lighting and glow shapes.
- The Hearthian's torso column at the counter is fixed. The torso
  never translates left or right. Nothing rescales.
- No lighting or brightness change anywhere. Hover light boost is a
  separate runtime layer, never baked into frames.
- ZERO new colors: every pixel value must already occur in Image 1.
- Candle flames and the radar's green sweep stay byte-frozen in every
  frame.

## THE MOTION — the only change

A slow four-eye blink and a tiny ticket shuffle:

1. ALL FOUR eyes blink: draw all four as closed lids using his
   existing blue skin hexes. The gentle smile stays.
2. The raised ticket tilts 2-3 px — a small shuffle of the held
   ticket. The hand pivots at the wrist; forearm and elbow stay put.
3. The resting gloved hand on the counter: byte-identical.

The changed region is confined to the four eyes and the ticket +
wrist pixels.

## FREEZE CHECK — explicitly unchanged

Triangle "Travel Ventures" sign + saucer art, booth frame + rivets,
corrugated side walls, dark star-map rear wall, three planet route
cards + string, LAST SEATS plate + cord, diving helmet, banjo, both
candle groups + flames, radar unit + sweep + stand, counter top +
front, brass-cornered chest, queue posts + red rope, his vest,
jacket, collar, ears, resting hand, chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to four eyes + ticket/wrist.
2) Candle flames and radar sweep match Image 1 to the pixel.
3) Torso column unchanged; ticket arm root unmoved.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
