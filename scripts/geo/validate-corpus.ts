#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  GeneratedCityCorpus,
  GeneratedCountryCorpus,
} from '../../lib/geo/corpus-model.ts'
import { OFFICIAL_COUNTRY_OPTIONS } from '../../lib/geo/country-lexicon.ts'
import type { CountryRecord } from '../../lib/geo/model.ts'

interface RosterDocument {
  schemaVersion: 1
  rosterRevision: string
  recognitionBasis: {
    expectedCountryCount: number
  }
  countryCodes: string[]
}

interface CoveragePolicy {
  schemaVersion: 1
  policyRevision: string
  runtime: {
    mode: string
    networkRequestsAllowed: boolean
  }
  countryPopulation: {
    snapshotYear: number
    largeCountryThreshold: number
    comparison: 'greater-than'
  }
  coverage: {
    largeCountryRankedNonCapitalCount: number
    europePlusRankedNonCapitalCount: number
    defaultRankedNonCapitalCount: number
    includeEveryCapital: boolean
    capitalCountsTowardRankedCount: boolean
    shortfall: string
  }
  europePlus: {
    countryCodes: string[]
  }
}

interface OverrideDocument {
  schemaVersion: 1
  policyRevision: string
  overrides: unknown[]
  reviewQueue: {
    countryCode: string
    topic: string
    reason: string
  }[]
}

interface SourceLock {
  schemaVersion: 1
  sourceRevision: string
  importReady: boolean
  geonames: {
    files: Record<string, { sha256: string }>
  }
  worldBank: {
    snapshotYear: number
    file: { sha256: string }
  }
  naturalEarth: {
    file: { sha256: string }
  }
}

interface MainSourceLock {
  sourceRevision: string
  corpus?: {
    runtimeNetworkRequestsAllowed?: boolean
  }
}

interface GameCountryCorpus {
  schemaVersion: 1
  sourceRevision: string
  countries: CountryRecord[]
}

const root = resolve(process.cwd())
const readJson = <Value>(path: string): Value =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8')) as Value

const roster = readJson<RosterDocument>(
  'data/geo/editorial/country-roster.json',
)
const policy = readJson<CoveragePolicy>(
  'data/geo/editorial/city-coverage-policy.json',
)
const overrides = readJson<OverrideDocument>(
  'data/geo/editorial/city-overrides.json',
)
const sourceLock = readJson<SourceLock>('data/geo/corpus-sources.lock.json')
const countryDifficulty = readJson<{ shapeHolds?: string[] }>(
  'data/geo/editorial/country-difficulty.json',
)
const shapeHeldCodes = new Set(countryDifficulty.shapeHolds ?? [])
const mainSourceLock = readJson<MainSourceLock>('data/geo/sources.lock.json')
const cityCorpus = readJson<GeneratedCityCorpus>(
  'data/geo/generated/cities.json',
)
const countryCorpus = readJson<GeneratedCountryCorpus>(
  'data/geo/generated/country-corpus.json',
)
const gameCorpus = readJson<GameCountryCorpus>(
  'data/geo/generated/countries.json',
)

const errors: string[] = []
const check = (condition: unknown, message: string) => {
  if (!condition) errors.push(message)
}
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const sorted = (values: string[]) => [...values].sort(compareText)
const sameStrings = (left: string[], right: string[]) =>
  JSON.stringify(sorted(left)) === JSON.stringify(sorted(right))
const isSha256 = (value: string) => /^[a-f0-9]{64}$/u.test(value)

const expectedCodes = OFFICIAL_COUNTRY_OPTIONS.map((option) =>
  option.id.slice('country-'.length).toLocaleUpperCase('en'),
)
const rosterCodes = roster.countryCodes
const rosterCodeSet = new Set(rosterCodes)
const europePlus = new Set(policy.europePlus.countryCodes)

check(roster.schemaVersion === 1, 'Country roster schema must be 1')
check(
  rosterCodes.length === roster.recognitionBasis.expectedCountryCount,
  'Country roster count does not match its recognition policy',
)
check(rosterCodes.length === 194, 'Country roster must contain 194 countries')
check(
  new Set(rosterCodes).size === rosterCodes.length,
  'Country roster codes must be unique',
)
check(
  sameStrings(rosterCodes, expectedCodes),
  'Country roster must match the repository-owned official country lexicon',
)
check(rosterCodeSet.has('PS'), 'Country roster must contain Palestine')
check(rosterCodeSet.has('VA'), 'Country roster must contain Vatican City')
check(!rosterCodeSet.has('IL'), 'Country roster must exclude IL')

