import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)

const TARGET = Object.freeze({ width: 960, height: 1264 })
const LOGICAL = Object.freeze({ width: 320, height: 421 })
const PIXEL_SCALE = 3
const SCALED_HEIGHT = LOGICAL.height * PIXEL_SCALE
const FINAL_ROW_COUNT = TARGET.height - SCALED_HEIGHT
const TARGET_ASPECT = TARGET.width / TARGET.height
const DEFAULT_PALETTE_BUDGET = 24
const MAXIMUM_SOURCE_ASPECT_ERROR = 0.025
const MAXIMUM_CROP_LOSS = 0.03

const parseArguments = () => {
  const args = process.argv.slice(2)
  const positional = args.filter(
    (argument, index) =>
      !argument.startsWith('--') &&
      (index === 0 || !args[index - 1]?.startsWith('--')),
  )
  const candidate = positional[0]
  const outIndex = args.indexOf('--out-dir')
  const colorsIndex = args.indexOf('--colors')
  const outDir = outIndex >= 0 ? args[outIndex + 1] : undefined
  const colors =
    colorsIndex >= 0
      ? Number.parseInt(args[colorsIndex + 1], 10)
      : DEFAULT_PALETTE_BUDGET
  const noFail = args.includes('--no-fail')

  if (!candidate || !Number.isInteger(colors) || colors < 8 || colors > 64) {
    console.error(
      'Usage: node scripts/bazaar3/manual-camera/normalize-delivery.mjs <candidate.png> [--out-dir <path>] [--colors 8..64] [--no-fail]',
    )
    process.exit(2)
  }

  return {
    candidate: path.resolve(candidate),
    outDir: outDir ? path.resolve(outDir) : undefined,
    colors,
    noFail,
  }
}

const sha256 = async (filePath) =>
  createHash('sha256')
    .update(await readFile(filePath))
    .digest('hex')

const toFixed = (value, digits = 4) => Number(value.toFixed(digits))

const samePixel = (data, channels, firstOffset, secondOffset) => {
  for (let channel = 0; channel < channels; channel += 1) {
    if (data[firstOffset + channel] !== data[secondOffset + channel]) {
      return false
    }
  }
  return true
}

const rgbaKey = (data, offset, channels) => {
  const red = data[offset]
  const green = data[offset + 1] ?? red
  const blue = data[offset + 2] ?? red
  const alpha = channels >= 4 ? data[offset + 3] : 255
  return `${red},${green},${blue},${alpha}`
}

const lumaAt = (data, offset) =>
  (77 * data[offset] + 150 * data[offset + 1] + 29 * data[offset + 2]) >> 8

