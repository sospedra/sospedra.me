# Talks / Video Club ImageGen production prompts

Normative source: `../ART_DIRECTION.md`. No street-level or audio changes.

Talks remains the approved Video Club: a seasoned, deadpan clerk with cultivated
boredom and excellent taste, not a generic media kiosk.

## Reference roles

- **T / edit target and identity authority:**  
  `public/images/bazaar2/assets/stall-talks-baked.png`, canonical canvas
  `941 × 1006`. Preserve the `VIDEO CLUB` fascia, dark shelving, tapes, CRT,
  posters, hanging decorations, counter, tape box, bell, rolling return bin,
  rewind symbol, cardboard standee, and the same braided clerk in the yellow
  vest leaning on one hand.
- **U / primary rendering reference only:** `stall-uses-baked.png`.
- **G / secondary rendering reference only:** `stall-games-baked.png`.
- **Pose references only:** the five full-frame
  `stall-talks-{idle-1,idle-2,hover-1,hover-2,hover-3}.png` images. Written
  frame instructions are authoritative.
- **Forbidden:** all `stall-talks-keeper-*.png`; they depict a different
  standing character and are not the Video Club clerk.

The accepted normalized master is **M**. Every cel is a full `941 × 1006`
master-coordinate image on flat `#ff00ff`.

## Locked design and motion envelopes

- The same clerk remains behind the counter with the same hair, face, yellow
  vest, and cultivated-bored expression.
- Idle root is the hidden seated/standing pelvis behind the counter plus the
  planted elbow/counter contact. The torso x-coordinate never moves.
- Structure, `VIDEO CLUB` sign, CRT housing, shelves, tapes, posters, hanging
  props, counter, bell, return bin, cardboard standee, and fixed clutter are
  immutable.
- Keeper envelope: eyelids/eyes, one tapping fingertip, small head angle,
  torso articulation upward around the fixed root, one selecting arm, one
  carried cassette, and the final offering arm.
- A single designated cassette slot in the counter box is a dynamic-prop mask:
  the cassette appears there in idle/hover-1 effects and travels with the
  keeper in hover-2/3. No other tape moves.
- Effect envelope: the designated cassette slot plus one hard CRT scanline
  band. The CRT housing and color bars remain fixed.
- The customer is the camera/viewer.

## Prompt S — static normalization

```text
Use case: style-transfer
Asset type: production master sprite for Talks / Video Club
Input images: Image 1 is Video Club and the absolute edit target/identity/composition authority; Image 2 is Uses, primary rendering reference only; Image 3 is Games, secondary rendering/readability reference only.

Restyle Image 1 without redesigning it. Preserve its exact 941 × 1006 canvas, crop, footprint, "VIDEO CLUB" fascia, shelving, tapes, CRT, posters, hanging star/rocket, counter, tape box, bell, rewind sign, rolling return bin, cardboard standee, and every approved overlap.

Preserve the exact same braided clerk behind the counter: same face, hair, yellow vest, planted elbow, cheek-in-hand posture, body proportions, coordinate, and dry expression. She is seasoned and bored by the shift, not cheerful retail staff and not disinterested in films.

Change only rendering density: flatter limited colors, strong near-black outlines, crisp chunky 16-bit-inspired clusters, normally three hard tones per material, sparse dither, hard light, and readable silhouettes like Uses/Games. Keep Video Club’s own dark navy, brown, cream, and faded-media palette. Copy no Uses/Games subject, sign, palette, or layout.

Output exactly one 941 × 1006 PNG on perfectly uniform #ff00ff chroma key. Magenta fills all exterior/open gaps with no texture, gradient, floor, shadow, reflection, glow, or variation; no #ff00ff inside the art.

Do not move, scale, rotate, mirror, recrop, add, remove, update, modernize, or professionalize any component. No painterly AI microdetail, smooth gradient, antialiasing, fuzzy edge, glossy 3D, extra character, extra readable text, watermark, street element, or audio reference.
```

## Keeper prompts

Keeper cels contain the complete visible clerk and, from hover 2 onward, the
single selected cassette. The counter and other stall pixels are absent.

### K-I1 — idle 1

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Talks idle frame 1
Input images: Image 1 is M and the edit source; the approved idle-1 full frame is pose reference only.

Isolate the complete visible clerk at the exact master coordinate. She rests her cheek on one hand with the same elbow planted on the counter, shoulders relaxed, and long cultivated-bored gaze. Preserve her identity, braids, yellow vest, hidden pelvis/root, planted-elbow coordinate, torso x-coordinate, scale, and silhouette.

Output one 941 × 1006 clerk-only PNG on flat #ff00ff. Do not include counter, selected tape, tape box, bell, CRT, shelves, sign, return bin, standee, structure, shadow, or glow. No translation, rescale, recrop, mirroring, body bob, antialiasing, gradient, or added detail.
```

### K-I2 — idle 2

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Talks idle frame 2
Input images: Image 1 is accepted K-I1 and the edit target; Image 2 is M; the approved idle-2 full frame is pose reference only.

Change only a slow bored blink and, at most, one fingertip tapping the counter while the wrist/elbow contacts remain fixed. Preserve cheek-in-hand pose, head position, shoulders, torso, hidden root, planted elbow, vest, scale, and coordinates.

Output one 941 × 1006 clerk-only cel on flat #ff00ff. Do not draw the counter or any cassette. No body displacement, rescale, recrop, mirroring, antialiasing, gradient, or new detail.
```

