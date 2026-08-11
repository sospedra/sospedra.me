#!/usr/bin/env node

/**
 * Builds the world assets for the draggable eclipse map, committed under
 * repo/papers/total-eclipse/data/world/:
 *
 *   land.json      Natural Earth 50m coastlines, simplified and quantized
 *   overlays.json  the 12 Aug 2026 umbra band and max-obscuration isolines,
 *                  computed globally from the DE421 shadow samples
 *
 *   node scripts/papers/build-eclipse-world.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { contours } from 'd3-contour'
import { createShadowEngine } from '../../repo/papers/total-eclipse/shadow-engine.ts'
import { signedArea, simplifyRing } from '../geo/lib-polygon-geometry.mjs'
import { intersectsBox } from './lib-ring-clip.mjs'

const NATURAL_EARTH_COMMIT = 'ca96624a56bd078437bca8184e78163e5039ad19'
const SOURCE_URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_COMMIT}/geojson/ne_50m_land.geojson`
const CACHE_PATH = '/tmp/ne50.json'
const OUTPUT_DIR = 'repo/papers/total-eclipse/data/world'
const SHADOW_PATH = 'repo/papers/total-eclipse/data/shadow.json'

const LAND_TOLERANCE_DEG = 0.04
const LAND_MIN_AREA_DEG2 = 0.05
const COORDINATE_DECIMALS = 2

/** The shadow never leaves this window; panning clamps to it. Rings ship
 * whole because Sutherland-Hodgman mangles concave coastlines: bowtie bridges
 * along the cut flip sea to land under the nonzero fill rule. */
const FIELD = { west: -150, east: 165, south: 0, north: 89.5, step: 0.35 }
const LAND_BOX = [FIELD.west, FIELD.south, FIELD.east, FIELD.north]
const OBSCURATION_LEVELS = [0.005, 0.2, 0.4, 0.6, 0.8, 0.9, 0.95]
/** The map shows the visible eclipse: below this sun altitude it happens
 * after sunset, so the display fields cut off. Refraction keeps -1. */
const HORIZON_CUT_DEG = -1
const CONTOUR_TOLERANCE_DEG = 0.12
const MIN_CONTOUR_VERTICES = 12

const loadLandSource = async () => {
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

const round = (value) => Number(value.toFixed(COORDINATE_DECIMALS))

const clockwise = (ring) =>
  signedArea([...ring, ring[0]]) > 0 ? ring.toReversed() : ring

const ringArea = (ring) => Math.abs(signedArea([...ring, ring[0]]))

const buildLand = (source) => {
  const rings = source.features
    .flatMap((feature) =>
      feature.geometry.type === 'MultiPolygon'
        ? feature.geometry.coordinates
        : [feature.geometry.coordinates],
    )
    .flat()
    .filter(
      (ring) =>
        ringArea(ring) >= LAND_MIN_AREA_DEG2 && intersectsBox(ring, LAND_BOX),
    )
    .map((ring) => simplifyRing(ring, LAND_TOLERANCE_DEG))
    .filter((ring) => ring.length >= 4)
    .map((ring) => clockwise(ring.map(([x, y]) => [round(x), round(y)])))
  const vertices = rings.reduce((total, ring) => total + ring.length, 0)
  console.log(`land  rings ${rings.length}  verts ${vertices}`)
  return rings
}

const columnsOf = () => Math.round((FIELD.east - FIELD.west) / FIELD.step)
const rowsOf = () => Math.round((FIELD.north - FIELD.south) / FIELD.step)

const computeGlobalField = (engine) => {
  const columns = columnsOf()
  const rows = rowsOf()
  const obscuration = new Float64Array(columns * rows)
  const margin = new Float64Array(columns * rows)
  for (let row = 0; row < rows; row += 1) {
    const latitude = FIELD.north - (row + 0.5) * FIELD.step
    let hint
    for (let column = 0; column < columns; column += 1) {
      const longitude = FIELD.west + (column + 0.5) * FIELD.step
      const site = engine.siteAt(latitude, longitude)
      const maximum = engine.maximumTime(site, hint)
      hint = maximum
      const moment = engine.instantAt(site, maximum)
      const risen = moment.sunAltitude >= HORIZON_CUT_DEG
      obscuration[row * columns + column] = risen ? moment.obscuration : 0
      margin[row * columns + column] = risen ? engine.bandMargin(moment) : -1
    }
  }
  return { obscuration, margin, columns, rows }
}

const gridRingToGeo = (ring) =>
  ring.map(([x, y]) => [
    FIELD.west + x * FIELD.step,
    FIELD.north - y * FIELD.step,
  ])

const contourRings = (values, field, thresholds) =>
  contours()
    .size([field.columns, field.rows])
    .thresholds(thresholds)(Array.from(values))
    .map((contour) => ({
      level: contour.value,
      rings: contour.coordinates
        .flat()
        .map((ring) =>
          simplifyRing(gridRingToGeo(ring).toReversed(), CONTOUR_TOLERANCE_DEG),
        )
        .filter((ring) => ring.length >= MIN_CONTOUR_VERTICES)
        .map((ring) => clockwise(ring.map(([x, y]) => [round(x), round(y)]))),
    }))
    .filter((contour) => contour.rings.length > 0)

const build = async () => {
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const land = buildLand(await loadLandSource())
  const landPayload = {
    source: {
      dataset: 'ne_50m_land',
      repository: 'nvkelso/natural-earth-vector',
      commit: NATURAL_EARTH_COMMIT,
      license: 'Public-Domain',
      builtBy: 'scripts/papers/build-eclipse-world.mjs',
    },
    rings: land,
  }
  const landText = JSON.stringify(landPayload)
  writeFileSync(`${OUTPUT_DIR}/land.json`, landText)
  console.log(`land.json  ${(landText.length / 1024).toFixed(1)} KiB`)

  const { b64 } = JSON.parse(readFileSync(SHADOW_PATH, 'utf8'))
  const engine = createShadowEngine(b64)
  const started = process.hrtime.bigint()
  const field = computeGlobalField(engine)
  const elapsed = Number(process.hrtime.bigint() - started) / 1e9
  console.log(
    `field  ${field.columns}x${field.rows} at ${FIELD.step} deg in ${elapsed.toFixed(1)}s`,
  )

  const [band] = contourRings(field.margin, field, [0])
  const isolines = contourRings(field.obscuration, field, OBSCURATION_LEVELS)
  const overlays = {
    builtBy: 'scripts/papers/build-eclipse-world.mjs',
    gridStepDeg: FIELD.step,
    band: band?.rings ?? [],
    isolines: isolines.map((contour) => ({
      level: contour.level,
      rings: contour.rings,
    })),
  }
  const overlaysText = JSON.stringify(overlays)
  writeFileSync(`${OUTPUT_DIR}/overlays.json`, overlaysText)
  for (const contour of isolines) {
    const vertices = contour.rings.reduce((n, ring) => n + ring.length, 0)
    console.log(
      `isoline ${(contour.level * 100).toFixed(1).padStart(5)}%  rings ${contour.rings.length}  verts ${vertices}`,
    )
  }
  console.log(
    `band rings ${overlays.band.length}  overlays.json  ${(overlaysText.length / 1024).toFixed(1)} KiB`,
  )
}

await build()
