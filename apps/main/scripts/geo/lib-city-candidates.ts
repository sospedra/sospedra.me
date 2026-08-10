import type { GeneratedCountryCorpusRecord } from '../../app/meridian/corpus-model.ts'
import type { Difficulty } from '../../app/meridian/model.ts'
import {
  assert,
  normalizedCurrentName,
  normalizeName,
} from './lib-corpus-primitives.ts'
import type {
  CityCandidate,
  CorpusSourceLock,
  CountryBucket,
  CountryInfo,
  CoveragePolicy,
  WorldBankPopulation,
} from './lib-corpus-types.ts'
import { streamArchiveLines } from './lib-source-verification.ts'
import { isCoordinateWithin } from './lib-validate-core.ts'

export const compareCandidates = (left: CityCandidate, right: CityCandidate) =>
  right.population - left.population || left.geonamesId - right.geonamesId

export const pushTopCandidate = (
  list: CityCandidate[],
  candidate: CityCandidate,
  limit: number,
) => {
  list.push(candidate)
  list.sort(compareCandidates)
  if (list.length > limit) list.length = limit
}

const candidateNameMatches = (fields: string[], expected: string) => {
  const normalizedExpected = normalizeName(expected)
  if (!normalizedExpected) return false
  const names = [
    fields[1] ?? '',
    fields[2] ?? '',
    ...(fields[3]?.split(',') ?? []),
  ]
  return names.some((name) => normalizeName(name) === normalizedExpected)
}

const baseCityDifficulty = (populationRank: number): Difficulty => {
  if (populationRank <= 2) return 1
  if (populationRank <= 4) return 2
  if (populationRank <= 7) return 3
  return 4
}

export const cityDifficulty = (
  populationRank: number,
  isCapital: boolean,
  policy: CoveragePolicy,
): Difficulty => {
  const difficulty = baseCityDifficulty(populationRank)
  if (!isCapital) return difficulty
  return Math.min(
    difficulty,
    policy.difficulty.capitalMaximumDifficulty,
  ) as Difficulty
}

type CandidateSelectors = {
  policy: CoveragePolicy
  countryCodeSet: Set<string>
  countryInfo: Map<string, CountryInfo>
  excludedIds: Set<number>
  includedIds: Set<number>
  capitalOverrides: Map<number, boolean>
  eligibleFeatureCodes: Set<string>
}

type ParsedCityLine =
  | { kind: 'skip' }
  | {
      kind: 'candidate'
      candidate: CityCandidate
      featureCapital: boolean
      nameCapital: boolean
      capitalOverride: boolean | undefined
      forced: boolean
    }

const buildCandidate = (
  fields: string[],
  countryCode: string,
  eligibleByFeature: boolean,
): CityCandidate => {
  const geonamesId = Number(fields[0])
  const candidate: CityCandidate = {
    geonamesId,
    countryCode,
    name: normalizedCurrentName(fields[1] ?? ''),
    asciiName: normalizedCurrentName(fields[2] ?? ''),
    latitude: Number(fields[4]),
    longitude: Number(fields[5]),
    featureCode: fields[7] ?? '',
    population: Math.max(0, Number(fields[14]) || 0),
    eligibleByFeature,
    isCapital: false,
  }
  assert(candidate.name, `GeoNames city ${geonamesId} has no name`)
  assert(
    isCoordinateWithin(candidate.latitude, 90),
    `GeoNames city ${geonamesId} has an invalid latitude`,
  )
  assert(
    isCoordinateWithin(candidate.longitude, 180),
    `GeoNames city ${geonamesId} has an invalid longitude`,
  )
  return candidate
}

const isPotentialCapital = (
  capitalOverride: boolean | undefined,
  featureCapital: boolean,
  nameCapital: boolean,
): boolean =>
  capitalOverride === true ||
  (capitalOverride !== false && (featureCapital || nameCapital))

