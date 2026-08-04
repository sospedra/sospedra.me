#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONFIG = path.join(SCRIPT_DIR, 'master-candidate.config.json')
const DEFAULT_RUBRIC = path.join(SCRIPT_DIR, 'master-visual-rubric.json')
const RAIL_CONTRAST = 24

const round = (value, places = 6) => Number(value.toFixed(places))

const percentile = (values, ratio) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor((sorted.length - 1) * ratio)]
}

const rgbaKey = (data, offset) =>
  `${data[offset]},${data[offset + 1]},${data[offset + 2]},${data[offset + 3]}`

const samePixel = (data, firstOffset, secondOffset) =>
  data[firstOffset] === data[secondOffset] &&
  data[firstOffset + 1] === data[secondOffset + 1] &&
  data[firstOffset + 2] === data[secondOffset + 2] &&
  data[firstOffset + 3] === data[secondOffset + 3]

const lumaAt = (data, offset) =>
  (77 * data[offset] + 150 * data[offset + 1] + 29 * data[offset + 2]) >> 8

const hexToRgba = (hex) => {
  const normalized = hex.replace('#', '')
  if (!/^[\da-f]{6}$/i.test(normalized)) {
    throw new Error(`Invalid six-digit color: ${hex}`)
  }
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
    255,
  ]
}

const sha256File = async (file) =>
  createHash('sha256')
    .update(await readFile(file))
    .digest('hex')

const writeJson = (file, value) =>
  writeFile(file, `${JSON.stringify(value, null, 2)}\n`)

const parseArguments = () => {
  const args = process.argv.slice(2)
  const candidate = args.find((argument) => !argument.startsWith('--'))
  const valueAfter = (flag) => {
    const index = args.indexOf(flag)
    return index >= 0 ? args[index + 1] : undefined
  }

  if (!candidate) {
    console.error(
      'Usage: node scripts/bazaar3/verify-master-candidate.mjs <candidate.png> [--review <review.json>] [--out-dir <path>] [--init-review <path>] [--config <path>] [--rubric <path>] [--no-fail]',
    )
    process.exit(2)
  }

  return {
    candidate: path.resolve(candidate),
    review: valueAfter('--review')
      ? path.resolve(valueAfter('--review'))
      : undefined,
    outputDir: valueAfter('--out-dir')
      ? path.resolve(valueAfter('--out-dir'))
      : undefined,
    initReview: valueAfter('--init-review')
      ? path.resolve(valueAfter('--init-review'))
      : undefined,
    config: valueAfter('--config')
      ? path.resolve(valueAfter('--config'))
      : DEFAULT_CONFIG,
    rubric: valueAfter('--rubric')
      ? path.resolve(valueAfter('--rubric'))
      : DEFAULT_RUBRIC,
    noFail: args.includes('--no-fail'),
  }
}

const check = (id, passed, measured, expected, note) => ({
  id,
  status: passed ? 'pass' : 'fail',
  measured,
  expected,
  note,
})

const imageMode = (metadata, config) => {
  if (
    metadata.width === config.deliveryCanvas.width &&
    metadata.height === config.deliveryCanvas.height
  ) {
    return 'delivery-with-matte'
  }
  if (
    metadata.width === config.croppedCanvas.width &&
    metadata.height === config.croppedCanvas.height
  ) {
    return 'canonical-crop'
  }
  return 'unsupported'
}

const inspectMatte = ({ data, info }, config) => {
  const expected = hexToRgba(config.matte)
  const window = config.sceneWindow
  let mattePixels = 0
  let mismatchedPixels = 0

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const inside =
        x >= window.x &&
        x < window.x + window.width &&
        y >= window.y &&
        y < window.y + window.height
      if (inside) continue
      mattePixels += 1
      const offset = (y * info.width + x) * info.channels
      if (
        data[offset] !== expected[0] ||
        data[offset + 1] !== expected[1] ||
        data[offset + 2] !== expected[2] ||
        data[offset + 3] !== expected[3]
      ) {
        mismatchedPixels += 1
      }
    }
  }

  return {
    mattePixels,
    mismatchedPixels,
    mismatchShare: round(mismatchedPixels / Math.max(1, mattePixels), 8),
  }
}

