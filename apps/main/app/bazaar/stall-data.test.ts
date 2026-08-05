import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
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
