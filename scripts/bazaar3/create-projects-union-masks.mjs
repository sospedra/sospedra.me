#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { sha256File } from './verify-assets.mjs'

const ROOT = process.cwd()
const PROJECTS = path.join(ROOT, 'public/images/bazaar3/assets/stalls/projects')
const MASKS = path.join(PROJECTS, 'masks')
const REPORT = path.join(
  ROOT,
  'scripts/bazaar3/reports/projects-motion-masks.json',
)

const LOGICAL_WIDTH = 320
const LOGICAL_HEIGHT = 421
const OUTPUT_WIDTH = 960
const OUTPUT_ART_HEIGHT = 1263
const OUTPUT_HEIGHT = 1264
const SCALE = 3
const CHANNELS = 4
const FRAMES = ['i1', 'i2', 'h1', 'h2', 'h3']
const KEEPER_MASKS = [
  'motion-idle-2.png',
  'motion-hover-1.png',
  'motion-hover-2.png',
  'motion-hover-3.png',
]
const ROOT_ANCHOR = {
  x: 505,
  y: 700,
  lockRadius: 16,
  logicalRect: { x: 163, y: 228, width: 11, height: 11 },
  description:
    '11x11 authored-pixel patch on the fixed upper-left apron/torso, aligned to the 3x grid.',
}

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

const assertOutputSprite = (image, label) => {
  if (image.width !== OUTPUT_WIDTH || image.height !== OUTPUT_HEIGHT) {
    throw new Error(
      `${label}: expected ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}, got ${image.width}x${image.height}`,
    )
  }
  for (let x = 0; x < OUTPUT_WIDTH; x += 1) {
    const rowOffset = offset(x, OUTPUT_HEIGHT - 1, OUTPUT_WIDTH)
    for (let channel = 0; channel < CHANNELS; channel += 1) {
      if (image.data[rowOffset + channel] !== 0) {
        throw new Error(`${label}: final row is not canonical transparent RGBA`)
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
  const data = Buffer.alloc(LOGICAL_WIDTH * LOGICAL_HEIGHT * CHANNELS)
  let writeOffset = 0
  for (let y = 0; y < OUTPUT_ART_HEIGHT; y += SCALE) {
    for (let x = 0; x < OUTPUT_WIDTH; x += SCALE) {
      const readOffset = offset(x, y, OUTPUT_WIDTH)
      image.data.copy(data, writeOffset, readOffset, readOffset + CHANNELS)
      writeOffset += CHANNELS
    }
  }
  return data
}

const readLogicalMask = async (name) => {
  const image = await readRgba(path.join(MASKS, name))
  if (image.width !== LOGICAL_WIDTH || image.height !== LOGICAL_HEIGHT) {
    throw new Error(`${name}: expected 320x421 logical mask`)
  }
  const mask = new Uint8Array(LOGICAL_WIDTH * LOGICAL_HEIGHT)
  for (let index = 0; index < mask.length; index += 1) {
    const alpha = image.data[index * CHANNELS + 3]
    if (alpha !== 0 && alpha !== 255) {
      throw new Error(`${name}: partial alpha at logical pixel ${index}`)
    }
    mask[index] = alpha === 255 ? 1 : 0
  }
  return mask
}

const unionMasks = (masks) => {
  const union = new Uint8Array(LOGICAL_WIDTH * LOGICAL_HEIGHT)
  for (const mask of masks) {
    for (let index = 0; index < union.length; index += 1) {
      if (mask[index] !== 0) union[index] = 1
    }
  }
  return union
}

const pixelChanged = (base, frame, index) => {
  const start = index * CHANNELS
  for (let channel = 0; channel < CHANNELS; channel += 1) {
    if (base[start + channel] !== frame[start + channel]) return true
  }
  return false
}

const includeActualDifferences = (union, frames) => {
  let changedPixels = 0
  let outsideSourceMaskPixels = 0
  const examples = []
  const base = frames[0]
  for (let index = 0; index < union.length; index += 1) {
    let changed = false
    for (const frame of frames.slice(1)) {
      if (pixelChanged(base, frame, index)) changed = true
    }
    if (!changed) continue
    changedPixels += 1
    if (union[index] === 0) {
      outsideSourceMaskPixels += 1
      if (examples.length < 8) {
        examples.push({
          x: index % LOGICAL_WIDTH,
          y: Math.floor(index / LOGICAL_WIDTH),
        })
      }
      union[index] = 1
    }
  }
  return { changedPixels, outsideSourceMaskPixels, examples }
}

const clearTorsoExclusion = (union, frames) => {
  const rect = ROOT_ANCHOR.logicalRect
  let removedMaskPixels = 0
  let changedPixels = 0
  const examples = []
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const index = y * LOGICAL_WIDTH + x
      let changed = false
      for (const frame of frames.slice(1)) {
        if (pixelChanged(frames[0], frame, index)) changed = true
      }
      if (changed) {
        changedPixels += 1
        if (examples.length < 8) examples.push({ x, y })
      }
      if (union[index] !== 0) removedMaskPixels += 1
      union[index] = 0
    }
  }
  return {
    logicalRect: rect,
    pixels: rect.width * rect.height,
    removedMaskPixels,
    changedPixels,
    examples,
    excluded: changedPixels === 0,
  }
}

const maskBbox = (mask) => {
  let minX = LOGICAL_WIDTH
  let minY = LOGICAL_HEIGHT
  let maxX = -1
  let maxY = -1
  let pixels = 0
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === 0) continue
    const x = index % LOGICAL_WIDTH
    const y = Math.floor(index / LOGICAL_WIDTH)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    pixels += 1
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    pixels,
  }
}

