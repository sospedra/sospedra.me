#!/usr/bin/env node

import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const WIDTH = 320
const HEIGHT = 421
const OUTPUT_DIR = path.resolve(
  'public/images/bazaar3/assets/stalls/travel/masks',
)

const polygonContains = (x, y, points) => {
  let inside = false
  for (
    let left = 0, right = points.length - 1;
    left < points.length;
    right = left++
  ) {
    const [leftX, leftY] = points[left]
    const [rightX, rightY] = points[right]
    const intersects =
      leftY > y !== rightY > y &&
      x < ((rightX - leftX) * (y - leftY)) / (rightY - leftY) + leftX
    if (intersects) inside = !inside
  }
  return inside
}

const createMask = async (name, regions) => {
  const data = Buffer.alloc(WIDTH * HEIGHT * 4)
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      let color = null
      for (const region of regions) {
        const hit =
          region.kind === 'rect'
            ? x >= region.x &&
              x < region.x + region.width &&
              y >= region.y &&
              y < region.y + region.height
            : polygonContains(x + 0.5, y + 0.5, region.points)
        if (hit) color = region.color
      }
      if (!color) continue
      const offset = (y * WIDTH + x) * 4
      data[offset] = color[0]
      data[offset + 1] = color[1]
      data[offset + 2] = color[2]
      data[offset + 3] = 255
    }
  }

  await sharp(data, {
    raw: { width: WIDTH, height: HEIGHT, channels: 4 },
  })
    .png({
      adaptiveFiltering: false,
      compressionLevel: 9,
      palette: false,
    })
    .toFile(path.join(OUTPUT_DIR, `${name}.png`))
}

const white = [255, 255, 255]
const red = [255, 0, 0]

await mkdir(OUTPUT_DIR, { recursive: true })

// Legacy layered-sprite mask retained for reproducibility only. The current
// Hearthian Travel family uses create-v2-motion-masks.mjs. In this older mask,
// the white region is the only keeper area that may be replaced and the red
// counter lip restores the fixed foreground occluder.
await createMask('layer-mask', [
  {
    kind: 'polygon',
    color: white,
    points: [
      [92, 179],
      [220, 179],
      [220, 293],
      [92, 293],
    ],
  },
  {
    kind: 'polygon',
    color: red,
    points: [
      [87, 278],
      [225, 278],
      [225, 307],
      [87, 307],
    ],
  },
])

await createMask('motion-idle-2', [
  {
    kind: 'rect',
    color: white,
    x: 99,
    y: 189,
    width: 108,
    height: 48,
  },
  {
    kind: 'polygon',
    color: white,
    points: [
      [165, 231],
      [207, 231],
      [211, 286],
      [169, 286],
    ],
  },
])

await createMask('motion-hover-1', [
  {
    kind: 'rect',
    color: white,
    x: 99,
    y: 188,
    width: 108,
    height: 51,
  },
])

const gestureRegions = [
  {
    kind: 'rect',
    color: white,
    x: 98,
    y: 188,
    width: 111,
    height: 52,
  },
  {
    kind: 'polygon',
    color: white,
    points: [
      [94, 225],
      [149, 225],
      [151, 249],
      [138, 287],
      [94, 287],
    ],
  },
  {
    kind: 'polygon',
    color: white,
    points: [
      [166, 188],
      [217, 188],
      [217, 287],
      [176, 287],
      [168, 263],
      [166, 263],
    ],
  },
]

await createMask('motion-hover-2', gestureRegions)
await createMask('motion-hover-3', gestureRegions)

console.log(`Travel masks written to ${OUTPUT_DIR}`)
