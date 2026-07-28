import { createHash } from 'node:crypto'
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import sharp from 'sharp'
import ts from 'typescript'

const ROOT = process.cwd()
const FLOOR_ID = 'workshop-desktop'
const ASSET_URL_ROOT =
  '/images/bazaar3/assets/integration/floors/workshop-desktop'
const ASSET_DIR = path.join(
  ROOT,
  'public/images/bazaar3/assets/integration/floors/workshop-desktop',
)
const REPORT_DIR = path.join(
  ROOT,
  'scripts/bazaar3/reports/integration/workshop',
)
const JSON_REPORT = path.join(REPORT_DIR, 'verification.json')
const MARKDOWN_REPORT = path.join(REPORT_DIR, 'verification.md')
const GUIDE_PATH = path.join(
  ROOT,
  'scripts/bazaar3/sources/integration/workshop/registration-guide.json',
)
const MANIFEST_PATH = path.join(ROOT, 'app/bazaar3/integration-manifest.ts')
const INTEGRATION_CSS_PATH = path.join(
  ROOT,
  'app/bazaar3/integration.module.css',
)
const FLOOR_COMPONENT_PATH = path.join(
  ROOT,
  'app/bazaar3/components/FloorIntegrationLayers.tsx',
)
const STALL_COMPONENT_PATH = path.join(
  ROOT,
  'app/bazaar3/components/StallIntegrationLayers.tsx',
)

const LOGICAL_STAGE = Object.freeze({ width: 416, height: 199 })
const DELIVERED_STAGE = Object.freeze({ width: 1248, height: 597 })
const AUTHORED_PIXEL_SCALE = 3
const STALLS = ['manual', 'console', 'talks']
const BANNED_PLATE_PROPERTIES = ['transform', 'translate', 'scale']

const EXPECTED_BOXES = Object.freeze({
  stairs: { x: 0, y: 0, width: 32, height: 199 },
  manual: { x: 54, y: 46, width: 102, height: 135 },
  console: { x: 169, y: 79, width: 83, height: 108 },
  talks: { x: 265, y: 46, width: 126, height: 135 },
  ceiling: { x: 32, y: 16, width: 374, height: 12 },
  rail: { x: 37, y: 35, width: 368, height: 9 },
  vent: { x: 37, y: 49, width: 368, height: 9 },
  trench: { x: 35, y: 183, width: 373, height: 9 },
  threshold: { x: 0, y: 192, width: 416, height: 7 },
})

