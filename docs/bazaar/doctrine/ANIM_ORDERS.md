# r16 — animation frame orders

Thirty-two codex orders: 8 stalls × 4 frames. Frame 1/5 of every stall
is the accepted r15 static. The orders generate frames 2-5:

- idle2 — the second idle frame. The idle loop alternates static ↔ idle2.
- hover1, hover2, hover3 — hover plays 3 → 4 → 5 once and holds 5.

Motion content comes from the normative five-frame cards in
`app/bazaar3/ART_DIRECTION.md` §6. Invariants come from §5 and
INTEGRATION_BIBLE §22. Hover lighting (§10.5) is a runtime effect
layer and is explicitly NOT baked into any frame.

## Doctrine inversion vs r15

r15 statics demoted Image 1 to identity+color because attachments
anchor proportions harder than text. Frames want exactly that anchor.
Image 1 = the edit target and the law for every pixel outside one
declared motion region. Frames are scoped edit-mode passes, never
fresh generations.

## PATCH DOCTRINE — Uses proof, 2026-07-29. Supersedes whole-canvas frame edits.

Whole-canvas edits re-stage the stall: measured 17% (idle2) and 57%
(hover1) global drift on Uses. The motion executes, the registration
dies. DEAD mechanism for frames.

Frames are generated as PATCH edits instead (`prompts/r16p-*.md`,
`r16/patch-pipeline.mjs`):

1. Crop a window around the motion region from the base frame.
2. Nearest-upscale so window × scale = 1536×1024, the only exact
   image_gen size. Legal shapes: 384×256 @4, 768×512 @2.
3. Codex edits that canvas (PATCH LAW: same image, one change,
   border frozen, zero new colors).
4. Nearest-downscale, paste at exact coords onto the pristine base.
   Registration is mechanical.

Measured on Uses: 0.2-0.8% drift per frame, always boxed inside the
window. Laws learned:

- INTERIOR WINDOW LAW: the window must contain zero chroma pixels
  and no whole-composition cues (sign + lantern + green edge told
  the model "complete stall" and it re-framed everything into the
  canvas). Verify chroma count = 0 before sending. Measure the clean
  span from the render, never assume the box.
- Never slice a face with a window edge. Exclude the face entirely
  when the motion is body-only — an absent face cannot drift.
- IDENTITY PIN: face edits drift identity per attempt (hover1 grew a
  moustache). Pin clean-shaven/brows/eye-size explicitly, name the
  prior failure in the retry order.
- Two-region frames (Uses hover3 = nod + palm) = two parallel patch
  orders on non-overlapping duties; paste head first, torso second
  so the later paste owns the overlap rows.
- The final mask-restrict at assembly still applies: keep deltas
  only inside the authored motion mask, restore base elsewhere. Edge
  jitter inside the window dies there.

## Chain

- idle2 and hover1 edit the r15 static raw directly.
- hover2 edits the generated hover1. Image 2 = the static.
- hover3 edits the generated hover2. Image 2 = the static.

A rejected frame invalidates its downstream frames. Dispatch is
staged for that reason: `dispatch3.sh A` (16 gens), user gate,
`dispatch3.sh B` (8), gate, `dispatch3.sh C` (8).

## Sources

| stall   | edit target (frame 1/5)   | chroma  |
|---------|---------------------------|---------|
| uses    | r15/gen-uses.png          | #00ff00 |
| papers  | r15/gen-papers.png        | #ff00ff |
| manual  | r15/gen-manual.png        | #ff00ff |
| console | r15/gen-console-r15a.png  | #00ff00 |
| talks   | r15/gen-talks.png         | #00ff00 |
| w98     | r15/gen-w98-r15a.png      | #ff00ff |
| games   | r15/gen-games-r15a.png    | #ff00ff |
| travel  | r15/gen-travel-r15a.png   | #ff00ff |

If a newer static supersedes any of these, swap the edit target and
regenerate that stall's four frames.

## Card adaptations to rendered truth

- Travel: the static already holds the ticket up. Idle 1 = ticket-up.
  hover2 raises it higher; hover3 adds the route-pointing hand.
- w98: the robot stands upright sprinkling seeds, can at hip. The
  card's "stooped tipping the can" is superseded by the render.
- Talks: the selected tape rises from under the counter. Zero shelf,
  rack or cart pixels may change in any frame.

## Declared in-frame effects (everything else is frozen)

- papers idle2: scanline desync + fragment flicker (cyan only).
- console idle2: visor glyph tick.
- games idle2: handheld screen flash + one button.
- w98 idle2: falling-seed reshuffle; hover1+ : seed column empty.
- manual idle2: optional single 2-3 px spark.
- Frozen in ALL frames: uses steam, talks SMPTE bars + neon glow,
  games arcade screen + bulbs, travel candle flames + radar sweep,
  console rack LEDs + CRT static, w98 string bulbs + red lamp,
  manual lamps + thruster flame.

## Post-processing per accepted frame

1. Re-key: `node r10/key-official.mjs <raw> <out>` (same settings as
   the statics; re-key after every edit round).
2. Cel assembly, mechanical: diff frame alpha vs static alpha; keep
   deltas only inside the frame's motion mask; restore static pixels
   everywhere else. Immutable plates become byte-identical by
   construction, which is what bible §22 and the validation harness
   demand — diffusion noise outside masks never survives.
3. Motion masks are authored AFTER generation from the measured
   diffs (coordinate law: measure the render, never trust prompt
   coords).
4. Registration check before assembly: if the motion-region content
   lands offset from the order's envelope, reject the frame.

## Known failure modes to check at review

- Global re-render drift (tone shift across the whole image).
- Identity drift on retries: garment colors, sign shapes, face.
- Unauthorized readable text on props.
- Baked lighting change (any glow/brightness delta = reject).
- Torso translation or root slip (overlay-blink against the static).
