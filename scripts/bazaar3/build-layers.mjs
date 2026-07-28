#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

export const LOGICAL_WIDTH = 320
export const LOGICAL_HEIGHT = 421
export const SCALE = 3
export const OUTPUT_WIDTH = LOGICAL_WIDTH * SCALE
export const OUTPUT_ART_HEIGHT = LOGICAL_HEIGHT * SCALE
export const OUTPUT_HEIGHT = OUTPUT_ART_HEIGHT + 1

const CHANNELS = 4
const MAX_EXAMPLES = 8
const DEFAULT_EDIT_COLOR = '#ffffff'
const DEFAULT_FRONT_COLOR = '#ff0000'

const sha256Buffer = (data) => createHash('sha256').update(data).digest('hex')

const parseColor = (value, label) => {
  if (typeof value !== 'string' || !/^#[a-f0-9]{6}$/i.test(value)) {
    throw new Error(`${label} must use #rrggbb`)
  }
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ]
}

const colorsEqual = (data, offset, color) =>
  data[offset] === color[0] &&
  data[offset + 1] === color[1] &&
  data[offset + 2] === color[2]

const pixelOffset = (x, y, width) => (y * width + x) * CHANNELS

const readRaw = async (file) => {
  const metadata = await sharp(file, {
    failOn: 'error',
    limitInputPixels: false,
  }).metadata()
  const { data, info } = await sharp(file, {
    failOn: 'error',
    limitInputPixels: false,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { file, metadata, data, width: info.width, height: info.height }
}

const inspectBinaryAlpha = (data) => {
  let transparent = 0
  let opaque = 0
  let partial = 0
  const examples = []
  for (let offset = 3; offset < data.length; offset += CHANNELS) {
    const alpha = data[offset]
    if (alpha === 0) transparent += 1
    else if (alpha === 255) opaque += 1
    else {
      partial += 1
      if (examples.length < MAX_EXAMPLES) examples.push((offset - 3) / 4)
    }
  }
  return { transparent, opaque, partial, examples }
}

const assertBinaryAlpha = (image, label) => {
  const alpha = inspectBinaryAlpha(image.data)
  if (alpha.partial > 0) {
    throw new Error(
      `${label} has ${alpha.partial} partially transparent pixels; binary alpha is required`,
    )
  }
  return alpha
}

const inspectCanonicalPaddingRow = (image) => {
  let nonZeroBytes = 0
  const examples = []
  const rowStart = (image.height - 1) * image.width * CHANNELS
  for (let offset = rowStart; offset < image.data.length; offset += 1) {
    if (image.data[offset] !== 0) {
      nonZeroBytes += 1
      if (examples.length < MAX_EXAMPLES) {
        examples.push(offset - rowStart)
      }
    }
  }
  return { nonZeroBytes, examples }
}

const inspectUniformBlocks = (image, artHeight, size = SCALE) => {
  const result = { blocks: 0, mismatchedBlocks: 0, examples: [] }
  for (let y = 0; y < artHeight; y += size) {
    for (let x = 0; x < image.width; x += size) {
      result.blocks += 1
      const base = pixelOffset(x, y, image.width)
      let mismatch = false
      for (let blockY = 0; blockY < size; blockY += 1) {
        for (let blockX = 0; blockX < size; blockX += 1) {
          const offset = pixelOffset(x + blockX, y + blockY, image.width)
          for (let channel = 0; channel < CHANNELS; channel += 1) {
            if (image.data[offset + channel] !== image.data[base + channel]) {
              mismatch = true
            }
          }
        }
      }
      if (mismatch) {
        result.mismatchedBlocks += 1
        if (result.examples.length < MAX_EXAMPLES)
          result.examples.push({ x, y })
      }
    }
  }
  return result
}

const downsampleUniform = (image, artHeight) => {
  const logicalWidth = image.width / SCALE
  const logicalHeight = artHeight / SCALE
  const data = Buffer.alloc(logicalWidth * logicalHeight * CHANNELS)
  let writeOffset = 0
  for (let y = 0; y < artHeight; y += SCALE) {
    for (let x = 0; x < image.width; x += SCALE) {
      const readOffset = pixelOffset(x, y, image.width)
      image.data.copy(data, writeOffset, readOffset, readOffset + CHANNELS)
      writeOffset += CHANNELS
    }
  }
  return { data, width: logicalWidth, height: logicalHeight }
}

const normalizeToLogical = async (file, { label, space, fullCanvas }) => {
  const image = await readRaw(file)
  const sha256 = sha256Buffer(image.data)
  const alpha = assertBinaryAlpha(image, label)
  let resolvedSpace = space

  if (space === 'auto') {
    if (image.width === LOGICAL_WIDTH && image.height === LOGICAL_HEIGHT) {
      resolvedSpace = 'logical'
    } else if (image.width === OUTPUT_WIDTH && image.height === OUTPUT_HEIGHT) {
      resolvedSpace = 'output'
    } else {
      throw new Error(
        `${label} has ambiguous ${image.width}x${image.height} dimensions; set its space explicitly`,
      )
    }
  }

  if (resolvedSpace === 'logical') {
    if (
      fullCanvas &&
      (image.width !== LOGICAL_WIDTH || image.height !== LOGICAL_HEIGHT)
    ) {
      throw new Error(
        `${label} must be ${LOGICAL_WIDTH}x${LOGICAL_HEIGHT} in logical space`,
      )
    }
    return {
      data: image.data,
      width: image.width,
      height: image.height,
      input: {
        file: path.resolve(file),
        sha256,
        width: image.width,
        height: image.height,
        space: 'logical',
        alpha,
      },
    }
  }

  if (resolvedSpace !== 'output') {
    throw new Error(`${label} space must be logical, output, or auto`)
  }

  let artHeight = image.height
  let padding = null
  if ((image.height - 1) % SCALE === 0) {
    padding = inspectCanonicalPaddingRow(image)
    if (padding.nonZeroBytes === 0) artHeight -= 1
    else if (image.height % SCALE !== 0) {
      throw new Error(
        `${label} has a non-canonical final padding row with ${padding.nonZeroBytes} non-zero bytes`,
      )
    }
  }

  if (image.width % SCALE !== 0 || artHeight % SCALE !== 0) {
    throw new Error(
      `${label} output-space dimensions must divide by ${SCALE}, with at most one canonical transparent padding row`,
    )
  }
  if (
    fullCanvas &&
    (image.width !== OUTPUT_WIDTH ||
      image.height !== OUTPUT_HEIGHT ||
      artHeight !== OUTPUT_ART_HEIGHT)
  ) {
    throw new Error(
      `${label} must be ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT} in output space`,
    )
  }

  const blocks = inspectUniformBlocks(image, artHeight)
  if (blocks.mismatchedBlocks > 0) {
    throw new Error(
      `${label} has ${blocks.mismatchedBlocks} non-uniform ${SCALE}x${SCALE} blocks`,
    )
  }
  const logical = downsampleUniform(image, artHeight)
  return {
    ...logical,
    input: {
      file: path.resolve(file),
      sha256,
      width: image.width,
      height: image.height,
      space: 'output',
      alpha,
      padding,
      blocks,
    },
  }
}

const inspectMask = (mask, editColor, frontColor) => {
  const alpha = assertBinaryAlpha(mask, 'mask')
  let editPixels = 0
  let frontPixels = 0
  let invalidPixels = 0
  const invalidExamples = []
  const edit = Buffer.alloc(LOGICAL_WIDTH * LOGICAL_HEIGHT)
  const front = Buffer.alloc(LOGICAL_WIDTH * LOGICAL_HEIGHT)

  for (let index = 0; index < edit.length; index += 1) {
    const offset = index * CHANNELS
    if (mask.data[offset + 3] === 0) continue
    if (colorsEqual(mask.data, offset, editColor)) {
      edit[index] = 1
      editPixels += 1
    } else if (colorsEqual(mask.data, offset, frontColor)) {
      edit[index] = 1
      front[index] = 1
      editPixels += 1
      frontPixels += 1
    } else {
      invalidPixels += 1
      if (invalidExamples.length < MAX_EXAMPLES) {
        invalidExamples.push({
          x: index % LOGICAL_WIDTH,
          y: Math.floor(index / LOGICAL_WIDTH),
          rgba: [
            mask.data[offset],
            mask.data[offset + 1],
            mask.data[offset + 2],
            mask.data[offset + 3],
          ],
        })
      }
    }
  }
  if (invalidPixels > 0) {
    throw new Error(
      `mask has ${invalidPixels} opaque pixels that are neither the edit nor front label color`,
    )
  }
  if (editPixels === 0) throw new Error('mask does not contain any edit pixels')
  return {
    edit,
    front,
    report: { alpha, editPixels, frontPixels, invalidPixels, invalidExamples },
  }
}

const transparentLogicalCanvas = () =>
  Buffer.alloc(LOGICAL_WIDTH * LOGICAL_HEIGHT * CHANNELS)

const alphaBbox = (data, width, height) => {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let pixels = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[pixelOffset(x, y, width) + 3] === 0) continue
      pixels += 1
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (pixels === 0) return null
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    pixels,
  }
}