const EXPECTED_ASSETS = Object.freeze([
  {
    id: 'workshop-environment-base',
    file: 'environment-base.png',
    phase: 'rear',
    role: 'base',
    maxColors: 20,
  },
  {
    id: 'workshop-stairs-rear',
    file: 'stairs-rear.png',
    phase: 'rear',
    role: 'overlay',
    maxColors: 12,
  },
  {
    id: 'manual-connection-rear',
    file: 'connections-manual-rear.png',
    phase: 'rear',
    role: 'rear',
    stall: 'manual',
    maxColors: 16,
  },
  {
    id: 'console-connection-rear',
    file: 'connections-console-rear.png',
    phase: 'rear',
    role: 'rear',
    stall: 'console',
    maxColors: 20,
  },
  {
    id: 'talks-connection-rear',
    file: 'connections-talks-rear.png',
    phase: 'rear',
    role: 'rear',
    stall: 'talks',
    maxColors: 16,
  },
  {
    id: 'manual-receiver',
    file: 'receiver-manual.png',
    phase: 'light',
    role: 'receiver',
    stall: 'manual',
    activeFor: 'manual',
    maxColors: 8,
  },
  {
    id: 'console-receiver',
    file: 'receiver-console.png',
    phase: 'light',
    role: 'receiver',
    stall: 'console',
    activeFor: 'console',
    maxColors: 12,
  },
  {
    id: 'talks-receiver',
    file: 'receiver-talks.png',
    phase: 'light',
    role: 'receiver',
    stall: 'talks',
    activeFor: 'talks',
    maxColors: 12,
  },
  {
    id: 'workshop-utility-mid',
    file: 'utility-mid.png',
    phase: 'mid',
    role: 'overlay',
    maxColors: 16,
  },
  {
    id: 'manual-caster',
    file: 'caster-manual.png',
    phase: 'caster',
    role: 'caster',
    stall: 'manual',
    maxColors: 8,
  },
  {
    id: 'console-caster',
    file: 'caster-console.png',
    phase: 'caster',
    role: 'caster',
    stall: 'console',
    maxColors: 8,
  },
  {
    id: 'talks-caster',
    file: 'caster-talks.png',
    phase: 'caster',
    role: 'caster',
    stall: 'talks',
    maxColors: 8,
  },
  {
    id: 'manual-contact',
    file: 'contact-manual.png',
    phase: 'contact',
    role: 'contact',
    stall: 'manual',
    maxColors: 8,
  },
  {
    id: 'console-contact',
    file: 'contact-console.png',
    phase: 'contact',
    role: 'contact',
    stall: 'console',
    maxColors: 8,
  },
  {
    id: 'talks-contact',
    file: 'contact-talks.png',
    phase: 'contact',
    role: 'contact',
    stall: 'talks',
    maxColors: 8,
  },
  {
    id: 'manual-connection-front',
    file: 'connections-manual-front.png',
    phase: 'front',
    role: 'front',
    stall: 'manual',
    maxColors: 16,
  },
  {
    id: 'console-connection-front',
    file: 'connections-console-front.png',
    phase: 'front',
    role: 'front',
    stall: 'console',
    maxColors: 16,
  },
  {
    id: 'talks-connection-front',
    file: 'connections-talks-front.png',
    phase: 'front',
    role: 'front',
    stall: 'talks',
    maxColors: 16,
  },
  {
    id: 'workshop-front-occluders',
    file: 'front-occluders.png',
    phase: 'front',
    role: 'overlay',
    maxColors: 16,
  },
  {
    id: 'workshop-stairs-front',
    file: 'stairs-front.png',
    phase: 'front',
    role: 'overlay',
    maxColors: 12,
  },
])

const APPROVED_IDLE_FRAMES = Object.freeze([
  {
    id: 'manual-idle-1',
    stall: 'manual',
    frame: 'idle-1',
    file: 'public/images/bazaar3/assets/stalls/manual/frames/idle-1.png',
    sha256: 'bc4b9d481f6979445dbdd69c8a295a1c15d139790c5f2cc0a6b902ba27d48ad9',
  },
  {
    id: 'manual-idle-2',
    stall: 'manual',
    frame: 'idle-2',
    file: 'public/images/bazaar3/assets/stalls/manual/frames/idle-2.png',
    sha256: 'f2af5c985918c3115e2db45f03dbeb1d282bc13482fe88d83626e65545b89f69',
  },
  {
    id: 'console-idle-1',
    stall: 'console',
    frame: 'idle-1',
    file: 'public/images/bazaar3/assets/stalls/console-v2/frames/idle-1.png',
    sha256: '08e836629578b638d003eb3dd6a25c667ce48b94f58208c114bafcc7cdb58589',
  },
  {
    id: 'console-idle-2',
    stall: 'console',
    frame: 'idle-2',
    file: 'public/images/bazaar3/assets/stalls/console-v2/frames/idle-2.png',
    sha256: '5504ff9e0d9c11913b5069e58ae1a281634519b4c5ff706096157e45aaee8eab',
  },
  {
    id: 'talks-idle-1',
    stall: 'talks',
    frame: 'idle-1',
    file: 'public/images/bazaar3/assets/stalls/talks/frames/idle-1.png',
    sha256: 'ef1bf6071660d131cd77c2a7d990edaa397b615e554a37f2141cafc55aa076a2',
  },
  {
    id: 'talks-idle-2',
    stall: 'talks',
    frame: 'idle-2',
    file: 'public/images/bazaar3/assets/stalls/talks/frames/idle-2.png',
    sha256: '36332689e4e4dac737369b4a5386f6d5a8b9705d83ddc6067690d7d8da62a0b9',
  },
])

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function propertyName(node) {
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node)
  ) {
    return node.text
  }
  return node.getText().replace(/^['"]|['"]$/g, '')
}

function findProperty(object, name) {
  return object.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) && propertyName(property.name) === name,
  )
}

