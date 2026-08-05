import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { DESKTOP_FLOORS, MOBILE_FLOORS } from './floors'
import { STALLS } from './stall-catalog'
import { layerFiles, STALL_SCENES } from './stalls-manifest'

const bazaarImages = join(import.meta.dirname, '../../public/images/bazaar')

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
  assert.deepEqual(STALLS.map.links, [
    { label: 'read the bazaar paper', href: '/papers/bazaar' },
  ])
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
