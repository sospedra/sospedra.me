#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const ROOT = process.cwd()
const SOURCE = path.join(
  ROOT,
  'public/images/bazaar3/assets/stalls/manual-v3/frames/idle-1.png',
)
const ASSET_ROOT = path.join(
  ROOT,
  'public/images/bazaar3/assets/stalls/manual-v3',
)
const FRAME_ROOT = path.join(ASSET_ROOT, 'frames')
const CEL_ROOT = path.join(ASSET_ROOT, 'cels')
const MASK_ROOT = path.join(ASSET_ROOT, 'masks')
const REPORT_ROOT = path.join(
  ROOT,
  'scripts/bazaar3/manual-camera/reports/manual-production-family',
)

const LOGICAL = Object.freeze({ width: 320, height: 421 })
const DELIVERY = Object.freeze({ width: 960, height: 1264 })
const SCALE = 3
const STATES = Object.freeze([
  'idle-1',
  'idle-2',
  'hover-1',
  'hover-2',
  'hover-3',
])

const PALETTE = Object.freeze({
  outline: [3, 3, 3, 255],
  wall: [25, 32, 37, 255],
  lensShadow: [52, 54, 58, 255],
  lensMid: [97, 93, 90, 255],
  lensLight: [128, 128, 123, 255],
  paperShadow: [70, 44, 18, 255],
  paper: [187, 167, 139, 255],
  paperLight: [227, 188, 127, 255],
})

const EYES = Object.freeze([
  { id: 'left', x: 135, y: 126, radiusX: 12, radiusY: 11 },
  { id: 'center', x: 160, y: 126, radiusX: 12, radiusY: 11 },
  { id: 'right', x: 188, y: 130, radiusX: 12, radiusY: 11 },
])

const EYE_ENVELOPE = Object.freeze({
  kind: 'rect',
  x: 116,
  y: 104,
  width: 91,
  height: 42,
})

const ARM_ENVELOPES = Object.freeze([
  {
    id: 'left-arm',
    kind: 'polygon',
    points: [
      [86, 141],
      [115, 145],
      [115, 174],
      [91, 191],
      [76, 181],
    ],
  },
  {
    id: 'right-arm',
    kind: 'polygon',
    points: [
      [204, 142],
      [232, 132],
      [255, 139],
      [245, 177],
      [210, 186],
    ],
  },
  {
    id: 'front-arm',
    kind: 'polygon',
    points: [
      [132, 184],
      [146, 175],
      [159, 187],
      [140, 220],
      [116, 224],
    ],
  },
])

const LOCKS = Object.freeze({
  torso: { x: 122, y: 147, width: 76, height: 51 },
  root: { x: 140, y: 198, width: 42, height: 17 },
  shoulders: [
    { id: 'left', x: 109, y: 158, width: 10, height: 12 },
    { id: 'right', x: 198, y: 158, width: 10, height: 12 },
    { id: 'front', x: 137, y: 177, width: 11, height: 12 },
  ],
})

const pixelOffset = (x, y, width = LOGICAL.width) => (y * width + x) * 4

const clonePixels = (pixels) => Buffer.from(pixels)

const samePixel = (left, right, offset) =>
  left[offset] === right[offset] &&
  left[offset + 1] === right[offset + 1] &&
  left[offset + 2] === right[offset + 2] &&
  left[offset + 3] === right[offset + 3]

const setPixel = (pixels, x, y, color) => {
  if (x < 0 || y < 0 || x >= LOGICAL.width || y >= LOGICAL.height) return
  const offset = pixelOffset(x, y)
  pixels[offset] = color[0]
  pixels[offset + 1] = color[1]
  pixels[offset + 2] = color[2]
  pixels[offset + 3] = color[3]
}

const copyPixel = (source, destination, sourceX, sourceY, x, y) => {
  if (
    sourceX < 0 ||
    sourceY < 0 ||
    sourceX >= LOGICAL.width ||
    sourceY >= LOGICAL.height ||
    x < 0 ||
    y < 0 ||
    x >= LOGICAL.width ||
    y >= LOGICAL.height
  )
    return
  const sourceOffset = pixelOffset(sourceX, sourceY)
  const destinationOffset = pixelOffset(x, y)
  source.copy(destination, destinationOffset, sourceOffset, sourceOffset + 4)
}

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