function requireObjectProperty(object, name) {
  const property = findProperty(object, name)
  if (!property || !ts.isObjectLiteralExpression(property.initializer)) {
    throw new Error(`Expected object property ${name}`)
  }
  return property.initializer
}

function requireArrayProperty(object, name) {
  const property = findProperty(object, name)
  if (!property || !ts.isArrayLiteralExpression(property.initializer)) {
    throw new Error(`Expected array property ${name}`)
  }
  return property.initializer
}

function primitiveProperty(object, name) {
  const property = findProperty(object, name)
  if (!property) return undefined
  const value = property.initializer
  if (ts.isStringLiteral(value) || ts.isNumericLiteral(value)) return value.text
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false
  return value.getText()
}

function manifestUrl(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text
  }
  if (!ts.isTemplateExpression(node)) {
    throw new Error(`Unsupported manifest URL expression: ${node.getText()}`)
  }
  const identifiers = node.templateSpans.map((span) =>
    span.expression.getText(),
  )
  if (identifiers.length !== 1 || identifiers[0] !== 'INTEGRATION_ASSET_ROOT') {
    throw new Error(`Unsupported manifest URL interpolation: ${node.getText()}`)
  }
  return `/images/bazaar3/assets/integration${node.templateSpans[0].literal.text}`
}

function parseManifest(source) {
  const sourceFile = ts.createSourceFile(
    MANIFEST_PATH,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  let integrationsObject
  let plateType

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === 'FLOOR_INTEGRATIONS' &&
          declaration.initializer &&
          ts.isObjectLiteralExpression(declaration.initializer)
        ) {
          integrationsObject = declaration.initializer
        }
      }
    }
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === 'RegisteredIntegrationPlate'
    ) {
      plateType = statement
    }
  }

  if (!integrationsObject) throw new Error('FLOOR_INTEGRATIONS not found')
  if (!plateType) throw new Error('RegisteredIntegrationPlate type not found')

  const workshopProperty = findProperty(integrationsObject, FLOOR_ID)
  if (
    !workshopProperty ||
    !ts.isObjectLiteralExpression(workshopProperty.initializer)
  ) {
    throw new Error(`${FLOOR_ID} manifest entry not found`)
  }
  const workshop = workshopProperty.initializer
  const stage = requireObjectProperty(workshop, 'stage')
  const sourceCanvas = requireObjectProperty(stage, 'sourceCanvas')
  const plates = requireArrayProperty(workshop, 'plates')
  const parsedPlates = plates.elements.map((element) => {
    if (!ts.isObjectLiteralExpression(element)) {
      throw new Error('Workshop plate must be an object literal')
    }
    const srcProperty = findProperty(element, 'src')
    if (!srcProperty) throw new Error('Workshop plate is missing src')
    return {
      id: primitiveProperty(element, 'id'),
      src: manifestUrl(srcProperty.initializer),
      phase: primitiveProperty(element, 'phase'),
      activeFor: primitiveProperty(element, 'activeFor'),
      propertyNames: element.properties
        .filter(ts.isPropertyAssignment)
        .map((property) => propertyName(property.name)),
    }
  })

  const plateTypeSource = plateType.getText(sourceFile)
  return {
    id: primitiveProperty(workshop, 'id'),
    breakpoint: primitiveProperty(workshop, 'breakpoint'),
    status: primitiveProperty(workshop, 'status'),
    stage: {
      width: Number(primitiveProperty(sourceCanvas, 'width')),
      height: Number(primitiveProperty(sourceCanvas, 'height')),
      authoredPixelScale: Number(
        primitiveProperty(stage, 'authoredPixelScale'),
      ),
    },
    plates: parsedPlates,
    plateTypeHasEscapeHatch: BANNED_PLATE_PROPERTIES.some((name) =>
      new RegExp(`\\b${name}\\??\\s*:`).test(plateTypeSource),
    ),
  }
}