const parseCityLine = (
  line: string,
  selectors: CandidateSelectors,
): ParsedCityLine => {
  const fields = line.split('\t')
  const countryCode = fields[8] ?? ''
  if (!selectors.countryCodeSet.has(countryCode)) return { kind: 'skip' }
  const geonamesId = Number(fields[0])
  const featureClass = fields[6] ?? ''
  const featureCode = fields[7] ?? ''
  const rejected =
    !Number.isInteger(geonamesId) ||
    selectors.excludedIds.has(geonamesId) ||
    featureClass !== selectors.policy.citySelection.featureClass
  if (rejected) return { kind: 'skip' }
  const info = selectors.countryInfo.get(countryCode)
  assert(info, `GeoNames countryInfo is missing ${countryCode}`)
  const featureCapital = featureCode === 'PPLC'
  const nameCapital = candidateNameMatches(fields, info.capitalName)
  const capitalOverride = selectors.capitalOverrides.get(geonamesId)
  const potentialCapital = isPotentialCapital(
    capitalOverride,
    featureCapital,
    nameCapital,
  )
  const forced = selectors.includedIds.has(geonamesId)
  const eligibleByFeature = selectors.eligibleFeatureCodes.has(featureCode)
  if (!forced && !potentialCapital && !eligibleByFeature)
    return { kind: 'skip' }
  return {
    kind: 'candidate',
    candidate: buildCandidate(fields, countryCode, eligibleByFeature),
    featureCapital,
    nameCapital,
    capitalOverride,
    forced,
  }
}

const emptyBucket = (): CountryBucket => ({
  eligibleCandidateAvailable: 0,
  topCandidates: [],
  featureCapitals: new Map(),
  nameCapitals: new Map(),
  explicitCapitals: new Map(),
  forced: new Map(),
  rankBasis: [],
})

const applyCityCandidate = (
  buckets: Map<string, CountryBucket>,
  parsed: Extract<ParsedCityLine, { kind: 'candidate' }>,
  retainedCandidateCount: number,
): void => {
  const { candidate } = parsed
  const bucket = buckets.get(candidate.countryCode)
  assert(bucket, `City bucket is missing ${candidate.countryCode}`)
  bucket.rankBasis.push({
    geonamesId: candidate.geonamesId,
    population: candidate.population,
  })
  if (candidate.eligibleByFeature) {
    bucket.eligibleCandidateAvailable += 1
    pushTopCandidate(bucket.topCandidates, candidate, retainedCandidateCount)
  }
  const acceptsCapitalRole = parsed.capitalOverride !== false
  if (parsed.featureCapital && acceptsCapitalRole) {
    bucket.featureCapitals.set(candidate.geonamesId, candidate)
  }
  if (parsed.nameCapital && acceptsCapitalRole) {
    bucket.nameCapitals.set(candidate.geonamesId, candidate)
  }
  if (parsed.capitalOverride === true) {
    bucket.explicitCapitals.set(candidate.geonamesId, candidate)
  }
  if (parsed.forced) bucket.forced.set(candidate.geonamesId, candidate)
}

export const collectCityCandidates = async ({
  sourceLock,
  policy,
  countryCodes,
  countryCodeSet,
  countryInfo,
  excludedIds,
  includedIds,
  capitalOverrides,
  retainedCandidateCount,
}: {
  sourceLock: CorpusSourceLock
  policy: CoveragePolicy
  countryCodes: string[]
  countryCodeSet: Set<string>
  countryInfo: Map<string, CountryInfo>
  excludedIds: Set<number>
  includedIds: Set<number>
  capitalOverrides: Map<number, boolean>
  retainedCandidateCount: number
}): Promise<Map<string, CountryBucket>> => {
  const buckets = new Map<string, CountryBucket>(
    countryCodes.map((code) => [code, emptyBucket()]),
  )
  const selectors: CandidateSelectors = {
    policy,
    countryCodeSet,
    countryInfo,
    excludedIds,
    includedIds,
    capitalOverrides,
    eligibleFeatureCodes: new Set(policy.citySelection.eligibleFeatureCodes),
  }
  await streamArchiveLines(sourceLock.geonames.files.cities, (line) => {
    const parsed = parseCityLine(line, selectors)
    if (parsed.kind === 'candidate') {
      applyCityCandidate(buckets, parsed, retainedCandidateCount)
    }
  })
  return buckets
}

const resolveCapitals = (
  bucket: CountryBucket,
  countryCode: string,
): Map<number, CityCandidate> => {
  const capitals = new Map(bucket.explicitCapitals)
  const inferredPool =
    bucket.featureCapitals.size > 0
      ? bucket.featureCapitals
      : bucket.nameCapitals
  const inferredCapital = [...inferredPool.values()].sort(
    (left, right) =>
      Number(bucket.nameCapitals.has(right.geonamesId)) -
        Number(bucket.nameCapitals.has(left.geonamesId)) ||
      compareCandidates(left, right),
  )[0]
  if (inferredCapital) capitals.set(inferredCapital.geonamesId, inferredCapital)
  assert(
    capitals.size > 0,
    `${countryCode} has no capital match; add a reviewed city override`,
  )
  return capitals
}

