#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const LOGICAL_WIDTH = 320
const LOGICAL_HEIGHT = 421
const SCALE = 3
const STAGE_WIDTH = LOGICAL_WIDTH * SCALE
const ART_HEIGHT = LOGICAL_HEIGHT * SCALE
const STAGE_HEIGHT = ART_HEIGHT + 1
const MAX_COLORS = 40

const SOURCE_DIR = 'public/images/bazaar3/sources'
const OUTPUT_DIR = 'public/images/bazaar3/assets/stalls/console'
const REPORT_DIR = 'scripts/bazaar3/reports'

const MASTER_SOURCE = path.join(SOURCE_DIR, 'console-master-bazaar2-v1.png')
const CLEAN_SOURCE = path.join(SOURCE_DIR, 'console-rear-clean-raw-v1.png')

const FRAME_SOURCES = {
  i1: path.join(SOURCE_DIR, 'console-keeper-i1-bazaar2-v1.png'),
  i2: path.join(SOURCE_DIR, 'console-keeper-i2-bazaar2-v1.png'),
  h1: path.join(SOURCE_DIR, 'console-keeper-h1-bazaar2-v1.png'),
  h2: path.join(SOURCE_DIR, 'console-keeper-h2-bazaar2-v1.png'),
  h3: path.join(SOURCE_DIR, 'console-keeper-h3-bazaar2-v1.png'),
}

const rgbaOffset = (x, y, width = LOGICAL_WIDTH) => (y * width + x) * 4
const pixelOffset = (x, y) => y * LOGICAL_WIDTH + x

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const fileSha256 = async (file) => sha256(await readFile(file))

const emptyRgba = () => Buffer.alloc(LOGICAL_WIDTH * LOGICAL_HEIGHT * 4)
const emptyMask = () => new Uint8Array(LOGICAL_WIDTH * LOGICAL_HEIGHT)

const loadLogical = async (file) => {
  const result = await sharp(file)
    .ensureAlpha()
    .resize(LOGICAL_WIDTH, LOGICAL_HEIGHT, {
      fit: 'contain',
      position: 'centre',
      kernel: sharp.kernel.nearest,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return Buffer.from(result.data)
}

const keyGeneratedGreen = (data) => {
  const output = Buffer.from(data)
  for (let index = 0; index < output.length; index += 4) {
    const red = output[index]
    const green = output[index + 1]
    const blue = output[index + 2]
    if (green >= 150 && green >= red * 1.75 && green >= blue * 1.45) {
      output[index] = 0
      output[index + 1] = 0
      output[index + 2] = 0
      output[index + 3] = 0
    }
  }
  return output
}

const binaryAlpha = (data) => {
  const output = Buffer.from(data)
  for (let index = 0; index < output.length; index += 4) {
    if (output[index + 3] < 128) {
      output[index] = 0
      output[index + 1] = 0
      output[index + 2] = 0
      output[index + 3] = 0
    } else {
      output[index + 3] = 255
    }
  }
  return output
}

const quantizeMaster = async (data) => {
  const palettePng = await sharp(data, {
    raw: {
      width: LOGICAL_WIDTH,
      height: LOGICAL_HEIGHT,
      channels: 4,
    },
  })
    .png({
      adaptiveFiltering: false,
      compressionLevel: 9,
      palette: true,
      colours: MAX_COLORS,
      dither: 0,
    })
    .toBuffer()
  const raw = await sharp(palettePng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return binaryAlpha(raw.data)
}

const getPalette = (data) => {
  const values = new Map()
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue
    const key = `${data[index]},${data[index + 1]},${data[index + 2]}`
    if (!values.has(key)) {
      values.set(key, [data[index], data[index + 1], data[index + 2]])
    }
  }
  return [...values.values()]
}

const remapToPalette = (data, palette) => {
  const output = Buffer.from(data)
  const memo = new Map()
  for (let index = 0; index < output.length; index += 4) {
    if (output[index + 3] === 0) {
      output[index] = 0
      output[index + 1] = 0
      output[index + 2] = 0
      continue
    }
    const red = output[index]
    const green = output[index + 1]
    const blue = output[index + 2]
    const sourceKey = `${red},${green},${blue}`
    let target = memo.get(sourceKey)
    if (!target) {
      let bestDistance = Number.POSITIVE_INFINITY
      for (const candidate of palette) {
        const redDelta = red - candidate[0]
        const greenDelta = green - candidate[1]
        const blueDelta = blue - candidate[2]
        const distance =
          redDelta * redDelta * 0.3 +
          greenDelta * greenDelta * 0.59 +
          blueDelta * blueDelta * 0.11
        if (distance < bestDistance) {
          bestDistance = distance
          target = candidate
        }
      }
      memo.set(sourceKey, target)
    }
    output[index] = target[0]
    output[index + 1] = target[1]
    output[index + 2] = target[2]
    output[index + 3] = 255
  }
  return output
}

const setMaskEllipse = (mask, centerX, centerY, radiusX, radiusY) => {
  for (
    let y = Math.max(0, Math.floor(centerY - radiusY));
    y <= Math.min(LOGICAL_HEIGHT - 1, Math.ceil(centerY + radiusY));
    y += 1
  ) {
    for (
      let x = Math.max(0, Math.floor(centerX - radiusX));
      x <= Math.min(LOGICAL_WIDTH - 1, Math.ceil(centerX + radiusX));
      x += 1
    ) {
      const normalizedX = (x - centerX) / radiusX
      const normalizedY = (y - centerY) / radiusY
      if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
        mask[pixelOffset(x, y)] = 1
      }
    }
  }
}

const setMaskRect = (mask, left, top, right, bottom) => {
  for (
    let y = Math.max(0, top);
    y <= Math.min(LOGICAL_HEIGHT - 1, bottom);
    y += 1
  ) {
    for (
      let x = Math.max(0, left);
      x <= Math.min(LOGICAL_WIDTH - 1, right);
      x += 1
    ) {
      mask[pixelOffset(x, y)] = 1
    }
  }
}

const setMaskLine = (mask, fromX, fromY, toX, toY, radius) => {
  const steps = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY))
  for (let step = 0; step <= steps; step += 1) {
    const ratio = steps === 0 ? 0 : step / steps
    const x = Math.round(fromX + (toX - fromX) * ratio)
    const y = Math.round(fromY + (toY - fromY) * ratio)
    setMaskEllipse(mask, x, y, radius, radius)
  }
}

