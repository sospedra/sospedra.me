import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// sharp is hoisted under apps/main, not this package
const require = createRequire(
  join(fileURLToPath(import.meta.url), '../../../main/package.json'),
)
const sharp = require('sharp')

const SIZE = 32

const PALETTE = {
  K: [13, 13, 13, 255],
  B: [46, 59, 168, 255],
  R: [216, 38, 28, 255],
  Y: [255, 216, 0, 255],
}

const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill('.'))

const fill = (code, x0, y0, x1, y1) => {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) grid[y][x] = code
  }
}

const clear = (x0, y0, x1, y1) => fill('.', x0, y0, x1, y1)

// blue S: one slab, two exit slits and four corner steps carve the letterform
fill('B', 5, 1, 27, 15)
clear(25, 1, 27, 2)
clear(13, 5, 27, 6)
clear(5, 10, 19, 11)
clear(5, 14, 6, 15)
clear(26, 14, 27, 15)

// red i
fill('R', 2, 18, 6, 20)
fill('R', 2, 23, 6, 30)

// red r: stem plus top arm, bottom-right stays open
fill('R', 9, 18, 13, 30)
fill('R', 13, 18, 17, 23)

// yellow pac C
const CX = 23.5
const CY = 24
const RADIUS = 6.9
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x + 0.5 - CX
    const dy = y + 0.5 - CY
    if (Math.sqrt(dx * dx + dy * dy) <= RADIUS) grid[y][x] = 'Y'
  }
}
clear(28, 22, 31, 22)
clear(26, 23, 31, 23)
clear(25, 24, 31, 25)
clear(27, 26, 31, 26)

// outline: any empty 4-neighbor of a colored cell turns black
const colored = (y, x) => 'BRY'.includes(grid[y]?.[x] ?? '.')
const outline = []
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const empty = grid[y][x] === '.'
    const nextToColor =
      colored(y - 1, x) ||
      colored(y + 1, x) ||
      colored(y, x - 1) ||
      colored(y, x + 1)
    if (empty && nextToColor) outline.push([y, x])
  }
}
for (const [y, x] of outline) grid[y][x] = 'K'

// eye and mouth chunk sit on top of the yellow
fill('K', 25, 19, 26, 20)
fill('K', 22, 25, 23, 26)

const raw = Buffer.alloc(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const code = grid[y][x]
    const rgba = code === '.' ? [0, 0, 0, 0] : PALETTE[code]
    raw.set(rgba, (y * SIZE + x) * 4)
  }
}

const base = sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 4 } })
const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '../public')
mkdirSync(out, { recursive: true })

const png = { compressionLevel: 9, palette: true }

await base.clone().png(png).toFile(join(out, 'logo-32.png'))
await base
  .clone()
  .resize(256, 256, { kernel: 'nearest' })
  .png(png)
  .toFile(join(out, 'logo-256.png'))
await sharp({
  create: { width: 180, height: 180, channels: 4, background: '#008080' },
})
  .composite([
    {
      input: await base
        .clone()
        .resize(160, 160, { kernel: 'nearest' })
        .png()
        .toBuffer(),
      left: 10,
      top: 10,
    },
  ])
  .png(png)
  .toFile(join(out, 'logo-180.png'))

process.stdout.write('rendered logo-32, logo-256, logo-180\n')
