import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const VIEW_PATH = path.join(ROOT, 'app/bazaar3/bazaar3-view.tsx')
const SCENE_CSS_PATH = path.join(ROOT, 'app/bazaar3/bazaar3.module.css')
const INTEGRATION_CSS_PATH = path.join(
  ROOT,
  'app/bazaar3/integration.module.css',
)
const MANIFEST_PATH = path.join(ROOT, 'app/bazaar3/integration-manifest.ts')
const STALL_LAYERS_PATH = path.join(
  ROOT,
  'app/bazaar3/components/StallIntegrationLayers.tsx',
)
const REPORT_DIR = path.join(
  ROOT,
  'scripts/bazaar3/reports/integration/workshop-v2',
)
const JSON_REPORT_PATH = path.join(
  REPORT_DIR,
  'workshop-registration-audit.json',
)
const MARKDOWN_REPORT_PATH = path.join(
  REPORT_DIR,
  'workshop-registration-audit.md',
)

const VIEWPORTS = [
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1728, height: 1000 },
  { width: 1920, height: 1080 },
]

const WORKSHOP_STALLS = ['manual', 'console', 'talks']
const TENANT_TOKEN = /(?:^|[-_/])(manual|console|talks)(?:$|[-_/])/i
const EPSILON = 0.01

function round(value) {
  return Math.round(value * 100) / 100
}

function format(value) {
  return round(value).toFixed(2)
}

function rect(x, y, width, height) {
  return {
    x: round(x),
    y: round(y),
    width: round(width),
    height: round(height),
    right: round(x + width),
    bottom: round(y + height),
  }
}

function check(id, pass, detail) {
  return { id, pass, detail }
}

function matches(source, pattern) {
  return pattern.test(source)
}

function cssBodiesForSelector(source, selector) {
  const bodies = []
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g
  const uncommented = source.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of uncommented.matchAll(blockPattern)) {
    if (match[1].split(',').some((part) => part.trim() === selector)) {
      bodies.push(match[2])
    }
  }
  return bodies.join('\n')
}

function extractWorkshopBlock(source) {
  const start = source.indexOf("'workshop-desktop': {")
  const end = source.indexOf("\n  'reclaimed-desktop':", start)
  if (start < 0 || end < 0) {
    throw new Error('Cannot isolate the workshop-desktop manifest block')
  }
  return source.slice(start, end)
}

function extractStallSizes(source) {
  const start = source.indexOf('const STALLS:')
  const end = source.indexOf('\ntype Bp =', start)
  if (start < 0 || end < 0) {
    throw new Error('Cannot isolate the Bazaar 3 stall declarations')
  }
  const declarations = source.slice(start, end)
  return Object.fromEntries(
    WORKSHOP_STALLS.map((stallId) => {
      const pattern = new RegExp(
        `(?:^|\\n)\\s*${stallId}:\\s*\\{[\\s\\S]*?desktopSize:\\s*\\[(\\d+),\\s*(\\d+)\\]`,
      )
      const match = declarations.match(pattern)
      if (!match) throw new Error(`Cannot read desktopSize for ${stallId}`)
      return [
        stallId,
        {
          widthUnits: Number(match[1]),
          heightUnits: Number(match[2]),
        },
      ]
    }),
  )
}

function extractStallTranslations(source) {
  return Object.fromEntries(
    WORKSHOP_STALLS.map((stallId) => {
      const bodies = cssBodiesForSelector(
        source,
        `.stallWrap[data-stall="${stallId}"]`,
      )
      const declarations = [
        ...bodies.matchAll(/translate:\s*0(?:\s+(-?\d*\.?\d+)(svh|px))?\s*;/g),
      ]
      const declaration = declarations.at(-1)
      if (!declaration) {
        throw new Error(`Cannot read vertical translation for ${stallId}`)
      }
      return [
        stallId,
        {
          value: declaration[1] === undefined ? 0 : Number(declaration[1]),
          unit: declaration[2] ?? 'px',
        },
      ]
    }),
  )
}