const inspectRootPatch = (outputFrames, logicalMask) => {
  const startX = ROOT_ANCHOR.x - ROOT_ANCHOR.lockRadius
  const endX = ROOT_ANCHOR.x + ROOT_ANCHOR.lockRadius
  const startY = ROOT_ANCHOR.y - ROOT_ANCHOR.lockRadius
  const endY = ROOT_ANCHOR.y + ROOT_ANCHOR.lockRadius
  let pixels = 0
  let opaquePixels = 0
  let changedPixels = 0
  let maskedPixels = 0
  const patch = Buffer.alloc((ROOT_ANCHOR.lockRadius * 2 + 1) ** 2 * CHANNELS)
  let patchOffset = 0

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      pixels += 1
      const sourceOffset = offset(x, y, OUTPUT_WIDTH)
      const alpha = outputFrames[0][sourceOffset + 3]
      if (alpha === 255) opaquePixels += 1
      for (const frame of outputFrames.slice(1)) {
        for (let channel = 0; channel < CHANNELS; channel += 1) {
          if (
            frame[sourceOffset + channel] !==
            outputFrames[0][sourceOffset + channel]
          ) {
            changedPixels += 1
            channel = CHANNELS
          }
        }
      }
      const logicalIndex =
        Math.floor(y / SCALE) * LOGICAL_WIDTH + Math.floor(x / SCALE)
      if (logicalMask[logicalIndex] !== 0) maskedPixels += 1
      outputFrames[0].copy(
        patch,
        patchOffset,
        sourceOffset,
        sourceOffset + CHANNELS,
      )
      patchOffset += CHANNELS
    }
  }

  const center = offset(ROOT_ANCHOR.x, ROOT_ANCHOR.y, OUTPUT_WIDTH)
  return {
    ...ROOT_ANCHOR,
    pixels,
    opaquePixels,
    changedPixels,
    maskedPixels,
    allOpaque: opaquePixels === pixels,
    byteLocked: changedPixels === 0,
    excludedFromMotionMask: maskedPixels === 0,
    centerRgba: [...outputFrames[0].subarray(center, center + CHANNELS)],
    patchRgbaSha256: rgbaHash(patch),
  }
}

