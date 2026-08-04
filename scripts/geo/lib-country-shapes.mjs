import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import {
  assertSafeSvg,
  sha256,
  writeFileAtomically,
} from './lib-asset-files.mjs'
import {
  boundsOf,
  filteredPolygons,
  polygonPath,
} from './lib-polygon-geometry.mjs'
import {
  SVG_HEIGHT,
  SVG_WIDTH,
  shapeProjector,
} from './lib-shape-projection.mjs'

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

export const resolveNaturalEarthFeatures = (collection, countries) => {
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

export const generateCountryShapes = ({
  shapeCountries,
  naturalEarthFeatures,
  shapeDirectory,
  manifest,
}) => {
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
}
