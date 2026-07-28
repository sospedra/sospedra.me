import { createHash } from 'node:crypto'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const REQUIRED_STATES = Object.freeze([
  'idle-1',
  'idle-2',
  'hover-1',
  'hover-2',
  'hover-3',
])
const REQUIRED_LOCKED_CATEGORIES = Object.freeze([
  'sign',
  'counter',
  'floor',
  'background',
])

const parseArguments = () => {
  const args = process.argv.slice(2)
  const manifest = args[0]
  const outIndex = args.indexOf('--out-dir')
  const outDir = outIndex >= 0 ? args[outIndex + 1] : undefined
  const noFail = args.includes('--no-fail')
  if (!manifest) {
    console.error(
      'Usage: node scripts/bazaar3/manual-camera/verify-five-frame.mjs <manifest.json> [--out-dir <path>] [--no-fail]',
    )
    process.exit(2)
  }
  return {
    manifestPath: path.resolve(manifest),
    outDir: outDir ? path.resolve(outDir) : undefined,
    noFail,
  }
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex')

const fileExists = async (filePath) => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

const canonicalizeTransparent = (data) => {
  const result = Buffer.from(data)
  for (let offset = 0; offset < result.length; offset += 4) {
    if (result[offset + 3] !== 0) continue
    result[offset] = 0
    result[offset + 1] = 0
    result[offset + 2] = 0
  }
  return result
}

const pixelMatches = (left, right, leftOffset, rightOffset = leftOffset) =>
  left[leftOffset] === right[rightOffset] &&
  left[leftOffset + 1] === right[rightOffset + 1] &&
  left[leftOffset + 2] === right[rightOffset + 2] &&
  left[leftOffset + 3] === right[rightOffset + 3]

const rectContains = (rect, x, y) =>
  x >= rect.x &&
  x < rect.x + rect.width &&
  y >= rect.y &&
  y < rect.y + rect.height

const polygonContains = (points, x, y) => {
  let inside = false
  for (
    let current = 0, previous = points.length - 1;
    current < points.length;
    previous = current++
  ) {
    const [currentX, currentY] = points[current]
    const [previousX, previousY] = points[previous]
    const intersects =
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) / (previousY - currentY) +
          currentX
    if (intersects) inside = !inside
  }
  return inside
}

const regionContains = (region, x, y) => {
  if (region.kind === 'polygon') {
    return polygonContains(region.points, x + 0.5, y + 0.5)
  }
  return rectContains(region, x, y)
}

const validRect = (rect, canvas) =>
  Number.isInteger(rect?.x) &&
  Number.isInteger(rect?.y) &&
  Number.isInteger(rect?.width) &&
  Number.isInteger(rect?.height) &&
  rect.x >= 0 &&
  rect.y >= 0 &&
  rect.width > 0 &&
  rect.height > 0 &&
  rect.x + rect.width <= canvas.width &&
  rect.y + rect.height <= canvas.height

const check = (id, passed, measured, expected, note) => ({
  id,
  status: passed ? 'pass' : 'fail',
  measured,
  expected,
  note,
})

const validateManifest = (manifest) => {
  const errors = []
  const logical = manifest.logicalCanvas
  const delivery = manifest.deliveryCanvas
  if (manifest.version !== 1) errors.push('version must be 1')
  if (!manifest.id) errors.push('id is required')
  if (!logical || !delivery)
    errors.push('logicalCanvas and deliveryCanvas are required')
  if (!Number.isInteger(manifest.pixelScale) || manifest.pixelScale < 1) {
    errors.push('pixelScale must be a positive integer')
  }
  if (
    !logical ||
    !Number.isInteger(logical.width) ||
    !Number.isInteger(logical.height)
  ) {
    errors.push('logicalCanvas must contain integer width and height')
  }
  if (
    !delivery ||
    !Number.isInteger(delivery.width) ||
    !Number.isInteger(delivery.height)
  ) {
    errors.push('deliveryCanvas must contain integer width and height')
  }
  if (
    logical &&
    delivery &&
    (delivery.width !== logical.width * manifest.pixelScale ||
      delivery.height !==
        logical.height * manifest.pixelScale + (manifest.finalRow?.count ?? 0))
  ) {
    errors.push(
      'deliveryCanvas does not match logicalCanvas × pixelScale + finalRow',
    )
  }

  const frames = manifest.frames ?? []
  const states = frames.map((frame) => frame.id)
  if (
    frames.length !== REQUIRED_STATES.length ||
    !REQUIRED_STATES.every((state, index) => states[index] === state)
  ) {
    errors.push(`frames must be exactly ${REQUIRED_STATES.join(', ')}`)
  }
  if (manifest.baseState !== 'idle-1') errors.push('baseState must be idle-1')

  const regionGroups = [
    ['lockedRegions', manifest.lockedRegions],
    ['torsoRegions', manifest.torsoRegions],
    ['rootRegions', manifest.rootRegions],
    ['shoulderRootRegions', manifest.shoulderRootRegions],
    ['registrationAnchors', manifest.registrationAnchors],
  ]
  for (const [groupName, regions] of regionGroups) {
    if (!Array.isArray(regions) || regions.length === 0) {
      errors.push(`${groupName} must be a non-empty array`)
      continue
    }
    for (const region of regions) {
      if (!region.id || !validRect(region, logical)) {
        errors.push(
          `${groupName}.${region.id ?? 'unknown'} is outside the logical canvas`,
        )
      }
    }
  }

  const categories = new Set(
    (manifest.lockedRegions ?? []).map((region) => region.category),
  )
  for (const category of REQUIRED_LOCKED_CATEGORIES) {
    if (!categories.has(category)) {
      errors.push(`lockedRegions must include category ${category}`)
    }
  }

  if (
    !Number.isInteger(manifest.palette?.maxColors) ||
    manifest.palette.maxColors < 1
  ) {
    errors.push('palette.maxColors must be a positive integer')
  }
  if (!['subset-of-base', 'identical'].includes(manifest.palette?.mode)) {
    errors.push('palette.mode must be subset-of-base or identical')
  }
  if (!['duplicate-last', 'transparent'].includes(manifest.finalRow?.mode)) {
    errors.push('finalRow.mode must be duplicate-last or transparent')
  }

  return errors
}