check(policy.schemaVersion === 1, 'City coverage policy schema must be 1')
check(
  policy.runtime.mode === 'committed-generated-snapshot' &&
    policy.runtime.networkRequestsAllowed === false,
  'City corpus must prohibit runtime network requests',
)
check(
  policy.countryPopulation.largeCountryThreshold === 10_000_000 &&
    policy.countryPopulation.comparison === 'greater-than',
  'Large-country coverage must use a strict 10M threshold',
)
check(
  policy.coverage.largeCountryRankedNonCapitalCount === 12 &&
    policy.coverage.europePlusRankedNonCapitalCount === 12 &&
    policy.coverage.defaultRankedNonCapitalCount === 3,
  'City coverage must be capital plus 12 for large/Europe-plus and capital plus 3 otherwise',
)
check(
  policy.coverage.includeEveryCapital &&
    !policy.coverage.capitalCountsTowardRankedCount &&
    policy.coverage.shortfall ===
      'include-all-eligible-localities-without-padding',
  'Capital inclusion and shortfall policy changed unexpectedly',
)
check(
  policy.europePlus.countryCodes.every((code) => rosterCodeSet.has(code)),
  'Europe-plus contains a country outside the editorial roster',
)

check(sourceLock.schemaVersion === 1, 'Corpus source lock schema must be 1')
check(sourceLock.importReady, 'Corpus source lock must be import-ready')
check(
  sourceLock.worldBank.snapshotYear === policy.countryPopulation.snapshotYear,
  'World Bank snapshot year does not match the coverage policy',
)
for (const [label, digest] of [
  ...Object.entries(sourceLock.geonames.files).map(
    ([name, file]) => [`GeoNames ${name}`, file.sha256] as const,
  ),
  ['World Bank', sourceLock.worldBank.file.sha256] as const,
  ['Natural Earth', sourceLock.naturalEarth.file.sha256] as const,
]) {
  check(isSha256(digest), `${label} source must have a SHA-256 lock`)
}
check(
  mainSourceLock.sourceRevision === sourceLock.sourceRevision,
  'Main and corpus source revisions must match',
)
check(
  mainSourceLock.corpus?.runtimeNetworkRequestsAllowed === false,
  'Main source lock must prohibit runtime corpus requests',
)
check(
  overrides.policyRevision === policy.policyRevision,
  'City overrides and coverage policy revisions must match',
)

check(cityCorpus.schemaVersion === 1, 'City corpus schema must be 1')
check(
  cityCorpus.sourceRevision === sourceLock.sourceRevision &&
    cityCorpus.policyRevision === policy.policyRevision,
  'City corpus revisions do not match its locks',
)
const citiesById = new Map(
  cityCorpus.cities.map((city) => [city.geonamesId, city]),
)
check(
  citiesById.size === cityCorpus.cities.length,
  'City GeoNames IDs must be unique',
)
for (const city of cityCorpus.cities) {
  check(
    rosterCodeSet.has(city.countryCode),
    `City ${city.geonamesId} uses an out-of-roster country`,
  )
  check(
    city.sourceRevision === sourceLock.sourceRevision,
    `City ${city.geonamesId} has a stale source revision`,
  )
  check(
    Number.isInteger(city.population) && city.population >= 0,
    `City ${city.geonamesId} has an invalid population`,
  )
  check(
    Number.isInteger(city.populationRank) && city.populationRank > 0,
    `City ${city.geonamesId} has an invalid population rank`,
  )
  check(
    city.acceptedNames.en.includes(city.names.en) &&
      city.acceptedNames.es.includes(city.names.es),
    `City ${city.geonamesId} accepted names must include display names`,
  )
}

