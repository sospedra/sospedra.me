#!/usr/bin/env node

/**
 * Stamps each of the 188 catalogue eclipses with the countries its center line
 * visits, into repo/papers/total-eclipse/data/eclipses.json as field `c`.
 *
 * A center line is a line, and the umbra is a band about 294 km wide around it.
 * So a historical country counts when its land falls within half that width of
 * the line, or when the line runs across the country outright. Outlines come
 * from the same pinned Natural Earth commit the coastline builder uses,
 * simplified hard and then densified, because the test measures distance to an
 * edge.
 *
 * The 2026 eclipse gets the exact treatment: its own ephemeris decides which
 * ground reaches totality. A fixed band width is wrong at the ends of a track,
 * where grazing incidence stretches the umbra over a thousand kilometres, and
 * that is exactly where Russia sits.
 *
 *   node scripts/papers/build-eclipse-catalogue.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createShadowEngine } from '../../repo/papers/total-eclipse/shadow-engine.ts'
import { simplifyRing } from '../geo/lib-polygon-geometry.mjs'

const NATURAL_EARTH_COMMIT = 'ca96624a56bd078437bca8184e78163e5039ad19'
const SOURCE_URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_COMMIT}/geojson/ne_10m_admin_0_countries.geojson`
const CACHE_PATH = '/tmp/ne10c.json'
const CATALOGUE_PATH = 'repo/papers/total-eclipse/data/eclipses.json'

/** Half the umbra width on 12 August 2026, rounded down. */
const BAND_HALF_WIDTH_KM = 147
const OUTLINE_TOLERANCE_DEG = 0.25
const DENSIFY_DEG = 0.5
const MIN_RING_AREA_DEG2 = 0.02

/**
 * Home windows keep overseas territories and the antimeridian out. France means
 * mainland France here, not Réunion.
 */
const COUNTRIES = [
  { code: 'RU', iso3: 'RUS', home: [19, 41, 180, 82] },
  { code: 'GL', iso3: 'GRL', home: [-75, 59, -11, 84] },
  { code: 'IS', iso3: 'ISL', home: [-25, 63, -13, 67] },
  { code: 'ES', iso3: 'ESP', home: [-19, 27, 5, 44] },
  { code: 'PT', iso3: 'PRT', home: [-32, 32, -6, 43] },
  { code: 'FR', iso3: 'FRA', home: [-6, 41, 10, 52] },
  { code: 'GB', iso3: 'GBR', home: [-9, 49, 2, 61] },
  { code: 'IE', iso3: 'IRL', home: [-11, 51, -5, 56] },
  { code: 'DK', iso3: 'DNK', home: [7, 54, 16, 58] },
]

const loadSource = async () => {
  if (existsSync(CACHE_PATH))
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  const response = await fetch(SOURCE_URL)
  if (!response.ok) {
    throw new Error(`natural earth fetch failed: ${response.status}`)
  }
  const text = await response.text()
  writeFileSync(CACHE_PATH, text)
  return JSON.parse(text)
}

const polygonsOf = (geometry) =>
  geometry.type === 'MultiPolygon'
    ? geometry.coordinates
    : [geometry.coordinates]

const ringArea = (ring) => {
  let sum = 0
  for (let i = 0; i < ring.length; i += 1) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[(i + 1) % ring.length]
    sum += x0 * y1 - x1 * y0
  }
  return Math.abs(sum) / 2
}

const insideHome = ([x, y], [x0, y0, x1, y1]) =>
  x >= x0 && x <= x1 && y >= y0 && y <= y1

/** Straight vertex insertion, so nearest-vertex distance approximates an edge. */
const densify = (ring) => {
  const dense = []
  for (let i = 0; i < ring.length; i += 1) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[(i + 1) % ring.length]
    dense.push([ax, ay])
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / DENSIFY_DEG)
    for (let step = 1; step < steps; step += 1) {
      dense.push([
        ax + ((bx - ax) * step) / steps,
        ay + ((by - ay) * step) / steps,
      ])
    }
  }
  return dense
}

const homeRing = (polygon, home) => {
  const [ring] = polygon
  if (!ring || ringArea(ring) < MIN_RING_AREA_DEG2) return null
  if (!ring.some((point) => insideHome(point, home))) return null
  const simplified = simplifyRing(ring, OUTLINE_TOLERANCE_DEG)
  if (simplified.length < 4) return null
  return { ring: simplified, dense: densify(simplified) }
}

