#!/usr/bin/env node

import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import {
  EQUAL_EARTH_ASPECT,
  equalEarthForward,
} from '../../lib/geo/equal-earth.ts'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = resolve(SCRIPT_DIR, '../..')
const NATURAL_EARTH_PATH = resolve(
  process.argv[2] ??
    join(REPOSITORY_ROOT, 'work/raw-data/ne_10m_admin_0_countries.geojson'),
)
const NATURAL_EARTH_LAND_PATH = resolve(
  process.argv[3] ?? join(REPOSITORY_ROOT, 'work/raw-data/ne_10m_land.geojson'),
)

const EXPECTED_NATURAL_EARTH_SHA256 =
  '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255'
const EXPECTED_NATURAL_EARTH_LAND_SHA256 =
  '1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416'
const EXPECTED_FLAG_ICONS_VERSION = '7.5.0'
const SVG_WIDTH = 1000
const SVG_HEIGHT = 700
const SHAPE_PADDING = 42
const DEGREES_TO_RADIANS = Math.PI / 180
const CORPUS_PATH = join(REPOSITORY_ROOT, 'data/geo/generated/countries.json')
const GENERATED_ASSET_FILENAME = /^[a-f0-9]{20}\.svg$/u

const SHAPE_AREA_RATIO_OVERRIDES = {
  AU: 0.001,
  CA: 0.00075,
  CL: 0.001,
  GB: 0.0002,
  ID: 0.00035,
  IN: 0.0005,
  IT: 0.0005,
  NZ: 0.003,
  ZA: 0.0005,
}

/**
 * Simplification runs in projected pixel space, so every country keeps the
 * same on-screen fidelity regardless of its geographic extent. Coastline-heavy
 * shapes escalate through the ladder until they fit the gzip budget that
 * validate-challenge enforces (32 KiB gzip, kept with headroom here).
 */
const SHAPE_PIXEL_TOLERANCES = [0.35, 0.5, 0.75, 1, 1.5, 2]
const SHAPE_GZIP_BUDGET = 30 * 1024
const WORLD_PIXEL_TOLERANCE = 0.6

const countryCorpus = JSON.parse(readFileSync(CORPUS_PATH, 'utf8'))
if (
  typeof countryCorpus.sourceRevision !== 'string' ||
  countryCorpus.sourceRevision.length === 0
) {
  throw new Error('Country corpus must declare a source revision')
}

if (!Array.isArray(countryCorpus.countries)) {
  throw new Error('Country corpus must contain a countries array')
}

const activeCountries = countryCorpus.countries
  .filter(({ status }) => status === 'active')
  .toSorted((left, right) => left.code.localeCompare(right.code))

const countryCodes = new Set()
for (const country of activeCountries) {
  if (!/^[A-Z]{2}$/u.test(country.code)) {
    throw new Error(`Invalid active country code: ${country.code}`)
  }
  if (!/^[A-Z]{3}$/u.test(country.iso3)) {
    throw new Error(`${country.code} must declare a valid ISO alpha-3 code`)
  }
  if (countryCodes.has(country.code)) {
    throw new Error(`Country corpus repeats active code ${country.code}`)
  }
  countryCodes.add(country.code)
}

const shapeCountries = activeCountries.filter(
  ({ eligibility }) => eligibility?.shape === true,
)
const flagCountries = activeCountries.filter(
  ({ eligibility }) => eligibility?.flag === true,
)

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const round = (value) => Number(value.toFixed(2))

const ensureDirectory = (path) => mkdirSync(path, { recursive: true })

const writeFileAtomically = (path, bytes) => {
  const temporaryPath = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(temporaryPath, bytes)
    renameSync(temporaryPath, path)
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath)
  }
}

const stableJson = (value) =>
  `${JSON.stringify(value, null, 2).replace(
    /\[\n((?:\s+(?:"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null),?\n)+)\s*\]/gu,
    (_, lines) =>
      `[${lines
        .trim()
        .split(/\n/u)
        .map((line) => line.trim())
        .join(' ')}]`,
  )}\n`