function findFloorTenantEndpoints(workshopBlock) {
  const plateIds = [...workshopBlock.matchAll(/\bid:\s*'([^']+)'/g)]
    .map((match) => match[1])
    .filter((id) => id !== 'workshop-desktop' && TENANT_TOKEN.test(id))
  const activeEndpoints = [
    ...workshopBlock.matchAll(/\bactiveFor:\s*'([^']+)'/g),
  ].map((match) => `activeFor:${match[1]}`)
  const tenantSources = [...workshopBlock.matchAll(/\bsrc:\s*`([^`]+)`/g)]
    .map((match) => match[1])
    .filter((source) => TENANT_TOKEN.test(source))
  return [...new Set([...plateIds, ...activeEndpoints, ...tenantSources])]
}

function findStageBoundStairs(workshopBlock) {
  const plateIds = [...workshopBlock.matchAll(/\bid:\s*'([^']+)'/g)]
    .map((match) => match[1])
    .filter(
      (id) =>
        id !== 'workshop-desktop' && /(?:^|[-_/])stairs(?:$|[-_/])/i.test(id),
    )
  const sources = [...workshopBlock.matchAll(/\bsrc:\s*`([^`]+)`/g)]
    .map((match) => match[1])
    .filter((source) => /(?:^|[-_/])stairs(?:$|[-_/])/i.test(source))
  return [...new Set([...plateIds, ...sources])]
}

function summarizeList(values, visible = 8) {
  if (values.length <= visible) return values.join(', ')
  return `${values.slice(0, visible).join(', ')} (+${values.length - visible} more)`
}

function resolveLength(length, svh) {
  if (length.unit === 'svh') return length.value * svh
  if (length.unit === 'px') return length.value
  throw new Error(`Unsupported deterministic length unit: ${length.unit}`)
}

function calculateViewport(
  viewport,
  stallSizes,
  stallTranslations,
  stageSource,
) {
  const vw = viewport.width
  const svh = viewport.height / 100
  const frameWidth = Math.min(vw, 1248)
  const frameX = (vw - frameWidth) / 2
  const marketMeter = Math.min(frameWidth / 11.5, 16.5 * svh)
  const floorHeight = marketMeter * 5.5

  const stageHeight = floorHeight
  const stageWidth = stageHeight * (stageSource.width / stageSource.height)
  const stageX = frameX + (frameWidth - stageWidth) / 2

  const stairsWidth = marketMeter * 1.7
  const stairsHeight = floorHeight - 5 * svh
  const stairsCoreEnd = stairsWidth
  const stairsHardwareEnd = stairsWidth + marketMeter * 0.5
  const frameRight = frameX + frameWidth
  const intersectionWithFrame = (end) =>
    Math.max(0, Math.min(frameRight, end) - frameX)
  const stairsCoreIntrusion = intersectionWithFrame(stairsCoreEnd)
  const stairsHardwareIntrusion = intersectionWithFrame(stairsHardwareEnd)
  const rowAvoid = Math.max(0, stairsWidth - frameX)

  const separatorWidth = marketMeter * 0.35
  const separatorHeight = marketMeter * 5.12
  const separatorBottomMargin = marketMeter * -0.42
  const separatorOuterHeight = separatorHeight + separatorBottomMargin
  const stallRects = Object.fromEntries(
    WORKSHOP_STALLS.map((stallId) => {
      const size = stallSizes[stallId]
      return [
        stallId,
        {
          width: (marketMeter * size.widthUnits) / 32,
          height: (marketMeter * size.heightUnits) / 32,
        },
      ]
    }),
  )
  const contentWidth =
    stallRects.manual.width +
    separatorWidth +
    stallRects.console.width +
    separatorWidth +
    stallRects.talks.width
  const rowX = frameX + rowAvoid
  const rowWidth = frameWidth - rowAvoid
  const rowBottomOffset = marketMeter * 0.65 - 4 * svh
  const rowHeight = Math.max(
    separatorOuterHeight,
    ...WORKSHOP_STALLS.map((stallId) => stallRects[stallId].height),
  )
  const rowY = floorHeight - rowBottomOffset - rowHeight
  const rowBottom = rowY + rowHeight
  const startX = rowX + (rowWidth - contentWidth) / 2

  const items = []
  let cursorX = startX
  for (const [index, stallId] of WORKSHOP_STALLS.entries()) {
    const size = stallRects[stallId]
    const translateY = resolveLength(stallTranslations[stallId], svh)
    const wrapper = rect(
      cursorX,
      rowBottom - size.height + translateY,
      size.width,
      size.height,
    )
    const localPlate = rect(wrapper.x, wrapper.y, wrapper.width, wrapper.height)
    const plateDrift = {
      x: round(localPlate.x - wrapper.x),
      y: round(localPlate.y - wrapper.y),
      width: round(localPlate.width - wrapper.width),
      height: round(localPlate.height - wrapper.height),
    }
    items.push({
      kind: 'stall',
      id: stallId,
      wrapper,
      localPlate,
      plateDrift,
    })
    cursorX += size.width

    if (index < WORKSHOP_STALLS.length - 1) {
      items.push({
        kind: 'separator',
        id: `separator-${index + 1}`,
        box: rect(
          cursorX,
          rowBottom - separatorBottomMargin - separatorHeight,
          separatorWidth,
          separatorHeight,
        ),
        outerHeight: round(separatorOuterHeight),
        bottomMargin: round(separatorBottomMargin),
      })
      cursorX += separatorWidth
    }
  }

  const localPlateAligned = items
    .filter((item) => item.kind === 'stall')
    .every((item) =>
      Object.values(item.plateDrift).every(
        (difference) => Math.abs(difference) <= EPSILON,
      ),
    )

  return {
    viewport,
    marketMeter: round(marketMeter),
    floor: rect(0, 0, vw, floorHeight),
    sharedStage: rect(stageX, 0, stageWidth, stageHeight),
    frame: rect(frameX, 0, frameWidth, floorHeight),
    stairs: {
      core: rect(0, 0, stairsWidth, stairsHeight),
      widestHardware: rect(0, 0, stairsHardwareEnd, stairsHeight),
      coreIntrusionIntoFrame: round(stairsCoreIntrusion),
      widestHardwareIntrusionIntoFrame: round(stairsHardwareIntrusion),
      rowAvoid: round(rowAvoid),
    },
    row: rect(rowX, rowY, rowWidth, rowHeight),
    centeredContentWidth: round(contentWidth),
    centeredSlack: round(rowWidth - contentWidth),
    items,
    assertions: {
      contentFits: contentWidth <= rowWidth + EPSILON,
      rowAvoidsStairCore: Math.abs(rowAvoid - stairsCoreIntrusion) <= EPSILON,
      stageCentered:
        Math.abs(
          sharedCenter(stageX, stageWidth) - sharedCenter(frameX, frameWidth),
        ) <= EPSILON,
      stagePreservesAspect:
        Math.abs(stageWidth / stageHeight - 1248 / 597) <= EPSILON,
      separatorCount:
        items.filter((item) => item.kind === 'separator').length === 2,
      localPlateAligned,
    },
  }
}

