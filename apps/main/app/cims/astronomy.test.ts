import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { moonPosition, skyDirection, sunPosition } from './astronomy.ts'

const vectors = JSON.parse(
  readFileSync(join(import.meta.dirname, 'golden-vectors.json'), 'utf8'),
)

const assertClose = (actual: number, expected: number) => {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${actual} differs from ${expected}`,
  )
}

test('sun position matches the prototype at pinned instants', () => {
  vectors.astronomy.dates.forEach((date: string, i: number) => {
    const p = sunPosition(new Date(date))
    const [azN, elev, dec] = vectors.astronomy.sun[i]
    assertClose(p.azN, azN)
    assertClose(p.elev, elev)
    assertClose(p.dec, dec)
  })
})

test('moon position matches the prototype at pinned instants', () => {
  vectors.astronomy.dates.forEach((date: string, i: number) => {
    const p = moonPosition(new Date(date))
    const [azN, elev, dec] = vectors.astronomy.moon[i]
    assertClose(p.azN, azN)
    assertClose(p.elev, elev)
    assertClose(p.dec, dec)
  })
})

test('sky direction points north at the horizon and up at the zenith', () => {
  const north = skyDirection(Math.PI, 0)
  assertClose(north[0], 0)
  assertClose(north[1], 0)
  assertClose(north[2], 1)
  const zenith = skyDirection(0, Math.PI / 2)
  assertClose(zenith[1], 1)
})
