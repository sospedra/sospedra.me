# Manual ImageGen production prompts — archived pre-override version

> **DO NOT USE THIS FILE TO GENERATE OR VERIFY NEW MANUAL ART.**
>
> It records the superseded four-arm/pedestal design. The current Manual
> contract is the floating, exactly-three-eye-stalk, exactly-three-arm robot in
> [`manual-integrated-bay-camera-locked.md`](../manual-integrated-bay-camera-locked.md).
> That prompt and `INTEGRATION_BIBLE.md` section 33 override every conflicting
> statement below. This legacy text remains only as provenance for the rejected
> design.

Normative source: `../ART_DIRECTION.md`. No street-level or audio work is
authorized.

Manual preserves the approved cheerful service robot, organized repair stall,
and visual pun: “manual” means both instructions and manual labor.

## Reference roles

- **A / edit target and identity authority:**  
  `public/images/bazaar2/assets/stall-manual-baked.png`, canonical canvas
  `988 × 1310`. Preserve its steel frame, chain-hung patchwork `manual` sign,
  dark parts wall, counter, organized cubbies, cans, tools, cables, lamp,
  exactly three-eyed/four-armed round service robot, and pedestal.
- **U / primary rendering reference only:** `stall-uses-baked.png`.
- **G / secondary rendering reference only:** `stall-games-baked.png`.
- **Pose references only:** the five full-frame
  `stall-manual-{idle-1,idle-2,hover-1,hover-2,hover-3}.png` images. The written
  card wins on any discrepancy.
- **Forbidden:** every `stall-manual-keeper-*.png`; those legacy files depict
  the Uses chef, not the Manual robot. The `stall-manual-customer-*` files are
  also not keeper references.

The accepted normalized master is **M**. All new cels use M’s complete
`988 × 1310` coordinate system on flat `#ff00ff`.

## Locked design and motion envelopes

- The robot always has exactly three eye stalks/eyes and exactly four connected
  articulated arms. Never add, lose, merge, or disconnect one.
- The round torso and pedestal are rigid and fixed in every frame.
- Fixed keeper regions: pedestal/contact, torso circumference, shoulder
  sockets, four arm roots, and eye-stalk bases.
- Keeper envelope: three pupils; slight eye-stalk bow at their joints; four
  arms articulated only from fixed sockets; existing duster, wrench/lamp, and
  available claws.
- Tools carried by a moving claw belong to the keeper. Parts wall, bins,
  counter, instruction slip stack, and all stall props are immutable.
- Effect envelope: one tiny static spark near the working tool and a compact
  hard-edged lamp pool. It never reaches the sign or parts bins.
- The personality remains capable, courteous, fussy, and delighted to help.
- The customer is the camera/viewer.

## Prompt S — static normalization

```text
Use case: style-transfer
Asset type: production master sprite for the Manual stall
Input images: Image 1 is Manual and the absolute edit target/identity/composition authority; Image 2 is Uses, primary rendering reference only; Image 3 is Games, secondary readability reference only.

Restyle Image 1 without redesigning it. Preserve its exact 988 × 1310 canvas, crop, silhouette, steel frame, chains, patchwork "manual" sign, dark workshop, shelves, organized labeled-by-shape parts cubbies, counter, cans, tools, cables, lamp, robot coordinate, pedestal, round torso, exactly three eyes, exactly four connected arms, and all approved occlusion.

Reduce rendering density into flatter limited colors, strong near-black outlines, crisp chunky 16-bit-inspired clusters, normally three hard tones per material, sparse dither, hard light, and readable material groups like Uses/Games. Keep the stall highly organized and the robot cheerful. Do not copy any Uses/Games subject, sign, palette, or structure.

Output one 988 × 1310 PNG on perfectly uniform #ff00ff chroma key. Magenta fills all exterior/open gaps without texture, shadow, gradient, reflection, floor, or variation; no #ff00ff in the art.

Do not move, rescale, rotate, mirror, recrop, add, remove, reconnect, redesign, or professionalize any component. Never change the eye/arm count. No painterly AI detail, smooth gradient, antialiasing, fuzzy edge, glossy 3D, extra character, extra readable text, watermark, street element, or audio reference.
```

## Keeper prompts

Keeper cels contain the complete robot plus tools held by its arms. They contain
no pedestal hardware that is part of the fixed counter/base and no stall pixel.

### K-I1 — idle 1

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Manual idle frame 1
Input images: Image 1 is M and the edit source; the approved idle-1 full frame is pose reference only.

Isolate the complete visible service robot at the exact master coordinate. Keep its rigid round torso, fixed pedestal/contact, exactly three eyes, and exactly four connected arms. Each arm remains occupied as approved: duster work, wrench/lamp work, and two available claws. Preserve every arm root and the happily industrious neutral pose.

Output one 988 × 1310 PNG containing robot and carried tools only on flat #ff00ff. No sign, frame, chain, shelves, counter, parts, bins, fixed lamp hardware, pedestal base plate, spark, light pool, shadow, or structure. No translation, rescale, recrop, mirroring, extra eye/arm/tool, antialiasing, gradient, or added detail.
```

### K-I2 — idle 2

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Manual idle frame 2
Input images: Image 1 is accepted K-I1 and the edit target; Image 2 is M; the approved idle-2 full frame is pose reference only.

Change only the three pupils so they scan in three slightly different approved directions. Preserve all three eye outlines and stalks, the round torso, fixed pedestal/contact, every shoulder socket, all four arms, every joint, every tool, and both available claws pixel-identically. No arm displacement and no body movement.

Output one 988 × 1310 robot-and-carried-tools-only cel on flat #ff00ff. The optional spark belongs to the effect cel. No structure, translation, rescale, recrop, mirroring, antialiasing, or new detail.
```

