import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const SOURCE = path.join(
  ROOT,
  'public/images/bazaar3/assets/architecture/desktop-core-2.png',
)
const OUTPUT = path.join(
  ROOT,
  'public/images/bazaar3/assets/architecture/desktop-core-2-workshop.png',
)
const REPORT = path.join(
  ROOT,
  'scripts/bazaar3/reports/integration/workshop-v2/workshop-stair-core.json',
)

const LOGICAL = { width: 133, height: 577 }
const DELIVERED = { width: 399, height: 1731 }
const PALETTE_LIMIT = 20

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

await mkdir(path.dirname(OUTPUT), { recursive: true })
await mkdir(path.dirname(REPORT), { recursive: true })

const source = await readFile(SOURCE)
const sourceMetadata = await sharp(source).metadata()

const logical = await sharp(source)
  .resize({
    width: LOGICAL.width,
    height: LOGICAL.height,
    fit: 'fill',
    kernel: sharp.kernel.nearest,
  })
  .png({ palette: true, colors: PALETTE_LIMIT, dither: 0 })
  .toBuffer()

const delivered = await sharp(logical)
  .resize({
    width: DELIVERED.width,
    height: DELIVERED.height,
    fit: 'fill',
    kernel: sharp.kernel.nearest,
  })
  .png({ palette: true, colors: PALETTE_LIMIT, dither: 0 })
  .toBuffer()

await writeFile(OUTPUT, delivered)

const metadata = await sharp(delivered).metadata()
const stats = await sharp(delivered).stats()
const checks = {
  sourceDimensions:
    sourceMetadata.width === 400 && sourceMetadata.height === 1730,
  deliveredDimensions:
    metadata.width === DELIVERED.width && metadata.height === DELIVERED.height,
  transparentBacking: !stats.isOpaque,
  exactThreePixelCanvas:
    DELIVERED.width === LOGICAL.width * 3 &&
    DELIVERED.height === LOGICAL.height * 3,
}

if (Object.values(checks).some((passed) => !passed)) {
  throw new Error(
    `Workshop stair normalization failed: ${JSON.stringify(checks)}`,
  )
}

await writeFile(
  REPORT,
  `${JSON.stringify(
    {
      status: 'pass',
      source: path.relative(ROOT, SOURCE),
      sourceSha256: sha256(source),
      sourceDimensions: {
        width: sourceMetadata.width,
        height: sourceMetadata.height,
      },
      logicalCanvas: LOGICAL,
      deliveredCanvas: DELIVERED,
      paletteLimit: PALETTE_LIMIT,
      checks,
      output: path.relative(ROOT, OUTPUT),
      outputSha256: sha256(delivered),
    },
    null,
    2,
  )}\n`,
)

console.log(path.relative(ROOT, OUTPUT))