function parseCssRules(source) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = []
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g
  for (const match of withoutComments.matchAll(rulePattern)) {
    rules.push({
      selector: match[1].trim(),
      body: match[2].trim(),
    })
  }
  return rules
}

function classDisablesPointerEvents(rules, className) {
  return rules.some(
    (rule) =>
      rule.selector
        .split(',')
        .some((selector) => selector.trim().includes(`.${className}`)) &&
      /(?:^|;)\s*pointer-events\s*:\s*none\s*(?:;|$)/.test(`;${rule.body};`),
  )
}

function plateCssHasEscapeHatch(rules) {
  return rules.some((rule) => {
    const targetsPlate = rule.selector
      .split(',')
      .some(
        (selector) =>
          selector.includes('.floorPlate') || selector.includes('.stallPlate'),
      )
    return (
      targetsPlate &&
      /(?:^|;)\s*(?:transform|translate|scale)\s*:/.test(`;${rule.body}`)
    )
  })
}

function deliveredBox(box) {
  return {
    x: box.x * AUTHORED_PIXEL_SCALE,
    y: box.y * AUTHORED_PIXEL_SCALE,
    width: box.width * AUTHORED_PIXEL_SCALE,
    height: box.height * AUTHORED_PIXEL_SCALE,
  }
}

function isInsideBox(x, y, box) {
  return (
    x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height
  )
}

async function analyzeAsset(asset, registrationBoxes) {
  const absolutePath = path.join(ASSET_DIR, asset.file)
  const bytes = await readFile(absolutePath)
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const colors = new Set()
  const alphaValues = new Set()
  let opaquePixels = 0
  let minimumX = info.width
  let minimumY = info.height
  let maximumX = -1
  let maximumY = -1
  let blockViolations = 0
  const blockViolationSamples = []
  let insideRegistration = 0
  let outsideRegistration = 0
  let lowerBandPixels = 0
  const registrationBox = asset.stall
    ? deliveredBox(registrationBoxes[asset.stall])
    : null

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels
      const color = `${data[index]},${data[index + 1]},${data[index + 2]},${data[index + 3]}`
      const alpha = data[index + 3]
      colors.add(color)
      alphaValues.add(alpha)
      if (alpha === 0) continue

      opaquePixels += 1
      minimumX = Math.min(minimumX, x)
      minimumY = Math.min(minimumY, y)
      maximumX = Math.max(maximumX, x)
      maximumY = Math.max(maximumY, y)

      if (registrationBox) {
        if (isInsideBox(x, y, registrationBox)) insideRegistration += 1
        else outsideRegistration += 1
        const lowerBandStart =
          registrationBox.y + Math.floor(registrationBox.height * 0.72)
        if (
          x >= registrationBox.x &&
          x < registrationBox.x + registrationBox.width &&
          y >= lowerBandStart &&
          y <= registrationBox.y + registrationBox.height + 18
        ) {
          lowerBandPixels += 1
        }
      }
    }
  }

  if (info.width % 3 === 0 && info.height % 3 === 0) {
    for (let y = 0; y < info.height; y += 3) {
      for (let x = 0; x < info.width; x += 3) {
        const base = (y * info.width + x) * info.channels
        let uniform = true
        for (let offsetY = 0; offsetY < 3 && uniform; offsetY += 1) {
          for (let offsetX = 0; offsetX < 3; offsetX += 1) {
            const index =
              ((y + offsetY) * info.width + x + offsetX) * info.channels
            for (let channel = 0; channel < 4; channel += 1) {
              if (data[index + channel] !== data[base + channel]) {
                uniform = false
                break
              }
            }
            if (!uniform) break
          }
        }
        if (!uniform) {
          blockViolations += 1
          if (blockViolationSamples.length < 8) {
            blockViolationSamples.push({ x, y })
          }
        }
      }
    }
  }

  return {
    id: asset.id,
    file: path.relative(ROOT, absolutePath),
    phase: asset.phase,
    role: asset.role,
    stall: asset.stall ?? null,
    sha256: sha256(bytes),
    dimensions: { width: info.width, height: info.height },
    palette: {
      colors: colors.size,
      ceiling: asset.maxColors,
    },
    alpha: {
      values: [...alphaValues].sort((a, b) => a - b),
      opaquePixels,
      bounds:
        opaquePixels === 0
          ? null
          : {
              x: minimumX,
              y: minimumY,
              width: maximumX - minimumX + 1,
              height: maximumY - minimumY + 1,
            },
    },
    pixelGrid: {
      scale: 3,
      uniform: blockViolations === 0,
      violations: blockViolations,
      samples: blockViolationSamples,
    },
    registration:
      registrationBox === null
        ? null
        : {
            box: registrationBox,
            insidePixels: insideRegistration,
            outsidePixels: outsideRegistration,
            lowerBandPixels,
          },
  }
}