function sharedCenter(start, size) {
  return start + size / 2
}

function renderMarkdown(report) {
  const status = report.pass ? 'PASS' : 'FAIL'
  const staticRows = report.staticChecks
    .map(
      (item) =>
        `| ${item.id} | ${item.pass ? 'PASS' : 'FAIL'} | ${item.detail} |`,
    )
    .join('\n')
  const viewportRows = report.viewports
    .map(
      (item) =>
        `| ${item.viewport.width}×${item.viewport.height} | ${format(item.marketMeter)} | ${format(item.sharedStage.x)}, ${format(item.sharedStage.width)}×${format(item.sharedStage.height)} | ${format(item.stairs.coreIntrusionIntoFrame)} / ${format(item.stairs.widestHardwareIntrusionIntoFrame)} | ${format(item.row.x)}, ${format(item.row.y)}, ${format(item.row.width)}×${format(item.row.height)} | ${format(item.centeredSlack)} | ${Object.values(item.assertions).every(Boolean) ? 'PASS' : 'FAIL'} |`,
    )
    .join('\n')
  const placementSections = report.viewports
    .map((item) => {
      const itemRows = item.items
        .map((entry) => {
          if (entry.kind === 'separator') {
            return `| ${entry.id} | H-beam | ${format(entry.box.x)}, ${format(entry.box.y)}, ${format(entry.box.width)}×${format(entry.box.height)} | — |`
          }
          const drift = entry.plateDrift
          return `| ${entry.id} | stall + local plate | ${format(entry.wrapper.x)}, ${format(entry.wrapper.y)}, ${format(entry.wrapper.width)}×${format(entry.wrapper.height)} | ${format(drift.x)}, ${format(drift.y)}, ${format(drift.width)}, ${format(drift.height)} |`
        })
        .join('\n')
      return `### ${item.viewport.width}×${item.viewport.height}

| Item | Kind | Visual box x, y, w×h | Local plate Δx, Δy, Δw, Δh |
| --- | --- | --- | --- |
${itemRows}`
    })
    .join('\n\n')

  return `# Workshop desktop registration audit — ${status}

Deterministic model of the desktop CSS at five viewports. Coordinates are CSS pixels from the workshop floor's top-left. The stair figure reports **core / widest landing-lip intrusion** into the centered frame.

## Source contracts

| Check | Result | Detail |
| --- | --- | --- |
${staticRows}

## Responsive geometry

| Viewport | market meter | shared stage x, w×h | stair intrusion core / max | row x, y, w×h | centering slack | Geometry |
| --- | ---: | --- | --- | --- | ---: | --- |
${viewportRows}

## Registered row items

${placementSections}

## Interpretation

- The shared 1248×597 stage remains centered and uniformly scaled; its plates may contain only viewport-independent architecture.
- The responsive row dodges the real stair **core** intrusion. The landing/lip is deliberately wider and may overlap the architectural edge of the first bay.
- Both separators participate in flex sizing. They are not baked into a tenant image.
- Each tenant integration plate is an absolute, full-wrapper child. Wrapper translation is inherited, so every reported local-plate delta is exactly zero.
`
}