const inspectPaletteAndAlpha = ({ data, info }, config) => {
  const allowed = new Set(
    config.palette.map((color) => `${hexToRgba(color).join(',')}`),
  )
  const colorCounts = new Map()
  let transparentPixels = 0
  let partialAlphaPixels = 0
  let opaquePixels = 0
  let offPalettePixels = 0

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const alpha = data[offset + 3]
    if (alpha === 0) {
      transparentPixels += 1
      continue
    }
    if (alpha !== 255) partialAlphaPixels += 1
    else opaquePixels += 1

    const key = rgbaKey(data, offset)
    colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1)
    if (!allowed.has(key)) offPalettePixels += 1
  }

  const sortedCounts = [...colorCounts.values()].sort(
    (left, right) => right - left,
  )
  const effectiveColors = sortedCounts.filter(
    (count) =>
      count / Math.max(1, opaquePixels + partialAlphaPixels) >=
      config.thresholds.effectiveColorMinimumShare,
  ).length
  const top16Coverage =
    sortedCounts.slice(0, 16).reduce((total, count) => total + count, 0) /
    Math.max(1, opaquePixels + partialAlphaPixels)

  return {
    uniqueOpaqueColors: colorCounts.size,
    effectiveColors,
    top16Coverage: round(top16Coverage, 6),
    opaquePixels,
    transparentPixels,
    partialAlphaPixels,
    offPalettePixels,
    offPaletteShare: round(
      offPalettePixels / Math.max(1, opaquePixels + partialAlphaPixels),
      8,
    ),
  }
}

const inspectGrid = ({ data, info }, scale) => {
  const logicalWidth = Math.floor(info.width / scale)
  const logicalHeight = Math.floor(info.height / scale)
  const logicalData = Buffer.alloc(logicalWidth * logicalHeight * 4)
  const failedBlocks = []
  let solidBlocks = 0
  let modalAgreementPixels = 0

  for (let logicalY = 0; logicalY < logicalHeight; logicalY += 1) {
    for (let logicalX = 0; logicalX < logicalWidth; logicalX += 1) {
      const counts = new Map()
      for (let deltaY = 0; deltaY < scale; deltaY += 1) {
        for (let deltaX = 0; deltaX < scale; deltaX += 1) {
          const x = logicalX * scale + deltaX
          const y = logicalY * scale + deltaY
          const offset = (y * info.width + x) * info.channels
          const key = rgbaKey(data, offset)
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      }

      const [modalKey, modalCount] = [...counts.entries()].sort(
        (left, right) => right[1] - left[1],
      )[0]
      const logicalOffset = (logicalY * logicalWidth + logicalX) * 4
      logicalData.set(modalKey.split(',').map(Number), logicalOffset)
      modalAgreementPixels += modalCount
      if (counts.size === 1) solidBlocks += 1
      else failedBlocks.push({ x: logicalX, y: logicalY })
    }
  }

  let changedEdges = 0
  let alignedChangedEdges = 0
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels
      if (x < info.width - 1) {
        const right = offset + info.channels
        if (!samePixel(data, offset, right)) {
          changedEdges += 1
          if ((x + 1) % scale === 0) alignedChangedEdges += 1
        }
      }
      if (y < info.height - 1) {
        const bottom = offset + info.width * info.channels
        if (!samePixel(data, offset, bottom)) {
          changedEdges += 1
          if ((y + 1) % scale === 0) alignedChangedEdges += 1
        }
      }
    }
  }

  const totalBlocks = logicalWidth * logicalHeight
  const totalBlockPixels = totalBlocks * scale * scale
  return {
    logicalWidth,
    logicalHeight,
    logicalData,
    failedBlocks,
    totalBlocks,
    solidBlocks,
    solidBlockRatio: round(solidBlocks / Math.max(1, totalBlocks), 8),
    blockPixelAgreement: round(
      modalAgreementPixels / Math.max(1, totalBlockPixels),
      8,
    ),
    changedEdges,
    gridEdgeAlignment: round(
      alignedChangedEdges / Math.max(1, changedEdges),
      8,
    ),
  }
}