const scaleBbox = (bbox) =>
  bbox
    ? {
        x: bbox.x * SCALE,
        y: bbox.y * SCALE,
        width: bbox.width * SCALE,
        height: bbox.height * SCALE,
        pixels: bbox.pixels * SCALE * SCALE,
      }
    : null

const bboxesEqual = (left, right) =>
  left !== null &&
  right !== null &&
  left.x === right.x &&
  left.y === right.y &&
  left.width === right.width &&
  left.height === right.height

const resolvePlacement = (placement = {}) => {
  const hasAt = placement.at !== undefined
  const hasTargetAnchor = placement.anchor !== undefined
  const hasSourceAnchor = placement.sourceAnchor !== undefined
  if (hasAt && (hasTargetAnchor || hasSourceAnchor)) {
    throw new Error('placement cannot combine at with anchor/sourceAnchor')
  }
  if (hasTargetAnchor !== hasSourceAnchor) {
    throw new Error(
      'placement anchor and sourceAnchor must be supplied together',
    )
  }
  if (hasAt) return { x: placement.at.x, y: placement.at.y, mode: 'top-left' }
  if (hasTargetAnchor) {
    return {
      x: placement.anchor.x - placement.sourceAnchor.x,
      y: placement.anchor.y - placement.sourceAnchor.y,
      mode: 'anchor',
    }
  }
  return { x: 0, y: 0, mode: 'canvas' }
}

