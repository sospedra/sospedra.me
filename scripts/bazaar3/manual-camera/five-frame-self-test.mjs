import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const WORK_ROOT = path.join(
  ROOT,
  'scripts/bazaar3/manual-camera/reports/five-frame-self-test',
)
const FIXTURE_ROOT = path.join(WORK_ROOT, 'fixtures')
const LOGICAL = Object.freeze({ width: 320, height: 421 })
const DELIVERY = Object.freeze({ width: 960, height: 1264 })
const STATES = Object.freeze([
  'idle-1',
  'idle-2',
  'hover-1',
  'hover-2',
  'hover-3',
])

const colors = Object.freeze({
  background: [16, 20, 24, 255],
  structure: [48, 58, 68, 255],
  sign: [132, 82, 42, 255],
  counter: [92, 54, 34, 255],
  floor: [32, 42, 48, 255],
  robot: [102, 112, 116, 255],
  dark: [8, 10, 12, 255],
  motionA: [64, 204, 218, 255],
  motionB: [232, 168, 58, 255],
})

const setPixel = (data, x, y, color) => {
  const offset = (y * LOGICAL.width + x) * 4
  for (let channel = 0; channel < 4; channel += 1) {
    data[offset + channel] = color[channel]
  }
}

const fillRect = (data, rect, color) => {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      setPixel(data, x, y, color)
    }
  }
}

const makeBase = () => {
  const data = Buffer.alloc(LOGICAL.width * LOGICAL.height * 4)
  fillRect(data, { x: 0, y: 0, width: 320, height: 421 }, colors.background)
  fillRect(data, { x: 0, y: 10, width: 320, height: 28 }, colors.structure)
  fillRect(data, { x: 8, y: 0, width: 30, height: 350 }, colors.structure)
  fillRect(data, { x: 282, y: 0, width: 30, height: 350 }, colors.structure)
  fillRect(data, { x: 72, y: 48, width: 176, height: 45 }, colors.sign)
  fillRect(data, { x: 118, y: 145, width: 84, height: 58 }, colors.robot)
  fillRect(data, { x: 108, y: 160, width: 10, height: 12 }, colors.dark)
  fillRect(data, { x: 202, y: 160, width: 10, height: 12 }, colors.dark)
  fillRect(data, { x: 140, y: 180, width: 10, height: 12 }, colors.dark)
  fillRect(data, { x: 142, y: 203, width: 38, height: 16 }, colors.robot)
  fillRect(data, { x: 40, y: 220, width: 240, height: 70 }, colors.counter)
  fillRect(data, { x: 0, y: 350, width: 320, height: 71 }, colors.floor)
  fillRect(data, { x: 136, y: 106, width: 48, height: 24 }, colors.dark)
  fillRect(data, { x: 140, y: 110, width: 4, height: 4 }, colors.motionA)
  fillRect(data, { x: 176, y: 118, width: 4, height: 4 }, colors.motionB)
  fillRect(data, { x: 12, y: 14, width: 7, height: 5 }, colors.dark)
  fillRect(data, { x: 23, y: 22, width: 4, height: 3 }, colors.motionA)
  fillRect(data, { x: 295, y: 14, width: 7, height: 5 }, colors.dark)
  fillRect(data, { x: 287, y: 23, width: 4, height: 3 }, colors.motionB)
  fillRect(data, { x: 12, y: 382, width: 7, height: 5 }, colors.dark)
  fillRect(data, { x: 23, y: 392, width: 4, height: 3 }, colors.motionB)
  fillRect(data, { x: 295, y: 382, width: 7, height: 5 }, colors.dark)
  fillRect(data, { x: 287, y: 392, width: 4, height: 3 }, colors.motionA)
  return data
}

const animatedFrame = (base, stateIndex) => {
  const data = Buffer.from(base)
  const x = 142 + stateIndex * 5
  const y = 112 + (stateIndex % 2) * 4
  fillRect(
    data,
    { x, y, width: 6, height: 5 },
    stateIndex % 2 === 0 ? colors.motionA : colors.motionB,
  )
  return data
}

