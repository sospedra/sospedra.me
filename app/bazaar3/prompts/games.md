# Games ImageGen production prompts

Normative source: `../ART_DIRECTION.md`. No street-level or audio work.

Games is, with Uses, a rendering Gospel. Its cheap kid-made wood/plastic stall
and the two approved siblings must remain distinct. Integration must never turn
it into professional retail fabrication.

## Reference roles

- **G / master, identity, construction, and secondary style authority:**  
  `public/images/bazaar2/assets/stall-games-baked.png`, canonical canvas
  `1131 × 1325`. Preserve its improvised post and `games` sign, sagging bulbs,
  wood floor/back wall, blue arcade cabinet, shelves, old consoles/cartridges,
  plastic bins, controllers/cables, crates, and the exact two children sharing
  the handheld.
- **U / primary rendering reference only:**  
  `stall-uses-baked.png`: outline hierarchy, flat materials, hard light,
  readable value grouping. Copy no Uses content.
- **Pose references only:** the five full-frame
  `stall-games-{idle-1,idle-2,hover-1,hover-2,hover-3}.png` images. Written
  behavior is authoritative.
- **Forbidden:** all `stall-games-keeper-*.png`; those legacy crops change the
  children’s designs/outfits and are not identity authority.

Adopt G unchanged as **M** when deterministic extraction succeeds. Every new
cel uses the full `1131 × 1325` M coordinates on flat `#ff00ff`.

## Locked design and motion envelopes

- Preserve the exact sister and brother from G: faces, hair, relative height,
  clothing, lower bodies, shoes, relationship, and shared handheld.
- The sister is confident, social, and delighted by a new challenger. The
  brother is serious, suspicious, and protective of the choice.
- Each child has an independent fixed foot/pelvis root and independent fixed
  torso x-coordinate.
- Both lower bodies remain pixel-identical in all five frames. No bounce,
  sway, step, weight shift, or body displacement.
- Stall, sign, bulbs, arcade, shelves, consoles, cartridges, bins,
  controllers, cables, floor, and all props are immutable.
- Keeper envelope: eyes/eyebrows/head angle; hands/fingers on the handheld;
  sister’s one waving/presenting arm; brother’s forearms closing/folding or one
  small deciding gesture. Shoulder roots remain registered.
- Sister’s large wave may extend only into the approved open interior above and
  beside her; it must not touch the sign, bulbs, arcade, stairs, or hitbox edge.
- Effect envelope: handheld screen pixels and one or two button pixels only.
  The handheld housing travels with the keeper and never rescales.
- The customer is the camera/viewer.

## Static policy and emergency preservation prompt

G is already accepted style. Use this only for a reviewed extraction defect.

```text
Use case: precise-object-edit
Asset type: production master sprite for the Games stall
Input images: Image 1 is the approved Games edit target and absolute identity/composition/construction authority; Image 2 is Uses, outline/value reference only.

Change only the documented defect. Preserve Image 1’s exact 1131 × 1325 canvas, crop, footprint, handmade cheap-wood/plastic construction, improvised sign and lettering, bulbs, arcade, shelves, old hardware, bins, controllers, cables, floor, props, and every asymmetrical joint.

Preserve the exact same two children, faces, hair, clothes, heights, lower bodies, shoes, coordinates, roots, relationship, and shared handheld. Do not age, recast, restyle, replace, reposition, or professionalize them or the stall. Games already has the required flat colors, strong near-black outlines, chunky 16-bit-inspired shapes, hard three-tone shading, sparse texture, and readable clutter.

Output one 1131 × 1325 PNG on perfectly uniform #ff00ff chroma key. Magenta fills all exterior/open gaps with no gradient, texture, shadow, floor, reflection, glow, or variation; no #ff00ff in the art.

No redesign, cleanup, symmetry, new frame, new sign, new prop, smooth gradient, painterly detail, antialiasing, fuzzy edge, glossy 3D, extra character, extra readable text, watermark, street element, or audio reference.
```

## Keeper prompts

Each keeper cel contains both complete children and the handheld housing. It
contains no stall or floor. The two roots and both lower bodies are compared
against K-I1 byte-for-byte.

### K-I1 — idle 1

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Games idle frame 1
Input images: Image 1 is M and the edit source; the approved idle-1 full frame is pose reference only.

Isolate the exact two approved siblings and shared handheld at their master coordinates. The sister confidently plays while the brother studies the screen with unusual seriousness. Preserve both identities, hair, outfits, relative height, independent foot/pelvis roots, torso x-coordinates, complete lower bodies, shoes, shoulder roots, and handheld scale/location.

Output one 1131 × 1325 PNG containing both children and the handheld housing only on flat #ff00ff. No stall, sign, bulb, arcade, shelf, bin, controller, floor, shadow, screen glow, or prop. No hidden-body invention, translation, rescale, recrop, mirroring, bounce, antialiasing, gradient, or added detail.
```

### K-I2 — idle 2

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Games idle frame 2
Input images: Image 1 is accepted K-I1 and the edit target; Image 2 is M; the approved idle-2 full frame is pose reference only.

Change only tiny eye/eyebrow reactions and one finger/button depression on the shared handheld. Keep both head outlines, torsos, shoulder roots, arms outside the finger mask, handheld housing, independent roots, and both complete lower bodies pixel-identical. There is no bouncing or body displacement.

Output one 1131 × 1325 children-and-handheld-only cel on flat #ff00ff. Screen/button light belongs to the effect cel. No structure, translation, rescale, recrop, mirroring, antialiasing, or new detail.
```

