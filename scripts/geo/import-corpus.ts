#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  createReadStream,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import type {
  CityOverrideAction,
  GeneratedCityCorpus,
  GeneratedCityRecord,
  GeneratedCountryCorpus,
  GeneratedCountryCorpusRecord,
} from '../../lib/geo/corpus-model.ts'
import { OFFICIAL_COUNTRY_OPTIONS } from '../../lib/geo/country-lexicon.ts'
import type {
  CountryDifficulty,
  CountryRecord,
  Difficulty,
  LocalizedText,
} from '../../lib/geo/model.ts'

const root = resolve(process.cwd())
const pathFromRoot = (path: string) => resolve(root, path)

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
  countryPopulation: {
    indicator: string
    snapshotYear: number
    largeCountryThreshold: number
    comparison: 'greater-than'
  }
  coverage: {
    largeCountryRankedNonCapitalCount: number
    europePlusRankedNonCapitalCount: number
    defaultRankedNonCapitalCount: number
    includeEveryCapital: true
    capitalCountsTowardRankedCount: false
    shortfall: 'include-all-eligible-localities-without-padding'
  }
  europePlus: {
    countryCodes: string[]
  }
  citySelection: {
    featureClass: 'P'
    eligibleFeatureCodes: string[]
    capitalEligibilityOverridesFeatureCode: true
  }
  difficulty: {
    capitalMaximumDifficulty: Difficulty
  }
}

interface CityOverrideDocument {
  schemaVersion: 1
  policyRevision: string
  overrides: CityOverrideAction[]
  reviewQueue: {
    countryCode: string
    topic: string
    reason: string
  }[]
}

interface LockedFile {
  path: string
  sha256: string
}

interface ArchiveFile extends LockedFile {
  archiveEntry: string
}

interface CorpusSourceLock {
  schemaVersion: 1
  sourceRevision: string
  importReady: boolean
  geonames: {
    snapshotDate: string
    files: {
      cities: ArchiveFile
      alternateNames: ArchiveFile
      countryInfo: LockedFile
    }
  }
  worldBank: {
    indicator: string
    snapshotYear: number
    file: LockedFile
  }
  naturalEarth: {
    file: LockedFile
  }
}

interface CountryInfo {
  code: string
  iso3: string
  capitalName: string
  continent: string
}

interface WorldBankPopulation {
  code: string
  iso3: string
  year: number
  value: number | null
}

interface CityCandidate {
  geonamesId: number
  countryCode: string
  name: string
  asciiName: string
  latitude: number
  longitude: number
  featureCode: string
  population: number
  eligibleByFeature: boolean
  isCapital: boolean
}

interface RankBasis {
  geonamesId: number
  population: number
}

interface CountryBucket {
  eligibleCandidateAvailable: number
  topCandidates: CityCandidate[]
  featureCapitals: Map<number, CityCandidate>
  nameCapitals: Map<number, CityCandidate>
  explicitCapitals: Map<number, CityCandidate>
  forced: Map<number, CityCandidate>
  rankBasis: RankBasis[]
}

interface AlternateName {
  id: number
  name: string
  preferred: boolean
  short: boolean
}

interface AlternateNames {
  en: AlternateName[]
  es: AlternateName[]
  wikidataId?: string
}

interface NaturalEarthProperties {
  ISO_A2?: string
  ISO_A2_EH?: string
  ISO_A3_EH?: string
  TYPE?: string
  ADMIN?: string
  SUBREGION?: string
  WIKIDATAID?: string
  NAME_EN?: string
  NAME_ES?: string
  NAME_LONG?: string
  FORMAL_EN?: string
}

interface NaturalEarthFeature {
  properties: NaturalEarthProperties
  geometry: {
    type: string
    coordinates: unknown
  } | null
}

interface NaturalEarthDocument {
  type: 'FeatureCollection'
  features: NaturalEarthFeature[]
}

interface ExistingCountryCorpus {
  schemaVersion: number
  sourceRevision: string
  countries: CountryRecord[]
}

