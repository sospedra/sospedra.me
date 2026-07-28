import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const ROOT = process.cwd()
const SOURCE = path.join(
  ROOT,
  'scripts/bazaar3/manual-camera/candidates/manual-candidate-4/normalized-960x1264.png',
)
const OUTPUT = path.join(
  ROOT,
  'scripts/bazaar3/reports/integration/workshop-v2/manual-decomposition',
)
const LEGACY_FRAMES = Object.freeze(
  ['idle-1', 'idle-2', 'hover-1', 'hover-2', 'hover-3'].map((id) => ({
    id,
    file: path.join(
      ROOT,
      `public/images/bazaar3/assets/stalls/manual/frames/${id}.png`,
    ),
  })),
)

const DELIVERY = Object.freeze({ width: 960, height: 1264 })
const LOGICAL = Object.freeze({ width: 320, height: 421 })
const SCALE = 3

const REAR_TARGET = Object.freeze({
  id: 'rear-fixed-structure-target',
  kind: 'rect',
  x: 0,
  y: 0,
  width: 320,
  height: 215,
  color: '#38d6c7',
  note: 'Final rearSrc: frame, sign, wall, shelves, lamp and fixed inventory.',
})

const KEEPER_REGIONS = Object.freeze([
  {
    id: 'eye-stalks',
    kind: 'rect',
    x: 112,
    y: 102,
    width: 100,
    height: 49,
  },
  {
    id: 'torso-and-roots',
    kind: 'polygon',
    points: [
      [105, 141],
      [213, 141],
      [221, 172],
      [210, 208],
      [181, 221],
      [137, 221],
      [108, 207],
      [96, 172],
    ],
  },
  {
    id: 'left-working-arm',
    kind: 'polygon',
    points: [
      [56, 137],
      [105, 137],
      [126, 156],
      [124, 190],
      [109, 219],
      [85, 220],
      [69, 198],
      [56, 179],
    ],
  },
  {
    id: 'right-working-arm',
    kind: 'polygon',
    points: [
      [201, 137],
      [239, 129],
      [262, 139],
      [261, 183],
      [239, 201],
      [207, 198],
      [197, 172],
    ],
  },
  {
    id: 'front-reaching-arm',
    kind: 'polygon',
    points: [
      [132, 174],
      [155, 180],
      [162, 211],
      [166, 225],
      [160, 261],
      [105, 261],
      [103, 225],
      [116, 201],
    ],
  },
])

const KEEPER_CONTAMINATION = Object.freeze([
  {
    id: 'flattened-keeper-contamination',
    kind: 'rect',
    x: 54,
    y: 100,
    width: 209,
    height: 116,
  },
  {
    id: 'front-arm-contamination',
    kind: 'rect',
    x: 103,
    y: 216,
    width: 64,
    height: 46,
  },
])

const OVER_FRONT_REGIONS = Object.freeze([
  KEEPER_REGIONS.find((region) => region.id === 'front-reaching-arm'),
])

const FRONT_COUNTER = Object.freeze({
  id: 'static-counter-occluder-target',
  kind: 'rect',
  x: 35,
  y: 215,
  width: 250,
  height: 68,
  color: '#f3b34c',
  note: 'Final frontSrc upper counter; it must occlude the floating root.',
})

const LOWER_FRONT_SAFE = Object.freeze({
  id: 'lower-front-safe-source',
  kind: 'rect',
  x: 0,
  y: 283,
  width: 320,
  height: 138,
  color: '#4fc66d',
  note: 'Static lower shelving, floor, trench and foreground clutter.',
})

const REAR_RECEIVER = Object.freeze({
  id: 'rear-light-receiver-target',
  kind: 'rect',
  x: 42,
  y: 95,
  width: 236,
  height: 116,
  color: '#72b7ff',
  note: 'Environment-owned light receiver behind the keeper.',
})

const COUNTER_RECEIVER = Object.freeze({
  id: 'counter-light-receiver-target',
  kind: 'rect',
  x: 88,
  y: 207,
  width: 144,
  height: 24,
  color: '#ffe05e',
  note: 'Environment-owned warm bounce/keeper shadow on the counter top.',
})