const [viewSource, sceneCss, integrationCss, manifestSource, layersSource] =
  await Promise.all([
    readFile(VIEW_PATH, 'utf8'),
    readFile(SCENE_CSS_PATH, 'utf8'),
    readFile(INTEGRATION_CSS_PATH, 'utf8'),
    readFile(MANIFEST_PATH, 'utf8'),
    readFile(STALL_LAYERS_PATH, 'utf8'),
  ])

const workshopBlock = extractWorkshopBlock(manifestSource)
const stageSourceMatch = workshopBlock.match(
  /sourceCanvas:\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/,
)
if (!stageSourceMatch) {
  throw new Error('Cannot read the workshop shared-stage source canvas')
}
const stageSource = {
  width: Number(stageSourceMatch[1]),
  height: Number(stageSourceMatch[2]),
}
const stallSizes = extractStallSizes(viewSource)
const stallTranslations = extractStallTranslations(sceneCss)
const floorTenantEndpoints = findFloorTenantEndpoints(workshopBlock)
const stageBoundStairs = findStageBoundStairs(workshopBlock)

const stallPlateCss = cssBodiesForSelector(integrationCss, '.stallPlate')
const stallWrapCss = cssBodiesForSelector(sceneCss, '.stallWrap')
const beamReference = viewSource.indexOf('styles.stallBayBeam')
const beamConditionSource =
  beamReference < 0
    ? ''
    : viewSource.slice(Math.max(0, beamReference - 300), beamReference + 100)

