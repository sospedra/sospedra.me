#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

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

const colorKey = (red, green, blue) => (red << 16) | (green << 8) | blue

const args = parseArgs(process.argv.slice(2))
const input = args.get('input')
const paletteSource = args.get('palette-source')
const output = args.get('output')
const reportPath = args.get('report') ?? `${output}.json`

if (!input || !paletteSource || !output) {
  throw new Error(
    'Usage: remap-to-master-palette.mjs --input sprite.png ' +
      '--palette-source master.png --output sprite-remapped.png',
  )
}

const [source, master] = await Promise.all([
  sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  sharp(paletteSource)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }),
])
if (
  source.info.width !== master.info.width ||
  source.info.height !== master.info.height
) {
  throw new Error('Input and palette source must have identical dimensions')
}

const paletteByKey = new Map()
for (let offset = 0; offset < master.data.length; offset += 4) {
  if (master.data[offset + 3] === 0) continue
  const red = master.data[offset]
  const green = master.data[offset + 1]
  const blue = master.data[offset + 2]
  paletteByKey.set(colorKey(red, green, blue), { red, green, blue })
}
const palette = [...paletteByKey.values()]
if (palette.length === 0) throw new Error('Palette source has no opaque colors')

const cache = new Map()
let changedPixels = 0
for (let offset = 0; offset < source.data.length; offset += 4) {
  const alpha = source.data[offset + 3]
  source.data[offset + 3] = alpha >= 128 ? 255 : 0
  if (source.data[offset + 3] === 0) {
    source.data[offset] = 0
    source.data[offset + 1] = 0
    source.data[offset + 2] = 0
    continue
  }
  const red = source.data[offset]
  const green = source.data[offset + 1]
  const blue = source.data[offset + 2]
  const key = colorKey(red, green, blue)
  let mapped = cache.get(key)
  if (!mapped) {
    let distance = Number.POSITIVE_INFINITY
    for (const candidate of palette) {
      const deltaRed = red - candidate.red
      const deltaGreen = green - candidate.green
      const deltaBlue = blue - candidate.blue
      const candidateDistance =
        deltaRed * deltaRed * 2 +
        deltaGreen * deltaGreen * 4 +
        deltaBlue * deltaBlue
      if (candidateDistance < distance) {
        distance = candidateDistance
        mapped = candidate
      }
    }
    cache.set(key, mapped)
  }
  if (mapped.red !== red || mapped.green !== green || mapped.blue !== blue) {
    changedPixels += 1
  }
  source.data[offset] = mapped.red
  source.data[offset + 1] = mapped.green
  source.data[offset + 2] = mapped.blue
}

await mkdir(path.dirname(output), { recursive: true })
await sharp(source.data, {
  raw: {
    width: source.info.width,
    height: source.info.height,
    channels: 4,
  },
})
  .png({
    adaptiveFiltering: false,
    compressionLevel: 9,
    palette: false,
  })
  .toFile(output)

const report = {
  input: path.resolve(input),
  paletteSource: path.resolve(paletteSource),
  output: path.resolve(output),
  width: source.info.width,
  height: source.info.height,
  paletteColors: palette.length,
  sourceColorsMapped: cache.size,
  changedPixels,
  invariant:
    'Every opaque output color is an exact member of the accepted master palette.',
}
await mkdir(path.dirname(reportPath), { recursive: true })
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  `${output}: mapped ${cache.size} source colors to ${palette.length} master colors`,
)