const ROOT_RECEIVER = Object.freeze({
  id: 'floating-root-receiver-target',
  kind: 'rect',
  x: 133,
  y: 199,
  width: 57,
  height: 24,
  color: '#ff7f72',
  note: 'Soft air shadow/thruster receiver; never a hard standing contact.',
})

const rectContains = (rect, x, y) =>
  x >= rect.x &&
  x < rect.x + rect.width &&
  y >= rect.y &&
  y < rect.y + rect.height

const polygonContains = (points, x, y) => {
  let inside = false
  for (
    let current = 0, previous = points.length - 1;
    current < points.length;
    previous = current++
  ) {
    const [currentX, currentY] = points[current]
    const [previousX, previousY] = points[previous]
    const intersects =
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) / (previousY - currentY) +
          currentX
    if (intersects) inside = !inside
  }
  return inside
}

const regionContains = (region, x, y) =>
  region.kind === 'polygon'
    ? polygonContains(region.points, x + 0.5, y + 0.5)
    : rectContains(region, x, y)

const anyRegionContains = (regions, x, y) =>
  regions.some((region) => regionContains(region, x, y))

const makeLogicalMask = (predicate) => {
  const mask = Buffer.alloc(LOGICAL.width * LOGICAL.height)
  for (let y = 0; y < LOGICAL.height; y += 1) {
    for (let x = 0; x < LOGICAL.width; x += 1) {
      if (predicate(x, y)) mask[y * LOGICAL.width + x] = 255
    }
  }
  return mask
}

const deliveryMask = async (logicalMask) =>
  sharp(logicalMask, {
    raw: { width: LOGICAL.width, height: LOGICAL.height, channels: 1 },
  })
    .resize(DELIVERY.width, LOGICAL.height * SCALE, {
      kernel: sharp.kernel.nearest,
    })
    .extend({
      bottom: 1,
      extendWith: 'copy',
    })
    .extractChannel(0)
    .raw()
    .toBuffer()

const writeMask = async (fileName, logicalMask) => {
  const outputPath = path.join(OUTPUT, fileName)
  await sharp(logicalMask, {
    raw: { width: LOGICAL.width, height: LOGICAL.height, channels: 1 },
  })
    .resize(DELIVERY.width, LOGICAL.height * SCALE, {
      kernel: sharp.kernel.nearest,
    })
    .extend({ bottom: 1, extendWith: 'copy' })
    .extractChannel(0)
    .png()
    .toFile(outputPath)
  return outputPath
}

const writeMaskedSource = async (fileName, sourceRgba, logicalMask) => {
  const mask = await deliveryMask(logicalMask)
  const output = Buffer.from(sourceRgba)
  for (let index = 0; index < DELIVERY.width * DELIVERY.height; index += 1) {
    const offset = index * 4
    output[offset + 3] = mask[index]
    if (mask[index] !== 0) continue
    output[offset] = 0
    output[offset + 1] = 0
    output[offset + 2] = 0
  }

  const outputPath = path.join(OUTPUT, fileName)
  await sharp(output, {
    raw: { ...DELIVERY, channels: 4 },
  })
    .png()
    .toFile(outputPath)
  return outputPath
}

const escapeXml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const svgShape = (region, label = region.id) => {
  const color = region.color ?? '#ffffff'
  const labelX =
    region.kind === 'polygon' ? region.points[0][0] * SCALE : region.x * SCALE
  const labelY =
    region.kind === 'polygon' ? region.points[0][1] * SCALE : region.y * SCALE
  const body =
    region.kind === 'polygon'
      ? `<polygon points="${region.points
          .map(([x, y]) => `${x * SCALE},${y * SCALE}`)
          .join(' ')}"/>`
      : `<rect x="${region.x * SCALE}" y="${region.y * SCALE}" width="${region.width * SCALE}" height="${region.height * SCALE}"/>`

  return `
    <g fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="4" stroke-dasharray="12 8">
      ${body}
    </g>
    <text x="${labelX + 7}" y="${labelY + 22}" fill="${color}" font-family="monospace" font-size="16" font-weight="700">${escapeXml(label)}</text>
  `
}

const colorKey = (data, offset, channels) =>
  `${data[offset]},${data[offset + 1]},${data[offset + 2]},${
    channels >= 4 ? data[offset + 3] : 255
  }`

