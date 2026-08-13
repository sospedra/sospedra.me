#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertSafeSvg,
  ensureDirectory,
  sha256,
  stableJson,
  writeFileAtomically,
} from './lib-asset-files.mjs'
import {
  generateCountryShapes,
  resolveNaturalEarthFeatures,
} from './lib-country-shapes.mjs'
import { polygonPath, polygonsOf, signedArea } from './lib-polygon-geometry.mjs'
import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  worldProject,
} from './lib-shape-projection.mjs'

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
const CORPUS_PATH = join(REPOSITORY_ROOT, 'repo/geo/generated/countries.json')
const GENERATED_ASSET_FILENAME = /^[a-f0-9]{20}\.svg$/u
const WORLD_PIXEL_TOLERANCE = 0.8

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
const manifestPath = join(REPOSITORY_ROOT, 'repo/geo/generated/assets.json')
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

generateCountryShapes({
  shapeCountries,
  naturalEarthFeatures,
  shapeDirectory,
  manifest,
})

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

// The Mercator frame crops at 60°S; Antarctica would clamp into a
// zero-area smear along the bottom edge.
const insideWorldCrop = (polygon) =>
  polygon[0].some(([, latitude]) => latitude > -60)

const allLandPolygons = naturalEarthLand.features
  .filter((feature) => feature.properties?.featurecla !== 'Null island')
  .flatMap((feature) => polygonsOf(feature.geometry))
  .filter(insideWorldCrop)
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
  projection: 'WebMercatorCropped',
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
