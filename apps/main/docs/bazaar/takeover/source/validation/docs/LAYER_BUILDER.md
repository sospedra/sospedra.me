# Bazaar3 deterministic layer builder

`build-layers.mjs` converts one approved full composite into registered static
and animated plates without asking an image model to redraw the whole stall.
Every operation happens on the authored 320×421 grid. Outputs are enlarged with
nearest-neighbor 3× pixels to 960×1263, then receive one canonical transparent
row for the required 960×1264 canvas.

## Inputs

- `master`: the accepted 960×1264 PNG. Its first 1263 rows must be uniform 3×3
  blocks and its final row must contain only zero RGBA bytes.
- `background`: the processed robot-free/replacement scene, either logical
  320×421 or validated output-sized 960×1264.
- `mask`: exactly 320×421 with binary alpha and two explicit labels:
  - transparent: immutable area copied from the master;
  - white (`#ffffff`): replace the rear with background pixels;
  - red (`#ff0000`): replace the rear and lift the corresponding master pixels
    into the front plate.
- optional isolated keeper/effect PNGs, in logical or declared output space.

All visible inputs must use binary alpha. Any partial alpha is a hard failure.

## Layer result

The builder writes:

- `rear.png`: master outside the mask, robot-free background inside it;
- `keeper.png`: isolated keeper on the exact shared canvas;
- `effect.png`: optional isolated effect on the exact shared canvas;
- `front.png`: mask-labelled master pixels that must occlude the keeper;
- `composite.png`: rear → keeper → effect → front;
- `layer-build-report.json`: hashes, dimensions, alpha/block evidence,
  source/placed bboxes, anchor math, clipping, and master-preservation counts.

Both rear and composite are compared to the decoded RGBA master after export.
Every output pixel outside the upscaled mask—including the padding row—must
match byte for byte.

## Exact placement

Use one placement mode per isolated input:

```sh
--keeper-at 107,203
```

or anchor a known source pixel to a known stall pixel:

```sh
--keeper-anchor 109,205 \
--keeper-source-anchor 2,2
```

Lock the final visible extent as another independent invariant:

```sh
--expect-keeper-bbox 108,204,3,4
```

All placement and bbox values are logical pixels. Effect flags use the same
names with `keeper` replaced by `effect`. Opaque isolated pixels outside the
mask fail by default. `--allow-outside-mask-clipping` is explicit, reported,
and still cannot alter the master outside the mask.

## Example

```sh
node scripts/bazaar3/build-layers.mjs \
  --master work/projects-master.png \
  --background work/projects-robot-free.png \
  --background-space output \
  --mask work/projects-layer-mask.png \
  --keeper work/projects-keeper.png \
  --keeper-space logical \
  --keeper-anchor 160,389 \
  --keeper-source-anchor 48,118 \
  --expect-keeper-bbox 113,271,94,119 \
  --effect work/projects-water.png \
  --effect-at 91,302 \
  --expect-effect-bbox 91,302,38,52 \
  --out-dir public/images/bazaar3/assets/stalls/projects/desktop
```

The SHA-256 values in this utility are decoded RGBA-buffer hashes. Freeze the
accepted master with `--expect-master-sha256`; changing PNG compression alone
will not invalidate its approved pixels.

Run the synthetic proof:

```sh
node scripts/bazaar3/layer-builder-self-test.mjs
```