const hex = (value) => value.toString(16).padStart(2, '0')

const colorRecord = (key, pixels) => {
  const [red, green, blue] = key.split(',').map(Number)
  return {
    rgba: [red, green, blue, 255],
    hex: `#${hex(red)}${hex(green)}${hex(blue)}`,
    pixels,
    share: Number((pixels / (DELIVERY.width * DELIVERY.height)).toFixed(6)),
  }
}

const inspectBlockGrid = (data, channels) => {
  let uniformBlocks = 0
  let totalBlocks = 0
  for (let y = 0; y < LOGICAL.height; y += 1) {
    for (let x = 0; x < LOGICAL.width; x += 1) {
      totalBlocks += 1
      const baseX = x * SCALE
      const baseY = y * SCALE
      const baseOffset = (baseY * DELIVERY.width + baseX) * channels
      let uniform = true
      for (let dy = 0; dy < SCALE; dy += 1) {
        for (let dx = 0; dx < SCALE; dx += 1) {
          const offset = ((baseY + dy) * DELIVERY.width + baseX + dx) * channels
          for (let channel = 0; channel < channels; channel += 1) {
            if (data[offset + channel] === data[baseOffset + channel]) continue
            uniform = false
          }
        }
      }
      if (uniform) uniformBlocks += 1
    }
  }
  return {
    totalBlocks,
    uniformBlocks,
    share: Number((uniformBlocks / totalBlocks).toFixed(8)),
  }
}

