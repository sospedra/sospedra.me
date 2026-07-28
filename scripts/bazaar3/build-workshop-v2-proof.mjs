import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const REPORT_DIR = path.join(
  ROOT,
  'scripts/bazaar3/reports/integration/workshop-v2',
)
const OUTPUT = path.join(REPORT_DIR, 'workshop-runtime-proof-1440x597.png')
const ASSET_ROOT = path.join(ROOT, 'public/images/bazaar3/assets')
const INTEGRATION_ROOT = path.join(ASSET_ROOT, 'integration')

const VIEWPORT = { width: 1440, height: 597 }
const STAGE = { left: 96, top: 0, width: 1248, height: 597 }

const STALLS = [
  {
    id: 'manual',
    frame: path.join(ASSET_ROOT, 'stalls/manual-v3/frames/idle-1.png'),
    box: { left: 258, top: 137, width: 306, height: 407 },
    opacity: { light: 0.14, caster: 0.52, contact: 0.84 },
  },
  {
    id: 'console',
    frame: path.join(ASSET_ROOT, 'stalls/console-v2/frames/idle-1.png'),
    box: { left: 602, top: 237, width: 251, height: 326 },
    opacity: { light: 0.16, caster: 0.58, contact: 0.86 },
  },
  {
    id: 'talks',
    frame: path.join(ASSET_ROOT, 'stalls/talks/frames/idle-1.png'),
    box: { left: 890, top: 137, width: 380, height: 407 },
    opacity: { light: 0.14, caster: 0.56, contact: 0.86 },
  },
]

async function withOpacity(file, opacity) {
  if (opacity === 1) return sharp(file).png().toBuffer()
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let offset = 3; offset < data.length; offset += info.channels) {
    data[offset] = Math.round(data[offset] * opacity)
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toBuffer()
}

async function renderStall(stall) {
  const local = (phase) =>
    path.join(INTEGRATION_ROOT, `stalls/${stall.id}/desktop/${phase}.png`)

  const rear = await withOpacity(local('rear'), 1)
  const light = await withOpacity(local('light'), stall.opacity.light)
  const caster = await withOpacity(local('caster'), stall.opacity.caster)
  const contact = await withOpacity(local('contact'), stall.opacity.contact)
  const front = await withOpacity(local('front'), 1)
  const metadata = await sharp(stall.frame).metadata()

  const composed = await sharp({
    create: {
      width: metadata.width,
      height: metadata.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: rear, left: 0, top: 0 },
      { input: light, left: 0, top: 0 },
      { input: caster, left: 0, top: 0 },
      { input: contact, left: 0, top: 0 },
      { input: stall.frame, left: 0, top: 0 },
      { input: front, left: 0, top: 0 },
    ])
    .png()
    .toBuffer()

  return sharp(composed)
    .resize({
      width: stall.box.width,
      height: stall.box.height,
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer()
}

async function resized(file, width, height) {
  return sharp(file)
    .resize({ width, height, fit: 'fill', kernel: sharp.kernel.nearest })
    .png()
    .toBuffer()
}

await mkdir(REPORT_DIR, { recursive: true })

const environment = path.join(
  INTEGRATION_ROOT,
  'floors/workshop-desktop/environment-base.png',
)
const verticalBeam = path.join(ASSET_ROOT, 'architecture/h-beam-vertical.png')
const horizontalBeam = path.join(
  ASSET_ROOT,
  'architecture/h-beam-horizontal.png',
)
const joint = path.join(ASSET_ROOT, 'architecture/h-beam-joint.png')
const stair = path.join(ASSET_ROOT, 'architecture/desktop-core-2-workshop.png')

const composites = [
  {
    input: environment,
    left: STAGE.left,
    top: STAGE.top,
  },
]

for (const stall of STALLS) {
  composites.push({
    input: await renderStall(stall),
    left: stall.box.left,
    top: stall.box.top,
  })
}

for (const x of [564, 853]) {
  composites.push({
    input: await resized(verticalBeam, 38, 545),
    left: x,
    top: 52,
  })
  composites.push({
    input: await resized(joint, 38, 38),
    left: x,
    top: 52,
  })
  composites.push({
    input: await resized(joint, 38, 38),
    left: x,
    top: 559,
  })
}

/* Real viewport-edge stair: rear bridges first, exact core after the floor. */
composites.push({
  input: await resized(horizontalBeam, 228, 28),
  left: 0,
  top: 0,
})
composites.push({
  input: await sharp({
    create: {
      width: 228,
      height: 26,
      channels: 4,
      background: '#171e26',
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 228,
            height: 5,
            channels: 4,
            background: '#78502f',
          },
        })
          .png()
          .toBuffer(),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer(),
  left: 0,
  top: 137,
})
composites.push({
  input: await resized(stair, 184, 552),
  left: 0,
  top: 0,
})

await sharp({
  create: {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    channels: 4,
    background: '#020305',
  },
})
  .composite(composites)
  .png({ palette: true, colors: 40, dither: 0 })
  .toFile(OUTPUT)

console.log(path.relative(ROOT, OUTPUT))
