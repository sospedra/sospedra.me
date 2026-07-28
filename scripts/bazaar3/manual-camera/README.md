# Manual camera lock and verifier

This subtree is the deterministic camera gate for the Bazaar3 Manual stall.
It does **not** generate art and it does not approve art automatically.

The visual authority is:

`public/images/bazaar3/assets/stalls/uses/frames/idle-1.png`

The guide translates that authority into a strict Manual layout:

- straight frontal elevation;
- parallel projection with no vanishing point;
- horizontal overhead beam, rear bands, counter, floor strips, and trench;
- vertical and parallel left/right uprights;
- one shallow counter-top band, never a deep trapezoid;
- the robot floating in the rear aisle **behind** the counter;
- the counter occluding the robot's lower assembly;
- a shallow front floor/trench stack rather than a receding floor plane.

## Build the guide

From the repository root:

```sh
node scripts/bazaar3/manual-camera/build-guide.mjs
```

Outputs:

- `scripts/bazaar3/manual-camera/artifacts/manual-camera-guide-960x1264.png`
- `scripts/bazaar3/manual-camera/artifacts/manual-camera-generation-guide-960x1264.png`
- `scripts/bazaar3/manual-camera/artifacts/manual-camera-guide.json`

The first PNG is annotated for human review. Do not attach it to ImageGen:
labels, arrows, dimensions, and guide marks could be copied into the render.

Attach `manual-camera-generation-guide-960x1264.png` and the JSON-derived
layout rules to the Manual generation prompt alongside Uses and the approved
Manual identity references. This ImageGen-facing guide contains only flat
structural masses: rear wall, beam/uprights, rear aisle strip, robot envelope,
counter, floor, trench, and front lip. Its draw order makes the counter
physically occlude the lower robot envelope. It fixes the camera and spatial
arrangement without prescribing the final robot design.

## Audit a candidate

```sh
node scripts/bazaar3/manual-camera/verify-camera.mjs /absolute/path/to/candidate.png
```

To choose a report directory:

```sh
node scripts/bazaar3/manual-camera/verify-camera.mjs \
  /absolute/path/to/candidate.png \
  --out-dir scripts/bazaar3/manual-camera/reports/candidate-name
```

Use `--no-fail` when deliberately auditing a known-bad reference:

```sh
node scripts/bazaar3/manual-camera/verify-camera.mjs \
  /absolute/path/to/known-bad.png \
  --out-dir scripts/bazaar3/manual-camera/reports/known-bad \
  --no-fail
```

Each audit emits:

- `camera-audit.json`: measurements and detected line evidence;
- `camera-audit.md`: readable acceptance report;
- `camera-audit-overlay.png`: green expected lines, red suspect diagonals,
  yellow convergence candidates, and cyan analysis ROIs;
- `analysis-normalized.png`: a temporary 480×632 analysis copy. The source is
  never overwritten.

The verifier uses two complementary detectors:

- Hough evidence measures long architectural angles.
- Segmented row/column edge density recovers straight horizontal and vertical
  pixel-art lines interrupted by bolts, posts, props, texture, or occlusion.

Perspective diagonals are audited only in structural zones: the outer frame,
top beam, rear-wall borders, counter top/outer border, and floor/trench
borders. The central robot and the inventory-filled counter front are excluded
because arms, tools, gears, bins, and cables are not camera evidence.

## Acceptance thresholds

Production delivery:

- exact canvas: **960×1264**;
- aspect relative error: pass at **≤1%**, warning at **≤2.5%**, fail above it.

Camera evidence on the 480×632 analysis copy:

- at least **2** counter horizontals within **±3.5°** of 0°, each spanning at
  least **200 px**;
- at least **1** left and **1** right upright within **±3.5°** of 90°, each
  spanning at least **225 px**;
- at least **1** overhead horizontal spanning **235 px**;
- at least **1** floor/trench horizontal spanning **260 px**;
- no more than **2** suspicious architectural diagonals between **7° and 75°**
  with a span of at least **115 px**;
- **0** plausible opposite-slope convergence pairs.

The central robot zone is excluded from the rear-architecture diagonal audit so
three arms, tools, and eye stalks do not automatically fail the stall. The
counter-front inventory interior is excluded for the same reason. Long tools,
cables, and signs crossing a structural border can still be false positives.

## Required human review

A machine PASS is necessary but not sufficient. Before accepting a Manual
render, visually confirm:

1. The camera matches Uses: straight-on, parallel, unrotated.
2. No shelf, wall, counter, floor tile, or trench edge converges.
3. The counter top is a shallow band and its front is horizontal.
4. The robot floats in open rear-aisle space behind the counter.
5. The counter visibly overlaps the robot's lower assembly; the robot is not
   attached to it, standing on it, or emerging from it.
6. Architectural uprights remain vertical.
7. Robot identity, eye/arm count, palette, lighting, chunky rendering, and
   animation locks pass their separate checks.

Hough-line analysis is intentionally conservative. Broken, painterly, or
low-contrast edges may evade detection, while a long wrench or cable may be
flagged. Always inspect the annotated overlay and compare the art directly with
Uses and the guide.

## Normalize an approved near-target render

The camera gate audits composition. It does not create a production-sized
sprite. After a render passes camera review and its source aspect differs by no
more than 2.5%, create a non-destructive derived delivery:

```sh
node scripts/bazaar3/manual-camera/normalize-delivery.mjs \
  /absolute/path/to/candidate.png \
  --out-dir scripts/bazaar3/manual-camera/reports/candidate-name/delivery \
  --colors 24
```

The source is never overwritten. The normalizer:

1. auto-orients the source;
2. uses a centered, aspect-preserving cover crop, refusing to discard more than
   3% of source area;
3. downsamples to the authored **320×421** canvas;
4. quantizes to the requested palette without dithering;
5. enlarges exactly 3× with nearest-neighbor to **960×1263**;
6. explicitly duplicates row 1262 into the required final row 1263, producing
   **960×1264**;
7. reruns the camera verifier on the derived output.

The delivery report separates:

- hard machine checks: aspect safety, crop safety, exact dimensions, camera,
  palette budget, 3× grid uniformity, and explicit final-row handling;
- advisory metrics: flat-area share, boundary contrast, dark-outline share,
  isolated-pixel share, and palette reduction;
- mandatory visual review: identity, arm/eye count, floating position,
  occlusion, rendering quality, lighting integration, and AI artifacts.

Machine PASS never constitutes art approval.

The current boundary/grid metrics are not the same perceptual q3/q4 metrics as
the external style card. Do not apply those entropy, connected-region, or dark
alpha-boundary thresholds as hard gates until they are measured by the same
posterization pipeline. They remain visual/advisory targets.

## Verify five registered animation frames

Use the generic manifest-driven verifier after all five full-frame deliveries
and their per-frame motion masks exist:

```sh
node scripts/bazaar3/manual-camera/verify-five-frame.mjs \
  scripts/bazaar3/manual-camera/manifests/manual-calibration.json
```

Override the report directory when needed:

```sh
node scripts/bazaar3/manual-camera/verify-five-frame.mjs \
  /absolute/path/to/stall-manifest.json \
  --out-dir /absolute/path/to/report
```

The manifest schema is:

`scripts/bazaar3/manual-camera/five-frame-manifest.schema.json`

The verifier requires exactly:

1. `idle-1`
2. `idle-2`
3. `hover-1`
4. `hover-2`
5. `hover-3`

It hard-fails missing frames, dimensions/final-row crop, nonbinary alpha,
palette family, nearest-neighbor grid, motion outside each frame’s mask,
immutable structure, sign/counter/floor/background, torso, root, all three
shoulder-root patches, distributed registration anchors, whole-frame
translation, and scale/crop evidence.

Each run emits:

- a five-frame contact sheet;
- a red/cyan onion sheet;
- a motion heatmap where orange is allowed motion, red is undeclared motion,
  and magenta changes a hard-locked region;
- frame/file/logical/structure/region hashes;
- JSON and Markdown audit reports.

The Manual calibration manifest intentionally points at the approved Candidate
4 normalized design master for `idle-1` and nonexistent future paths for the
other four states. Its audit currently **must fail** with four missing frames.
This prevents calibration geometry from being mistaken for finished animation.

Build the human positioning overlay:

```sh
node scripts/bazaar3/manual-camera/build-manual-registration-overlay.mjs
```

Output:

`scripts/bazaar3/manual-camera/artifacts/manual-design-registration-overlay-960x1264.png`

It shows the logical/delivery registration zones for the beam, columns, sign,
rear aisle receiver, eye stalks, torso center/box, three shoulder roots, arm
envelope, thruster, counter top/front, and floor/trench.

Run the synthetic regression suite:

```sh
node scripts/bazaar3/manual-camera/five-frame-self-test.mjs
```

The suite first proves a valid five-frame set passes, then proves that a
one-logical-pixel whole-frame shift, a one-logical-pixel inset scale/crop, and a
one-logical-pixel immutable sign mutation each hard-fail.
