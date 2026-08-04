# Uses ImageGen production prompts

Normative source: `../ART_DIRECTION.md`. This pack changes no street-level
asset and defines no audio.

Uses is the primary Bazaar 3 rendering Gospel. Do not regenerate its approved
stall merely to make it resemble another stall. The current baked sprite is the
default master; ImageGen is used for registered animation cels and only for a
static repair if deterministic layer extraction exposes a real defect.

## Reference roles

- **U / master and identity authority:**  
  `public/images/bazaar2/assets/stall-uses-baked.png`, exact canonical canvas
  `1147 × 904`. Preserve its ramen-shop structure, awning, lanterns, rope-hung
  `uses` sign and secondary Japanese lettering, stern chef, counter, equipment,
  patrons, stools, crates, bottles, wiring, and grounded base.
- **G / secondary rendering reference only:**  
  `public/images/bazaar2/assets/stall-games-baked.png`. Use only its simple
  shape readability and handmade material grouping. Copy no subject, sign,
  layout, palette, or prop.
- **Pose references only:**  
  `stall-uses-idle-1.png`, `stall-uses-idle-2.png`,
  `stall-uses-hover-1.png`, `stall-uses-hover-2.png`, and
  `stall-uses-hover-3.png`. The written frame card below overrides any
  discrepancy.
- **Forbidden:** every `stall-uses-keeper-*.png`; those legacy files depict a
  different robot and are not Uses.

All generated sources use one full `1147 × 904` canvas on flat `#ff00ff`.
Every later processed cel stays in U’s exact coordinate system. Never use a
legacy cropped keeper canvas.

## Locked design and masks

- The chef remains an older stern ramen curator behind the counter, upright
  with a fixed foot/pelvis root and folded arms in idle.
- The expression is exacting and quiet, never aggressive or comic.
- Stall, sign, patrons, counter, stools, lamps, pots, shelves, crates, bottles,
  and all environmental pixels are immutable plates.
- The keeper mask contains only the chef and a carried/gesturing hand region.
- Fixed keeper regions: feet/root, pelvis, lower torso, apron, shoulders, and
  torso x-coordinate.
- Allowed keeper envelope: eyelids/eyebrows, chin/head angle, fingers,
  forearms, and one unfolding arm, bounded within the chef’s counter bay. No
  limb may enter the patrons, sign, navigation lane, or stall edge.
- The effect mask contains only a compact hard-edged steam cluster above the
  approved cooking vessel. The vessel never moves.
- The customer is the camera/viewer.

## Static policy and emergency normalization prompt

Adopt U unchanged as **M** when it passes extraction. Use this prompt only if a
reviewed defect requires rebuilding the source master.

```text
Use case: precise-object-edit
Asset type: production master sprite for the Uses stall
Input images: Image 1 is the approved Uses edit target and absolute identity/composition authority; Image 2 is Games, a secondary readability reference only.

Change only the specifically documented rendering defect. Preserve Image 1’s exact 1147 × 904 canvas, crop, silhouette, sign, text, chef identity and pose, patrons, ramen equipment, awning, lanterns, counter, stools, props, contact, palette relationships, and every unaffected shape. Uses already defines the required style: flat limited colors, strong near-black outlines, crisp chunky 16-bit-inspired shading, normally three hard tones per material, sparse intentional dither, and hard-edged light. Do not redesign or simplify away approved detail.

Output exactly one PNG on perfectly flat #ff00ff chroma key. Magenta fills all exterior and internal open gaps with no gradient, texture, floor, shadow, reflection, or variation; do not use #ff00ff in the art.

Do not add, remove, translate, rescale, rotate, mirror, recrop, relight, professionalize, or restyle any unaffected element. Preserve the exact word "uses", the approved secondary sign lettering, and all current asymmetry. No antialiasing, smooth gradient, painterly detail, fuzzy edge, glossy 3D rendering, extra character, extra text, watermark, street element, or audio reference.
```

## Keeper prompts

For each call, Image 1 is M or the named accepted keeper edit target. Image 2 is
M for identity/coordinates. When useful, attach the matching approved full
frame as Image 3 for pose only. Output one full-canvas cel containing the chef
only on flat magenta.

### K-I1 — idle 1

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Uses idle frame 1
Input images: Image 1 is the approved Uses master and edit source; the matching approved full frame is pose reference only.

Isolate the complete visible chef at the exact master coordinates. He stands upright behind the counter with arms folded, silently assessing the viewer. Preserve his exact face, hair, clothing, apron, proportions, feet/pelvis root, torso x-coordinate, and folded-arm silhouette.

Output exactly one 1147 × 904 PNG. Include only the chef; no stall, sign, patron, counter, stool, cookware, steam, lamp, prop, floor, shadow, or glow. Fill every other pixel with perfectly flat #ff00ff. Do not invent hidden anatomy. No translation, rescale, recrop, mirroring, body bob, torso deformation, antialiasing, gradient, or added detail.
```

### K-I2 — idle 2

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Uses idle frame 2
Input images: Image 1 is accepted K-I1 and the edit target; Image 2 is the master; the approved idle-2 full frame is pose reference only.

Change only a slow blink and one tiny finger OR eyebrow adjustment. Keep the chef’s head outline, chin, folded-arm mass, shoulders, torso, apron, root, scale, and coordinates identical to K-I1. There is no body movement.

Output one 1147 × 904 chef-only cel on perfectly flat #ff00ff. Add no structure, prop, steam, shadow, or glow. No full-layer translation, rescale, recrop, mirroring, antialiasing, gradient, or new texture.
```