const ellipseContains = (center, x, y, inset = 0) => {
  const radiusX = center.radiusX - inset
  const radiusY = center.radiusY - inset
  const deltaX = x - center.x
  const deltaY = y - center.y
  return (
    (deltaX * deltaX) / (radiusX * radiusX) +
      (deltaY * deltaY) / (radiusY * radiusY) <=
    1
  )
}

const fillEllipse = (pixels, centerX, centerY, radiusX, radiusY, color) => {
  for (let y = centerY - radiusY; y <= centerY + radiusY; y += 1) {
    for (let x = centerX - radiusX; x <= centerX + radiusX; x += 1) {
      const deltaX = x - centerX
      const deltaY = y - centerY
      if (
        (deltaX * deltaX) / (radiusX * radiusX) +
          (deltaY * deltaY) / (radiusY * radiusY) >
        1
      )
        continue
      setPixel(pixels, x, y, color)
    }
  }
}

const drawGaze = (
  pixels,
  eye,
  { deltaX = 0, deltaY = 0, highlight = false } = {},
) => {
  fillEllipse(pixels, eye.x, eye.y, 5, 4, PALETTE.lensShadow)
  fillEllipse(pixels, eye.x, eye.y, 4, 3, PALETTE.lensLight)
  const pupilX = eye.x + deltaX
  const pupilY = eye.y + deltaY
  fillEllipse(pixels, pupilX, pupilY, 2, 2, PALETTE.outline)
  setPixel(
    pixels,
    pupilX - 1,
    pupilY - 1,
    highlight ? PALETTE.paperLight : PALETTE.lensMid,
  )
}

const dipEyeHeads = (base, frame, amount) => {
  for (const eye of EYES) {
    const source = clonePixels(base)

    for (let y = eye.y - eye.radiusY; y <= eye.y + eye.radiusY; y += 1) {
      for (let x = eye.x - eye.radiusX; x <= eye.x + eye.radiusX; x += 1) {
        if (!ellipseContains(eye, x, y)) continue
        copyPixel(base, frame, x, Math.max(95, y - 22), x, y)
      }
    }

    for (let y = eye.y - eye.radiusY; y <= eye.y + eye.radiusY; y += 1) {
      for (let x = eye.x - eye.radiusX; x <= eye.x + eye.radiusX; x += 1) {
        if (!ellipseContains(eye, x, y)) continue
        copyPixel(source, frame, x, y, x, y + amount)
      }
    }
  }
}

const drawPolygon = (pixels, points, color) => {
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (polygonContains(points, x + 0.5, y + 0.5))
        setPixel(pixels, x, y, color)
    }
  }
}

const drawInstructionSlip = (pixels) => {
  drawPolygon(
    pixels,
    [
      [235, 142],
      [250, 145],
      [247, 162],
      [233, 159],
    ],
    PALETTE.outline,
  )
  drawPolygon(
    pixels,
    [
      [237, 144],
      [248, 147],
      [245, 159],
      [235, 157],
    ],
    PALETTE.paper,
  )
  drawPolygon(
    pixels,
    [
      [238, 145],
      [246, 147],
      [245, 150],
      [237, 148],
    ],
    PALETTE.paperLight,
  )
  setPixel(pixels, 239, 151, PALETTE.paperShadow)
  setPixel(pixels, 240, 151, PALETTE.paperShadow)
  setPixel(pixels, 241, 154, PALETTE.paperShadow)
  setPixel(pixels, 242, 154, PALETTE.paperShadow)
}

const makeFrame = (state, base) => {
  const frame = clonePixels(base)

  if (state === 'idle-2') {
    drawGaze(frame, EYES[0], { deltaX: -2 })
    drawGaze(frame, EYES[1], { deltaY: -2 })
    drawGaze(frame, EYES[2], { deltaX: 2, deltaY: 1 })
  }

  if (state === 'hover-1') {
    for (const eye of EYES) drawGaze(frame, eye, { highlight: true })
  }

  if (state === 'hover-2') {
    dipEyeHeads(base, frame, 2)
    for (const eye of EYES)
      drawGaze(frame, { ...eye, y: eye.y + 2 }, { deltaY: 2, highlight: true })
  }

  if (state === 'hover-3') {
    for (const eye of EYES) drawGaze(frame, eye, { highlight: true })
    drawInstructionSlip(frame)
  }

  return frame
}