const outlineFor = (features, country) =>
  features
    .filter(
      (feature) =>
        feature.geometry && feature.properties.ADM0_A3 === country.iso3,
    )
    .flatMap((feature) => polygonsOf(feature.geometry))
    .map((polygon) => homeRing(polygon, country.home))
    .filter(Boolean)

const pointInRing = ([x, y], ring) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

const RADIANS = Math.PI / 180

const greatCircleKm = (fromLat, fromLon, toLat, toLon) => {
  const dLat = (toLat - fromLat) * RADIANS
  const dLon = (toLon - fromLon) * RADIANS
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat * RADIANS) *
      Math.cos(toLat * RADIANS) *
      Math.sin(dLon / 2) ** 2
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Latitude prefilter: 2.2 degrees already exceeds the half-band in km. */
const nearDenseRing = (lat, lon, dense) =>
  dense.some(
    ([vx, vy]) =>
      Math.abs(vy - lat) <= 2.2 &&
      greatCircleKm(lat, lon, vy, vx) <= BAND_HALF_WIDTH_KM,
  )

const ringTouched = (lat, lon, { ring, dense }) =>
  pointInRing([lon, lat], ring) || nearDenseRing(lat, lon, dense)

const touchesOutline = (path, rings) =>
  path.some(([lon, lat]) => rings.some((entry) => ringTouched(lat, lon, entry)))

const PAPER_DATE = '2026-08-12'
const SHADOW_PATH = 'repo/papers/total-eclipse/data/shadow.json'
const TOTALITY_SCAN_STEP_DEG = 0.4

const claimGround = (lat, lon, outlines, hits) => {
  for (const outline of outlines) {
    if (hits.has(outline.code)) continue
    if (outline.rings.some(({ ring }) => pointInRing([lon, lat], ring))) {
      hits.add(outline.code)
    }
  }
}

/** One scan row, warm-starting each cell from its western neighbour. */
const scanRow = (engine, lat, outlines, hits) => {
  let hint
  for (let lon = -60; lon <= 140; lon += TOTALITY_SCAN_STEP_DEG) {
    const site = engine.siteAt(lat, lon)
    const maximum = engine.maximumTime(site, hint)
    hint = maximum
    if (engine.bandMargin(engine.instantAt(site, maximum)) > 0) {
      claimGround(lat, lon, outlines, hits)
    }
  }
}

/** Every country whose land reaches totality on 12 August 2026, exactly. */
const bandCountries = (outlines) => {
  const { b64 } = JSON.parse(readFileSync(SHADOW_PATH, 'utf8'))
  const engine = createShadowEngine(b64)
  const hits = new Set()
  const pending = outlines.filter((outline) => outline.rings.length > 0)
  for (let lat = 88; lat >= 35; lat -= TOTALITY_SCAN_STEP_DEG) {
    scanRow(engine, lat, pending, hits)
  }
  return [...hits]
}

const build = async () => {
  const source = await loadSource()
  const outlines = COUNTRIES.map((country) => ({
    code: country.code,
    rings: outlineFor(source.features, country),
  }))
  for (const outline of outlines) {
    const vertices = outline.rings.reduce((n, r) => n + r.dense.length, 0)
    console.log(
      `${outline.code}  rings ${String(outline.rings.length).padStart(2)}  dense verts ${vertices}`,
    )
  }

  const exact = bandCountries(outlines)
  const order = new Map(
    COUNTRIES.map((country, index) => [country.code, index]),
  )
  const sortByTable = (codes) =>
    codes.toSorted((left, right) => order.get(left) - order.get(right))

  const catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8'))
  const tally = {}
  for (const eclipse of catalogue) {
    eclipse.c =
      eclipse.d === PAPER_DATE
        ? sortByTable(exact)
        : outlines
            .filter((outline) => touchesOutline(eclipse.p, outline.rings))
            .map((outline) => outline.code)
    for (const code of eclipse.c) tally[code] = (tally[code] ?? 0) + 1
  }
  writeFileSync(CATALOGUE_PATH, JSON.stringify(catalogue))

  console.log('\ncentury hits per country')
  for (const country of COUNTRIES) {
    console.log(`  ${country.code}  ${tally[country.code] ?? 0}`)
  }
  console.log(`\n${PAPER_DATE} totality on land → ${exact.join(' ')}`)
  console.log(
    `${CATALOGUE_PATH}  ${(JSON.stringify(catalogue).length / 1024).toFixed(1)} KiB`,
  )
}

await build()