const writeUpscaledMask = async (logicalMask, file) => {
  const logical = Buffer.alloc(LOGICAL_WIDTH * LOGICAL_HEIGHT * CHANNELS)
  for (let index = 0; index < logicalMask.length; index += 1) {
    if (logicalMask[index] === 0) continue
    const writeOffset = index * CHANNELS
    logical[writeOffset] = 255
    logical[writeOffset + 1] = 255
    logical[writeOffset + 2] = 255
    logical[writeOffset + 3] = 255
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

const visiblePaletteCount = (data) => {
  const colors = new Set()
  for (let index = 0; index < data.length; index += CHANNELS) {
    if (data[index + 3] === 0) continue
    colors.add((data[index] << 16) | (data[index + 1] << 8) | data[index + 2])
  }
  return colors.size
}

const run = async () => {
  const errors = []
  const layers = {}
  for (const layer of ['rear', 'front', 'keeper', 'effect', 'composite']) {
    layers[layer] = []
    for (const frame of FRAMES) {
      const file = path.join(PROJECTS, 'frames', frame, `${layer}.png`)
      const image = await readRgba(file)
      assertOutputSprite(image, `${frame}/${layer}`)
      layers[layer].push({
        frame,
        file,
        output: image.data,
        logical: toLogical(image),
        rgbaSha256: rgbaHash(image.data),
        fileSha256: await sha256File(file),
        paletteColors: visiblePaletteCount(image.data),
      })
    }
  }

  const staticEquality = {}
  for (const layer of ['rear', 'front']) {
    const base = layers[layer][0].rgbaSha256
    staticEquality[layer] = {
      canonicalFrame: 'i1',
      canonicalRgbaSha256: base,
      canonicalFileSha256: layers[layer][0].fileSha256,
      frames: layers[layer].map((entry) => ({
        frame: entry.frame,
        rgbaSha256: entry.rgbaSha256,
        fileSha256: entry.fileSha256,
        matchesCanonical: entry.rgbaSha256 === base,
      })),
    }
    if (
      staticEquality[layer].frames.some(
        ({ matchesCanonical }) => !matchesCanonical,
      )
    ) {
      errors.push(`${layer} decoded RGBA differs between frames`)
    }
  }

  const keeperSourceMasks = []
  for (const name of KEEPER_MASKS) {
    keeperSourceMasks.push(await readLogicalMask(name))
  }
  const keeperUnion = unionMasks(keeperSourceMasks)
  const keeperDifference = includeActualDifferences(
    keeperUnion,
    layers.keeper.map(({ logical }) => logical),
  )
  const keeperTorsoExclusion = clearTorsoExclusion(
    keeperUnion,
    layers.keeper.map(({ logical }) => logical),
  )

  const effectSourceMask = await readLogicalMask('effect-motion.png')
  const effectUnion = unionMasks([effectSourceMask])
  const effectDifference = includeActualDifferences(
    effectUnion,
    layers.effect.map(({ logical }) => logical),
  )
  const effectTorsoExclusion = clearTorsoExclusion(
    effectUnion,
    layers.effect.map(({ logical }) => logical),
  )
  const allMotionUnion = unionMasks([keeperUnion, effectUnion])
  const rootPatch = inspectRootPatch(
    layers.keeper.map(({ output }) => output),
    allMotionUnion,
  )
  if (
    !keeperTorsoExclusion.excluded ||
    !effectTorsoExclusion.excluded ||
    !rootPatch.allOpaque ||
    !rootPatch.byteLocked ||
    !rootPatch.excludedFromMotionMask
  ) {
    errors.push('keeper torso/apron root patch invariant failed')
  }

  await mkdir(MASKS, { recursive: true })
  const keeperOutput = path.join(MASKS, 'keeper-motion-union-3x.png')
  const effectOutput = path.join(MASKS, 'effect-motion-union-3x.png')
  await writeUpscaledMask(keeperUnion, keeperOutput)
  await writeUpscaledMask(effectUnion, effectOutput)

  const outputMasks = {}
  for (const [name, file] of [
    ['keeper', keeperOutput],
    ['effect', effectOutput],
  ]) {
    const image = await readRgba(file)
    assertOutputSprite(image, `${name} union motion mask`)
    const alphaPixels = inspectBinaryMask(image.data)
    outputMasks[name] = {
      file: path.relative(ROOT, file),
      width: image.width,
      height: image.height,
      bbox: alphaPixels.bbox,
      opaquePixels: alphaPixels.opaquePixels,
      partialAlphaPixels: alphaPixels.partialAlphaPixels,
      visiblePaletteColors: visiblePaletteCount(image.data),
      rgbaSha256: rgbaHash(image.data),
      fileSha256: await sha256File(file),
    }
    if (
      alphaPixels.partialAlphaPixels !== 0 ||
      outputMasks[name].visiblePaletteColors !== 1
    ) {
      errors.push(`${name} union mask is not binary one-color output`)
    }
  }

  const report = {
    version: 1,
    frameOrder: FRAMES,
    staticEquality,
    keeper: {
      sourceMasks: KEEPER_MASKS,
      difference: keeperDifference,
      torsoExclusion: keeperTorsoExclusion,
      unionBbox: maskBbox(keeperUnion),
      rootPatch,
    },
    effect: {
      sourceMasks: ['effect-motion.png'],
      difference: effectDifference,
      torsoExclusion: effectTorsoExclusion,
      unionBbox: maskBbox(effectUnion),
    },
    composites: layers.composite.map((entry) => ({
      frame: entry.frame,
      visiblePaletteColors: entry.paletteColors,
      rgbaSha256: entry.rgbaSha256,
      exactly40Colors: entry.paletteColors === 40,
    })),
    outputMasks,
    errors,
    status:
      errors.length === 0 &&
      layers.composite.every(({ paletteColors }) => paletteColors === 40)
        ? 'pass'
        : 'fail',
  }
  if (report.composites.some(({ exactly40Colors }) => !exactly40Colors)) {
    report.errors.push(
      'one or more composites do not contain exactly 40 colors',
    )
    report.status = 'fail'
  }

  await mkdir(path.dirname(REPORT), { recursive: true })
  await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`)
  console.log(
    `${report.status.toUpperCase()}: keeper ${keeperUnion.reduce((sum, value) => sum + value, 0)} logical mask pixels, ` +
      `effect ${effectUnion.reduce((sum, value) => sum + value, 0)}, root ${rootPatch.pixels}/${rootPatch.pixels} locked`,
  )
  console.log(`Report: ${REPORT}`)
  process.exitCode = report.status === 'pass' ? 0 : 1
}

const inspectBinaryMask = (data) => {
  let opaquePixels = 0
  let partialAlphaPixels = 0
  let minX = OUTPUT_WIDTH
  let minY = OUTPUT_HEIGHT
  let maxX = -1
  let maxY = -1
  for (let index = 0; index < data.length; index += CHANNELS) {
    const alpha = data[index + 3]
    if (alpha !== 0 && alpha !== 255) partialAlphaPixels += 1
    if (alpha !== 255) continue
    opaquePixels += 1
    const pixel = index / CHANNELS
    const x = pixel % OUTPUT_WIDTH
    const y = Math.floor(pixel / OUTPUT_WIDTH)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return {
    opaquePixels,
    partialAlphaPixels,
    bbox:
      maxX < 0
        ? null
        : {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          },
  }
}

await run()