const LEGACY_REVIEWED_COUNTRY_CODES = new Set([
  'AR',
  'AU',
  'BR',
  'BT',
  'CA',
  'CL',
  'EG',
  'FR',
  'GB',
  'GH',
  'ID',
  'IN',
  'IT',
  'JP',
  'KE',
  'KZ',
  'MX',
  'NZ',
  'TH',
  'ZA',
])

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(pathFromRoot(path), 'utf8')) as T

const writeJsonAtomically = (path: string, value: unknown) => {
  const outputPath = pathFromRoot(path)
  const temporaryPath = `${outputPath}.tmp-${process.pid}`
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(temporaryPath, outputPath)
}

interface CountryDifficultyDocument {
  schemaVersion: number
  revision: string
  description: string
  tiers: Record<string, Difficulty>
  /** Atoll nations with no usable silhouette; held out of the shape round. */
  shapeHolds?: string[]
}

const roster = readJson<RosterDocument>(
  'data/geo/editorial/country-roster.json',
)
const policy = readJson<CoveragePolicy>(
  'data/geo/editorial/city-coverage-policy.json',
)
const overrideDocument = readJson<CityOverrideDocument>(
  'data/geo/editorial/city-overrides.json',
)
const countryDifficultyDocument = readJson<CountryDifficultyDocument>(
  'data/geo/editorial/country-difficulty.json',
)
const sourceLock = readJson<CorpusSourceLock>(
  'data/geo/corpus-sources.lock.json',
)

const fail = (message: string): never => {
  throw new Error(message)
}

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) fail(message)
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

const normalizeName = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

const normalizedCurrentName = (value: string) => value.normalize('NFC').trim()

const sha256File = async (path: string) => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(pathFromRoot(path))) {
    hash.update(chunk)
  }
  return hash.digest('hex')
}

const verifyLockedFile = async (label: string, file: LockedFile) => {
  const actual = await sha256File(file.path)
  assert(
    actual === file.sha256,
    `${label} checksum mismatch: expected ${file.sha256}, received ${actual}`,
  )
}

const streamArchiveLines = async (
  archive: ArchiveFile,
  visit: (line: string) => void,
) => {
  const child = spawn(
    'unzip',
    ['-p', pathFromRoot(archive.path), archive.archiveEntry],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  assert(child.stdout, `Cannot read ${archive.path}`)
  assert(child.stderr, `Cannot read errors from ${archive.path}`)

  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk
  })
  const closed = new Promise<number>((done, reject) => {
    child.once('error', reject)
    child.once('close', (code) => done(code ?? 1))
  })

  const lines = createInterface({
    input: child.stdout,
    crlfDelay: Number.POSITIVE_INFINITY,
  })
  for await (const line of lines) visit(line)

  const exitCode = await closed
  assert(
    exitCode === 0,
    `Cannot extract ${archive.archiveEntry} from ${archive.path}: ${stderr.trim()}`,
  )
}

const parseCountryInfo = (path: string) => {
  const countries = new Map<string, CountryInfo>()
  const lines = readFileSync(pathFromRoot(path), 'utf8').split(/\r?\n/u)
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const fields = line.split('\t')
    const code = fields[0]
    if (!code) continue
    countries.set(code, {
      code,
      iso3: fields[1] ?? '',
      capitalName: fields[5] ?? '',
      continent: fields[8] ?? '',
    })
  }
  return countries
}

interface WorldBankRow {
  indicator?: { id?: string }
  country?: { id?: string }
  countryiso3code?: string
  date?: string
  value?: number | null
}

const parseWorldBank = (path: string) => {
  const document = readJson<[unknown, WorldBankRow[]]>(path)
  assert(
    Array.isArray(document) && Array.isArray(document[1]),
    'World Bank snapshot must use its two-element API response format',
  )

  const populations = new Map<string, WorldBankPopulation>()
  for (const row of document[1]) {
    const code = row.country?.id
    if (!code || !/^[A-Z]{2}$/u.test(code)) continue
    if (row.indicator?.id !== policy.countryPopulation.indicator) continue
    const year = Number(row.date)
    assert(Number.isInteger(year), `World Bank ${code} has an invalid year`)
    assert(
      row.value === null ||
        (typeof row.value === 'number' &&
          Number.isInteger(row.value) &&
          row.value >= 0),
      `World Bank ${code} has an invalid population`,
    )
    populations.set(code, {
      code,
      iso3: row.countryiso3code ?? '',
      year,
      value: row.value ?? null,
    })
  }
  return populations
}

