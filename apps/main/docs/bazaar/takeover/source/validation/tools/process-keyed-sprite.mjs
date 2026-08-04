#!/usr/bin/env node

import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const parseArgs = (argv) => {
  const values = new Map()
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? '<end>'}`)
    }
    values.set(key.slice(2), value)
  }
  return values
}

const integer = (args, key, fallback) => {
  const raw = args.get(key)
  if (raw === undefined) return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${key} must be a positive integer`)
  }
  return value
}

const positiveNumber = (args, key, fallback) => {
  const raw = args.get(key)
  if (raw === undefined) return fallback
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${key} must be a positive number`)
  }
  return value
}

const choice = (args, key, fallback, allowed) => {
  const value = args.get(key) ?? fallback
  if (!allowed.includes(value)) {
    throw new Error(`--${key} must be one of: ${allowed.join(', ')}`)
  }
  return value
}

const quantize = (data, maxColors) => {
  const histogram = new Map()
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue
    const key =
      (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]
    const current = histogram.get(key)
    if (current) {
      current.count += 1
    } else {
      histogram.set(key, {
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
        count: 1,
      })
    }
  }

  if (histogram.size <= maxColors) return
  const boxes = [[...histogram.values()]]
  const bounds = (box) => {
    const result = {
      rMin: 255,
      rMax: 0,
      gMin: 255,
      gMax: 0,
      bMin: 255,
      bMax: 0,
      count: 0,
    }
    for (const color of box) {
      result.rMin = Math.min(result.rMin, color.r)
      result.rMax = Math.max(result.rMax, color.r)
      result.gMin = Math.min(result.gMin, color.g)
      result.gMax = Math.max(result.gMax, color.g)
      result.bMin = Math.min(result.bMin, color.b)
      result.bMax = Math.max(result.bMax, color.b)
      result.count += color.count
    }
    return result
  }

  while (boxes.length < maxColors) {
    let splitIndex = -1
    let splitScore = -1
    let splitBounds = null
    for (let index = 0; index < boxes.length; index += 1) {
      if (boxes[index].length < 2) continue
      const boxBounds = bounds(boxes[index])
      const range = Math.max(
        boxBounds.rMax - boxBounds.rMin,
        boxBounds.gMax - boxBounds.gMin,
        boxBounds.bMax - boxBounds.bMin,
      )
      const score = range * Math.sqrt(boxBounds.count)
      if (score > splitScore) {
        splitIndex = index
        splitScore = score
        splitBounds = boxBounds
      }
    }
    if (splitIndex < 0 || !splitBounds) break

    const channel =
      splitBounds.gMax - splitBounds.gMin >=
        splitBounds.rMax - splitBounds.rMin &&
      splitBounds.gMax - splitBounds.gMin >= splitBounds.bMax - splitBounds.bMin
        ? 'g'
        : splitBounds.rMax - splitBounds.rMin >=
            splitBounds.bMax - splitBounds.bMin
          ? 'r'
          : 'b'
    const box = boxes[splitIndex].sort(
      (left, right) => left[channel] - right[channel],
    )
    const half = splitBounds.count / 2
    let accumulated = 0
    let cut = 1
    for (; cut < box.length; cut += 1) {
      accumulated += box[cut - 1].count
      if (accumulated >= half) break
    }
    boxes.splice(splitIndex, 1, box.slice(0, cut), box.slice(cut))
  }

  const palette = boxes.map((box) => {
    let count = 0
    let red = 0
    let green = 0
    let blue = 0
    for (const color of box) {
      count += color.count
      red += color.r * color.count
      green += color.g * color.count
      blue += color.b * color.count
    }
    return {
      r: Math.round(red / count),
      g: Math.round(green / count),
      b: Math.round(blue / count),
    }
  })

  const mapped = new Map()
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue
    const key =
      (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]
    let color = mapped.get(key)
    if (!color) {
      let bestDistance = Number.POSITIVE_INFINITY
      for (const candidate of palette) {
        const red = data[offset] - candidate.r
        const green = data[offset + 1] - candidate.g
        const blue = data[offset + 2] - candidate.b
        const distance = red * red * 2 + green * green * 4 + blue * blue
        if (distance < bestDistance) {
          bestDistance = distance
          color = candidate
        }
      }
      mapped.set(key, color)
    }
    data[offset] = color.r
    data[offset + 1] = color.g
    data[offset + 2] = color.b
  }
}

const args = parseArgs(process.argv.slice(2))
const input = args.get('input')
const output = args.get('output')
const alphaMask = args.get('alpha-mask')

if (!input || !output) {
  throw new Error(
    'Usage: process-keyed-sprite.mjs --input source.png --output final.png ' +
      '[--logical-width 320 --logical-height 421 --scale 3 --colors 40]',
  )
}

const logicalWidth = integer(args, 'logical-width', 320)
const logicalHeight = integer(args, 'logical-height', 421)
const scale = integer(args, 'scale', 3)
const colors = integer(args, 'colors', 40)
const finalHeight = integer(args, 'final-height', logicalHeight * scale)
const globalKey = args.get('global-key') === 'true'
const trimTransparent = args.get('trim') === 'true'
const brightness = positiveNumber(args, 'brightness', 1)
const resizeFit = choice(args, 'fit', 'fill', ['fill', 'contain'])
const resizePosition = choice(args, 'position', 'centre', [
  'centre',
  'north',
  'south',
])

const source = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

/*
 * ImageGen is asked for a flat #ff00ff field, but edge pixels can be darker
 * magenta. Flood from the canvas border through magenta-family pixels instead
 * of deleting that family globally; enclosed violet lamps and dusty-rose
 * creature accents therefore survive.
 */
const pixelCount = source.info.width * source.info.height
const keyed = new Uint8Array(pixelCount)
const queue = new Uint32Array(pixelCount)
let queueStart = 0
let queueEnd = 0

const isBackingPixel = (pixel) => {
  const offset = pixel * 4
  const red = source.data[offset]
  const green = source.data[offset + 1]
  const blue = source.data[offset + 2]
  return (
    red >= 116 &&
    blue >= 104 &&
    green <= 112 &&
    Math.min(red, blue) - green >= 36 &&
    Math.abs(red - blue) <= 128
  )
}

/*
 * Open roofs and railings can divide the backing into enclosed islands that
 * border flood-fill cannot reach. ImageGen's true backing is much hotter than
 * the approved dusty violet art, so this deliberately narrow second predicate
 * removes only near-#ff00ff islands when explicitly requested.
 */
const isHotBackingPixel = (pixel) => {
  const offset = pixel * 4
  const red = source.data[offset]
  const green = source.data[offset + 1]
  const blue = source.data[offset + 2]
  return (
    red >= 196 &&
    blue >= 196 &&
    green <= 72 &&
    Math.min(red, blue) - green >= 132 &&
    Math.abs(red - blue) <= 72
  )
}

const enqueue = (pixel) => {
  if (keyed[pixel] || !isBackingPixel(pixel)) return
  keyed[pixel] = 1
  queue[queueEnd] = pixel
  queueEnd += 1
}

for (let x = 0; x < source.info.width; x += 1) {
  enqueue(x)
  enqueue((source.info.height - 1) * source.info.width + x)
}
for (let y = 0; y < source.info.height; y += 1) {
  enqueue(y * source.info.width)
  enqueue(y * source.info.width + source.info.width - 1)
}

while (queueStart < queueEnd) {
  const pixel = queue[queueStart]
  queueStart += 1
  const x = pixel % source.info.width
  const y = Math.floor(pixel / source.info.width)
  if (x > 0) enqueue(pixel - 1)
  if (x + 1 < source.info.width) enqueue(pixel + 1)
  if (y > 0) enqueue(pixel - source.info.width)
  if (y + 1 < source.info.height) enqueue(pixel + source.info.width)
}

if (globalKey) {
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (isHotBackingPixel(pixel)) keyed[pixel] = 1
  }
}

for (let pixel = 0; pixel < pixelCount; pixel += 1) {
  const offset = pixel * 4
  if (keyed[pixel]) {
    source.data[offset] = 0
    source.data[offset + 1] = 0
    source.data[offset + 2] = 0
    source.data[offset + 3] = 0
  } else {
    source.data[offset + 3] = source.data[offset + 3] >= 128 ? 255 : 0
  }
}

let logicalPipeline = sharp(source.data, {
  raw: {
    width: source.info.width,
    height: source.info.height,
    channels: 4,
  },
})

if (trimTransparent) {
  logicalPipeline = logicalPipeline.trim({
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
}

const logicalRaw = await logicalPipeline
  .resize(logicalWidth, logicalHeight, {
    fit: resizeFit,
    position: resizePosition,
    kernel: sharp.kernel.nearest,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

if (alphaMask) {
  const mask = await sharp(alphaMask)
    .resize(logicalWidth, logicalHeight, {
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let offset = 0; offset < logicalRaw.data.length; offset += 4) {
    const maskAlpha = mask.data[offset + 3]
    if (maskAlpha < 128) {
      logicalRaw.data[offset] = 0
      logicalRaw.data[offset + 1] = 0
      logicalRaw.data[offset + 2] = 0
      logicalRaw.data[offset + 3] = 0
      continue
    }

    if (logicalRaw.data[offset + 3] < 128) {
      logicalRaw.data[offset] = 0
      logicalRaw.data[offset + 1] = 0
      logicalRaw.data[offset + 2] = 0
      logicalRaw.data[offset + 3] = 0
      continue
    }

    logicalRaw.data[offset + 3] = 255
    const red = logicalRaw.data[offset]
    const green = logicalRaw.data[offset + 1]
    const blue = logicalRaw.data[offset + 2]
    const illegalHotMagenta =
      red >= 170 &&
      blue >= 150 &&
      green <= 88 &&
      Math.min(red, blue) - green >= 82
    if (illegalHotMagenta) {
      logicalRaw.data[offset] = 116
      logicalRaw.data[offset + 1] = 48
      logicalRaw.data[offset + 2] = 139
    }
  }
}

if (brightness !== 1) {
  for (let offset = 0; offset < logicalRaw.data.length; offset += 4) {
    if (logicalRaw.data[offset + 3] === 0) continue
    logicalRaw.data[offset] = Math.min(
      255,
      Math.round(logicalRaw.data[offset] * brightness),
    )
    logicalRaw.data[offset + 1] = Math.min(
      255,
      Math.round(logicalRaw.data[offset + 1] * brightness),
    )
    logicalRaw.data[offset + 2] = Math.min(
      255,
      Math.round(logicalRaw.data[offset + 2] * brightness),
    )
  }
}

for (let pass = 0; pass < 2; pass += 1) {
  const remove = new Uint8Array(logicalWidth * logicalHeight)
  for (let y = 0; y < logicalHeight; y += 1) {
    for (let x = 0; x < logicalWidth; x += 1) {
      const pixel = y * logicalWidth + x
      const offset = pixel * 4
      if (logicalRaw.data[offset + 3] === 0) continue
      const red = logicalRaw.data[offset]
      const green = logicalRaw.data[offset + 1]
      const blue = logicalRaw.data[offset + 2]
      const magentaFringe =
        red >= 64 &&
        blue >= 64 &&
        Math.min(red, blue) - green >= 26 &&
        Math.abs(red - blue) <= 128
      if (!magentaFringe) continue

      let touchesTransparency = false
      for (let dy = -1; dy <= 1 && !touchesTransparency; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nextX = x + dx
          const nextY = y + dy
          if (
            nextX < 0 ||
            nextY < 0 ||
            nextX >= logicalWidth ||
            nextY >= logicalHeight
          ) {
            touchesTransparency = true
            break
          }
          const nextOffset = (nextY * logicalWidth + nextX) * 4
          if (logicalRaw.data[nextOffset + 3] === 0) {
            touchesTransparency = true
            break
          }
        }
      }
      if (touchesTransparency) remove[pixel] = 1
    }
  }

  for (let pixel = 0; pixel < remove.length; pixel += 1) {
    if (!remove[pixel]) continue
    const offset = pixel * 4
    logicalRaw.data[offset] = 0
    logicalRaw.data[offset + 1] = 0
    logicalRaw.data[offset + 2] = 0
    logicalRaw.data[offset + 3] = 0
  }
}

quantize(logicalRaw.data, colors)

const logical = await sharp(logicalRaw.data, {
  raw: {
    width: logicalRaw.info.width,
    height: logicalRaw.info.height,
    channels: 4,
  },
})
  .png({
    compressionLevel: 9,
  })
  .toBuffer()

const artHeight = logicalHeight * scale
if (finalHeight < artHeight) {
  throw new Error(
    `--final-height ${finalHeight} cannot be smaller than art height ${artHeight}`,
  )
}

let processed = sharp(logical).resize(logicalWidth * scale, artHeight, {
  fit: 'fill',
  kernel: sharp.kernel.nearest,
})

if (finalHeight > artHeight) {
  processed = processed.extend({
    bottom: finalHeight - artHeight,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
}

await mkdir(path.dirname(output), { recursive: true })
await processed
  .png({
    compressionLevel: 9,
  })
  .toFile(output)

const metadata = await sharp(output).metadata()
console.log(
  `${output}: ${metadata.width}x${metadata.height}, ` +
    `${logicalWidth}x${logicalHeight} logical, ${scale}x nearest, <=${colors} colors`,
)
