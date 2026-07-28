#!/usr/bin/env node

import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const OUTPUT_DIR = 'public/images/bazaar3/assets/architecture'
const SCALE = 3

const COLOR = {
  clear: [0, 0, 0, 0],
  outline: [5, 8, 12, 255],
  deep: [15, 20, 28, 255],
  body: [37, 47, 59, 255],
  light: [58, 69, 81, 255],
  rust: [150, 66, 30, 255],
  rustDark: [83, 40, 25, 255],
  bolt: [203, 157, 94, 255],
}

const canvas = (width, height) => ({
  width,
  height,
  data: Buffer.alloc(width * height * 4),
})

const pixel = (image, x, y, color) => {
  if (x < 0 || x >= image.width || y < 0 || y >= image.height) return
  const offset = (y * image.width + x) * 4
  image.data[offset] = color[0]
  image.data[offset + 1] = color[1]
  image.data[offset + 2] = color[2]
  image.data[offset + 3] = color[3]
}

const rect = (image, x, y, width, height, color) => {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      pixel(image, column, row, color)
    }
  }
}

const bolt = (image, x, y) => {
  pixel(image, x, y - 1, COLOR.outline)
  pixel(image, x - 1, y, COLOR.outline)
  pixel(image, x, y, COLOR.bolt)
  pixel(image, x + 1, y, COLOR.outline)
  pixel(image, x, y + 1, COLOR.outline)
}

const horizontal = canvas(96, 18)
rect(horizontal, 0, 1, 96, 16, COLOR.outline)
rect(horizontal, 0, 3, 96, 4, COLOR.body)
rect(horizontal, 0, 3, 96, 1, COLOR.light)
rect(horizontal, 4, 7, 88, 5, COLOR.deep)
rect(horizontal, 0, 12, 96, 4, COLOR.body)
rect(horizontal, 0, 12, 96, 1, COLOR.light)
rect(horizontal, 0, 16, 96, 1, COLOR.outline)
for (const x of [8, 31, 57, 84]) bolt(horizontal, x, 9)
rect(horizontal, 18, 4, 5, 2, COLOR.rustDark)
rect(horizontal, 20, 4, 2, 1, COLOR.rust)
rect(horizontal, 68, 13, 8, 2, COLOR.rustDark)
pixel(horizontal, 72, 13, COLOR.rust)

const vertical = canvas(18, 96)
rect(vertical, 1, 0, 16, 96, COLOR.outline)
rect(vertical, 3, 0, 4, 96, COLOR.body)
rect(vertical, 3, 0, 1, 96, COLOR.light)
rect(vertical, 7, 4, 5, 88, COLOR.deep)
rect(vertical, 12, 0, 4, 96, COLOR.body)
rect(vertical, 12, 0, 1, 96, COLOR.light)
rect(vertical, 16, 0, 1, 96, COLOR.outline)
for (const y of [9, 31, 56, 82]) bolt(vertical, 9, y)
rect(vertical, 4, 18, 2, 6, COLOR.rustDark)
pixel(vertical, 4, 20, COLOR.rust)
rect(vertical, 13, 67, 2, 8, COLOR.rustDark)
pixel(vertical, 13, 70, COLOR.rust)

const joint = canvas(24, 24)
rect(joint, 1, 1, 22, 22, COLOR.outline)
rect(joint, 3, 3, 18, 18, COLOR.body)
rect(joint, 4, 4, 16, 2, COLOR.light)
rect(joint, 7, 7, 10, 10, COLOR.deep)
for (const [x, y] of [
  [5, 5],
  [18, 5],
  [5, 18],
  [18, 18],
]) {
  bolt(joint, x, y)
}
rect(joint, 15, 16, 4, 2, COLOR.rustDark)
pixel(joint, 17, 16, COLOR.rust)

const save = async (image, name) => {
  await sharp(image.data, {
    raw: {
      width: image.width,
      height: image.height,
      channels: 4,
    },
  })
    .resize(image.width * SCALE, image.height * SCALE, {
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png({
      adaptiveFiltering: false,
      compressionLevel: 9,
      palette: true,
      colours: 8,
      dither: 0,
    })
    .toFile(path.join(OUTPUT_DIR, name))
}

await mkdir(OUTPUT_DIR, { recursive: true })
await Promise.all([
  save(horizontal, 'h-beam-horizontal.png'),
  save(vertical, 'h-beam-vertical.png'),
  save(joint, 'h-beam-joint.png'),
])

console.log('Built Bazaar3 H-beam architecture tiles.')
