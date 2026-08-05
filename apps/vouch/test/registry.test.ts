import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scenarios } from '../src/scenarios/index.ts'

const SLUGS = [
  'author-concurrency',
  'payload-tampering',
  'author-replay',
  'honest-query',
  'hidden-algorithm',
  'shared-proof',
  'missing-signature-nonce-replay',
  'database-swap',
  'env-var-semantics',
  'returning-rollback',
  'isolated-freeze',
  'head-conflict-gossip',
  'stale-head',
  'omitted-write',
  'missed-proof-deadline',
  'float-config',
  'config-timelock',
  'early-migration',
  'migration-chain',
  'key-rotation',
  'first-contact-fork',
  'authorized-false-data',
]

const TAXONOMIES = new Set([
  'PREVENTED_BY_MATH',
  'PROVABLE_ON_RECORD',
  'POSSIBLE_UNDER_GOVERNANCE',
  'LIMITATION',
])

test('registry holds all 22 scenarios', () => {
  assert.equal(scenarios.length, 22)
})

test('ids are 1..22, unique and ordered', () => {
  assert.deepEqual(
    scenarios.map((s) => s.meta.id),
    Array.from({ length: 22 }, (_, i) => i + 1),
  )
})

test('slugs match the design table', () => {
  assert.deepEqual(
    scenarios.map((s) => s.meta.slug),
    SLUGS,
  )
})

test('every scenario carries a known taxonomy and a non-empty title', () => {
  for (const s of scenarios) {
    assert.ok(TAXONOMIES.has(s.meta.taxonomy), `${s.meta.slug} taxonomy`)
    assert.ok(s.meta.title.length > 0, `${s.meta.slug} title`)
    assert.ok(s.meta.expected.length > 0, `${s.meta.slug} expected`)
    assert.ok(s.meta.specRefs.length > 0, `${s.meta.slug} specRefs`)
  }
})

test('every scenario runs, is deterministic, and matches its expected verdict', () => {
  for (const s of scenarios) {
    const first = s.run()
    assert.deepEqual(first, s.run(), `${s.meta.slug} determinism`)
    assert.ok(first.steps.length > 0, `${s.meta.slug} steps`)
    assert.ok(first.verdict.note.length > 0, `${s.meta.slug} note`)
    assert.ok(
      s.meta.expected.startsWith(first.verdict.kind),
      `${s.meta.slug} expected "${s.meta.expected}" vs verdict ${first.verdict.kind}`,
    )
  }
})