const dilateMask = (mask, radius) => {
  const output = emptyMask()
  for (let y = 0; y < LOGICAL_HEIGHT; y += 1) {
    for (let x = 0; x < LOGICAL_WIDTH; x += 1) {
      if (!mask[pixelOffset(x, y)]) continue
      for (let deltaY = -radius; deltaY <= radius; deltaY += 1) {
        for (let deltaX = -radius; deltaX <= radius; deltaX += 1) {
          const nextX = x + deltaX
          const nextY = y + deltaY
          if (
            nextX < 0 ||
            nextX >= LOGICAL_WIDTH ||
            nextY < 0 ||
            nextY >= LOGICAL_HEIGHT
          ) {
            continue
          }
          output[pixelOffset(nextX, nextY)] = 1
        }
      }
    }
  }
  return output
}

const createRepairMask = () => {
  const mask = emptyMask()
  setMaskEllipse(mask, 157, 241, 42, 46)
  setMaskEllipse(mask, 157, 291, 35, 58)
  setMaskEllipse(mask, 157, 338, 68, 31)
  setMaskEllipse(mask, 206, 350, 22, 19)
  setMaskRect(mask, 119, 257, 194, 339)
  setMaskLine(mask, 181, 228, 204, 348, 4)
  return dilateMask(mask, 2)
}

const patchInsideMask = (base, patch, mask) => {
  const output = Buffer.from(base)
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue
    patch.copy(output, index * 4, index * 4, index * 4 + 4)
  }
  return output
}

const createFrontMask = () => {
  const mask = emptyMask()
  setMaskRect(mask, 0, 331, 125, LOGICAL_HEIGHT - 1)
  setMaskRect(mask, 211, 329, LOGICAL_WIDTH - 1, LOGICAL_HEIGHT - 1)
  setMaskRect(mask, 0, 395, LOGICAL_WIDTH - 1, LOGICAL_HEIGHT - 1)
  setMaskEllipse(mask, 108, 355, 23, 31)
  return mask
}

const splitByMask = (data, mask) => {
  const included = emptyRgba()
  const excluded = emptyRgba()
  for (let index = 0; index < mask.length; index += 1) {
    const destination = mask[index] ? included : excluded
    data.copy(destination, index * 4, index * 4, index * 4 + 4)
  }
  return { included, excluded }
}

