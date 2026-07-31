# 04 — flattened colors and the limited palette

Diffusion output is smooth by nature: gradients, stipple, mottle,
antialiasing. The bazaar look is the opposite: authored low-res 16-bit
pixel art, large flat bounded regions, chunky square clusters, near-black
outlines, exactly three tones per material, sparse hard highlights, LOW
DETAIL. Getting a diffusion model to paint flat took explicit law after
explicit law.

## The style block (canon phrasing, evolved r13 -> r20)

"Authored low-res 16-bit pixel art, large flat bounded color regions,
chunky square clusters, near-black outlines, exactly three tones per
material, sparse hard highlights, LOW DETAIL."

Plus the anti-texture law (added r20.9 when renders kept weaving):
"FLATNESS ABSOLUTE: zero stipple, zero mottle, zero weave, zero
per-pixel noise, zero gradients. Every color region is one flat chunk,
blocks never smaller than 4x4 px. Rust = one or two flat patches with
hard edges, never speckle. The rug = 3 flat tones in large plain
rectangles. A dead screen = one dark tone + one flat diagonal glare
band."

## Palette mechanics

- Palettes are SAMPLED, not invented: a 16-level bucketed dominant-color
  scan of the approved authority image (exact-hex counting fails on
  diffusion output — outlines rank first and body shades split).
- PALETTE CLAMP: every order lists the full legal hex set and opens the
  color law with "use ONLY these colors, nothing else... merge strays
  into the nearest listed value". r15 clamps ran 40-63 hexes per stall;
  the r20 console war drove it down: 25 -> 18 -> 15 hexes as the user
  kept ruling "reduce palette, flatten chunk colors".
- SCOPED HEXES: colors with one legal use get named scopes: "#8f2f1f only
  Ed's hair, #8faf6f only his goggle lenses, #2f7f78 only LED dots, none
  of the three ever on a screen." Scoping killed the recurring
  cyan-screen failure (any teal in the palette leaks into screens unless
  fenced).
- The chroma key color is EXCLUDED from the art palette explicitly
  ("#00ff00 is the background key, zero art pixels") after an adversarial
  review caught the contradiction (a "use ONLY these colors" list that
  didn't contain the mandated background).
- Gotcha from the clamp era: automated union-find merges of near-hexes
  collapse real material trios into degenerate body==light pairs. Always
  rescan clauses for a hex holding two role words and repair by hand.

## Screens are white-grey, never cyan

Standing user law since the r20 redo: every screen, every static, every
receiver band is pale white-grey (#9b9a98 #c9c8c5 #f2f1ee family), never
cyan, never blue. The palette swap that implemented it:
#126e9b/#1f9cc8/#4bd2e1 -> #9b9a98/#c9c8c5/#f2f1ee. Static is "flat
two-tone horizontal bands, never noise texture" (the word "static" alone
cues noise, which the style law bans — name the rendering, not the
concept).

## Why the palette shrank at the end

The layout-lock repaint round proved the palette IS the flatness: with
geometry frozen, the only difference between the noisy master and the
shipped look was 15 scoped hexes plus the 4x4 block floor. The flattest
probe of all was the one with the LEANEST order (s3) — beyond a point,
more style words add noise, not compliance. Style gospels (attach the
flattest previous render as "this manner, zero layout") transfer paint
better than prose.