function markdownReport(report) {
  const pass = (value) => (value ? 'PASS' : 'FAIL')
  const lines = [
    '# Bazaar 3 Workshop Integration Verification',
    '',
    `Overall: **${pass(report.passed)}**`,
    '',
    `- Expected assets: ${report.summary.expectedAssets}`,
    `- Analyzed assets: ${report.summary.analyzedAssets}`,
    `- Checks passed: ${report.summary.passedChecks}/${report.summary.totalChecks}`,
    `- Failures: ${report.failures.length}`,
    '',
    '## Invariants',
    '',
    '| Check | Result | Detail |',
    '|---|---:|---|',
    ...report.checks.map(
      (check) =>
        `| ${check.id} | ${pass(check.passed)} | ${String(check.detail).replaceAll('|', '\\|')} |`,
    ),
    '',
    '## Assets',
    '',
    '| Asset | Size | Colors | Alpha | 3× grid | Bounds | Result |',
    '|---|---:|---:|---|---:|---|---:|',
    ...report.assets.map((asset) => {
      const result = report.assetResults[asset.id]
      const bounds = asset.alpha.bounds
        ? `${asset.alpha.bounds.x},${asset.alpha.bounds.y} ${asset.alpha.bounds.width}×${asset.alpha.bounds.height}`
        : 'empty'
      return `| ${asset.id} | ${asset.dimensions.width}×${asset.dimensions.height} | ${asset.palette.colors}/${asset.palette.ceiling} | ${asset.alpha.values.join(',')} | ${pass(asset.pixelGrid.uniform)} | ${bounds} | ${pass(result.passed)} |`
    }),
    '',
    '## Approved idle-frame hashes',
    '',
    '| Stall | Frame | SHA-256 | Result |',
    '|---|---|---|---:|',
    ...Object.values(report.approvedIdleFrames).map(
      (value) =>
        `| ${value.stall} | ${value.frame} | \`${value.actual}\` | ${pass(value.passed)} |`,
    ),
    '',
    '## Registration boxes',
    '',
    '| Box | Logical registration | Delivered registration |',
    '|---|---|---|',
    ...Object.entries(report.registration.boxes).map(
      ([name, box]) =>
        `| ${name} | ${box.logical.x},${box.logical.y} ${box.logical.width}×${box.logical.height} | ${box.delivered.x},${box.delivered.y} ${box.delivered.width}×${box.delivered.height} |`,
    ),
    '',
    '## Failures',
    '',
    ...(report.failures.length === 0
      ? ['None.']
      : report.failures.map(
          (failure) => `- **${failure.id}:** ${failure.detail}`,
        )),
    '',
  ]
  return `${lines.join('\n')}\n`
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true })

  const checks = []
  const failures = []
  const assetResults = {}
  const addCheck = (id, passed, detail) => {
    const result = { id, passed: Boolean(passed), detail }
    checks.push(result)
    if (!result.passed) failures.push({ id, detail })
    return result.passed
  }

  const [
    guideSource,
    manifestSource,
    cssSource,
    floorComponentSource,
    stallComponentSource,
  ] = await Promise.all([
    readFile(GUIDE_PATH, 'utf8'),
    readFile(MANIFEST_PATH, 'utf8'),
    readFile(INTEGRATION_CSS_PATH, 'utf8'),
    readFile(FLOOR_COMPONENT_PATH, 'utf8'),
    readFile(STALL_COMPONENT_PATH, 'utf8'),
  ])

  const guide = JSON.parse(guideSource)
  const manifest = parseManifest(manifestSource)
  const cssRules = parseCssRules(cssSource)

  addCheck(
    'registration.logical-stage',
    isDeepStrictEqual(guide.sourceCanvas, LOGICAL_STAGE),
    `expected ${LOGICAL_STAGE.width}×${LOGICAL_STAGE.height}; got ${guide.sourceCanvas.width}×${guide.sourceCanvas.height}`,
  )
  addCheck(
    'registration.delivered-stage',
    isDeepStrictEqual(guide.deliveredCanvas, DELIVERED_STAGE),
    `expected ${DELIVERED_STAGE.width}×${DELIVERED_STAGE.height}; got ${guide.deliveredCanvas.width}×${guide.deliveredCanvas.height}`,
  )
  addCheck(
    'registration.pixel-scale',
    guide.authoredPixelScale === AUTHORED_PIXEL_SCALE,
    `expected ${AUTHORED_PIXEL_SCALE}; got ${guide.authoredPixelScale}`,
  )
  addCheck(
    'registration.boxes-exact',
    isDeepStrictEqual(guide.boxes, EXPECTED_BOXES),
    isDeepStrictEqual(guide.boxes, EXPECTED_BOXES)
      ? 'all nine logical registration boxes match'
      : 'registration-guide.json boxes differ from the locked workshop contract',
  )

  addCheck(
    'manifest.floor-id',
    manifest.id === FLOOR_ID &&
      manifest.breakpoint === 'desktop' &&
      manifest.status === 'prototype',
    `${manifest.id}/${manifest.breakpoint}/${manifest.status}`,
  )
  addCheck(
    'manifest.registered-stage',
    manifest.stage.width === DELIVERED_STAGE.width &&
      manifest.stage.height === DELIVERED_STAGE.height &&
      manifest.stage.authoredPixelScale === AUTHORED_PIXEL_SCALE,
    `${manifest.stage.width}×${manifest.stage.height} @ ${manifest.stage.authoredPixelScale}×`,
  )

  const expectedById = new Map(
    EXPECTED_ASSETS.map((asset) => [asset.id, asset]),
  )
  const manifestById = new Map(
    manifest.plates.map((plate) => [plate.id, plate]),
  )
  const expectedUrls = EXPECTED_ASSETS.map(
    (asset) => `${ASSET_URL_ROOT}/${asset.file}`,
  ).sort()
  const manifestUrls = manifest.plates.map((plate) => plate.src).sort()
  addCheck(
    'manifest.asset-count',
    manifest.plates.length === EXPECTED_ASSETS.length,
    `${manifest.plates.length}/${EXPECTED_ASSETS.length}`,
  )
  addCheck(
    'manifest.urls-exact',
    isDeepStrictEqual(manifestUrls, expectedUrls),
    isDeepStrictEqual(manifestUrls, expectedUrls)
      ? 'all 20 workshop URLs are declared exactly once'
      : 'manifest workshop URL set differs from the expected asset set',
  )
  addCheck(
    'manifest.unique-plate-ids',
    manifestById.size === manifest.plates.length,
    `${manifestById.size}/${manifest.plates.length} unique`,
  )

  let manifestMetadataValid = true
  for (const [id, expected] of expectedById) {
    const actual = manifestById.get(id)
    if (
      !actual ||
      actual.phase !== expected.phase ||
      actual.src !== `${ASSET_URL_ROOT}/${expected.file}` ||
      actual.activeFor !== expected.activeFor
    ) {
      manifestMetadataValid = false
    }
  }
  addCheck(
    'manifest.plate-metadata',
    manifestMetadataValid,
    manifestMetadataValid
      ? 'IDs, phases, URLs and receiver owners match'
      : 'one or more plate declarations have incorrect metadata',
  )

  let allManifestUrlsExist = true
  for (const url of manifestUrls) {
    try {
      await access(path.join(ROOT, 'public', url.replace(/^\//, '')))
    } catch {
      allManifestUrlsExist = false
    }
  }
  addCheck(
    'manifest.urls-exist',
    allManifestUrlsExist,
    allManifestUrlsExist
      ? 'every declared workshop URL resolves under public/'
      : 'one or more declared workshop URLs are missing',
  )

  const diskPngs = (await readdir(ASSET_DIR))
    .filter((file) => file.endsWith('.png'))
    .sort()
  const expectedPngs = EXPECTED_ASSETS.map((asset) => asset.file).sort()
  addCheck(
    'assets.disk-set-exact',
    isDeepStrictEqual(diskPngs, expectedPngs),
    `${diskPngs.length}/${expectedPngs.length} PNG files`,
  )

  const requiredRolesValid = STALLS.every((stall) =>
    ['rear', 'front', 'contact', 'caster', 'receiver'].every((role) =>
      EXPECTED_ASSETS.some(
        (asset) => asset.stall === stall && asset.role === role,
      ),
    ),
  )
  addCheck(
    'assets.required-stall-packages',
    requiredRolesValid,
    requiredRolesValid
      ? 'Manual, Console and Talks each declare rear/front/contact/caster/receiver'
      : 'one or more workshop stalls lacks a required integration role',
  )

  const manifestPlateEscapeHatch =
    manifest.plateTypeHasEscapeHatch ||
    manifest.plates.some((plate) =>
      plate.propertyNames.some((name) =>
        BANNED_PLATE_PROPERTIES.includes(name),
      ),
    )
  addCheck(
    'runtime.no-manifest-plate-transform',
    !manifestPlateEscapeHatch,
    manifestPlateEscapeHatch
      ? 'transform/translate/scale exists on a plate contract or declaration'
      : 'plate contract and declarations expose no transform/translate/scale',
  )
  addCheck(
    'runtime.no-css-plate-transform',
    !plateCssHasEscapeHatch(cssRules),
    plateCssHasEscapeHatch(cssRules)
      ? 'a .floorPlate/.stallPlate CSS rule transforms a plate'
      : 'no .floorPlate/.stallPlate rule transforms, translates or scales',
  )

  const pointerClasses = [
    'floorPass',
    'registeredStage',
    'floorPlate',
    'stallPlate',
  ]
  const pointerSafety = pointerClasses.every((className) =>
    classDisablesPointerEvents(cssRules, className),
  )
  addCheck(
    'runtime.decorative-pointer-events',
    pointerSafety,
    pointerSafety
      ? 'all decorative floor/stage/plate classes disable pointer events'
      : 'one or more decorative integration classes can intercept input',
  )

  const eventHandlerPattern =
    /\bon(?:Click|Pointer|Mouse|Touch|Drag|Key|Focus|Blur|Wheel)\w*\s*=/
  const renderersHaveHandlers =
    eventHandlerPattern.test(floorComponentSource) ||
    eventHandlerPattern.test(stallComponentSource)
  addCheck(
    'runtime.renderers-have-no-events',
    !renderersHaveHandlers,
    renderersHaveHandlers
      ? 'an integration renderer declares an interaction event'
      : 'integration renderers are interaction-free',
  )

  const approvedIdleFrames = {}
  for (const expected of APPROVED_IDLE_FRAMES) {
    const bytes = await readFile(path.join(ROOT, expected.file))
    const actual = sha256(bytes)
    const passed = actual === expected.sha256
    approvedIdleFrames[expected.id] = {
      stall: expected.stall,
      frame: expected.frame,
      file: expected.file,
      expected: expected.sha256,
      actual,
      passed,
    }
    addCheck(
      `approved-idle.${expected.stall}.${expected.frame}`,
      passed,
      passed ? actual : `expected ${expected.sha256}; got ${actual}`,
    )
  }

  const assets = []
  for (const expected of EXPECTED_ASSETS) {
    try {
      const asset = await analyzeAsset(expected, guide.boxes)
      assets.push(asset)
      const dimensionsPass =
        asset.dimensions.width === DELIVERED_STAGE.width &&
        asset.dimensions.height === DELIVERED_STAGE.height
      const palettePass = asset.palette.colors <= asset.palette.ceiling
      const alphaPass =
        expected.role === 'base'
          ? isDeepStrictEqual(asset.alpha.values, [255])
          : asset.alpha.values.every((value) => value === 0 || value === 255) &&
            asset.alpha.values.includes(0) &&
            asset.alpha.values.includes(255)
      const boundsPass = asset.alpha.bounds !== null
      const gridPass =
        asset.pixelGrid.uniform &&
        asset.dimensions.width % AUTHORED_PIXEL_SCALE === 0 &&
        asset.dimensions.height % AUTHORED_PIXEL_SCALE === 0

      let registrationPass = true
      if (asset.registration) {
        const crossesBoundary = ['rear', 'front', 'receiver'].includes(
          expected.role,
        )
        const grounded = ['contact', 'caster'].includes(expected.role)
        registrationPass =
          asset.registration.insidePixels > 0 &&
          (!crossesBoundary || asset.registration.outsidePixels > 0) &&
          (!grounded || asset.registration.lowerBandPixels > 0)
      }

      const passed =
        dimensionsPass &&
        palettePass &&
        alphaPass &&
        boundsPass &&
        gridPass &&
        registrationPass
      const detail = [
        dimensionsPass ? null : 'dimensions',
        palettePass ? null : 'palette',
        alphaPass ? null : 'alpha',
        boundsPass ? null : 'empty-alpha-bounds',
        gridPass ? null : '3x3-grid',
        registrationPass ? null : 'registration',
      ]
        .filter(Boolean)
        .join(', ')

      assetResults[expected.id] = {
        passed,
        checks: {
          dimensions: dimensionsPass,
          palette: palettePass,
          alpha: alphaPass,
          nonemptyBounds: boundsPass,
          pixelGrid: gridPass,
          registration: registrationPass,
        },
      }
      addCheck(
        `asset.${expected.id}`,
        passed,
        passed ? 'all raster and registration checks pass' : detail,
      )
    } catch (error) {
      assetResults[expected.id] = {
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      }
      addCheck(
        `asset.${expected.id}`,
        false,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  const registrationBoxes = Object.fromEntries(
    Object.entries(guide.boxes).map(([name, box]) => [
      name,
      { logical: box, delivered: deliveredBox(box) },
    ]),
  )
  const passed = failures.length === 0
  const report = {
    verifier: 'scripts/bazaar3/verify-integration-assets.mjs',
    floor: FLOOR_ID,
    passed,
    summary: {
      expectedAssets: EXPECTED_ASSETS.length,
      analyzedAssets: assets.length,
      totalChecks: checks.length,
      passedChecks: checks.filter((check) => check.passed).length,
    },
    stage: {
      logical: LOGICAL_STAGE,
      delivered: DELIVERED_STAGE,
      authoredPixelScale: AUTHORED_PIXEL_SCALE,
    },
    checks,
    approvedIdleFrames,
    registration: {
      guide: path.relative(ROOT, GUIDE_PATH),
      boxes: registrationBoxes,
    },
    assets,
    assetResults,
    failures,
  }

  await Promise.all([
    writeFile(JSON_REPORT, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(MARKDOWN_REPORT, markdownReport(report)),
  ])

  console.log(`Workshop integration verification: ${passed ? 'PASS' : 'FAIL'}`)
  console.log(path.relative(ROOT, JSON_REPORT))
  console.log(path.relative(ROOT, MARKDOWN_REPORT))
  if (!passed) {
    for (const failure of failures) {
      console.error(`- ${failure.id}: ${failure.detail}`)
    }
    process.exitCode = 1
  }
}

main().catch(async (error) => {
  await mkdir(REPORT_DIR, { recursive: true })
  const detail =
    error instanceof Error ? error.stack || error.message : String(error)
  const report = {
    verifier: 'scripts/bazaar3/verify-integration-assets.mjs',
    floor: FLOOR_ID,
    passed: false,
    fatal: detail,
  }
  await Promise.all([
    writeFile(JSON_REPORT, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(
      MARKDOWN_REPORT,
      `# Bazaar 3 Workshop Integration Verification\n\nOverall: **FAIL**\n\n## Fatal error\n\n\`\`\`text\n${detail}\n\`\`\`\n`,
    ),
  ])
  console.error(detail)
  process.exitCode = 1
})