### K-H1 — hover 1

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Manual hover frame 1
Input images: Image 1 is accepted K-I1 and the edit target; Image 2 is M; the approved hover-1 full frame is pose reference only.

Snap all three pupils toward the customer in a quick visual cascade. Pause the working arms without moving their roots: retain the same arm coordinates but change only tiny claw/tool tension pixels if needed to read as stopped. Keep torso and pedestal absolutely rigid.

Output one 988 × 1310 keeper-only cel on flat #ff00ff. Exactly three eyes and four connected arms remain. No stall, effect, body translation, rescale, recrop, mirroring, antialiasing, or extra detail.
```

### K-H2 — hover 2

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Manual hover frame 2
Input images: Image 1 is accepted K-H1 and the edit target; Image 2 is M; the approved hover-2 full frame is pose reference only.

Perform a miniature courteous bow using only the three eye-stalk joints: dip the eye heads together while every eye-stalk base remains fixed. Keep the round torso and pedestal rigid. Articulate the four arms only from their fixed sockets: tuck tools slightly aside, turn the lamp inward, and open one available claw politely toward the customer.

Stay inside the declared eye/arm envelope and keep all four arm roots registered. Output one 988 × 1310 keeper-only cel on flat #ff00ff. Never add/remove an eye or arm. No structure, torso deformation, translation, rescale, recrop, mirroring, antialiasing, or new prop.
```

### K-H3 — hover 3

```text
Use case: precise-object-edit
Asset type: full-canvas keeper cel, Manual hover frame 3
Input images: Image 1 is accepted K-H2 and the edit target; Image 2 is M; the approved hover-3 full frame is pose reference only.

Raise the three eye heads back to their neutral height with all pupils warmly attentive. Use one open claw to present the approved counter/instruction-slip area; articulate the other arms into a cautious partial return to their original chores. Keep every socket/root fixed and keep the round torso/pedestal rigid.

Output one 988 × 1310 keeper-only cel on flat #ff00ff. Exactly three eyes and four connected arms remain. Do not draw the counter or instruction slip in this cel. No translation, rescale, recrop, mirroring, antialiasing, or added detail.
```

## Effect prompts

Effect cels contain only the tiny spark and/or compact lamp pool. Tools and lamp
housing travel with the keeper; structure never changes.

### E-I1 — idle 1

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Manual idle frame 1
Input images: Image 1 is M; Image 2 is accepted K-I1.

Create only the approved compact hard-edged lamp pool aligned to the carried lamp and its fixed work area. Use a small opaque warm three-tone pixel cluster. Include no lamp housing, robot, tool, counter, part, structure, glow fog, or shadow.

Output one 988 × 1310 PNG on flat #ff00ff. No blur, gradient, antialiasing, or partial-alpha fringe.
```

### E-I2 — idle 2

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Manual idle frame 2
Input images: Image 1 is accepted E-I1 and the edit target; Image 2 is M; Image 3 is accepted K-I2.

Preserve the lamp pool exactly and add one tiny hard two- or three-cluster static spark at the approved working-tool coordinate. The spark stays inside its micro-mask and touches no structure.

Output one 988 × 1310 effect-only PNG on flat #ff00ff. No robot, tool housing, mist, blur, gradient, antialiasing, or extra light.
```

### E-H1 — hover 1

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Manual hover frame 1
Input images: Image 1 is accepted E-I1 and the edit target; Image 2 is accepted K-H1.

Keep the compact lamp pool but remove the spark because the working arms have paused. Do not add any other effect.

Output one 988 × 1310 effect-only PNG on flat #ff00ff. No robot, structure, blur, gradient, translation, or rescale.
```

### E-H2 — hover 2

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Manual hover frame 2
Input images: Image 1 is accepted E-H1 and the edit target; Image 2 is accepted K-H2.

Reposition only the compact hard lamp pool so it aligns with the lamp turned inward by the keeper. Keep its size, colors, pixel count, and hard shape family stable; movement stays inside the lamp-effect envelope. No spark.

Output one 988 × 1310 effect-only PNG on flat #ff00ff. No structure, robot, blur, gradient, or full-layer translation.
```

### E-H3 — hover 3

```text
Use case: precise-object-edit
Asset type: full-canvas effect cel, Manual hover frame 3
Input images: Image 1 is accepted E-H2 and the edit target; Image 2 is accepted K-H3.

Move only the compact lamp pool toward its cautious work-resumption alignment. Do not restore the spark. Keep size, colors, hard pixels, and effect envelope unchanged.

Output one 988 × 1310 effect-only PNG on flat #ff00ff. No robot, structure, blur, gradient, rescale, or unrelated effect.
```

## Acceptance checklist

- [ ] The master preserves the exact Manual stall, sign, organized parts, and
      cheerful robot.
- [ ] Every frame has exactly three eyes and four connected arms.
- [ ] Every cel is exactly `988 × 1310` in M coordinates.
- [ ] Pedestal/contact, torso, shoulder sockets, arm roots, and eye-stalk bases
      have zero delta.
- [ ] Idle 2 changes only pupils plus the effect spark.
- [ ] Hover reads: eye cascade/pause; miniature eye-stalk bow/open claw; rise
      and present while work resumes.
- [ ] Lamp/spark remain inside declared effect masks.
- [ ] No static part, counter, sign, or structure leaks into a dynamic cel.
- [ ] Flat rendering, grid, palette, key, alpha, masks, onion skin, immutable
      hashes, and Chrome scene checks pass.
- [ ] No street or audio asset changed.
