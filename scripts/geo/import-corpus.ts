#!/usr/bin/env node

import { groupBy } from 'es-toolkit'
import { filter, map, pipe } from 'es-toolkit/fp'
import type {
  GeneratedCityCorpus,
  GeneratedCountryCorpus,
} from '../../app/meridian/corpus-model.ts'
import { OFFICIAL_COUNTRY_OPTIONS } from '../../app/meridian/country-lexicon.ts'
import {
  collectCityCandidates,
  selectCitiesByCountry,
} from './lib-city-candidates.ts'
import {
  assert,
  compareText,
  readJson,
  writeJsonAtomically,
} from './lib-corpus-primitives.ts'
import type {
  CityOverrideDocument,
  CorpusSourceLock,
  CountryDifficultyDocument,
  CoveragePolicy,
  RosterDocument,
} from './lib-corpus-types.ts'
import { buildGameCountries } from './lib-game-countries.ts'
import {
  buildCityRecords,
  buildCountryCorpusRecords,
  collectAlternateNames,
  rankCitiesByPopulation,
} from './lib-generated-corpus.ts'
import {
  parseCountryInfo,
  parseWorldBank,
  verifyLockedFile,
} from './lib-source-verification.ts'

const roster = readJson<RosterDocument>(
  'repo/geo/editorial/country-roster.json',
)
const policy = readJson<CoveragePolicy>(
  'repo/geo/editorial/city-coverage-policy.json',
)
const overrideDocument = readJson<CityOverrideDocument>(
  'repo/geo/editorial/city-overrides.json',
)
const countryDifficultyDocument = readJson<CountryDifficultyDocument>(
  'repo/geo/editorial/country-difficulty.json',
)
const sourceLock = readJson<CorpusSourceLock>(
  'repo/geo/corpus-sources.lock.json',
)

const overridesById = groupBy(
  overrideDocument.overrides,
  (override) => override.geonamesId,
)

const excludedIds = pipe(
  overrideDocument.overrides,
  filter((override) => override.action === 'exclude'),
  map((override) => override.geonamesId),
  (ids) => new Set(ids),
)
const includedIds = pipe(
  overrideDocument.overrides,
  filter((override) => override.action === 'include'),
  map((override) => override.geonamesId),
  (ids) => new Set(ids),
)
const capitalOverrides = pipe(
  overrideDocument.overrides,
  filter((override) => override.action === 'capital'),
  map((override) => [override.geonamesId, override.isCapital] as const),
  (entries) => new Map(entries),
)

const main = async () => {
  assert(sourceLock.importReady, 'Corpus source lock is not import-ready')
  assert(
    overrideDocument.policyRevision === policy.policyRevision,
    'City overrides and coverage policy revisions do not match',
  )
  assert(
    sourceLock.worldBank.indicator === policy.countryPopulation.indicator,
    'World Bank indicator and coverage policy do not match',
  )
  assert(
    sourceLock.worldBank.snapshotYear === policy.countryPopulation.snapshotYear,
    'World Bank snapshot year and coverage policy do not match',
  )

  await Promise.all([
    verifyLockedFile('GeoNames cities', sourceLock.geonames.files.cities),
    verifyLockedFile(
      'GeoNames alternate names',
      sourceLock.geonames.files.alternateNames,
    ),
    verifyLockedFile(
      'GeoNames country info',
      sourceLock.geonames.files.countryInfo,
    ),
    verifyLockedFile('World Bank population', sourceLock.worldBank.file),
    verifyLockedFile('Natural Earth countries', sourceLock.naturalEarth.file),
  ])

  const countryCodes = [...roster.countryCodes].sort(compareText)
  const countryCodeSet = new Set(countryCodes)
  const expectedCodes = OFFICIAL_COUNTRY_OPTIONS.map((option) =>
    option.id.slice('country-'.length).toLocaleUpperCase('en'),
  ).sort(compareText)
  assert(
    JSON.stringify(countryCodes) === JSON.stringify(expectedCodes),
    'Editorial roster does not match the repository-owned 194-country lexicon',
  )

  const countryInfo = parseCountryInfo(
    sourceLock.geonames.files.countryInfo.path,
  )
  const worldBank = parseWorldBank(sourceLock.worldBank.file.path, policy)
  const namesByCode = new Map(
    OFFICIAL_COUNTRY_OPTIONS.map((option) => [
      option.id.slice('country-'.length).toLocaleUpperCase('en'),
      option.label,
    ]),
  )
  const europePlus = new Set(policy.europePlus.countryCodes)
  const maxRankedCount = Math.max(
    policy.coverage.largeCountryRankedNonCapitalCount,
    policy.coverage.europePlusRankedNonCapitalCount,
    policy.coverage.defaultRankedNonCapitalCount,
  )
  const retainedCandidateCount = maxRankedCount + 64

  const buckets = await collectCityCandidates({
    sourceLock,
    policy,
    countryCodes,
    countryCodeSet,
    countryInfo,
    excludedIds,
    includedIds,
    capitalOverrides,
    retainedCandidateCount,
  })

  const { selectedById, selectedIdsByCountry, coverageByCountry } =
    selectCitiesByCountry({
      countryCodes,
      buckets,
      worldBank,
      policy,
      europePlus,
    })

  const alternateNames = await collectAlternateNames({
    sourceLock,
    selectedById,
  })

  const rankByCountry = rankCitiesByPopulation({ countryCodes, buckets })

  const cities = buildCityRecords({
    selectedById,
    alternateNames,
    rankByCountry,
    overridesById,
    policy,
    sourceLock,
  })

  const cityById = new Map(cities.map((city) => [city.geonamesId, city]))
  const countries = buildCountryCorpusRecords({
    countryCodes,
    countryInfo,
    worldBank,
    namesByCode,
    coverageByCountry,
    selectedIdsByCountry,
    cityById,
    policy,
    sourceLock,
  })

  const cityCorpus: GeneratedCityCorpus = {
    schemaVersion: 1,
    sourceRevision: sourceLock.sourceRevision,
    policyRevision: policy.policyRevision,
    sources: {
      sourceRevision: sourceLock.sourceRevision,
      geonamesSnapshotDate: sourceLock.geonames.snapshotDate,
      worldBankPopulationYear: sourceLock.worldBank.snapshotYear,
    },
    cities,
  }
  const countryCorpus: GeneratedCountryCorpus = {
    schemaVersion: 1,
    sourceRevision: sourceLock.sourceRevision,
    policyRevision: policy.policyRevision,
    rosterRevision: roster.rosterRevision,
    countries,
  }

  const gameCountries = buildGameCountries({
    countries,
    countryCodes,
    sourceLock,
    countryDifficultyDocument,
    overrideDocument,
    cityById,
  })
  const gameCountryCorpus = {
    schemaVersion: 1,
    sourceRevision: sourceLock.sourceRevision,
    countries: gameCountries,
  }

  writeJsonAtomically('repo/geo/generated/cities.json', cityCorpus)
  writeJsonAtomically('repo/geo/generated/country-corpus.json', countryCorpus)
  writeJsonAtomically('repo/geo/generated/countries.json', gameCountryCorpus)

  const shortfalls = countries.filter((country) => country.coverage.shortfall)
  const missingPopulation = countries.filter(
    (country) => country.worldBankPopulation === null,
  )
  console.log(
    [
      `Geo corpus import passed: ${countries.length} countries, ${cities.length} cities`,
      `${shortfalls.length} countries use every eligible locality because the requested ranked coverage is unavailable`,
      `${missingPopulation.length} countries have no World Bank population and use non-population coverage rules only`,
    ].join('\n'),
  )
}

await main()
