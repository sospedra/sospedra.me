#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { sha256File } from './verify-assets.mjs'

const ROOT = process.cwd()
const TRAVEL = path.join(ROOT, 'public/images/bazaar3/assets/stalls/travel')
const MASKS = path.join(TRAVEL, 'masks')
const REPORT = path.join(
  ROOT,
  'scripts/bazaar3/reports/travel-family-proof.json',
)
const FRAMES = ['i1', 'i2', 'h1', 'h2', 'h3']
const LAYERS = ['rear', 'front', 'keeper', 'effect', 'composite']
const SOURCE_MASKS = [
  'motion-idle-2.png',
  'motion-hover-1.png',
  'motion-hover-2.png',
  'motion-hover-3.png',
]
const LOGICAL_WIDTH = 320
const LOGICAL_HEIGHT = 421
const OUTPUT_WIDTH = 960
const OUTPUT_ART_HEIGHT = 1263
const OUTPUT_HEIGHT = 1264
const SCALE = 3
const CHANNELS = 4
const REQUESTED_TORSO = { x: 450, y: 720, width: 45, height: 93 }
const SELECTED_TORSO = { x: 453, y: 720, width: 42, height: 93 }
const ROOT_REGISTRATION = { x: 474, y: 810, lockRadius: 2 }

const rgbaHash = (data) => createHash('sha256').update(data).digest('hex')
const offset = (x, y, width) => (y * width + x) * CHANNELS

const readRgba = async (file) => {
  const { data, info } = await sharp(file, {
    failOn: 'error',
    limitInputPixels: false,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { file, data, width: info.width, height: info.height }
}

const assertOutput = (image, label) => {
  if (image.width !== OUTPUT_WIDTH || image.height !== OUTPUT_HEIGHT) {
    throw new Error(`${label}: expected 960x1264`)
  }
  for (let x = 0; x < OUTPUT_WIDTH; x += 1) {
    const row = offset(x, OUTPUT_HEIGHT - 1, OUTPUT_WIDTH)
    for (let channel = 0; channel < CHANNELS; channel += 1) {
      if (image.data[row + channel] !== 0) {
        throw new Error(`${label}: non-transparent canonical padding row`)
      }
    }
  }
  for (let y = 0; y < OUTPUT_ART_HEIGHT; y += SCALE) {
    for (let x = 0; x < OUTPUT_WIDTH; x += SCALE) {
      const base = offset(x, y, OUTPUT_WIDTH)
      for (let blockY = 0; blockY < SCALE; blockY += 1) {
        for (let blockX = 0; blockX < SCALE; blockX += 1) {
          const sample = offset(x + blockX, y + blockY, OUTPUT_WIDTH)
          for (let channel = 0; channel < CHANNELS; channel += 1) {
            if (image.data[sample + channel] !== image.data[base + channel]) {
              throw new Error(`${label}: non-uniform 3x block at ${x},${y}`)
            }
          }
        }
      }
    }
  }
}

const toLogical = (image) => {
  const logical = Buffer.alloc(LOGICAL_WIDTH * LOGICAL_HEIGHT * CHANNELS)
  let write = 0
  for (let y = 0; y < OUTPUT_ART_HEIGHT; y += SCALE) {
    for (let x = 0; x < OUTPUT_WIDTH; x += SCALE) {
      const read = offset(x, y, OUTPUT_WIDTH)
      image.data.copy(logical, write, read, read + CHANNELS)
      write += CHANNELS
    }
  }
  return logical
}

const readMask = async (name) => {
  const image = await readRgba(path.join(MASKS, name))
  if (image.width !== LOGICAL_WIDTH || image.height !== LOGICAL_HEIGHT) {
    throw new Error(`${name}: expected logical 320x421 mask`)
  }
  const mask = new Uint8Array(LOGICAL_WIDTH * LOGICAL_HEIGHT)
  for (let index = 0; index < mask.length; index += 1) {
    const alpha = image.data[index * CHANNELS + 3]
    if (alpha !== 0 && alpha !== 255) {
      throw new Error(`${name}: partial alpha at ${index}`)
    }
    mask[index] = alpha === 255 ? 1 : 0
  }
  return mask
}

const palette = (data) => {
  const colors = new Set()
  for (let index = 0; index < data.length; index += CHANNELS) {
    if (data[index + 3] === 0) continue
    colors.add(
      `#${((data[index] << 16) | (data[index + 1] << 8) | data[index + 2])
        .toString(16)
        .padStart(6, '0')}`,
    )
  }
  return colors
}

const inspectRegion = (frames, unionMask, rect) => {
  const pixels = rect.width * rect.height
  const opaquePixelsByFrame = Array(frames.length).fill(0)
  let changedPixels = 0
  let motionMaskPixels = 0
  const patch = Buffer.alloc(pixels * CHANNELS)
  let write = 0
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const source = offset(x, y, OUTPUT_WIDTH)
      for (let frame = 0; frame < frames.length; frame += 1) {
        if (frames[frame][source + 3] === 255) {
          opaquePixelsByFrame[frame] += 1
        }
      }
      let changed = false
      for (const frame of frames.slice(1)) {
        for (let channel = 0; channel < CHANNELS; channel += 1) {
          if (frame[source + channel] !== frames[0][source + channel]) {
            changed = true
          }
        }
      }
      if (changed) changedPixels += 1
      const logical =
        Math.floor(y / SCALE) * LOGICAL_WIDTH + Math.floor(x / SCALE)
      if (unionMask[logical] !== 0) motionMaskPixels += 1
      frames[0].copy(patch, write, source, source + CHANNELS)
      write += CHANNELS
    }
  }
  return {
    ...rect,
    pixels,
    opaquePixelsByFrame: Object.fromEntries(
      FRAMES.map((frame, index) => [frame, opaquePixelsByFrame[index]]),
    ),
    allOpaque: opaquePixelsByFrame.every((count) => count === pixels),
    changedPixels,
    byteLocked: changedPixels === 0,
    motionMaskPixels,
    excludedFromMotionMask: motionMaskPixels === 0,
    patchRgbaSha256: rgbaHash(patch),
  }
}

