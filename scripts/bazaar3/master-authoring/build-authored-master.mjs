import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {
  drawArchitectureFront,
  drawArchitectureRear,
} from './draw-architecture.mjs'
import { drawGames } from './draw-games.mjs'
import { drawProjects } from './draw-projects.mjs'
import { drawTravel } from './draw-travel.mjs'
import { P, PixelCanvas } from './pixel-canvas.mjs'

const workspace = process.cwd()
const outputDirectory = path.join(
  workspace,
  'public/images/bazaar3/master-tests/authored-v6',
)
const masterOutput = path.join(
  workspace,
  'public/images/bazaar3/master-tests/leisure-transit-master-v6-authored.png',
)
const logicalOutput = path.join(outputDirectory, 'logical-416x199.png')
const sceneOutput = path.join(outputDirectory, 'canonical-scene-1248x597.png')
const provenanceOutput = path.join(outputDirectory, 'provenance.json')

await mkdir(outputDirectory, { recursive: true })

const canvas = new PixelCanvas(416, 199, P.n0)
drawArchitectureRear(canvas)
drawProjects(canvas)
drawGames(canvas)
drawTravel(canvas)
drawArchitectureFront(canvas)

await sharp(Buffer.from(canvas.data), {
  raw: { width: 416, height: 199, channels: 4 },
})
  .png({ compressionLevel: 9, palette: false })
  .toFile(logicalOutput)

const sceneBuffer = await sharp(Buffer.from(canvas.data), {
  raw: { width: 416, height: 199, channels: 4 },
})
  .resize(1248, 597, { kernel: sharp.kernel.nearest })
  .png({ compressionLevel: 9, palette: false })
  .toBuffer()

await writeFile(sceneOutput, sceneBuffer)

await sharp({
  create: {
    width: 1536,
    height: 1024,
    channels: 4,
    background: P.n0,
  },
})
  .composite([{ input: sceneBuffer, left: 144, top: 213 }])
  .png({ compressionLevel: 9, palette: false })
  .toFile(masterOutput)

const sourceFiles = [
  'app/bazaar3/prompts/leisure-transit-master-v4.md',
  'app/bazaar3/prompts/leisure-transit-master-v5-correction.md',
  'scripts/bazaar3/master-authoring/pixel-canvas.mjs',
  'scripts/bazaar3/master-authoring/draw-architecture.mjs',
  'scripts/bazaar3/master-authoring/draw-projects.mjs',
  'scripts/bazaar3/master-authoring/draw-games.mjs',
  'scripts/bazaar3/master-authoring/draw-travel.mjs',
  'scripts/bazaar3/master-authoring/build-authored-master.mjs',
]

const hashes = {}
for (const sourceFile of sourceFiles) {
  const contents = await readFile(path.join(workspace, sourceFile))
  hashes[sourceFile] = createHash('sha256').update(contents).digest('hex')
}

const masterBytes = await readFile(masterOutput)
await writeFile(
  provenanceOutput,
  `${JSON.stringify(
    {
      role: 'authored-design-master',
      logicalCanvas: { width: 416, height: 199 },
      pixelScale: 3,
      sceneWindow: { x: 144, y: 213, width: 1248, height: 597 },
      deliveryCanvas: { width: 1536, height: 1024 },
      paletteSource: 'scripts/bazaar3/master-candidate.config.json',
      generatedFromPriorRaster: false,
      nearestNeighborUpscale: true,
      sourceHashes: hashes,
      outputSha256: createHash('sha256').update(masterBytes).digest('hex'),
    },
    null,
    2,
  )}\n`,
)

console.log(path.relative(workspace, masterOutput))
console.log(path.relative(workspace, logicalOutput))
console.log(path.relative(workspace, sceneOutput))
console.log(path.relative(workspace, provenanceOutput))
