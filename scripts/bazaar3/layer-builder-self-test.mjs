#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {
  buildLayers,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  OUTPUT_ART_HEIGHT,
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
} from './build-layers.mjs'

const CHANNELS = 4
const DARK = [22, 25, 33, 255]
const ROBOT = [118, 128, 104, 255]
const REAR = [34, 39, 45, 255]
const KEEPER = [184, 119, 62, 255]
const EFFECT = [123, 91, 164, 255]
const FRONT = [67, 73, 79, 255]
const EDIT_LABEL = [255, 255, 255, 255]
const FRONT_LABEL = [255, 0, 0, 255]

const offset = (x, y, width) => (y * width + x) * CHANNELS

const canvas = (width, height, color = [0, 0, 0, 0]) => {
  const data = Buffer.alloc(width * height * CHANNELS)
  for (let index = 0; index < width * height; index += 1) {
    data.set(color, index * CHANNELS)
  }
  return data
}

const fillRect = (data, canvasWidth, rect, color) => {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      data.set(color, offset(x, y, canvasWidth))
    }
  }
}

const writeLogical = (file, data, width, height) =>
  sharp(data, { raw: { width, height, channels: CHANNELS } })
    .png({
      adaptiveFiltering: false,
      compressionLevel: 9,
      palette: false,
    })
    .toFile(file)

const writeMaster = (file, logical) =>
  sharp(logical, {
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

const writeOutputSprite = (file, logical, width, height) =>
  sharp(logical, { raw: { width, height, channels: CHANNELS } })
    .resize({
      width: width * 3,
      height: height * 3,
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png({
      adaptiveFiltering: false,
      compressionLevel: 9,
      palette: false,
    })
    .toFile(file)

const rgbaHash = async (file) => {
  const data = await sharp(file).ensureAlpha().raw().toBuffer()
  return createHash('sha256').update(data).digest('hex')
}

const run = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'bazaar3-layers-'))
  try {
    const inputs = path.join(root, 'inputs')
    await mkdir(inputs, { recursive: true })

    const master = canvas(LOGICAL_WIDTH, LOGICAL_HEIGHT, DARK)
    fillRect(
      master,
      LOGICAL_WIDTH,
      { x: 96, y: 196, width: 32, height: 32 },
      ROBOT,
    )
    fillRect(
      master,
      LOGICAL_WIDTH,
      { x: 104, y: 212, width: 7, height: 3 },
      FRONT,
    )

    const background = canvas(LOGICAL_WIDTH, LOGICAL_HEIGHT, DARK)
    fillRect(
      background,
      LOGICAL_WIDTH,
      { x: 96, y: 196, width: 32, height: 32 },
      REAR,
    )

    const mask = canvas(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    fillRect(
      mask,
      LOGICAL_WIDTH,
      { x: 96, y: 196, width: 32, height: 32 },
      EDIT_LABEL,
    )
    fillRect(
      mask,
      LOGICAL_WIDTH,
      { x: 104, y: 212, width: 7, height: 3 },
      FRONT_LABEL,
    )

    const keeper = canvas(5, 6)
    fillRect(keeper, 5, { x: 1, y: 1, width: 3, height: 4 }, KEEPER)
    const effect = canvas(2, 2, EFFECT)

    const masterPath = path.join(inputs, 'master.png')
    const backgroundPath = path.join(inputs, 'background.png')
    const maskPath = path.join(inputs, 'mask.png')
    const keeperPath = path.join(inputs, 'keeper.png')
    const effectPath = path.join(inputs, 'effect.png')
    await Promise.all([
      writeMaster(masterPath, master),
      writeMaster(backgroundPath, background),
      writeLogical(maskPath, mask, LOGICAL_WIDTH, LOGICAL_HEIGHT),
      writeLogical(keeperPath, keeper, 5, 6),
      writeOutputSprite(effectPath, effect, 2, 2),
    ])

    const acceptedMasterHash = await rgbaHash(masterPath)
    const passingDir = path.join(root, 'passing')
    const passing = await buildLayers({
      masterPath,
      backgroundPath,
      backgroundSpace: 'output',
      maskPath,
      outputDir: passingDir,
      expectMasterSha256: acceptedMasterHash,
      keeper: {
        file: keeperPath,
        space: 'logical',
        placement: {
          anchor: { x: 109, y: 205 },
          sourceAnchor: { x: 2, y: 2 },
        },
        expectedBbox: { x: 108, y: 204, width: 3, height: 4 },
      },
      effect: {
        file: effectPath,
        space: 'output',
        placement: { at: { x: 115, y: 205 } },
        expectedBbox: { x: 115, y: 205, width: 2, height: 2 },
      },
    })

    assert.equal(passing.status, 'pass')
    assert.equal(passing.errors.length, 0)
    assert.equal(passing.preservation.rear.changedPixels, 0)
    assert.equal(passing.preservation.composite.changedPixels, 0)
    assert.equal(passing.outputs.composite.outsideMaskChanges.changedPixels, 0)
    assert.equal(passing.placements.keeper.bboxMatches, true)
    assert.deepEqual(passing.placements.keeper.placement.topLeft, {
      x: 107,
      y: 203,
    })
    assert.equal(Object.keys(passing.outputs).length, 5)

    const writtenReport = JSON.parse(
      await readFile(path.join(passingDir, 'layer-build-report.json'), 'utf8'),
    )
    assert.equal(writtenReport.status, 'pass')
    assert.equal(writtenReport.mask.editPixels, 32 * 32)
    assert.equal(writtenReport.mask.frontPixels, 7 * 3)

    const composite = await sharp(path.join(passingDir, 'composite.png'))
      .ensureAlpha()
      .raw()
      .toBuffer()
    const keeperOutputOffset = offset(108 * 3, 204 * 3, OUTPUT_WIDTH)
    assert.deepEqual(
      [...composite.subarray(keeperOutputOffset, keeperOutputOffset + 4)],
      KEEPER,
    )
    const finalRowStart = (OUTPUT_HEIGHT - 1) * OUTPUT_WIDTH * CHANNELS
    assert.ok(composite.subarray(finalRowStart).every((value) => value === 0))

    const rejected = await buildLayers({
      masterPath,
      backgroundPath,
      backgroundSpace: 'output',
      maskPath,
      outputDir: path.join(root, 'rejected'),
      keeper: {
        file: keeperPath,
        space: 'logical',
        placement: { at: { x: 0, y: 0 } },
      },
    })
    assert.equal(rejected.status, 'fail')
    assert.ok(
      rejected.errors.some(
        ({ code }) => code === 'ISOLATED_INPUT_OUTSIDE_MASK',
      ),
    )
    assert.equal(rejected.outputs.composite.outsideMaskChanges.changedPixels, 0)

    console.log(
      'PASS: logical layers built, exact anchor/bbox confirmed, outside-mask master bytes preserved, and invalid placement rejected.',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

await run()