check(
  countryCorpus.schemaVersion === 1 &&
    countryCorpus.sourceRevision === sourceLock.sourceRevision &&
    countryCorpus.policyRevision === policy.policyRevision &&
    countryCorpus.rosterRevision === roster.rosterRevision,
  'Country coverage corpus revisions do not match its locks',
)
check(
  countryCorpus.countries.length ===
    roster.recognitionBasis.expectedCountryCount,
  'Country coverage corpus count must match the editorial roster',
)
check(
  sameStrings(
    countryCorpus.countries.map((country) => country.code),
    rosterCodes,
  ),
  'Country coverage corpus must match the editorial roster',
)

const coverageByCode = new Map(
  countryCorpus.countries.map((country) => [country.code, country]),
)
for (const country of countryCorpus.countries) {
  const isLarge =
    country.worldBankPopulation !== null &&
    country.worldBankPopulation > policy.countryPopulation.largeCountryThreshold
  const isEuropePlus = europePlus.has(country.code)
  const target = Math.max(
    isLarge ? policy.coverage.largeCountryRankedNonCapitalCount : 0,
    isEuropePlus ? policy.coverage.europePlusRankedNonCapitalCount : 0,
    policy.coverage.defaultRankedNonCapitalCount,
  )
  check(
    country.coverage.rankedNonCapitalTarget === target,
    `${country.code} has the wrong city coverage target`,
  )
  check(
    country.coverage.rankedNonCapitalSelected ===
      Math.min(target, country.coverage.eligibleNonCapitalAvailable),
    `${country.code} city coverage does not explain its shortfall`,
  )
  check(
    country.coverage.shortfall ===
      country.coverage.eligibleNonCapitalAvailable < target,
    `${country.code} has an incorrect shortfall flag`,
  )
  check(
    country.capitalCityIds.length === 1,
    `${country.code} must have exactly one inferred canonical capital`,
  )
  check(
    new Set(country.cityIds).size === country.cityIds.length,
    `${country.code} repeats city IDs`,
  )
  for (const cityId of country.cityIds) {
    check(
      citiesById.get(cityId)?.countryCode === country.code,
      `${country.code} references invalid city ${cityId}`,
    )
  }
  for (const cityId of country.capitalCityIds) {
    check(
      citiesById.get(cityId)?.isCapital === true,
      `${country.code} capital ${cityId} is not marked as a capital`,
    )
  }
}

check(
  gameCorpus.schemaVersion === 1 &&
    gameCorpus.sourceRevision === sourceLock.sourceRevision,
  'Playable country corpus revision does not match its source lock',
)
check(
  gameCorpus.countries.length === roster.recognitionBasis.expectedCountryCount,
  'Playable country corpus count must match the editorial roster',
)
check(
  sameStrings(
    gameCorpus.countries.map((country) => country.code),
    rosterCodes,
  ),
  'Playable country corpus must match the editorial roster',
)
const reviewCodes = new Set(
  overrides.reviewQueue.map((review) => review.countryCode),
)
for (const country of gameCorpus.countries) {
  const coverage = coverageByCode.get(country.code)
  check(country.status === 'active', `${country.code} must be active`)
  check(
    country.sourceRevision === sourceLock.sourceRevision,
    `${country.code} has a stale source revision`,
  )
  check(
    country.eligibility.flag && Boolean(country.difficulty.flag),
    `${country.code} must have verified flag gameplay metadata`,
  )
  check(
    country.eligibility.shape === !shapeHeldCodes.has(country.code),
    `${country.code} shape eligibility does not match the editorial holds`,
  )
  check(
    !country.eligibility.shape || Boolean(country.difficulty.shape),
    `${country.code} lacks shape difficulty`,
  )
  check(
    country.eligibility.capital === !reviewCodes.has(country.code) &&
      country.eligibility.map === !reviewCodes.has(country.code),
    `${country.code} capital/map eligibility does not match editorial review`,
  )
  check(
    !country.eligibility.capital || Boolean(country.difficulty.capital),
    `${country.code} lacks capital difficulty`,
  )
  check(
    !country.eligibility.map || Boolean(country.difficulty.map),
    `${country.code} lacks map difficulty`,
  )
  check(
    coverage?.capitalCityIds.includes(country.capital.geonamesId ?? -1),
    `${country.code} playable capital is not linked to the city corpus`,
  )
}

if (errors.length > 0) {
  console.error(`Geo corpus validation failed:\n- ${errors.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log(
    `Geo corpus validation passed: ${gameCorpus.countries.length} countries, ${cityCorpus.cities.length} cities`,
  )
}