const placeIsolated = ({
  source,
  destination,
  mask,
  label,
  placement,
  expectedBbox,
  allowOutsideMaskClipping,
}) => {
  const origin = resolvePlacement(placement)
  const sourceBbox = alphaBbox(source.data, source.width, source.height)
  let outsideCanvasPixels = 0
  let outsideMaskPixels = 0
  let placedPixels = 0
  const outsideExamples = []

  for (let sourceY = 0; sourceY < source.height; sourceY += 1) {
    for (let sourceX = 0; sourceX < source.width; sourceX += 1) {
      const sourceOffset = pixelOffset(sourceX, sourceY, source.width)
      if (source.data[sourceOffset + 3] === 0) continue
      const x = origin.x + sourceX
      const y = origin.y + sourceY
      if (x < 0 || y < 0 || x >= LOGICAL_WIDTH || y >= LOGICAL_HEIGHT) {
        outsideCanvasPixels += 1
        if (outsideExamples.length < MAX_EXAMPLES) {
          outsideExamples.push({ sourceX, sourceY, x, y, reason: 'canvas' })
        }
        continue
      }
      const index = y * LOGICAL_WIDTH + x
      if (mask[index] === 0) {
        outsideMaskPixels += 1
        if (outsideExamples.length < MAX_EXAMPLES) {
          outsideExamples.push({ sourceX, sourceY, x, y, reason: 'mask' })
        }
        continue
      }
      source.data.copy(
        destination,
        index * CHANNELS,
        sourceOffset,
        sourceOffset + CHANNELS,
      )
      placedPixels += 1
    }
  }

  const bbox = alphaBbox(destination, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  const bboxMatches =
    expectedBbox === undefined ? null : bboxesEqual(bbox, expectedBbox)
  const errors = []
  if (
    !allowOutsideMaskClipping &&
    (outsideCanvasPixels > 0 || outsideMaskPixels > 0)
  ) {
    errors.push({
      code: 'ISOLATED_INPUT_OUTSIDE_MASK',
      message: `${label} has ${outsideCanvasPixels} opaque pixels outside the canvas and ${outsideMaskPixels} outside the edit mask`,
      examples: outsideExamples,
    })
  }
  if (expectedBbox !== undefined && !bboxMatches) {
    errors.push({
      code: 'BBOX_MISMATCH',
      message: `${label} placed bbox does not match the exact expected bbox`,
      expected: expectedBbox,
      actual: bbox,
    })
  }

  return {
    report: {
      label,
      source: source.input,
      sourceBbox,
      placement: {
        mode: origin.mode,
        topLeft: { x: origin.x, y: origin.y },
        anchor: placement?.anchor ?? null,
        sourceAnchor: placement?.sourceAnchor ?? null,
      },
      expectedBbox: expectedBbox ?? null,
      bbox,
      outputBbox: scaleBbox(bbox),
      bboxMatches,
      placedPixels,
      outsideCanvasPixels,
      outsideMaskPixels,
      clipped:
        allowOutsideMaskClipping && outsideCanvasPixels + outsideMaskPixels > 0,
    },
    errors,
  }
}

const overlayBinary = (base, overlay) => {
  for (let offset = 0; offset < base.length; offset += CHANNELS) {
    if (overlay[offset + 3] === 255) {
      overlay.copy(base, offset, offset, offset + CHANNELS)
    }
  }
}

const inspectOutsideMask = (actual, master, editMask) => {
  let changedPixels = 0
  const examples = []
  for (let index = 0; index < editMask.length; index += 1) {
    if (editMask[index] !== 0) continue
    const offset = index * CHANNELS
    let changed = false
    for (let channel = 0; channel < CHANNELS; channel += 1) {
      if (actual[offset + channel] !== master[offset + channel]) changed = true
    }
    if (!changed) continue
    changedPixels += 1
    if (examples.length < MAX_EXAMPLES) {
      examples.push({
        x: index % LOGICAL_WIDTH,
        y: Math.floor(index / LOGICAL_WIDTH),
      })
    }
  }
  return { changedPixels, examples }
}

const writeOutput = async (logical, file) => {
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

const inspectWrittenOutput = async (file, masterOutput, editMask) => {
  const image = await readRaw(file)
  const alpha = inspectBinaryAlpha(image.data)
  const padding = inspectCanonicalPaddingRow(image)
  const blocks = inspectUniformBlocks(image, OUTPUT_ART_HEIGHT)
  let outsideMaskChanges = null

  if (masterOutput) {
    let changedPixels = 0
    const examples = []
    for (let y = 0; y < OUTPUT_HEIGHT; y += 1) {
      for (let x = 0; x < OUTPUT_WIDTH; x += 1) {
        const isMasked =
          y < OUTPUT_ART_HEIGHT &&
          editMask[
            Math.floor(y / SCALE) * LOGICAL_WIDTH + Math.floor(x / SCALE)
          ] !== 0
        if (isMasked) continue
        const offset = pixelOffset(x, y, OUTPUT_WIDTH)
        let changed = false
        for (let channel = 0; channel < CHANNELS; channel += 1) {
          if (
            image.data[offset + channel] !== masterOutput.data[offset + channel]
          ) {
            changed = true
          }
        }
        if (!changed) continue
        changedPixels += 1
        if (examples.length < MAX_EXAMPLES) examples.push({ x, y })
      }
    }
    outsideMaskChanges = { changedPixels, examples }
  }

  return {
    file: path.resolve(file),
    sha256: sha256Buffer(image.data),
    width: image.width,
    height: image.height,
    bbox: alphaBbox(image.data, image.width, image.height),
    alpha,
    padding,
    blocks,
    outsideMaskChanges,
  }
}

const normalizeIsolated = async (definition, label) => {
  if (!definition?.file) return null
  return normalizeToLogical(definition.file, {
    label,
    space: definition.space ?? 'logical',
    fullCanvas: false,
  })
}

const writeJsonReport = async (report, reportPath) => {
  await mkdir(path.dirname(reportPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
}

export const buildLayers = async (options) => {
  const startedAt = new Date().toISOString()
  const outputDir = path.resolve(options.outputDir)
  const reportPath = path.resolve(
    options.reportPath ?? path.join(outputDir, 'layer-build-report.json'),
  )
  const report = {
    version: 1,
    startedAt,
    finishedAt: null,
    status: 'fail',
    logicalCanvas: { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT },
    outputCanvas: {
      width: OUTPUT_WIDTH,
      artHeight: OUTPUT_ART_HEIGHT,
      height: OUTPUT_HEIGHT,
      scale: SCALE,
      paddingRows: 1,
    },
    inputs: {},
    mask: null,
    placements: {},
    preservation: null,
    outputs: {},
    errors: [],
  }

  try {
    const editColor = parseColor(
      options.editColor ?? DEFAULT_EDIT_COLOR,
      'editColor',
    )
    const frontColor = parseColor(
      options.frontColor ?? DEFAULT_FRONT_COLOR,
      'frontColor',
    )
    if (editColor.every((value, index) => value === frontColor[index])) {
      throw new Error('editColor and frontColor must differ')
    }
    if (!options.masterPath) throw new Error('masterPath is required')
    if (!options.backgroundPath) throw new Error('backgroundPath is required')
    if (!options.maskPath) throw new Error('maskPath is required')

    const masterOutput = await readRaw(options.masterPath)
    if (
      masterOutput.width !== OUTPUT_WIDTH ||
      masterOutput.height !== OUTPUT_HEIGHT
    ) {
      throw new Error(`master must be exactly ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}`)
    }
    const master = await normalizeToLogical(options.masterPath, {
      label: 'master',
      space: 'output',
      fullCanvas: true,
    })
    report.inputs.master = master.input
    if (
      options.expectMasterSha256 &&
      master.input.sha256 !== options.expectMasterSha256.toLowerCase()
    ) {
      report.errors.push({
        code: 'MASTER_HASH_MISMATCH',
        message: `master RGBA hash ${master.input.sha256} does not match expected ${options.expectMasterSha256}`,
      })
    }

    const background = await normalizeToLogical(options.backgroundPath, {
      label: 'background',
      space: options.backgroundSpace ?? 'auto',
      fullCanvas: true,
    })
    report.inputs.background = background.input

    const maskImage = await readRaw(options.maskPath)
    if (
      maskImage.width !== LOGICAL_WIDTH ||
      maskImage.height !== LOGICAL_HEIGHT
    ) {
      throw new Error(
        `mask must be exactly ${LOGICAL_WIDTH}x${LOGICAL_HEIGHT} logical pixels`,
      )
    }
    const maskHash = sha256Buffer(maskImage.data)
    const mask = inspectMask(maskImage, editColor, frontColor)
    report.inputs.mask = {
      file: path.resolve(options.maskPath),
      sha256: maskHash,
      width: maskImage.width,
      height: maskImage.height,
      space: 'logical',
    }
    report.mask = {
      ...mask.report,
      editColor: options.editColor ?? DEFAULT_EDIT_COLOR,
      frontColor: options.frontColor ?? DEFAULT_FRONT_COLOR,
    }

    const rear = Buffer.from(master.data)
    const front = transparentLogicalCanvas()
    for (let index = 0; index < mask.edit.length; index += 1) {
      if (mask.edit[index] === 0) continue
      const offset = index * CHANNELS
      background.data.copy(rear, offset, offset, offset + CHANNELS)
      if (mask.front[index] !== 0) {
        master.data.copy(front, offset, offset, offset + CHANNELS)
      }
    }

    const keeper = transparentLogicalCanvas()
    const effect = transparentLogicalCanvas()
    const allowOutsideMaskClipping = options.allowOutsideMaskClipping ?? false

    const keeperInput = await normalizeIsolated(options.keeper, 'keeper')
    if (keeperInput) {
      const placement = placeIsolated({
        source: keeperInput,
        destination: keeper,
        mask: mask.edit,
        label: 'keeper',
        placement: options.keeper.placement,
        expectedBbox: options.keeper.expectedBbox,
        allowOutsideMaskClipping,
      })
      report.inputs.keeper = keeperInput.input
      report.placements.keeper = placement.report
      report.errors.push(...placement.errors)
    }

    const effectInput = await normalizeIsolated(options.effect, 'effect')
    if (effectInput) {
      const placement = placeIsolated({
        source: effectInput,
        destination: effect,
        mask: mask.edit,
        label: 'effect',
        placement: options.effect.placement,
        expectedBbox: options.effect.expectedBbox,
        allowOutsideMaskClipping,
      })
      report.inputs.effect = effectInput.input
      report.placements.effect = placement.report
      report.errors.push(...placement.errors)
    }

    const composite = Buffer.from(rear)
    overlayBinary(composite, keeper)
    overlayBinary(composite, effect)
    overlayBinary(composite, front)

    const rearPreservation = inspectOutsideMask(rear, master.data, mask.edit)
    const compositePreservation = inspectOutsideMask(
      composite,
      master.data,
      mask.edit,
    )
    report.preservation = {
      definition:
        'RGBA pixel bytes outside the logical edit mask must equal the accepted master exactly.',
      rear: rearPreservation,
      composite: compositePreservation,
    }
    if (
      rearPreservation.changedPixels > 0 ||
      compositePreservation.changedPixels > 0
    ) {
      report.errors.push({
        code: 'MASTER_OUTSIDE_MASK_CHANGED',
        message:
          'rear or composite changed master pixels outside the edit mask',
      })
    }

    for (const [label, data] of [
      ['rear', rear],
      ['keeper', keeper],
      ['front', front],
      ['effect', effect],
      ['composite', composite],
    ]) {
      const alpha = inspectBinaryAlpha(data)
      if (alpha.partial > 0) {
        report.errors.push({
          code: 'OUTPUT_PARTIAL_ALPHA',
          message: `${label} has ${alpha.partial} partial-alpha logical pixels`,
        })
      }
    }

    await mkdir(outputDir, { recursive: true })
    const outputDefinitions = [
      ['rear', rear, true],
      ['keeper', keeper, false],
      ['front', front, false],
      ['composite', composite, true],
    ]
    if (effectInput) outputDefinitions.splice(2, 0, ['effect', effect, false])

    for (const [label, data, compareMaster] of outputDefinitions) {
      const file = path.join(outputDir, `${label}.png`)
      await writeOutput(data, file)
      report.outputs[label] = await inspectWrittenOutput(
        file,
        compareMaster ? masterOutput : null,
        mask.edit,
      )
      const output = report.outputs[label]
      if (
        output.width !== OUTPUT_WIDTH ||
        output.height !== OUTPUT_HEIGHT ||
        output.alpha.partial > 0 ||
        output.padding.nonZeroBytes > 0 ||
        output.blocks.mismatchedBlocks > 0
      ) {
        report.errors.push({
          code: 'OUTPUT_INVARIANT',
          message: `${label} failed dimensions, alpha, padding, or nearest-neighbor block verification`,
        })
      }
      if (compareMaster && output.outsideMaskChanges?.changedPixels > 0) {
        report.errors.push({
          code: 'OUTPUT_MASTER_PRESERVATION',
          message: `${label} changed ${output.outsideMaskChanges.changedPixels} output pixels outside the mask`,
        })
      }
    }
  } catch (error) {
    report.errors.push({
      code: 'LAYER_BUILD',
      message: error instanceof Error ? error.message : String(error),
    })
  }

  report.status = report.errors.length === 0 ? 'pass' : 'fail'
  report.finishedAt = new Date().toISOString()
  report.reportPath = reportPath
  await writeJsonReport(report, reportPath)
  return report
}

const parseTuple = (value, count, label) => {
  const values = value?.split(',').map((part) => Number.parseInt(part, 10))
  if (
    values?.length !== count ||
    values.some((entry) => !Number.isInteger(entry))
  ) {
    throw new Error(`${label} must contain ${count} comma-separated integers`)
  }
  return values
}

const parsePoint = (value, label) => {
  const [x, y] = parseTuple(value, 2, label)
  return { x, y }
}

const parseBbox = (value, label) => {
  const [x, y, width, height] = parseTuple(value, 4, label)
  return { x, y, width, height }
}

const ensureDefinition = (options, key) => {
  options[key] ??= { placement: {} }
  options[key].placement ??= {}
  return options[key]
}

const parseArguments = (values) => {
  const options = {}
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    const next = () => {
      const result = values[++index]
      if (result === undefined) throw new Error(`${value} requires a value`)
      return result
    }
    if (value === '--master') options.masterPath = next()
    else if (value === '--background') options.backgroundPath = next()
    else if (value === '--background-space') options.backgroundSpace = next()
    else if (value === '--mask') options.maskPath = next()
    else if (value === '--out-dir') options.outputDir = next()
    else if (value === '--report') options.reportPath = next()
    else if (value === '--edit-color') options.editColor = next()
    else if (value === '--front-color') options.frontColor = next()
    else if (value === '--expect-master-sha256')
      options.expectMasterSha256 = next()
    else if (value === '--allow-outside-mask-clipping')
      options.allowOutsideMaskClipping = true
    else if (value === '--keeper')
      ensureDefinition(options, 'keeper').file = next()
    else if (value === '--keeper-space')
      ensureDefinition(options, 'keeper').space = next()
    else if (value === '--keeper-at')
      ensureDefinition(options, 'keeper').placement.at = parsePoint(
        next(),
        value,
      )
    else if (value === '--keeper-anchor')
      ensureDefinition(options, 'keeper').placement.anchor = parsePoint(
        next(),
        value,
      )
    else if (value === '--keeper-source-anchor')
      ensureDefinition(options, 'keeper').placement.sourceAnchor = parsePoint(
        next(),
        value,
      )
    else if (value === '--expect-keeper-bbox')
      ensureDefinition(options, 'keeper').expectedBbox = parseBbox(
        next(),
        value,
      )
    else if (value === '--effect')
      ensureDefinition(options, 'effect').file = next()
    else if (value === '--effect-space')
      ensureDefinition(options, 'effect').space = next()
    else if (value === '--effect-at')
      ensureDefinition(options, 'effect').placement.at = parsePoint(
        next(),
        value,
      )
    else if (value === '--effect-anchor')
      ensureDefinition(options, 'effect').placement.anchor = parsePoint(
        next(),
        value,
      )
    else if (value === '--effect-source-anchor')
      ensureDefinition(options, 'effect').placement.sourceAnchor = parsePoint(
        next(),
        value,
      )
    else if (value === '--expect-effect-bbox')
      ensureDefinition(options, 'effect').expectedBbox = parseBbox(
        next(),
        value,
      )
    else if (value === '--help') options.help = true
    else throw new Error(`Unknown argument: ${value}`)
  }
  return options
}

const help = `Bazaar3 deterministic logical-layer builder

Required:
  --master <png>                 Accepted 960x1264 composite.
  --background <png>             Robot-free replacement (320x421 or 960x1264).
  --mask <png>                   Logical 320x421 label mask.
  --out-dir <directory>          Writes rear/keeper/front/composite PNGs.

Mask:
  transparent                    Master is byte-locked here.
  --edit-color <#rrggbb>         Rear replacement label; default #ffffff.
  --front-color <#rrggbb>        Rear replacement + master-to-front label; default #ff0000.

Isolated keeper/effect inputs:
  --keeper <png> | --effect <png>
  --keeper-space logical|output  Default logical. Effect has the same flag.
  --keeper-at x,y                Exact logical top-left placement.
  --keeper-anchor x,y            Exact target anchor; requires source anchor.
  --keeper-source-anchor x,y     Anchor inside the isolated input.
  --expect-keeper-bbox x,y,w,h   Hard exact placed-alpha bbox assertion.
  (Replace keeper with effect for the equivalent effect flags.)

Other:
  --background-space auto|logical|output
  --expect-master-sha256 <hash>  Lock the accepted master RGBA buffer.
  --allow-outside-mask-clipping  Explicitly permit and report clipped isolated pixels.
  --report <json>                Default <out-dir>/layer-build-report.json.
  --help
`

const runCli = async () => {
  let options
  try {
    options = parseArguments(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    console.error(help)
    process.exitCode = 2
    return
  }
  if (options.help) {
    console.log(help)
    return
  }
  if (!options.outputDir) {
    console.error('--out-dir is required')
    console.error(help)
    process.exitCode = 2
    return
  }
  const report = await buildLayers(options)
  const summary =
    `${report.status.toUpperCase()}: ${Object.keys(report.outputs).length} outputs, ` +
    `${report.errors.length} errors; report ${report.reportPath}`
  if (report.status === 'pass') console.log(summary)
  else console.error(summary)
  process.exitCode = report.status === 'pass' ? 0 : 1
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) await runCli()