const inspectLegacyFrame = async ({ id, file }) => {
  const image = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const colors = new Set()
  let opaquePixels = 0
  let minX = image.info.width
  let minY = image.info.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < image.info.height; y += 1) {
    for (let x = 0; x < image.info.width; x += 1) {
      const offset = (y * image.info.width + x) * 4
      colors.add(colorKey(image.data, offset, 4))
      if (image.data[offset + 3] === 0) continue
      opaquePixels += 1
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  return {
    id,
    file: path.relative(ROOT, file),
    width: image.info.width,
    height: image.info.height,
    uniqueRgbaColors: colors.size,
    opaqueCoverage: Number(
      (opaquePixels / (image.info.width * image.info.height)).toFixed(6),
    ),
    alphaBounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
    passesLayeredStageDimensions:
      image.info.width === DELIVERY.width &&
      image.info.height === DELIVERY.height,
  }
}

await mkdir(OUTPUT, { recursive: true })

const sourceFile = await readFile(SOURCE)
const sourceHash = createHash('sha256').update(sourceFile).digest('hex')
const source = await sharp(sourceFile)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

if (
  source.info.width !== DELIVERY.width ||
  source.info.height !== DELIVERY.height
) {
  throw new Error(
    `Expected ${DELIVERY.width}x${DELIVERY.height}; got ${source.info.width}x${source.info.height}`,
  )
}

const paletteCounts = new Map()
for (let offset = 0; offset < source.data.length; offset += 4) {
  const key = colorKey(source.data, offset, 4)
  paletteCounts.set(key, (paletteCounts.get(key) ?? 0) + 1)
}
const palette = [...paletteCounts]
  .map(([key, pixels]) => colorRecord(key, pixels))
  .sort((left, right) => right.pixels - left.pixels)

const logical = await sharp(sourceFile)
  .extract({ left: 0, top: 0, width: 960, height: 1263 })
  .resize(LOGICAL.width, LOGICAL.height, { kernel: sharp.kernel.nearest })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const keeperColorSet = new Set()
const environmentColorSet = new Set()
for (let y = 0; y < LOGICAL.height; y += 1) {
  for (let x = 0; x < LOGICAL.width; x += 1) {
    const offset = (y * LOGICAL.width + x) * 4
    const key = colorKey(logical.data, offset, 4)
    if (anyRegionContains(KEEPER_REGIONS, x, y)) keeperColorSet.add(key)
    else environmentColorSet.add(key)
  }
}
const sharedColors = [...keeperColorSet].filter((key) =>
  environmentColorSet.has(key),
)

const rearSafeMask = makeLogicalMask(
  (x, y) =>
    regionContains(REAR_TARGET, x, y) &&
    !anyRegionContains(KEEPER_CONTAMINATION, x, y),
)
const keeperMask = makeLogicalMask((x, y) =>
  anyRegionContains(KEEPER_REGIONS, x, y),
)
const overFrontMask = makeLogicalMask((x, y) =>
  anyRegionContains(OVER_FRONT_REGIONS, x, y),
)
const counterMask = makeLogicalMask((x, y) =>
  regionContains(FRONT_COUNTER, x, y),
)
const lowerFrontMask = makeLogicalMask((x, y) =>
  regionContains(LOWER_FRONT_SAFE, x, y),
)
const receiverMask = makeLogicalMask(
  (x, y) =>
    regionContains(REAR_RECEIVER, x, y) ||
    regionContains(COUNTER_RECEIVER, x, y) ||
    regionContains(ROOT_RECEIVER, x, y),
)

const outputs = {
  overlay: path.join(OUTPUT, 'decomposition-overlay.png'),
  rearSafeMask: await writeMask('mask-rear-safe.png', rearSafeMask),
  keeperEnvelopeMask: await writeMask(
    'mask-keeper-generation-envelope.png',
    keeperMask,
  ),
  overFrontMask: await writeMask(
    'mask-over-front-appendage.png',
    overFrontMask,
  ),
  counterMask: await writeMask('mask-counter-target.png', counterMask),
  lowerFrontMask: await writeMask('mask-lower-front-safe.png', lowerFrontMask),
  receiverMask: await writeMask('mask-local-receivers.png', receiverMask),
  rearSafeSource: await writeMaskedSource(
    'source-rear-safe-partial.png',
    source.data,
    rearSafeMask,
  ),
  lowerFrontSource: await writeMaskedSource(
    'source-lower-front-safe.png',
    source.data,
    lowerFrontMask,
  ),
}

const overlaySvg = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${DELIVERY.width}" height="${DELIVERY.height}">
    <rect width="100%" height="100%" fill="#030609" fill-opacity=".30"/>
    ${svgShape(REAR_TARGET, 'rear target')}
    ${svgShape(REAR_RECEIVER, 'rear light receiver')}
    ${KEEPER_REGIONS.map((region) =>
      svgShape({ ...region, color: '#c88cff' }, region.id),
    ).join('')}
    ${svgShape(COUNTER_RECEIVER, 'counter light receiver')}
    ${svgShape(ROOT_RECEIVER, 'floating root receiver')}
    ${svgShape(FRONT_COUNTER, 'front counter occluder')}
    ${svgShape(LOWER_FRONT_SAFE, 'lower front / floor')}
    <rect x="0" y="0" width="${DELIVERY.width}" height="58" fill="#030609" fill-opacity=".90"/>
    <text x="16" y="24" fill="#f5ead4" font-family="monospace" font-size="18" font-weight="700">MANUAL CANDIDATE 4 • DECOMPOSITION AUDIT</text>
    <text x="16" y="47" fill="#8feee4" font-family="monospace" font-size="15">analysis envelopes only — not production cutout masks</text>
  </svg>
`)
await sharp(sourceFile)
  .composite([{ input: overlaySvg, left: 0, top: 0 }])
  .png()
  .toFile(outputs.overlay)

const grid = inspectBlockGrid(source.data, 4)
const legacyFrames = await Promise.all(LEGACY_FRAMES.map(inspectLegacyFrame))
let finalRowMatches = 0
for (let x = 0; x < DELIVERY.width; x += 1) {
  const lastOffset = ((DELIVERY.height - 1) * DELIVERY.width + x) * 4
  const previousOffset = ((DELIVERY.height - 2) * DELIVERY.width + x) * 4
  let matches = true
  for (let channel = 0; channel < 4; channel += 1) {
    if (
      source.data[lastOffset + channel] ===
      source.data[previousOffset + channel]
    )
      continue
    matches = false
  }
  if (matches) finalRowMatches += 1
}

const report = {
  schemaVersion: 1,
  source: path.relative(ROOT, SOURCE),
  sha256: sourceHash,
  canvas: {
    delivery: DELIVERY,
    logical: LOGICAL,
    pixelScale: SCALE,
    sourceChannelsBeforeEnsureAlpha: (await sharp(sourceFile).metadata())
      .channels,
    opaqueCoverage: 1,
  },
  grid: {
    ...grid,
    finalRowMatchShare: Number((finalRowMatches / DELIVERY.width).toFixed(8)),
  },
  palette,
  colorSeparation: {
    keeperEnvelopeColorCount: keeperColorSet.size,
    environmentColorCount: environmentColorSet.size,
    sharedColorCount: sharedColors.length,
    allKeeperColorsAlsoAppearInEnvironment:
      sharedColors.length === keeperColorSet.size,
    conclusion:
      'Palette/color keying cannot isolate the keeper: every color used inside the keeper envelope is also used by the environment.',
  },
  targetGeometryLogical: {
    rear: REAR_TARGET,
    keeper: KEEPER_REGIONS,
    frontCounter: FRONT_COUNTER,
    lowerFront: LOWER_FRONT_SAFE,
    receivers: [REAR_RECEIVER, COUNTER_RECEIVER, ROOT_RECEIVER],
  },
  registeredLocksLogical: {
    torso: { x: 122, y: 147, width: 76, height: 51 },
    floatingRootThruster: { x: 140, y: 198, width: 42, height: 17 },
    leftShoulderRoot: { x: 109, y: 158, width: 10, height: 12 },
    rightShoulderRoot: { x: 198, y: 158, width: 10, height: 12 },
    frontShoulderRoot: { x: 137, y: 177, width: 11, height: 12 },
  },
  extractionVerdict: {
    productionKeeperExtraction: 'not-safe',
    productionRearReconstruction: 'not-possible-from-flattened-source',
    staticLowerFrontReuse: 'deterministically-safe-as-reference',
    staticSignReuse:
      'safe only while baked into the rear plate; not independently alpha-isolated',
    reasons: [
      'The source is RGB and fully opaque; it has no alpha or chroma backing.',
      'Robot and environment share all keeper-envelope colors.',
      'The duster, wrench, arms, torso and counter touch or overlap environmental pixels.',
      'Pixels hidden behind the robot and counter do not exist in the flattened source.',
      'The front-reaching arm crosses the static counter occluder, requiring either an over-front animated cel or a redesigned pose that stays behind the counter.',
    ],
  },
  existingRuntimeFrames: {
    frames: legacyFrames,
    verdict:
      'All five existing Manual frames are 988x1310 legacy full-stall renders and fail the 960x1264 LayeredStallSprite stage contract. They cannot be mixed with Candidate 4 layers.',
  },
  runtimeTooling: {
    layeredSpriteOrder: [
      'rearSrc',
      'effects behind keeper (optional)',
      'keeper sequence',
      'effects over keeper (optional)',
      'frontSrc',
    ],
    limitation:
      'There is currently no animated layer after frontSrc. Candidate 4 therefore needs an explicit over-front cel extension or a pose constrained behind the counter.',
    verifier:
      'verify-five-frame.mjs can hard-lock full-frame structure, torso, roots, shoulder roots, dimensions, scale and palette. The calibration manifest still has only Candidate 4 idle-1; the remaining four paths are intentionally absent.',
  },
  requiredRuntimeOrder: [
    'rear fixed structure',
    'rear light receiver/effect',
    'keeper under-counter cel',
    'static counter/front occluder',
    'optional animated over-front appendage cel',
    'small local highlight/spark overlay',
  ],
  outputs: Object.fromEntries(
    Object.entries(outputs).map(([key, value]) => [
      key,
      path.relative(ROOT, value),
    ]),
  ),
}

const reportJson = path.join(OUTPUT, 'decomposition-audit.json')
await writeFile(reportJson, `${JSON.stringify(report, null, 2)}\n`)

const paletteLines = palette
  .map(
    (color) =>
      `| \`${color.hex}\` | ${color.pixels.toLocaleString('en-US')} | ${(color.share * 100).toFixed(3)}% |`,
  )
  .join('\n')