const createInlineMask = (regions, logical) => {
  const mask = Buffer.alloc(logical.width * logical.height)
  for (let y = 0; y < logical.height; y += 1) {
    for (let x = 0; x < logical.width; x += 1) {
      if (regions.some((region) => regionContains(region, x, y))) {
        mask[y * logical.width + x] = 255
      }
    }
  }
  return mask
}

const readMotionMask = async ({ descriptor, manifestDirectory, logical }) => {
  if (!descriptor) {
    return {
      data: Buffer.alloc(logical.width * logical.height),
      binary: true,
      source: 'none',
    }
  }
  if (Array.isArray(descriptor.regions)) {
    return {
      data: createInlineMask(descriptor.regions, logical),
      binary: true,
      source: 'inline-regions',
    }
  }
  if (!descriptor.file) {
    return {
      data: Buffer.alloc(logical.width * logical.height),
      binary: false,
      source: 'invalid',
    }
  }

  const filePath = path.resolve(manifestDirectory, descriptor.file)
  if (!(await fileExists(filePath))) {
    return {
      data: Buffer.alloc(logical.width * logical.height),
      binary: false,
      source: filePath,
      missing: true,
    }
  }
  const metadata = await sharp(filePath).metadata()
  if (metadata.width !== logical.width || metadata.height !== logical.height) {
    return {
      data: Buffer.alloc(logical.width * logical.height),
      binary: false,
      source: filePath,
      dimensions: `${metadata.width}×${metadata.height}`,
    }
  }
  const raw = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const data = Buffer.alloc(logical.width * logical.height)
  let binary = true
  for (let pixel = 0; pixel < data.length; pixel += 1) {
    const alpha = raw.data[pixel * 4 + 3]
    if (alpha !== 0 && alpha !== 255) binary = false
    data[pixel] = alpha === 255 ? 255 : 0
  }
  return { data, binary, source: filePath }
}

const sampleLogical = (delivered, manifest) => {
  const {
    logicalCanvas: logical,
    deliveryCanvas: delivery,
    pixelScale,
  } = manifest
  const result = Buffer.alloc(logical.width * logical.height * 4)
  for (let y = 0; y < logical.height; y += 1) {
    for (let x = 0; x < logical.width; x += 1) {
      const sourceOffset =
        (y * pixelScale * delivery.width + x * pixelScale) * 4
      const targetOffset = (y * logical.width + x) * 4
      delivered.copy(result, targetOffset, sourceOffset, sourceOffset + 4)
    }
  }
  return canonicalizeTransparent(result)
}

