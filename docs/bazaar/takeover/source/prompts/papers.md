# Papers ImageGen production prompts

Normative source: `../ART_DIRECTION.md`. No prompt in this file authorizes
street-level or audio changes.

Papers keeps the approved newspaper/archive kiosk and courteous holographic
archivist. The signal may be unstable; the archivist’s intellect, posture, and
stall remain composed.

## Reference roles

- **P / edit target and identity authority:**  
  `public/images/bazaar2/assets/stall-papers-baked.png`, canonical canvas
  `1056 × 1309`. Preserve its teal-and-cream paper kiosk, canopy, metal frame,
  `Papers` fascia, clock, shelves, counter, books, newspapers, racks, projector
  base, and bespectacled book-holding holographic archivist.
- **U / primary rendering reference only:**  
  `stall-uses-baked.png`: flat value groups, strong near-black outlines,
  hard-edged warm light, readable materials, grounded construction.
- **G / secondary rendering reference only:**  
  `stall-games-baked.png`: simplified shapes, handmade asymmetry, deep
  interior, foreground overlap. Copy no Games subject or structure.
- **Pose references only:** the five full-frame
  `stall-papers-{idle-1,idle-2,hover-1,hover-2,hover-3}.png` images. Written
  frame instructions override them.
- **Forbidden:** `stall-papers-keeper-*.png`; they depict a different
  holographic person and are not identity authority.

The accepted normalized master is **M**. Every new cel uses M’s full
`1056 × 1309` coordinates on perfectly flat `#ff00ff`.

## Locked design and motion envelopes

- The archivist remains a smiling, courteous, scholarly man with glasses and a
  book, projected from the same fixed emitter.
- The hologram root/emitter coordinate, pelvis/torso axis, body scale, and
  projection width never move.
- Structure, canopy, `Papers` fascia, clock, paper racks, shelves, counter,
  projector hardware, printed matter, and all fixed light are immutable.
- Keeper envelope: eyelids/eyes, small head angle, book covers/pages, one
  locating finger, elbows/forearms, and final offering extension. No torso
  translation.
- Effect envelope: cyan scanlines and a few small rectangular hologram
  fragments strictly inside/adjacent to the projected figure. It never reaches
  the sign, shelves, counter, or racks.
- The book travels with the keeper. Printed page content remains unreadable.
- The customer is the camera/viewer.

## Prompt S — static normalization

```text
Use case: style-transfer
Asset type: production master sprite for the Papers stall
Input images: Image 1 is Papers and the absolute edit target/identity/composition authority; Image 2 is Uses, the primary rendering reference only; Image 3 is Games, the secondary readability reference only.

Restyle Image 1 without redesigning it. Preserve its exact 1056 × 1309 canvas, crop, footprint, teal-and-cream canopy, metal construction, sign shapes and lettering, clock, counter, archive shelves, books, newspapers, display racks, projector, hologram location, archivist identity, glasses, book, posture, and all occlusion. Change only rendering density: flatter limited colors, strong near-black outline hierarchy, crisp chunky 16-bit-inspired pixel clusters, normally three hard tones per material, sparse intentional dither, and hard-edged light like Uses/Games.

Keep the individual fascia text exactly as approved: "Papers". Do not copy any Uses/Games character, sign, palette, object, or layout. Keep the archivist cyan-blue and clearly holographic but simplify noisy linework. Preserve the composed smile and scholarly bearing.

Output exactly one 1056 × 1309 PNG on perfectly uniform #ff00ff chroma key. Magenta fills every exterior/open gap with no gradient, shadow, texture, floor plane, glow, or variation; no #ff00ff inside the art.

Do not move, scale, rotate, mirror, recrop, center, replace, add, remove, professionalize, or clean away any approved component. No painterly rendering, AI microdetail, smooth gradient, airbrush, antialiasing, fuzzy edge, tiny illegible decorative text, extra character, watermark, street element, or audio reference.
```

## Keeper prompts

Keeper cels contain the complete archivist plus carried book only. The
projector and every stall pixel stay on immutable plates.

### K-I1 — idle 1

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Papers idle frame 1
Input images: Image 1 is accepted M and the edit source; the approved idle-1 full frame is pose reference only.

Isolate the complete visible holographic archivist and book in their exact master coordinates. He reads calmly with the book held at a fixed height, shoulders composed, glasses aligned, and a gentle scholarly smile. Preserve the exact emitter/root axis and torso x-coordinate.

Output one 1056 × 1309 PNG containing only archivist and book on flat #ff00ff. Do not include projector hardware, counter, shelves, paper, sign, scanline fragments, glow halo, shadow, or structure. No hidden-body invention, translation, rescale, recrop, mirroring, antialiasing, gradient, or extra detail.
```

### K-I2 — idle 2

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Papers idle frame 2
Input images: Image 1 is accepted K-I1 and the edit target; Image 2 is M; the approved idle-2 full frame is pose reference only.

Keep the archivist’s anatomy, smile, head, torso, arms, book height, book angle, root, scale, and coordinates identical to K-I1. The unstable signal belongs to the effect cel; do not move the body or turn a page.

Output the same complete archivist-and-book cel on the exact 1056 × 1309 magenta canvas. Only a tiny glasses/page-edge luminance change may be present inside the declared keeper micro-mask. No structure, projector, fragments, translation, rescale, recrop, or new detail.
```

