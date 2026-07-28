#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { access, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '../..')
const RAW_ROOT = path.join(REPOSITORY_ROOT, 'scripts/bazaar3/sources/approved')
const ASSET_ROOT = path.join(
  REPOSITORY_ROOT,
  'public/images/bazaar3/assets/stalls',
)
const WORK_ROOT = path.join(REPOSITORY_ROOT, 'tmp/bazaar3/v2-frame-build')
const REPORT_ROOT = path.join(REPOSITORY_ROOT, 'scripts/bazaar3/reports/v2')

const PROCESSOR = path.join(SCRIPT_DIRECTORY, 'process-keyed-sprite.mjs')
const REMAPPER = path.join(SCRIPT_DIRECTORY, 'remap-to-master-palette.mjs')
const LOCKER = path.join(SCRIPT_DIRECTORY, 'lock-cel-motion.mjs')
const MASK_BUILDER = path.join(SCRIPT_DIRECTORY, 'create-v2-motion-masks.mjs')
const familyFlagIndex = process.argv.indexOf('--family')
const requestedFamily =
  familyFlagIndex === -1 ? null : process.argv[familyFlagIndex + 1]

const FAMILIES = [
  {
    id: 'console',
    colors: '18',
    brightness: '0.82',
    fit: 'contain',
    position: 'south',
    trim: true,
    frames: {
      'idle-2': 'console-i2-raw.png',
      'hover-1': 'console-h1-raw.png',
      'hover-2': 'console-h2-raw.png',
      'hover-3': 'console-h3-raw.png',
    },
  },
  {
    id: 'projects',
    colors: '24',
    brightness: '0.78',
    fit: 'fill',
    position: 'centre',
    trim: false,
    frames: {
      'idle-2': 'projects-i2-raw.png',
      'hover-1': 'projects-h1-raw.png',
      'hover-2': 'projects-h2-raw.png',
      'hover-3': 'projects-h3-raw.png',
    },
  },
  {
    id: 'travel',
    colors: '20',
    brightness: '0.82',
    fit: 'contain',
    position: 'south',
    trim: true,
    frames: {
      'idle-2': 'travel-i2-raw.png',
      'hover-1': 'travel-h1-raw.png',
      'hover-2': 'travel-h2-raw.png',
      'hover-3': 'travel-h3-raw.png',
    },
  },
]

const invoke = async (script, args) => {
  const { stdout, stderr } = await run(process.execPath, [script, ...args], {
    cwd: REPOSITORY_ROOT,
    maxBuffer: 1024 * 1024 * 8,
  })
  if (stdout.trim()) process.stdout.write(stdout)
  if (stderr.trim()) process.stderr.write(stderr)
}

await mkdir(WORK_ROOT, { recursive: true })
await mkdir(REPORT_ROOT, { recursive: true })
await invoke(MASK_BUILDER, [])

const selectedFamilies = requestedFamily
  ? FAMILIES.filter((family) => family.id === requestedFamily)
  : FAMILIES
if (selectedFamilies.length === 0) {
  throw new Error(
    `Unknown --family ${requestedFamily}; expected console, projects or travel`,
  )
}

for (const family of selectedFamilies) {
  const familyAssetRoot = path.join(ASSET_ROOT, `${family.id}-v2`)
  const frameRoot = path.join(familyAssetRoot, 'frames')
  const maskRoot = path.join(familyAssetRoot, 'masks')
  const familyWorkRoot = path.join(WORK_ROOT, family.id)
  const familyReportRoot = path.join(REPORT_ROOT, family.id)
  const master = path.join(frameRoot, 'idle-1.png')

  await Promise.all([
    mkdir(frameRoot, { recursive: true }),
    mkdir(familyWorkRoot, { recursive: true }),
    mkdir(familyReportRoot, { recursive: true }),
    access(master),
  ])

  for (const [state, rawFilename] of Object.entries(family.frames)) {
    const raw = path.join(RAW_ROOT, rawFilename)
    const processed = path.join(familyWorkRoot, `${state}-processed.png`)
    const paletteLocked = path.join(
      familyWorkRoot,
      `${state}-master-palette.png`,
    )
    const output = path.join(frameRoot, `${state}.png`)
    const mask = path.join(maskRoot, `${state}.png`)
    const remapReport = path.join(familyReportRoot, `${state}-palette.json`)
    const lockReport = path.join(familyReportRoot, `${state}-lock.json`)

    await Promise.all([access(raw), access(mask)])

    const processingArgs = [
      '--input',
      raw,
      '--output',
      processed,
      '--logical-width',
      '320',
      '--logical-height',
      '421',
      '--scale',
      '3',
      '--final-height',
      '1264',
      '--colors',
      family.colors,
      '--brightness',
      family.brightness,
      '--fit',
      family.fit,
      '--position',
      family.position,
      '--global-key',
      'true',
    ]
    if (family.trim) processingArgs.push('--trim', 'true')

    await invoke(PROCESSOR, processingArgs)
    await invoke(REMAPPER, [
      '--input',
      processed,
      '--palette-source',
      master,
      '--output',
      paletteLocked,
      '--report',
      remapReport,
    ])
    await invoke(LOCKER, [
      '--base',
      master,
      '--candidate',
      paletteLocked,
      '--mask',
      mask,
      '--output',
      output,
      '--report',
      lockReport,
    ])
  }
}

if (!requestedFamily) {
  await invoke(path.join(SCRIPT_DIRECTORY, 'verify-v2-frames.mjs'), [])
}
