import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const REPORT_DIR = path.join(
  ROOT,
  'scripts/bazaar3/reports/integration/workshop-v2',
)
const JSON_REPORT = path.join(REPORT_DIR, 'workshop-v2-verification.json')
const MARKDOWN_REPORT = path.join(REPORT_DIR, 'workshop-v2-verification.md')

const FILES = {
  manifest: path.join(ROOT, 'app/bazaar3/integration-manifest.ts'),
  view: path.join(ROOT, 'app/bazaar3/bazaar3-view.tsx'),
  css: path.join(ROOT, 'app/bazaar3/bazaar3.module.css'),
  registration: path.join(REPORT_DIR, 'workshop-registration-audit.json'),
  environment: path.join(
    ROOT,
    'public/images/bazaar3/assets/integration/floors/workshop-desktop/environment-base.png',
  ),
  manual: path.join(
    ROOT,
    'public/images/bazaar3/assets/stalls/manual-v3/frames/idle-1.png',
  ),
  stair: path.join(
    ROOT,
    'public/images/bazaar3/assets/architecture/desktop-core-2-workshop.png',
  ),
  proof: path.join(REPORT_DIR, 'workshop-runtime-proof-1440x597.png'),
}

const STALLS = {
  manual: { width: 960, height: 1264 },
  console: { width: 960, height: 1264 },
  talks: { width: 941, height: 1006 },
}

const PHASES = ['rear', 'light', 'caster', 'contact', 'front']

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

function exactBlockGrid(data, width, height, channels, block) {
  const completeWidth = width - (width % block)
  const completeHeight = height - (height % block)

  for (let y = 0; y < completeHeight; y += block) {
    for (let x = 0; x < completeWidth; x += block) {
      const root = (y * width + x) * channels
      for (let localY = 0; localY < block; localY += 1) {
        for (let localX = 0; localX < block; localX += 1) {
          const offset = ((y + localY) * width + (x + localX)) * channels
          for (let channel = 0; channel < channels; channel += 1) {
            if (data[offset + channel] !== data[root + channel]) return false
          }
        }
      }
    }
  }

  return true
}

async function inspectPng(file) {
  const bytes = await readFile(file)
  const metadata = await sharp(bytes).metadata()
  const stats = await sharp(bytes).stats()
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const colors = new Set()
  const alpha = new Set()

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const pixelAlpha = data[offset + 3]
    alpha.add(pixelAlpha)
    if (pixelAlpha === 0) continue
    colors.add(
      `${data[offset]},${data[offset + 1]},${data[offset + 2]},${pixelAlpha}`,
    )
  }

  return {
    file: path.relative(ROOT, file),
    sha256: sha256(bytes),
    width: metadata.width,
    height: metadata.height,
    opaque: stats.isOpaque,
    colors: colors.size,
    alphaValues: [...alpha].sort((a, b) => a - b),
    exactThreePixelGrid: exactBlockGrid(
      data,
      info.width,
      info.height,
      info.channels,
      3,
    ),
  }
}

const checks = []
const addCheck = (id, passed, detail) =>
  checks.push({ id, status: passed ? 'pass' : 'fail', detail })

await mkdir(REPORT_DIR, { recursive: true })

const [manifest, view, css, registration] = await Promise.all([
  readFile(FILES.manifest, 'utf8'),
  readFile(FILES.view, 'utf8'),
  readFile(FILES.css, 'utf8'),
  readFile(FILES.registration, 'utf8').then(JSON.parse),
])

const environment = await inspectPng(FILES.environment)
const manual = await inspectPng(FILES.manual)
const stair = await inspectPng(FILES.stair)
const proof = await inspectPng(FILES.proof)

addCheck(
  'environment.canvas',
  environment.width === 1248 && environment.height === 597,
  `${environment.width}x${environment.height}`,
)
addCheck(
  'environment.palette',
  environment.colors <= 18,
  `${environment.colors}/18 visible colors`,
)
addCheck(
  'environment.grid',
  environment.exactThreePixelGrid,
  'exact 3x block grid',
)
addCheck('environment.opaque', environment.opaque, 'opaque shared shell')

addCheck(
  'manual.canvas',
  manual.width === 960 && manual.height === 1264,
  `${manual.width}x${manual.height}`,
)
addCheck('manual.palette', manual.colors <= 16, `${manual.colors}/16 colors`)
addCheck('manual.grid', manual.exactThreePixelGrid, 'exact 3x blocks')
addCheck(
  'manual.static-review-frame',
  view.includes("const hasVerifiedAnimationFamily = id !== 'manual'") &&
    view.includes("id === 'manual'\n        ? 'manual-v3'"),
  'approved Manual v3 is never cross-faded with legacy four-arm frames',
)