const signedArea = (ring) => {
  let area = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index]
    const [x2, y2] = ring[index + 1]
    area += x1 * y2 - x2 * y1
  }
  return area / 2
}

const pointSegmentDistanceSquared = (point, start, end) => {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) {
    return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2
  }
  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
        (dx * dx + dy * dy),
    ),
  )
  const x = start[0] + ratio * dx
  const y = start[1] + ratio * dy
  return (point[0] - x) ** 2 + (point[1] - y) ** 2
}

const simplifyOpenLine = (points, tolerance) => {
  if (points.length <= 2) return points
  const threshold = tolerance ** 2
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]

  while (stack.length > 0) {
    const [startIndex, endIndex] = stack.pop()
    let furthestIndex = -1
    let furthestDistance = threshold
    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = pointSegmentDistanceSquared(
        points[index],
        points[startIndex],
        points[endIndex],
      )
      if (distance > furthestDistance) {
        furthestDistance = distance
        furthestIndex = index
      }
    }
    if (furthestIndex < 0) continue
    keep[furthestIndex] = 1
    stack.push([startIndex, furthestIndex], [furthestIndex, endIndex])
  }

  return points.filter((_, index) => keep[index] === 1)
}

const simplifyRing = (ring, tolerance) => {
  if (ring.length <= 5) return ring
  const open = ring.slice(0, -1)
  const anchor = open.reduce(
    (best, point, index) => (point[0] < open[best][0] ? index : best),
    0,
  )
  const rotated = [...open.slice(anchor), ...open.slice(0, anchor)]
  rotated.push(rotated[0])
  const simplified = simplifyOpenLine(rotated, tolerance)
  if (simplified.length < 4) return ring
  simplified[simplified.length - 1] = simplified[0]
  return simplified
}

const polygonsOf = (geometry) => {
  if (geometry?.type === 'Polygon') return [geometry.coordinates]
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates
  return []
}

/**
 * Distant possessions zoom the projector out until the recognizable mainland
 * is a speck. Each window keeps polygons whose bounding box lies inside it:
 * FR drops the overseas territories (Corsica kept), NL the Caribbean
 * municipalities, ES the Canaries (Balearics kept), PT the Azores and
 * Madeira, NO Svalbard and Jan Mayen, EC the Galápagos, ZA the Prince Edward
 * islands.
 */
const SHAPE_MAINLAND_WINDOWS = {
  EC: { minX: -82 },
  ES: { minY: 34 },
  FR: { minX: -6, maxX: 10, minY: 41, maxY: 52 },
  MU: { maxX: 59, minY: -21.5, maxY: -19.5 },
  NL: { minX: 2, maxX: 8, minY: 50 },
  NO: { minX: 0, maxY: 72.5 },
  PT: { minX: -10 },
  ZA: { minY: -36 },
}

const windowContains = (window, bounds) =>
  bounds.minX >= (window.minX ?? Number.NEGATIVE_INFINITY) &&
  bounds.maxX <= (window.maxX ?? Number.POSITIVE_INFINITY) &&
  bounds.minY >= (window.minY ?? Number.NEGATIVE_INFINITY) &&
  bounds.maxY <= (window.maxY ?? Number.POSITIVE_INFINITY)

const MOROCCO_SOUTH_LATITUDE = 27.6666

/* Sutherland–Hodgman against the half-plane lat >= minLatitude */
const clipRingToMinLatitude = (ring, minLatitude) => {
  const clipped = []
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index]
    const next = ring[index + 1]
    const currentInside = current[1] >= minLatitude
    const nextInside = next[1] >= minLatitude
    if (currentInside) clipped.push(current)
    if (currentInside !== nextInside) {
      const ratio = (minLatitude - current[1]) / (next[1] - current[1])
      clipped.push([current[0] + ratio * (next[0] - current[0]), minLatitude])
    }
  }
  if (clipped.length < 3) return null
  clipped.push(clipped[0])
  return clipped
}

