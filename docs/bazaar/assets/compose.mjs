import sharp from '/Users/sospedra/labs/sospedra.me/node_modules/sharp/dist/index.mjs'
import { readdirSync } from 'node:fs'

const RUN = '/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728'
const PUB = '/Users/sospedra/labs/sospedra.me/public/images/bazaar4'
const OUT = '/Users/sospedra/labs/sospedra.me/docs/bazaar/assets'
const BG = { r: 11, g: 13, b: 16, alpha: 1 }

const label = (text, w) =>
  Buffer.from(
    `<svg width="${w}" height="34"><text x="10" y="24" font-family="Menlo,monospace" font-size="19" fill="#cfd3d8">${text}</text></svg>`,
  )

async function strip(items, outFile, cellH) {
  const cells = []
  for (const it of items) {
    const img = sharp(it.file).resize({ height: cellH })
    const meta = await img.png().toBuffer({ resolveWithObject: true })
    cells.push({ buf: meta.data, w: meta.info.width, name: it.name })
  }
  const gap = 14
  const width = cells.reduce((t, c) => t + c.w, 0) + gap * (cells.length + 1)
  const height = cellH + 54
  const comps = []
  let x = gap
  for (const c of cells) {
    comps.push({ input: c.buf, left: x, top: 8 })
    comps.push({ input: label(c.name, c.w), left: x, top: cellH + 14 })
    x += c.w + gap
  }
  await sharp({ create: { width, height, channels: 4, background: BG } })
    .composite(comps)
    .png()
    .toFile(`${OUT}/${outFile}`)
  console.log(outFile, `${width}x${height}`)
}

async function mosaic(files, outFile, cols, cellW) {
  const rows = Math.ceil(files.length / cols)
  const cells = []
  let cellH = 0
  for (const f of files) {
    const meta = await sharp(f).resize({ width: cellW }).png().toBuffer({ resolveWithObject: true })
    cells.push(meta)
    cellH = Math.max(cellH, meta.info.height)
  }
  const gap = 6
  const width = cols * cellW + gap * (cols + 1)
  const height = rows * cellH + gap * (rows + 1)
  const comps = cells.map((c, i) => ({
    input: c.data,
    left: gap + (i % cols) * (cellW + gap),
    top: gap + Math.floor(i / cols) * (cellH + gap),
  }))
  await sharp({ create: { width, height, channels: 4, background: BG } })
    .composite(comps)
    .png()
    .toFile(`${OUT}/${outFile}`)
  console.log(outFile, `${width}x${height}`)
}

await strip(
  [
    { file: `${RUN}/r20-console/gen7-master.png`, name: 'gen7: slab lands, 62deg' },
    { file: `${RUN}/r20-console/gen8b.png`, name: 'gen8b: corrective, 55.5deg' },
    { file: `${RUN}/r20-console/gen10-p2.png`, name: 'gen10-p2: repaint lock' },
    { file: `${RUN}/r20-console/gen11-a.png`, name: 'gen11-a: portrait, shipped' },
  ],
  'composed-console-convergence.png',
  520,
)

const warFiles = readdirSync(`${RUN}/r20-console`)
  .filter((f) => /^gen5-\d\d\.png$/.test(f))
  .sort()
  .map((f) => `${RUN}/r20-console/${f}`)
await mosaic(warFiles, 'composed-stall-war-30.png', 6, 256)

const edFiles = readdirSync(`${RUN}/r21-ed`)
  .filter((f) => /^gen-ed-\d\d\.png$/.test(f))
  .sort()
  .map((f) => `${RUN}/r21-ed/${f}`)
await mosaic(edFiles, 'composed-ed-war-30.png', 6, 256)

const K = 0.75
const LINEUP = [
  ['uses', 576, 520, 'plate-key.png'],
  ['papers', 501, 440, 'plate-key.png'],
  ['manual', 352, 510, 'plate-key.png'],
  ['console', 459, 500, 'static-master.png'],
  ['talks', 342, 500, 'plate-key.png'],
  ['w98', 463, 500, 'plate-key.png'],
  ['games', 352, 480, 'plate-key.png'],
  ['travel', 358, 504, 'plate-key.png'],
]
{
  const gap = 18
  const cells = []
  for (const [id, w, h, file] of LINEUP) {
    const meta = await sharp(`${PUB}/${id}/${file}`)
      .resize(Math.round(w * K), Math.round(h * K), { fit: 'fill' })
      .png()
      .toBuffer({ resolveWithObject: true })
    cells.push({ ...meta, id })
  }
  const width = cells.reduce((t, c) => t + c.info.width, 0) + gap * (cells.length + 1)
  const maxH = Math.max(...cells.map((c) => c.info.height))
  const height = maxH + 56
  const comps = []
  let x = gap
  for (const c of cells) {
    comps.push({ input: c.data, left: x, top: 8 + maxH - c.info.height })
    comps.push({ input: label(c.id, c.info.width), left: x, top: maxH + 16 })
    x += c.info.width + gap
  }
  await sharp({ create: { width, height, channels: 4, background: BG } })
    .composite(comps)
    .png()
    .toFile(`${OUT}/composed-stall-lineup.png`)
  console.log('composed-stall-lineup.png', `${width}x${height}`)
}

const propFiles = readdirSync(`${PUB}/deco`)
  .filter((f) => f.endsWith('.png'))
  .sort()
  .map((f) => `${PUB}/deco/${f}`)
{
  const cols = 10
  const cell = 132
  const gap = 8
  const rows = Math.ceil(propFiles.length / cols)
  const comps = []
  for (let i = 0; i < propFiles.length; i++) {
    const buf = await sharp(propFiles[i])
      .resize(cell, cell, { fit: 'inside' })
      .png()
      .toBuffer({ resolveWithObject: true })
    comps.push({
      input: buf.data,
      left: gap + (i % cols) * (cell + gap) + Math.round((cell - buf.info.width) / 2),
      top: gap + Math.floor(i / cols) * (cell + gap) + Math.round((cell - buf.info.height) / 2),
    })
  }
  const width = cols * (cell + gap) + gap
  const height = rows * (cell + gap) + gap
  await sharp({ create: { width, height, channels: 4, background: BG } })
    .composite(comps)
    .png()
    .toFile(`${OUT}/composed-prop-inventory.png`)
  console.log('composed-prop-inventory.png', `${width}x${height}`, `${propFiles.length} props`)
}