addCheck(
  'stair.canvas',
  stair.width === 399 && stair.height === 1731,
  `${stair.width}x${stair.height}`,
)
addCheck('stair.palette', stair.colors <= 20, `${stair.colors}/20 colors`)
addCheck('stair.grid', stair.exactThreePixelGrid, 'exact 3x blocks')
addCheck(
  'stair.alpha',
  !stair.opaque && stair.alphaValues.every((value) => [0, 255].includes(value)),
  `binary alpha ${stair.alphaValues.join(',')}`,
)
addCheck(
  'stair.viewport-owned',
  view.includes('desktopStairsServiceBridge') &&
    view.includes('desktopStairsTrenchBridge') &&
    view.includes("'desktop-core-2-workshop'"),
  'real viewport-edge stair owns its collar, rail and trench bridges',
)

addCheck(
  'registration.audit',
  registration.pass === true,
  `${registration.staticChecks.length} static checks and ${registration.viewports.length} viewports`,
)
addCheck(
  'registration.separators',
  view.includes(
    '{stallIndex > 0 && (\n                    <span className={styles.stallBayBeam}',
  ),
  'both desktop separator beams remain in authored floors',
)
addCheck(
  'registration.shared-stage',
  !manifest.includes('workshop-stairs-rear') &&
    !manifest.includes('workshop-stairs-front') &&
    !manifest.includes('connection-rear') &&
    !manifest.includes('manual-receiver'),
  'shared stage contains no stair- or tenant-registered endpoints',
)
addCheck(
  'layers.stall-art',
  /\.stall\s*\{[^}]*z-index:\s*3;/s.test(css),
  'stall art z3',
)
addCheck(
  'layers.separator',
  /\.stallBayBeam\s*\{[^}]*z-index:\s*4;/s.test(css),
  'separator beam z4 above stall edges',
)
addCheck(
  'layers.dialog',
  /\.dialog\s*\{[^}]*z-index:\s*2147483000;/s.test(css),
  'dialog remains globally highest',
)

const localAssets = []
for (const [stallId, dimensions] of Object.entries(STALLS)) {
  for (const phase of PHASES) {
    const file = path.join(
      ROOT,
      `public/images/bazaar3/assets/integration/stalls/${stallId}/desktop/${phase}.png`,
    )
    const asset = await inspectPng(file)
    localAssets.push({ stallId, phase, ...asset })

    addCheck(
      `local.${stallId}.${phase}.canvas`,
      asset.width === dimensions.width && asset.height === dimensions.height,
      `${asset.width}x${asset.height}`,
    )
    addCheck(
      `local.${stallId}.${phase}.alpha`,
      !asset.opaque &&
        asset.alphaValues.every((value) => [0, 255].includes(value)),
      `binary alpha ${asset.alphaValues.join(',')}`,
    )
    addCheck(
      `local.${stallId}.${phase}.palette`,
      asset.colors > 0 && asset.colors <= 12,
      `${asset.colors}/12 visible colors`,
    )
    addCheck(
      `local.${stallId}.${phase}.manifest`,
      manifest.includes(`/stalls/${stallId}/desktop/${phase}.png`),
      'declared as wrapper-local plate',
    )
  }
}

addCheck(
  'proof.canvas',
  proof.width === 1440 && proof.height === 597,
  `${proof.width}x${proof.height}`,
)

const failed = checks.filter((check) => check.status === 'fail')
const status = failed.length === 0 ? 'pass' : 'fail'

const report = {
  status,
  generatedBy: 'scripts/bazaar3/verify-workshop-v2.mjs',
  summary: {
    passed: checks.length - failed.length,
    failed: failed.length,
    total: checks.length,
  },
  scope: {
    streetLevel: 'untouched by this workshop-only verifier',
    mobile: 'intentionally unchanged',
    manualAnimation:
      'static approved review frame; bounded animation cels remain a separate promotion gate',
  },
  assets: { environment, manual, stair, localAssets, proof },
  checks,
}

await writeFile(JSON_REPORT, `${JSON.stringify(report, null, 2)}\n`)
await writeFile(
  MARKDOWN_REPORT,
  `# Workshop v2 verification

Status: **${status.toUpperCase()}**

- Passed: ${report.summary.passed}
- Failed: ${report.summary.failed}
- Total: ${report.summary.total}
- Shared floor: 1248×597, ${environment.colors} colors, exact 3× grid
- Manual review frame: 960×1264, ${manual.colors} colors, exact 3× grid
- Workshop stair core: 399×1731, ${stair.colors} colors, binary alpha, exact 3× grid
- Stall-local plates: ${localAssets.length}, all wrapper-sized
- Registration viewports: 1024, 1280, 1440, 1728 and 1920

## Scope note

The first integrated floor is still a prototype. The approved Manual v3 design
master is mounted as a static review frame so it never cross-fades into the
obsolete four-arm family. Its bounded idle and hover cels remain a separate
promotion gate. Street level and mobile compositions are outside this change.

## Checks

${checks
  .map(
    (check) =>
      `- ${check.status === 'pass' ? 'PASS' : 'FAIL'} \`${check.id}\`: ${check.detail}`,
  )
  .join('\n')}
`,
)

console.log(
  `${status.toUpperCase()} ${report.summary.passed}/${report.summary.total}`,
)
console.log(path.relative(ROOT, MARKDOWN_REPORT))

if (failed.length > 0) process.exitCode = 1