### K-H1 — hover 1

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Papers hover frame 1
Input images: Image 1 is accepted K-I1 and the edit target; Image 2 is M; the approved hover-1 full frame is pose reference only.

The signal stabilizes and the archivist notices the viewer. Articulate only eyes and a small head angle upward from the book. Keep the book at the idle height and keep shoulders, torso, emitter/root axis, pelvis, scale, and coordinates fixed.

Output one 1056 × 1309 archivist-and-book-only cel on flat #ff00ff. No projector, stall, fragments, glow, shadow, body translation, rescale, recrop, mirroring, antialiasing, or added detail.
```

### K-H2 — hover 2

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Papers hover frame 2
Input images: Image 1 is accepted K-H1 and the edit target; Image 2 is M; the approved hover-2 full frame is pose reference only.

Keep eye contact. Articulate only forearms, book covers/pages, and one locating finger: the book opens wider at the same central anchor and the finger identifies a relevant passage. Elbow roots remain registered and the book does not jump vertically.

Keep torso, shoulders, root/emitter axis, pelvis, scale, and all unnamed pixels fixed. Output one 1056 × 1309 keeper-only cel on flat #ff00ff. No structure, projection hardware, fragment effect, translation, rescale, recrop, or new text.
```

### K-H3 — hover 3

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Papers hover frame 3
Input images: Image 1 is accepted K-H2 and the edit target; Image 2 is M; the approved hover-3 full frame is pose reference only.

Offer the open book toward the camera through compact elbow/wrist articulation. Preserve the selected passage gesture and courteous expression. The book may extend only inside its declared forward envelope; its center does not slide sideways.

Keep emitter/root, pelvis, torso x-coordinate, shoulders, scale, and all unnamed regions fixed. Output one 1056 × 1309 archivist-and-book-only cel on flat #ff00ff. No structure, projector, fragments, glow, translation, rescale, recrop, mirroring, antialiasing, or extra text.
```

## Effect prompts

The effect cels contain only holographic scanline/fragments. The stable cyan
body belongs to the keeper; the fixed projector and stall lighting belong to
immutable plates.

### E-I1 — idle 1

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Papers idle frame 1
Input images: Image 1 is M and the coordinate source; Image 2 is accepted K-I1.

Create only a restrained stable hologram overlay aligned to the archivist: a few hard cyan scanline segments and tiny square registration pixels within the declared projection envelope. Do not redraw the body, book, glasses, projector, stall, or glow pool.

Output one 1056 × 1309 PNG on flat #ff00ff. Use opaque chunky pixels only; no blur, mist, soft alpha, gradient, or antialiasing.
```

### E-I2 — idle 2

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Papers idle frame 2
Input images: Image 1 is accepted E-I1 and the edit target; Image 2 is M; Image 3 is accepted K-I2.

Briefly desynchronize only the declared scanline overlay: offset a few short cyan line segments by one authored pixel-grid step and add two or three small rectangular fragments near the glasses and page edges. Keep the effect centered on the fixed projection axis and inside the same envelope.

Include no body, book fill, structure, projector, sign, or broad glow. Output one 1056 × 1309 PNG on flat #ff00ff. No blur, soft alpha, gradient, rescale, or full-effect translation.
```

### E-H1 — hover 1

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Papers hover frame 1
Input images: Image 1 is accepted E-I1 and the edit target; Image 2 is accepted K-H1.

Show the signal stabilizing: keep only the clean aligned scanline segments from idle 1 and remove stray fragments. Do not brighten or enlarge the whole body.

Output one 1056 × 1309 effect-only PNG on flat #ff00ff. No structure, projector, blur, gradient, translation, or rescale.
```

### E-H2 — hover 2

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Papers hover frame 2
Input images: Image 1 is accepted E-H1 and the edit target; Image 2 is accepted K-H2.

Preserve the stable aligned hologram effect. Add only one compact hard cyan page-edge emphasis aligned to the locating finger, inside the book effect mask. Include no body or structure.

Output one 1056 × 1309 effect-only PNG on flat #ff00ff. No blur, soft alpha, gradient, translation, or rescale.
```

### E-H3 — hover 3

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Papers hover frame 3
Input images: Image 1 is accepted E-H2 and the edit target; Image 2 is accepted K-H3.

Move only the compact page-edge emphasis so it aligns with the offered book. Preserve the stable scanline pattern and fixed projection axis. Keep all pixels inside the declared book/projection envelope.

Output one 1056 × 1309 effect-only PNG on flat #ff00ff. No body, structure, blur, gradient, full-effect translation, or rescale.
```

## Acceptance checklist

- [ ] Master remains the approved Papers kiosk, fascia, archivist, and archive.
- [ ] Rendering is flatter and chunkier without becoming a new design.
- [ ] Every cel is exactly `1056 × 1309` in M coordinates.
- [ ] Projector/root delta, torso-x delta, and body scale are zero.
- [ ] Idle 2 changes only the small keeper luminance mask plus scanline glitch.
- [ ] Hover reads: look up; locate passage; offer open book.
- [ ] The archivist remains courteous, composed, and scholarly.
- [ ] Effect fragments never enter structure, sign, counter, or racks.
- [ ] Immutable plate hashes, motion masks, key removal, palette/grid, onion
      skin, and Chrome in-scene checks pass.
- [ ] No street or audio asset changed.