const describeNaturalEarthFeature = ({ properties }) =>
  [
    properties?.NAME_EN ?? properties?.NAME ?? 'unnamed',
    `ADM0_A3=${properties?.ADM0_A3 ?? 'missing'}`,
    `ISO_A3=${properties?.ISO_A3 ?? 'missing'}`,
    `ISO_A2=${properties?.ISO_A2 ?? 'missing'}`,
    `TYPE=${properties?.TYPE ?? 'missing'}`,
  ].join(', ')

const featureMatchScore = ({ properties }, country) => {
  if (!properties) return 0

  let score = 0
  if (properties.ADM0_A3 === country.iso3) score += 32
  if (properties.ISO_A3 === country.iso3) score += 16
  if (properties.ISO_A2 === country.code) score += 8
  if (properties.ISO_A3_EH === country.iso3) score += 4
  if (properties.ISO_A2_EH === country.code) score += 2
  return score
}

const featureFor = (collection, country) => {
  const matches = collection.features
    .map((feature) => ({
      feature,
      score: featureMatchScore(feature, country),
    }))
    .filter(({ score }) => score > 0)
    .toSorted((left, right) => right.score - left.score)

  if (matches.length === 0) {
    throw new Error(
      `Natural Earth feature not found for ${country.code}/${country.iso3}`,
    )
  }

  const [best, runnerUp] = matches
  if (runnerUp?.score === best.score) {
    throw new Error(
      `Natural Earth feature is ambiguous for ${country.code}/${country.iso3}: ${matches
        .filter(({ score }) => score === best.score)
        .map(({ feature }) => describeNaturalEarthFeature(feature))
        .join(' | ')}`,
    )
  }

  return best.feature
}

