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

export const compareCandidates = (a: CityCandidate, b: CityCandidate) =>
  b.population - a.population || a.geonamesId - b.geonamesId

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

export const cityDifficulty = (
  populationRank: number,
  isCapital: boolean,
  policy: CoveragePolicy,
): Difficulty => {
  let difficulty: Difficulty
  if (populationRank <= 2) difficulty = 1
  else if (populationRank <= 4) difficulty = 2
  else if (populationRank <= 7) difficulty = 3
  else difficulty = 4
  return isCapital
    ? (Math.min(
        difficulty,
        policy.difficulty.capitalMaximumDifficulty,
      ) as Difficulty)
    : difficulty
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
    countryCodes.map((code) => [
      code,
      {
        eligibleCandidateAvailable: 0,
        topCandidates: [],
        featureCapitals: new Map(),
        nameCapitals: new Map(),
        explicitCapitals: new Map(),
        forced: new Map(),
        rankBasis: [],
      },
    ]),
  )
  const eligibleFeatureCodes = new Set(
    policy.citySelection.eligibleFeatureCodes,
  )

  await streamArchiveLines(sourceLock.geonames.files.cities, (line) => {
    const fields = line.split('\t')
    const countryCode = fields[8] ?? ''
    if (!countryCodeSet.has(countryCode)) return

    const geonamesId = Number(fields[0])
    const featureClass = fields[6] ?? ''
    const featureCode = fields[7] ?? ''
    if (
      !Number.isInteger(geonamesId) ||
      excludedIds.has(geonamesId) ||
      featureClass !== policy.citySelection.featureClass
    ) {
      return
    }
    const info = countryInfo.get(countryCode)
    assert(info, `GeoNames countryInfo is missing ${countryCode}`)
    const featureCapital = featureCode === 'PPLC'
    const nameCapital = candidateNameMatches(fields, info.capitalName)
    const capitalOverride = capitalOverrides.get(geonamesId)
    const potentialCapital =
      capitalOverride === true ||
      (capitalOverride !== false && (featureCapital || nameCapital))
    const forced = includedIds.has(geonamesId)
    const eligibleByFeature = eligibleFeatureCodes.has(featureCode)
    if (!forced && !potentialCapital && !eligibleByFeature) {
      return
    }
    const candidate: CityCandidate = {
      geonamesId,
      countryCode,
      name: normalizedCurrentName(fields[1] ?? ''),
      asciiName: normalizedCurrentName(fields[2] ?? ''),
      latitude: Number(fields[4]),
      longitude: Number(fields[5]),
      featureCode,
      population: Math.max(0, Number(fields[14]) || 0),
      eligibleByFeature,
      isCapital: false,
    }
    assert(candidate.name, `GeoNames city ${geonamesId} has no name`)
    assert(
      Number.isFinite(candidate.latitude) &&
        candidate.latitude >= -90 &&
        candidate.latitude <= 90,
      `GeoNames city ${geonamesId} has an invalid latitude`,
    )
    assert(
      Number.isFinite(candidate.longitude) &&
        candidate.longitude >= -180 &&
        candidate.longitude <= 180,
      `GeoNames city ${geonamesId} has an invalid longitude`,
    )

    const bucket = buckets.get(countryCode)
    assert(bucket, `City bucket is missing ${countryCode}`)
    bucket.rankBasis.push({
      geonamesId: candidate.geonamesId,
      population: candidate.population,
    })
    if (eligibleByFeature) {
      bucket.eligibleCandidateAvailable += 1
      pushTopCandidate(bucket.topCandidates, candidate, retainedCandidateCount)
    }
    if (featureCapital && capitalOverride !== false) {
      bucket.featureCapitals.set(geonamesId, candidate)
    }
    if (nameCapital && capitalOverride !== false) {
      bucket.nameCapitals.set(geonamesId, candidate)
    }
    if (capitalOverride === true) {
      bucket.explicitCapitals.set(geonamesId, candidate)
    }
    if (forced) bucket.forced.set(geonamesId, candidate)
  })

  return buckets
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
    const population = worldBank.get(countryCode)?.value ?? null
    assert(bucket, `City bucket is missing ${countryCode}`)
    const isLarge =
      population !== null &&
      population > policy.countryPopulation.largeCountryThreshold
    const isEuropePlus = europePlus.has(countryCode)
    const target = Math.max(
      isLarge ? policy.coverage.largeCountryRankedNonCapitalCount : 0,
      isEuropePlus ? policy.coverage.europePlusRankedNonCapitalCount : 0,
      policy.coverage.defaultRankedNonCapitalCount,
    )

    const capitals = new Map(bucket.explicitCapitals)
    const inferredCapitalCandidates = [
      ...(bucket.featureCapitals.size > 0
        ? bucket.featureCapitals.values()
        : bucket.nameCapitals.values()),
    ].sort(
      (a, b) =>
        Number(bucket.nameCapitals.has(b.geonamesId)) -
          Number(bucket.nameCapitals.has(a.geonamesId)) ||
        compareCandidates(a, b),
    )
    const inferredCapital = inferredCapitalCandidates[0]
    if (inferredCapital) {
      capitals.set(inferredCapital.geonamesId, inferredCapital)
    }
    assert(
      capitals.size > 0,
      `${countryCode} has no capital match; add a reviewed city override`,
    )
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
      rankedNonCapitals.length ===
        Math.min(target, eligibleNonCapitalAvailable),
      `${countryCode} retained too few ranked candidates`,
    )

    const selected = new Map<number, CityCandidate>()
    for (const candidate of rankedNonCapitals) {
      selected.set(candidate.geonamesId, candidate)
    }
    for (const candidate of capitals.values()) {
      selected.set(candidate.geonamesId, candidate)
    }
    for (const candidate of bucket.forced.values()) {
      selected.set(candidate.geonamesId, candidate)
    }

    const selectedIds = [...selected.keys()].sort((a, b) => a - b)
    selectedIdsByCountry.set(countryCode, selectedIds)
    for (const candidate of selected.values()) {
      assert(
        !selectedById.has(candidate.geonamesId),
        `GeoNames city ${candidate.geonamesId} appears in multiple countries`,
      )
      selectedById.set(candidate.geonamesId, candidate)
    }

    coverageByCountry.set(countryCode, {
      reasons: [
        ...(isLarge ? (['population-over-10m'] as const) : []),
        ...(isEuropePlus ? (['europe-plus'] as const) : []),
        ...(!isLarge && !isEuropePlus ? (['default'] as const) : []),
      ],
      rankedNonCapitalTarget: target,
      rankedNonCapitalSelected: rankedNonCapitals.length,
      eligibleNonCapitalAvailable,
      shortfall: eligibleNonCapitalAvailable < target,
    })
  }

  return { selectedById, selectedIdsByCountry, coverageByCountry }
}
