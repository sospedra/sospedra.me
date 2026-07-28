#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..')
const SOURCE_ROOT = path.join(REPO_ROOT, 'public/images/bazaar2/assets')
const DESTINATION_ROOT = path.join(
  REPO_ROOT,
  'public/images/bazaar3/assets/stalls',
)
const REPORT_ROOT = path.join(REPO_ROOT, 'scripts/bazaar3/reports')

const JSON_REPORT = path.join(REPORT_ROOT, 'gospel-frames.json')
const MARKDOWN_REPORT = path.join(REPORT_ROOT, 'gospel-frames.md')
const CONTACT_SHEET = path.join(REPORT_ROOT, 'gospel-contact-sheet.png')
const MOTION_AUDIT = path.join(REPORT_ROOT, 'gospel-motion-audit.png')

const STATES = [
  { id: 'idle-1', label: 'idle 1' },
  { id: 'idle-2', label: 'idle 2' },
  { id: 'hover-1', label: 'hover 1' },
  { id: 'hover-2', label: 'hover 2' },
  { id: 'hover-3', label: 'hover 3' },
]

const FAMILY_CONFIGS = [
  {
    id: 'uses',
    label: 'Uses',
    expectedCanvas: { width: 1147, height: 904 },
    expectedMotionBounds: {
      x: 470,
      y: 319,
      width: 163,
      height: 256,
    },
    motionEnvelope: { x: 468, y: 315, width: 170, height: 263 },
    rootPatch: { x: 488, y: 580, width: 125, height: 20 },
    rootPatchMeaning:
      'Opaque service-counter root seam directly below the chef',
    signPatch: { x: 390, y: 153, width: 430, height: 158 },
    reviewedMotion:
      'Chef face, head, folded/unfolding arms and presenting hand; stall, customers and sign stay fixed.',
    hashes: {
      'idle-1':
        '77395b20a016e716c35475fb16958b6f64390a89df8a8af82621dba26f10253b',
      'idle-2':
        '465a2c6e9225d249aec510c3c07b1f5daf7ba48527dda402bbb1e23d67d15d82',
      'hover-1':
        '6ff29c697f5799aa24254634eae4594c70328271c79da26d8a4e037559137439',
      'hover-2':
        'fff67ff65d55349a8a0773bafaa26b4f4c181079100e78bb67c5d544cd0de30d',
      'hover-3':
        'f49ed96873dd9355302ef1cd7d9de3bd88cffecc419838a1276753f6d9b44511',
    },
  },
  {
    id: 'papers',
    label: 'Papers',
    expectedCanvas: { width: 1056, height: 1309 },
    expectedMotionBounds: {
      x: 401,
      y: 414,
      width: 255,
      height: 390,
    },
    motionEnvelope: { x: 395, y: 408, width: 266, height: 400 },
    rootPatch: { x: 430, y: 812, width: 195, height: 26 },
    rootPatchMeaning:
      'Opaque projector/counter root seam directly below the hologram',
    signPatch: { x: 90, y: 135, width: 850, height: 170 },
    reviewedMotion:
      'Archivist, book and declared hologram fragments/scanlines; archive shell and Papers sign stay fixed.',
    hashes: {
      'idle-1':
        '1759c9a47e89e1de7329623c42a91d5698ad21896784b0af5a5ace6442b4e745',
      'idle-2':
        'e04c1eea9a073e7b4770db184942f2d8983ee5a075887da39badf9f5a1a9f791',
      'hover-1':
        'c6663a2de0cfdb173a453fabd23741384b5f1a3ef78294c98e5f3d98b5728459',
      'hover-2':
        '2e22d6881bb2dea56e3adcf0ac2da140e2866d616def66233c9d052e4c3e036c',
      'hover-3':
        '184fe60d552541a559a6a7df261aaddb18d57ebac9adb946bd59fe77ca497310',
    },
  },
  {
    id: 'manual',
    label: 'Manual',
    expectedCanvas: { width: 988, height: 1310 },
    expectedMotionBounds: {
      x: 188,
      y: 310,
      width: 658,
      height: 427,
    },
    motionEnvelope: { x: 182, y: 304, width: 670, height: 439 },
    rootPatch: { x: 360, y: 746, width: 300, height: 24 },
    rootPatchMeaning:
      'Opaque workbench/pedestal registration seam below the service robot',
    signPatch: { x: 125, y: 72, width: 735, height: 182 },
    reviewedMotion:
      'Three eyes, four connected arms and their tools; organized hardware wall and Manual sign stay fixed.',
    hashes: {
      'idle-1':
        'bc4b9d481f6979445dbdd69c8a295a1c15d139790c5f2cc0a6b902ba27d48ad9',
      'idle-2':
        'f2af5c985918c3115e2db45f03dbeb1d282bc13482fe88d83626e65545b89f69',
      'hover-1':
        'f608fbf3a2516680423de5544ab515c8a957894c4de7bc7243821fb16e1a209a',
      'hover-2':
        'b30e4797af0759af997e71d90b29c03aed73139c10b344d5fa180247cc4110db',
      'hover-3':
        '4784c63194781bbea0d5aa9ba2fa57b1a623cf9382e42f124f58065502f26f5c',
    },
  },
  {
    id: 'talks',
    label: 'Talks / Video Club',
    expectedCanvas: { width: 941, height: 1006 },
    expectedMotionBounds: {
      x: 323,
      y: 269,
      width: 217,
      height: 273,
    },
    motionEnvelope: { x: 317, y: 263, width: 229, height: 284 },
    rootPatch: { x: 340, y: 551, width: 190, height: 24 },
    rootPatchMeaning:
      'Opaque service-counter root seam directly below the clerk',
    signPatch: { x: 190, y: 4, width: 478, height: 72 },
    reviewedMotion:
      'Clerk face, head, arms and selected tape; CRT, shelves, customer cutout and Video Club sign stay fixed.',
    hashes: {
      'idle-1':
        'ef1bf6071660d131cd77c2a7d990edaa397b615e554a37f2141cafc55aa076a2',
      'idle-2':
        '36332689e4e4dac737369b4a5386f6d5a8b9705d83ddc6067690d7d8da62a0b9',
      'hover-1':
        'cc2c3a46453ffc6744aab456b2c69ea841ac9a7e8ff8a226ad5c4b92faf35c48',
      'hover-2':
        '87bb58be2c9d3508006a30d2ac53410ffb43e05bd815069fcd95c5c86afb1b3b',
      'hover-3':
        '52174467daba956a42a44844dacede019d6174d95b83b9dc91756eb287bcc147',
    },
  },
  {
    id: 'games',
    label: 'Games',
    expectedCanvas: { width: 1131, height: 1325 },
    expectedMotionBounds: {
      x: 441,
      y: 510,
      width: 419,
      height: 344,
    },
    motionEnvelope: { x: 435, y: 504, width: 431, height: 356 },
    rootPatch: { x: 530, y: 870, width: 285, height: 245 },
    rootPatchMeaning: 'Both siblings’ complete lower-body/feet root patch',
    signPatch: { x: 145, y: 10, width: 500, height: 218 },
    reviewedMotion:
      'Siblings’ heads, upper torsos, handheld and articulated arms; both lower-body roots, cheap stall, clutter and Games sign stay fixed.',
    hashes: {
      'idle-1':
        'd98d7ff7614c9dc10d0708874c3ab349d133bf92c5633ff7e179dd6f5d981a1f',
      'idle-2':
        '917ab4348a88a333c2bbb791e6e7387076b356f6c38c1814a013674d3f03b6dd',
      'hover-1':
        '2fc1ae1733d298d13ec3e542453a7b33e4f1c799438b7a40e4b9c54651bf1141',
      'hover-2':
        'a06d3cc1906ae43da0a10b2a417acd67ae9d962ed6dd3172b64f46b7b2a18c82',
      'hover-3':
        '7d3559f0b3a0d5fc9ef4c83e0e1a41cfa275779c6e448471f51658254080576c',
    },
  },
]