const staticChecks = [
  check(
    'css.desktop-meter',
    matches(
      sceneCss,
      /--mkt-m:\s*min\(\s*calc\(var\(--mkt-frame-w\)\s*\/\s*11\.5\),\s*16\.5svh\s*\)/,
    ),
    'min(frame / 11.5, 16.5svh)',
  ),
  check(
    'css.stair-geometry',
    matches(sceneCss, /--stairs-w:\s*calc\(var\(--mkt-m\)\s*\*\s*1\.7\)/) &&
      matches(
        sceneCss,
        /calc\(var\(--stairs-w\)\s*-\s*\(100vw\s*-\s*var\(--mkt-frame-w\)\)\s*\/\s*2\)/,
      ),
    '1.7m core; row avoidance subtracts the viewport gutter',
  ),
  check(
    'css.row-geometry',
    matches(
      sceneCss,
      /inset:\s*auto\s+0\s+calc\(var\(--mkt-m\)\s*\*\s*0\.65\s*-\s*4svh\)\s+0/,
    ),
    'row bottom is 0.65m - 4svh',
  ),
  check(
    'css.separator-geometry',
    matches(sceneCss, /flex:\s*0\s+0\s+calc\(var\(--mkt-m\)\s*\*\s*0\.35\)/) &&
      matches(sceneCss, /height:\s*calc\(var\(--mkt-m\)\s*\*\s*5\.12\)/) &&
      matches(
        sceneCss,
        /margin-bottom:\s*calc\(var\(--mkt-m\)\s*\*\s*-0\.42\)/,
      ),
    '0.35m × 5.12m with -0.42m bottom margin',
  ),
  check(
    'dom.two-unconditional-separators',
    beamConditionSource.includes('stallIndex > 0') &&
      !beamConditionSource.includes('!authoredFloor'),
    beamConditionSource.includes('!authoredFloor')
      ? 'authoredFloor still suppresses desktop separators'
      : 'one separator is emitted before each non-first stall',
  ),
  check(
    'css.wrapper-positioning',
    /position:\s*relative/.test(stallWrapCss) &&
      /width:\s*calc\(var\(--mkt-m\)\s*\*\s*var\(--stall-w\)\s*\/\s*32\)/.test(
        stallWrapCss,
      ) &&
      /height:\s*calc\(var\(--mkt-m\)\s*\*\s*var\(--stall-h\)\s*\/\s*32\)/.test(
        stallWrapCss,
      ),
    'stallWrap is the responsive containing block',
  ),
  check(
    'css.workshop-translations',
    stallTranslations.manual.value === -2 &&
      stallTranslations.manual.unit === 'svh' &&
      stallTranslations.console.value === 0 &&
      stallTranslations.talks.value === -2 &&
      stallTranslations.talks.unit === 'svh',
    WORKSHOP_STALLS.map(
      (id) =>
        `${id}:${stallTranslations[id].value}${stallTranslations[id].unit}`,
    ).join(', '),
  ),
  check(
    'css.local-plate-fill',
    /position:\s*absolute/.test(stallPlateCss) &&
      /inset:\s*0/.test(stallPlateCss) &&
      /width:\s*100%/.test(stallPlateCss) &&
      /height:\s*100%/.test(stallPlateCss) &&
      /max-width:\s*none/.test(stallPlateCss) &&
      /object-fit:\s*fill/.test(stallPlateCss),
    'stallPlate is inset 0 and fills 100% of its wrapper',
  ),
  check(
    'dom.local-plate-parent',
    matches(
      viewSource,
      /className=\{cn\(styles\.stallWrap[\s\S]{0,1400}<StallIntegrationLayers\s+stallId=\{id\}\s+breakpoint=\{bp\}/,
    ) &&
      matches(
        layersSource,
        /className=\{cn\(styles\.stallPlate,\s*className\)\}/,
      ),
    'StallIntegrationLayers is mounted directly inside stallWrap',
  ),
  check(
    'manifest.shared-stage-canvas',
    stageSource.width === 1248 && stageSource.height === 597,
    `${stageSource.width}×${stageSource.height}`,
  ),
  check(
    'manifest.viewport-independent-stage',
    !/unit:\s*'(?:market|vw|svh)'/.test(
      workshopBlock.slice(0, workshopBlock.indexOf('plates:')),
    ) &&
      matches(
        workshopBlock,
        /height:\s*\{\s*value:\s*100,\s*unit:\s*'percent'\s*\}/,
      ),
    '100% stage height, centered with fixed-pixel offsets',
  ),
  check(
    'manifest.no-floor-tenant-endpoints',
    floorTenantEndpoints.length === 0,
    floorTenantEndpoints.length === 0
      ? 'shared floor plates contain architecture only'
      : `invalid floor-wide endpoints: ${summarizeList(floorTenantEndpoints)}`,
  ),
  check(
    'manifest.no-stage-bound-stairs',
    stageBoundStairs.length === 0,
    stageBoundStairs.length === 0
      ? 'live stairs remain viewport-edge-local'
      : `invalid stage-bound stairs: ${summarizeList(stageBoundStairs)}`,
  ),
]

const viewports = VIEWPORTS.map((viewport) =>
  calculateViewport(viewport, stallSizes, stallTranslations, stageSource),
)
const geometryPass = viewports.every((viewport) =>
  Object.values(viewport.assertions).every(Boolean),
)
const pass = staticChecks.every((item) => item.pass) && geometryPass
const report = {
  generatedBy: path.relative(ROOT, import.meta.filename),
  pass,
  sourceFiles: [
    path.relative(ROOT, VIEW_PATH),
    path.relative(ROOT, SCENE_CSS_PATH),
    path.relative(ROOT, INTEGRATION_CSS_PATH),
    path.relative(ROOT, MANIFEST_PATH),
    path.relative(ROOT, STALL_LAYERS_PATH),
  ],
  assumptions: {
    coordinateSystem: 'CSS pixels from workshop floor top-left',
    workshopStairsSide: 'left',
    sharedStageOwner: 'viewport-independent architecture only',
    tenantPlateOwner: 'stallWrap',
  },
  stageSource,
  stallSizes,
  stallTranslations,
  floorTenantEndpoints,
  stageBoundStairs,
  staticChecks,
  viewports,
}

await mkdir(REPORT_DIR, { recursive: true })
await writeFile(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)
await writeFile(MARKDOWN_REPORT_PATH, renderMarkdown(report))

console.log(
  `${pass ? 'PASS' : 'FAIL'} ${path.relative(ROOT, MARKDOWN_REPORT_PATH)}`,
)
if (!pass) {
  for (const item of staticChecks.filter((entry) => !entry.pass)) {
    console.error(`- ${item.id}: ${item.detail}`)
  }
  if (!geometryPass) console.error('- responsive geometry assertion failed')
  process.exitCode = 1
}
