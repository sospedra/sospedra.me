import assert from 'node:assert/strict'
import test from 'node:test'
import {
  byNewestFirst,
  PaperMetadataError,
  paperFromMetadata,
} from './paper.mapper.ts'

const VALID = {
  createdAt: '2024-05-01T10:00:00.000Z',
  excerpt: 'An excerpt.',
  minutes: 7,
  og: '/papers/example/og.png',
  slug: 'ignored-in-favour-of-the-directory',
  title: 'Example',
  updatedAt: '2024-06-01T10:00:00.000Z',
  categories: ['javascript'],
  images: { 'cover.png': { width: 1200, height: 630 } },
}

test('maps valid metadata and takes the slug from the directory', () => {
  const paper = paperFromMetadata('example', VALID)
  assert.equal(paper.slug, 'example')
  assert.equal(paper.minutes, 7)
  assert.deepEqual(paper.images['cover.png'], { width: 1200, height: 630 })
})

test('defaults absent images to an empty record', () => {
  const { images: _unused, ...withoutImages } = VALID
  const paper = paperFromMetadata('example', withoutImages)
  assert.deepEqual(paper.images, {})
})

test('names the offending field on malformed metadata', () => {
  const cases: Array<[string, unknown]> = [
    ['metadata', null],
    ['title', { ...VALID, title: 42 }],
    ['createdAt', { ...VALID, createdAt: 'yesterday' }],
    ['minutes', { ...VALID, minutes: 'seven' }],
    ['categories', { ...VALID, categories: [1] }],
    ['images', { ...VALID, images: { 'cover.png': { width: 'wide' } } }],
  ]
  for (const [field, value] of cases) {
    assert.throws(
      () => paperFromMetadata('example', value),
      (error: unknown) =>
        error instanceof PaperMetadataError && error.field === field,
      `expected field "${field}" to fail`,
    )
  }
})

test('sorts newest first by createdAt', () => {
  const older = paperFromMetadata('older', VALID)
  const newer = paperFromMetadata('newer', {
    ...VALID,
    createdAt: '2025-01-01T00:00:00.000Z',
  })
  assert.deepEqual([older, newer].toSorted(byNewestFirst), [newer, older])
})