const inspectFrame = async (filePath, manifest) => {
  const exists = await fileExists(filePath)
  if (!exists) return { exists: false, filePath }

  const metadata = await sharp(filePath).metadata()
  const dimensionsMatch =
    metadata.width === manifest.deliveryCanvas.width &&
    metadata.height === manifest.deliveryCanvas.height
  const fileBuffer = await readFile(filePath)
  if (!dimensionsMatch) {
    return {
      exists: true,
      filePath,
      metadata,
      dimensionsMatch,
      fileHash: sha256(fileBuffer),
    }
  }

  const raw = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const data = raw.data
  const {
    deliveryCanvas: delivery,
    logicalCanvas: logical,
    pixelScale,
  } = manifest

  let partialAlphaPixels = 0
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] !== 0 && data[offset] !== 255) partialAlphaPixels += 1
  }

  let nonUniformBlocks = 0
  for (let logicalY = 0; logicalY < logical.height; logicalY += 1) {
    for (let logicalX = 0; logicalX < logical.width; logicalX += 1) {
      const baseOffset =
        (logicalY * pixelScale * delivery.width + logicalX * pixelScale) * 4
      let uniform = true
      blockScan: for (let deltaY = 0; deltaY < pixelScale; deltaY += 1) {
        for (let deltaX = 0; deltaX < pixelScale; deltaX += 1) {
          const offset =
            ((logicalY * pixelScale + deltaY) * delivery.width +
              logicalX * pixelScale +
              deltaX) *
            4
          if (!pixelMatches(data, data, baseOffset, offset)) {
            uniform = false
            break blockScan
          }
        }
      }
      if (!uniform) nonUniformBlocks += 1
    }
  }

  const coreHeight = logical.height * pixelScale
  let finalRowViolations = 0
  for (let y = coreHeight; y < delivery.height; y += 1) {
    for (let x = 0; x < delivery.width; x += 1) {
      const offset = (y * delivery.width + x) * 4
      if (manifest.finalRow.mode === 'transparent') {
        if (data[offset + 3] !== 0) finalRowViolations += 1
      } else {
        const comparisonOffset = ((coreHeight - 1) * delivery.width + x) * 4
        if (!pixelMatches(data, data, offset, comparisonOffset)) {
          finalRowViolations += 1
        }
      }
    }
  }

  const logicalData = sampleLogical(data, manifest)
  const palette = new Set()
  for (let offset = 0; offset < logicalData.length; offset += 4) {
    if (
      logicalData[offset + 3] === 0 &&
      manifest.palette.includeTransparent !== true
    ) {
      continue
    }
    palette.add(
      `${logicalData[offset]},${logicalData[offset + 1]},${logicalData[offset + 2]},${logicalData[offset + 3]}`,
    )
  }

  return {
    exists: true,
    filePath,
    metadata,
    dimensionsMatch,
    fileHash: sha256(fileBuffer),
    raw: data,
    logical: logicalData,
    logicalHash: sha256(logicalData),
    palette,
    colors: palette.size,
    partialAlphaPixels,
    nonUniformBlocks,
    finalRowViolations,
  }
}

const regionDifferenceCount = (base, current, rect, logical) => {
  let differences = 0
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * logical.width + x) * 4
      if (!pixelMatches(base, current, offset, offset)) differences += 1
    }
  }
  return differences
}

const regionHash = (data, rect, logical) => {
  const hash = createHash('sha256')
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    const start = (y * logical.width + rect.x) * 4
    hash.update(data.subarray(start, start + rect.width * 4))
  }
  return hash.digest('hex')
}

const structureHash = (data, unionMask) => {
  const hash = createHash('sha256')
  for (let pixel = 0; pixel < unionMask.length; pixel += 1) {
    if (unionMask[pixel] !== 0) continue
    hash.update(data.subarray(pixel * 4, pixel * 4 + 4))
  }
  return hash.digest('hex')
}

const translationMismatch = ({
  base,
  current,
  unionMask,
  logical,
  deltaX,
  deltaY,
}) => {
  let mismatches = 0
  let compared = 0
  for (let y = 0; y < logical.height; y += 1) {
    for (let x = 0; x < logical.width; x += 1) {
      const pixel = y * logical.width + x
      if (unionMask[pixel] !== 0) continue
      compared += 1
      const currentX = x + deltaX
      const currentY = y + deltaY
      if (
        currentX < 0 ||
        currentX >= logical.width ||
        currentY < 0 ||
        currentY >= logical.height
      ) {
        mismatches += 1
        continue
      }
      const baseOffset = pixel * 4
      const currentOffset = (currentY * logical.width + currentX) * 4
      if (!pixelMatches(base, current, baseOffset, currentOffset)) {
        mismatches += 1
      }
    }
  }
  return { mismatches, compared }
}

const findTranslation = ({ base, current, unionMask, logical, radius }) => {
  const candidates = []
  for (let deltaY = -radius; deltaY <= radius; deltaY += 1) {
    for (let deltaX = -radius; deltaX <= radius; deltaX += 1) {
      candidates.push({
        deltaX,
        deltaY,
        ...translationMismatch({
          base,
          current,
          unionMask,
          logical,
          deltaX,
          deltaY,
        }),
      })
    }
  }
  candidates.sort((left, right) => left.mismatches - right.mismatches)
  const best = candidates[0]
  const origin = candidates.find(
    (candidate) => candidate.deltaX === 0 && candidate.deltaY === 0,
  )
  const detected =
    (best.deltaX !== 0 || best.deltaY !== 0) &&
    origin.mismatches >= 16 &&
    best.mismatches <= origin.mismatches * 0.6
  return { detected, best, origin }
}

const anchorError = ({ base, current, anchor, logical, deltaX, deltaY }) => {
  let differences = 0
  let compared = 0
  for (let y = anchor.y; y < anchor.y + anchor.height; y += 1) {
    for (let x = anchor.x; x < anchor.x + anchor.width; x += 1) {
      compared += 1
      const currentX = x + deltaX
      const currentY = y + deltaY
      if (
        currentX < 0 ||
        currentX >= logical.width ||
        currentY < 0 ||
        currentY >= logical.height
      ) {
        differences += 1
        continue
      }
      const baseOffset = (y * logical.width + x) * 4
      const currentOffset = (currentY * logical.width + currentX) * 4
      if (!pixelMatches(base, current, baseOffset, currentOffset)) {
        differences += 1
      }
    }
  }
  return { differences, compared }
}

