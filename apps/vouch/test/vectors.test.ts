import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { buildVectors, type VectorsFile } from '../scripts/vectors.ts'

const FIXTURE_URL = new URL(
  '../fixtures/protocol-v1/vectors.json',
  import.meta.url,
)

function readCommitted(): VectorsFile {
  return JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as VectorsFile
}

test('buildVectors output matches the committed fixture', () => {
  const committed = readCommitted()
  const built = buildVectors()

  assert.deepEqual(built.meta, committed.meta)
  assert.equal(built.entries.length, committed.entries.length)

  const committedByName = new Map(
    committed.entries.map((entry) => [entry.name, entry]),
  )
  for (const entry of built.entries) {
    const expected = committedByName.get(entry.name)
    assert.ok(expected, `vectors: fixture is missing entry "${entry.name}"`)
    assert.deepEqual(
      entry,
      expected,
      `vectors: entry "${entry.name}" drifted from the committed fixture`,
    )
  }
})

test('every entry is non-empty and carries hex bytes', () => {
  const { entries } = buildVectors()

  assert.ok(entries.length > 0)
  for (const entry of entries) {
    assert.ok(entry.name.length > 0)
    assert.ok(
      entry.hex.length > 0,
      `vectors: entry "${entry.name}" has empty hex`,
    )
  }
})