const inspectRaster = async (input) => {
  const raw = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { data, info } = raw
  const { width, height, channels } = info
  const colors = new Set()

  let identicalAdjacencies = 0
  let adjacencyCount = 0
  let boundaryCount = 0
  let strongBoundaryCount = 0
  let veryStrongBoundaryCount = 0
  let darkOutlineBoundaryCount = 0
  let boundaryContrastSum = 0
  let isolatedPixels = 0
  let opaquePixels = 0
  let transparentPixels = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels
      colors.add(rgbaKey(data, offset, channels))
      if (data[offset + 3] === 0) transparentPixels += 1
      else opaquePixels += 1

      let matchingNeighbors = 0
      const neighbors = []
      if (x > 0) neighbors.push(offset - channels)
      if (x < width - 1) neighbors.push(offset + channels)
      if (y > 0) neighbors.push(offset - width * channels)
      if (y < height - 1) neighbors.push(offset + width * channels)
      for (const neighborOffset of neighbors) {
        if (samePixel(data, channels, offset, neighborOffset)) {
          matchingNeighbors += 1
        }
      }
      if (neighbors.length === 4 && matchingNeighbors === 0) isolatedPixels += 1

      const comparisons = []
      if (x < width - 1) comparisons.push(offset + channels)
      if (y < height - 1) comparisons.push(offset + width * channels)
      for (const neighborOffset of comparisons) {
        adjacencyCount += 1
        if (samePixel(data, channels, offset, neighborOffset)) {
          identicalAdjacencies += 1
          continue
        }

        boundaryCount += 1
        const firstLuma = lumaAt(data, offset)
        const secondLuma = lumaAt(data, neighborOffset)
        const contrast = Math.abs(firstLuma - secondLuma)
        boundaryContrastSum += contrast
        if (contrast >= 40) strongBoundaryCount += 1
        if (contrast >= 72) veryStrongBoundaryCount += 1
        if (
          contrast >= 32 &&
          Math.min(firstLuma, secondLuma) <= 52 &&
          Math.max(firstLuma, secondLuma) >= 76
        ) {
          darkOutlineBoundaryCount += 1
        }
      }
    }
  }

  return {
    width,
    height,
    channels,
    pixelCount: width * height,
    uniqueColors: colors.size,
    opaquePixels,
    transparentPixels,
    flatAdjacencyShare: toFixed(
      identicalAdjacencies / Math.max(1, adjacencyCount),
      6,
    ),
    boundaryShare: toFixed(boundaryCount / Math.max(1, adjacencyCount), 6),
    meanBoundaryContrast: toFixed(
      boundaryContrastSum / Math.max(1, boundaryCount),
      3,
    ),
    strongEdgeShare: toFixed(
      strongBoundaryCount / Math.max(1, boundaryCount),
      6,
    ),
    veryStrongEdgeShare: toFixed(
      veryStrongBoundaryCount / Math.max(1, boundaryCount),
      6,
    ),
    darkOutlineEdgeShare: toFixed(
      darkOutlineBoundaryCount / Math.max(1, boundaryCount),
      6,
    ),
    isolatedPixelShare: toFixed(
      isolatedPixels / Math.max(1, (width - 2) * (height - 2)),
      6,
    ),
  }
}

const inspectGrid = async (input) => {
  const raw = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { data, info } = raw
  const { width, height, channels } = info

  let uniformBlocks = 0
  let nonUniformPixels = 0
  const totalBlocks = LOGICAL.width * LOGICAL.height

  for (let logicalY = 0; logicalY < LOGICAL.height; logicalY += 1) {
    for (let logicalX = 0; logicalX < LOGICAL.width; logicalX += 1) {
      const baseX = logicalX * PIXEL_SCALE
      const baseY = logicalY * PIXEL_SCALE
      const baseOffset = (baseY * width + baseX) * channels
      let uniform = true

      for (let deltaY = 0; deltaY < PIXEL_SCALE; deltaY += 1) {
        for (let deltaX = 0; deltaX < PIXEL_SCALE; deltaX += 1) {
          const offset = ((baseY + deltaY) * width + baseX + deltaX) * channels
          if (!samePixel(data, channels, baseOffset, offset)) {
            uniform = false
            nonUniformPixels += 1
          }
        }
      }
      if (uniform) uniformBlocks += 1
    }
  }

  let matchingFinalRowPixels = 0
  for (let x = 0; x < width; x += 1) {
    const finalOffset = ((height - 1) * width + x) * channels
    const sourceOffset = ((height - 2) * width + x) * channels
    if (samePixel(data, channels, finalOffset, sourceOffset)) {
      matchingFinalRowPixels += 1
    }
  }

  return {
    authoredLogicalCanvas: LOGICAL,
    pixelScale: PIXEL_SCALE,
    scaledCore: { width: TARGET.width, height: SCALED_HEIGHT },
    explicitFinalRows: FINAL_ROW_COUNT,
    totalBlocks,
    uniformBlocks,
    blockUniformity: toFixed(uniformBlocks / totalBlocks, 8),
    nonUniformPixels,
    finalRowPolicy: 'duplicate row 1262 into row 1263',
    finalRowMatchingPixels: matchingFinalRowPixels,
    finalRowMatch: toFixed(matchingFinalRowPixels / width, 8),
  }
}

