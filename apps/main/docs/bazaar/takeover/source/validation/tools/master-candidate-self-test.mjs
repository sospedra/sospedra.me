#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { verifyMasterCandidate } from './verify-master-candidate.mjs'

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname)
const CONFIG_PATH = path.join(SCRIPT_DIR, 'master-candidate.config.json')
const RUBRIC_PATH = path.join(SCRIPT_DIR, 'master-visual-rubric.json')

const sha256File = async (file) =>
  createHash('sha256')
    .update(await readFile(file))
    .digest('hex')

const hex = (value) => [
  Number.parseInt(value.slice(1, 3), 16),
  Number.parseInt(value.slice(3, 5), 16),
  Number.parseInt(value.slice(5, 7), 16),
  255,
]

const writeCanonicalFixture = async (file, config) => {
  const scale = config.pixelScale
  const logicalWidth = config.croppedCanvas.width / scale
  const logicalHeight = config.croppedCanvas.height / scale
  const logical = Buffer.alloc(logicalWidth * logicalHeight * 4)
  const colors = {
    deepest: hex('#020307'),
    wall: hex('#111923'),
    beam: hex('#1c2731'),
    floor: hex('#2b3741'),
    steel: hex('#414c55'),
    rail: hex('#606970'),
    wood: hex('#6b391c'),
    green: hex('#4b6220'),
    cyan: hex('#126e9b'),
    amber: hex('#df9e32'),
    cream: hex('#cfad7e'),
    violet: hex('#674870'),
  }

  const set = (x, y, color) => {
    logical.set(color, (y * logicalWidth + x) * 4)
  }
  const fill = (x, y, width, height, color) => {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        set(column, row, color)
      }
    }
  }

  for (let y = 0; y < logicalHeight; y += 1) {
    const band =
      y < 9
        ? colors.rail
        : y < 155
          ? colors.wall
          : y < 187
            ? colors.floor
            : y < 195
              ? colors.rail
              : colors.deepest
    fill(0, y, logicalWidth, 1, band)
  }

  fill(0, 30, 27, 120, colors.deepest)
  fill(4, 36, 17, 105, colors.steel)
  fill(31, 32, 118, 120, colors.wood)
  fill(38, 40, 104, 104, colors.green)
  fill(53, 55, 74, 82, colors.wall)
  fill(162, 67, 93, 82, colors.wood)
  fill(173, 77, 72, 64, colors.cyan)
  fill(184, 89, 49, 43, colors.wall)
  fill(268, 30, 117, 122, colors.wood)
  fill(276, 42, 101, 101, colors.deepest)
  fill(288, 50, 77, 84, colors.cream)
  fill(297, 62, 59, 64, colors.wall)
  fill(32, 148, 116, 7, colors.green)
  fill(162, 145, 93, 10, colors.cyan)
  fill(268, 145, 117, 10, colors.amber)
  fill(48, 47, 30, 7, colors.cream)
  fill(179, 72, 44, 6, colors.cream)
  fill(298, 44, 55, 7, colors.cream)
  fill(90, 70, 18, 25, colors.violet)

  const scene = await sharp(logical, {
    raw: {
      width: logicalWidth,
      height: logicalHeight,
      channels: 4,
    },
  })
    .resize(config.croppedCanvas.width, config.croppedCanvas.height, {
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: config.deliveryCanvas.width,
      height: config.deliveryCanvas.height,
      channels: 4,
      background: config.matte,
    },
  })
    .composite([
      {
        input: scene,
        left: config.sceneWindow.x,
        top: config.sceneWindow.y,
      },
    ])
    .png()
    .toFile(file)
}

const passingReview = async ({ candidate, rubric, userApproved = true }) => {
  const candidateSha256 = await sha256File(candidate)
  return {
    schemaVersion: 1,
    candidateSha256,
    reviewer: 'master-candidate-self-test',
    reviewedAt: '2026-01-01T00:00:00.000Z',
    userApprovedSha256: userApproved ? candidateSha256 : null,
    checks: rubric.checks.map((item) => ({
      id: item.id,
      status: 'pass',
      observed: 'Synthetic fixture intentionally satisfies this rubric item.',
      evidence: ['synthetic-fixture'],
      notes: '',
    })),
  }
}