const reportMarkdown = path.join(OUTPUT, 'decomposition-audit.md')
await writeFile(
  reportMarkdown,
  `# Manual Candidate 4 decomposition audit

## Verdict

The approved master is a valid 960×1264, 16-color, exact 3×-grid design
reference. It is **not** a production layer source. It is fully opaque RGB,
has no chroma backing, and every color inside the keeper envelope also appears
in the environment. Color keying would erase shelves, frame, counter, robot,
or all four at once.

The safe path is to keep this master untouched as the identity/layout authority
and regenerate registered layers from it:

1. a clean rear plate with no robot and no foreground counter;
2. a keyed floating robot cel on the same 960×1264 stage;
3. a keyed static counter/front plate;
4. environment-owned light receivers and soft contact/caster plates;
5. if the forward gripper remains below the counter top, a distinct animated
   over-front appendage cel.

The supplied masks are **analysis envelopes**, not production cutout masks.
They make the occlusion and registration constraints explicit.

## Exact source facts

- Source: \`${path.relative(ROOT, SOURCE)}\`
- SHA-256: \`${sourceHash}\`
- Delivery canvas: 960×1264
- Logical authored canvas: 320×421 at exactly 3× nearest-neighbor
- 3× block uniformity: ${(grid.share * 100).toFixed(4)}%
- Final duplicated-row match: ${((finalRowMatches / DELIVERY.width) * 100).toFixed(4)}%
- Source alpha: none; opaque coverage 100%
- Palette: ${palette.length} colors
- Keeper-envelope colors shared with environment: ${sharedColors.length}/${keeperColorSet.size}

## Existing runtime assets and tooling

All five existing Manual frames are 988×1310 legacy full-stall renders, not
Candidate 4 layers. Their opaque coverage is 83.9902%, their alpha bounds touch
the whole canvas, and each carries roughly 89k–92k RGBA colors. Every frame
fails the 960×1264 \`LayeredStallSprite\` stage contract; none may be mixed into
the new stack.

The layered runtime currently draws:

1. \`rearSrc\`;
2. optional effects behind the keeper;
3. the keeper sequence;
4. optional effects over the keeper;
5. \`frontSrc\`.

There is no animated layer after \`frontSrc\`. The current forward gripper must
therefore trigger a small runtime extension for an over-front cel, or the
generated pose must remain entirely behind the counter. The existing
\`verify-five-frame.mjs\` is still appropriate: it locks dimensions, structure,
torso, floating root, shoulder roots, registration, scale and palette. The
calibration manifest correctly contains Candidate 4 only for \`idle-1\`; its
other four frame files do not exist yet and must never be faked.

## Palette

| Color | Pixels | Share |
| --- | ---: | ---: |
${paletteLines}

## Registered geometry, logical pixels

- Torso lock: x122 y147 w76 h51
- Floating root/thruster lock: x140 y198 w42 h17
- Left shoulder root: x109 y158 w10 h12
- Right shoulder root: x198 y158 w10 h12
- Front shoulder root: x137 y177 w11 h12
- Rear target: x0 y0 w320 h215
- Counter occluder: x35 y215 w250 h68
- Lower fixed front/floor: x0 y283 w320 h138
- Rear light receiver: x42 y95 w236 h116
- Counter light receiver: x88 y207 w144 h24
- Floating-root receiver: x133 y199 w57 h24

## Occlusion limitation

The existing idle design has a front-reaching arm that crosses logical y215,
the counter-top/occluder boundary, and continues to roughly y261. A single
\`keeper → front\` stack hides that hand. Preserve this composition by adding
an animated over-front cel, or constrain every generated arm and tool to remain
above/behind the counter-top boundary. Do not punch a permanent hole in the
counter: moving cels would reveal an impossible transparent void.

## Output guide

- \`decomposition-overlay.png\`: registered layer envelopes on the approved master.
- \`mask-keeper-generation-envelope.png\`: keeper generation/motion envelope.
- \`mask-over-front-appendage.png\`: area requiring over-front animation support.
- \`mask-counter-target.png\`: static counter occluder target.
- \`mask-local-receivers.png\`: local rear/counter/root receiver targets.
- \`source-rear-safe-partial.png\`: conservative unoccluded source pixels only.
- \`source-lower-front-safe.png\`: deterministic lower-front reference crop.

None of these proof images replace approved or runtime assets.
`,
)

console.log(path.relative(ROOT, reportMarkdown))
console.log(path.relative(ROOT, outputs.overlay))
