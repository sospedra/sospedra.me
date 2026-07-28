import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

/**
 * Deterministic Bazaar 3 desktop-floor calibration previews.
 *
 * This script mirrors the live 1248×597 desktop geometry, but its outputs are
 * QA evidence only. They are deliberately written under scripts/bazaar3/reports
 * and must never be mounted as runtime assets.
 */

const ROOT = process.cwd()
const APP_ROOT = path.join(ROOT, 'app/bazaar3')
const ASSET_ROOT = path.join(ROOT, 'public/images/bazaar3/assets')
const ENVIRONMENT_ROOT = path.join(ASSET_ROOT, 'environment')
const STALL_ROOT = path.join(ASSET_ROOT, 'stalls')
const ARCHITECTURE_ROOT = path.join(ASSET_ROOT, 'architecture')
const OUTPUT_ROOT = path.join(
  ROOT,
  'scripts/bazaar3/reports/floor-environments',
)

const CANVAS = Object.freeze({ width: 1248, height: 597 })
const SVH = CANVAS.height / 100
const MARKET_METER = Math.min(CANVAS.width / 11.5, CANVAS.height * 0.165)
const ROW_BOTTOM = MARKET_METER * 0.65 - SVH * 4
const STAIRS_WIDTH = MARKET_METER * 1.7
const STAIRS_HEIGHT = CANVAS.height - SVH * 5
const ROW_AVOID = STAIRS_WIDTH
const BAY_GAP = MARKET_METER * 0.35
const BAY_HEIGHT = MARKET_METER * 5.12
const BAY_MARGIN_BOTTOM = MARKET_METER * -0.42

const HORIZONTAL_BEAM = path.join(ARCHITECTURE_ROOT, 'h-beam-horizontal.png')
const VERTICAL_BEAM = path.join(ARCHITECTURE_ROOT, 'h-beam-vertical.png')
const BEAM_JOINT = path.join(ARCHITECTURE_ROOT, 'h-beam-joint.png')

const STALLS = Object.freeze({
  uses: {
    desktopSize: [152, 120],
    translateSvh: -4,
    contact: [5, 5, 1.8],
    frame: 'uses/frames/idle-1.png',
  },
  papers: {
    desktopSize: [97, 120],
    translateSvh: 0,
    contact: [14, 10, 1.8],
    frame: 'papers/frames/idle-1.png',
  },
  manual: {
    desktopSize: [90, 120],
    translateSvh: -2,
    contact: [10, 9, 1.8],
    frame: 'manual-v3/frames/idle-1.png',
  },
  console: {
    desktopSize: [74, 96],
    translateSvh: 0,
    contact: [3, 3, 2.2],
    frame: 'console-v2/frames/idle-1.png',
  },
  talks: {
    desktopSize: [112, 120],
    translateSvh: -2,
    contact: [8, 8, 1.8],
    frame: 'talks/frames/idle-1.png',
  },
  projects: {
    desktopSize: [105, 135],
    translateSvh: -2,
    contact: [6, 6, 1.8],
    frame: 'projects-v2/frames/idle-1.png',
  },
  games: {
    desktopSize: [82, 96],
    translateSvh: -4,
    contact: [8, 7, 1.8],
    frame: 'games/frames/idle-1.png',
  },
  travel: {
    desktopSize: [104, 135],
    translateSvh: -2,
    contact: [5, 5, 1.8],
    frame: 'travel-v2/frames/idle-1.png',
  },
})

const FLOORS = Object.freeze([
  {
    id: 'archive',
    stalls: ['uses', 'papers'],
    stairsSide: 'right',
    stairCore: 'desktop-core-1.png',
  },
  {
    id: 'workshop',
    stalls: ['manual', 'console', 'talks'],
    stairsSide: 'left',
    stairCore: 'desktop-core-2-workshop.png',
  },
  {
    id: 'reclaimed',
    stalls: ['projects', 'games', 'travel'],
    stairsSide: 'left',
    stairCore: 'desktop-core-3.png',
  },
])