const inspectLogicalTexture = ({ data, width, height, highEntropyBits }) => {
  const colorAt = (x, y) => rgbaKey(data, (y * width + x) * 4)
  let neighborPairs = 0
  let changedNeighborPairs = 0
  let isolated8Pixels = 0
  const isolatedPixels = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const current = colorAt(x, y)
      if (x < width - 1) {
        neighborPairs += 1
        if (current !== colorAt(x + 1, y)) changedNeighborPairs += 1
      }
      if (y < height - 1) {
        neighborPairs += 1
        if (current !== colorAt(x, y + 1)) changedNeighborPairs += 1
      }

      let hasMatchingNeighbor = false
      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
          if (deltaX === 0 && deltaY === 0) continue
          const neighborX = x + deltaX
          const neighborY = y + deltaY
          if (
            neighborX < 0 ||
            neighborX >= width ||
            neighborY < 0 ||
            neighborY >= height
          ) {
            continue
          }
          if (current === colorAt(neighborX, neighborY)) {
            hasMatchingNeighbor = true
          }
        }
      }
      if (!hasMatchingNeighbor) {
        isolated8Pixels += 1
        isolatedPixels.push({ x, y })
      }
    }
  }

  const visited = new Uint8Array(width * height)
  let componentCount = 0
  let smallComponent2Pixels = 0
  let smallComponent4Pixels = 0
  const directions = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ]

  for (let start = 0; start < width * height; start += 1) {
    if (visited[start]) continue
    componentCount += 1
    const target = rgbaKey(data, start * 4)
    const stack = [start]
    visited[start] = 1
    let size = 0

    while (stack.length > 0) {
      const current = stack.pop()
      size += 1
      const x = current % width
      const y = Math.floor(current / width)
      for (const [deltaX, deltaY] of directions) {
        const neighborX = x + deltaX
        const neighborY = y + deltaY
        if (
          neighborX < 0 ||
          neighborX >= width ||
          neighborY < 0 ||
          neighborY >= height
        ) {
          continue
        }
        const neighbor = neighborY * width + neighborX
        if (visited[neighbor]) continue
        if (rgbaKey(data, neighbor * 4) !== target) continue
        visited[neighbor] = 1
        stack.push(neighbor)
      }
    }

    if (size <= 2) smallComponent2Pixels += size
    if (size <= 4) smallComponent4Pixels += size
  }

  const entropies = []
  const tileSize = 16
  for (let tileY = 0; tileY < height; tileY += tileSize) {
    for (let tileX = 0; tileX < width; tileX += tileSize) {
      const counts = new Map()
      let pixels = 0
      for (let y = tileY; y < Math.min(height, tileY + tileSize); y += 1) {
        for (let x = tileX; x < Math.min(width, tileX + tileSize); x += 1) {
          const key = colorAt(x, y)
          counts.set(key, (counts.get(key) ?? 0) + 1)
          pixels += 1
        }
      }
      let entropy = 0
      for (const count of counts.values()) {
        const probability = count / pixels
        entropy -= probability * Math.log2(probability)
      }
      entropies.push(entropy)
    }
  }

  const pixelCount = width * height
  return {
    changedEdgeRatio: round(
      changedNeighborPairs / Math.max(1, neighborPairs),
      8,
    ),
    neighborFlatness: round(
      1 - changedNeighborPairs / Math.max(1, neighborPairs),
      8,
    ),
    isolated8Pixels,
    isolated8Ratio: round(isolated8Pixels / pixelCount, 8),
    isolatedPixels,
    componentCount,
    smallComponent2Ratio: round(smallComponent2Pixels / pixelCount, 8),
    smallComponent4Ratio: round(smallComponent4Pixels / pixelCount, 8),
    entropy: {
      tileSize,
      tileCount: entropies.length,
      median: round(percentile(entropies, 0.5), 6),
      p90: round(percentile(entropies, 0.9), 6),
      p95: round(percentile(entropies, 0.95), 6),
      maximum: round(Math.max(...entropies), 6),
      highTileShare: round(
        entropies.filter((value) => value > highEntropyBits).length /
          Math.max(1, entropies.length),
        8,
      ),
    },
  }
}

const inspectRails = ({ data, info }, rails) =>
  rails.map((rail) => {
    let bestY = rail.y
    let bestCoverage = 0
    for (
      let y = Math.max(1, rail.y - rail.tolerance);
      y <= Math.min(info.height - 1, rail.y + rail.tolerance);
      y += 1
    ) {
      let strong = 0
      for (let x = 0; x < info.width; x += 1) {
        const top = ((y - 1) * info.width + x) * info.channels
        const bottom = (y * info.width + x) * info.channels
        if (
          Math.abs(lumaAt(data, top) - lumaAt(data, bottom)) >= RAIL_CONTRAST
        ) {
          strong += 1
        }
      }
      const coverage = strong / info.width
      if (coverage > bestCoverage) {
        bestCoverage = coverage
        bestY = y
      }
    }
    return {
      ...rail,
      measuredY: bestY,
      coverage: round(bestCoverage, 8),
      passed: bestCoverage >= rail.minimumCoverage,
    }
  })

