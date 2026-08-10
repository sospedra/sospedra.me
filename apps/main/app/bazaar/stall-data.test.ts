import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { artSrc } from './art-version'
import { DESKTOP_FLOORS, MOBILE_FLOORS } from './floors'
import { STALLS } from './stall-catalog'
import { layerFiles, STALL_SCENES } from './stalls-manifest'
import { SKYLINE_WARM, STREET_WARM } from './warm-list'

const bazaarImages = join(import.meta.dirname, '../../public/images/bazaar')
const publicDir = join(import.meta.dirname, '../../public')

test('every stall layer file exists on disk', () => {
  for (const [id, scene] of Object.entries(STALL_SCENES)) {
    for (const layer of scene.layers) {
      for (const file of layerFiles(layer)) {
        const path = join(bazaarImages, id, file)
        assert.ok(existsSync(path), `missing ${id}/${file}`)
      }
    }
  }
})

test('map stall routes to the bazaar paper', () => {
  assert.equal(STALLS.map.href, '/papers/bazaar')
  const paper = join(import.meta.dirname, '../../repo/papers/bazaar/index.mdx')
  assert.ok(existsSync(paper), 'bazaar paper mdx missing')
})

const PLACED_STALLS = [
  'console',
  'games',
  'manual',
  'map',
  'papers',
  'talks',
  'travel',
  'uses',
  'w98',
] as const

const assertPlacedOnce = (ids: string[]) => {
  const valid = new Set(Object.keys(STALL_SCENES))
  for (const id of ids) assert.ok(valid.has(id), `unknown stall ${id}`)
  assert.equal(new Set(ids).size, ids.length, 'a stall is placed twice')
  for (const stall of PLACED_STALLS) {
    assert.ok(ids.includes(stall), `${stall} missing from floors`)
  }
}

test('desktop floors place the launched stalls exactly once', () => {
  assertPlacedOnce(DESKTOP_FLOORS.flatMap((floor) => floor.stalls))
})

test('mobile floors place the launched stalls exactly once', () => {
  assertPlacedOnce(MOBILE_FLOORS.flatMap((floor) => floor.stalls))
})

test('home warm lists ship and cover the floor 0 plates', () => {
  for (const url of STREET_WARM) {
    const file = url.split('?')[0] ?? url
    assert.ok(existsSync(join(publicDir, file)), `missing ${url}`)
  }
  for (const url of SKYLINE_WARM) {
    assert.ok(STREET_WARM.includes(url), `${url} misses the commit tier`)
  }
  const floorZero = new Set([
    ...DESKTOP_FLOORS[0].stalls,
    ...MOBILE_FLOORS[0].stalls,
  ])
  for (const id of floorZero) {
    const plate = STALL_SCENES[id].layers.find(
      (layer) => layer.role === 'plate',
    )
    assert.ok(plate, `${id} has no plate layer`)
    const file = layerFiles(plate)[0]
    assert.ok(
      STREET_WARM.includes(artSrc(`/images/bazaar/${id}/${file}`)),
      `floor 0 plate ${id}/${file} misses the warm list`,
    )
  }
})