const compareCandidates = (a: CityCandidate, b: CityCandidate) =>
  b.population - a.population || a.geonamesId - b.geonamesId

const pushTopCandidate = (
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

const cityDifficulty = (
  populationRank: number,
  isCapital: boolean,
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

const uniqueNames = (preferred: string, values: string[]) => {
  const normalizedPreferred = normalizedCurrentName(preferred)
  const byNormalized = new Map<string, string>()
  for (const rawValue of [normalizedPreferred, ...values]) {
    const value = normalizedCurrentName(rawValue)
    if (!value || /^https?:/iu.test(value)) continue
    const key = normalizeName(value)
    if (!key || byNormalized.has(key)) continue
    byNormalized.set(key, value)
  }
  const remainder = [...byNormalized.values()]
    .filter((value) => value !== normalizedPreferred)
    .sort(compareText)
  return [normalizedPreferred, ...remainder]
}

const validSourceName = (value: string | undefined) => {
  const name = normalizedCurrentName(value ?? '')
  return name && name !== '-99' ? name : ''
}

const naturalEarthFeatureScore = (
  code: string,
  feature: NaturalEarthFeature,
) => {
  const properties = feature.properties
  const typeScore: Record<string, number> = {
    'Sovereign country': 5,
    Country: 4,
    Sovereignty: 3,
    Indeterminate: 2,
  }
  return (
    (properties.ISO_A2 === code ? 100 : 0) +
    (properties.ISO_A2_EH === code ? 10 : 0) +
    (typeScore[properties.TYPE ?? ''] ?? 0)
  )
}

const primaryNaturalEarthFeature = (
  code: string,
  features: NaturalEarthFeature[],
) => {
  const candidates = features
    .filter(
      (feature) =>
        feature.properties.ISO_A2 === code ||
        feature.properties.ISO_A2_EH === code,
    )
    .sort(
      (a, b) =>
        naturalEarthFeatureScore(code, b) - naturalEarthFeatureScore(code, a) ||
        compareText(JSON.stringify(a.properties), JSON.stringify(b.properties)),
    )
  return candidates[0]
}

const coordinatePointCount = (value: unknown): number => {
  if (!Array.isArray(value)) return 0
  if (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return 1
  }
  return value.reduce((total, child) => total + coordinatePointCount(child), 0)
}

const hasRobustCountryGeometry = (feature: NaturalEarthFeature | undefined) =>
  Boolean(
    feature?.geometry &&
      (feature.geometry.type === 'Polygon' ||
        feature.geometry.type === 'MultiPolygon') &&
      coordinatePointCount(feature.geometry.coordinates) >= 4,
  )

const pickDisplayName = (names: AlternateName[], fallback: string) => {
  const eligible = [...names].sort(
    (a, b) =>
      Number(b.preferred) - Number(a.preferred) ||
      Number(b.short) - Number(a.short) ||
      a.id - b.id,
  )
  return eligible[0]?.name || fallback
}

const overridesById = new Map<number, CityOverrideAction[]>()
for (const override of overrideDocument.overrides) {
  const existing = overridesById.get(override.geonamesId) ?? []
  existing.push(override)
  overridesById.set(override.geonamesId, existing)
}

const excludedIds = new Set(
  overrideDocument.overrides
    .filter((override) => override.action === 'exclude')
    .map((override) => override.geonamesId),
)
const includedIds = new Set(
  overrideDocument.overrides
    .filter((override) => override.action === 'include')
    .map((override) => override.geonamesId),
)
const capitalOverrides = new Map(
  overrideDocument.overrides
    .filter((override) => override.action === 'capital')
    .map((override) => [override.geonamesId, override.isCapital]),
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
  const worldBank = parseWorldBank(sourceLock.worldBank.file.path)
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

  const selectedIdSet = new Set(selectedById.keys())
  const alternateNames = new Map<number, AlternateNames>()
  await streamArchiveLines(sourceLock.geonames.files.alternateNames, (line) => {
    const fields = line.split('\t')
    const geonamesId = Number(fields[1])
    if (!selectedIdSet.has(geonamesId)) return
    const language = fields[2]
    if (language === 'wkdt') {
      const wikidataId = normalizedCurrentName(fields[3] ?? '')
      assert(
        /^Q\d+$/u.test(wikidataId),
        `GeoNames city ${geonamesId} has invalid Wikidata id ${wikidataId}`,
      )
      const names = alternateNames.get(geonamesId) ?? { en: [], es: [] }
      names.wikidataId = wikidataId
      alternateNames.set(geonamesId, names)
      return
    }
    if (language !== 'en' && language !== 'es') return
    const name = normalizedCurrentName(fields[3] ?? '')
    const colloquial = fields[6] === '1'
    const historic = fields[7] === '1'
    const ended = Boolean(fields[9])
    if (!name || colloquial || historic || ended) return

    const names = alternateNames.get(geonamesId) ?? { en: [], es: [] }
    names[language].push({
      id: Number(fields[0]) || Number.MAX_SAFE_INTEGER,
      name,
      preferred: fields[4] === '1',
      short: fields[5] === '1',
    })
    alternateNames.set(geonamesId, names)
  })

  const rankByCountry = new Map<string, Map<number, number>>()
  for (const countryCode of countryCodes) {
    const bucket = buckets.get(countryCode)
    assert(bucket, `City bucket is missing ${countryCode}`)
    bucket.rankBasis.sort(
      (a, b) => b.population - a.population || a.geonamesId - b.geonamesId,
    )
    rankByCountry.set(
      countryCode,
      new Map(
        bucket.rankBasis.map((candidate, index) => [
          candidate.geonamesId,
          index + 1,
        ]),
      ),
    )
  }

  const cities: GeneratedCityRecord[] = [...selectedById.values()]
    .map((candidate) => {
      const alternate = alternateNames.get(candidate.geonamesId) ?? {
        en: [],
        es: [],
      }
      const enName = pickDisplayName(alternate.en, candidate.name)
      const esName = pickDisplayName(alternate.es, candidate.name)
      const names: LocalizedText = { en: enName, es: esName }
      const namesOverride = overridesById
        .get(candidate.geonamesId)
        ?.find((override) => override.action === 'names')
      if (namesOverride?.action === 'names') {
        Object.assign(names, namesOverride.names)
      }

      const populationRank =
        rankByCountry.get(candidate.countryCode)?.get(candidate.geonamesId) ??
        fail(`Population rank is missing for ${candidate.geonamesId}`)
      const acceptedNames = {
        en: uniqueNames(enName, [
          candidate.name,
          candidate.asciiName,
          ...alternate.en.map((name) => name.name),
          ...(namesOverride?.action === 'names'
            ? (namesOverride.acceptedNames?.en ?? [])
            : []),
        ]),
        es: uniqueNames(esName, [
          candidate.name,
          candidate.asciiName,
          ...alternate.es.map((name) => name.name),
          ...(namesOverride?.action === 'names'
            ? (namesOverride.acceptedNames?.es ?? [])
            : []),
        ]),
      }

      return {
        geonamesId: candidate.geonamesId,
        ...(alternate.wikidataId ? { wikidataId: alternate.wikidataId } : {}),
        countryCode: candidate.countryCode,
        names,
        acceptedNames,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        population: candidate.population,
        populationRank,
        featureCode: candidate.featureCode,
        isCapital: candidate.isCapital,
        difficulty: cityDifficulty(populationRank, candidate.isCapital),
        sourceRevision: sourceLock.sourceRevision,
      }
    })
    .sort(
      (a, b) =>
        compareText(a.countryCode, b.countryCode) ||
        a.populationRank - b.populationRank ||
        a.geonamesId - b.geonamesId,
    )

  const cityById = new Map(cities.map((city) => [city.geonamesId, city]))
  const countries: GeneratedCountryCorpusRecord[] = countryCodes.map((code) => {
    const info = countryInfo.get(code)
    const population = worldBank.get(code)
    const names = namesByCode.get(code)
    const coverage = coverageByCountry.get(code)
    const cityIds = (selectedIdsByCountry.get(code) ?? []).sort(
      (a, b) =>
        (cityById.get(a)?.populationRank ?? Number.MAX_SAFE_INTEGER) -
          (cityById.get(b)?.populationRank ?? Number.MAX_SAFE_INTEGER) || a - b,
    )
    assert(info, `GeoNames countryInfo is missing ${code}`)
    assert(names, `Country names are missing ${code}`)
    assert(coverage, `City coverage is missing ${code}`)
    assert(
      /^(AF|AS|EU|NA|OC|SA)$/u.test(info.continent),
      `${code} has unsupported continent ${info.continent}`,
    )
    assert(
      !population || population.year === policy.countryPopulation.snapshotYear,
      `${code} has a World Bank population from the wrong year`,
    )
    assert(
      !population?.iso3 || population.iso3 === info.iso3,
      `${code} has mismatched GeoNames and World Bank ISO3 codes`,
    )

    return {
      code,
      iso3: info.iso3,
      names,
      continent: info.continent as GeneratedCountryCorpusRecord['continent'],
      worldBankPopulation: population?.value ?? null,
      worldBankPopulationYear: policy.countryPopulation.snapshotYear,
      capitalCityIds: cityIds.filter((id) => cityById.get(id)?.isCapital),
      cityIds,
      coverage,
      sourceRevision: sourceLock.sourceRevision,
    }
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
  const existingCountryCorpus = readJson<ExistingCountryCorpus>(
    'data/geo/generated/countries.json',
  )
  const reviewedByCode = new Map(
    existingCountryCorpus.countries
      .filter((country) => LEGACY_REVIEWED_COUNTRY_CODES.has(country.code))
      .map((country) => [country.code, country]),
  )
  const naturalEarth = readJson<NaturalEarthDocument>(
    sourceLock.naturalEarth.file.path,
  )
  assert(
    naturalEarth.type === 'FeatureCollection' &&
      Array.isArray(naturalEarth.features),
    'Natural Earth countries must be a GeoJSON FeatureCollection',
  )
  const naturalEarthByCode = new Map(
    countryCodes.map((code) => [
      code,
      primaryNaturalEarthFeature(code, naturalEarth.features),
    ]),
  )
  assert(
    countryDifficultyDocument.schemaVersion === 1,
    'Unsupported country-difficulty schema',
  )
  assert(
    countryDifficultyDocument.revision.trim().length > 0,
    'Country-difficulty table must declare a revision',
  )
  const editorialTierEntries = Object.entries(countryDifficultyDocument.tiers)
  const rosterCodes = new Set(countries.map((country) => country.code))
  for (const [code, tier] of editorialTierEntries) {
    assert(
      rosterCodes.has(code),
      `Country-difficulty table tiers unknown country ${code}`,
    )
    assert(
      tier === 1 || tier === 2 || tier === 3 || tier === 4,
      `${code} has an invalid editorial difficulty tier`,
    )
  }
  const editorialDifficultyByCode = new Map<string, Difficulty>(
    editorialTierEntries,
  )
  for (const country of countries) {
    assert(
      editorialDifficultyByCode.has(country.code),
      `${country.code} is missing from the country-difficulty table`,
    )
  }
  const shapeHeldCodes = new Set(countryDifficultyDocument.shapeHolds ?? [])
  for (const code of shapeHeldCodes) {
    assert(
      rosterCodes.has(code),
      `Country-difficulty shape hold references unknown country ${code}`,
    )
  }
  const capitalReviewCodes = new Set(
    overrideDocument.reviewQueue
      .filter((review) => review.topic.includes('capital'))
      .map((review) => review.countryCode),
  )

  const gameCountries: CountryRecord[] = countries.map((country) => {
    const feature = naturalEarthByCode.get(country.code)
    const existing = reviewedByCode.get(country.code)
    const capitalIds = country.capitalCityIds
    assert(
      capitalIds.length === 1,
      `${country.code} must resolve to exactly one canonical capital; additional capital roles require an explicit game-model change`,
    )
    const cityCapital = cityById.get(capitalIds[0] as number)
    assert(cityCapital, `${country.code} canonical capital is missing`)
    const countryWikidataId = validSourceName(feature?.properties.WIKIDATAID)
    const editorialDifficulty =
      editorialDifficultyByCode.get(country.code) ??
      fail(`${country.code} has no editorial difficulty`)
    const shapeEligible = hasRobustCountryGeometry(feature)
    const flagEligible = existsSync(
      pathFromRoot(
        `node_modules/flag-icons/flags/4x3/${country.code.toLocaleLowerCase('en')}.svg`,
      ),
    )
    const capitalEligible = !capitalReviewCodes.has(country.code)
    const baseEligibility = existing?.eligibility ?? {
      shape: shapeEligible,
      flag: flagEligible,
      capital: capitalEligible,
      map: capitalEligible,
    }
    const eligibility = shapeHeldCodes.has(country.code)
      ? { ...baseEligibility, shape: false }
      : baseEligibility
    assert(
      !eligibility.shape || shapeEligible,
      `${country.code} cannot be shape-eligible without robust Natural Earth geometry`,
    )
    assert(
      !eligibility.flag || flagEligible,
      `${country.code} cannot be flag-eligible without a flag-icons asset`,
    )

    // The editorial recognizability table is the single difficulty source;
    // legacy per-country reviews keep names and eligibility only.
    const difficulty: CountryDifficulty = {
      ...(eligibility.shape ? { shape: editorialDifficulty } : {}),
      ...(eligibility.flag ? { flag: editorialDifficulty } : {}),
      ...(eligibility.capital ? { capital: editorialDifficulty } : {}),
      ...(eligibility.map ? { map: editorialDifficulty } : {}),
    }
    const naturalEarthNames = [
      feature?.properties.NAME_EN,
      feature?.properties.NAME_ES,
      feature?.properties.NAME_LONG,
      feature?.properties.FORMAL_EN,
    ].map(validSourceName)
    const acceptedNames = existing?.acceptedNames ?? {
      en: uniqueNames(country.names.en, [
        naturalEarthNames[0] ?? '',
        naturalEarthNames[2] ?? '',
        naturalEarthNames[3] ?? '',
      ]),
      es: uniqueNames(country.names.es, [naturalEarthNames[1] ?? '']),
    }
    const generatedCapital = {
      ...(cityCapital.wikidataId ? { wikidataId: cityCapital.wikidataId } : {}),
      geonamesId: cityCapital.geonamesId,
      names: cityCapital.names,
      acceptedNames: cityCapital.acceptedNames,
      latitude: cityCapital.latitude,
      longitude: cityCapital.longitude,
    }

    assert(
      countryWikidataId,
      `${country.code} has no Natural Earth Wikidata id`,
    )
    assert(
      feature?.properties.SUBREGION,
      `${country.code} has no Natural Earth subregion`,
    )
    assert(
      !feature?.properties.ISO_A3_EH ||
        feature.properties.ISO_A3_EH === country.iso3,
      `${country.code} has mismatched GeoNames and Natural Earth ISO3 codes`,
    )

    return {
      code: country.code,
      iso3: country.iso3,
      wikidataId: existing?.wikidataId ?? countryWikidataId,
      names: existing?.names ?? country.names,
      ...(existing?.shortNames ? { shortNames: existing.shortNames } : {}),
      acceptedNames,
      continent: country.continent,
      subregion: feature.properties.SUBREGION,
      capital: existing
        ? {
            ...existing.capital,
            geonamesId: cityCapital.geonamesId,
            acceptedNames: cityCapital.acceptedNames,
          }
        : generatedCapital,
      assets: {
        flagUrl: '',
      },
      eligibility,
      difficulty,
      status: 'active',
      sourceRevision: sourceLock.sourceRevision,
    }
  })
  const gameCountryCorpus = {
    schemaVersion: 1,
    sourceRevision: sourceLock.sourceRevision,
    countries: gameCountries,
  }

  writeJsonAtomically('data/geo/generated/cities.json', cityCorpus)
  writeJsonAtomically('data/geo/generated/country-corpus.json', countryCorpus)
  writeJsonAtomically('data/geo/generated/countries.json', gameCountryCorpus)

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