const buildGuideOverlay = async ({ scenePath, outputPath, config }) => {
  const { width, height } = config.croppedCanvas
  const railLines = config.rails
    .map(
      (rail) =>
        `<line x1="0" y1="${rail.y}" x2="${width}" y2="${rail.y}" stroke="#ff4d67" stroke-width="2"/>` +
        `<text x="8" y="${Math.max(12, rail.y - 4)}" fill="#ff9aaa" font-size="12">${rail.id} y=${rail.y}</text>`,
    )
    .join('')
  const bayRects = config.bays
    .map((bay) => {
      const cropGap = bay.id.startsWith('crop-gap')
      return (
        `<rect x="${bay.x}" y="0" width="${bay.width}" height="${height}" fill="${cropGap ? '#00e5ff' : 'none'}" fill-opacity="${cropGap ? '0.18' : '0'}" stroke="${cropGap ? '#00e5ff' : '#ffd36c'}" stroke-width="2"/>` +
        `<text x="${bay.x + 4}" y="18" fill="${cropGap ? '#8be9e7' : '#ffd36c'}" font-size="12">${bay.id}</text>`
      )
    })
    .join('')
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${bayRects}${railLines}</svg>`,
  )
  await sharp(scenePath)
    .composite([{ input: svg, left: 0, top: 0 }])
    .png()
    .toFile(outputPath)
}

const buildFailureOverlay = async ({
  scenePath,
  outputPath,
  scene,
  grid,
  texture,
  config,
}) => {
  const overlay = Buffer.alloc(scene.info.width * scene.info.height * 4)
  const paint = (x, y, red, green, blue, alpha) => {
    if (x < 0 || x >= scene.info.width || y < 0 || y >= scene.info.height) {
      return
    }
    const offset = (y * scene.info.width + x) * 4
    overlay[offset] = red
    overlay[offset + 1] = green
    overlay[offset + 2] = blue
    overlay[offset + 3] = Math.max(overlay[offset + 3], alpha)
  }

  for (const block of grid.failedBlocks) {
    for (let deltaY = 0; deltaY < config.pixelScale; deltaY += 1) {
      for (let deltaX = 0; deltaX < config.pixelScale; deltaX += 1) {
        paint(
          block.x * config.pixelScale + deltaX,
          block.y * config.pixelScale + deltaY,
          255,
          32,
          48,
          130,
        )
      }
    }
  }

  for (const pixel of texture.isolatedPixels) {
    for (let deltaY = 0; deltaY < config.pixelScale; deltaY += 1) {
      for (let deltaX = 0; deltaX < config.pixelScale; deltaX += 1) {
        paint(
          pixel.x * config.pixelScale + deltaX,
          pixel.y * config.pixelScale + deltaY,
          255,
          210,
          60,
          120,
        )
      }
    }
  }

  const allowed = new Set(
    config.palette.map((color) => `${hexToRgba(color).join(',')}`),
  )
  for (
    let offset = 0;
    offset < scene.data.length;
    offset += scene.info.channels
  ) {
    if (scene.data[offset + 3] === 0) continue
    if (allowed.has(rgbaKey(scene.data, offset))) continue
    const pixel = offset / scene.info.channels
    paint(
      pixel % scene.info.width,
      Math.floor(pixel / scene.info.width),
      255,
      0,
      255,
      90,
    )
  }

  await sharp(scenePath)
    .composite([
      {
        input: overlay,
        raw: {
          width: scene.info.width,
          height: scene.info.height,
          channels: 4,
        },
      },
    ])
    .png()
    .toFile(outputPath)
}

const reviewTemplate = ({ candidateHash, rubric }) => ({
  schemaVersion: 1,
  candidateSha256: candidateHash,
  reviewer: '',
  reviewedAt: '',
  userApprovedSha256: null,
  checks: rubric.checks.map((item) => ({
    id: item.id,
    status: 'not_run',
    observed: '',
    evidence: [],
    notes: '',
  })),
})

const inspectReview = async ({ reviewPath, candidateHash, rubric }) => {
  if (!reviewPath) {
    return {
      status: 'not-run',
      hashMatches: false,
      reviewer: null,
      reviewedAt: null,
      userApproved: false,
      checks: rubric.checks.map((item) => ({
        ...item,
        status: 'not_run',
        observed: '',
        evidence: [],
        notes: '',
      })),
      errors: ['Visual review was not supplied.'],
    }
  }

  const review = JSON.parse(await readFile(reviewPath, 'utf8'))
  const entries = new Map(
    Array.isArray(review.checks)
      ? review.checks.map((item) => [item.id, item])
      : [],
  )
  const errors = []
  const checks = rubric.checks.map((definition) => {
    const result = entries.get(definition.id)
    if (!result) {
      errors.push(`Missing visual review check ${definition.id}.`)
      return {
        ...definition,
        status: 'not_run',
        observed: '',
        evidence: [],
        notes: '',
      }
    }
    const evidence = Array.isArray(result.evidence) ? result.evidence : []
    const observed =
      typeof result.observed === 'string' ? result.observed.trim() : ''
    const validStatus = result.status === 'pass' || result.status === 'fail'
    if (!validStatus) {
      errors.push(`${definition.id} must be pass or fail.`)
    }
    if (!observed) errors.push(`${definition.id} requires observed evidence.`)
    if (evidence.length === 0) {
      errors.push(`${definition.id} requires at least one evidence path/note.`)
    }
    return {
      ...definition,
      status: validStatus ? result.status : 'not_run',
      observed,
      evidence,
      notes: typeof result.notes === 'string' ? result.notes : '',
    }
  })

  const hashMatches = review.candidateSha256 === candidateHash
  if (!hashMatches) errors.push('Visual review SHA does not match candidate.')
  if (typeof review.reviewer !== 'string' || !review.reviewer.trim()) {
    errors.push('Visual review requires a reviewer.')
  }
  if (
    typeof review.reviewedAt !== 'string' ||
    Number.isNaN(Date.parse(review.reviewedAt))
  ) {
    errors.push('Visual review requires an ISO-compatible reviewedAt value.')
  }
  if (checks.some((item) => item.status !== 'pass')) {
    errors.push('Every hard visual check must pass.')
  }

  const status = errors.length === 0 ? 'pass' : 'fail'
  return {
    status,
    hashMatches,
    reviewer: review.reviewer ?? null,
    reviewedAt: review.reviewedAt ?? null,
    userApproved: review.userApprovedSha256 === candidateHash,
    checks,
    errors,
  }
}

const buildMarkdown = (report) => {
  const automaticRows = report.automaticChecks
    .map(
      (item) =>
        `| ${item.id} | ${item.status.toUpperCase()} | ${item.measured} | ${item.expected} | ${item.note} |`,
    )
    .join('\n')
  const visualRows = report.visualReview.checks
    .map(
      (item) =>
        `| ${item.id} | ${item.status.toUpperCase()} | ${item.expected} | ${item.observed || '—'} |`,
    )
    .join('\n')
  const rejectionReasons = [
    ...report.automaticChecks
      .filter((item) => item.status === 'fail')
      .map((item) => `${item.id}: ${item.measured}; expected ${item.expected}`),
    ...report.visualReview.errors,
    ...report.visualReview.checks
      .filter((item) => item.status === 'fail')
      .map((item) => `${item.id}: ${item.observed}`),
  ]

  return `# Bazaar3 master candidate audit

- Candidate: \`${report.candidate}\`
- SHA-256: \`${report.source.sha256}\`
- Source mode: **${report.source.mode}**
- Machine gate: **${report.statuses.machine.toUpperCase()}**
- Codex visual gate: **${report.statuses.visual.toUpperCase()}**
- Candidate acceptance: **${report.statuses.candidateAcceptance.toUpperCase()}**
- Production approval: **${report.statuses.productionApproval.toUpperCase()}**

The verifier inspects the untouched source. It does not resize, quantize,
posterize, palette-remap or otherwise turn a failed render into a passing one.

## Automatic hard gate

| Check | Status | Measured | Expected | Meaning |
| --- | --- | --- | --- | --- |
${automaticRows}

## Mandatory semantic/visual gate

Every item is hard. A missing, stale, unrun or failed item rejects the
candidate.

| Check | Status | Expected | Observed |
| --- | --- | --- | --- |
${visualRows}

## Rejection reasons

${
  rejectionReasons.length > 0
    ? rejectionReasons.map((reason) => `- ${reason}`).join('\n')
    : '- None.'
}

## Diagnostics

- Canonical scene crop: \`${report.outputs.scene}\`
- Geometry guide overlay: \`${report.outputs.guideOverlay}\`
- Style-failure overlay: \`${report.outputs.failureOverlay}\`
- Logical 416×199 inspection image: \`${report.outputs.logical}\`
- Small readability preview: \`${report.outputs.thumbnail}\`
- Review template: \`${report.outputs.reviewTemplate}\`
- JSON report: \`${report.outputs.json}\`
`
}