### K-H1 — hover 1

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Uses hover frame 1
Input images: Image 1 is accepted K-I1 and the edit target; Image 2 is the master; the approved hover-1 full frame is pose reference only.

The chef notices the customer. Change only his eyes so they meet the camera and articulate a very small chin rise around the fixed neck. Keep both arms folded. Preserve the fixed foot/pelvis root, torso x-coordinate, shoulders, apron, scale, and counter-bay placement.

Output one 1147 × 904 chef-only cel on flat #ff00ff. No stall, prop, steam, shadow, glow, body slide, standing-height change, rescale, recrop, mirroring, antialiasing, or added detail.
```

### K-H2 — hover 2

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Uses hover frame 2
Input images: Image 1 is accepted K-H1 and the edit target; Image 2 is the master; the approved hover-2 full frame is pose reference only.

Keep eye contact and the slight chin angle. Unfold only one arm through shoulder/elbow/wrist articulation and use two fingers to indicate the approved empty stool/menu area. The other arm and both shoulder roots remain registered. The gesture is controlled, compact, and judgmental rather than welcomingly broad.

Keep root, pelvis, torso x-coordinate, apron, scale, and all unnamed pixels fixed. Output one 1147 × 904 chef-only cel on flat #ff00ff. Do not draw the stool/menu or any structure/effect. No torso translation, rescale, recrop, mirroring, antialiasing, or extra anatomy.
```

### K-H3 — hover 3

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Uses hover frame 3
Input images: Image 1 is accepted K-H2 and the edit target; Image 2 is the master; the approved hover-3 full frame is pose reference only.

Turn the indicating hand into a restrained open-palm presentation and articulate one minimal nod at the neck: "Omakase." Keep the gesture compact. Preserve the exact root, pelvis, torso x-coordinate, shoulders, apron, scale, and non-gesturing arm.

Output one 1147 × 904 chef-only cel on flat #ff00ff. No text, menu, stool, structure, steam, shadow, or glow. No body slide, rescale, recrop, mirroring, antialiasing, gradient, or new detail.
```

## Effect prompts

Every effect cel contains only the approved steam pixels; all cooking hardware
and light pools remain immutable.

### E-I1 — idle 1

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Uses idle frame 1
Input images: Image 1 is the master and coordinate source; Image 2 is accepted K-I1 for overlap reference.

Isolate one compact hard-edged steam cluster directly above the approved cooking vessel at its exact master coordinate. Use a few opaque chunky pale-gray pixel groups. Include no vessel, chef, stall, light, glow, shadow, or other prop.

Output one 1147 × 904 PNG on flat #ff00ff. No translucent mist, blur, antialiasing, gradient, or texture.
```

### E-I2 — idle 2

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Uses idle frame 2
Input images: Image 1 is accepted E-I1 and the edit target; Image 2 is the master.

Change only the upper few steam pixels into the next restrained rising shape. Keep the emission/contact coordinate fixed and keep the same compact envelope, colors, pixel scale, and total visual weight. Include no other pixel.

Output one 1147 × 904 PNG on flat #ff00ff. No vessel movement, mist, blur, partial-alpha fringe, gradient, rescale, or translation.
```

### E-H1 — hover 1

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Uses hover frame 1
Input images: Image 1 is accepted E-I1 and the edit target.

Preserve the idle-1 steam effect exactly, with no added or removed art pixel. Output the same full 1147 × 904 magenta-keyed effect cel. Do not add any hover effect.
```

### E-H2 — hover 2

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Uses hover frame 2
Input images: Image 1 is accepted E-H1 and the edit target.

Preserve the hover-1 steam effect exactly, with no added or removed art pixel. Output the same full 1147 × 904 magenta-keyed effect cel. The gesture exists only in the keeper.
```

### E-H3 — hover 3

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Uses hover frame 3
Input images: Image 1 is accepted E-H2 and the edit target.

Preserve the hover-2 steam effect exactly, with no added or removed art pixel. Output the same full 1147 × 904 magenta-keyed effect cel. The nod/open palm exists only in the keeper.
```

## Acceptance checklist

- [ ] U was adopted unchanged unless a documented defect justified Prompt S.
- [ ] Sign, secondary lettering, structure, patrons, props, and floor contact
      are the approved Uses design and remain byte-identical across composites.
- [ ] Every cel is exactly `1147 × 904` in master coordinates.
- [ ] Root delta and torso-x delta across all keeper cels are `(0, 0)`.
- [ ] Idle 2 changes only blink plus one tiny finger/eyebrow region.
- [ ] Hover reads: eye contact/chin; two-finger indication; open palm/nod.
- [ ] The chef remains severe, disciplined, and controlled.
- [ ] Steam stays inside one fixed effect envelope; its origin never moves.
- [ ] No cel contains structure or unrelated props.
- [ ] Flat color, near-black outline, chunky shading, hard light, clean key,
      motion masks, onion skins, and Chrome in-scene checks pass.
- [ ] No street or audio asset changed.
