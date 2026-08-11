import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { createShadowEngine } from './shadow-engine.ts'
import {
  bandOutline,
  centerLine,
  computeField,
  type FrameBox,
  GRID_COLUMNS,
  GRID_ROWS,
  nearestBandPoint,
  obscurationLevels,
  PAYING_TOTALITY_SECONDS,
  type UmbraField,
} from './umbra-field.ts'

const { b64 } = JSON.parse(
  readFileSync(join(import.meta.dirname, 'data/shadow.json'), 'utf8'),
)
const engine = createShadowEngine(b64)

const IBERIA: FrameBox = [-11, 34.8, 5.4, 44.6]
const DENMARK: FrameBox = [6.8, 54.2, 16, 58.2]

const fieldOf = (values: number[]): UmbraField => ({
  obscuration: Float64Array.from(values),
  margin: new Float64Array(values.length),
})

const flat = (value: number) =>
  fieldOf(new Array(GRID_COLUMNS * GRID_ROWS).fill(value))

const ramp = (low: number, high: number) =>
  fieldOf(
    Array.from(
      { length: GRID_COLUMNS * GRID_ROWS },
      (_, index) =>
        low + ((high - low) * index) / (GRID_COLUMNS * GRID_ROWS - 1),
    ),
  )

test('a flat field draws no contour at all', () => {
  assert.deepEqual(obscurationLevels(flat(0.9)), [])
  assert.deepEqual(obscurationLevels(flat(0)), [])
})

test('a wide range keeps the round levels closest to the switch', () => {
  assert.deepEqual(
    obscurationLevels(ramp(0.85, 1)),
    [0.94, 0.96, 0.97, 0.98, 0.99, 0.995],
  )
})

test('a narrow range falls back to an even step, so Denmark draws something', () => {
  const levels = obscurationLevels(ramp(0.83, 0.863))
  assert.ok(levels.length >= 3, `${levels.length} levels`)
  assert.ok(levels.every((level) => level > 0.83 && level < 0.863))
  const steps = new Set(
    levels
      .slice(1)
      .map((level, index) => Number((level - levels[index]).toFixed(4))),
  )
  assert.equal(steps.size, 1, 'steps must be even')
})

test('the Iberian frame reaches totality and the Danish frame does not', () => {
  const iberia = computeField(engine, IBERIA)
  const denmark = computeField(engine, DENMARK)
  assert.ok(bandOutline(iberia, IBERIA))
  assert.equal(bandOutline(denmark, DENMARK), null)
  assert.ok(Math.max(...denmark.obscuration) < 0.88)
})

test('the warm-started grid matches a cold search cell by cell', () => {
  const field = computeField(engine, IBERIA)
  const [west, south, east, north] = IBERIA
  for (const [row, column] of [
    [0, 0],
    [17, 40],
    [33, 51],
    [50, 88],
    [GRID_ROWS - 1, GRID_COLUMNS - 1],
  ]) {
    const latitude = north - ((row + 0.5) * (north - south)) / GRID_ROWS
    const longitude = west + ((column + 0.5) * (east - west)) / GRID_COLUMNS
    const site = engine.siteAt(latitude, longitude)
    const cold = engine.instantAt(site, engine.maximumTime(site)).obscuration
    const warm = field.obscuration[row * GRID_COLUMNS + column]
    assert.ok(Math.abs(cold - warm) < 1e-6, `cell ${row},${column}`)
  }
})

test('the center line runs from Siberia to the Mediterranean', () => {
  const line = centerLine(engine, 30)
  assert.ok(line.length > 150)
  assert.ok(line[0].latitude > 75 && line[0].longitude > 100)
  const last = line[line.length - 1]
  assert.ok(last.latitude < 42 && last.longitude > 0)
  for (let index = 1; index < line.length; index += 1) {
    assert.ok(line[index].seconds > line[index - 1].seconds)
  }
})

test('a site already inside the band is told to stay put', () => {
  const line = centerLine(engine, 30)
  assert.equal(nearestBandPoint(engine, line, 43.3619, -5.8494), null)
})

test('Madrid is told the drive that buys a minute, not the drive to the edge', () => {
  const line = centerLine(engine, 30)
  const drive = nearestBandPoint(engine, line, 40.4168, -3.7038)
  assert.ok(drive)
  assert.equal(drive.compass, 'NE')
  assert.ok(drive.km > 25 && drive.km < 50, `${drive.km} km`)
  const paid = engine.circumstances(drive.latitude, drive.longitude)
  assert.ok(paid.totality)
  assert.ok(paid.totality.seconds >= PAYING_TOTALITY_SECONDS - 1)
  assert.ok(drive.centerKm > drive.km)
  assert.ok(drive.centerSeconds > 90)
})