const inspectAnchors = ({ base, current, anchors, logical, radius }) =>
  anchors.map((anchor) => {
    const candidates = []
    for (let deltaY = -radius; deltaY <= radius; deltaY += 1) {
      for (let deltaX = -radius; deltaX <= radius; deltaX += 1) {
        candidates.push({
          deltaX,
          deltaY,
          ...anchorError({
            base,
            current,
            anchor,
            logical,
            deltaX,
            deltaY,
          }),
        })
      }
    }
    candidates.sort((left, right) => left.differences - right.differences)
    const best = candidates[0]
    const origin = candidates.find(
      (candidate) => candidate.deltaX === 0 && candidate.deltaY === 0,
    )
    return {
      id: anchor.id,
      best,
      origin,
      exactAtOrigin: origin.differences === 0,
      improvedAwayFromOrigin:
        (best.deltaX !== 0 || best.deltaY !== 0) &&
        best.differences < origin.differences,
    }
  })

const inspectRegistration = (anchorReports) => {
  const improved = anchorReports.filter(
    (anchor) => anchor.improvedAwayFromOrigin,
  )
  const offsets = improved.map((anchor) => [
    anchor.best.deltaX,
    anchor.best.deltaY,
  ])
  const allSameNonzero =
    offsets.length >= 2 &&
    offsets.every(([x, y]) => x === offsets[0][0] && y === offsets[0][1]) &&
    (offsets[0][0] !== 0 || offsets[0][1] !== 0)
  const xValues = offsets.map(([x]) => x)
  const yValues = offsets.map(([, y]) => y)
  const nonUniformOffsets =
    offsets.length >= 2 &&
    (Math.max(...xValues) !== Math.min(...xValues) ||
      Math.max(...yValues) !== Math.min(...yValues))
  return {
    allAnchorsExactAtOrigin: anchorReports.every(
      (anchor) => anchor.exactAtOrigin,
    ),
    translationDetected: allSameNonzero,
    scaleOrCropDetected: nonUniformOffsets,
    improvedAnchorCount: improved.length,
  }
}

const changedPixels = ({ base, current, mask, logical }) => {
  let inside = 0
  let outside = 0
  const changed = Buffer.alloc(logical.width * logical.height)
  for (let pixel = 0; pixel < changed.length; pixel += 1) {
    const offset = pixel * 4
    if (!pixelMatches(base, current, offset, offset)) {
      changed[pixel] = 255
      if (mask[pixel] === 255) inside += 1
      else outside += 1
    }
  }
  return { inside, outside, changed }
}

const placeholderTile = async (state, logical, message = 'MISSING') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${logical.width}" height="${logical.height}">
      <rect width="100%" height="100%" fill="#141a20"/>
      <path d="M0 0 L${logical.width} ${logical.height} M${logical.width} 0 L0 ${logical.height}" stroke="#6d2730" stroke-width="3"/>
      <text x="${logical.width / 2}" y="${logical.height / 2 - 8}" text-anchor="middle" fill="#ff5b6e" font-family="monospace" font-size="18" font-weight="700">${message}</text>
      <text x="${logical.width / 2}" y="${logical.height / 2 + 18}" text-anchor="middle" fill="#e7dcca" font-family="monospace" font-size="14">${state}</text>
    </svg>
  `
  return sharp(Buffer.from(svg)).png().toBuffer()
}

const logicalPng = (logicalData, logical) =>
  sharp(logicalData, {
    raw: { width: logical.width, height: logical.height, channels: 4 },
  })
    .png()
    .toBuffer()

const labelTile = async (image, state, status, logical) => {
  const headerHeight = 30
  const color = status === 'pass' ? '#55e58b' : '#ff5b6e'
  const header = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${logical.width}" height="${headerHeight}">
      <rect width="100%" height="100%" fill="#080b0f"/>
      <text x="9" y="20" fill="#eee5d4" font-family="monospace" font-size="14" font-weight="700">${state}</text>
      <text x="${logical.width - 9}" y="20" text-anchor="end" fill="${color}" font-family="monospace" font-size="13">${status.toUpperCase()}</text>
    </svg>
  `)
  return sharp({
    create: {
      width: logical.width,
      height: logical.height + headerHeight,
      channels: 4,
      background: '#080b0f',
    },
  })
    .composite([
      { input: header, left: 0, top: 0 },
      { input: image, left: 0, top: headerHeight },
    ])
    .png()
    .toBuffer()
}

const makeOnion = (base, current, logical) => {
  const output = Buffer.alloc(logical.width * logical.height * 4)
  for (let offset = 0; offset < output.length; offset += 4) {
    const baseLuma =
      (77 * base[offset] + 150 * base[offset + 1] + 29 * base[offset + 2]) >> 8
    const currentLuma =
      (77 * current[offset] +
        150 * current[offset + 1] +
        29 * current[offset + 2]) >>
      8
    output[offset] = baseLuma
    output[offset + 1] = currentLuma
    output[offset + 2] = currentLuma
    output[offset + 3] = 255
  }
  return output
}

