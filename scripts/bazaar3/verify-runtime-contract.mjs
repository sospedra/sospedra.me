import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const VIEW_PATH = path.join(ROOT, 'app/bazaar3/bazaar3-view.tsx')
const CSS_PATH = path.join(ROOT, 'app/bazaar3/bazaar3.module.css')
const FLOOR_CSS_PATH = path.join(ROOT, 'app/bazaar3/floor-system.module.css')
const FLOOR_MANIFEST_PATH = path.join(
  ROOT,
  'app/bazaar3/floor-system-manifest.ts',
)
const INTEGRATION_MANIFEST_PATH = path.join(
  ROOT,
  'app/bazaar3/integration-manifest.ts',
)

const [view, css, floorCss, floorManifest, integrationManifest] =
  await Promise.all([
    readFile(VIEW_PATH, 'utf8'),
    readFile(CSS_PATH, 'utf8'),
    readFile(FLOOR_CSS_PATH, 'utf8'),
    readFile(FLOOR_MANIFEST_PATH, 'utf8'),
    readFile(INTEGRATION_MANIFEST_PATH, 'utf8'),
  ])

const checks = []
const check = (id, passed, detail) => {
  checks.push({ id, status: passed ? 'pass' : 'fail', detail })
}

const hasAll = (source, values) =>
  values.every((value) => source.includes(value))

check(
  'desktop-composition',
  hasAll(view, [
    "stalls: ['uses', 'papers']",
    "stalls: ['manual', 'console', 'talks']",
    "stalls: ['projects', 'games', 'travel']",
  ]),
  'Three desktop floors preserve the approved tenant order.',
)

check(
  'mobile-composition',
  hasAll(view, [
    "stalls: ['uses', 'papers']",
    "stalls: ['manual', 'talks']",
    "stalls: ['console', 'projects']",
    "stalls: ['games', 'travel']",
  ]),
  'Four mobile floors preserve two stalls plus one continuous stair.',
)

check(
  'mobile-midpoint-exit',
  hasAll(view, [
    'mobileMidfloorDeck',
    'mobileMidfloorContact',
    'mobileMidfloorFascia',
    'mobileMidfloorUnderside',
  ]),
  'The upper mobile stall has a real midpoint deck, contact, fascia and underside.',
)

check(
  'desktop-h-beams',
  view.includes('styles.stallBayBeam') &&
    css.includes('.stallBayBeam') &&
    css.includes('h-beam-vertical.png'),
  'Desktop tenant bays are separated by structural H-beams.',
)

check(
  'manual-production-family',
  view.includes("id === 'manual'\n        ? 'manual-v3'") &&
    !view.includes("id !== 'manual'"),
  'Manual uses the validated five-frame manual-v3 family without a static exception.',
)

check(
  'five-frame-runtime',
  hasAll(view, [
    "stallFrameSrc(id, 'idle-1')",
    "stallFrameSrc(id, 'idle-2')",
    "stallFrameSrc(id, 'hover-1')",
    "stallFrameSrc(id, 'hover-2')",
    "stallFrameSrc(id, 'hover-3')",
  ]),
  'Every runtime stall family declares two idle and three hover frames.',
)

check(
  'dialog-topmost',
  view.includes('createPortal(') &&
    css.includes('z-index: 2147483000') &&
    view.includes('const TYPEWRITER_INTERVAL_MS = 9'),
  'Dialogs are portalled, globally topmost and use the approved fast typewriter.',
)

check(
  'final-floor-no-down',
  view.includes('i === DESKTOP_MARKETS.length - 1') &&
    view.includes('i === MOBILE_MARKETS.length - 1'),
  'The last desktop and mobile floor omit the Down action.',
)

check(
  'production-promotion-gate',
  integrationManifest.includes(
    "return status === 'ready' || (qaMode && status === 'prototype')",
  ),
  'Prototype integration cannot suppress the production fallback outside QA.',
)

check(
  'three-floor-systems',
  hasAll(floorManifest, [
    "id: 'archive-service'",
    "id: 'workshop-media'",
    "id: 'leisure-transit'",
    "integrationId: 'archive-desktop'",
    "integrationId: 'workshop-desktop'",
    "integrationId: 'reclaimed-desktop'",
  ]),
  'All three desktop districts have a typed modular floor system.',
)

const bannedLightingTokens = [
  'color-mix(',
  'mix-blend-mode',
  'radial-gradient',
  'filter: blur',
]
check(
  'exact-floor-lighting',
  bannedLightingTokens.every((token) => !floorCss.includes(token)),
  'Shared floor receivers use exact hard palette swatches without blended fog.',
)

check(
  'desktop-only-floor-system',
  floorCss.includes('@media (max-width: 700px)') &&
    floorCss.includes('.pass {\n    display: none;'),
  'Desktop floor packages do not leak into the existing mobile composition.',
)

check(
  'qa-only-hud',
  view.includes('{qaMode && (') && view.includes('className={styles.hud}'),
  'Development controls stay out of the normal route.',
)

const requiredAssets = [
  'public/images/bazaar3/assets/environment/archive.png',
  'public/images/bazaar3/assets/environment/workshop.png',
  'public/images/bazaar3/assets/environment/reclaimed.png',
  'public/images/bazaar3/assets/architecture/h-beam-horizontal.png',
  'public/images/bazaar3/assets/architecture/h-beam-vertical.png',
  'public/images/bazaar3/assets/architecture/h-beam-joint.png',
  ...['idle-1', 'idle-2', 'hover-1', 'hover-2', 'hover-3'].map(
    (frame) =>
      `public/images/bazaar3/assets/stalls/manual-v3/frames/${frame}.png`,
  ),
]

const missingAssets = []
for (const asset of requiredAssets) {
  try {
    await access(path.join(ROOT, asset))
  } catch {
    missingAssets.push(asset)
  }
}
check(
  'required-assets',
  missingAssets.length === 0,
  missingAssets.length === 0
    ? `${requiredAssets.length} production assets present.`
    : `Missing: ${missingAssets.join(', ')}`,
)

const failed = checks.filter(({ status }) => status === 'fail')
for (const entry of checks) {
  console.log(`${entry.status.toUpperCase()} ${entry.id}: ${entry.detail}`)
}
console.log(
  `Bazaar3 runtime contract: ${failed.length === 0 ? 'PASS' : 'FAIL'} (${checks.length - failed.length}/${checks.length})`,
)

if (failed.length > 0) process.exitCode = 1
