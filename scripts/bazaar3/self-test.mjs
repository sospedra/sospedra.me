#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { sha256File, verifyManifest } from './verify-assets.mjs'

const WIDTH = 12
const HEIGHT = 12
const BLOCK = 3
const TRANSPARENT = [0, 0, 0, 0]
const ROOT = [28, 32, 43, 255]
const AMBER = [211, 139, 62, 255]
const VIOLET = [112, 88, 148, 255]
const CYAN = [33, 144, 166, 255]
const MASK = [255, 255, 255, 255]

const blank = () => {
  const data = Buffer.alloc(WIDTH * HEIGHT * 4)
  for (let offset = 0; offset < data.length; offset += 4) {
    data.set(TRANSPARENT, offset)
  }
  return data
}

const setBlock = (data, x, y, rgba) => {
  for (let blockY = 0; blockY < BLOCK; blockY += 1) {
    for (let blockX = 0; blockX < BLOCK; blockX += 1) {
      const offset = ((y + blockY) * WIDTH + x + blockX) * 4
      data.set(rgba, offset)
    }
  }
}

const writePng = async (file, data) => {
  await sharp(data, {
    raw: { width: WIDTH, height: HEIGHT, channels: 4 },
  })
    .png({
      adaptiveFiltering: false,
      compressionLevel: 9,
      palette: false,
    })
    .toFile(file)
}

const writeJson = (file, value) =>
  writeFile(file, `${JSON.stringify(value, null, 2)}\n`)

const makeFrame = (movingX, movingColor = AMBER) => {
  const data = blank()
  setBlock(data, 3, 9, ROOT)
  setBlock(data, movingX, 3, movingColor)
  return data
}

const makeManifest = (rearHash) => ({
  version: 1,
  assetRoot: './assets',
  reportPath: './pass-report.json',
  defaults: {
    alpha: {
      mode: 'binary',
      requireChannel: true,
      requireTransparent: true,
      requireOpaque: true,
    },
    palette: { maxColors: 4, minAlpha: 1, includeAlpha: false },
    pixelBlock: { size: BLOCK, ignoreFullyTransparent: true },
    forbiddenColors: [
      {
        hex: '#00ff00',
        tolerance: 0,
        maxPixels: 0,
        minAlpha: 1,
      },
      {
        hex: '#ff00ff',
        tolerance: 0,
        maxPixels: 0,
        minAlpha: 1,
      },
    ],
  },
  assets: [
    {
      id: 'rear',
      file: 'rear.png',
      width: WIDTH,
      height: HEIGHT,
      role: 'static-layer',
      sha256: rearHash,
    },
    {
      id: 'idle-1',
      file: 'idle-1.png',
      width: WIDTH,
      height: HEIGHT,
      role: 'animation-cel',
    },
    {
      id: 'idle-2',
      file: 'idle-2.png',
      width: WIDTH,
      height: HEIGHT,
      role: 'animation-cel',
    },
    {
      id: 'hover-1',
      file: 'hover-1.png',
      width: WIDTH,
      height: HEIGHT,
      role: 'animation-cel',
    },
    {
      id: 'motion-mask',
      file: 'motion-mask.png',
      width: WIDTH,
      height: HEIGHT,
      role: 'motion-mask',
      checks: {
        palette: { maxColors: 1, minAlpha: 1, includeAlpha: false },
      },
    },
  ],
  paletteFamilies: [
    {
      id: 'production',
      reference: 'rear',
      mode: 'subset',
      members: ['rear', 'idle-1', 'idle-2', 'hover-1'],
      maxUnionColors: 3,
    },
  ],
  animations: [
    {
      id: 'keeper',
      frames: ['idle-1', 'idle-2', 'hover-1'],
      rootAnchor: {
        x: 4,
        y: 10,
        lockRadius: 1,
        requireOpaque: true,
        excludeFromMotionMask: true,
        description: 'Byte-locked 3x3 contact block',
      },
      lockedRegions: [
        {
          id: 'torso',
          x: 3,
          y: 9,
          width: 3,
          height: 3,
          requireOpaque: true,
          excludeFromMotionMask: true,
          description: 'Opaque fixed-body block',
        },
      ],
      allowedMotionMask: { asset: 'motion-mask', threshold: 255 },
      staticLayers: ['rear'],
    },
  ],
})

