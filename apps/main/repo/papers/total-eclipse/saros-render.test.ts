import assert from 'node:assert/strict'
import test from 'node:test'
import { project, unproject, type View } from './saros-render.ts'

const VIEW: View = {
  centerLon: -30,
  centerLat: 40,
  radius: 220,
  cx: 300,
  cy: 260,
}

test('unproject inverts project across the front hemisphere', () => {
  let checked = 0
  for (let lon = -180; lon < 180; lon += 15) {
    for (let lat = -80; lat <= 80; lat += 10) {
      const at = project(lon, lat, VIEW)
      if (!at.front) continue
      const back = unproject(at.x, at.y, VIEW)
      assert.ok(back, `${lon},${lat} unprojected to null`)
      const dLon = Math.abs(((back[0] - lon + 540) % 360) - 180)
      assert.ok(dLon < 1e-6, `${lon},${lat} lon came back ${back[0]}`)
      assert.ok(
        Math.abs(back[1] - lat) < 1e-6,
        `${lon},${lat} lat came back ${back[1]}`,
      )
      checked++
    }
  }
  assert.ok(checked > 150, `only ${checked} front points checked`)
})

test('unproject returns null outside the disc', () => {
  assert.equal(unproject(VIEW.cx + VIEW.radius + 1, VIEW.cy, VIEW), null)
  assert.equal(unproject(0, 0, VIEW), null)
})

test('the disc center unprojects to the view center', () => {
  const center = unproject(VIEW.cx, VIEW.cy, VIEW)
  assert.ok(center)
  assert.ok(Math.abs(center[0] - VIEW.centerLon) < 1e-9)
  assert.ok(Math.abs(center[1] - VIEW.centerLat) < 1e-9)
})
