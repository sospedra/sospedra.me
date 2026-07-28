import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const SOURCE_DIR = path.join(
  ROOT,
  'scripts/bazaar3/sources/integration/workshop',
)
const REPORT_DIR = path.join(
  ROOT,
  'scripts/bazaar3/reports/integration/workshop',
)
const STALL_ROOT = path.join(ROOT, 'public/images/bazaar3/assets/stalls')
const INTEGRATION_ROOT = path.join(
  ROOT,
  'public/images/bazaar3/assets/integration/floors/workshop-desktop',
)

const STAGE = { width: 1248, height: 597 }
const LOGICAL = { width: 416, height: 199 }

const stalls = [
  {
    id: 'manual',
    src: path.join(STALL_ROOT, 'manual/frames/idle-1.png'),
    box: { left: 162, top: 137, width: 306, height: 407 },
  },
  {
    id: 'console',
    src: path.join(STALL_ROOT, 'console-v2/frames/idle-1.png'),
    box: { left: 506, top: 237, width: 251, height: 326 },
  },
  {
    id: 'talks',
    src: path.join(STALL_ROOT, 'talks/frames/idle-1.png'),
    box: { left: 794, top: 137, width: 380, height: 407 },
  },
]

await mkdir(REPORT_DIR, { recursive: true })

const sourcePath = path.join(
  SOURCE_DIR,
  'concept-e-environment-stair-aperture.png',
)
const basePath = path.join(REPORT_DIR, 'environment-base-e-1248x597.png')
const proofPath = path.join(REPORT_DIR, 'proof-e-approved-stalls.png')
const boundsPath = path.join(REPORT_DIR, 'proof-e-registration-bounds.png')
const reportPath = path.join(REPORT_DIR, 'proof-e.json')
const integratedProofPath = path.join(
  REPORT_DIR,
  'proof-e-runtime-layer-order.png',
)

const logicalBase = await sharp(sourcePath)
  .resize({
    width: LOGICAL.width,
    height: LOGICAL.height,
    fit: 'fill',
    kernel: sharp.kernel.nearest,
  })
  .png({ palette: true, colors: 20, dither: 0 })
  .toBuffer()

await sharp(logicalBase)
  .resize({
    width: STAGE.width,
    height: STAGE.height,
    fit: 'fill',
    kernel: sharp.kernel.nearest,
  })
  .png({ palette: true, colors: 20, dither: 0 })
  .toFile(basePath)

const stallInputs = await Promise.all(
  stalls.map(async ({ id, src, box }) => ({
    id,
    input: await sharp(src)
      .resize({
        width: box.width,
        height: box.height,
        fit: 'fill',
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer(),
    left: box.left,
    top: box.top,
  })),
)

await sharp(basePath)
  .composite(
    stallInputs.map(({ input, left, top }) => ({
      input,
      left,
      top,
    })),
  )
  .png()
  .toFile(proofPath)

const layer = (file) => ({
  input: path.join(INTEGRATION_ROOT, file),
  left: 0,
  top: 0,
})

async function layerWithOpacity(file, opacity) {
  const source = path.join(INTEGRATION_ROOT, file)
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let index = 3; index < data.length; index += info.channels) {
    data[index] = Math.round(data[index] * opacity)
  }

  return {
    input: await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
    })
      .png()
      .toBuffer(),
    left: 0,
    top: 0,
  }
}

await sharp(path.join(INTEGRATION_ROOT, 'environment-base.png'))
  .composite([
    layer('stairs-rear.png'),
    layer('connections-manual-rear.png'),
    layer('connections-console-rear.png'),
    layer('connections-talks-rear.png'),
    await layerWithOpacity('receiver-manual.png', 0.2),
    await layerWithOpacity('receiver-console.png', 0.2),
    await layerWithOpacity('receiver-talks.png', 0.2),
    layer('utility-mid.png'),
    await layerWithOpacity('caster-manual.png', 0.76),
    await layerWithOpacity('caster-console.png', 0.76),
    await layerWithOpacity('caster-talks.png', 0.76),
    await layerWithOpacity('contact-manual.png', 0.88),
    await layerWithOpacity('contact-console.png', 0.88),
    await layerWithOpacity('contact-talks.png', 0.88),
    ...stallInputs.map(({ input, left, top }) => ({
      input,
      left,
      top,
    })),
    layer('connections-manual-front.png'),
    layer('connections-console-front.png'),
    layer('connections-talks-front.png'),
    layer('front-occluders.png'),
    layer('stairs-front.png'),
  ])
  .png()
  .toFile(integratedProofPath)

const boundsSvg = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${STAGE.width}" height="${STAGE.height}">
    <rect width="${STAGE.width}" height="${STAGE.height}" fill="none" stroke="#37f7e0" stroke-width="3"/>
    ${stalls
      .map(
        ({ id, box }) => `
          <rect x="${box.left}" y="${box.top}" width="${box.width}" height="${box.height}" fill="none" stroke="#ffdf6e" stroke-width="3" stroke-dasharray="12 6"/>
          <text x="${box.left + 6}" y="${box.top + 18}" fill="#ffdf6e" font-family="monospace" font-size="15">${id}</text>
        `,
      )
      .join('')}
  </svg>
`)

await sharp(proofPath)
  .composite([{ input: boundsSvg, left: 0, top: 0 }])
  .png()
  .toFile(boundsPath)

const baseMetadata = await sharp(basePath).metadata()
const baseStats = await sharp(basePath).stats()
const sourceMetadata = await sharp(sourcePath).metadata()

await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      source: path.relative(ROOT, sourcePath),
      sourceDimensions: {
        width: sourceMetadata.width,
        height: sourceMetadata.height,
      },
      logicalStage: LOGICAL,
      deliveredStage: STAGE,
      authoredPixelScale: 3,
      opaqueBase: baseStats.isOpaque,
      output: path.relative(ROOT, basePath),
      proof: path.relative(ROOT, proofPath),
      integratedProof: path.relative(ROOT, integratedProofPath),
      registrationProof: path.relative(ROOT, boundsPath),
      outputMetadata: {
        width: baseMetadata.width,
        height: baseMetadata.height,
        channels: baseMetadata.channels,
        hasAlpha: baseMetadata.hasAlpha,
      },
      stalls: stalls.map(({ id, src, box }) => ({
        id,
        src: path.relative(ROOT, src),
        box,
      })),
    },
    null,
    2,
  )}\n`,
)

console.log(path.relative(ROOT, proofPath))
console.log(path.relative(ROOT, integratedProofPath))
console.log(path.relative(ROOT, boundsPath))