const shouldPromote = process.argv.includes('--promote')

const sha256 = (data) => createHash('sha256').update(data).digest('hex')

const round = (value, places = 6) => Number(value.toFixed(places))

const sourceFilename = (familyId, stateId) => `stall-${familyId}-${stateId}.png`

const sourceRelativePath = (familyId, stateId) =>
  path.posix.join(
    'public/images/bazaar2/assets',
    sourceFilename(familyId, stateId),
  )

const destinationRelativePath = (familyId, stateId) =>
  path.posix.join(
    'public/images/bazaar3/assets/stalls',
    familyId,
    'frames',
    `${stateId}.png`,
  )

const rectEndX = (rect) => rect.x + rect.width
const rectEndY = (rect) => rect.y + rect.height

const rectContainsPoint = (rect, x, y) =>
  x >= rect.x && x < rectEndX(rect) && y >= rect.y && y < rectEndY(rect)

const rectContainsRect = (outer, inner) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  rectEndX(inner) <= rectEndX(outer) &&
  rectEndY(inner) <= rectEndY(outer)

const rectsOverlap = (a, b) =>
  a.x < rectEndX(b) &&
  rectEndX(a) > b.x &&
  a.y < rectEndY(b) &&
  rectEndY(a) > b.y

const rectEquals = (a, b) =>
  a?.x === b?.x &&
  a?.y === b?.y &&
  a?.width === b?.width &&
  a?.height === b?.height

const validateRect = (rect, canvas) =>
  Number.isInteger(rect.x) &&
  Number.isInteger(rect.y) &&
  Number.isInteger(rect.width) &&
  Number.isInteger(rect.height) &&
  rect.x >= 0 &&
  rect.y >= 0 &&
  rect.width > 0 &&
  rect.height > 0 &&
  rectEndX(rect) <= canvas.width &&
  rectEndY(rect) <= canvas.height

const canonicalizeTransparentRgb = (data) => {
  const output = Buffer.from(data)
  for (let index = 0; index < output.length; index += 4) {
    if (output[index + 3] !== 0) continue
    output[index] = 0
    output[index + 1] = 0
    output[index + 2] = 0
  }
  return output
}

const inspectAlpha = (data) => {
  const counts = { transparent: 0, partial: 0, opaque: 0 }
  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index]
    if (alpha === 0) counts.transparent += 1
    else if (alpha === 255) counts.opaque += 1
    else counts.partial += 1
  }
  return counts
}

const inspectPalette = (data) => {
  const colors = new Set()
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue
    colors.add((data[index] << 16) | (data[index + 1] << 8) | data[index + 2])
  }
  return colors
}

const inspectAlphaBounds = (data, width, height) => {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX === -1) return null
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