const run = async () => {
  const root = await mkdtemp(
    path.join(tmpdir(), 'bazaar3-master-candidate-self-test-'),
  )
  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'))
  const rubric = JSON.parse(await readFile(RUBRIC_PATH, 'utf8'))

  try {
    const canonical = path.join(root, 'canonical.png')
    await writeCanonicalFixture(canonical, config)
    const canonicalHash = await sha256File(canonical)
    const reviewPath = path.join(root, 'review.json')
    await writeFile(
      reviewPath,
      `${JSON.stringify(
        await passingReview({ candidate: canonical, rubric }),
        null,
        2,
      )}\n`,
    )

    const passing = await verifyMasterCandidate({
      candidate: canonical,
      reviewPath,
      outputDir: path.join(root, 'passing-report'),
    })
    assert.equal(passing.statuses.machine, 'pass')
    assert.equal(passing.statuses.visual, 'pass')
    assert.equal(passing.statuses.candidateAcceptance, 'pass')
    assert.equal(passing.statuses.productionApproval, 'pass')
    assert.equal(await sha256File(canonical), canonicalHash)

    const missingReview = await verifyMasterCandidate({
      candidate: canonical,
      outputDir: path.join(root, 'missing-review-report'),
    })
    assert.equal(missingReview.statuses.machine, 'pass')
    assert.equal(missingReview.statuses.visual, 'not-run')
    assert.equal(missingReview.statuses.candidateAcceptance, 'rejected')

    const failedReview = await passingReview({
      candidate: canonical,
      rubric,
    })
    const styleCheck = failedReview.checks.find((item) => item.id === 'STY-03')
    styleCheck.status = 'fail'
    styleCheck.observed =
      'Synthetic reviewer marks pseudo-pixel illustration drift.'
    const failedReviewPath = path.join(root, 'failed-review.json')
    await writeFile(
      failedReviewPath,
      `${JSON.stringify(failedReview, null, 2)}\n`,
    )
    const visuallyRejected = await verifyMasterCandidate({
      candidate: canonical,
      reviewPath: failedReviewPath,
      outputDir: path.join(root, 'failed-review-report'),
    })
    assert.equal(visuallyRejected.statuses.machine, 'pass')
    assert.equal(visuallyRejected.statuses.visual, 'fail')
    assert.equal(visuallyRejected.statuses.candidateAcceptance, 'rejected')

    const staleReview = await passingReview({
      candidate: canonical,
      rubric,
    })
    const staleReviewPath = path.join(root, 'stale-review.json')
    await writeFile(
      staleReviewPath,
      `${JSON.stringify(staleReview, null, 2)}\n`,
    )
    const changed = path.join(root, 'changed.png')
    const changedScene = await sharp(canonical)
      .composite([
        {
          input: {
            create: {
              width: 3,
              height: 3,
              channels: 4,
              background: '#674870',
            },
          },
          left: config.sceneWindow.x + 120,
          top: config.sceneWindow.y + 120,
        },
      ])
      .png()
      .toBuffer()
    await writeFile(changed, changedScene)
    const stale = await verifyMasterCandidate({
      candidate: changed,
      reviewPath: staleReviewPath,
      outputDir: path.join(root, 'stale-review-report'),
    })
    assert.equal(stale.statuses.machine, 'pass')
    assert.equal(stale.visualReview.hashMatches, false)
    assert.equal(stale.statuses.visual, 'fail')
    assert.equal(stale.statuses.candidateAcceptance, 'rejected')

    const noisy = path.join(root, 'noisy.png')
    const noisyRaw = await sharp(canonical)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    for (
      let y = config.sceneWindow.y;
      y < config.sceneWindow.y + config.sceneWindow.height;
      y += 3
    ) {
      for (
        let x = config.sceneWindow.x;
        x < config.sceneWindow.x + config.sceneWindow.width;
        x += 3
      ) {
        const offset = (y * noisyRaw.info.width + x) * noisyRaw.info.channels
        noisyRaw.data.set(hex('#ffd26b'), offset)
      }
    }
    await sharp(noisyRaw.data, {
      raw: {
        width: noisyRaw.info.width,
        height: noisyRaw.info.height,
        channels: noisyRaw.info.channels,
      },
    })
      .png()
      .toFile(noisy)
    const noisyReport = await verifyMasterCandidate({
      candidate: noisy,
      outputDir: path.join(root, 'noisy-report'),
    })
    assert.equal(noisyReport.statuses.machine, 'fail')
    assert.ok(
      noisyReport.automaticChecks.some(
        (item) => item.id === 'STY-A04' && item.status === 'fail',
      ),
    )

    const wrongDimensions = path.join(root, 'wrong-dimensions.png')
    await sharp(canonical)
      .extract({ left: 0, top: 0, width: 1535, height: 1024 })
      .toFile(wrongDimensions)
    const wrongDimensionsReport = await verifyMasterCandidate({
      candidate: wrongDimensions,
      outputDir: path.join(root, 'wrong-dimensions-report'),
    })
    assert.equal(wrongDimensionsReport.statuses.machine, 'fail')
    assert.equal(wrongDimensionsReport.automaticChecks[0].id, 'DEL-01')
    assert.equal(wrongDimensionsReport.automaticChecks[0].status, 'fail')

    console.log(
      'master-candidate-self-test: PASS (machine, visual, stale-hash, pseudo-pixel and dimension gates)',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

await run()
