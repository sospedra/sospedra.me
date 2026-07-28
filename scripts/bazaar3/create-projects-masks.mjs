#!/usr/bin/env node

import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const WIDTH = 320
const HEIGHT = 421
const OUTPUT_DIR = path.resolve(
  'public/images/bazaar3/assets/stalls/projects/masks',
)

const polygonContains = (x, y, points) => {
  let inside = false
  for (
    let left = 0, right = points.length - 1;
    left < points.length;
    right = left++
  ) {
    const [lx, ly] = points[left]
    const [rx, ry] = points[right]
    const intersects =
      ly > y !== ry > y && x < ((rx - lx) * (y - ly)) / (ry - ly) + lx
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

await mkdir(OUTPUT_DIR, { recursive: true })

await createMask('layer-mask', [
  {
    kind: 'polygon',
    color: [255, 255, 255],
    points: [
      [110, 146],
      [210, 146],
      [210, 170],
      [241, 188],
      [245, 263],
      [230, 298],
      [101, 298],
      [101, 262],
      [111, 244],
    ],
  },
  {
    kind: 'rect',
    color: [255, 255, 255],
    x: 230,
    y: 291,
    width: 4,
    height: 5,
  },
  {
    kind: 'polygon',
    color: [255, 0, 0],
    points: [
      [145, 270],
      [185, 270],
      [185, 296],
      [238, 296],
      [238, 315],
      [80, 315],
      [80, 296],
      [145, 296],
    ],
  },
  {
    kind: 'polygon',
    color: [255, 0, 0],
    points: [
      [199, 197],
      [228, 196],
      [241, 214],
      [236, 233],
      [213, 229],
    ],
  },
])

await createMask('motion-idle-2', [
  {
    kind: 'rect',
    color: [255, 255, 255],
    x: 143,
    y: 164,
    width: 55,
    height: 61,
  },
  {
    kind: 'polygon',
    color: [255, 255, 255],
    points: [
      [104, 214],
      [153, 211],
      [162, 251],
      [145, 279],
      [102, 278],
    ],
  },
])

await createMask('motion-hover-1', [
  {
    kind: 'rect',
    color: [255, 255, 255],
    x: 142,
    y: 158,
    width: 59,
    height: 70,
  },
  {
    kind: 'polygon',
    color: [255, 255, 255],
    points: [
      [102, 210],
      [156, 208],
      [166, 253],
      [145, 282],
      [99, 279],
    ],
  },
])

const gestureRegions = [
  {
    kind: 'rect',
    color: [255, 255, 255],
    x: 142,
    y: 158,
    width: 59,
    height: 70,
  },
  {
    kind: 'polygon',
    color: [255, 255, 255],
    points: [
      [101, 209],
      [157, 207],
      [166, 254],
      [145, 282],
      [98, 280],
    ],
  },
  {
    kind: 'polygon',
    color: [255, 255, 255],
    points: [
      [190, 209],
      [229, 205],
      [245, 235],
      [239, 291],
      [176, 304],
      [169, 274],
    ],
  },
  {
    kind: 'rect',
    color: [255, 255, 255],
    x: 196,
    y: 238,
    width: 49,
    height: 72,
  },
]

await createMask('motion-hover-2', gestureRegions)
await createMask('motion-hover-3', gestureRegions)

await createMask('effect-motion', [
  {
    kind: 'polygon',
    color: [255, 255, 255],
    points: [
      [121, 218],
      [168, 218],
      [188, 250],
      [184, 285],
      [143, 290],
      [112, 271],
    ],
  },
])

console.log(`Projects masks written to ${OUTPUT_DIR}`)