const logicalFromDelivery = async (file) => {
  const metadata = await sharp(file).metadata()
  if (
    metadata.width !== DELIVERY.width ||
    metadata.height !== DELIVERY.height
  ) {
    throw new Error(
      `Expected ${DELIVERY.width}x${DELIVERY.height}; got ` +
        `${metadata.width}x${metadata.height}`,
    )
  }

  const source = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const logical = Buffer.alloc(LOGICAL.width * LOGICAL.height * 4)

  for (let y = 0; y < LOGICAL.height; y += 1) {
    for (let x = 0; x < LOGICAL.width; x += 1) {
      const sourceOffset = pixelOffset(x * SCALE, y * SCALE, DELIVERY.width)
      const destinationOffset = pixelOffset(x, y)
      source.data.copy(
        logical,
        destinationOffset,
        sourceOffset,
        sourceOffset + 4,
      )
    }
  }

  return { logical, delivery: source.data, metadata }
}

const writeLogical = async (file, pixels, { transparent = false } = {}) => {
  await sharp(pixels, {
    raw: { ...LOGICAL, channels: 4 },
  })
    .resize(DELIVERY.width, LOGICAL.height * SCALE, {
      kernel: sharp.kernel.nearest,
    })
    .extend({
      bottom: 1,
      extendWith: transparent ? 'background' : 'copy',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(file)
}

const makeReplacementCel = (base, frame) => {
  const cel = Buffer.alloc(base.length)
  let changedLogicalPixels = 0
  for (let offset = 0; offset < base.length; offset += 4) {
    if (samePixel(base, frame, offset)) continue
    changedLogicalPixels += 1
    frame.copy(cel, offset, offset, offset + 4)
  }
  return { cel, changedLogicalPixels }
}

const compositeReplacementCel = (base, cel) => {
  const composite = clonePixels(base)
  for (let offset = 0; offset < cel.length; offset += 4) {
    if (cel[offset + 3] === 0) continue
    cel.copy(composite, offset, offset, offset + 4)
  }
  return composite
}

const regionHash = (pixels, region) => {
  const hash = createHash('sha256')
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      const offset = pixelOffset(x, y)
      hash.update(pixels.subarray(offset, offset + 4))
    }
  }
  return hash.digest('hex')
}

const fileHash = async (file) =>
  createHash('sha256')
    .update(await readFile(file))
    .digest('hex')

const allowedRegionsForState = (state) => {
  if (state === 'idle-1') return []
  if (state === 'idle-2' || state === 'hover-1') return [EYE_ENVELOPE]
  return [EYE_ENVELOPE, ...ARM_ENVELOPES]
}

const changedPixelsOutsideAllowed = (base, frame, state) => {
  const allowed = allowedRegionsForState(state)
  let outside = 0
  for (let y = 0; y < LOGICAL.height; y += 1) {
    for (let x = 0; x < LOGICAL.width; x += 1) {
      const offset = pixelOffset(x, y)
      if (samePixel(base, frame, offset)) continue
      if (!allowed.some((region) => regionContains(region, x, y))) outside += 1
    }
  }
  return outside
}

const paletteSet = (pixels, includeTransparent = false) => {
  const colors = new Set()
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (!includeTransparent && pixels[offset + 3] === 0) continue
    colors.add(
      `${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]},${pixels[offset + 3]}`,
    )
  }
  return colors
}

const maskFromFrames = (base, frames) => {
  const mask = Buffer.alloc(LOGICAL.width * LOGICAL.height * 4)
  for (const frame of frames) {
    for (let offset = 0; offset < base.length; offset += 4) {
      if (samePixel(base, frame, offset)) continue
      mask[offset] = 255
      mask[offset + 1] = 255
      mask[offset + 2] = 255
      mask[offset + 3] = 255
    }
  }
  return mask
}