const buildUnsupportedReport = async ({
  candidate,
  sourceHash,
  metadata,
  outputDir,
  config,
  rubric,
  reviewPath,
}) => {
  const mode = imageMode(metadata, config)
  const automaticChecks = [
    check(
      'DEL-01',
      false,
      `${metadata.width ?? '?'}×${metadata.height ?? '?'}`,
      `${config.deliveryCanvas.width}×${config.deliveryCanvas.height} or ${config.croppedCanvas.width}×${config.croppedCanvas.height}`,
      'The verifier never crops or stretches an unsupported source.',
    ),
  ]
  const visualReview = await inspectReview({
    reviewPath,
    candidateHash: sourceHash,
    rubric,
  })
  const reviewTemplatePath = path.join(outputDir, 'review-template.json')
  await writeJson(
    reviewTemplatePath,
    reviewTemplate({ candidateHash: sourceHash, rubric }),
  )
  return {
    schemaVersion: 1,
    candidate,
    generatedAt: new Date().toISOString(),
    source: {
      sha256: sourceHash,
      width: metadata.width,
      height: metadata.height,
      mode,
      untouched: true,
    },
    statuses: {
      machine: 'fail',
      visual: visualReview.status,
      candidateAcceptance: 'rejected',
      productionApproval: 'rejected',
    },
    automaticChecks,
    metrics: null,
    visualReview,
    outputs: {
      scene: null,
      guideOverlay: null,
      failureOverlay: null,
      logical: null,
      thumbnail: null,
      reviewTemplate: reviewTemplatePath,
      json: path.join(outputDir, 'master-candidate-audit.json'),
      markdown: path.join(outputDir, 'master-candidate-audit.md'),
    },
  }
}