const inspectPixelClustering = (data, width, height) => {
  let eligibleNeighborPairs = 0
  let identicalNeighborPairs = 0
  let opaqueTwoByTwoBlocks = 0
  let solidColorTwoByTwoBlocks = 0

  const samePixel = (first, second) =>
    data[first] === data[second] &&
    data[first + 1] === data[second + 1] &&
    data[first + 2] === data[second + 2] &&
    data[first + 3] === data[second + 3]

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      if (data[offset + 3] === 0) continue

      if (x + 1 < width) {
        const right = offset + 4
        if (data[right + 3] !== 0) {
          eligibleNeighborPairs += 1
          if (samePixel(offset, right)) identicalNeighborPairs += 1
        }
      }

      if (y + 1 < height) {
        const down = offset + width * 4
        if (data[down + 3] !== 0) {
          eligibleNeighborPairs += 1
          if (samePixel(offset, down)) identicalNeighborPairs += 1
        }
      }

      if (x + 1 >= width || y + 1 >= height) continue
      const right = offset + 4
      const down = offset + width * 4
      const diagonal = down + 4
      if (
        data[right + 3] === 0 ||
        data[down + 3] === 0 ||
        data[diagonal + 3] === 0
      ) {
        continue
      }
      opaqueTwoByTwoBlocks += 1
      if (
        samePixel(offset, right) &&
        samePixel(offset, down) &&
        samePixel(offset, diagonal)
      ) {
        solidColorTwoByTwoBlocks += 1
      }
    }
  }

  return {
    measurement:
      'Exact-RGB adjacency on visible pixels; advisory for these hash-locked legacy Gospel references.',
    eligibleNeighborPairs,
    identicalNeighborPairs,
    identicalNeighborRatio:
      eligibleNeighborPairs === 0
        ? 0
        : round(identicalNeighborPairs / eligibleNeighborPairs),
    opaqueTwoByTwoBlocks,
    solidColorTwoByTwoBlocks,
    solidColorTwoByTwoRatio:
      opaqueTwoByTwoBlocks === 0
        ? 0
        : round(solidColorTwoByTwoBlocks / opaqueTwoByTwoBlocks),
  }
}

const pixelsDiffer = (first, second, offset) =>
  first[offset] !== second[offset] ||
  first[offset + 1] !== second[offset + 1] ||
  first[offset + 2] !== second[offset + 2] ||
  first[offset + 3] !== second[offset + 3]

const maskBounds = (mask, width, height) => {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX === -1) return null
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

const connectedComponents = (mask, width, height) => {
  const visited = new Uint8Array(mask.length)
  const components = []

  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || visited[start] !== 0) continue
    const queue = [start]
    let queueIndex = 0
    let pixels = 0
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    visited[start] = 1

    while (queueIndex < queue.length) {
      const current = queue[queueIndex]
      queueIndex += 1
      const x = current % width
      const y = Math.floor(current / width)
      pixels += 1
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
          if (deltaX === 0 && deltaY === 0) continue
          const nextX = x + deltaX
          const nextY = y + deltaY
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
            continue
          }
          const next = nextY * width + nextX
          if (mask[next] === 0 || visited[next] !== 0) continue
          visited[next] = 1
          queue.push(next)
        }
      }
    }

    components.push({
      pixels,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      },
    })
  }

  return components.sort((first, second) => second.pixels - first.pixels)
}

const extractPatch = (data, canvasWidth, rect) => {
  const patch = Buffer.alloc(rect.width * rect.height * 4)
  let targetOffset = 0
  for (let y = rect.y; y < rectEndY(rect); y += 1) {
    for (let x = rect.x; x < rectEndX(rect); x += 1) {
      const sourceOffset = (y * canvasWidth + x) * 4
      data.copy(patch, targetOffset, sourceOffset, sourceOffset + 4)
      targetOffset += 4
    }
  }
  return patch
}

const hashOutsideRect = (data, width, height, rect) => {
  const hash = createHash('sha256')
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rectContainsPoint(rect, x, y)) continue
      const offset = (y * width + x) * 4
      hash.update(data.subarray(offset, offset + 4))
    }
  }
  return hash.digest('hex')
}

const inspectFrameDiff = ({
  reference,
  candidate,
  motionEnvelope,
  unionMask,
}) => {
  const { width, height } = reference.info
  const mask = new Uint8Array(width * height)
  let changedPixels = 0
  let visibleChangesOutsideEnvelope = 0
  let hiddenTransparentRgbChangesOutsideEnvelope = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x
      const offset = pixelIndex * 4
      if (pixelsDiffer(reference.canonical, candidate.canonical, offset)) {
        mask[pixelIndex] = 1
        unionMask[pixelIndex] = 1
        changedPixels += 1
        if (!rectContainsPoint(motionEnvelope, x, y)) {
          visibleChangesOutsideEnvelope += 1
        }
      }

      if (
        !rectContainsPoint(motionEnvelope, x, y) &&
        pixelsDiffer(reference.raw, candidate.raw, offset) &&
        reference.raw[offset + 3] === 0 &&
        candidate.raw[offset + 3] === 0
      ) {
        hiddenTransparentRgbChangesOutsideEnvelope += 1
      }
    }
  }

  const components = connectedComponents(mask, width, height)
  return {
    changedPixels,
    bounds: maskBounds(mask, width, height),
    connectedComponents: components.length,
    componentBounds: components.map((component) => component.bounds),
    visibleChangesOutsideEnvelope,
    hiddenTransparentRgbChangesOutsideEnvelope,
  }
}