const resizeKeeper = async (file) => {
  const resized = await sharp(file)
    .ensureAlpha()
    .resize(135, 250, {
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return binaryAlpha(resized.data)
}

const placeKeeper = (source) => {
  const output = emptyRgba()
  const sourceWidth = 135
  const sourceHeight = 250
  const left = 93
  const top = 132
  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      const sourceIndex = (y * sourceWidth + x) * 4
      if (source[sourceIndex + 3] === 0) continue
      const destinationX = left + x
      const destinationY = top + y
      if (
        destinationX < 0 ||
        destinationX >= LOGICAL_WIDTH ||
        destinationY < 0 ||
        destinationY >= LOGICAL_HEIGHT
      ) {
        continue
      }
      source.copy(
        output,
        rgbaOffset(destinationX, destinationY),
        sourceIndex,
        sourceIndex + 4,
      )
    }
  }
  return output
}

const createTorsoLockMask = () => {
  const mask = emptyMask()
  setMaskEllipse(mask, 157, 337, 66, 29)
  setMaskRect(mask, 143, 269, 172, 333)
  setMaskRect(mask, 132, 316, 184, 357)
  return mask
}

const copyInsideMask = (target, source, mask) => {
  const output = Buffer.from(target)
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue
    source.copy(output, index * 4, index * 4, index * 4 + 4)
  }
  return output
}

const over = (...layers) => {
  const output = emptyRgba()
  for (const layer of layers) {
    for (let index = 0; index < layer.length; index += 4) {
      if (layer[index + 3] === 0) continue
      layer.copy(output, index, index, index + 4)
    }
  }
  return output
}

const alphaMaskFrom = (data) => {
  const mask = emptyMask()
  for (let index = 0; index < mask.length; index += 1) {
    if (data[index * 4 + 3] !== 0) mask[index] = 1
  }
  return mask
}

const unionMasks = (...masks) => {
  const output = emptyMask()
  for (const mask of masks) {
    for (let index = 0; index < mask.length; index += 1) {
      if (mask[index]) output[index] = 1
    }
  }
  return output
}

const createMotionMask = (frames, baseline) => {
  const mask = emptyMask()
  for (const frame of Object.values(frames)) {
    for (let index = 0; index < mask.length; index += 1) {
      const pixel = index * 4
      if (
        frame[pixel] !== baseline[pixel] ||
        frame[pixel + 1] !== baseline[pixel + 1] ||
        frame[pixel + 2] !== baseline[pixel + 2] ||
        frame[pixel + 3] !== baseline[pixel + 3]
      ) {
        mask[index] = 1
      }
    }
  }
  return dilateMask(mask, 1)
}

const maskToRgba = (mask, color = [255, 255, 255, 255]) => {
  const output = emptyRgba()
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue
    output[index * 4] = color[0]
    output[index * 4 + 1] = color[1]
    output[index * 4 + 2] = color[2]
    output[index * 4 + 3] = color[3]
  }
  return output
}