const makeHeatmap = ({ base, current, motionMask, lockedMask, logical }) => {
  const output = Buffer.alloc(logical.width * logical.height * 4)
  for (let pixel = 0; pixel < logical.width * logical.height; pixel += 1) {
    const offset = pixel * 4
    const luma =
      (77 * base[offset] + 150 * base[offset + 1] + 29 * base[offset + 2]) >> 8
    const differs = !pixelMatches(base, current, offset, offset)
    if (differs && lockedMask[pixel] === 255) {
      output[offset] = 255
      output[offset + 1] = 0
      output[offset + 2] = 255
    } else if (differs && motionMask[pixel] === 0) {
      output[offset] = 255
      output[offset + 1] = 24
      output[offset + 2] = 48
    } else if (differs) {
      output[offset] = 255
      output[offset + 1] = 170
      output[offset + 2] = 44
    } else {
      const dim = Math.round(luma * 0.32)
      output[offset] = dim
      output[offset + 1] = dim
      output[offset + 2] = dim
    }
    output[offset + 3] = 255
  }
  return output
}

const joinTiles = async (tiles, logical, outputPath) => {
  const tileHeight = logical.height + 30
  await sharp({
    create: {
      width: logical.width * tiles.length,
      height: tileHeight,
      channels: 4,
      background: '#080b0f',
    },
  })
    .composite(
      tiles.map((tile, index) => ({
        input: tile,
        left: index * logical.width,
        top: 0,
      })),
    )
    .png()
    .toFile(outputPath)
}