export const verifyMasterCandidate = async ({
  candidate,
  reviewPath,
  outputDir,
  configPath = DEFAULT_CONFIG,
  rubricPath = DEFAULT_RUBRIC,
  initReviewPath,
}) => {
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const rubric = JSON.parse(await readFile(rubricPath, 'utf8'))
  const resolvedCandidate = path.resolve(candidate)
  const basename = path.basename(
    resolvedCandidate,
    path.extname(resolvedCandidate),
  )
  const resolvedOutputDir =
    outputDir ??
    path.join(
      process.cwd(),
      'scripts/bazaar3/reports/master-candidates',
      basename,
    )
  await mkdir(resolvedOutputDir, { recursive: true })

  const sourceHashBefore = await sha256File(resolvedCandidate)
  const metadata = await sharp(resolvedCandidate).metadata()
  const mode = imageMode(metadata, config)

  let report
  if (mode === 'unsupported') {
    report = await buildUnsupportedReport({
      candidate: resolvedCandidate,
      sourceHash: sourceHashBefore,
      metadata,
      outputDir: resolvedOutputDir,
      config,
      rubric,
      reviewPath,
    })
  } else {
    const full = await sharp(resolvedCandidate)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const matte =
      mode === 'delivery-with-matte' ? inspectMatte(full, config) : null
    const sceneBuffer =
      mode === 'delivery-with-matte'
        ? await sharp(resolvedCandidate)
            .extract({
              left: config.sceneWindow.x,
              top: config.sceneWindow.y,
              width: config.sceneWindow.width,
              height: config.sceneWindow.height,
            })
            .png()
            .toBuffer()
        : await sharp(resolvedCandidate).png().toBuffer()
    const scene = await sharp(sceneBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const palette = inspectPaletteAndAlpha(scene, config)
    const grid = inspectGrid(scene, config.pixelScale)
    const texture = inspectLogicalTexture({
      data: grid.logicalData,
      width: grid.logicalWidth,
      height: grid.logicalHeight,
      highEntropyBits: config.thresholds.highEntropyBits,
    })
    const rails = inspectRails(scene, config.rails)

    const scenePath = path.join(resolvedOutputDir, 'canonical-scene.png')
    const logicalPath = path.join(resolvedOutputDir, 'logical-inspection.png')
    const guideOverlayPath = path.join(
      resolvedOutputDir,
      'geometry-guide-overlay.png',
    )
    const failureOverlayPath = path.join(
      resolvedOutputDir,
      'style-failure-overlay.png',
    )
    const thumbnailPath = path.join(
      resolvedOutputDir,
      'readability-preview-300px.png',
    )
    const reviewTemplatePath = path.join(
      resolvedOutputDir,
      'review-template.json',
    )
    await writeFile(scenePath, sceneBuffer)
    await sharp(grid.logicalData, {
      raw: {
        width: grid.logicalWidth,
        height: grid.logicalHeight,
        channels: 4,
      },
    })
      .png()
      .toFile(logicalPath)
    await sharp(sceneBuffer)
      .resize({ width: 300, kernel: sharp.kernel.nearest })
      .png()
      .toFile(thumbnailPath)
    await buildGuideOverlay({
      scenePath,
      outputPath: guideOverlayPath,
      config,
    })
    await buildFailureOverlay({
      scenePath,
      outputPath: failureOverlayPath,
      scene,
      grid,
      texture,
      config,
    })
    const template = reviewTemplate({
      candidateHash: sourceHashBefore,
      rubric,
    })
    await writeJson(reviewTemplatePath, template)
    if (initReviewPath) {
      await mkdir(path.dirname(initReviewPath), { recursive: true })
      await writeJson(initReviewPath, template)
    }

    const automaticChecks = [
      check(
        'DEL-01',
        true,
        `${metadata.width}×${metadata.height}`,
        mode === 'delivery-with-matte'
          ? `${config.deliveryCanvas.width}×${config.deliveryCanvas.height}`
          : `${config.croppedCanvas.width}×${config.croppedCanvas.height}`,
        'Supported source canvas.',
      ),
      check(
        'DEL-02',
        mode === 'canonical-crop' || matte.mismatchedPixels === 0,
        mode === 'canonical-crop'
          ? 'canonical crop; no disposable matte'
          : `${matte.mismatchedPixels} mismatched matte pixels (${round(
              matte.mismatchShare * 100,
              5,
            )}%)`,
        mode === 'canonical-crop'
          ? 'not applicable'
          : `0 pixels outside ${config.sceneWindow.width}×${config.sceneWindow.height} scene differ from ${config.matte}`,
        'A noisy or decorated matte means the generator ignored the exact scene window.',
      ),
      check(
        'DEL-03',
        scene.info.width === config.croppedCanvas.width &&
          scene.info.height === config.croppedCanvas.height,
        `${scene.info.width}×${scene.info.height}`,
        `${config.croppedCanvas.width}×${config.croppedCanvas.height}`,
        'Canonical master stage dimensions.',
      ),
      check(
        'DEL-04',
        palette.partialAlphaPixels === 0 && palette.transparentPixels === 0,
        `${palette.partialAlphaPixels} partial-alpha; ${palette.transparentPixels} transparent`,
        'fully opaque scene; no partial alpha',
        'The complete environment master is opaque and has no antialiased alpha fringe.',
      ),
      check(
        'STY-A01',
        palette.uniqueOpaqueColors <= config.thresholds.maximumOpaqueColors,
        `${palette.uniqueOpaqueColors} opaque colors`,
        `≤ ${config.thresholds.maximumOpaqueColors}`,
        'A richly textured pseudo-pixel render creates thousands of accidental shades.',
      ),
      check(
        'STY-A02',
        palette.effectiveColors <= config.thresholds.maximumEffectiveColors,
        `${palette.effectiveColors} effective colors`,
        `≤ ${config.thresholds.maximumEffectiveColors}`,
        `A color is effective when it covers at least ${round(
          config.thresholds.effectiveColorMinimumShare * 100,
          3,
        )}% of the scene.`,
      ),
      check(
        'STY-A03',
        palette.offPalettePixels === 0,
        `${palette.offPalettePixels} off-palette pixels (${round(
          palette.offPaletteShare * 100,
          5,
        )}%)`,
        '0',
        'The verifier reports off-palette pixels; it never remaps them.',
      ),
      check(
        'STY-A04',
        grid.solidBlockRatio >= config.thresholds.minimumSolidBlockRatio,
        `${round(grid.solidBlockRatio * 100, 5)}% solid 3×3 blocks`,
        `≥ ${round(config.thresholds.minimumSolidBlockRatio * 100, 3)}%`,
        'Every authored pixel must be one crisp 3×3 square.',
      ),
      check(
        'STY-A05',
        grid.blockPixelAgreement >=
          config.thresholds.minimumBlockPixelAgreement,
        `${round(grid.blockPixelAgreement * 100, 5)}% modal agreement`,
        `≥ ${round(config.thresholds.minimumBlockPixelAgreement * 100, 3)}%`,
        'Detects antialiasing and mixed-resolution marks inside logical pixels.',
      ),
      check(
        'STY-A06',
        grid.gridEdgeAlignment >= config.thresholds.minimumGridEdgeAlignment,
        `${round(grid.gridEdgeAlignment * 100, 5)}% changed edges align to grid`,
        `≥ ${round(config.thresholds.minimumGridEdgeAlignment * 100, 3)}%`,
        'Detects rescaling and sub-grid contours.',
      ),
      check(
        'STY-A07',
        texture.changedEdgeRatio <= config.thresholds.maximumChangedEdgeRatio,
        `${round(texture.changedEdgeRatio * 100, 4)}% changed neighbor edges`,
        `≤ ${round(config.thresholds.maximumChangedEdgeRatio * 100, 2)}%`,
        'Large connected flat masses must dominate at authored resolution.',
      ),
      check(
        'STY-A08',
        texture.isolated8Ratio <= config.thresholds.maximumIsolated8Ratio,
        `${round(texture.isolated8Ratio * 100, 4)}% isolated logical pixels`,
        `≤ ${round(config.thresholds.maximumIsolated8Ratio * 100, 2)}%`,
        'Flags confetti detail and isolated AI noise.',
      ),
      check(
        'STY-A09',
        texture.smallComponent2Ratio <=
          config.thresholds.maximumSmallComponent2Ratio,
        `${round(
          texture.smallComponent2Ratio * 100,
          4,
        )}% in components ≤2 logical pixels`,
        `≤ ${round(config.thresholds.maximumSmallComponent2Ratio * 100, 2)}%`,
        'Flags salt-and-pepper surface fragments.',
      ),
      check(
        'STY-A10',
        texture.smallComponent4Ratio <=
          config.thresholds.maximumSmallComponent4Ratio,
        `${round(
          texture.smallComponent4Ratio * 100,
          4,
        )}% in components ≤4 logical pixels`,
        `≤ ${round(config.thresholds.maximumSmallComponent4Ratio * 100, 2)}%`,
        'Flags excessive tiny connected components.',
      ),
      check(
        'STY-A11',
        texture.entropy.median <= config.thresholds.maximumEntropyMedian &&
          texture.entropy.p95 <= config.thresholds.maximumEntropyP95 &&
          texture.entropy.highTileShare <=
            config.thresholds.maximumHighEntropyTileShare,
        `entropy median=${texture.entropy.median}, p95=${texture.entropy.p95}, high tiles=${round(
          texture.entropy.highTileShare * 100,
          3,
        )}%`,
        `median ≤${config.thresholds.maximumEntropyMedian}, p95 ≤${config.thresholds.maximumEntropyP95}, >${config.thresholds.highEntropyBits}-bit tiles ≤${round(
          config.thresholds.maximumHighEntropyTileShare * 100,
          2,
        )}%`,
        'Rejects locally overdrawn surfaces even when the global palette is small.',
      ),
      ...rails.map((rail) =>
        check(
          `RAIL-${rail.id}`,
          rail.passed,
          `best y=${rail.measuredY}; ${round(
            rail.coverage * 100,
            2,
          )}% strong horizontal coverage`,
          `y=${rail.y}±${rail.tolerance}; coverage ≥${round(
            rail.minimumCoverage * 100,
            1,
          )}%`,
          'The canonical ceiling, wall/floor and fascia rails anchor the parallel camera.',
        ),
      ),
    ]

    const visualReview = await inspectReview({
      reviewPath,
      candidateHash: sourceHashBefore,
      rubric,
    })
    const sourceHashAfter = await sha256File(resolvedCandidate)
    automaticChecks.push(
      check(
        'SRC-01',
        sourceHashBefore === sourceHashAfter,
        sourceHashAfter,
        sourceHashBefore,
        'The verifier writes only diagnostics and never mutates the source.',
      ),
    )
    const machineStatus = automaticChecks.some((item) => item.status === 'fail')
      ? 'fail'
      : 'pass'
    const candidateAcceptance =
      machineStatus === 'pass' && visualReview.status === 'pass'
        ? 'pass'
        : 'rejected'
    const productionApproval =
      candidateAcceptance === 'pass' && visualReview.userApproved
        ? 'pass'
        : candidateAcceptance === 'pass'
          ? 'blocked-pending-user-approval'
          : 'rejected'

    report = {
      schemaVersion: 1,
      candidate: resolvedCandidate,
      generatedAt: new Date().toISOString(),
      source: {
        sha256: sourceHashBefore,
        sha256After: sourceHashAfter,
        width: metadata.width,
        height: metadata.height,
        mode,
        untouched: sourceHashBefore === sourceHashAfter,
      },
      statuses: {
        machine: machineStatus,
        visual: visualReview.status,
        candidateAcceptance,
        productionApproval,
      },
      automaticChecks,
      metrics: {
        matte,
        palette,
        grid: {
          logicalWidth: grid.logicalWidth,
          logicalHeight: grid.logicalHeight,
          totalBlocks: grid.totalBlocks,
          solidBlocks: grid.solidBlocks,
          solidBlockRatio: grid.solidBlockRatio,
          blockPixelAgreement: grid.blockPixelAgreement,
          changedEdges: grid.changedEdges,
          gridEdgeAlignment: grid.gridEdgeAlignment,
        },
        texture: {
          changedEdgeRatio: texture.changedEdgeRatio,
          neighborFlatness: texture.neighborFlatness,
          isolated8Pixels: texture.isolated8Pixels,
          isolated8Ratio: texture.isolated8Ratio,
          componentCount: texture.componentCount,
          smallComponent2Ratio: texture.smallComponent2Ratio,
          smallComponent4Ratio: texture.smallComponent4Ratio,
          entropy: texture.entropy,
        },
        rails,
      },
      visualReview,
      outputs: {
        scene: scenePath,
        guideOverlay: guideOverlayPath,
        failureOverlay: failureOverlayPath,
        logical: logicalPath,
        thumbnail: thumbnailPath,
        reviewTemplate: reviewTemplatePath,
        json: path.join(resolvedOutputDir, 'master-candidate-audit.json'),
        markdown: path.join(resolvedOutputDir, 'master-candidate-audit.md'),
      },
    }
  }

  await writeJson(report.outputs.json, report)
  await writeFile(report.outputs.markdown, buildMarkdown(report))
  return report
}

const main = async () => {
  const args = parseArguments()
  const report = await verifyMasterCandidate({
    candidate: args.candidate,
    reviewPath: args.review,
    outputDir: args.outputDir,
    configPath: args.config,
    rubricPath: args.rubric,
    initReviewPath: args.initReview,
  })
  console.log(
    `machine=${report.statuses.machine} visual=${report.statuses.visual} candidate=${report.statuses.candidateAcceptance} production=${report.statuses.productionApproval}`,
  )
  console.log(path.relative(process.cwd(), report.outputs.markdown))
  if (
    !args.noFail &&
    (report.statuses.machine !== 'pass' || report.statuses.visual !== 'pass')
  ) {
    process.exitCode = 1
  }
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectExecution) await main()