const writeDelivery = async (logicalData, filePath) => {
  const core = await sharp(logicalData, {
    raw: { width: LOGICAL.width, height: LOGICAL.height, channels: 4 },
  })
    .resize(960, 1263, {
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer()
  await sharp(core)
    .extend({
      bottom: 1,
      extendWith: 'copy',
    })
    .png()
    .toFile(filePath)
}

const shiftedOneLogicalPixel = (source) => {
  const output = Buffer.alloc(source.length)
  for (let y = 0; y < LOGICAL.height; y += 1) {
    for (let x = 0; x < LOGICAL.width; x += 1) {
      const targetOffset = (y * LOGICAL.width + x) * 4
      if (x === 0) {
        for (let channel = 0; channel < 4; channel += 1) {
          output[targetOffset + channel] = colors.background[channel]
        }
      } else {
        const sourceOffset = (y * LOGICAL.width + x - 1) * 4
        source.copy(output, targetOffset, sourceOffset, sourceOffset + 4)
      }
    }
  }
  return output
}

const croppedAndRescaledOneLogicalPixel = async (source) =>
  (
    await sharp(source, {
      raw: { width: LOGICAL.width, height: LOGICAL.height, channels: 4 },
    })
      .resize(LOGICAL.width - 2, LOGICAL.height - 2, {
        fit: 'fill',
        kernel: sharp.kernel.nearest,
      })
      .extend({
        top: 1,
        bottom: 1,
        left: 1,
        right: 1,
        background: {
          r: colors.background[0],
          g: colors.background[1],
          b: colors.background[2],
          alpha: 1,
        },
      })
      .raw()
      .toBuffer({ resolveWithObject: true })
  ).data

const manifestFor = (variantDirectory) => ({
  version: 1,
  id: `synthetic-${path.basename(variantDirectory)}`,
  label: `Synthetic ${path.basename(variantDirectory)}`,
  logicalCanvas: LOGICAL,
  deliveryCanvas: DELIVERY,
  pixelScale: 3,
  finalRow: { count: 1, mode: 'duplicate-last' },
  baseState: 'idle-1',
  palette: {
    maxColors: Object.keys(colors).length,
    mode: 'subset-of-base',
    includeTransparent: false,
  },
  registrationSearchRadius: 3,
  frames: STATES.map((state, index) => ({
    id: state,
    file: `frames/${state}.png`,
    requireMotion: index !== 0,
    ...(index === 0
      ? {}
      : {
          motionMask: {
            regions: [
              {
                kind: 'rect',
                x: 132,
                y: 102,
                width: 62,
                height: 36,
              },
            ],
          },
        }),
  })),
  lockedRegions: [
    {
      id: 'sign',
      category: 'sign',
      x: 72,
      y: 48,
      width: 176,
      height: 45,
    },
    {
      id: 'counter',
      category: 'counter',
      x: 40,
      y: 220,
      width: 240,
      height: 70,
    },
    {
      id: 'floor',
      category: 'floor',
      x: 0,
      y: 350,
      width: 320,
      height: 71,
    },
    {
      id: 'background-left',
      category: 'background',
      x: 8,
      y: 0,
      width: 30,
      height: 350,
    },
    {
      id: 'background-right',
      category: 'background',
      x: 282,
      y: 0,
      width: 30,
      height: 350,
    },
  ],
  torsoRegions: [{ id: 'torso', x: 118, y: 145, width: 84, height: 58 }],
  rootRegions: [{ id: 'root', x: 142, y: 203, width: 38, height: 16 }],
  shoulderRootRegions: [
    { id: 'left-shoulder', x: 108, y: 160, width: 10, height: 12 },
    { id: 'right-shoulder', x: 202, y: 160, width: 10, height: 12 },
    { id: 'front-shoulder', x: 140, y: 180, width: 10, height: 12 },
  ],
  registrationAnchors: [
    { id: 'top-left', x: 8, y: 10, width: 22, height: 20 },
    { id: 'top-right', x: 290, y: 10, width: 22, height: 20 },
    { id: 'bottom-left', x: 8, y: 380, width: 22, height: 22 },
    { id: 'bottom-right', x: 290, y: 380, width: 22, height: 22 },
  ],
})

const runVariant = async (name, mutate) => {
  const variantDirectory = path.join(FIXTURE_ROOT, name)
  const frameDirectory = path.join(variantDirectory, 'frames')
  const reportDirectory = path.join(WORK_ROOT, name)
  await mkdir(frameDirectory, { recursive: true })

  const base = makeBase()
  const frames = new Map()
  for (const [index, state] of STATES.entries()) {
    frames.set(
      state,
      index === 0 ? Buffer.from(base) : animatedFrame(base, index),
    )
  }
  if (mutate) await mutate(frames)
  for (const state of STATES) {
    await writeDelivery(
      frames.get(state),
      path.join(frameDirectory, `${state}.png`),
    )
  }

  const manifest = manifestFor(variantDirectory)
  const manifestPath = path.join(variantDirectory, 'manifest.json')
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  const verifier = path.join(
    ROOT,
    'scripts/bazaar3/manual-camera/verify-five-frame.mjs',
  )
  await execFileAsync(
    process.execPath,
    [verifier, manifestPath, '--out-dir', reportDirectory, '--no-fail'],
    { cwd: ROOT },
  )
  return JSON.parse(
    await readFile(path.join(reportDirectory, 'five-frame-audit.json'), 'utf8'),
  )
}

const failedChecksFor = (report, state = 'idle-2') =>
  report.frames
    .find((frame) => frame.state === state)
    .checks.filter((entry) => entry.status === 'fail')
    .map((entry) => entry.id)

await mkdir(WORK_ROOT, { recursive: true })

const baseline = await runVariant('baseline')
const shifted = await runVariant('shift-one-logical-pixel', async (frames) => {
  frames.set('idle-2', shiftedOneLogicalPixel(frames.get('idle-2')))
})
const scaled = await runVariant(
  'crop-scale-one-logical-pixel',
  async (frames) => {
    frames.set(
      'idle-2',
      await croppedAndRescaledOneLogicalPixel(frames.get('idle-2')),
    )
  },
)
const mutated = await runVariant(
  'structure-mutation-one-logical-pixel',
  async (frames) => {
    const frame = frames.get('idle-2')
    setPixel(frame, 80, 60, colors.dark)
  },
)

const assertions = [
  {
    id: 'baseline-passes',
    pass: baseline.statuses.overall === 'pass',
    measured: baseline.statuses.overall,
  },
  {
    id: 'one-logical-pixel-shift-fails',
    pass:
      shifted.statuses.overall === 'fail' &&
      failedChecksFor(shifted).includes('whole-frame-translation'),
    measured: failedChecksFor(shifted),
  },
  {
    id: 'one-logical-pixel-crop-scale-fails',
    pass:
      scaled.statuses.overall === 'fail' &&
      failedChecksFor(scaled).includes('whole-frame-scale-crop') &&
      failedChecksFor(scaled).includes('immutable-structure'),
    measured: failedChecksFor(scaled),
  },
  {
    id: 'one-logical-pixel-structure-mutation-fails',
    pass:
      mutated.statuses.overall === 'fail' &&
      failedChecksFor(mutated).includes('immutable-structure') &&
      failedChecksFor(mutated).includes('locked-sign'),
    measured: failedChecksFor(mutated),
  },
]

const status = assertions.every((assertion) => assertion.pass) ? 'pass' : 'fail'
const summary = {
  schemaVersion: 1,
  status,
  generatedAt: new Date().toISOString(),
  assertions,
  reports: {
    baseline: path.join(WORK_ROOT, 'baseline/five-frame-audit.json'),
    shifted: path.join(
      WORK_ROOT,
      'shift-one-logical-pixel/five-frame-audit.json',
    ),
    cropScaled: path.join(
      WORK_ROOT,
      'crop-scale-one-logical-pixel/five-frame-audit.json',
    ),
    structureMutation: path.join(
      WORK_ROOT,
      'structure-mutation-one-logical-pixel/five-frame-audit.json',
    ),
  },
}
await writeFile(
  path.join(WORK_ROOT, 'self-test.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
)
await writeFile(
  path.join(WORK_ROOT, 'self-test.md'),
  `# Five-frame verifier self-test

- Overall: **${status.toUpperCase()}**

| Assertion | Status | Measured |
| --- | --- | --- |
${assertions
  .map(
    (assertion) =>
      `| ${assertion.id} | ${assertion.pass ? 'PASS' : 'FAIL'} | ${JSON.stringify(assertion.measured)} |`,
  )
  .join('\n')}

Each mutation is exactly one logical-pixel operation before 3× delivery. The
scale/crop fixture insets the content by one logical pixel on every edge.
`,
)

console.log(`five-frame-self-test=${status}`)
console.log(path.relative(ROOT, path.join(WORK_ROOT, 'self-test.md')))
if (status === 'fail') process.exitCode = 1
