#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const WIDTH = 320
const HEIGHT = 421
const SCALE = 3
const OUTPUT_WIDTH = WIDTH * SCALE
const OUTPUT_ART_HEIGHT = HEIGHT * SCALE
const OUTPUT_HEIGHT = OUTPUT_ART_HEIGHT + 1
const MASTER =
  'public/images/bazaar3/assets/stalls/projects/projects-static-v1.png'
const OUTPUT_DIR = 'public/images/bazaar3/assets/stalls/projects/effects'
const REPORT = 'scripts/bazaar3/reports/projects-effects-build.json'

const offset = (x, y) => (y * WIDTH + x) * 4
const inPlantBox = (x, y) => x >= 146 && x <= 188 && y >= 246 && y <= 288

const master = await sharp(MASTER)
  .ensureAlpha()
  .extract({ left: 0, top: 0, width: OUTPUT_WIDTH, height: OUTPUT_ART_HEIGHT })
  .resize(WIDTH, HEIGHT, {
    fit: 'fill',
    kernel: sharp.kernel.nearest,
  })
  .raw()
  .toBuffer({ resolveWithObject: true })

const primary = new Uint8Array(WIDTH * HEIGHT)
for (let y = 0; y < HEIGHT; y += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    if (!inPlantBox(x, y)) continue
    const source = offset(x, y)
    const red = master.data[source]
    const green = master.data[source + 1]
    const blue = master.data[source + 2]
    if (
      master.data[source + 3] === 255 &&
      green >= 24 &&
      green >= red * 0.72 &&
      green >= blue * 1.12
    ) {
      primary[y * WIDTH + x] = 1
    }
  }
}

/*
 * Keep only green-family pixels connected to the seedling's known stem/leaf
 * neighborhood. This rejects olive pixels on the robot and surrounding pots.
 */
const connected = new Uint8Array(WIDTH * HEIGHT)
const queue = []
for (let y = 262; y <= 280; y += 1) {
  for (let x = 160; x <= 174; x += 1) {
    const index = y * WIDTH + x
    if (!primary[index]) continue
    connected[index] = 1
    queue.push(index)
  }
}
for (let cursor = 0; cursor < queue.length; cursor += 1) {
  const index = queue[cursor]
  const x = index % WIDTH
  const y = Math.floor(index / WIDTH)
  for (const next of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
    [x - 1, y - 1],
    [x + 1, y - 1],
    [x - 1, y + 1],
    [x + 1, y + 1],
  ]) {
    const [nextX, nextY] = next
    if (!inPlantBox(nextX, nextY)) continue
    const nextIndex = nextY * WIDTH + nextX
    if (!primary[nextIndex] || connected[nextIndex]) continue
    connected[nextIndex] = 1
    queue.push(nextIndex)
  }
}

/*
 * Grow one logical pixel around the colored core to retain its exact dark
 * outline. The y<287 cap prevents the fixed pot rim from entering the effect.
 */
const plantMask = new Uint8Array(WIDTH * HEIGHT)
for (let y = 246; y < 283; y += 1) {
  for (let x = 146; x <= 188; x += 1) {
    let nearPlant = false
    for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
      for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
        const nextX = x + deltaX
        const nextY = y + deltaY
        if (
          nextX >= 0 &&
          nextY >= 0 &&
          nextX < WIDTH &&
          nextY < HEIGHT &&
          connected[nextY * WIDTH + nextX]
        ) {
          nearPlant = true
        }
      }
    }
    if (nearPlant) plantMask[y * WIDTH + x] = 1
  }
}

const neutral = Buffer.alloc(WIDTH * HEIGHT * 4)
for (let index = 0; index < plantMask.length; index += 1) {
  if (!plantMask[index]) continue
  master.data.copy(neutral, index * 4, index * 4, index * 4 + 4)
}

const setPixel = (data, x, y, rgba) => {
  const destination = offset(x, y)
  for (let channel = 0; channel < 4; channel += 1) {
    data[destination + channel] = rgba[channel]
  }
}

const addWater = (data, positions) => {
  const dark = [33, 40, 41, 255]
  const body = [59, 50, 54, 255]
  const light = [126, 113, 103, 255]
  for (const [index, [x, y]] of positions.entries()) {
    setPixel(data, x, y, index === positions.length - 1 ? light : body)
    if (index === 0) setPixel(data, x - 1, y, dark)
  }
}

const moveUpperLeaves = (source) => {
  const output = Buffer.from(source)
  for (let y = 246; y < 269; y += 1) {
    for (let x = 146; x <= 188; x += 1) {
      const sourceOffset = offset(x, y)
      if (source[sourceOffset + 3] === 0) continue
      source.fill(0, sourceOffset, sourceOffset + 4)
      output.fill(0, sourceOffset, sourceOffset + 4)
    }
  }
  for (let y = 246; y < 269; y += 1) {
    for (let x = 146; x <= 188; x += 1) {
      const sourceOffset = offset(x, y)
      if (neutral[sourceOffset + 3] === 0) continue
      const destinationX = x < 167 ? x - 2 : x > 169 ? x + 2 : x
      if (destinationX < 0 || destinationX >= WIDTH) continue
      neutral.copy(
        output,
        offset(destinationX, y),
        sourceOffset,
        sourceOffset + 4,
      )
    }
  }
  return output
}

const frames = {
  i1: Buffer.from(neutral),
  i2: Buffer.from(neutral),
  h1: Buffer.from(neutral),
  h2: null,
  h3: null,
}
addWater(frames.i1, [
  [116, 281],
  [117, 285],
  [116, 289],
])
addWater(frames.i2, [
  [117, 282],
  [116, 286],
  [118, 289],
])
frames.h2 = moveUpperLeaves(Buffer.from(neutral))
frames.h3 = Buffer.from(frames.h2)

const outline = [3, 4, 3, 255]
const leafDark = [61, 71, 37, 255]
const leafBody = [99, 98, 38, 255]
for (const [x, y, color] of [
  [166, 249, outline],
  [167, 248, outline],
  [168, 249, outline],
  [165, 250, leafDark],
  [166, 250, leafBody],
  [168, 250, leafBody],
  [169, 250, leafDark],
  [166, 251, leafDark],
  [168, 251, leafDark],
  [167, 252, leafDark],
  [167, 253, leafDark],
  [167, 254, leafDark],
  [167, 255, leafDark],
  [167, 256, leafDark],
]) {
  setPixel(frames.h3, x, y, color)
}

const alphaBbox = (data) => {
  let minX = WIDTH
  let minY = HEIGHT
  let maxX = -1
  let maxY = -1
  let pixels = 0
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (data[offset(x, y) + 3] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      pixels += 1
    }
  }
  return maxX < 0
    ? null
    : {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        pixels,
      }
}

await mkdir(OUTPUT_DIR, { recursive: true })
const report = {
  master: path.resolve(MASTER),
  outputDir: path.resolve(OUTPUT_DIR),
  outputCanvas: { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT },
  frames: {},
}
for (const [name, data] of Object.entries(frames)) {
  const file = path.join(OUTPUT_DIR, `projects-effect-${name}-v1.png`)
  await sharp(data, {
    raw: { width: WIDTH, height: HEIGHT, channels: 4 },
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
    .toFile(file)
  report.frames[name] = {
    file: path.resolve(file),
    logicalBbox: alphaBbox(data),
  }
}
await mkdir(path.dirname(REPORT), { recursive: true })
await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Projects effect cels written to ${OUTPUT_DIR}`)
