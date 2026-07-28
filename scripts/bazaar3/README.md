# Bazaar3 asset validation

This harness treats sprite registration as a production invariant, not a visual
guess. It validates the exported PNG buffers before an asset can enter Bazaar3.

## Master-generation gate

The complete generated floor is rejected or accepted **before** any crop,
keying, extraction, palette remap, downscale, or responsive reconstruction.
Run:

```sh
node scripts/bazaar3/verify-master-candidate.mjs \
  public/images/bazaar3/master-tests/<candidate>.png \
  --no-fail
```

This writes a JSON/Markdown audit, the canonical scene crop, a geometry overlay,
a style-failure overlay, a 416×199 logical inspection image, a 300px
readability preview, and a SHA-bound visual-review template under
`scripts/bazaar3/reports/master-candidates/<candidate>/`.

The automatic gate is intentionally strict:

- exact delivery/canonical canvas and disposable matte;
- opaque, exact shared semantic palette with no accidental shades;
- genuine 3× authored-pixel blocks and grid-aligned edges;
- limited effective palette;
- broad same-color masses;
- hard limits on isolated pixels and tiny components;
- local-entropy limits that expose pseudo-pixel texture;
- the canonical ceiling, wall/floor, fascia, and underside rails;
- proof that the verifier did not mutate the candidate.

The verifier does **not** resize, quantize, posterize, remap, or otherwise turn
a failed source into a passing derivative.

Machine checks cannot prove character identity or art direction. The generated
review template therefore makes every rendering, camera, integration,
lighting, Projects, Games, Travel, scale, text, and thumbnail question a hard
semantic gate. Fill every item with `pass` or `fail`, a concrete observation,
and evidence, then rerun:

```sh
node scripts/bazaar3/verify-master-candidate.mjs \
  public/images/bazaar3/master-tests/<candidate>.png \
  --review scripts/bazaar3/reports/master-candidates/<candidate>/review.json
```

Acceptance requires both:

1. every automatic check passes; and
2. every semantic check passes against the exact current candidate SHA.

A missing review, an unrun item, the explicit “richly textured pseudo-pixel
illustration” failure, any character substitution, or a stale SHA rejects the
candidate. User approval is stored as the same SHA and is additionally required
before production promotion. A render appearing in the generation tool stream
does not make it a keeper.

Run the deterministic regression suite with:

```sh
node scripts/bazaar3/master-candidate-self-test.mjs
```

It proves the canonical fixture passes and that missing visual review, a failed
style review, stale approval, pseudo-pixel grid damage, and incorrect canvas
dimensions all fail.

## Checks

- exact canvas width and height;
- alpha-channel policy (`opaque`, `binary`, or unrestricted);
- visible chroma-key residue, with per-color tolerance;
- maximum visible palette size;
- uniform authored-pixel blocks (normally 3×3);
- SHA-256 locks for immutable rear/front/static layers;
- identical dimensions for every cel in an animation;
- a byte-identical root/contact patch across all cels;
- fully opaque byte-identical torso/pelvis rectangles across all cels;
- all frame differences confined to an explicit alpha motion mask;
- family-wide palette equality/subset rules and maximum union size;
- a machine-readable JSON report with per-asset and per-animation evidence.

The root patch is deliberately stronger than storing an `(x, y)` label: the
pixels around the declared seat, pedestal, or foot contact must remain exactly
the same in every frame. The mask is a union of every pixel that may change.
Transparent mask pixels forbid change.

## Commands

Validate the manifest structure without requiring generated files:

```sh
node scripts/bazaar3/verify-assets.mjs \
  --manifest scripts/bazaar3/manifest.example.json \
  --schema-only \
  --no-report
```

Run a production manifest and write its report:

```sh
node scripts/bazaar3/verify-assets.mjs --manifest scripts/bazaar3/manifest.projects.json
node scripts/bazaar3/verify-assets.mjs --manifest scripts/bazaar3/manifest.console.json
node scripts/bazaar3/verify-assets.mjs --manifest scripts/bazaar3/manifest.travel.json
```

Run deterministic pass/fail fixtures:

```sh
node scripts/bazaar3/self-test.mjs
```

Build the approved full-frame Console, Projects, and Travel families from the
raw five-pose sources, remap every pose to its idle-1 palette, reject all
changes outside the per-pose motion masks, and run the production verifier:

```sh
node scripts/bazaar3/build-v2-frames.mjs
```

For a fast family-only rebuild while iterating:

```sh
node scripts/bazaar3/build-v2-frames.mjs --family console
node scripts/bazaar3/build-v2-frames.mjs --family projects
node scripts/bazaar3/build-v2-frames.mjs --family travel
```

The full run writes `reports/v2/verification.json`,
`reports/v2/verification.md`, a five-cel contact sheet, and a motion audit.
Orange motion-audit pixels are declared motion; any red pixel fails the build.

## Golden-slice workflow

1. Export rear and front structural plates once.
2. Record their SHA-256 values in `sha256`; never regenerate them per frame.
3. Export all character/effect cels on the exact same canvas.
4. Mark the fixed root/contact point, choose an opaque `lockRadius`, and lock
   a substantial torso/pelvis rectangle outside every motion region.
5. Paint one binary-alpha motion mask covering every permitted head, face, arm,
   tool, screen, water, steam, or creature change.
6. Validate before the cels are mounted in the app.
7. Inspect the JSON report alongside contact sheets and browser captures.

`manifest.example.json` models the Projects desktop golden slice. Its all-zero
static hashes are intentional placeholders and must be replaced with hashes of
the approved plates. The artwork occupies 960×1263 (a strict 3× grid) inside
the required 960×1264 canvas, leaving the final row outside the pixel-block
check.