const main = async () => {
  const { manifestPath, outDir, noFail } = parseArguments()
  const manifestDirectory = path.dirname(manifestPath)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const outputDirectory =
    outDir ??
    path.resolve(
      manifestDirectory,
      manifest.reportDirectory ?? `../reports/${manifest.id}`,
    )
  await mkdir(outputDirectory, { recursive: true })

  const manifestErrors = validateManifest(manifest)
  const manifestChecks = [
    check(
      'manifest-schema',
      manifestErrors.length === 0,
      manifestErrors.length === 0 ? 'valid' : manifestErrors.join('; '),
      'valid five-frame manifest',
      'Manifest geometry and required registration categories are validated before frame comparison.',
    ),
  ]

  const frames = new Map()
  const masks = new Map()
  for (const descriptor of manifest.frames ?? []) {
    const filePath = path.resolve(manifestDirectory, descriptor.file)
    frames.set(descriptor.id, {
      descriptor,
      ...(await inspectFrame(filePath, manifest)),
    })
    masks.set(
      descriptor.id,
      await readMotionMask({
        descriptor: descriptor.motionMask,
        manifestDirectory,
        logical: manifest.logicalCanvas,
      }),
    )
  }

  const unionMask = Buffer.alloc(
    manifest.logicalCanvas.width * manifest.logicalCanvas.height,
  )
  for (const state of REQUIRED_STATES) {
    const mask = masks.get(state)
    if (!mask) continue
    for (let pixel = 0; pixel < unionMask.length; pixel += 1) {
      if (mask.data[pixel] === 255) unionMask[pixel] = 255
    }
  }

  const lockedMask = Buffer.alloc(unionMask.length)
  const allHardLockedRegions = [
    ...(manifest.lockedRegions ?? []),
    ...(manifest.torsoRegions ?? []),
    ...(manifest.rootRegions ?? []),
    ...(manifest.shoulderRootRegions ?? []),
  ]
  for (let y = 0; y < manifest.logicalCanvas.height; y += 1) {
    for (let x = 0; x < manifest.logicalCanvas.width; x += 1) {
      if (allHardLockedRegions.some((region) => rectContains(region, x, y))) {
        lockedMask[y * manifest.logicalCanvas.width + x] = 255
      }
    }
  }

  const base = frames.get(manifest.baseState)
  const baseReady =
    base?.exists &&
    base.dimensionsMatch &&
    base.logical &&
    base.partialAlphaPixels === 0 &&
    base.nonUniformBlocks === 0 &&
    base.finalRowViolations === 0
  const baseStructureHash = baseReady
    ? structureHash(base.logical, unionMask)
    : null
  const basePalette = baseReady ? base.palette : new Set()

  const frameReports = []
  const contactTiles = []
  const onionTiles = []
  const heatmapTiles = []

  for (const state of REQUIRED_STATES) {
    const frame = frames.get(state)
    const mask = masks.get(state) ?? {
      data: Buffer.alloc(unionMask.length),
      binary: false,
      source: 'missing',
    }
    const descriptor = frame?.descriptor ?? { id: state, requireMotion: true }
    const checks = []

    checks.push(
      check(
        'frame-exists',
        frame?.exists === true,
        frame?.exists ? frame.filePath : 'missing',
        'existing file',
        'Missing animation states are always a hard failure.',
      ),
    )

    if (!frame?.exists) {
      const status = 'fail'
      frameReports.push({
        state,
        status,
        file: frame?.filePath ?? descriptor.file,
        checks,
      })
      const missing = await placeholderTile(state, manifest.logicalCanvas)
      contactTiles.push(
        await labelTile(missing, state, status, manifest.logicalCanvas),
      )
      onionTiles.push(
        await labelTile(missing, state, status, manifest.logicalCanvas),
      )
      heatmapTiles.push(
        await labelTile(missing, state, status, manifest.logicalCanvas),
      )
      continue
    }

    checks.push(
      check(
        'dimensions',
        frame.dimensionsMatch,
        `${frame.metadata.width}×${frame.metadata.height}`,
        `${manifest.deliveryCanvas.width}×${manifest.deliveryCanvas.height}`,
        'Any dimension or crop-size mismatch hard-fails.',
      ),
    )
    if (!frame.dimensionsMatch || !frame.logical) {
      const status = 'fail'
      frameReports.push({
        state,
        status,
        file: frame.filePath,
        fileHash: frame.fileHash,
        checks,
      })
      const invalid = await placeholderTile(
        state,
        manifest.logicalCanvas,
        'BAD SIZE',
      )
      contactTiles.push(
        await labelTile(invalid, state, status, manifest.logicalCanvas),
      )
      onionTiles.push(
        await labelTile(invalid, state, status, manifest.logicalCanvas),
      )
      heatmapTiles.push(
        await labelTile(invalid, state, status, manifest.logicalCanvas),
      )
      continue
    }

    const paletteSubset = [...frame.palette].every((color) =>
      basePalette.has(color),
    )
    const paletteIdentical =
      paletteSubset &&
      frame.palette.size === basePalette.size &&
      [...basePalette].every((color) => frame.palette.has(color))
    checks.push(
      check(
        'binary-alpha',
        frame.partialAlphaPixels === 0,
        `${frame.partialAlphaPixels} partial-alpha pixels`,
        '0',
        'Only alpha 0 or 255 is permitted.',
      ),
      check(
        'pixel-grid',
        frame.nonUniformBlocks === 0,
        `${frame.nonUniformBlocks} nonuniform ${manifest.pixelScale}×${manifest.pixelScale} blocks`,
        '0',
        'Every logical pixel must remain an exact nearest-neighbor block.',
      ),
      check(
        'final-row-crop-policy',
        frame.finalRowViolations === 0,
        `${frame.finalRowViolations} final-row violations`,
        '0',
        `Final row policy is ${manifest.finalRow.mode}.`,
      ),
      check(
        'palette-limit',
        frame.colors <= manifest.palette.maxColors,
        `${frame.colors} colors`,
        `≤ ${manifest.palette.maxColors}`,
        'Every frame shares the declared compact palette budget.',
      ),
      check(
        'palette-family',
        manifest.palette.mode === 'identical'
          ? paletteIdentical
          : paletteSubset,
        manifest.palette.mode === 'identical'
          ? `${frame.colors}/${basePalette.size} identical=${paletteIdentical}`
          : `subset=${paletteSubset}`,
        manifest.palette.mode,
        'Undeclared frame-only colors hard-fail.',
      ),
      check(
        'motion-mask-binary',
        mask.binary,
        `${mask.source}; binary=${mask.binary}`,
        'binary logical mask',
        'Per-frame masks must be exact binary masks.',
      ),
    )

    if (!baseReady) {
      checks.push(
        check(
          'base-frame-ready',
          false,
          'base missing or invalid',
          'valid idle-1',
          'Registration comparisons cannot pass without a valid base.',
        ),
      )
    } else {
      const motion = changedPixels({
        base: base.logical,
        current: frame.logical,
        mask: mask.data,
        logical: manifest.logicalCanvas,
      })
      const currentStructureHash = structureHash(frame.logical, unionMask)
      const lockedCategoryReports = {}
      for (const category of REQUIRED_LOCKED_CATEGORIES) {
        const regions = manifest.lockedRegions.filter(
          (region) => region.category === category,
        )
        const regionReports = regions.map((region) => ({
          id: region.id,
          differences: regionDifferenceCount(
            base.logical,
            frame.logical,
            region,
            manifest.logicalCanvas,
          ),
          baseHash: regionHash(base.logical, region, manifest.logicalCanvas),
          frameHash: regionHash(frame.logical, region, manifest.logicalCanvas),
        }))
        lockedCategoryReports[category] = regionReports
        checks.push(
          check(
            `locked-${category}`,
            regionReports.every((region) => region.differences === 0),
            `${regionReports.reduce((sum, region) => sum + region.differences, 0)} changed logical pixels`,
            '0',
            `${category} pixels must remain byte-identical to idle-1.`,
          ),
        )
      }

      const regionGroupDifference = (regions) =>
        regions.map((region) => ({
          id: region.id,
          differences: regionDifferenceCount(
            base.logical,
            frame.logical,
            region,
            manifest.logicalCanvas,
          ),
        }))
      const torso = regionGroupDifference(manifest.torsoRegions)
      const root = regionGroupDifference(manifest.rootRegions)
      const shoulders = regionGroupDifference(manifest.shoulderRootRegions)
      const translation = findTranslation({
        base: base.logical,
        current: frame.logical,
        unionMask,
        logical: manifest.logicalCanvas,
        radius: manifest.registrationSearchRadius ?? 3,
      })
      const anchorReports = inspectAnchors({
        base: base.logical,
        current: frame.logical,
        anchors: manifest.registrationAnchors,
        logical: manifest.logicalCanvas,
        radius: manifest.registrationSearchRadius ?? 3,
      })
      const registration = inspectRegistration(anchorReports)
      const translationDetected =
        translation.detected || registration.translationDetected

      checks.push(
        check(
          'motion-contained',
          motion.outside === 0,
          `${motion.outside} changed pixels outside mask; ${motion.inside} inside`,
          '0 outside',
          'Any motion outside this frame’s declared mask hard-fails.',
        ),
        check(
          'motion-present',
          descriptor.requireMotion === false || motion.inside > 0,
          `${motion.inside} changed pixels inside mask`,
          descriptor.requireMotion === false ? 'optional' : '> 0',
          'Non-base animation frames must contain deliberate motion unless explicitly optional.',
        ),
        check(
          'immutable-structure',
          currentStructureHash === baseStructureHash,
          currentStructureHash,
          baseStructureHash,
          'All bytes outside the union of every motion mask are immutable.',
        ),
        check(
          'torso-regions',
          torso.every((region) => region.differences === 0),
          `${torso.reduce((sum, region) => sum + region.differences, 0)} changed torso pixels`,
          '0',
          'Torso registration is immutable even when nearby arms move.',
        ),
        check(
          'root-regions',
          root.every((region) => region.differences === 0),
          `${root.reduce((sum, region) => sum + region.differences, 0)} changed root pixels`,
          '0',
          'The character/stall root may never translate or rescale.',
        ),
        check(
          'shoulder-root-pixels',
          shoulders.every((region) => region.differences === 0),
          `${shoulders.reduce((sum, region) => sum + region.differences, 0)} changed shoulder-root pixels`,
          '0',
          'Arms may articulate, but their shoulder attachment pixels are byte-locked.',
        ),
        check(
          'registration-anchors',
          registration.allAnchorsExactAtOrigin,
          `${anchorReports.filter((anchor) => !anchor.exactAtOrigin).length} changed anchors`,
          'all exact at (0,0)',
          'Distributed immutable anchors catch crop, rescale, and local registration drift.',
        ),
        check(
          'whole-frame-translation',
          !translationDetected,
          `detected=${translationDetected}; best=(${translation.best.deltaX},${translation.best.deltaY}) ${translation.best.mismatches}/${translation.origin.mismatches} mismatches`,
          'no nonzero translation',
          'A one-logical-pixel whole-frame shift is forbidden.',
        ),
        check(
          'whole-frame-scale-crop',
          !registration.scaleOrCropDetected,
          `detected=${registration.scaleOrCropDetected}; improved anchors=${registration.improvedAnchorCount}`,
          'no divergent anchor offsets',
          'Nonuniform distributed-anchor drift indicates rescale or crop.',
        ),
      )

      frame.motion = {
        inside: motion.inside,
        outside: motion.outside,
        changed: motion.changed,
      }
      frame.lockedCategoryReports = lockedCategoryReports
      frame.torsoReports = torso
      frame.rootReports = root
      frame.shoulderReports = shoulders
      frame.structureHash = currentStructureHash
      frame.translation = translation
      frame.anchorReports = anchorReports
      frame.registration = registration
    }

    const status = checks.some((entry) => entry.status === 'fail')
      ? 'fail'
      : 'pass'
    frameReports.push({
      state,
      status,
      file: frame.filePath,
      fileHash: frame.fileHash,
      logicalHash: frame.logicalHash,
      colors: frame.colors,
      partialAlphaPixels: frame.partialAlphaPixels,
      nonUniformBlocks: frame.nonUniformBlocks,
      finalRowViolations: frame.finalRowViolations,
      structureHash: frame.structureHash,
      motion: frame.motion
        ? { inside: frame.motion.inside, outside: frame.motion.outside }
        : null,
      lockedCategories: frame.lockedCategoryReports,
      torsoRegions: frame.torsoReports,
      rootRegions: frame.rootReports,
      shoulderRootRegions: frame.shoulderReports,
      translation: frame.translation,
      registrationAnchors: frame.anchorReports,
      registration: frame.registration,
      checks,
    })

    const image = await logicalPng(frame.logical, manifest.logicalCanvas)
    contactTiles.push(
      await labelTile(image, state, status, manifest.logicalCanvas),
    )
    if (baseReady) {
      const onionData = makeOnion(
        base.logical,
        frame.logical,
        manifest.logicalCanvas,
      )
      const onion = await logicalPng(onionData, manifest.logicalCanvas)
      onionTiles.push(
        await labelTile(onion, state, status, manifest.logicalCanvas),
      )
      const heatmapData = makeHeatmap({
        base: base.logical,
        current: frame.logical,
        motionMask: mask.data,
        lockedMask,
        logical: manifest.logicalCanvas,
      })
      const heatmap = await logicalPng(heatmapData, manifest.logicalCanvas)
      heatmapTiles.push(
        await labelTile(heatmap, state, status, manifest.logicalCanvas),
      )
    } else {
      const unavailable = await placeholderTile(
        state,
        manifest.logicalCanvas,
        'NO BASE',
      )
      onionTiles.push(
        await labelTile(unavailable, state, status, manifest.logicalCanvas),
      )
      heatmapTiles.push(
        await labelTile(unavailable, state, status, manifest.logicalCanvas),
      )
    }
  }

  const contactSheetPath = path.join(outputDirectory, 'contact-sheet.png')
  const onionSheetPath = path.join(outputDirectory, 'onion-sheet.png')
  const heatmapPath = path.join(outputDirectory, 'motion-heatmap.png')
  await joinTiles(contactTiles, manifest.logicalCanvas, contactSheetPath)
  await joinTiles(onionTiles, manifest.logicalCanvas, onionSheetPath)
  await joinTiles(heatmapTiles, manifest.logicalCanvas, heatmapPath)

  const allFramesPresent = REQUIRED_STATES.every(
    (state) => frames.get(state)?.exists,
  )
  const overallStatus =
    manifestChecks.some((entry) => entry.status === 'fail') ||
    frameReports.some((frame) => frame.status === 'fail')
      ? 'fail'
      : 'pass'
  const report = {
    schemaVersion: 1,
    manifest: manifestPath,
    manifestHash: sha256(await readFile(manifestPath)),
    id: manifest.id,
    label: manifest.label,
    generatedAt: new Date().toISOString(),
    states: REQUIRED_STATES,
    statuses: {
      overall: overallStatus,
      manifest: manifestChecks.every((entry) => entry.status === 'pass')
        ? 'pass'
        : 'fail',
      allFiveFramesPresent: allFramesPresent ? 'pass' : 'fail',
      visualReview: overallStatus === 'pass' ? 'required' : 'blocked',
    },
    missingFrames: REQUIRED_STATES.filter(
      (state) => !frames.get(state)?.exists,
    ),
    manifestChecks,
    base: {
      state: manifest.baseState,
      ready: baseReady,
      structureHash: baseStructureHash,
      palette: [...basePalette].sort(),
    },
    frames: frameReports,
    outputs: {
      contactSheet: contactSheetPath,
      onionSheet: onionSheetPath,
      motionHeatmap: heatmapPath,
    },
    limitations: [
      'Machine PASS proves registration constraints, not good animation.',
      'Masks define permission, not intent; visual review must confirm the declared motion is anatomically and behaviorally correct.',
      'Exact structure locking cannot judge drawing quality, lighting taste, character identity, or malformed AI details.',
      'Missing frames are hard failures and are never substituted or inferred.',
    ],
  }

  const jsonPath = path.join(outputDirectory, 'five-frame-audit.json')
  const markdownPath = path.join(outputDirectory, 'five-frame-audit.md')
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`)

  const frameRows = frameReports
    .map((frame) => {
      const failed = frame.checks
        .filter((entry) => entry.status === 'fail')
        .map((entry) => entry.id)
        .join(', ')
      return `| ${frame.state} | ${frame.status.toUpperCase()} | ${frame.fileHash ?? '—'} | ${frame.motion ? `${frame.motion.inside}/${frame.motion.outside}` : '—'} | ${failed || '—'} |`
    })
    .join('\n')
  const markdown = `# Five-frame registration audit: ${manifest.label ?? manifest.id}

- Overall: **${overallStatus.toUpperCase()}**
- Five frames present: **${allFramesPresent ? 'PASS' : 'FAIL'}**
- Missing: ${report.missingFrames.length > 0 ? report.missingFrames.join(', ') : 'none'}
- Visual review: **${report.statuses.visualReview.toUpperCase()}**

| Frame | Status | SHA-256 | Motion inside/outside | Failed checks |
| --- | --- | --- | --- | --- |
${frameRows}

## Hard gates

Every frame must satisfy exact dimensions and final-row crop policy, binary
alpha, nearest-neighbor grid, palette family, motion mask, immutable structure,
locked sign/counter/floor/background, torso/root/shoulder roots, distributed
registration anchors, and zero whole-frame translation/scale evidence.

Missing states never pass.

## Outputs

- Contact sheet: \`${contactSheetPath}\`
- Onion sheet: \`${onionSheetPath}\`
- Motion heatmap: \`${heatmapPath}\`
- JSON evidence: \`${jsonPath}\`

## Limits

${report.limitations.map((limitation) => `- ${limitation}`).join('\n')}
`
  await writeFile(markdownPath, markdown)

  console.log(
    `overall=${overallStatus} present=${allFramesPresent ? 'pass' : 'fail'}`,
  )
  console.log(path.relative(process.cwd(), markdownPath))
  console.log(path.relative(process.cwd(), contactSheetPath))

  if (!noFail && overallStatus === 'fail') process.exitCode = 1
}

await main()
