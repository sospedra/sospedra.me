import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const SOURCE = path.join(
  ROOT,
  'scripts/bazaar3/sources/integration/workshop-v2/workshop-shell-raw.png',
)
const OUTPUT = path.join(
  ROOT,
  'public/images/bazaar3/assets/integration/floors/workshop-desktop/environment-base.png',
)
const REPORT_DIR = path.join(
  ROOT,
  'scripts/bazaar3/reports/integration/workshop-v2',
)
const REPORT = path.join(REPORT_DIR, 'workshop-shell-build.json')
const PREVIEW = path.join(REPORT_DIR, 'workshop-shell-environment-base.png')

const LOGICAL = { width: 416, height: 199 }
const DELIVERED = { width: 1248, height: 597 }
const AUTHORED_PIXEL_SCALE = 3
const PALETTE_LIMIT = 18

/*
 * The generated design proof had a lower-left stair/ramp implication even
 * though the live desktop stair is viewport-edge anchored. Cropping the first
 * 105 source pixels removes that false aperture and leaves a continuous wall,
 * deck, trench, and fascia for the real stair collar to bridge into.
 */
const SOURCE_CROP = {
  left: 105,
  top: 0,
  width: 1707,
  height: 868,
}

const hash = (value) => createHash('sha256').update(value).digest('hex')

function visiblePalette(data, channels) {
  const colors = new Set()
  for (let offset = 0; offset < data.length; offset += channels) {
    const alpha = channels === 4 ? data[offset + 3] : 255
    if (alpha === 0) continue
    colors.add(
      `${data[offset]},${data[offset + 1]},${data[offset + 2]},${alpha}`,
    )
  }
  return colors
}

function blockGridIsExact(data, width, height, channels, block) {
  for (let y = 0; y < height; y += block) {
    for (let x = 0; x < width; x += block) {
      const root = (y * width + x) * channels
      for (let localY = 0; localY < block; localY += 1) {
        for (let localX = 0; localX < block; localX += 1) {
          const offset = ((y + localY) * width + (x + localX)) * channels
          for (let channel = 0; channel < channels; channel += 1) {
            if (data[offset + channel] !== data[root + channel]) return false
          }
        }
      }
    }
  }
  return true
}

await mkdir(path.dirname(OUTPUT), { recursive: true })
await mkdir(REPORT_DIR, { recursive: true })

const sourceBytes = await readFile(SOURCE)
const sourceMetadata = await sharp(sourceBytes).metadata()

if (
  sourceMetadata.width !== SOURCE_CROP.left + SOURCE_CROP.width ||
  sourceMetadata.height !== SOURCE_CROP.height
) {
  throw new Error(
    `Unexpected workshop shell source size: ${sourceMetadata.width}x${sourceMetadata.height}`,
  )
}

const logical = await sharp(sourceBytes)
  .extract(SOURCE_CROP)
  .resize({
    width: LOGICAL.width,
    height: LOGICAL.height,
    fit: 'fill',
    kernel: sharp.kernel.nearest,
  })
  .removeAlpha()
  .png({
    palette: true,
    colors: PALETTE_LIMIT,
    dither: 0,
  })
  .toBuffer()

const delivered = await sharp(logical)
  .resize({
    width: DELIVERED.width,
    height: DELIVERED.height,
    fit: 'fill',
    kernel: sharp.kernel.nearest,
  })
  .png({
    palette: true,
    colors: PALETTE_LIMIT,
    dither: 0,
  })
  .toBuffer()

await writeFile(OUTPUT, delivered)
await writeFile(PREVIEW, delivered)

const { data, info } = await sharp(delivered)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const palette = visiblePalette(data, info.channels)
const metadata = await sharp(delivered).metadata()
const stats = await sharp(delivered).stats()
const gridExact = blockGridIsExact(
  data,
  info.width,
  info.height,
  info.channels,
  AUTHORED_PIXEL_SCALE,
)

const checks = {
  dimensions:
    metadata.width === DELIVERED.width && metadata.height === DELIVERED.height,
  opaque: stats.isOpaque,
  palette: palette.size <= PALETTE_LIMIT,
  exactThreePixelGrid: gridExact,
}

if (Object.values(checks).some((passed) => !passed)) {
  throw new Error(`Workshop shell validation failed: ${JSON.stringify(checks)}`)
}

await writeFile(
  REPORT,
  `${JSON.stringify(
    {
      status: 'pass',
      source: path.relative(ROOT, SOURCE),
      sourceSha256: hash(sourceBytes),
      sourceDimensions: {
        width: sourceMetadata.width,
        height: sourceMetadata.height,
      },
      sourceCrop: SOURCE_CROP,
      logicalCanvas: LOGICAL,
      deliveredCanvas: DELIVERED,
      authoredPixelScale: AUTHORED_PIXEL_SCALE,
      paletteLimit: PALETTE_LIMIT,
      visibleColors: palette.size,
      checks,
      output: path.relative(ROOT, OUTPUT),
      outputSha256: hash(delivered),
      preview: path.relative(ROOT, PREVIEW),
    },
    null,
    2,
  )}\n`,
)

console.log(path.relative(ROOT, OUTPUT))
console.log(path.relative(ROOT, REPORT))
