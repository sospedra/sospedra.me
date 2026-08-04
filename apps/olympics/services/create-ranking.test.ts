import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createRanking } from './create-ranking.ts'
import type { Medal } from './medals.ts'
import type { SportRecord } from './records.ts'

const medal = (partial: Partial<Medal>): Medal => ({
  name: 'Testland',
  noc: 'TST',
  gold: 0,
  silver: 0,
  bronze: 0,
  classicRank: 1,
  ...partial,
})

test('scores medals as gold 3, silver 2, bronze 1', () => {
  const [entry] = createRanking([medal({ gold: 2, silver: 1, bronze: 4 })], [])

  assert.equal(entry.score, 12)
})

test('scores records as WR 3, OR 2 and counts them per NOC', () => {
  const records: SportRecord[] = [
    { type: 'WR', noc: 'TST' },
    { type: 'OR', noc: 'TST' },
    { type: 'OR', noc: 'OTH' },
  ]
  const [entry] = createRanking([medal({ gold: 1 })], records)

  assert.equal(entry.score, 3 + 3 + 2)
  assert.deepEqual(entry.records, { wr: 1, or: 1 })
})

test('sorts by score descending', () => {
  const ranking = createRanking(
    [
      medal({ noc: 'LOW', name: 'Low', bronze: 1 }),
      medal({ noc: 'TOP', name: 'Top', gold: 5 }),
    ],
    [],
  )

  assert.deepEqual(
    ranking.map((entry) => entry.noc),
    ['TOP', 'LOW'],
  )
})

test('data snapshot holds the final Tokyo 2020 standings', async () => {
  const medals: Medal[] = JSON.parse(
    await readFile(new URL('../data/medals.json', import.meta.url), 'utf8'),
  )
  const records: SportRecord[] = JSON.parse(
    await readFile(new URL('../data/records.json', import.meta.url), 'utf8'),
  )

  assert.equal(medals.length, 93)

  const usa = medals.find((row) => row.noc === 'USA')
  assert.deepEqual(
    { gold: usa?.gold, silver: usa?.silver, bronze: usa?.bronze },
    { gold: 39, silver: 41, bronze: 33 },
  )

  for (const record of records) {
    assert.match(record.noc, /^[A-Z]{3}$/)
    assert.ok(record.type === 'WR' || record.type === 'OR')
  }

  const ranking = createRanking(medals, records)
  assert.equal(ranking[0]?.noc, 'USA')
})
