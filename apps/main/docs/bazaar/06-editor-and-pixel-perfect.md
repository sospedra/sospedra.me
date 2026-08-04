# 06 — the grid and the in-page layout editor

Pixel-perfect placement of AI assets needs a human hand at the end. The
answer was an editor that lives INSIDE the page, edits the real DOM, and
exports intent as JSON that gets baked back into code.

## Why in-page

Any external tool (Figma, a canvas playground) edits a copy. The bazaar's
layout is CSS math over live viewport units; only the page itself renders
the truth. So the editor mounts as a dev overlay on the real route
(HUD -> EDITOR ON), manipulates inline styles on the real elements, and
the human sees exactly what ships while dragging it.

## The toolset (as evolved across two versions)

- PICKING: smallest-target-under-pointer via `document.elementsFromPoint`
  collecting `[data-edit-id]` ancestors, sorted by area. Occluded props
  stay selectable behind bigger boxes — the single most important picking
  decision.
- DRAG = move (style.translate). Every touched element is tracked in a
  Set for export.
- SCALE v1: one corner grabber, independent X/Y from pointer-to-origin
  ratios. Too twitchy and it distorted aspect by default.
- SCALE v5 (bazaar5): EIGHT handles. Corners scale with aspect LOCKED
  (one uniform factor from the outward diagonal). Edges scale one axis
  (top/bottom = Y only, left/right = X only). Sensitivity DAMPED: a full
  element-width of drag changes scale by 40% (`SCALE_DAMP = 0.4`) —
  the v1 editor grew/shrank too fast per pixel of mouse movement.
  transform-origin stays bottom-center: things sit on floors.
- Z / DIM / BRIGHT / OPACITY nudge buttons (z-index, brightness filter,
  opacity steppers).
- ANCHORING: "set anchor" then click a target; exports carry
  `anchor`,`ax`,`ay` (offset relative to the anchor's rect). This is how
  props survive responsive relayouts: anchored-to-stall items move with
  their stall.
- INVENTORY (v1 only): a drawer of all 92 deco sprites + 7 glow colors
  spawnable onto the centered floor. bazaar5 dropped it (final assets
  only).
- DELETE: spawned items vanish; manifest items hide and land in a
  `removed[]` list in the export.
- EXPORT: `copy layout` puts JSON on the clipboard:
  `{ su, items: [{id, floor, x, y, w, h, scale, scaleY, z, bright,
  opacity, anchor?, ax?, ay?}], removed }` — coordinates in SIM UNITS
  (su), measured band-locally against the floor's `[data-stage]` element.
  Band-local origin fixed a whole class of drift bugs (early exports
  measured from the viewport and guessed).

## The bake-responsively doctrine

The exported JSON is INTENT, not absolutes. The human drags things where
they look right at one viewport; the supervisor decodes the JSON into
responsive rules: tune factors (console x0.86), gap rules, anchor
offsets, z-normalization. "Don't just apply these — update in a
harmonious way and responsively" was the standing order. Editor sessions
produced ~4 landed layout JSONs for bazaar4; each was translated, never
pasted.

## The grid

A 5vw x 5svh labeled overlay grid (HUD toggle) for talking about
positions in shared coordinates, plus HITBOX mode outlining every
interactive box (stall wraps, stairs areas). Both exist because
art-direction conversations need nouns: "sign down to 1491", "talks
overflows the band to 1609" only work when both sides see the same
ruler.

## The su space

Everything exports in sim units: su = floor height / 597 measured live.
Sim units are the bridge between three worlds: the asset pipeline's
canvas pixels, the CSS layout's calc() math, and the editor's screen
pixels. One unit, three renderers.