const coverageReasons = (
  isLarge: boolean,
  isEuropePlus: boolean,
): GeneratedCountryCorpusRecord['coverage']['reasons'] => {
  const reasons = [
    ...(isLarge ? (['population-over-10m'] as const) : []),
    ...(isEuropePlus ? (['europe-plus'] as const) : []),
  ]
  return reasons.length > 0 ? reasons : ['default']
}

type CountrySelection = {
  selected: Map<number, CityCandidate>
  selectedIds: number[]
  coverage: GeneratedCountryCorpusRecord['coverage']
}

const selectCountryCities = ({
  countryCode,
  bucket,
  worldBank,
  policy,
  europePlus,
}: {
  countryCode: string
  bucket: CountryBucket
  worldBank: Map<string, WorldBankPopulation>
  policy: CoveragePolicy
  europePlus: Set<string>
}): CountrySelection => {
  const population = worldBank.get(countryCode)?.value ?? null
  const isLarge =
    population !== null &&
    population > policy.countryPopulation.largeCountryThreshold
  const isEuropePlus = europePlus.has(countryCode)
  const target = Math.max(
    isLarge ? policy.coverage.largeCountryRankedNonCapitalCount : 0,
    isEuropePlus ? policy.coverage.europePlusRankedNonCapitalCount : 0,
    policy.coverage.defaultRankedNonCapitalCount,
  )
  const capitals = resolveCapitals(bucket, countryCode)
  for (const candidate of capitals.values()) candidate.isCapital = true
  const eligibleCapitalCount = [...capitals.values()].filter(
    (candidate) => candidate.eligibleByFeature,
  ).length
  const eligibleNonCapitalAvailable =
    bucket.eligibleCandidateAvailable - eligibleCapitalCount
  const rankedNonCapitals = bucket.topCandidates
    .filter((candidate) => !candidate.isCapital)
    .slice(0, target)
  assert(
    rankedNonCapitals.length === Math.min(target, eligibleNonCapitalAvailable),
    `${countryCode} retained too few ranked candidates`,
  )
  const selected = new Map<number, CityCandidate>()
  const retained = [
    ...rankedNonCapitals,
    ...capitals.values(),
    ...bucket.forced.values(),
  ]
  for (const candidate of retained) {
    selected.set(candidate.geonamesId, candidate)
  }
  return {
    selected,
    selectedIds: [...selected.keys()].sort((left, right) => left - right),
    coverage: {
      reasons: coverageReasons(isLarge, isEuropePlus),
      rankedNonCapitalTarget: target,
      rankedNonCapitalSelected: rankedNonCapitals.length,
      eligibleNonCapitalAvailable,
      shortfall: eligibleNonCapitalAvailable < target,
    },
  }
}

const registerSelectedCities = (
  selectedById: Map<number, CityCandidate>,
  selected: Map<number, CityCandidate>,
): void => {
  for (const candidate of selected.values()) {
    assert(
      !selectedById.has(candidate.geonamesId),
      `GeoNames city ${candidate.geonamesId} appears in multiple countries`,
    )
    selectedById.set(candidate.geonamesId, candidate)
  }
}

export const selectCitiesByCountry = ({
  countryCodes,
  buckets,
  worldBank,
  policy,
  europePlus,
}: {
  countryCodes: string[]
  buckets: Map<string, CountryBucket>
  worldBank: Map<string, WorldBankPopulation>
  policy: CoveragePolicy
  europePlus: Set<string>
}) => {
  const selectedById = new Map<number, CityCandidate>()
  const selectedIdsByCountry = new Map<string, number[]>()
  const coverageByCountry = new Map<
    string,
    GeneratedCountryCorpusRecord['coverage']
  >()
  for (const countryCode of countryCodes) {
    const bucket = buckets.get(countryCode)
    assert(bucket, `City bucket is missing ${countryCode}`)
    const selection = selectCountryCities({
      countryCode,
      bucket,
      worldBank,
      policy,
      europePlus,
    })
    selectedIdsByCountry.set(countryCode, selection.selectedIds)
    registerSelectedCities(selectedById, selection.selected)
    coverageByCountry.set(countryCode, selection.coverage)
  }
  return { selectedById, selectedIdsByCountry, coverageByCountry }
}