const resolveNaturalEarthFeatures = (collection, countries) => {
  const mappings = new Map()
  const failures = []

  for (const country of countries) {
    try {
      mappings.set(country.code, featureFor(collection, country))
    } catch (error) {
      failures.push(
        error instanceof Error
          ? error.message
          : `Unknown error for ${country.code}`,
      )
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Natural Earth mapping failed for ${failures.length} countries:\n- ${failures.join('\n- ')}`,
    )
  }

  return mappings
}

const filteredPolygons = (feature, minimumAreaRatio) => {
  const polygons = polygonsOf(feature.geometry)
  const totalArea = polygons.reduce(
    (sum, polygon) => sum + Math.abs(signedArea(polygon[0])),
    0,
  )
  return polygons.filter(
    (polygon) =>
      Math.abs(signedArea(polygon[0])) >= totalArea * minimumAreaRatio,
  )
}

const boundsOf = (polygons) => {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  }
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [longitude, latitude] of ring) {
        bounds.minX = Math.min(bounds.minX, longitude)
        bounds.maxX = Math.max(bounds.maxX, longitude)
        bounds.minY = Math.min(bounds.minY, latitude)
        bounds.maxY = Math.max(bounds.maxY, latitude)
      }
    }
  }
  return bounds
}

const centralMeridianOf = (polygons) => {
  const longitudes = polygons
    .flat(2)
    .map(([longitude]) => ((longitude % 360) + 360) % 360)
    .sort((left, right) => left - right)

  if (longitudes.length === 0) {
    throw new Error('Cannot project an empty country shape')
  }

  let largestGap = Number.NEGATIVE_INFINITY
  let intervalStart = longitudes[0]

  for (let index = 0; index < longitudes.length; index += 1) {
    const current = longitudes[index]
    const next =
      index === longitudes.length - 1
        ? longitudes[0] + 360
        : longitudes[index + 1]
    const gap = next - current
    if (gap > largestGap) {
      largestGap = gap
      intervalStart = next % 360
    }
  }

  const coveredLongitude = 360 - largestGap
  const midpoint = (intervalStart + coveredLongitude / 2) % 360
  return midpoint > 180 ? midpoint - 360 : midpoint
}

const longitudeOffsetFrom = (longitude, centralMeridian) => {
  let offset = longitude - centralMeridian
  while (offset < -180) offset += 360
  while (offset > 180) offset -= 360
  return offset
}

const shapeProjector = (polygons) => {
  const centralMeridian = centralMeridianOf(polygons)
  const projectToSinusoidal = ([longitude, latitude]) => {
    const latitudeRadians = latitude * DEGREES_TO_RADIANS
    const longitudeRadians =
      longitudeOffsetFrom(longitude, centralMeridian) * DEGREES_TO_RADIANS

    return [longitudeRadians * Math.cos(latitudeRadians), -latitudeRadians]
  }
  const bounds = boundsOf(
    polygons.map((polygon) =>
      polygon.map((ring) => ring.map(projectToSinusoidal)),
    ),
  )
  // Guard division by zero only; Vatican City (~400m) is real geometry and
  // must not hit the floor or it renders tiny and off-centre.
  const sourceWidth = Math.max(1e-9, bounds.maxX - bounds.minX)
  const sourceHeight = Math.max(1e-9, bounds.maxY - bounds.minY)
  const scale = Math.min(
    (SVG_WIDTH - SHAPE_PADDING * 2) / sourceWidth,
    (SVG_HEIGHT - SHAPE_PADDING * 2) / sourceHeight,
  )
  const renderedWidth = sourceWidth * scale
  const renderedHeight = sourceHeight * scale
  const offsetX = (SVG_WIDTH - renderedWidth) / 2
  const offsetY = (SVG_HEIGHT - renderedHeight) / 2

  return (coordinate) => {
    const [x, y] = projectToSinusoidal(coordinate)
    return [
      round(offsetX + (x - bounds.minX) * scale),
      round(offsetY + (y - bounds.minY) * scale),
    ]
  }
}

const WORLD_WIDTH = 1200
const WORLD_HEIGHT = Number((WORLD_WIDTH / EQUAL_EARTH_ASPECT).toFixed(2))

const worldProject = ([longitude, latitude]) => {
  const point = equalEarthForward(longitude, latitude)
  return [round(point.x * WORLD_WIDTH), round(point.y * WORLD_HEIGHT)]
}

const ringPath = (ring) => {
  if (ring.length < 4) return ''
  const [start, ...rest] = ring
  return `M${start[0]} ${start[1]}${rest
    .slice(0, -1)
    .map(([x, y]) => `L${x} ${y}`)
    .join('')}Z`
}

const polygonPath = (polygon, project, tolerancePx) =>
  polygon
    .map((ring) => ringPath(simplifyRing(ring.map(project), tolerancePx)))
    .filter(Boolean)
    .join('')

const shapeSvgAt = (polygons, project, tolerancePx) => {
  const paths = polygons
    .map((polygon) => polygonPath(polygon, project, tolerancePx))
    .filter(Boolean)
    .map((path) => `<path fill="#e8dfca" fill-rule="evenodd" d="${path}"/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" preserveAspectRatio="xMidYMid meet">${paths}</svg>\n`
}

const shapeSvgWithinBudget = (polygons, project, code) => {
  for (const tolerancePx of SHAPE_PIXEL_TOLERANCES) {
    const svg = shapeSvgAt(polygons, project, tolerancePx)
    if (gzipSync(Buffer.from(svg)).length <= SHAPE_GZIP_BUDGET) return svg
  }
  throw new Error(`Shape ${code} exceeds the gzip budget at every tolerance`)
}

const assertSafeSvg = (source, label) => {
  const unsafe =
    /<script\b|javascript:|\son[a-z]+\s*=|(?:href|src)\s*=\s*["']https?:/iu
  if (unsafe.test(source)) {
    throw new Error(`Unsafe SVG content rejected: ${label}`)
  }
}

const naturalEarthBytes = readFileSync(NATURAL_EARTH_PATH)
const naturalEarthHash = sha256(naturalEarthBytes)
if (naturalEarthHash !== EXPECTED_NATURAL_EARTH_SHA256) {
  throw new Error(
    `Natural Earth checksum mismatch: expected ${EXPECTED_NATURAL_EARTH_SHA256}, received ${naturalEarthHash}`,
  )
}

const naturalEarth = JSON.parse(naturalEarthBytes.toString('utf8'))
if (naturalEarth?.type !== 'FeatureCollection') {
  throw new Error('Natural Earth input must be a GeoJSON FeatureCollection')
}
const naturalEarthFeatures = resolveNaturalEarthFeatures(
  naturalEarth,
  shapeCountries,
)

const naturalEarthLandBytes = readFileSync(NATURAL_EARTH_LAND_PATH)
const naturalEarthLandHash = sha256(naturalEarthLandBytes)
if (naturalEarthLandHash !== EXPECTED_NATURAL_EARTH_LAND_SHA256) {
  throw new Error(
    `Natural Earth land checksum mismatch: expected ${EXPECTED_NATURAL_EARTH_LAND_SHA256}, received ${naturalEarthLandHash}`,
  )
}

const naturalEarthLand = JSON.parse(naturalEarthLandBytes.toString('utf8'))
if (naturalEarthLand?.type !== 'FeatureCollection') {
  throw new Error(
    'Natural Earth land input must be a GeoJSON FeatureCollection',
  )
}

const flagPackagePath = join(
  REPOSITORY_ROOT,
  'node_modules/flag-icons/package.json',
)
const flagPackage = JSON.parse(readFileSync(flagPackagePath, 'utf8'))
if (flagPackage.version !== EXPECTED_FLAG_ICONS_VERSION) {
  throw new Error(
    `flag-icons ${EXPECTED_FLAG_ICONS_VERSION} is required; found ${flagPackage.version}`,
  )
}

const flagSources = new Map()
const missingFlagCodes = []
for (const { code } of flagCountries) {
  const sourcePath = join(
    REPOSITORY_ROOT,
    `node_modules/flag-icons/flags/4x3/${code.toLowerCase()}.svg`,
  )
  if (!existsSync(sourcePath)) {
    missingFlagCodes.push(code)
    continue
  }
  flagSources.set(code, sourcePath)
}
if (missingFlagCodes.length > 0) {
  throw new Error(
    `flag-icons is missing ${missingFlagCodes.length} eligible flags: ${missingFlagCodes.join(', ')}`,
  )
}

const shapeDirectory = join(REPOSITORY_ROOT, 'public/games/geo/assets/shapes')
const flagDirectory = join(REPOSITORY_ROOT, 'public/games/geo/assets/flags')
const mapDirectory = join(REPOSITORY_ROOT, 'public/games/geo/assets/map')
const manifestPath = join(REPOSITORY_ROOT, 'data/geo/generated/assets.json')
for (const directory of [shapeDirectory, flagDirectory, mapDirectory]) {
  ensureDirectory(directory)
}
ensureDirectory(dirname(manifestPath))

const manifest = {
  schemaVersion: 1,
  sourceRevision: countryCorpus.sourceRevision,
  naturalEarth: {
    countries: {
      dataset: 'ne_10m_admin_0_countries',
      sha256: naturalEarthHash,
    },
    land: {
      dataset: 'ne_10m_land',
      sha256: naturalEarthLandHash,
    },
  },
  flagIcons: {
    version: flagPackage.version,
  },
  shapes: {},
  flags: {},
  map: {},
}

for (const country of shapeCountries) {
  const { code } = country
  const feature = naturalEarthFeatures.get(code)
  const minimumAreaRatio = SHAPE_AREA_RATIO_OVERRIDES[code] ?? 0.0005
  let polygons = filteredPolygons(feature, minimumAreaRatio)
  const mainlandWindow = SHAPE_MAINLAND_WINDOWS[code]
  if (mainlandWindow) {
    polygons = polygons.filter((polygon) =>
      windowContains(mainlandWindow, boundsOf([polygon])),
    )
  }
  // Natural Earth draws de-facto borders; the silhouette shows Morocco proper,
  // clipped at the recognized 27°40'N line, without Western Sahara.
  if (code === 'MA') {
    polygons = polygons
      .map((polygon) =>
        polygon
          .map((ring) => clipRingToMinLatitude(ring, MOROCCO_SOUTH_LATITUDE))
          .filter(Boolean),
      )
      .filter((polygon) => polygon.length > 0)
  }
  if (polygons.length === 0) {
    throw new Error(
      `Natural Earth shape for ${code} has no polygons after filtering`,
    )
  }
  const project = shapeProjector(polygons)
  const svg = shapeSvgWithinBudget(polygons, project, code)
  assertSafeSvg(svg, `shape ${code}`)
  const bytes = Buffer.from(svg)
  const hash = sha256(bytes)
  const filename = `${hash.slice(0, 20)}.svg`
  const outputPath = join(shapeDirectory, filename)
  writeFileAtomically(outputPath, bytes)
  manifest.shapes[code] = {
    url: `/games/geo/assets/shapes/${filename}`,
    sha256: hash,
    bytes: bytes.length,
  }
}

for (const { code } of flagCountries) {
  const sourcePath = flagSources.get(code)
  const bytes = readFileSync(sourcePath)
  assertSafeSvg(bytes.toString('utf8'), `flag ${code}`)
  const hash = sha256(bytes)
  const filename = `${hash.slice(0, 20)}.svg`
  const outputPath = join(flagDirectory, filename)
  writeFileAtomically(outputPath, bytes)
  manifest.flags[code] = {
    url: `/games/geo/assets/flags/${filename}`,
    sha256: hash,
    bytes: bytes.length,
  }
}

const allLandPolygons = naturalEarthLand.features
  .filter((feature) => feature.properties?.featurecla !== 'Null island')
  .flatMap((feature) => polygonsOf(feature.geometry))
const totalLandArea = allLandPolygons.reduce(
  (sum, polygon) => sum + Math.abs(signedArea(polygon[0])),
  0,
)
const worldPaths = allLandPolygons
  .filter(
    (polygon) => Math.abs(signedArea(polygon[0])) >= totalLandArea * 0.00001,
  )
  .map((polygon) => polygonPath(polygon, worldProject, WORLD_PIXEL_TOLERANCE))
  .filter(Boolean)
  .join('')
const worldSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}" preserveAspectRatio="xMidYMid meet"><path fill="#a59a78" fill-rule="evenodd" d="${worldPaths}"/></svg>\n`
assertSafeSvg(worldSvg, 'world map')
const worldBytes = Buffer.from(worldSvg)
const worldPath = join(mapDirectory, 'world-map.svg')
writeFileAtomically(worldPath, worldBytes)
manifest.map = {
  url: '/games/geo/assets/map/world-map.svg',
  sha256: sha256(worldBytes),
  bytes: worldBytes.length,
  projection: 'EqualEarth',
}

for (const country of countryCorpus.countries) {
  country.assets = {
    shapeUrl: manifest.shapes[country.code]?.url,
    flagUrl: manifest.flags[country.code]?.url,
  }
}

for (const [directory, entries] of [
  [shapeDirectory, manifest.shapes],
  [flagDirectory, manifest.flags],
]) {
  const expectedFilenames = new Set(
    Object.values(entries).map(({ url }) => url.split('/').at(-1)),
  )
  for (const filename of readdirSync(directory)) {
    if (
      GENERATED_ASSET_FILENAME.test(filename) &&
      !expectedFilenames.has(filename)
    ) {
      unlinkSync(join(directory, filename))
    }
  }
}

writeFileAtomically(manifestPath, stableJson(manifest))
writeFileAtomically(CORPUS_PATH, stableJson(countryCorpus))

console.log(
  `Generated ${shapeCountries.length} shapes, ${flagCountries.length} flags, and one world map.`,
)
console.log(`Asset manifest: ${manifestPath}`)
console.log(`Normalized corpus: ${CORPUS_PATH}`)