const run = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'bazaar3-validator-'))
  const assets = path.join(root, 'assets')

  try {
    await mkdir(assets, { recursive: true })

    const rear = blank()
    setBlock(rear, 0, 9, ROOT)
    setBlock(rear, 3, 9, ROOT)
    setBlock(rear, 6, 9, AMBER)
    setBlock(rear, 9, 9, VIOLET)
    const idle1 = makeFrame(3)
    const idle2 = makeFrame(6)
    const hover1 = makeFrame(3, VIOLET)
    const motionMask = blank()
    setBlock(motionMask, 3, 3, MASK)
    setBlock(motionMask, 6, 3, MASK)

    await Promise.all([
      writePng(path.join(assets, 'rear.png'), rear),
      writePng(path.join(assets, 'idle-1.png'), idle1),
      writePng(path.join(assets, 'idle-2.png'), idle2),
      writePng(path.join(assets, 'hover-1.png'), hover1),
      writePng(path.join(assets, 'motion-mask.png'), motionMask),
    ])

    const rearHash = await sha256File(path.join(assets, 'rear.png'))
    const manifest = makeManifest(rearHash)
    const manifestPath = path.join(root, 'manifest.json')
    await writeJson(manifestPath, manifest)

    const passing = await verifyManifest({ manifestPath })
    assert.equal(passing.status, 'pass')
    assert.equal(passing.summary.passedAssets, 5)
    assert.equal(passing.summary.passedAnimations, 1)
    assert.equal(passing.summary.passedPaletteFamilies, 1)
    assert.equal(passing.summary.errors, 0)

    const writtenReport = JSON.parse(
      await readFile(path.join(root, 'pass-report.json'), 'utf8'),
    )
    assert.equal(writtenReport.status, 'pass')
    assert.equal(
      writtenReport.animations[0].allowedMotionMask.frameDiffs.length,
      2,
    )
    assert.equal(writtenReport.animations[0].rootAnchor.stable, true)
    assert.equal(
      writtenReport.animations[0].rootAnchor.excludedFromMotionMask,
      true,
    )
    assert.equal(writtenReport.animations[0].lockedRegions[0].stable, true)
    assert.equal(writtenReport.animations[0].lockedRegions[0].allOpaque, true)
    assert.equal(
      writtenReport.animations[0].lockedRegions[0].excludedFromMotionMask,
      true,
    )
    assert.equal(writtenReport.paletteFamilies[0].status, 'pass')

    const badMotion = Buffer.from(idle2)
    setBlock(badMotion, 0, 0, VIOLET)
    await writePng(path.join(assets, 'bad-motion.png'), badMotion)
    const badMotionManifest = structuredClone(manifest)
    badMotionManifest.assets[2].file = 'bad-motion.png'
    const badMotionPath = path.join(root, 'bad-motion-manifest.json')
    await writeJson(badMotionPath, badMotionManifest)
    const rejectedMotion = await verifyManifest({
      manifestPath: badMotionPath,
      writeJsonReport: false,
    })
    assert.equal(rejectedMotion.status, 'fail')
    assert.ok(
      rejectedMotion.errors.some(({ code }) => code === 'MOTION_OUTSIDE_MASK'),
    )

    const badRoot = Buffer.from(idle2)
    setBlock(badRoot, 3, 9, VIOLET)
    await writePng(path.join(assets, 'bad-root.png'), badRoot)
    const badRootManifest = structuredClone(manifest)
    badRootManifest.assets[2].file = 'bad-root.png'
    const badRootPath = path.join(root, 'bad-root-manifest.json')
    await writeJson(badRootPath, badRootManifest)
    const rejectedRoot = await verifyManifest({
      manifestPath: badRootPath,
      writeJsonReport: false,
    })
    assert.equal(rejectedRoot.status, 'fail')
    assert.ok(
      rejectedRoot.errors.some(({ code }) => code === 'ROOT_ANCHOR_CHANGED'),
    )
    assert.ok(
      rejectedRoot.errors.some(({ code }) => code === 'LOCKED_REGION_CHANGED'),
    )

    const badPalette = makeFrame(3, CYAN)
    await writePng(path.join(assets, 'bad-palette.png'), badPalette)
    const badPaletteManifest = structuredClone(manifest)
    badPaletteManifest.assets[3].file = 'bad-palette.png'
    const badPalettePath = path.join(root, 'bad-palette-manifest.json')
    await writeJson(badPalettePath, badPaletteManifest)
    const rejectedPalette = await verifyManifest({
      manifestPath: badPalettePath,
      writeJsonReport: false,
    })
    assert.equal(rejectedPalette.status, 'fail')
    assert.ok(
      rejectedPalette.errors.some(
        ({ code }) => code === 'PALETTE_FAMILY_MISMATCH',
      ),
    )

    console.log(
      'PASS: valid fixture accepted; motion, root, torso-lock and family-palette regressions rejected; JSON report verified.',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

await run()
