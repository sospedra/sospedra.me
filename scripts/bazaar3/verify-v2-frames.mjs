#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '../..')
const STALL_ROOT = path.join(
  REPOSITORY_ROOT,
  'public/images/bazaar3/assets/stalls',
)
const REPORT_ROOT = path.join(REPOSITORY_ROOT, 'scripts/bazaar3/reports/v2')
const WIDTH = 320
const HEIGHT = 421
const SCALE = 3
const OUTPUT_WIDTH = WIDTH * SCALE
const OUTPUT_ART_HEIGHT = HEIGHT * SCALE
const OUTPUT_HEIGHT = OUTPUT_ART_HEIGHT + 1
const STATES = ['idle-1', 'idle-2', 'hover-1', 'hover-2', 'hover-3']

const FAMILIES = [
  {
    id: 'console',
    label: 'Console',
    paletteLimit: 18,
    torso: { x: 151, y: 284, width: 29, height: 44 },
    root: { x: 91, y: 329, width: 146, height: 62 },
  },
  {
    id: 'projects',
    label: 'Projects',
    paletteLimit: 24,
    torso: { x: 158, y: 205, width: 12, height: 75 },
    root: { x: 126, y: 313, width: 45, height: 31 },
  },
  {
    id: 'travel',
    label: 'Travel',
    paletteLimit: 20,
    torso: { x: 145, y: 230, width: 28, height: 61 },
    root: { x: 145, y: 292, width: 32, height: 18 },
  },
]

const canonicalTransparent = (data) => {
  const output = Buffer.from(data)
  for (let offset = 0; offset < output.length; offset += 4) {
    if (output[offset + 3] !== 0) continue
    output[offset] = 0
    output[offset + 1] = 0
    output[offset + 2] = 0
  }
  return output
}

const readFrame = async (filename) => {
  const metadata = await sharp(filename).metadata()
  if (metadata.width !== OUTPUT_WIDTH || metadata.height !== OUTPUT_HEIGHT) {
    throw new Error(
      `${filename}: expected ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}, got ` +
        `${metadata.width}x${metadata.height}`,
    )
  }
  const raw = await sharp(filename)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let blockViolations = 0
  for (let logicalY = 0; logicalY < HEIGHT; logicalY += 1) {
    for (let logicalX = 0; logicalX < WIDTH; logicalX += 1) {
      const firstOffset =
        (logicalY * SCALE * OUTPUT_WIDTH + logicalX * SCALE) * 4
      let blockMatches = true
      blockScan: for (let deltaY = 0; deltaY < SCALE; deltaY += 1) {
        for (let deltaX = 0; deltaX < SCALE; deltaX += 1) {
          const offset =
            ((logicalY * SCALE + deltaY) * OUTPUT_WIDTH +
              logicalX * SCALE +
              deltaX) *
            4
          for (let channel = 0; channel < 4; channel += 1) {
            if (
              raw.data[offset + channel] !== raw.data[firstOffset + channel]
            ) {
              blockMatches = false
              break blockScan
            }
          }
        }
      }
      if (!blockMatches) blockViolations += 1
    }
  }

  let nonTransparentBottomPixels = 0
  const bottomStart = OUTPUT_ART_HEIGHT * OUTPUT_WIDTH * 4
  for (let offset = bottomStart; offset < raw.data.length; offset += 4) {
    if (raw.data[offset + 3] !== 0) nonTransparentBottomPixels += 1
  }

  const logical = canonicalTransparent(
    (
      await sharp(filename)
        .extract({
          left: 0,
          top: 0,
          width: OUTPUT_WIDTH,
          height: OUTPUT_ART_HEIGHT,
        })
        .resize(WIDTH, HEIGHT, {
          fit: 'fill',
          kernel: sharp.kernel.nearest,
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
    ).data,
  )
  return { logical, blockViolations, nonTransparentBottomPixels }
}

const readMask = async (filename) => {
  const metadata = await sharp(filename).metadata()
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT) {
    throw new Error(`${filename}: motion masks must be ${WIDTH}x${HEIGHT}`)
  }
  return (
    await sharp(filename)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
  ).data
}

const palette = (data) => {
  const result = new Set()
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue
    result.add(
      `${data[offset]},${data[offset + 1]},${data[offset + 2]},${data[offset + 3]}`,
    )
  }
  return result
}