const loadFrame = async (family, state) => {
  const filename = sourceFilename(family.id, state.id)
  const absolute = path.join(SOURCE_ROOT, filename)
  const fileBytes = await readFile(absolute)
  const metadata = await sharp(fileBytes, {
    failOn: 'error',
    limitInputPixels: false,
  }).metadata()
  const decoded = await sharp(fileBytes, {
    failOn: 'error',
    limitInputPixels: false,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const raw = Buffer.from(decoded.data)
  const canonical = canonicalizeTransparentRgb(raw)
  const palette = inspectPalette(raw)

  return {
    id: state.id,
    label: state.label,
    absolute,
    relative: sourceRelativePath(family.id, state.id),
    fileBytes,
    sha256: sha256(fileBytes),
    metadata,
    info: decoded.info,
    raw,
    canonical,
    palette,
    evidence: {
      bytes: fileBytes.length,
      sha256: sha256(fileBytes),
      format: metadata.format ?? null,
      colorSpace: metadata.space ?? null,
      channels: decoded.info.channels,
      depth: metadata.depth ?? null,
      indexedPalette: Boolean(metadata.isPalette),
      hasAlpha: Boolean(metadata.hasAlpha),
      width: decoded.info.width,
      height: decoded.info.height,
      alpha: inspectAlpha(raw),
      alphaBounds: inspectAlphaBounds(
        raw,
        decoded.info.width,
        decoded.info.height,
      ),
      visiblePaletteColors: palette.size,
      pixelClustering: inspectPixelClustering(
        raw,
        decoded.info.width,
        decoded.info.height,
      ),
    },
  }
}

const createMotionPanel = async (family, frames, unionMask) => {
  const reference = frames[0]
  const { width, height } = reference.info
  const overlay = Buffer.alloc(width * height * 4)
  for (let index = 0; index < unionMask.length; index += 1) {
    if (unionMask[index] === 0) continue
    const offset = index * 4
    overlay[offset] = 255
    overlay[offset + 1] = 48
    overlay[offset + 2] = 48
    overlay[offset + 3] = 178
  }

  const envelope = family.motionEnvelope
  const root = family.rootPatch
  const sign = family.signPatch
  const svg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${envelope.x}" y="${envelope.y}" width="${envelope.width}" height="${envelope.height}"
        fill="none" stroke="#ffd60a" stroke-width="8"/>
      <rect x="${root.x}" y="${root.y}" width="${root.width}" height="${root.height}"
        fill="none" stroke="#32f56f" stroke-width="8"/>
      <rect x="${sign.x}" y="${sign.y}" width="${sign.width}" height="${sign.height}"
        fill="none" stroke="#50b7ff" stroke-width="8"/>
    </svg>
  `)

  const annotated = await sharp(reference.fileBytes)
    .composite([
      {
        input: overlay,
        raw: { width, height, channels: 4 },
        blend: 'over',
      },
      { input: svg, blend: 'over' },
    ])
    .png()
    .toBuffer()

  const panelWidth = 360
  const panelHeight = 445
  const labelHeight = 54
  const art = await sharp(annotated)
    .resize(panelWidth - 20, panelHeight - labelHeight - 12, {
      fit: 'contain',
      position: 'centre',
      kernel: sharp.kernel.nearest,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
  const label = Buffer.from(`
    <svg width="${panelWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#111218"/>
      <text x="12" y="23" font-family="monospace" font-size="18" font-weight="700" fill="#ffffff">${family.label}</text>
      <text x="12" y="43" font-family="monospace" font-size="10.5">
        <tspan fill="#ff5555">RED motion</tspan><tspan fill="#c9cad1"> · </tspan>
        <tspan fill="#ffd60a">YEL envelope</tspan><tspan fill="#c9cad1"> · </tspan>
        <tspan fill="#32f56f">GRN root</tspan><tspan fill="#c9cad1"> · </tspan>
        <tspan fill="#50b7ff">BLU sign</tspan>
      </text>
    </svg>
  `)

  return sharp({
    create: {
      width: panelWidth,
      height: panelHeight,
      channels: 4,
      background: { r: 255, g: 0, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: label, left: 0, top: 0 },
      { input: art, left: 10, top: labelHeight + 6 },
    ])
    .png({ adaptiveFiltering: false, compressionLevel: 9 })
    .toBuffer()
}

const analyzeFamily = async (family) => {
  const errors = []
  const notes = []
  const frames = []
  for (const state of STATES) frames.push(await loadFrame(family, state))

  if (!validateRect(family.motionEnvelope, family.expectedCanvas)) {
    errors.push('Configured motion envelope is outside the expected canvas.')
  }
  if (!validateRect(family.rootPatch, family.expectedCanvas)) {
    errors.push('Configured root patch is outside the expected canvas.')
  }
  if (!validateRect(family.signPatch, family.expectedCanvas)) {
    errors.push('Configured sign patch is outside the expected canvas.')
  }
  if (rectsOverlap(family.motionEnvelope, family.rootPatch)) {
    errors.push('Root patch overlaps the permitted motion envelope.')
  }
  if (rectsOverlap(family.motionEnvelope, family.signPatch)) {
    errors.push('Protected sign patch overlaps the permitted motion envelope.')
  }

  const reference = frames[0]
  const { width, height } = reference.info
  const unionMask = new Uint8Array(width * height)
  const familyPalette = new Set()

  for (const frame of frames) {
    for (const color of frame.palette) familyPalette.add(color)
    if (frame.sha256 !== family.hashes[frame.id]) {
      errors.push(
        `${frame.id}: SHA-256 changed (${frame.sha256}; expected ${family.hashes[frame.id]}).`,
      )
    }
    if (
      frame.info.width !== family.expectedCanvas.width ||
      frame.info.height !== family.expectedCanvas.height
    ) {
      errors.push(
        `${frame.id}: canvas ${frame.info.width}x${frame.info.height}; expected ${family.expectedCanvas.width}x${family.expectedCanvas.height}.`,
      )
    }
    if (frame.metadata.format !== 'png') {
      errors.push(`${frame.id}: expected PNG, got ${frame.metadata.format}.`)
    }
    if (!frame.metadata.hasAlpha) {
      errors.push(`${frame.id}: missing alpha channel.`)
    }
    if (frame.evidence.alpha.partial !== 0) {
      errors.push(
        `${frame.id}: binary-alpha failure (${frame.evidence.alpha.partial} partial pixels).`,
      )
    }
  }

  const dimensionProfiles = new Set(
    frames.map(
      (frame) =>
        `${frame.info.width}x${frame.info.height}:${frame.info.channels}:${frame.metadata.depth}:${frame.metadata.space}`,
    ),
  )
  if (dimensionProfiles.size !== 1) {
    errors.push('Frame canvas/channel/depth/color-space profiles differ.')
  }

  const alphaBoundsProfiles = new Set(
    frames.map((frame) => JSON.stringify(frame.evidence.alphaBounds)),
  )
  if (alphaBoundsProfiles.size !== 1) {
    errors.push('Visible alpha bounds drift between frames.')
  }

  const diffs = []
  for (const candidate of frames.slice(1)) {
    const diff = inspectFrameDiff({
      reference,
      candidate,
      motionEnvelope: family.motionEnvelope,
      unionMask,
    })
    diffs.push({ state: candidate.id, ...diff })
    if (diff.visibleChangesOutsideEnvelope !== 0) {
      errors.push(
        `${candidate.id}: ${diff.visibleChangesOutsideEnvelope} visible pixels changed outside the reviewed motion envelope.`,
      )
    }
  }

  const unionComponents = connectedComponents(unionMask, width, height)
  const unionBounds = maskBounds(unionMask, width, height)
  const unionChangedPixels = unionMask.reduce(
    (total, value) => total + value,
    0,
  )
  if (!rectEquals(unionBounds, family.expectedMotionBounds)) {
    errors.push(
      `Motion-union bounds ${JSON.stringify(unionBounds)} do not match the reviewed lock ${JSON.stringify(family.expectedMotionBounds)}.`,
    )
  }
  if (
    unionBounds !== null &&
    !rectContainsRect(family.motionEnvelope, unionBounds)
  ) {
    errors.push('Motion-union bounds escape the reviewed motion envelope.')
  }

  const rootPatchHashes = frames.map((frame) =>
    sha256(extractPatch(frame.raw, width, family.rootPatch)),
  )
  const rootPatchOpaquePixels = frames.map(
    (frame) =>
      inspectAlpha(extractPatch(frame.raw, width, family.rootPatch)).opaque,
  )
  if (new Set(rootPatchHashes).size !== 1) {
    errors.push('Fixed root byte patch differs between frames.')
  }
  if (
    rootPatchOpaquePixels.some(
      (count) => count !== family.rootPatch.width * family.rootPatch.height,
    )
  ) {
    errors.push('Fixed root byte patch is not fully opaque in every frame.')
  }

  const signPatchHashes = frames.map((frame) =>
    sha256(extractPatch(frame.canonical, width, family.signPatch)),
  )
  if (new Set(signPatchHashes).size !== 1) {
    errors.push('Protected sign patch differs between frames.')
  }

  const exteriorHashes = frames.map((frame) =>
    hashOutsideRect(frame.canonical, width, height, family.motionEnvelope),
  )
  if (new Set(exteriorHashes).size !== 1) {
    errors.push(
      'Visible/canonical structure outside the motion envelope differs between frames.',
    )
  }

  const hiddenTransparentRgbChanges = diffs.reduce(
    (total, diff) => total + diff.hiddenTransparentRgbChangesOutsideEnvelope,
    0,
  )
  if (hiddenTransparentRgbChanges > 0) {
    notes.push(
      `${hiddenTransparentRgbChanges} raw RGB payload pixels differ while fully transparent outside the envelope; alpha and canonical visible pixels are unchanged, and source bytes remain preserved.`,
    )
  }

  notes.push(
    'These approved Bazaar2 references are non-indexed 8-bit sRGB PNGs. Palette and exact-RGB cluster metrics are recorded, not quantized or used to rewrite Gospel bytes.',
  )

  const motionPanel = await createMotionPanel(family, frames, unionMask)
  const reportFrames = frames.map((frame) => ({
    state: frame.id,
    source: frame.relative,
    destination: destinationRelativePath(family.id, frame.id),
    ...frame.evidence,
  }))

  return {
    config: family,
    frames,
    motionPanel,
    report: {
      id: family.id,
      label: family.label,
      status: errors.length === 0 ? 'pass' : 'fail',
      errors,
      notes,
      reviewedMotion: family.reviewedMotion,
      canvas: {
        expected: family.expectedCanvas,
        intrinsicProfiles: [...dimensionProfiles],
        alphaBoundsProfiles: [...alphaBoundsProfiles].map((value) =>
          JSON.parse(value),
        ),
        pass: dimensionProfiles.size === 1 && alphaBoundsProfiles.size === 1,
      },
      alpha: {
        mode: 'binary',
        pass: frames.every((frame) => frame.evidence.alpha.partial === 0),
      },
      palette: {
        mode: 'measured legacy full-RGB reference',
        enforcement: 'SHA-256 source lock; no quantization',
        unionVisibleColors: familyPalette.size,
        frameVisibleColorRange: {
          min: Math.min(
            ...frames.map((frame) => frame.evidence.visiblePaletteColors),
          ),
          max: Math.max(
            ...frames.map((frame) => frame.evidence.visiblePaletteColors),
          ),
        },
      },
      pixelClustering: {
        mode: 'advisory exact-RGB clustering measurement',
        identicalNeighborRatioRange: {
          min: Math.min(
            ...frames.map(
              (frame) => frame.evidence.pixelClustering.identicalNeighborRatio,
            ),
          ),
          max: Math.max(
            ...frames.map(
              (frame) => frame.evidence.pixelClustering.identicalNeighborRatio,
            ),
          ),
        },
        solidColorTwoByTwoRatioRange: {
          min: Math.min(
            ...frames.map(
              (frame) => frame.evidence.pixelClustering.solidColorTwoByTwoRatio,
            ),
          ),
          max: Math.max(
            ...frames.map(
              (frame) => frame.evidence.pixelClustering.solidColorTwoByTwoRatio,
            ),
          ),
        },
      },
      motion: {
        reviewedEnvelope: family.motionEnvelope,
        expectedUnionBounds: family.expectedMotionBounds,
        actualUnionBounds: unionBounds,
        unionChangedPixels,
        connectedComponents: unionComponents.length,
        components: unionComponents,
        perFrame: diffs,
        visibleChangesOutsideEnvelope: diffs.reduce(
          (total, diff) => total + diff.visibleChangesOutsideEnvelope,
          0,
        ),
        hiddenTransparentRgbChangesOutsideEnvelope: hiddenTransparentRgbChanges,
        pass:
          rectEquals(unionBounds, family.expectedMotionBounds) &&
          diffs.every((diff) => diff.visibleChangesOutsideEnvelope === 0),
      },
      protectedStructure: {
        exteriorCanonicalSha256: exteriorHashes[0],
        exteriorHashesIdentical: new Set(exteriorHashes).size === 1,
        signPatch: family.signPatch,
        signPatchSha256: signPatchHashes[0],
        signPatchHashesIdentical: new Set(signPatchHashes).size === 1,
        pass:
          new Set(exteriorHashes).size === 1 &&
          new Set(signPatchHashes).size === 1,
      },
      rootRegistration: {
        patch: family.rootPatch,
        meaning: family.rootPatchMeaning,
        decodedRgbaSha256: rootPatchHashes[0],
        opaquePixels: rootPatchOpaquePixels[0],
        expectedPixels: family.rootPatch.width * family.rootPatch.height,
        hashesIdentical: new Set(rootPatchHashes).size === 1,
        pass:
          new Set(rootPatchHashes).size === 1 &&
          rootPatchOpaquePixels.every(
            (count) =>
              count === family.rootPatch.width * family.rootPatch.height,
          ),
      },
      placement: {
        noIntrinsicRescale: dimensionProfiles.size === 1,
        noCropDrift: alphaBoundsProfiles.size === 1,
        fixedCanvas: family.expectedCanvas,
        pass: dimensionProfiles.size === 1 && alphaBoundsProfiles.size === 1,
        scope:
          'File-level proof only; runtime CSS/DOM is intentionally outside this audit.',
      },
      sourceHashesLocked: frames.every(
        (frame) => frame.sha256 === family.hashes[frame.id],
      ),
      frames: reportFrames,
    },
  }
}

const fileState = async (absolute, expectedHash) => {
  try {
    const bytes = await readFile(absolute)
    const actualHash = sha256(bytes)
    return {
      status: actualHash === expectedHash ? 'exact' : 'conflict',
      sha256: actualHash,
      bytes: bytes.length,
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { status: 'missing', sha256: null, bytes: null }
    }
    throw error
  }
}

const promoteFamily = async (analysis) => {
  const family = analysis.config
  const targetDirectory = path.join(DESTINATION_ROOT, family.id, 'frames')
  const preflight = []
  for (const frame of analysis.frames) {
    const absolute = path.join(targetDirectory, `${frame.id}.png`)
    preflight.push({
      state: frame.id,
      absolute,
      expectedHash: frame.sha256,
      before: await fileState(absolute, frame.sha256),
    })
  }

  if (preflight.some((entry) => entry.before.status === 'conflict')) {
    return {
      status: 'conflict',
      files: preflight.map((entry) => ({
        state: entry.state,
        destination: destinationRelativePath(family.id, entry.state),
        ...entry.before,
      })),
    }
  }

  if (shouldPromote && analysis.report.status === 'pass') {
    await mkdir(targetDirectory, { recursive: true })
    for (const entry of preflight) {
      if (entry.before.status === 'exact') continue
      const source = path.join(
        SOURCE_ROOT,
        sourceFilename(family.id, entry.state),
      )
      await copyFile(source, entry.absolute)
    }
  }

  const files = []
  for (const entry of preflight) {
    const after = await fileState(entry.absolute, entry.expectedHash)
    files.push({
      state: entry.state,
      destination: destinationRelativePath(family.id, entry.state),
      ...after,
    })
  }
  const exactFiles = files.filter((entry) => entry.status === 'exact').length
  return {
    status:
      analysis.report.status !== 'pass'
        ? 'skipped-source-failure'
        : exactFiles === STATES.length
          ? 'exact'
          : shouldPromote
            ? 'failed'
            : 'not-promoted',
    exactFiles,
    files,
  }
}

const createContactCell = async (family, frame) => {
  const width = 280
  const height = 360
  const labelHeight = 48
  const art = await sharp(frame.fileBytes)
    .resize(width - 16, height - labelHeight - 12, {
      fit: 'contain',
      position: 'centre',
      kernel: sharp.kernel.nearest,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
  const label = Buffer.from(`
    <svg width="${width}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#111218"/>
      <text x="12" y="20" font-family="monospace" font-size="16" font-weight="700" fill="#ffffff">${family.label}</text>
      <text x="12" y="39" font-family="monospace" font-size="13" fill="#c9cad1">${frame.label}</text>
    </svg>
  `)
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 0, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: label, left: 0, top: 0 },
      { input: art, left: 8, top: labelHeight + 6 },
    ])
    .png({ adaptiveFiltering: false, compressionLevel: 9 })
    .toBuffer()
}

const createContactSheet = async (analyses) => {
  const cellWidth = 280
  const cellHeight = 360
  const cells = []
  for (let row = 0; row < analyses.length; row += 1) {
    const analysis = analyses[row]
    for (let column = 0; column < analysis.frames.length; column += 1) {
      cells.push({
        input: await createContactCell(
          analysis.config,
          analysis.frames[column],
        ),
        left: column * cellWidth,
        top: row * cellHeight,
      })
    }
  }
  const output = await sharp({
    create: {
      width: STATES.length * cellWidth,
      height: analyses.length * cellHeight,
      channels: 4,
      background: { r: 17, g: 18, b: 24, alpha: 1 },
    },
  })
    .composite(cells)
    .png({ adaptiveFiltering: false, compressionLevel: 9 })
    .toBuffer()
  await writeFile(CONTACT_SHEET, output)
  return { bytes: output.length, sha256: sha256(output) }
}

const createMotionAudit = async (analyses) => {
  const panelWidth = 360
  const panelHeight = 445
  const output = await sharp({
    create: {
      width: analyses.length * panelWidth,
      height: panelHeight,
      channels: 4,
      background: { r: 17, g: 18, b: 24, alpha: 1 },
    },
  })
    .composite(
      analyses.map((analysis, index) => ({
        input: analysis.motionPanel,
        left: index * panelWidth,
        top: 0,
      })),
    )
    .png({ adaptiveFiltering: false, compressionLevel: 9 })
    .toBuffer()
  await writeFile(MOTION_AUDIT, output)
  return { bytes: output.length, sha256: sha256(output) }
}

const formatRect = (rect) =>
  rect === null ? 'none' : `${rect.x},${rect.y} ${rect.width}×${rect.height}`

const formatRange = (range, percent = false) => {
  const multiplier = percent ? 100 : 1
  const suffix = percent ? '%' : ''
  return `${round(range.min * multiplier, percent ? 2 : 6)}–${round(range.max * multiplier, percent ? 2 : 6)}${suffix}`
}

const createMarkdown = (report) => {
  const rows = report.families
    .map((family) => {
      const promotion = family.promotion.status
      const palette = `${family.palette.frameVisibleColorRange.min.toLocaleString('en-US')}–${family.palette.frameVisibleColorRange.max.toLocaleString('en-US')}`
      const clustering = formatRange(
        family.pixelClustering.identicalNeighborRatioRange,
        true,
      )
      return `| ${family.label} | ${family.status} | ${family.canvas.expected.width}×${family.canvas.expected.height} | ${palette} | ${clustering} | ${formatRect(family.motion.actualUnionBounds)} / ${family.motion.connectedComponents} | ${family.motion.visibleChangesOutsideEnvelope} | ${family.rootRegistration.hashesIdentical ? 'exact' : 'FAIL'} | ${family.protectedStructure.signPatchHashesIdentical ? 'exact' : 'FAIL'} | ${promotion} |`
    })
    .join('\n')

  const notes = report.families
    .flatMap((family) =>
      family.notes.map((note) => `- **${family.label}:** ${note}`),
    )
    .join('\n')

  const rootRows = report.families
    .map(
      (family) =>
        `| ${family.label} | ${formatRect(family.rootRegistration.patch)} | ${family.rootRegistration.meaning} | \`${family.rootRegistration.decodedRgbaSha256}\` |`,
    )
    .join('\n')

  const errors = report.families
    .flatMap((family) =>
      family.errors.map((error) => `- **${family.label}:** ${error}`),
    )
    .join('\n')

  return `# Bazaar 3 Gospel frame audit

Status: **${report.summary.status.toUpperCase()}** — ${report.summary.passedFamilies}/${report.summary.families} families pass; ${report.summary.exactPromotedFiles}/${report.summary.files} Bazaar 3 destination files are exact source-byte copies.

This audit covers only the five already-approved Bazaar 2 full-frame families: Uses, Papers, Manual, Talks / Video Club, and Games. It does not redesign, regenerate, quantize, crop, rescale, or touch runtime code. The approved source SHA-256 values are locked in the verifier.

[Five-state contact sheet](./gospel-contact-sheet.png) · [motion/envelope/root/sign audit](./gospel-motion-audit.png)

## Gates

| Family | Result | Intrinsic canvas | Visible colors/frame | Exact-RGB neighbor clustering | Motion union / components | Visible pixels outside envelope | Root patch | Sign patch | Promotion |
| --- | --- | ---: | ---: | ---: | --- | ---: | --- | --- | --- |
${rows}

All frames have binary alpha, an identical family canvas/channel/depth/color-space profile, identical alpha bounds, and a byte-identical canonical structure outside the reviewed motion envelope. Therefore there is no file-level per-frame rescale or crop drift.

The red area in the motion audit is the exact canonical visible union of every pixel that changes from idle 1. Yellow is the manually reviewed allowed envelope, green is the fixed opaque root-registration byte patch, and blue is the protected sign patch. A changed visible pixel outside yellow is a hard failure.

## Root registration locks

| Family | Patch | Semantic anchor | Decoded RGBA SHA-256 |
| --- | --- | --- | --- |
${rootRows}

For Uses, Papers, Manual, and Talks, the keeper is occluded by a counter/workbench, so the exact root proof is the opaque contact seam immediately beneath it. Games additionally locks both siblings’ full lower bodies and feet. These baked Gospel frames do not claim that the interior pixels of an articulating torso are immutable; torso/root placement was visually reviewed in the contact sheet, while the root seam, exterior structure, sign, canvas, and crop are machine-locked.

## Raster-profile evidence

These are hash-locked, non-indexed 8-bit sRGB Gospel references with binary alpha. Their high visible-color counts and exact-RGB neighbor/2×2 clustering ratios are reported in JSON instead of being forced through a new palette or 3×3 rewrite. That distinction is deliberate: style normalization belongs to a separately reviewed derived asset, never to this exact-source promotion.

${notes || '- No additional notes.'}

## Failures

${errors || '- None.'}

## Reproduce

\`\`\`sh
node scripts/bazaar3/verify-gospel-frames.mjs --promote
\`\`\`

The command preflights destination conflicts, copies only passing families, and verifies every destination SHA-256 against the approved source bytes.
`
}

const main = async () => {
  await mkdir(REPORT_ROOT, { recursive: true })

  const analyses = []
  for (const family of FAMILY_CONFIGS) {
    analyses.push(await analyzeFamily(family))
  }

  for (const analysis of analyses) {
    analysis.report.promotion = await promoteFamily(analysis)
    if (analysis.report.promotion.status === 'conflict') {
      analysis.report.errors.push(
        'Bazaar3 destination contains at least one non-matching file; nothing was overwritten for this family.',
      )
      analysis.report.status = 'fail'
    } else if (
      shouldPromote &&
      analysis.report.status === 'pass' &&
      analysis.report.promotion.status !== 'exact'
    ) {
      analysis.report.errors.push(
        'Promotion did not produce five exact destination files.',
      )
      analysis.report.status = 'fail'
    }
  }

  const contactSheet = await createContactSheet(analyses)
  const motionAudit = await createMotionAudit(analyses)
  const families = analyses.map((analysis) => analysis.report)
  const exactPromotedFiles = families.reduce(
    (total, family) => total + (family.promotion.exactFiles ?? 0),
    0,
  )
  const passedFamilies = families.filter(
    (family) => family.status === 'pass',
  ).length
  const summary = {
    status:
      passedFamilies === families.length &&
      (!shouldPromote || exactPromotedFiles === families.length * STATES.length)
        ? 'pass'
        : 'fail',
    families: families.length,
    passedFamilies,
    files: families.length * STATES.length,
    exactPromotedFiles,
    visibleChangesOutsideReviewedEnvelopes: families.reduce(
      (total, family) => total + family.motion.visibleChangesOutsideEnvelope,
      0,
    ),
    hiddenTransparentRgbChangesOutsideReviewedEnvelopes: families.reduce(
      (total, family) =>
        total + family.motion.hiddenTransparentRgbChangesOutsideEnvelope,
      0,
    ),
  }
  const report = {
    schemaVersion: 1,
    audit:
      'Bazaar3 exact promotion audit for approved Bazaar2 Gospel full-frame families',
    sourceRoot: 'public/images/bazaar2/assets',
    destinationPattern:
      'public/images/bazaar3/assets/stalls/{family}/frames/{state}.png',
    states: STATES.map((state) => state.id),
    promotionRequested: shouldPromote,
    canonicalComparison:
      'RGBA with RGB zeroed only where alpha is zero; original source/destination file bytes are never rewritten.',
    visualReview:
      'Contact sheet and red/yellow/green/blue motion audit were manually reviewed against approved stall identities.',
    visualArtifacts: {
      contactSheet: {
        file: 'scripts/bazaar3/reports/gospel-contact-sheet.png',
        ...contactSheet,
      },
      motionAudit: {
        file: 'scripts/bazaar3/reports/gospel-motion-audit.png',
        ...motionAudit,
      },
    },
    summary,
    families,
  }

  await writeFile(JSON_REPORT, `${JSON.stringify(report, null, 2)}\n`)
  await writeFile(MARKDOWN_REPORT, createMarkdown(report))

  process.stdout.write(
    [
      `Gospel frame audit: ${summary.status.toUpperCase()}`,
      `Families: ${summary.passedFamilies}/${summary.families} pass`,
      `Visible changes outside envelopes: ${summary.visibleChangesOutsideReviewedEnvelopes}`,
      `Exact Bazaar3 files: ${summary.exactPromotedFiles}/${summary.files}`,
      `Report: ${path.relative(REPO_ROOT, MARKDOWN_REPORT)}`,
      '',
    ].join('\n'),
  )

  if (summary.status !== 'pass') process.exitCode = 1
}

await main()
