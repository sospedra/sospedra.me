#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const LOGICAL_WIDTH = 320
const LOGICAL_HEIGHT = 421
const SOURCE_ART_HEIGHT = 420
const SCALE = 3
const OUTPUT_WIDTH = LOGICAL_WIDTH * SCALE
const OUTPUT_HEIGHT = LOGICAL_HEIGHT * SCALE + 1

const parseArgs = (values) => {
  const args = new Map()
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]
    const value = values[index + 1]
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? '<end>'}`)
    }
    args.set(key.slice(2), value)
  }
  return args
}

const parseTuple = (value, length, label) => {
  const tuple = value?.split(',').map((part) => Number.parseInt(part, 10))
  if (
    tuple?.length !== length ||
    tuple.some((entry) => !Number.isInteger(entry))
  ) {
    throw new Error(`${label} must contain ${length} comma-separated integers`)
  }
  return tuple
}

const alphaBbox = (data, width, height) => {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let pixels = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      pixels += 1
    }
  }
  if (pixels === 0) return null
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    pixels,
  }
}

const args = parseArgs(process.argv.slice(2))
const input = args.get('input')
const output = args.get('output')
const reportPath = args.get('report') ?? `${output}.json`
const [stageWidth, stageHeight] = parseTuple(
  args.get('stage') ?? '160,210',
  2,
  '--stage',
)
const [left, top] = parseTuple(args.get('at') ?? '94,135', 2, '--at')

if (!input || !output) {
  throw new Error(
    'Usage: prepare-isolated-cel.mjs --input keyed.png --output cel.png ' +
      '[--stage 160,210 --at 94,135 --report report.json]',
  )
}
if (
  stageWidth <= 0 ||
  stageHeight <= 0 ||
  left < 0 ||
  top < 0 ||
  left + stageWidth > LOGICAL_WIDTH ||
  top + stageHeight > LOGICAL_HEIGHT
) {
  throw new Error('The scaled stage must fit inside the 320x421 canvas')
}

const normalized = await sharp(input, {
  failOn: 'error',
  limitInputPixels: false,
})
  .ensureAlpha()
  .extract({
    left: 0,
    top: 0,
    width: OUTPUT_WIDTH,
    height: SOURCE_ART_HEIGHT * SCALE,
  })
  .resize(LOGICAL_WIDTH, SOURCE_ART_HEIGHT, {
    fit: 'fill',
    kernel: sharp.kernel.nearest,
  })
  .resize(stageWidth, stageHeight, {
    fit: 'fill',
    kernel: sharp.kernel.nearest,
  })
  .raw()
  .toBuffer({ resolveWithObject: true })

for (let offset = 3; offset < normalized.data.length; offset += 4) {
  normalized.data[offset] = normalized.data[offset] >= 128 ? 255 : 0
}

const logical = Buffer.alloc(LOGICAL_WIDTH * LOGICAL_HEIGHT * 4)
for (let y = 0; y < stageHeight; y += 1) {
  for (let x = 0; x < stageWidth; x += 1) {
    const sourceOffset = (y * stageWidth + x) * 4
    const destinationOffset = ((top + y) * LOGICAL_WIDTH + left + x) * 4
    normalized.data.copy(
      logical,
      destinationOffset,
      sourceOffset,
      sourceOffset + 4,
    )
  }
}

const logicalBbox = alphaBbox(logical, LOGICAL_WIDTH, LOGICAL_HEIGHT)
await mkdir(path.dirname(output), { recursive: true })
await sharp(logical, {
  raw: {
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    channels: 4,
  },
})
  .resize(OUTPUT_WIDTH, LOGICAL_HEIGHT * SCALE, {
    fit: 'fill',
    kernel: sharp.kernel.nearest,
  })
  .extend({
    bottom: 1,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({
    adaptiveFiltering: false,
    compressionLevel: 9,
    palette: false,
  })
  .toFile(output)

const report = {
  input: path.resolve(input),
  output: path.resolve(output),
  sourceLogicalCanvas: {
    width: LOGICAL_WIDTH,
    height: SOURCE_ART_HEIGHT,
  },
  scaledStage: { width: stageWidth, height: stageHeight, left, top },
  outputCanvas: { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT },
  logicalBbox,
  outputBbox: logicalBbox
    ? {
        x: logicalBbox.x * SCALE,
        y: logicalBbox.y * SCALE,
        width: logicalBbox.width * SCALE,
        height: logicalBbox.height * SCALE,
      }
    : null,
}
await mkdir(path.dirname(reportPath), { recursive: true })
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  `${output}: ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}, bbox ${JSON.stringify(
    logicalBbox,
  )}`,
)
