import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const OUTPUT_DIR = path.join(
  ROOT,
  'scripts/bazaar3/sources/integration/workshop',
)
const LOGICAL_WIDTH = 416
const LOGICAL_HEIGHT = 199
const PIXEL_SCALE = 3

const boxes = {
  stairs: { x: 0, y: 0, width: 32, height: 199 },
  manual: { x: 54, y: 46, width: 102, height: 135 },
  console: { x: 169, y: 79, width: 83, height: 108 },
  talks: { x: 265, y: 46, width: 126, height: 135 },
  ceiling: { x: 32, y: 16, width: 374, height: 12 },
  rail: { x: 37, y: 35, width: 368, height: 9 },
  vent: { x: 37, y: 49, width: 368, height: 9 },
  trench: { x: 35, y: 183, width: 373, height: 9 },
  threshold: { x: 0, y: 192, width: 416, height: 7 },
}

const rect = (box, fill, stroke, dash = '') =>
  `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${fill}" stroke="${stroke}" stroke-width="1"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${LOGICAL_WIDTH}" height="${LOGICAL_HEIGHT}" viewBox="0 0 ${LOGICAL_WIDTH} ${LOGICAL_HEIGHT}">
  <rect width="${LOGICAL_WIDTH}" height="${LOGICAL_HEIGHT}" fill="#05070a"/>
  <rect y="104" width="${LOGICAL_WIDTH}" height="95" fill="#111821"/>
  ${rect(boxes.ceiling, '#1a222b', '#b97942')}
  ${rect(boxes.rail, '#18242c', '#8c754f')}
  ${rect(boxes.vent, '#141c24', '#46515a')}
  ${rect(boxes.trench, '#070a0e', '#b97942')}
  ${rect(boxes.threshold, '#11161d', '#46515a')}
  ${rect(boxes.stairs, '#222936', '#37f7e0')}
  ${rect(boxes.manual, '#29473d66', '#55d98b', '4 2')}
  ${rect(boxes.console, '#463c2866', '#e2b75c', '4 2')}
  ${rect(boxes.talks, '#2a344a66', '#73a7ff', '4 2')}
  <g fill="#f3ead6" font-family="monospace" font-size="7" font-weight="700">
    <text x="4" y="12">STAIR</text>
    <text x="82" y="115">MANUAL</text>
    <text x="186" y="135">CONSOLE</text>
    <text x="308" y="115">TALKS</text>
    <text x="180" y="24">HEAVY CEILING</text>
    <text x="182" y="42">POWER / TOOL RAIL</text>
    <text x="192" y="56">VENT</text>
    <text x="188" y="190">CABLE TRENCH</text>
  </g>
</svg>
`

await mkdir(OUTPUT_DIR, { recursive: true })

const logicalPath = path.join(OUTPUT_DIR, 'registration-guide-logical.png')
const deliveredPath = path.join(OUTPUT_DIR, 'registration-guide-1248x597.png')
const manifestPath = path.join(OUTPUT_DIR, 'registration-guide.json')

const logical = await sharp(Buffer.from(svg)).png().toBuffer()
await writeFile(logicalPath, logical)
await sharp(logical)
  .resize({
    width: LOGICAL_WIDTH * PIXEL_SCALE,
    height: LOGICAL_HEIGHT * PIXEL_SCALE,
    kernel: sharp.kernel.nearest,
  })
  .png()
  .toFile(deliveredPath)

await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      sourceCanvas: { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT },
      deliveredCanvas: {
        width: LOGICAL_WIDTH * PIXEL_SCALE,
        height: LOGICAL_HEIGHT * PIXEL_SCALE,
      },
      authoredPixelScale: PIXEL_SCALE,
      boxes,
    },
    null,
    2,
  )}\n`,
)

console.log(path.relative(ROOT, deliveredPath))