### K-H1 — hover 1

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Games hover frame 1
Input images: Image 1 is accepted K-I1 and the edit target; Image 2 is M; the approved hover-1 full frame is pose reference only.

The sister looks up at the viewer with immediate excitement. The brother keeps his torso fixed and gives the viewer a suspicious sideways look. Change only eyes, eyebrows, and small head angles around fixed neck/root chains. Keep the handheld in its established shared anchor.

Preserve both torso x-coordinates, shoulder roots, independent pelvis/foot roots, complete lower bodies, clothing, scale, and coordinates. Output one 1131 × 1325 keeper-only cel on flat #ff00ff. No stall, body slide, bounce, rescale, recrop, or new detail.
```

### K-H2 — hover 2

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Games hover frame 2
Input images: Image 1 is accepted K-H1 and the edit target; Image 2 is M; the approved hover-2 full frame is pose reference only.

Keep the sister’s excited eye contact and articulate one arm into an enormous readable wave inside the approved open-space envelope: "NEW CHALLENGER!!!" The wave is large because the arm extends, not because her torso moves. Keep her other hand/handheld anchor registered. Articulate only the brother’s forearms into a more protective closed posture while he keeps his suspicious look.

Keep both shoulder roots, torsos, independent roots, complete lower bodies, shoes, scale, and coordinates fixed. Output one 1131 × 1325 children-and-handheld-only cel on flat #ff00ff. Do not draw text. No body translation, bounce, rescale, recrop, mirroring, extra limb, or structure.
```

### K-H3 — hover 3

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Games hover frame 3
Input images: Image 1 is accepted K-H2 and the edit target; Image 2 is M; the approved hover-3 full frame is pose reference only.

Articulate the sister’s waving arm into an inviting presentation toward the available game/handheld: "Best of three?" Keep the handheld anchored by the other hand. Articulate the brother’s forearms into folded arms OR one compact deciding gesture: "I choose." His expression remains cautious rather than hostile.

Keep both torsos, shoulder roots, pelvis/foot roots, complete lower bodies, shoes, scale, and coordinates fixed. Output one 1131 × 1325 keeper-only cel on flat #ff00ff. Do not add text, a new game box, or another controller. No body translation, rescale, recrop, mirroring, or structure.
```

## Effect prompts

Effects contain only handheld screen/button pixels. Bulbs, arcade screen,
environment, and all stall lighting remain immutable.

### E-I1 — idle 1

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Games idle frame 1
Input images: Image 1 is M; Image 2 is accepted K-I1.

Create only the tiny approved handheld screen state and its resting button highlights, aligned exactly inside the keeper’s handheld housing. Use a few opaque hard pixel clusters with no readable text.

Output one 1131 × 1325 effect-only PNG on flat #ff00ff. No handheld housing, hands, children, arcade light, bulb, stall, shadow, blur, gradient, antialiasing, or soft glow.
```

### E-I2 — idle 2

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Games idle frame 2
Input images: Image 1 is accepted E-I1 and the edit target; Image 2 is accepted K-I2.

Change only the handheld screen into one compact flash/frame advance and one button highlight to match the pressed finger. Keep screen bounds, device coordinate, palette, and pixel scale fixed. No readable text.

Output one 1131 × 1325 effect-only PNG on flat #ff00ff. No housing, child, structure, blur, gradient, translation, or rescale.
```

### E-H1 — hover 1

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Games hover frame 1
Input images: Image 1 is accepted E-I1 and the edit target; Image 2 is accepted K-H1.

Keep the handheld screen within the same bounds and change it to one small paused/challenger icon made from abstract pixels only. Keep button highlights dim. Do not add text.

Output one 1131 × 1325 effect-only PNG on flat #ff00ff. No environment, blur, gradient, translation, or rescale.
```

### E-H2 — hover 2

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Games hover frame 2
Input images: Image 1 is accepted E-H1 and the edit target; Image 2 is accepted K-H2.

Preserve the hover-1 screen icon and bounds exactly. Add no sparkle to the wave; the gesture must read from silhouette.

Output the same 1131 × 1325 effect-only PNG on flat #ff00ff.
```

### E-H3 — hover 3

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Games hover frame 3
Input images: Image 1 is accepted E-H2 and the edit target; Image 2 is accepted K-H3.

Change only the handheld screen’s abstract icon into a compact ready/selection state. Preserve screen bounds, device coordinate, colors, and pixel scale. No readable text and no new effect outside the screen/button mask.

Output one 1131 × 1325 effect-only PNG on flat #ff00ff. No housing, child, structure, blur, gradient, translation, or rescale.
```

## Acceptance checklist

- [ ] G remains the approved kid-made cheap wood/plastic stall; it was not
      professionalized or uniformized.
- [ ] The same two children, outfits, proportions, height relationship, and
      handheld remain.
- [ ] Every cel is exactly `1131 × 1325` in M coordinates.
- [ ] Both independent roots, torso-x coordinates, complete lower bodies, and
      shoes have zero delta across all five keeper cels.
- [ ] Idle 2 changes only eyes/eyebrows/finger and screen/button pixels.
- [ ] Hover reads: excited/suspicious looks; enormous sister wave/protective
      brother; inviting presentation/brother chooses.
- [ ] Wave remains inside its envelope and never causes torso displacement.
- [ ] Only handheld screen/button pixels occur in effects.
- [ ] Static hashes, key, alpha, grid, palette, masks, onion skins, and Chrome
      desktop/mobile checks pass.
- [ ] No street or audio asset changed.