const makeCenterCrop = (width, height) => {
  const sourceAspect = width / height
  if (sourceAspect > TARGET_ASPECT) {
    const cropWidth = Math.round(height * TARGET_ASPECT)
    return {
      left: Math.floor((width - cropWidth) / 2),
      top: 0,
      width: cropWidth,
      height,
    }
  }

  const cropHeight = Math.round(width / TARGET_ASPECT)
  return {
    left: 0,
    top: Math.floor((height - cropHeight) / 2),
    width,
    height: cropHeight,
  }
}

const hardCheck = (id, passed, measured, expected, note) => ({
  id,
  status: passed ? 'pass' : 'fail',
  measured,
  expected,
  note,
})

const buildComparison = async ({
  orientedBuffer,
  crop,
  normalizedPath,
  comparisonPath,
}) => {
  const left = await sharp(orientedBuffer)
    .extract(crop)
    .resize(480, 632, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer()
  const right = await sharp(normalizedPath)
    .resize(480, 632, { fit: 'fill', kernel: sharp.kernel.nearest })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: 972,
      height: 632,
      channels: 4,
      background: '#080b0f',
    },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: 492, top: 0 },
    ])
    .png()
    .toFile(comparisonPath)
}

const main = async () => {
  const { candidate, outDir, colors, noFail } = parseArguments()
  const basename = path.basename(candidate, path.extname(candidate))
  const outputDir =
    outDir ??
    path.join(
      process.cwd(),
      'scripts/bazaar3/manual-camera/reports',
      basename,
      'delivery',
    )
  await mkdir(outputDir, { recursive: true })

  const sourceHashBefore = await sha256(candidate)
  const logicalPrequantPath = path.join(
    outputDir,
    'delivery-logical-prequant-320x421.png',
  )
  const logicalQuantizedPath = path.join(
    outputDir,
    'delivery-logical-320x421.png',
  )
  const normalizedPath = path.join(outputDir, 'manual-delivery-960x1264.png')
  const comparisonPath = path.join(outputDir, 'delivery-comparison.png')
  const cameraOutputDir = path.join(outputDir, 'camera')
  const plannedOutputs = [
    logicalPrequantPath,
    logicalQuantizedPath,
    normalizedPath,
    comparisonPath,
  ]
  if (
    plannedOutputs.some(
      (outputPath) => path.resolve(outputPath) === path.resolve(candidate),
    )
  ) {
    throw new Error('Refusing to overwrite the source candidate')
  }

  const orientedBuffer = await sharp(candidate).rotate().png().toBuffer()
  const sourceMetadata = await sharp(orientedBuffer).metadata()
  if (!sourceMetadata.width || !sourceMetadata.height) {
    throw new Error(`Unable to read source dimensions: ${candidate}`)
  }

  const sourceAspect = sourceMetadata.width / sourceMetadata.height
  const sourceAspectError =
    Math.abs(sourceAspect - TARGET_ASPECT) / TARGET_ASPECT
  if (sourceAspectError > MAXIMUM_SOURCE_ASPECT_ERROR) {
    throw new Error(
      `Source aspect differs by ${toFixed(sourceAspectError * 100, 2)}%; maximum safe normalization is ${MAXIMUM_SOURCE_ASPECT_ERROR * 100}%`,
    )
  }

  const crop = makeCenterCrop(sourceMetadata.width, sourceMetadata.height)
  const cropLoss =
    1 -
    (crop.width * crop.height) / (sourceMetadata.width * sourceMetadata.height)
  if (cropLoss > MAXIMUM_CROP_LOSS) {
    throw new Error(
      `Center crop would discard ${toFixed(cropLoss * 100, 2)}%; maximum is ${MAXIMUM_CROP_LOSS * 100}%`,
    )
  }

  const logicalPrequantBuffer = await sharp(orientedBuffer)
    .extract(crop)
    .resize(LOGICAL.width, LOGICAL.height, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer()
  await writeFile(logicalPrequantPath, logicalPrequantBuffer)

  await sharp(logicalPrequantBuffer)
    .png({
      palette: true,
      colours: colors,
      dither: 0,
      effort: 10,
      compressionLevel: 9,
    })
    .toFile(logicalQuantizedPath)

  const scaledCore = await sharp(logicalQuantizedPath)
    .resize(TARGET.width, SCALED_HEIGHT, {
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png({ compressionLevel: 9 })
    .toBuffer()

  await sharp(scaledCore)
    .extend({
      top: 0,
      bottom: FINAL_ROW_COUNT,
      left: 0,
      right: 0,
      extendWith: 'copy',
    })
    .png({ compressionLevel: 9 })
    .toFile(normalizedPath)

  const cameraVerifier = path.join(
    process.cwd(),
    'scripts/bazaar3/manual-camera/verify-camera.mjs',
  )
  const cameraExecution = await execFileAsync(
    process.execPath,
    [cameraVerifier, normalizedPath, '--out-dir', cameraOutputDir, '--no-fail'],
    { cwd: process.cwd() },
  )
  const cameraReport = JSON.parse(
    await readFile(path.join(cameraOutputDir, 'camera-audit.json'), 'utf8'),
  )

  const sourceLogicalMetrics = await inspectRaster(logicalPrequantPath)
  const logicalMetrics = await inspectRaster(logicalQuantizedPath)
  const deliveryMetrics = await inspectRaster(normalizedPath)
  const gridMetrics = await inspectGrid(normalizedPath)
  const normalizedMetadata = await sharp(normalizedPath).metadata()

  await buildComparison({
    orientedBuffer,
    crop,
    normalizedPath,
    comparisonPath,
  })

  const sourceHashAfter = await sha256(candidate)
  const hardChecks = [
    hardCheck(
      'source-untouched',
      sourceHashBefore === sourceHashAfter,
      sourceHashAfter,
      sourceHashBefore,
      'The normalizer writes only derived files under its report directory.',
    ),
    hardCheck(
      'source-aspect-safe',
      sourceAspectError <= MAXIMUM_SOURCE_ASPECT_ERROR,
      `${toFixed(sourceAspectError * 100, 3)}% relative error`,
      `≤ ${MAXIMUM_SOURCE_ASPECT_ERROR * 100}%`,
      'Normalizer refuses larger aspect differences instead of stretching the artwork.',
    ),
    hardCheck(
      'center-crop-safe',
      cropLoss <= MAXIMUM_CROP_LOSS,
      `${toFixed(cropLoss * 100, 3)}% of source area`,
      `≤ ${MAXIMUM_CROP_LOSS * 100}%`,
      'Aspect is preserved with a centered cover crop before low-resolution authoring.',
    ),
    hardCheck(
      'delivery-dimensions',
      normalizedMetadata.width === TARGET.width &&
        normalizedMetadata.height === TARGET.height,
      `${normalizedMetadata.width}×${normalizedMetadata.height}`,
      `${TARGET.width}×${TARGET.height}`,
      'Exact production canvas.',
    ),
    hardCheck(
      'camera',
      cameraReport.statuses.camera === 'pass',
      cameraReport.statuses.camera,
      'pass',
      'The normalized derivative must preserve the front/parallel camera gate.',
    ),
    hardCheck(
      'palette-budget',
      logicalMetrics.uniqueColors <= colors,
      `${logicalMetrics.uniqueColors} RGBA colors`,
      `≤ ${colors}`,
      'Palette quantization is deterministic and configured with dither=0.',
    ),
    hardCheck(
      'authored-grid',
      gridMetrics.blockUniformity === 1,
      `${toFixed(gridMetrics.blockUniformity * 100, 4)}% uniform 3×3 blocks`,
      '100%',
      'Rows 0–1262 must be an exact nearest-neighbor 3× enlargement of 320×421.',
    ),
    hardCheck(
      'explicit-final-row',
      FINAL_ROW_COUNT === 1 && gridMetrics.finalRowMatch === 1,
      `${FINAL_ROW_COUNT} row; ${toFixed(gridMetrics.finalRowMatch * 100, 4)}% copied`,
      '1 duplicated row; 100% match',
      'The 320×421 ×3 core is 960×1263; row 1263 explicitly duplicates row 1262.',
    ),
  ]
  const hardStatus = hardChecks.some((check) => check.status === 'fail')
    ? 'fail'
    : 'pass'

  const visualReview = [
    {
      id: 'identity',
      status: 'required',
      prompt:
        'Does the robot retain the approved friendly service identity, exactly three eye stalks, and exactly three connected arms?',
    },
    {
      id: 'spatial-story',
      status: 'required',
      prompt:
        'Is the robot visibly floating in the rear aisle behind the counter—not attached to, standing on, or emerging from it?',
    },
    {
      id: 'occlusion',
      status: 'required',
      prompt:
        'Does the counter clearly pass in front of the robot’s lower assembly while arms may extend deliberately across it?',
    },
    {
      id: 'style',
      status: 'required',
      prompt:
        'Do the flattened palette and chunky blocks now read like Uses/Games rather than a posterized high-detail AI illustration?',
    },
    {
      id: 'outlines',
      status: 'required',
      prompt:
        'Are silhouettes and material boundaries intentionally outlined, with quiet flat interiors rather than noisy contour bands?',
    },
    {
      id: 'lighting',
      status: 'required',
      prompt:
        'Do amber work light and restrained cool screen light integrate robot, stall, wall, counter, and floor without smooth glow gradients?',
    },
    {
      id: 'artifact-review',
      status: 'required',
      prompt:
        'Are text, tools, hands, eye stalks, cables, shelves, and repeated inventory free of malformed or duplicated AI artifacts?',
    },
  ]

  const report = {
    schemaVersion: 1,
    candidate,
    generatedAt: new Date().toISOString(),
    source: {
      sha256Before: sourceHashBefore,
      sha256After: sourceHashAfter,
      width: sourceMetadata.width,
      height: sourceMetadata.height,
      aspect: toFixed(sourceAspect, 8),
      targetAspect: toFixed(TARGET_ASPECT, 8),
      aspectRelativeError: toFixed(sourceAspectError, 8),
      untouched: sourceHashBefore === sourceHashAfter,
    },
    normalization: {
      policy:
        'auto-orient; centered aspect-preserving cover crop; Lanczos downsample to 320×421; palette quantize with no dithering; nearest-neighbor 3× to 960×1263; duplicate final row to 960×1264',
      crop,
      cropLoss: toFixed(cropLoss, 8),
      logicalCanvas: LOGICAL,
      pixelScale: PIXEL_SCALE,
      paletteBudget: colors,
      dither: 0,
      finalRowPolicy: gridMetrics.finalRowPolicy,
    },
    statuses: {
      hardMachineChecks: hardStatus,
      visualReview: 'required',
      productionApproval:
        hardStatus === 'pass'
          ? 'blocked-pending-visual-review'
          : 'blocked-machine-failure',
    },
    hardMachineChecks: hardChecks,
    advisoryStyleMetrics: {
      interpretation:
        'Metrics describe flattening, edge contrast, and pixel chunkiness. They are not pass/fail art judgments.',
      beforeQuantizationAt320x421: sourceLogicalMetrics,
      afterQuantizationAt320x421: logicalMetrics,
      delivered960x1264: deliveryMetrics,
      authoredGrid: gridMetrics,
      deltas: {
        colorsRemoved:
          sourceLogicalMetrics.uniqueColors - logicalMetrics.uniqueColors,
        flatAdjacencyShare: toFixed(
          logicalMetrics.flatAdjacencyShare -
            sourceLogicalMetrics.flatAdjacencyShare,
          6,
        ),
        meanBoundaryContrast: toFixed(
          logicalMetrics.meanBoundaryContrast -
            sourceLogicalMetrics.meanBoundaryContrast,
          3,
        ),
        darkOutlineEdgeShare: toFixed(
          logicalMetrics.darkOutlineEdgeShare -
            sourceLogicalMetrics.darkOutlineEdgeShare,
          6,
        ),
        isolatedPixelShare: toFixed(
          logicalMetrics.isolatedPixelShare -
            sourceLogicalMetrics.isolatedPixelShare,
          6,
        ),
      },
    },
    cameraAudit: {
      status: cameraReport.statuses.camera,
      report: path.join(cameraOutputDir, 'camera-audit.json'),
      verifierOutput: cameraExecution.stdout.trim(),
    },
    visualReview,
    outputs: {
      normalizedDelivery: normalizedPath,
      logicalQuantized: logicalQuantizedPath,
      logicalPrequant: logicalPrequantPath,
      comparison: comparisonPath,
      cameraOverlay: path.join(cameraOutputDir, 'camera-audit-overlay.png'),
    },
    outputHashes: {
      normalizedDelivery: await sha256(normalizedPath),
      logicalQuantized: await sha256(logicalQuantizedPath),
    },
  }

  const jsonPath = path.join(outputDir, 'delivery-style-audit.json')
  const markdownPath = path.join(outputDir, 'delivery-style-audit.md')
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`)

  const hardRows = hardChecks
    .map(
      (check) =>
        `| ${check.id} | ${check.status.toUpperCase()} | ${check.measured} | ${check.expected} | ${check.note} |`,
    )
    .join('\n')
  const visualRows = visualReview
    .map(
      (check) =>
        `| ${check.id} | ${check.status.toUpperCase()} | ${check.prompt} |`,
    )
    .join('\n')
  const markdown = `# Manual delivery and style audit

- Source: \`${candidate}\` — **untouched**
- Derived delivery: \`${normalizedPath}\`
- Hard machine checks: **${hardStatus.toUpperCase()}**
- Visual review: **REQUIRED**
- Production approval: **${report.statuses.productionApproval.toUpperCase()}**

## Hard machine-checkable gate

| Check | Status | Measured | Expected | Meaning |
| --- | --- | --- | --- | --- |
${hardRows}

## Advisory style metrics

These measurements are descriptive. They cannot approve the art style.

| Metric | Before quantization | After quantization |
| --- | ---: | ---: |
| Unique RGBA colors | ${sourceLogicalMetrics.uniqueColors} | ${logicalMetrics.uniqueColors} |
| Flat adjacency share | ${sourceLogicalMetrics.flatAdjacencyShare} | ${logicalMetrics.flatAdjacencyShare} |
| Mean boundary contrast | ${sourceLogicalMetrics.meanBoundaryContrast} | ${logicalMetrics.meanBoundaryContrast} |
| Strong-edge share (luma contrast ≥40) | ${sourceLogicalMetrics.strongEdgeShare} | ${logicalMetrics.strongEdgeShare} |
| Very-strong-edge share (luma contrast ≥72) | ${sourceLogicalMetrics.veryStrongEdgeShare} | ${logicalMetrics.veryStrongEdgeShare} |
| Dark-outline edge share | ${sourceLogicalMetrics.darkOutlineEdgeShare} | ${logicalMetrics.darkOutlineEdgeShare} |
| Isolated pixel share | ${sourceLogicalMetrics.isolatedPixelShare} | ${logicalMetrics.isolatedPixelShare} |

Grid result: ${gridMetrics.uniformBlocks}/${gridMetrics.totalBlocks} uniform 3×3 blocks; final row match ${toFixed(gridMetrics.finalRowMatch * 100, 4)}%.

## Mandatory visual review

| Review | Status | Question |
| --- | --- | --- |
${visualRows}

Passing the machine gate does not approve identity, anatomy, composition,
lighting, outline quality, or the absence of AI artifacts.

## Outputs

- Normalized delivery: \`${normalizedPath}\`
- 320×421 quantized master: \`${logicalQuantizedPath}\`
- Source/normalized comparison: \`${comparisonPath}\`
- Camera overlay: \`${report.outputs.cameraOverlay}\`
- JSON report: \`${jsonPath}\`
`
  await writeFile(markdownPath, markdown)

  console.log(
    `machine=${hardStatus} camera=${cameraReport.statuses.camera} visual=required`,
  )
  console.log(path.relative(process.cwd(), normalizedPath))
  console.log(path.relative(process.cwd(), markdownPath))

  if (!noFail && hardStatus === 'fail') process.exitCode = 1
}

await main()