### K-H1 — hover 1

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Talks hover frame 1
Input images: Image 1 is accepted K-I1 and the edit target; Image 2 is M; the approved hover-1 full frame is pose reference only.

The clerk slowly notices and evaluates the customer. Change only eyes, eyelids, and a small head angle toward the camera. Keep cheek support and planted elbow, torso x-coordinate, hidden root, shoulders, vest, and scale registered. The expression is assessing and deadpan.

Output one 941 × 1006 clerk-only cel on flat #ff00ff. No tape, counter, structure, effect, body slide, rescale, recrop, or added detail.
```

### K-H2 — hover 2

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Talks hover frame 2
Input images: Image 1 is accepted K-H1 and the edit target; Image 2 is M; the approved hover-2 full frame is pose reference only.

Articulate the clerk upright around the fixed hidden pelvis/root without moving the torso left or right. Lift the cheek-support hand and use the selecting arm to take the one designated cassette from the counter box. Hold it near eye level and briefly check its unreadable label. Include that single cassette in the keeper cel.

Keep root, torso x-coordinate, body scale, vest, identity, and counter-bay placement fixed. Output one 941 × 1006 clerk-plus-selected-cassette cel on flat #ff00ff. No counter, box, other tape, structure, effect, translation, rescale, recrop, mirroring, antialiasing, or readable label text.
```

### K-H3 — hover 3

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Talks hover frame 3
Input images: Image 1 is accepted K-H2 and the edit target; Image 2 is M; the approved hover-3 full frame is pose reference only.

Offer the selected cassette across the counter toward the camera through compact shoulder/elbow/wrist articulation, with a faint knowing smile. Keep the cassette identity and orientation readable. Do not translate the torso; preserve hidden root, torso x-coordinate, shoulders, vest, scale, and all unnamed pixels.

Output one 941 × 1006 clerk-and-cassette-only cel on flat #ff00ff. No counter, structure, effect, rescale, recrop, mirroring, antialiasing, or new text.
```

## Effect prompts

Before assembly, remove the one designated cassette from the immutable counter
plate. The effect cel supplies it in its slot until the keeper selects it.

### E-I1 — idle 1

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Talks idle frame 1
Input images: Image 1 is M and the coordinate source; Image 2 is accepted K-I1.

Create only two effects: the single designated cassette seated in its exact counter-box slot, and one subtle hard horizontal CRT scanline aligned inside the fixed CRT screen. Include no box, counter, CRT housing, clerk, other tape, sign, structure, light pool, or shadow.

Output one 941 × 1006 PNG on flat #ff00ff. Use opaque chunky pixels only; no blur, soft alpha, gradient, antialiasing, or readable cassette text.
```

### E-I2 — idle 2

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Talks idle frame 2
Input images: Image 1 is accepted E-I1 and the edit target.

Keep the designated cassette pixel-identical in its slot. Move only the hard CRT scanline by one authored grid step inside the screen mask. Include no other change.

Output one 941 × 1006 effect-only PNG on flat #ff00ff. No blur, gradient, full-effect translation, or rescale.
```

### E-H1 — hover 1

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Talks hover frame 1
Input images: Image 1 is accepted E-I1 and the edit target.

Preserve the designated cassette in its slot and the idle-1 CRT scanline exactly. Add no hover effect.

Output the same 941 × 1006 effect-only PNG on flat #ff00ff.
```

### E-H2 — hover 2

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Talks hover frame 2
Input images: Image 1 is accepted E-H1 and the edit target; Image 2 is accepted K-H2.

Remove only the designated cassette from its counter-box slot because it now travels with the keeper. Keep the CRT scanline exactly fixed. Leave the slot transparent after chroma removal; the immutable dark slot backing remains below it.

Output one 941 × 1006 effect-only PNG on flat #ff00ff. Include no replacement tape, empty-slot redraw, clerk, counter, structure, blur, gradient, translation, or rescale.
```

### E-H3 — hover 3

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Talks hover frame 3
Input images: Image 1 is accepted E-H2 and the edit target; Image 2 is accepted K-H3.

Preserve the hover-2 effect exactly: no cassette in the slot and the same fixed CRT scanline. The offered cassette exists only in the keeper.

Output the same 941 × 1006 effect-only PNG on flat #ff00ff.
```

## Acceptance checklist

- [ ] `VIDEO CLUB`, clerk identity, shelves, CRT, tapes, standee, return bin,
      counter, props, and silhouette remain approved and immutable.
- [ ] Every cel is exactly `941 × 1006` in M coordinates.
- [ ] Hidden root and torso-x deltas are zero; planted elbow remains registered
      until the deliberate hover-2 articulation.
- [ ] Idle 2 changes only blink/tap plus one CRT scanline step.
- [ ] Hover reads: evaluate; straighten/select/check; offer with knowing smile.
- [ ] Exactly one designated cassette moves, with no duplicate after hover 2.
- [ ] No static structure leaks into dynamic cels.
- [ ] Flat/chunky style, key, alpha, pixel grid, palette, masks, immutable
      hashes, onion skins, and Chrome checks pass.
- [ ] No street or audio asset changed.
