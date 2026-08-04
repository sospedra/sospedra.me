#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const LOGICAL_WIDTH = 320
const LOGICAL_HEIGHT = 421
const SCALE = 3
const OUTPUT_WIDTH = LOGICAL_WIDTH * SCALE
const OUTPUT_ART_HEIGHT = LOGICAL_HEIGHT * SCALE
const OUTPUT_HEIGHT = OUTPUT_ART_HEIGHT + 1

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

const readLogical = async (file) => {
  const metadata = await sharp(file).metadata()
  if (metadata.width !== OUTPUT_WIDTH || metadata.height !== OUTPUT_HEIGHT) {
    throw new Error(`${file} must be ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}`)
  }
  const { data } = await sharp(file)
    .ensureAlpha()
    .extract({
      left: 0,
      top: 0,
      width: OUTPUT_WIDTH,
      height: OUTPUT_ART_HEIGHT,
    })
    .resize(LOGICAL_WIDTH, LOGICAL_HEIGHT, {
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .raw()
    .toBuffer({ resolveWithObject: true })
  for (let offset = 3; offset < data.length; offset += 4) {
    data[offset] = data[offset] >= 128 ? 255 : 0
  }
  return data
}

const alphaBbox = (data) => {
  let minX = LOGICAL_WIDTH
  let minY = LOGICAL_HEIGHT
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < LOGICAL_HEIGHT; y += 1) {
    for (let x = 0; x < LOGICAL_WIDTH; x += 1) {
      if (data[(y * LOGICAL_WIDTH + x) * 4 + 3] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX < 0) return null
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

const args = parseArgs(process.argv.slice(2))
const basePath = args.get('base')
const candidatePath = args.get('candidate')
const maskPath = args.get('mask')
const output = args.get('output')
const reportPath = args.get('report') ?? `${output}.json`

if (!basePath || !candidatePath || !maskPath || !output) {
  throw new Error(
    'Usage: lock-cel-motion.mjs --base idle.png --candidate pose.png ' +
      '--mask motion-mask.png --output locked.png',
  )
}

const [base, candidate] = await Promise.all([
  readLogical(basePath),
  readLogical(candidatePath),
])
const maskMetadata = await sharp(maskPath).metadata()
if (
  maskMetadata.width !== LOGICAL_WIDTH ||
  maskMetadata.height !== LOGICAL_HEIGHT
) {
  throw new Error(`Motion mask must be ${LOGICAL_WIDTH}x${LOGICAL_HEIGHT}`)
}
const { data: mask } = await sharp(maskPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const outputLogical = Buffer.from(base)
let allowedPixels = 0
let changedInside = 0
let changedOutside = 0
for (let pixel = 0; pixel < LOGICAL_WIDTH * LOGICAL_HEIGHT; pixel += 1) {
  const offset = pixel * 4
  const allowed = mask[offset + 3] === 255
  let differs = false
  for (let channel = 0; channel < 4; channel += 1) {
    if (candidate[offset + channel] !== base[offset + channel]) differs = true
  }
  if (allowed) {
    allowedPixels += 1
    if (differs) changedInside += 1
    candidate.copy(outputLogical, offset, offset, offset + 4)
  } else if (differs) {
    changedOutside += 1
  }
}

await mkdir(path.dirname(output), { recursive: true })
await sharp(outputLogical, {
  raw: {
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    channels: 4,
  },
})
  .resize(OUTPUT_WIDTH, OUTPUT_ART_HEIGHT, {
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
  base: path.resolve(basePath),
  candidate: path.resolve(candidatePath),
  mask: path.resolve(maskPath),
  output: path.resolve(output),
  allowedPixels,
  changedInside,
  rejectedCandidateChangesOutsideMask: changedOutside,
  logicalBbox: alphaBbox(outputLogical),
  invariant:
    'Every output RGBA byte outside the opaque motion mask is copied from base.',
}
await mkdir(path.dirname(reportPath), { recursive: true })
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  `${output}: ${changedInside} allowed changes; ${changedOutside} candidate changes rejected`,
)
