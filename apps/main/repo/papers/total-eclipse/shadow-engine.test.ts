import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { createShadowEngine } from './shadow-engine.ts'

const { b64 } = JSON.parse(
  readFileSync(join(import.meta.dirname, 'data/shadow.json'), 'utf8'),
)
const engine = createShadowEngine(b64)

const REYKJAVIK = [64.1466, -21.9426] as const
const LATRABJARG = [65.5022, -24.5325] as const
const OVIEDO = [43.3619, -5.8494] as const
const MADRID = [40.4168, -3.7038] as const
const STATION_NORD = [81.6, -16.66] as const
const CAPE_TOWN = [-33.92, 18.42] as const

test('the sample window covers the whole umbral track', () => {
  assert.equal(engine.startSeconds, 16.5 * 3600)
  assert.equal(engine.endSeconds, 21 * 3600)
  assert.equal(engine.axisGroundPoint(engine.startSeconds), null)
  assert.notEqual(engine.axisGroundPoint(17.75 * 3600), null)
})

test('greatest eclipse sits off Iceland at 65 north, 25 west', () => {
  let best: { latitude: number; longitude: number } | null = null
  let bestSeconds = 0
  for (let t = engine.startSeconds; t <= engine.endSeconds; t += 30) {
    const ground = engine.axisGroundPoint(t)
    if (!ground) continue
    const seconds =
      engine.circumstances(ground.latitude, ground.longitude).totality
        ?.seconds ?? 0
    if (seconds > bestSeconds) {
      bestSeconds = seconds
      best = ground
    }
  }
  assert.ok(best)
  assert.ok(Math.abs(best.latitude - 65.2) < 1, `latitude ${best.latitude}`)
  assert.ok(
    Math.abs(best.longitude + 25.2) < 1.5,
    `longitude ${best.longitude}`,
  )
  assert.ok(bestSeconds > 135 && bestSeconds < 145, `${bestSeconds} s`)
})

test('Látrabjarg holds the longest totality on land', () => {
  const cliffs = engine.circumstances(...LATRABJARG)
  const capital = engine.circumstances(...REYKJAVIK)
  assert.ok(cliffs.totality)
  assert.ok(capital.totality)
  assert.ok(cliffs.totality.seconds > capital.totality.seconds)
  assert.ok(Math.abs(cliffs.totality.seconds - 134) < 4)
  assert.ok(Math.abs(capital.totality.seconds - 63) < 4)
})

test('Oviedo is inside the band and Madrid is not', () => {
  const oviedo = engine.circumstances(...OVIEDO)
  const madrid = engine.circumstances(...MADRID)
  assert.ok(oviedo.totality)
  assert.ok(Math.abs(oviedo.totality.seconds - 110) < 4)
  assert.equal(madrid.totality, undefined)
  assert.ok(madrid.maxObscuration > 0.999)
  assert.ok(madrid.maxObscuration < 1)
})

test('Station Nord catches seconds of totality', () => {
  const nord = engine.circumstances(...STATION_NORD)
  assert.ok(nord.totality)
  assert.ok(nord.totality.seconds > 10 && nord.totality.seconds < 40)
})

test('contacts bracket the maximum and totality sits inside them', () => {
  const oviedo = engine.circumstances(...OVIEDO)
  const line = oviedo.timeline
  assert.ok(line && oviedo.totality)
  assert.ok(line.firstContact < oviedo.totality.start)
  assert.ok(oviedo.totality.start < line.maximum)
  assert.ok(line.maximum < oviedo.totality.end)
  assert.ok(oviedo.totality.end < line.lastContact)
  assert.equal(
    engine.instantAt(oviedo.site, line.firstContact - 60).obscuration,
    0,
  )
})

test('a site the shadow never reaches reports no timeline', () => {
  const capeTown = engine.circumstances(...CAPE_TOWN)
  assert.equal(capeTown.maxObscuration, 0)
  assert.equal(capeTown.timeline, undefined)
})

test('the sun sits low over Spain and high over Iceland', () => {
  const spain = engine.circumstances(...OVIEDO).timeline
  const iceland = engine.circumstances(...REYKJAVIK).timeline
  assert.ok(spain && iceland)
  assert.ok(spain.sunAltitude < 12)
  assert.ok(iceland.sunAltitude > 20)
  assert.ok(spain.sunAzimuth > 270 && spain.sunAzimuth < 300)
})

test('a warm-started maximum matches a cold search', () => {
  const site = engine.siteAt(41.5, -1.5)
  const cold = engine.maximumTime(site)
  const warm = engine.maximumTime(site, cold + 300)
  assert.ok(Math.abs(cold - warm) < 0.5, `${cold} vs ${warm}`)
})

test('a hint pointing at the wrong hour falls back to the full scan', () => {
  const site = engine.siteAt(41.5, -1.5)
  const cold = engine.maximumTime(site)
  const misled = engine.maximumTime(site, engine.startSeconds + 60)
  assert.ok(Math.abs(cold - misled) < 0.5, `${cold} vs ${misled}`)
})