const makeContactSheet = async (frameFiles) => {
  const previewWidth = 240
  const previewHeight = 316
  const labelHeight = 34
  const background = {
    create: {
      width: previewWidth * frameFiles.length,
      height: previewHeight + labelHeight,
      channels: 4,
      background: '#080b10',
    },
  }
  const composites = []

  for (let index = 0; index < frameFiles.length; index += 1) {
    const frame = await sharp(frameFiles[index].file)
      .resize(previewWidth, previewHeight, { kernel: sharp.kernel.nearest })
      .png()
      .toBuffer()
    const label = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${previewWidth}" height="${labelHeight}">
        <rect width="100%" height="100%" fill="#080b10"/>
        <text x="12" y="23" fill="#e3bc7f" font-family="monospace" font-size="16" font-weight="700">${frameFiles[index].state}</text>
      </svg>
    `)
    composites.push({ input: frame, left: index * previewWidth, top: 0 })
    composites.push({
      input: label,
      left: index * previewWidth,
      top: previewHeight,
    })
  }

  const output = path.join(REPORT_ROOT, 'contact-sheet.png')
  await sharp(background).composite(composites).png().toFile(output)
  return output
}

await Promise.all([
  mkdir(FRAME_ROOT, { recursive: true }),
  mkdir(CEL_ROOT, { recursive: true }),
  mkdir(MASK_ROOT, { recursive: true }),
  mkdir(REPORT_ROOT, { recursive: true }),
])

const sourceHash = await fileHash(SOURCE)
const source = await logicalFromDelivery(SOURCE)
const base = source.logical
const basePalette = paletteSet(base)
const frames = new Map()
const frameReports = []

for (const state of STATES) {
  const frame = makeFrame(state, base)
  frames.set(state, frame)
  const outside = changedPixelsOutsideAllowed(base, frame, state)
  if (outside !== 0)
    throw new Error(`${state}: ${outside} changed logical pixels outside mask`)

  const framePalette = paletteSet(frame)
  const foreignColors = [...framePalette].filter(
    (color) => !basePalette.has(color),
  )
  if (foreignColors.length !== 0)
    throw new Error(`${state}: palette drift: ${foreignColors.join(', ')}`)

  const { cel, changedLogicalPixels } = makeReplacementCel(base, frame)
  const reconstructed = compositeReplacementCel(base, cel)
  if (!frame.equals(reconstructed))
    throw new Error(`${state}: replacement cel does not reconstruct frame`)

  const frameFile = path.join(FRAME_ROOT, `${state}.png`)
  const celFile = path.join(CEL_ROOT, `${state}.png`)
  if (state !== 'idle-1') await writeLogical(frameFile, frame)
  await writeLogical(celFile, cel, { transparent: true })

  const celPalette = paletteSet(cel)
  frameReports.push({
    state,
    frame: path.relative(ROOT, frameFile),
    cel: path.relative(ROOT, celFile),
    frameSha256: await fileHash(frameFile),
    celSha256: await fileHash(celFile),
    changedLogicalPixels,
    changedOutputPixels: changedLogicalPixels * SCALE * SCALE,
    changedOutsideAllowed: outside,
    celOpaqueColors: celPalette.size,
    compositeMatches: true,
    torsoHash: regionHash(frame, LOCKS.torso),
    rootHash: regionHash(frame, LOCKS.root),
    shoulderHashes: Object.fromEntries(
      LOCKS.shoulders.map((region) => [region.id, regionHash(frame, region)]),
    ),
  })
}

const motionUnion = maskFromFrames(
  base,
  STATES.slice(1).map((state) => frames.get(state)),
)
const motionUnionFile = path.join(MASK_ROOT, 'motion-union.png')
await writeLogical(motionUnionFile, motionUnion, { transparent: true })

const contactSheet = await makeContactSheet(
  STATES.map((state) => ({
    state,
    file: path.join(FRAME_ROOT, `${state}.png`),
  })),
)

const lockSummary = {
  torso:
    new Set(frameReports.map((frame) => frame.torsoHash)).size === 1
      ? 'locked'
      : 'FAIL',
  root:
    new Set(frameReports.map((frame) => frame.rootHash)).size === 1
      ? 'locked'
      : 'FAIL',
  shoulders: Object.fromEntries(
    LOCKS.shoulders.map((shoulder) => [
      shoulder.id,
      new Set(frameReports.map((frame) => frame.shoulderHashes[shoulder.id]))
        .size === 1
        ? 'locked'
        : 'FAIL',
    ]),
  ),
}

if (
  lockSummary.torso !== 'locked' ||
  lockSummary.root !== 'locked' ||
  Object.values(lockSummary.shoulders).some((value) => value !== 'locked')
) {
  throw new Error(`Manual lock failure: ${JSON.stringify(lockSummary)}`)
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: path.relative(ROOT, SOURCE),
  sourceSha256: sourceHash,
  sourceChannels: source.metadata.channels,
  canvas: {
    logical: LOGICAL,
    delivery: DELIVERY,
    scale: SCALE,
    finalRow: 'duplicate-last for composites; transparent for replacement cels',
  },
  palette: {
    baseOpaqueColors: basePalette.size,
    mode: 'strict-subset-of-idle-1',
  },
  contract: {
    exactlyThreeEyes:
      'Inherited from byte-locked idle-1; edits address only the interiors of the same three lens heads.',
    exactlyThreeConnectedArms:
      'Inherited from byte-locked idle-1; no shoulder root or arm connection is added or removed.',
    floatingBehindCounter:
      'Torso, thruster/root, counter, rear aisle and all depth pixels are byte-locked.',
    transparentDelivery:
      'Each state has a sparse binary-alpha replacement cel. The flattened source cannot safely yield a complete transparent stall cutout without regeneration.',
  },
  locks: lockSummary,
  frames: frameReports,
  outputs: {
    frameRoot: path.relative(ROOT, FRAME_ROOT),
    celRoot: path.relative(ROOT, CEL_ROOT),
    motionUnion: path.relative(ROOT, motionUnionFile),
    contactSheet: path.relative(ROOT, contactSheet),
  },
}

const reportFile = path.join(REPORT_ROOT, 'production-family.json')
await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`)

const markdown = `# Manual-v3 production family

- Source: \`${report.source}\`
- Source SHA-256: \`${sourceHash}\`
- Composite frames: \`${path.relative(ROOT, FRAME_ROOT)}\`
- Transparent replacement cels: \`${path.relative(ROOT, CEL_ROOT)}\`
- Palette: ${basePalette.size} colors, strict idle-1 subset
- Torso: ${lockSummary.torso}
- Floating root/thruster: ${lockSummary.root}
- Shoulder roots: ${Object.entries(lockSummary.shoulders)
  .map(([id, value]) => `${id} ${value}`)
  .join(', ')}

| state | changed logical pixels | outside mask | cel reconstructs frame |
| --- | ---: | ---: | --- |
${frameReports
  .map(
    (frame) =>
      `| ${frame.state} | ${frame.changedLogicalPixels} | ${frame.changedOutsideAllowed} | ${frame.compositeMatches ? 'yes' : 'NO'} |`,
  )
  .join('\n')}

## Semantic beats

- idle-1: calibrated neutral work pose.
- idle-2: the three existing lenses scan independently; no body or arm motion.
- hover-1: all three lenses snap to the customer; arms remain paused in place.
- hover-2: the three existing lens heads dip two authored pixels while their
  bases, torso, thruster and shoulder roots remain fixed.
- hover-3: lenses rise to direct contact; the existing screen-right connected
  arm presents one small dirty-cream instruction slip.

## Transparency limitation

The five \`cels/*.png\` files are true 960×1264 binary-alpha local replacement
cels and reconstruct their matching composites exactly over idle-1. The
approved idle master is a fully opaque flattened RGB image. A complete
transparent stall cutout cannot be derived safely from it: robot, shelves,
counter and wall reuse every palette color, touch one another, and conceal
background pixels. Promoting the local-cel stack therefore requires a static
base layer or a newly generated clean rear/front decomposition; it must not be
approximated with color keying.
`

await writeFile(path.join(REPORT_ROOT, 'production-family.md'), markdown)

console.log(path.relative(ROOT, reportFile))
console.log(path.relative(ROOT, contactSheet))