const regionMatches = (left, right, region) => {
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      const offset = (y * WIDTH + x) * 4
      for (let channel = 0; channel < 4; channel += 1) {
        if (left[offset + channel] !== right[offset + channel]) return false
      }
    }
  }
  return true
}

const sha = (data) => createHash('sha256').update(data).digest('hex')

const structureBytes = (data, unionMask) => {
  const output = Buffer.alloc(data.length)
  for (let pixel = 0; pixel < WIDTH * HEIGHT; pixel += 1) {
    const offset = pixel * 4
    if (unionMask[offset + 3] !== 0) continue
    data.copy(output, offset, offset, offset + 4)
  }
  return output
}

const reports = []
const contactTiles = []
const motionTiles = []

for (let familyIndex = 0; familyIndex < FAMILIES.length; familyIndex += 1) {
  const family = FAMILIES[familyIndex]
  const familyRoot = path.join(STALL_ROOT, `${family.id}-v2`)
  const frameRoot = path.join(familyRoot, 'frames')
  const maskRoot = path.join(familyRoot, 'masks')
  const frames = new Map()
  const masks = new Map()

  for (const state of STATES) {
    frames.set(state, await readFrame(path.join(frameRoot, `${state}.png`)))
    if (state !== 'idle-1') {
      masks.set(state, await readMask(path.join(maskRoot, `${state}.png`)))
    }
  }

  const base = frames.get('idle-1').logical
  const masterPalette = palette(base)
  const unionMask = Buffer.alloc(WIDTH * HEIGHT * 4)
  for (const mask of masks.values()) {
    for (let offset = 0; offset < mask.length; offset += 4) {
      if (mask[offset + 3] === 0) continue
      unionMask[offset] = 255
      unionMask[offset + 1] = 255
      unionMask[offset + 2] = 255
      unionMask[offset + 3] = 255
    }
  }
  const baseStructureHash = sha(structureBytes(base, unionMask))
  const frameReports = []

  for (const [stateIndex, state] of STATES.entries()) {
    const frame = frames.get(state)
    const framePalette = palette(frame.logical)
    const paletteSubset = [...framePalette].every((color) =>
      masterPalette.has(color),
    )
    let outsideChanges = 0
    let insideChanges = 0
    const motionPixels = Buffer.alloc(WIDTH * HEIGHT * 4)
    const mask =
      state === 'idle-1' ? Buffer.alloc(base.length) : masks.get(state)

    for (let pixel = 0; pixel < WIDTH * HEIGHT; pixel += 1) {
      const offset = pixel * 4
      let differs = false
      for (let channel = 0; channel < 4; channel += 1) {
        if (frame.logical[offset + channel] !== base[offset + channel]) {
          differs = true
          break
        }
      }
      const allowed = mask[offset + 3] === 255
      if (differs && allowed) {
        insideChanges += 1
        motionPixels[offset] = 255
        motionPixels[offset + 1] = 164
        motionPixels[offset + 2] = 64
        motionPixels[offset + 3] = 255
      } else if (differs) {
        outsideChanges += 1
        motionPixels[offset] = 255
        motionPixels[offset + 1] = 0
        motionPixels[offset + 2] = 60
        motionPixels[offset + 3] = 255
      } else if (allowed) {
        motionPixels[offset] = 38
        motionPixels[offset + 1] = 48
        motionPixels[offset + 2] = 56
        motionPixels[offset + 3] = 200
      }
    }

    const torsoLocked = regionMatches(base, frame.logical, family.torso)
    const rootLocked = regionMatches(base, frame.logical, family.root)
    const structureHash = sha(structureBytes(frame.logical, unionMask))
    const structureLocked = structureHash === baseStructureHash
    const pass =
      frame.blockViolations === 0 &&
      frame.nonTransparentBottomPixels === 0 &&
      framePalette.size <= family.paletteLimit &&
      paletteSubset &&
      outsideChanges === 0 &&
      torsoLocked &&
      rootLocked &&
      structureLocked &&
      (state === 'idle-1' || insideChanges > 0)

    frameReports.push({
      state,
      pass,
      dimensions: `${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}`,
      logicalGrid: `${WIDTH}x${HEIGHT}`,
      nearestNeighborScale: SCALE,
      blockViolations: frame.blockViolations,
      nonTransparentBottomPixels: frame.nonTransparentBottomPixels,
      colors: framePalette.size,
      paletteLimit: family.paletteLimit,
      paletteSubset,
      changedPixelsInsideMotionMask: insideChanges,
      changedPixelsOutsideMotionMask: outsideChanges,
      torsoLocked,
      rootLocked,
      surroundingStructureLocked: structureLocked,
      surroundingStructureHash: structureHash,
    })

    contactTiles.push({
      input: path.join(frameRoot, `${state}.png`),
      top: familyIndex * 316,
      left: stateIndex * 240,
    })
    const motionBuffer = await sharp(motionPixels, {
      raw: { width: WIDTH, height: HEIGHT, channels: 4 },
    })
      .resize(240, 316, {
        fit: 'fill',
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer()
    motionTiles.push({
      input: motionBuffer,
      top: familyIndex * 316,
      left: stateIndex * 240,
    })
  }

  reports.push({
    family: family.id,
    label: family.label,
    pass: frameReports.every((frame) => frame.pass),
    masterPaletteColors: masterPalette.size,
    torsoLockRect: family.torso,
    rootLockRect: family.root,
    invariant:
      'Canvas, 3x block scale, palette, torso/root registration, and all pixels outside declared motion masks are locked to idle-1.',
    frames: frameReports,
  })
}

await mkdir(REPORT_ROOT, { recursive: true })
const contactWidth = STATES.length * 240
const contactHeight = FAMILIES.length * 316
await sharp({
  create: {
    width: contactWidth,
    height: contactHeight,
    channels: 4,
    background: { r: 7, g: 10, b: 12, alpha: 1 },
  },
})
  .composite(
    await Promise.all(
      contactTiles.map(async (tile) => ({
        input: await sharp(tile.input)
          .resize(240, 316, {
            fit: 'contain',
            position: 'south',
            kernel: sharp.kernel.nearest,
            background: { r: 7, g: 10, b: 12, alpha: 1 },
          })
          .png()
          .toBuffer(),
        top: tile.top,
        left: tile.left,
      })),
    ),
  )
  .png()
  .toFile(path.join(REPORT_ROOT, 'contact-sheet.png'))

await sharp({
  create: {
    width: contactWidth,
    height: contactHeight,
    channels: 4,
    background: { r: 7, g: 10, b: 12, alpha: 1 },
  },
})
  .composite(motionTiles)
  .png()
  .toFile(path.join(REPORT_ROOT, 'motion-audit.png'))

const summary = {
  pass: reports.every((family) => family.pass),
  generatedAt: new Date().toISOString(),
  families: reports,
}
await writeFile(
  path.join(REPORT_ROOT, 'verification.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
)

const markdown = [
  '# Bazaar3 v2 sprite verification',
  '',
  `Overall: **${summary.pass ? 'PASS' : 'FAIL'}**`,
  '',
  '| family | frame | result | colors | inside motion | outside motion | torso | root | structure |',
  '| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |',
  ...reports.flatMap((family) =>
    family.frames.map(
      (frame) =>
        `| ${family.label} | ${frame.state} | ${frame.pass ? 'PASS' : 'FAIL'} | ` +
        `${frame.colors}/${frame.paletteLimit} | ` +
        `${frame.changedPixelsInsideMotionMask} | ` +
        `${frame.changedPixelsOutsideMotionMask} | ` +
        `${frame.torsoLocked ? 'locked' : 'FAIL'} | ` +
        `${frame.rootLocked ? 'locked' : 'FAIL'} | ` +
        `${frame.surroundingStructureLocked ? 'locked' : 'FAIL'} |`,
    ),
  ),
  '',
  'The surrounding-structure hash excludes the union of every declared motion mask.',
  'Orange in `motion-audit.png` is admitted motion; red would be an illegal change.',
  '',
]
await writeFile(
  path.join(REPORT_ROOT, 'verification.md'),
  `${markdown.join('\n')}\n`,
)

console.log(
  `Bazaar3 v2 animation verification: ${summary.pass ? 'PASS' : 'FAIL'}`,
)
if (!summary.pass) process.exitCode = 1
