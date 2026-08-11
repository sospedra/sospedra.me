import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CORONA_LUX,
  DISC_CONFIGS,
  luxAt,
  luxGaugePosition,
  momentAt,
  NOON_LUX,
  overlapFraction,
  purkinjeBlend,
  sceneDarkness,
  verdictAt,
} from './overlap-optics.ts'

test('the overlap fraction covers the three regimes', () => {
  assert.equal(overlapFraction(3, 1, 1.045), 0)
  assert.equal(overlapFraction(0, 1, 1.045), 1)
  assert.ok(Math.abs(overlapFraction(0, 1, 0.955) - 0.955 ** 2) < 1e-12)
  const half = overlapFraction(1, 1, 1)
  assert.ok(half > 0.35 && half < 0.45, `${half}`)
})

test('a total pass reaches totality and an annular one never does', () => {
  const total = momentAt('total', 0)
  assert.equal(total.totality, true)
  assert.equal(total.obscuration, 1)
  const annular = momentAt('annular', 0)
  assert.equal(annular.totality, false)
  assert.equal(annular.ringOfFire, true)
  assert.ok(annular.obscuration < 0.92)
})

test('a partial pass tops out well short of the switch', () => {
  const partial = momentAt('partial', 0)
  assert.equal(partial.totality, false)
  assert.equal(partial.ringOfFire, false)
  assert.ok(partial.obscuration > 0.4 && partial.obscuration < 0.75)
})

test('the ends of every pass are clear sun', () => {
  for (const kind of ['total', 'annular', 'partial'] as const) {
    assert.equal(momentAt(kind, -1).obscuration, 0, kind)
    assert.equal(momentAt(kind, 1).obscuration, 0, kind)
  }
})

test('the diamond ring flashes just outside totality', () => {
  const config = DISC_CONFIGS.total
  const edgeT = (config.moonRadius - 1) / ((1 + config.moonRadius) * 1.25)
  const justOutside = momentAt('total', edgeT * 1.3)
  assert.equal(justOutside.totality, false)
  assert.equal(justOutside.diamondRing, true)
})

test('the lux ladder matches the paper', () => {
  assert.equal(luxAt(momentAt('total', -1)), NOON_LUX)
  assert.equal(luxAt(momentAt('total', 0)), CORONA_LUX)
  const lastPercent = luxAt({
    ...momentAt('total', 0),
    totality: false,
    obscuration: 0.99,
  })
  assert.ok(Math.abs(lastPercent - 1000) < 1, `${lastPercent}`)
})

test('the gauge runs the log scale from corona to noon', () => {
  assert.equal(luxGaugePosition(NOON_LUX), 1)
  assert.equal(luxGaugePosition(CORONA_LUX), 0)
  const middle = luxGaugePosition(160)
  assert.ok(middle > 0.45 && middle < 0.55, `${middle}`)
})

test('purkinje wakes below a thousand lux and saturates by one', () => {
  assert.equal(purkinjeBlend(NOON_LUX), 0)
  assert.equal(purkinjeBlend(1000), 0)
  assert.ok(purkinjeBlend(100) > 0.3)
  assert.equal(purkinjeBlend(1), 1)
  assert.equal(purkinjeBlend(CORONA_LUX), 1)
})

test('darkness climbs as the light dies', () => {
  assert.equal(sceneDarkness(NOON_LUX), 0)
  assert.ok(sceneDarkness(1000) > 0.3)
  assert.equal(sceneDarkness(CORONA_LUX), 1)
})

test('every regime gets its own verdict line', () => {
  assert.match(verdictAt(momentAt('total', 0)), /Glasses off/)
  assert.match(verdictAt(momentAt('annular', 0)), /ring of fire/i)
  assert.match(verdictAt(momentAt('partial', 0)), /pupils are cheating/)
  assert.match(verdictAt(momentAt('total', -1)), /closing in/)
})
