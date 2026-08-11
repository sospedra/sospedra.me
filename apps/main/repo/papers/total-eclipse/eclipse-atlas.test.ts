import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  bySarosSeries,
  CATALOGUE_FIRST_YEAR,
  CATALOGUE_LAST_YEAR,
  type CatalogueEntry,
  formatEclipseDate,
  KIND_NAME,
  PAPER_ECLIPSE_DATE,
  PAPER_SAROS,
  toAtlas,
} from './eclipse-atlas.ts'

const catalogue: CatalogueEntry[] = JSON.parse(
  readFileSync(join(import.meta.dirname, 'data/eclipses.json'), 'utf8'),
)
const atlas = toAtlas(catalogue)
const paperEclipse = atlas.find(
  (eclipse) => eclipse.date === PAPER_ECLIPSE_DATE,
)

test('the catalogue spans the advertised century', () => {
  assert.equal(atlas.length, 188)
  assert.equal(atlas[0].year, CATALOGUE_FIRST_YEAR)
  assert.equal(atlas[atlas.length - 1].year, CATALOGUE_LAST_YEAR)
  assert.ok(atlas.every((eclipse) => eclipse.kind in KIND_NAME))
})

test('this paper sits in saros 126, one member after 2008', () => {
  assert.ok(paperEclipse)
  assert.equal(paperEclipse.saros, PAPER_SAROS)
  const series = bySarosSeries(atlas).find(([saros]) => saros === PAPER_SAROS)
  assert.ok(series)
  const dates = series[1].map((eclipse) => eclipse.date).toSorted()
  assert.equal(dates[0], '1900-05-28')
  assert.equal(dates[dates.length - 1], PAPER_ECLIPSE_DATE)
  assert.ok(dates.includes('2008-08-01'))
})

test('a saros lands the next member 18 years and 11 days later', () => {
  const series = bySarosSeries(atlas).find(([saros]) => saros === PAPER_SAROS)
  assert.ok(series)
  const sorted = series[1].toSorted((left, right) => left.year - right.year)
  for (let index = 1; index < sorted.length; index += 1) {
    const gap = sorted[index].fraction - sorted[index - 1].fraction
    assert.ok(
      Math.abs(gap - 18.03) < 0.1,
      `gap ${gap} at ${sorted[index].date}`,
    )
  }
})

test('exactly four countries reach totality in 2026', () => {
  assert.ok(paperEclipse)
  assert.deepEqual(paperEclipse.countries.toSorted(), ['ES', 'GL', 'IS', 'RU'])
})

test('the 1900 twin crossed Spain and Portugal, which is why it is a replica', () => {
  const twin = atlas.find((eclipse) => eclipse.date === '1900-05-28')
  assert.ok(twin)
  assert.ok(twin.countries.includes('ES'))
  assert.ok(twin.countries.includes('PT'))
})

test('Spain gets its three-eclipse run in 2026, 2027 and 2028', () => {
  const spanish = atlas
    .filter((eclipse) => eclipse.countries.includes('ES'))
    .map((eclipse) => eclipse.date)
  assert.ok(spanish.includes('2026-08-12'))
  assert.ok(spanish.includes('2027-08-02'))
  assert.ok(spanish.includes('2028-01-26'))
  assert.ok(spanish.some((date) => date.startsWith('1905')))
})

test('derived fields track the date string', () => {
  assert.ok(paperEclipse)
  assert.equal(paperEclipse.year, 2026)
  assert.ok(Math.abs(paperEclipse.dayOfYear - 224) < 6)
  assert.equal(formatEclipseDate(PAPER_ECLIPSE_DATE), '12 Aug 2026')
  assert.equal(
    paperEclipse.mid,
    paperEclipse.path[Math.floor(paperEclipse.path.length / 2)],
  )
})
