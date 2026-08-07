import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { MUTANTS } from '../scripts/mutants.ts'

const VERIFY_URL = new URL('../src/protocol/verify.ts', import.meta.url)

test('every verifier rule string has at least one mutant', () => {
  const source = readFileSync(VERIFY_URL, 'utf8')
  const rules = [...source.matchAll(/rule: '([a-z0-9-]+)'/g)].map((m) => m[1])
  assert.ok(rules.length >= 26)
  const covered = new Set(MUTANTS.map((m) => m.rule))
  for (const rule of new Set(rules)) {
    assert.ok(covered.has(rule), `no mutant for rule ${rule}`)
  }
})

test('every matcher-return label has at least one mutant', () => {
  const source = readFileSync(VERIFY_URL, 'utf8')
  const labels = [...source.matchAll(/return '([a-z0-9-]+)'/g)].map((m) => m[1])
  assert.ok(labels.length >= 9)
  const covered = new Set(MUTANTS.map((m) => m.rule))
  for (const label of new Set(labels)) {
    assert.ok(covered.has(label), `no mutant for matcher label ${label}`)
  }
})

test('the transition role gate and activation boundary have named mutants', () => {
  const covered = new Set(MUTANTS.map((m) => m.rule))
  assert.ok(covered.has('commit-migration-role-gate'))
  assert.ok(covered.has('activation-boundary'))
})

test('every mutant find-string is unique in its file', () => {
  for (const mutant of MUTANTS) {
    const source = readFileSync(
      new URL(`../${mutant.file}`, import.meta.url),
      'utf8',
    )
    const first = source.indexOf(mutant.find)
    assert.ok(first >= 0, `${mutant.rule}: find-string missing`)
    assert.equal(
      source.indexOf(mutant.find, first + 1),
      -1,
      `${mutant.rule}: find-string not unique`,
    )
  }
})