const inspectDifferences = (frames, unionMask) => {
  let changedPixels = 0
  let outsideMaskPixels = 0
  const examples = []
  for (let index = 0; index < LOGICAL_WIDTH * LOGICAL_HEIGHT; index += 1) {
    const source = index * CHANNELS
    let changed = false
    for (const frame of frames.slice(1)) {
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        if (frame[source + channel] !== frames[0][source + channel]) {
          changed = true
        }
      }
    }
    if (!changed) continue
    changedPixels += 1
    if (unionMask[index] === 0) {
      outsideMaskPixels += 1
      if (examples.length < 8) {
        examples.push({
          x: index % LOGICAL_WIDTH,
          y: Math.floor(index / LOGICAL_WIDTH),
        })
      }
    }
  }
  return { changedPixels, outsideMaskPixels, examples }
}

const writeUpscaledMask = async (mask, file) => {
  const logical = Buffer.alloc(mask.length * CHANNELS)
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === 0) continue
    logical.fill(255, index * CHANNELS, index * CHANNELS + CHANNELS)
  }
  await sharp(logical, {
    raw: {
      width: LOGICAL_WIDTH,
      height: LOGICAL_HEIGHT,
      channels: CHANNELS,
    },
  })
    .resize({
      width: OUTPUT_WIDTH,
      height: OUTPUT_ART_HEIGHT,
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
}

const run = async () => {
  const errors = []
  const layers = {}
  for (const layer of LAYERS) {
    layers[layer] = []
    for (const frame of FRAMES) {
      const file = path.join(TRAVEL, 'frames', frame, `${layer}.png`)
      const image = await readRgba(file)
      assertOutput(image, `${frame}/${layer}`)
      layers[layer].push({
        frame,
        file,
        output: image.data,
        logical: toLogical(image),
        rgbaSha256: rgbaHash(image.data),
        fileSha256: await sha256File(file),
        colors: palette(image.data),
      })
    }
  }

  const sourceMasks = []
  for (const name of SOURCE_MASKS) sourceMasks.push(await readMask(name))
  const union = new Uint8Array(LOGICAL_WIDTH * LOGICAL_HEIGHT)
  for (const mask of sourceMasks) {
    for (let index = 0; index < union.length; index += 1) {
      if (mask[index] !== 0) union[index] = 1
    }
  }

  const staticEquality = {}
  for (const layer of ['rear', 'front']) {
    const canonical = layers[layer][0].rgbaSha256
    staticEquality[layer] = {
      canonicalFrame: 'i1',
      canonicalRgbaSha256: canonical,
      canonicalFileSha256: layers[layer][0].fileSha256,
      frames: layers[layer].map((entry) => ({
        frame: entry.frame,
        rgbaSha256: entry.rgbaSha256,
        fileSha256: entry.fileSha256,
        matchesCanonical: entry.rgbaSha256 === canonical,
      })),
    }
    if (
      staticEquality[layer].frames.some(
        ({ matchesCanonical }) => !matchesCanonical,
      )
    ) {
      errors.push(`${layer} is not byte-identical across frames`)
    }
  }

  const referencePalette = layers.composite[0].colors
  const paletteFamily = {
    reference: 'composite.i1',
    referenceColors: referencePalette.size,
    unionColors: 0,
    members: [],
  }
  const familyUnion = new Set()
  for (const layer of LAYERS) {
    for (const entry of layers[layer]) {
      for (const color of entry.colors) familyUnion.add(color)
      const outsideReference = [...entry.colors]
        .filter((color) => !referencePalette.has(color))
        .sort()
      paletteFamily.members.push({
        asset: `${layer}.${entry.frame}`,
        colors: entry.colors.size,
        outsideReference,
        isSubset: outsideReference.length === 0,
      })
      if (outsideReference.length > 0) {
        errors.push(`${layer}.${entry.frame} leaves the family palette`)
      }
    }
  }
  paletteFamily.unionColors = familyUnion.size

  const keeperFrames = layers.keeper.map(({ logical }) => logical)
  const compositeFrames = layers.composite.map(({ logical }) => logical)
  const requestedTorso = inspectRegion(
    layers.keeper.map(({ output }) => output),
    union,
    REQUESTED_TORSO,
  )
  const selectedTorso = inspectRegion(
    layers.keeper.map(({ output }) => output),
    union,
    SELECTED_TORSO,
  )
  if (
    !selectedTorso.allOpaque ||
    !selectedTorso.byteLocked ||
    !selectedTorso.excludedFromMotionMask
  ) {
    errors.push('selected central chest patch is not a valid lock')
  }

  const rootRect = {
    x: ROOT_REGISTRATION.x - ROOT_REGISTRATION.lockRadius,
    y: ROOT_REGISTRATION.y - ROOT_REGISTRATION.lockRadius,
    width: ROOT_REGISTRATION.lockRadius * 2 + 1,
    height: ROOT_REGISTRATION.lockRadius * 2 + 1,
  }
  const keeperRootPatch = inspectRegion(
    layers.keeper.map(({ output }) => output),
    union,
    rootRect,
  )
  const compositeRootPatch = inspectRegion(
    layers.composite.map(({ output }) => output),
    union,
    rootRect,
  )
  for (const [label, patch] of [
    ['keeper', keeperRootPatch],
    ['composite', compositeRootPatch],
  ]) {
    if (
      !patch.allOpaque ||
      !patch.byteLocked ||
      !patch.excludedFromMotionMask
    ) {
      errors.push(`${label} root registration patch is not a valid lock`)
    }
  }

  const rootRegistration = {
    ...ROOT_REGISTRATION,
    patchRect: rootRect,
    keeperPatch: keeperRootPatch,
    compositePatch: compositeRootPatch,
    keeperRgba: Object.fromEntries(
      layers.keeper.map((entry) => {
        const start = offset(
          ROOT_REGISTRATION.x,
          ROOT_REGISTRATION.y,
          OUTPUT_WIDTH,
        )
        return [
          entry.frame,
          [...entry.output.subarray(start, start + CHANNELS)],
        ]
      }),
    ),
    compositeRgba: Object.fromEntries(
      layers.composite.map((entry) => {
        const start = offset(
          ROOT_REGISTRATION.x,
          ROOT_REGISTRATION.y,
          OUTPUT_WIDTH,
        )
        return [
          entry.frame,
          [...entry.output.subarray(start, start + CHANNELS)],
        ]
      }),
    ),
    motionMaskPixel:
      union[
        Math.floor(ROOT_REGISTRATION.y / SCALE) * LOGICAL_WIDTH +
          Math.floor(ROOT_REGISTRATION.x / SCALE)
      ],
  }

  const output = path.join(MASKS, 'motion-union-3x.png')
  await writeUpscaledMask(union, output)
  const outputImage = await readRgba(output)
  assertOutput(outputImage, 'travel union motion mask')

  const report = {
    version: 1,
    frameOrder: FRAMES,
    sourceMasks: SOURCE_MASKS,
    staticEquality,
    paletteFamily,
    motion: {
      logicalPixels: union.reduce((sum, value) => sum + value, 0),
      keeper: inspectDifferences(keeperFrames, union),
      composite: inspectDifferences(compositeFrames, union),
    },
    torso: {
      requested: requestedTorso,
      requestedSuitable:
        requestedTorso.allOpaque &&
        requestedTorso.byteLocked &&
        requestedTorso.excludedFromMotionMask,
      selected: selectedTorso,
    },
    rootRegistration,
    effectsEmpty: layers.effect.every((entry) => entry.colors.size === 0),
    outputMask: {
      file: path.relative(ROOT, output),
      width: outputImage.width,
      height: outputImage.height,
      rgbaSha256: rgbaHash(outputImage.data),
      fileSha256: await sha256File(output),
      colors: palette(outputImage.data).size,
    },
    errors,
    status: errors.length === 0 ? 'pass' : 'fail',
  }
  if (
    report.motion.keeper.outsideMaskPixels > 0 ||
    report.motion.composite.outsideMaskPixels > 0
  ) {
    report.errors.push('motion exists outside the authored union mask')
    report.status = 'fail'
  }

  await mkdir(path.dirname(REPORT), { recursive: true })
  await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`)
  console.log(
    `${report.status.toUpperCase()}: ${report.motion.logicalPixels} logical motion pixels; ` +
      `selected torso ${SELECTED_TORSO.x},${SELECTED_TORSO.y},${SELECTED_TORSO.width},${SELECTED_TORSO.height}`,
  )
  console.log(`Report: ${REPORT}`)
  process.exitCode = report.status === 'pass' ? 0 : 1
}

await run()