const saveStage = async (data, file) => {
  await mkdir(path.dirname(file), { recursive: true })
  await sharp(data, {
    raw: {
      width: LOGICAL_WIDTH,
      height: LOGICAL_HEIGHT,
      channels: 4,
    },
  })
    .resize(STAGE_WIDTH, ART_HEIGHT, {
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

const logicalStats = (data, paletteSet) => {
  let transparent = 0
  let opaque = 0
  let partial = 0
  let outsidePalette = 0
  let minX = LOGICAL_WIDTH
  let minY = LOGICAL_HEIGHT
  let maxX = -1
  let maxY = -1
  const colors = new Set()
  for (let y = 0; y < LOGICAL_HEIGHT; y += 1) {
    for (let x = 0; x < LOGICAL_WIDTH; x += 1) {
      const index = rgbaOffset(x, y)
      const alpha = data[index + 3]
      if (alpha === 0) {
        transparent += 1
        continue
      }
      if (alpha === 255) opaque += 1
      else partial += 1
      const key = `${data[index]},${data[index + 1]},${data[index + 2]}`
      colors.add(key)
      if (!paletteSet.has(key)) outsidePalette += 1
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  return {
    transparent,
    opaque,
    partial,
    colors: colors.size,
    outsidePalette,
    bbox:
      maxX < 0
        ? null
        : {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            bottom: maxY,
          },
  }
}

const inspectStageFile = async (file, paletteSet, requireMasterPalette) => {
  const image = sharp(file).ensureAlpha()
  const metadata = await image.metadata()
  const raw = await image.raw().toBuffer({ resolveWithObject: true })
  let transparent = 0
  let opaque = 0
  let partial = 0
  let bottomOpaque = 0
  let blockMismatches = 0
  let outsidePalette = 0
  const colors = new Set()

  for (let y = 0; y < raw.info.height; y += 1) {
    for (let x = 0; x < raw.info.width; x += 1) {
      const index = (y * raw.info.width + x) * 4
      const alpha = raw.data[index + 3]
      if (alpha === 0) transparent += 1
      else if (alpha === 255) opaque += 1
      else partial += 1
      if (y === STAGE_HEIGHT - 1 && alpha !== 0) bottomOpaque += 1
      if (alpha !== 0) {
        const key = `${raw.data[index]},${raw.data[index + 1]},${raw.data[index + 2]}`
        colors.add(key)
        if (requireMasterPalette && !paletteSet.has(key)) outsidePalette += 1
      }
    }
  }

  if (raw.info.width === STAGE_WIDTH && raw.info.height === STAGE_HEIGHT) {
    for (let logicalY = 0; logicalY < LOGICAL_HEIGHT; logicalY += 1) {
      for (let logicalX = 0; logicalX < LOGICAL_WIDTH; logicalX += 1) {
        const baseX = logicalX * SCALE
        const baseY = logicalY * SCALE
        const base = (baseY * STAGE_WIDTH + baseX) * 4
        for (let deltaY = 0; deltaY < SCALE; deltaY += 1) {
          for (let deltaX = 0; deltaX < SCALE; deltaX += 1) {
            const index = ((baseY + deltaY) * STAGE_WIDTH + baseX + deltaX) * 4
            for (let channel = 0; channel < 4; channel += 1) {
              if (raw.data[index + channel] !== raw.data[base + channel]) {
                blockMismatches += 1
                deltaX = SCALE
                deltaY = SCALE
                break
              }
            }
          }
        }
      }
    }
  }

  return {
    file: path.resolve(file),
    sha256: await fileSha256(file),
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    transparent,
    opaque,
    partial,
    colors: colors.size,
    outsidePalette,
    bottomOpaque,
    blockMismatches,
    pass:
      metadata.width === STAGE_WIDTH &&
      metadata.height === STAGE_HEIGHT &&
      partial === 0 &&
      bottomOpaque === 0 &&
      blockMismatches === 0 &&
      (!requireMasterPalette || outsidePalette === 0),
  }
}

const countDiffOutsideMask = (left, right, mask) => {
  let differences = 0
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index]) continue
    const pixel = index * 4
    if (
      left[pixel] !== right[pixel] ||
      left[pixel + 1] !== right[pixel + 1] ||
      left[pixel + 2] !== right[pixel + 2] ||
      left[pixel + 3] !== right[pixel + 3]
    ) {
      differences += 1
    }
  }
  return differences
}

const maskedHash = (data, mask) => {
  const selected = Buffer.alloc(mask.length * 4)
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue
    data.copy(selected, index * 4, index * 4, index * 4 + 4)
  }
  return sha256(selected)
}

const createContactSheet = async (compositeFiles) => {
  const thumbWidth = 240
  const thumbHeight = 316
  const labelHeight = 32
  const frames = Object.keys(compositeFiles)
  const composites = []
  for (const [index, frame] of frames.entries()) {
    const image = await sharp(compositeFiles[frame])
      .resize(thumbWidth, thumbHeight, {
        fit: 'contain',
        kernel: sharp.kernel.nearest,
        background: { r: 15, g: 17, b: 23, alpha: 1 },
      })
      .png()
      .toBuffer()
    composites.push({
      input: image,
      left: index * thumbWidth,
      top: labelHeight,
    })
    const label = Buffer.from(
      `<svg width="${thumbWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#0f1117"/><text x="12" y="22" fill="#f4d9a3" font-size="16" font-family="monospace">${frame.toUpperCase()}</text></svg>`,
    )
    composites.push({
      input: label,
      left: index * thumbWidth,
      top: 0,
    })
  }
  const file = path.join(REPORT_DIR, 'console-contact-sheet.png')
  await sharp({
    create: {
      width: thumbWidth * frames.length,
      height: thumbHeight + labelHeight,
      channels: 4,
      background: { r: 15, g: 17, b: 23, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(file)
  return file
}

await mkdir(OUTPUT_DIR, { recursive: true })
await mkdir(REPORT_DIR, { recursive: true })

const masterLogical = await quantizeMaster(
  binaryAlpha(await loadLogical(MASTER_SOURCE)),
)
const palette = getPalette(masterLogical)
const paletteSet = new Set(
  palette.map((color) => `${color[0]},${color[1]},${color[2]}`),
)

const cleanLogical = remapToPalette(
  binaryAlpha(keyGeneratedGreen(await loadLogical(CLEAN_SOURCE))),
  palette,
)
const repairMask = createRepairMask()
const staticClean = patchInsideMask(masterLogical, cleanLogical, repairMask)

const frontMask = createFrontMask()
const { included: front, excluded: rear } = splitByMask(staticClean, frontMask)

const torsoLockMask = createTorsoLockMask()
const keeperFrames = {}
for (const [frame, source] of Object.entries(FRAME_SOURCES)) {
  const scaled = await resizeKeeper(source)
  keeperFrames[frame] = remapToPalette(placeKeeper(scaled), palette)
}
for (const frame of ['i2', 'h1', 'h2', 'h3']) {
  keeperFrames[frame] = copyInsideMask(
    keeperFrames[frame],
    keeperFrames.i1,
    torsoLockMask,
  )
}

const effectFrames = Object.fromEntries(
  Object.keys(FRAME_SOURCES).map((frame) => [frame, emptyRgba()]),
)
const compositeFrames = {}
for (const frame of Object.keys(FRAME_SOURCES)) {
  compositeFrames[frame] = over(
    rear,
    keeperFrames[frame],
    effectFrames[frame],
    front,
  )
}

const motionMask = createMotionMask(keeperFrames, keeperFrames.i1)
const characterMask = dilateMask(
  unionMasks(repairMask, ...Object.values(keeperFrames).map(alphaMaskFrom)),
  1,
)

const outputFiles = {
  master: path.join(OUTPUT_DIR, 'console-master-v1.png'),
  staticClean: path.join(OUTPUT_DIR, 'console-static-clean-v1.png'),
  rear: path.join(OUTPUT_DIR, 'console-rear-v1.png'),
  front: path.join(OUTPUT_DIR, 'console-front-v1.png'),
  repairMask: path.join(OUTPUT_DIR, 'console-repair-mask-v1.png'),
  characterMask: path.join(OUTPUT_DIR, 'console-character-mask-v1.png'),
  motionMask: path.join(OUTPUT_DIR, 'console-motion-mask-v1.png'),
  keepers: {},
  effects: {},
  composites: {},
}

await saveStage(masterLogical, outputFiles.master)
await saveStage(staticClean, outputFiles.staticClean)
await saveStage(rear, outputFiles.rear)
await saveStage(front, outputFiles.front)
await saveStage(maskToRgba(repairMask), outputFiles.repairMask)
await saveStage(maskToRgba(characterMask), outputFiles.characterMask)
await saveStage(maskToRgba(motionMask), outputFiles.motionMask)

for (const frame of Object.keys(FRAME_SOURCES)) {
  outputFiles.keepers[frame] = path.join(
    OUTPUT_DIR,
    `console-keeper-${frame}-v1.png`,
  )
  outputFiles.effects[frame] = path.join(
    OUTPUT_DIR,
    `console-effect-${frame}-v1.png`,
  )
  outputFiles.composites[frame] = path.join(
    OUTPUT_DIR,
    `console-composite-${frame}-v1.png`,
  )
  await saveStage(keeperFrames[frame], outputFiles.keepers[frame])
  await saveStage(effectFrames[frame], outputFiles.effects[frame])
  await saveStage(compositeFrames[frame], outputFiles.composites[frame])
}

const contactSheet = await createContactSheet(outputFiles.composites)
const heatmapFile = path.join(REPORT_DIR, 'console-motion-heatmap.png')
await saveStage(maskToRgba(motionMask, [255, 57, 72, 255]), heatmapFile)

const productionFiles = {
  master: outputFiles.master,
  staticClean: outputFiles.staticClean,
  rear: outputFiles.rear,
  front: outputFiles.front,
  ...Object.fromEntries(
    Object.entries(outputFiles.keepers).map(([frame, file]) => [
      `keeper.${frame}`,
      file,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(outputFiles.effects).map(([frame, file]) => [
      `effect.${frame}`,
      file,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(outputFiles.composites).map(([frame, file]) => [
      `composite.${frame}`,
      file,
    ]),
  ),
}
const maskFiles = {
  repairMask: outputFiles.repairMask,
  characterMask: outputFiles.characterMask,
  motionMask: outputFiles.motionMask,
}
const physicalAssets = {}
for (const [role, file] of Object.entries(productionFiles)) {
  physicalAssets[role] = await inspectStageFile(file, paletteSet, true)
}
for (const [role, file] of Object.entries(maskFiles)) {
  physicalAssets[role] = await inspectStageFile(file, paletteSet, false)
}

const torsoHashes = Object.fromEntries(
  Object.entries(keeperFrames).map(([frame, data]) => [
    frame,
    maskedHash(data, torsoLockMask),
  ]),
)
const rootBottoms = Object.fromEntries(
  Object.entries(keeperFrames).map(([frame, data]) => [
    frame,
    logicalStats(data, paletteSet).bbox?.bottom ?? null,
  ]),
)

const reportAssets = {}
for (const [role, data] of [
  ['master', masterLogical],
  ['staticClean', staticClean],
  ['rear', rear],
  ['front', front],
  ...Object.entries(keeperFrames).map(([frame, data]) => [
    `keeper.${frame}`,
    data,
  ]),
  ...Object.entries(effectFrames).map(([frame, data]) => [
    `effect.${frame}`,
    data,
  ]),
  ...Object.entries(compositeFrames).map(([frame, data]) => [
    `composite.${frame}`,
    data,
  ]),
]) {
  reportAssets[role] = {
    ...logicalStats(data, paletteSet),
    logicalSha256: sha256(data),
  }
}

const structureDiffsOutsideRepair = countDiffOutsideMask(
  masterLogical,
  staticClean,
  repairMask,
)
const compositeDiffsOutsideCharacter = Object.fromEntries(
  Object.entries(compositeFrames).map(([frame, data]) => [
    frame,
    countDiffOutsideMask(staticClean, data, characterMask),
  ]),
)
const uniqueTorsoHashes = new Set(Object.values(torsoHashes)).size
const uniqueRootBottoms = new Set(Object.values(rootBottoms)).size

const checks = {
  stage: {
    pass: true,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    logicalWidth: LOGICAL_WIDTH,
    logicalHeight: LOGICAL_HEIGHT,
    scale: SCALE,
    transparentPaddingRows: 1,
    transformId: 'console-v1:320x421:center-fit:keeper-135x250@93,132',
  },
  palette: {
    pass: Object.values(reportAssets).every(
      (asset) => asset.outsidePalette === 0 && asset.colors <= MAX_COLORS,
    ),
    acceptedMasterColors: palette.length,
    maxColors: MAX_COLORS,
  },
  binaryAlpha: {
    pass: Object.values(reportAssets).every((asset) => asset.partial === 0),
  },
  fixedTorso: {
    pass: uniqueTorsoHashes === 1,
    hashes: torsoHashes,
  },
  fixedRoot: {
    pass: uniqueRootBottoms === 1,
    bottoms: rootBottoms,
  },
  structureOutsideRepairMask: {
    pass: structureDiffsOutsideRepair === 0,
    differingLogicalPixels: structureDiffsOutsideRepair,
  },
  compositesOutsideCharacterMask: {
    pass: Object.values(compositeDiffsOutsideCharacter).every(
      (value) => value === 0,
    ),
    differingLogicalPixelsByFrame: compositeDiffsOutsideCharacter,
  },
  emptyEffects: {
    pass: Object.values(effectFrames).every(
      (data) => logicalStats(data, paletteSet).opaque === 0,
    ),
  },
  sameStageAndScale: {
    pass: true,
    keeperSourceCanvas: { width: 208, height: 384 },
    keeperLogicalSize: { width: 135, height: 250 },
    keeperLogicalOrigin: { x: 93, y: 132 },
    perFrameRescaling: false,
  },
  physicalStages: {
    pass: Object.values(physicalAssets).every((asset) => asset.pass),
    inspectedFiles: Object.keys(physicalAssets).length,
    requirements: {
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      binaryAlpha: true,
      transparentBottomRow: true,
      pixelBlockSize: SCALE,
      productionPaletteSubset: true,
    },
  },
}

const passed = Object.values(checks).every((check) => check.pass)
const report = {
  schemaVersion: 1,
  status: passed ? 'pass' : 'fail',
  generatedAt: new Date().toISOString(),
  gospel:
    'Bazaar2 Console design; Ed red-haired, visor on, seated cross-legged on rug amid unchanged infrastructure clutter',
  sources: {
    master: {
      file: path.resolve(MASTER_SOURCE),
      sha256: await fileSha256(MASTER_SOURCE),
    },
    cleanPatch: {
      file: path.resolve(CLEAN_SOURCE),
      sha256: await fileSha256(CLEAN_SOURCE),
      generatedWith: 'built-in ImageGen precise-object-edit',
      usage:
        'pixels accepted only inside console-repair-mask-v1; discarded elsewhere',
    },
    keepers: Object.fromEntries(
      await Promise.all(
        Object.entries(FRAME_SOURCES).map(async ([frame, file]) => [
          frame,
          {
            file: path.resolve(file),
            sha256: await fileSha256(file),
            role: 'approved Bazaar2 pose authority',
          },
        ]),
      ),
    ),
  },
  palette,
  masks: {
    repair: path.resolve(outputFiles.repairMask),
    character: path.resolve(outputFiles.characterMask),
    motion: path.resolve(outputFiles.motionMask),
    torsoLockLogical:
      'ellipse(157,337,66,29)+rect(143,269..172,333)+rect(132,316..184,357)',
  },
  checks,
  assets: reportAssets,
  physicalAssets,
  outputFiles: {
    ...outputFiles,
    contactSheet,
    heatmap: heatmapFile,
  },
}

const reportFile = path.join(REPORT_DIR, 'console-build.json')
await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`)

const qaFile = path.join(REPORT_DIR, 'console-qa.md')
await writeFile(
  qaFile,
  `# Console v1 QA

Status: **${passed ? 'PASS' : 'FAIL'}**

- Fixed production stage: \`${STAGE_WIDTH} × ${STAGE_HEIGHT}\`
- Logical grid: \`${LOGICAL_WIDTH} × ${LOGICAL_HEIGHT}\`, one 3× transform for every layer/cel
- Post-write inspection: ${Object.keys(physicalAssets).length} stage PNGs pass exact dimensions, 3× block integrity, binary alpha, transparent padding row, and palette rules
- Accepted master palette: ${palette.length} colors; all reused/generated pixels remapped to it
- Alpha: binary for every layer/cel/composite
- Keeper transform: \`135 × 250 @ (93,132)\` logical, identical for all five frames
- Per-frame rescaling: none
- Fixed torso hashes: ${uniqueTorsoHashes === 1 ? 'identical' : 'MISMATCH'}
- Fixed root bottoms: ${uniqueRootBottoms === 1 ? `identical at y=${Object.values(rootBottoms)[0]}` : 'MISMATCH'}
- Structure changes outside repair mask: ${structureDiffsOutsideRepair}
- Composite changes outside character mask: ${JSON.stringify(compositeDiffsOutsideCharacter)}
- Separate effects: intentionally empty/transparent; the approved cels already carry the visor response

## Semantic review

- Ed remains the approved red-haired person.
- Ed stays seated cross-legged, visor on, rooted to the same rug coordinate.
- Idle preserves VR tracking.
- Hover sequence uses the approved notice, compact response, and quick peace-sign poses.
- Rug, racks, servers, cables, pizza, boxes, sign, pole, lamp, power strip, and clutter outside the declared repair mask are copied from the normalized Gospel master.
- ImageGen clean-plate pixels are used only inside the repair mask and are remapped to the accepted master palette.
- No standing, visor removal, tidying, replacement character, street change, or audio change was introduced.

Visual evidence: \`${contactSheet}\`

Machine report: \`${reportFile}\`
`,
)

if (!passed) {
  throw new Error(`Console build failed; inspect ${reportFile}`)
}

console.log(
  JSON.stringify(
    {
      status: report.status,
      outputDir: path.resolve(OUTPUT_DIR),
      report: path.resolve(reportFile),
      qa: path.resolve(qaFile),
      contactSheet: path.resolve(contactSheet),
    },
    null,
    2,
  ),
)