function clamp(minimum, value, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function raster(value) {
  return Math.round(value)
}

function fixed(value) {
  return Number(value.toFixed(4))
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function fileHash(file) {
  return sha256(await readFile(file))
}

function assertSourceContract(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(
      `Bazaar 3 desktop geometry drifted (${label}). Update this QA compositor only after reviewing the runtime change.`,
    )
  }
}

async function verifyRuntimeContract() {
  const [view, css] = await Promise.all([
    readFile(path.join(APP_ROOT, 'bazaar3-view.tsx'), 'utf8'),
    readFile(path.join(APP_ROOT, 'bazaar3.module.css'), 'utf8'),
  ])

  assertSourceContract(
    css,
    '--mkt-m: min(calc(var(--mkt-frame-w) / 11.5), 16.5svh);',
    'wide-screen market meter',
  )
  assertSourceContract(
    css,
    'inset: auto 0 calc(var(--mkt-m) * 0.65 - 4svh) 0;',
    'desktop row baseline',
  )
  assertSourceContract(
    css,
    'width: calc(var(--mkt-m) * var(--stall-w) / 32);',
    'stall width',
  )
  assertSourceContract(
    css,
    'height: calc(var(--mkt-m) * var(--stall-h) / 32);',
    'stall height',
  )
  assertSourceContract(
    css,
    'flex: 0 0 calc(var(--mkt-m) * 0.35);',
    'bay separator gap',
  )
  assertSourceContract(
    css,
    'height: calc(var(--mkt-m) * 5.12);',
    'bay separator height',
  )
  assertSourceContract(
    css,
    'margin-bottom: calc(var(--mkt-m) * -0.42);',
    'bay separator vertical registration',
  )
  assertSourceContract(
    css,
    '--stairs-w: calc(var(--mkt-m) * 1.7);',
    'wide-screen stairs width',
  )

  for (const [id, spec] of Object.entries(STALLS)) {
    assertSourceContract(
      view,
      `desktopSize: [${spec.desktopSize[0]}, ${spec.desktopSize[1]}],`,
      `${id} desktop size`,
    )
  }
}

async function resizeAsset(file, width, height, brightness = 1) {
  let pipeline = sharp(file)
    .resize({
      width,
      height,
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .ensureAlpha()

  if (brightness !== 1) {
    pipeline = pipeline.modulate({ brightness })
  }

  return pipeline.png({ compressionLevel: 9 }).toBuffer()
}

async function horizontalBeamStrip(width, height, brightness = 1) {
  const metadata = await sharp(HORIZONTAL_BEAM).metadata()
  const tileWidth = Math.max(
    1,
    raster((metadata.width * height) / metadata.height),
  )
  const tile = await resizeAsset(HORIZONTAL_BEAM, tileWidth, height, brightness)
  const layers = []
  for (let left = 0; left < width; left += tileWidth) {
    layers.push({ input: tile, left, top: 0 })
  }
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function verticalBeamStrip(width, height) {
  const metadata = await sharp(VERTICAL_BEAM).metadata()
  const tileHeight = Math.max(
    1,
    raster((metadata.height * width) / metadata.width),
  )
  const tile = await resizeAsset(VERTICAL_BEAM, width, tileHeight)
  const layers = []
  for (let top = 0; top < height; top += tileHeight) {
    layers.push({ input: tile, left: 0, top })
  }
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer()
}

function floorShadeSvg() {
  const height = CANVAS.height * 0.22
  const top = CANVAS.height - height
  const y24 = top + height * 0.24
  const y52 = top + height * 0.52
  const y72 = top + height * 0.72
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${CANVAS.width}" height="${CANVAS.height}">
      <rect x="0" y="${top}" width="${CANVAS.width}" height="${y24 - top}"
        fill="#000" fill-opacity="0.48"/>
      <rect x="0" y="${y24}" width="${CANVAS.width}" height="${y52 - y24}"
        fill="#000" fill-opacity="0.26"/>
      <rect x="0" y="${y52}" width="${CANVAS.width}" height="${y72 - y52}"
        fill="#000" fill-opacity="0.08"/>
    </svg>
  `)
}

function stallGeometry(floor) {
  const rowLeft = floor.stairsSide === 'left' ? ROW_AVOID : 0
  const rowRight = floor.stairsSide === 'right' ? ROW_AVOID : 0
  const rowWidth = CANVAS.width - rowLeft - rowRight
  const stallWidths = floor.stalls.map(
    (id) => (MARKET_METER * STALLS[id].desktopSize[0]) / 32,
  )
  const totalWidth =
    stallWidths.reduce((sum, width) => sum + width, 0) +
    BAY_GAP * (floor.stalls.length - 1)
  let cursor = rowLeft + (rowWidth - totalWidth) / 2
  const stalls = []
  const separators = []

  floor.stalls.forEach((id, index) => {
    const spec = STALLS[id]
    const width = stallWidths[index]
    const height = (MARKET_METER * spec.desktopSize[1]) / 32
    const top = CANVAS.height - ROW_BOTTOM - height + spec.translateSvh * SVH
    stalls.push({
      id,
      source: path.join(STALL_ROOT, spec.frame),
      float: { left: cursor, top, width, height },
      raster: {
        left: raster(cursor),
        top: raster(top),
        width: raster(width),
        height: raster(height),
      },
    })
    cursor += width

    if (index < floor.stalls.length - 1) {
      separators.push({
        float: {
          left: cursor,
          top: CANVAS.height - ROW_BOTTOM + BAY_MARGIN_BOTTOM - BAY_HEIGHT,
          width: BAY_GAP,
          height: BAY_HEIGHT,
        },
      })
      cursor += BAY_GAP
    }
  })

  return { rowLeft, rowRight, rowWidth, totalWidth, stalls, separators }
}

function contactShadowSvg(stalls) {
  const polygons = stalls
    .map((stall) => {
      const spec = STALLS[stall.id]
      const [leftPercent, rightPercent, heightSvh] = spec.contact
      const left = stall.float.left + stall.float.width * (leftPercent / 100)
      const width =
        stall.float.width * (1 - leftPercent / 100 - rightPercent / 100)
      const height = heightSvh * SVH
      const top = stall.float.top + stall.float.height + SVH * 0.8 - height
      const right = left + width
      const bottom = top + height
      const inset = width * 0.03
      const shoulder = height * 0.38
      return `<polygon points="
        ${left + inset},${top}
        ${right - inset},${top}
        ${right},${top + shoulder}
        ${right - width * 0.05},${bottom}
        ${left + width * 0.05},${bottom}
        ${left},${top + shoulder}"
        fill="#030508" fill-opacity="0.82"/>`
    })
    .join('')

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${CANVAS.width}" height="${CANVAS.height}">
      ${polygons}
    </svg>
  `)
}

async function buildFloorPreview(floor) {
  const environment = path.join(ENVIRONMENT_ROOT, `${floor.id}.png`)
  const environmentMetadata = await sharp(environment).metadata()
  if (
    environmentMetadata.width !== CANVAS.width ||
    environmentMetadata.height !== CANVAS.height
  ) {
    throw new Error(
      `${floor.id} environment must be ${CANVAS.width}×${CANVAS.height}`,
    )
  }

  const geometry = stallGeometry(floor)
  const layers = [
    { input: environment, left: 0, top: 0 },
    { input: floorShadeSvg(), left: 0, top: 0 },
  ]

  const floorRailHeight = raster(clamp(20, MARKET_METER * 0.2, 34))
  const floorRailBottom = MARKET_METER * 0.12
  const floorRail = await horizontalBeamStrip(
    CANVAS.width,
    floorRailHeight,
    0.58,
  )
  layers.push({
    input: floorRail,
    left: 0,
    top: raster(CANVAS.height - floorRailBottom - floorRailHeight),
  })

  layers.push({ input: contactShadowSvg(geometry.stalls), left: 0, top: 0 })

  for (const stall of geometry.stalls) {
    layers.push({
      input: await resizeAsset(
        stall.source,
        stall.raster.width,
        stall.raster.height,
      ),
      left: stall.raster.left,
      top: stall.raster.top,
    })
  }

  const separatorBeamWidth = raster(clamp(18, MARKET_METER * 0.16, 30))
  const separatorJointSize = raster(clamp(34, MARKET_METER * 0.3, 58))
  const separatorHeight = raster(BAY_HEIGHT)
  const separatorBeam = await verticalBeamStrip(
    separatorBeamWidth,
    separatorHeight,
  )
  const separatorJoint = await resizeAsset(
    BEAM_JOINT,
    separatorJointSize,
    separatorJointSize,
  )

  for (const separator of geometry.separators) {
    const top = raster(separator.float.top)
    const center = separator.float.left + separator.float.width / 2
    layers.push({
      input: separatorBeam,
      left: raster(center - separatorBeamWidth / 2),
      top,
    })
    layers.push({
      input: separatorJoint,
      left: raster(center - separatorJointSize / 2),
      top,
    })
    layers.push({
      input: separatorJoint,
      left: raster(center - separatorJointSize / 2),
      top: raster(top + BAY_HEIGHT - separatorJointSize),
    })
  }

  const stairsWidth = raster(STAIRS_WIDTH)
  const stairsHeight = raster(STAIRS_HEIGHT)
  const stairsLeft =
    floor.stairsSide === 'left' ? 0 : CANVAS.width - stairsWidth
  layers.push({
    input: await resizeAsset(
      path.join(ARCHITECTURE_ROOT, floor.stairCore),
      stairsWidth,
      stairsHeight,
    ),
    left: stairsLeft,
    top: 0,
  })

  const stairBoundaryWidth = separatorBeamWidth
  const stairBoundary = await verticalBeamStrip(
    stairBoundaryWidth,
    stairsHeight,
  )
  const stairBoundaryLeft =
    floor.stairsSide === 'left'
      ? raster(STAIRS_WIDTH + MARKET_METER * 0.08 - stairBoundaryWidth)
      : raster(CANVAS.width - STAIRS_WIDTH - MARKET_METER * 0.08)
  layers.push({
    input: stairBoundary,
    left: stairBoundaryLeft,
    top: 0,
  })

  const ceilingHeight = raster(clamp(24, MARKET_METER * 0.26, 42))
  layers.push({
    input: await horizontalBeamStrip(CANVAS.width, ceilingHeight, 0.72),
    left: 0,
    top: 0,
  })

  const stairTopWidth = raster(STAIRS_WIDTH + MARKET_METER * 0.42)
  layers.push({
    input: await horizontalBeamStrip(stairTopWidth, ceilingHeight, 0.72),
    left: floor.stairsSide === 'left' ? 0 : CANVAS.width - stairTopWidth,
    top: 0,
  })

  const output = sharp({
    create: {
      width: CANVAS.width,
      height: CANVAS.height,
      channels: 4,
      background: '#020307',
    },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })

  const outputBuffer = await output.toBuffer()
  const outputPath = path.join(OUTPUT_ROOT, `${floor.id}-desktop-preview.png`)
  await writeFile(outputPath, outputBuffer)

  return {
    id: floor.id,
    outputPath,
    outputBuffer,
    geometry,
    sources: {
      environment,
      stairCore: path.join(ARCHITECTURE_ROOT, floor.stairCore),
      stalls: geometry.stalls.map((stall) => stall.source),
    },
  }
}

function labelSvg(label, width, height) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#05080d"/>
      <rect x="0" y="${height - 3}" width="${width}" height="3" fill="#2b3741"/>
      <text x="18" y="${height - 11}"
        font-family="monospace" font-size="16" font-weight="700"
        letter-spacing="2" fill="#d6dbe6">${label.toUpperCase()} — 1248×597 QA PREVIEW</text>
    </svg>
  `)
}

async function buildContactSheet(previews) {
  const labelHeight = 39
  const sheetHeight = previews.length * (labelHeight + CANVAS.height)
  const layers = []

  previews.forEach((preview, index) => {
    const top = index * (labelHeight + CANVAS.height)
    layers.push({
      input: labelSvg(preview.id, CANVAS.width, labelHeight),
      left: 0,
      top,
    })
    layers.push({
      input: preview.outputBuffer,
      left: 0,
      top: top + labelHeight,
    })
  })

  const buffer = await sharp({
    create: {
      width: CANVAS.width,
      height: sheetHeight,
      channels: 4,
      background: '#020307',
    },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer()
  const outputPath = path.join(
    OUTPUT_ROOT,
    'desktop-floor-previews-contact-sheet.png',
  )
  await writeFile(outputPath, buffer)
  return { buffer, outputPath, width: CANVAS.width, height: sheetHeight }
}

await verifyRuntimeContract()
await mkdir(OUTPUT_ROOT, { recursive: true })

const previews = []
for (const floor of FLOORS) {
  previews.push(await buildFloorPreview(floor))
}
const contactSheet = await buildContactSheet(previews)

const report = {
  schemaVersion: 1,
  purpose: 'visual-calibration-only',
  runtimeAsset: false,
  canvas: CANVAS,
  geometry: {
    svhPx: fixed(SVH),
    marketMeterPx: fixed(MARKET_METER),
    rowBottomPx: fixed(ROW_BOTTOM),
    stairsWidthPx: fixed(STAIRS_WIDTH),
    stairsHeightPx: fixed(STAIRS_HEIGHT),
    bayGapPx: fixed(BAY_GAP),
    bayHeightPx: fixed(BAY_HEIGHT),
    browserToRasterRule: 'Math.round each final box edge/size',
  },
  floors: {},
  contactSheet: {
    output: path.relative(ROOT, contactSheet.outputPath),
    width: contactSheet.width,
    height: contactSheet.height,
    sha256: sha256(contactSheet.buffer),
  },
}

for (const preview of previews) {
  report.floors[preview.id] = {
    output: path.relative(ROOT, preview.outputPath),
    sha256: sha256(preview.outputBuffer),
    stairsSide: FLOORS.find((floor) => floor.id === preview.id).stairsSide,
    row: {
      left: fixed(preview.geometry.rowLeft),
      right: fixed(preview.geometry.rowRight),
      width: fixed(preview.geometry.rowWidth),
      contentWidth: fixed(preview.geometry.totalWidth),
    },
    stalls: preview.geometry.stalls.map((stall) => ({
      id: stall.id,
      source: path.relative(ROOT, stall.source),
      sourceSha256: null,
      float: Object.fromEntries(
        Object.entries(stall.float).map(([key, value]) => [key, fixed(value)]),
      ),
      raster: stall.raster,
    })),
    sources: {
      environment: {
        path: path.relative(ROOT, preview.sources.environment),
        sha256: await fileHash(preview.sources.environment),
      },
      stairCore: {
        path: path.relative(ROOT, preview.sources.stairCore),
        sha256: await fileHash(preview.sources.stairCore),
      },
    },
  }

  for (const stall of report.floors[preview.id].stalls) {
    stall.sourceSha256 = await fileHash(path.join(ROOT, stall.source))
  }
}

await writeFile(
  path.join(OUTPUT_ROOT, 'preview-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)

console.log(
  JSON.stringify(
    {
      status: 'pass',
      outputs: [
        ...previews.map((preview) => path.relative(ROOT, preview.outputPath)),
        path.relative(ROOT, contactSheet.outputPath),
        path.relative(ROOT, path.join(OUTPUT_ROOT, 'preview-report.json')),
      ],
    },
    null,
    2,
  ),
)
