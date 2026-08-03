#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { buildCityAutocompleteOptions } from '../../app/meridian/city-options.ts'
import type { GeneratedCityCorpus } from '../../app/meridian/corpus-model.ts'
import type {
  CountryRecord,
  DailyGeoChallenge,
  LocalizedOption,
  LocalizedText,
} from '../../app/meridian/model.ts'
import { GEO_ROUND_LIMIT_MS } from '../../app/meridian/model.ts'
import { resolveGeoPublicationDate } from '../../app/meridian/publication-date.ts'
import { deriveRunChallenge } from '../../app/meridian/run-variants.ts'
import {
  normalizeGeoAnswer,
  rankGeoAutocompleteCandidates,
} from '../../app/meridian/text-answer.ts'

type Question = {
  id: string
  type: 'shape' | 'flag' | 'capital' | 'map'
  countryCode: string
  difficulty: number
  prompt: LocalizedText
  assetUrl?: string
  options?: LocalizedOption[]
  correctOptionId?: string
  answerCoordinate?: {
    latitude: number
    longitude: number
  }
}

type Round = {
  id: string
  type: 'shape' | 'flag' | 'capital' | 'map'
  questionLimitMs: number
  roundLimitMs: number
  questions: Question[]
}

type Challenge = {
  schemaVersion: number
  generatorVersion: string
  rulesVersion: string
  id: string
  publicationDate: string
  seed: string
  sourceRevision: string
  cityOptions: LocalizedOption[]
  rules: {
    choice: { min: number; max: number }
    streak: { step: number; cap: number }
    mapBands: { maxKm: number; score: number }[]
    feedbackMs: number
    wrongFeedbackMs: number
    roundSummaryMs: number
  }
  rounds: Round[]
}

type CountryCorpus = {
  schemaVersion: number
  sourceRevision: string
  countries: CountryRecord[]
}

type AssetEntry = {
  url: string
  sha256: string
  bytes: number
}

type AssetManifest = {
  schemaVersion: number
  sourceRevision: string
  naturalEarth: {
    countries: { dataset: string; sha256: string }
    land: { dataset: string; sha256: string }
  }
  flagIcons: { version: string }
  shapes: Record<string, AssetEntry>
  flags: Record<string, AssetEntry>
  map: AssetEntry & { projection: string }
}

type GenerationApproval = {
  schemaVersion: number
  sourceRevision: string
  citySourceRevision: string
  cityPolicyRevision: string
  generatorVersion: string
  rulesVersion: string
  reviewBasis: string
}

type SourceLock = {
  schemaVersion: number
  sourceRevision: string
  naturalEarth: {
    license: string
    files: {
      countries: { sha256: string }
      land: { sha256: string }
    }
  }
  cldr: { license: string }
  flagIcons: { version: string; license: string }
  wikidata: {
    queryFile: string
    querySha256: string
    responseSha256: string
    license: string
  }
}

type CorpusSourceLock = {
  schemaVersion: number
  sourceRevision: string
  geonames: {
    snapshotDate: string
    license: string
    files: Record<string, { path: string; sha256: string }>
  }
  worldBank: {
    indicator: string
    snapshotYear: number
    termsUrl: string
    file: { path: string; sha256: string }
  }
  naturalEarth: {
    file: { path: string; sha256: string }
  }
}

type CityOverrides = {
  schemaVersion: number
  reviewQueue: { countryCode: string; topic: string; reason: string }[]
}

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '../..')
const PUBLIC_ROOT = join(REPOSITORY_ROOT, 'public')
const configuredPublicationDate = resolveGeoPublicationDate(
  process.env.MERIDIAN_PUBLICATION_DATE,
)
const challengeArgument = process.argv.find(
  (argument, index) => index > 1 && !argument.startsWith('--'),
)
const challengePath = resolve(
  challengeArgument ??
    join(
      REPOSITORY_ROOT,
      'repo/geo/challenges',
      `${configuredPublicationDate}.json`,
    ),
)
const corpusPath = join(REPOSITORY_ROOT, 'repo/geo/generated/countries.json')
const cityCorpusPath = join(REPOSITORY_ROOT, 'repo/geo/generated/cities.json')
const manifestPath = join(REPOSITORY_ROOT, 'repo/geo/generated/assets.json')
const approvalPath = join(REPOSITORY_ROOT, 'repo/geo/generation-approval.json')
const sourceLockPath = join(REPOSITORY_ROOT, 'repo/geo/sources.lock.json')
const corpusSourceLockPath = join(
  REPOSITORY_ROOT,
  'repo/geo/corpus-sources.lock.json',
)
const cityOverridesPath = join(
  REPOSITORY_ROOT,
  'repo/geo/editorial/city-overrides.json',
)
const MAX_CHALLENGE_GZIP_BYTES = 300 * 1024

const errors: string[] = []

const check = (condition: unknown, message: string): void => {
  if (!condition) errors.push(message)
}

const readJson = <Value>(path: string): Value => {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Value
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Cannot read ${relative(REPOSITORY_ROOT, path)}: ${reason}`)
  }
}

const sha256 = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex')

const validateLockedFile = (
  label: string,
  entry: { path: string; sha256: string },
): void => {
  const path = resolve(REPOSITORY_ROOT, entry.path)
  const relativePath = relative(REPOSITORY_ROOT, path)
  if (
    relativePath.startsWith(`..${sep}`) ||
    relativePath === '..' ||
    relativePath.includes(`..${sep}`)
  ) {
    errors.push(`${label} source path escapes the repository`)
    return
  }
  if (!existsSync(path)) {
    errors.push(`Missing locked ${label} source: ${entry.path}`)
    return
  }
  check(
    sha256(readFileSync(path)) === entry.sha256,
    `${label} source checksum differs from its lock`,
  )
}

const normalizedLabel = (value: string): string =>
  value.normalize('NFC').trim().toLocaleLowerCase('en')

const isLocalizedText = (value: LocalizedText | undefined): boolean =>
  typeof value?.en === 'string' &&
  value.en.trim().length > 0 &&
  typeof value.es === 'string' &&
  value.es.trim().length > 0

const assetFileForUrl = (url: string): string | undefined => {
  if (!url.startsWith('/games/geo/assets/')) {
    errors.push(`Asset URL is outside the geography asset root: ${url}`)
    return undefined
  }
  const path = resolve(PUBLIC_ROOT, url.slice(1))
  const relativePath = relative(PUBLIC_ROOT, path)
  if (
    relativePath.startsWith(`..${sep}`) ||
    relativePath === '..' ||
    relativePath.includes(`..${sep}`)
  ) {
    errors.push(`Asset URL escapes the public directory: ${url}`)
    return undefined
  }
  return path
}

const validateAsset = (
  entry: AssetEntry | undefined,
  expectedKind: 'shape' | 'flag',
  expectedCode: string,
): void => {
  if (!entry) {
    errors.push(
      `Missing asset manifest entry for ${expectedKind} ${expectedCode}`,
    )
    return
  }
  const path = assetFileForUrl(entry.url)
  if (!path || !existsSync(path)) {
    errors.push(`Missing asset file: ${entry.url}`)
    return
  }
  const filename = path.split(sep).at(-1) ?? ''
  check(
    /^[a-f0-9]{20}\.svg$/u.test(filename),
    `${expectedKind} ${expectedCode} must use a 20-character content-hash filename`,
  )
  const bytes = readFileSync(path)
  const digest = sha256(bytes)
  check(
    digest === entry.sha256,
    `${expectedKind} ${expectedCode} SHA-256 differs from the manifest`,
  )
  check(
    filename === `${digest.slice(0, 20)}.svg`,
    `${expectedKind} ${expectedCode} filename does not match its content hash`,
  )
  check(
    bytes.length === entry.bytes,
    `${expectedKind} ${expectedCode} byte count differs from the manifest`,
  )
  const maximumBytes = expectedKind === 'shape' ? 32 * 1024 : 64 * 1024
  const transferredBytes = gzipSync(bytes).length
  check(
    transferredBytes <= maximumBytes,
    `${expectedKind} ${expectedCode} exceeds ${maximumBytes} bytes gzip`,
  )
  const source = bytes.toString('utf8')
  check(
    !/<script\b|javascript:|\son[a-z]+\s*=|(?:href|src)\s*=\s*["']https?:/iu.test(
      source,
    ),
    `${expectedKind} ${expectedCode} contains active or remote SVG content`,
  )
  if (expectedKind === 'shape') {
    const tagNames = [...source.matchAll(/<\/?([a-z][a-z0-9:-]*)\b/giu)].map(
      (match) => match[1].toLocaleLowerCase('en'),
    )
    check(
      tagNames.every((tagName) => tagName === 'svg' || tagName === 'path'),
      `shape ${expectedCode} must contain path geometry only`,
    )
  }
}

let challenge: Challenge
let corpus: CountryCorpus
let cityCorpus: GeneratedCityCorpus
let manifest: AssetManifest
let approval: GenerationApproval
let sourceLock: SourceLock
let corpusSourceLock: CorpusSourceLock
let cityOverrides: CityOverrides

try {
  challenge = readJson<Challenge>(challengePath)
  corpus = readJson<CountryCorpus>(corpusPath)
  cityCorpus = readJson<GeneratedCityCorpus>(cityCorpusPath)
  manifest = readJson<AssetManifest>(manifestPath)
  approval = readJson<GenerationApproval>(approvalPath)
  sourceLock = readJson<SourceLock>(sourceLockPath)
  corpusSourceLock = readJson<CorpusSourceLock>(corpusSourceLockPath)
  cityOverrides = readJson<CityOverrides>(cityOverridesPath)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const expectedRoundTypes = ['shape', 'flag', 'capital', 'map'] as const
const expectedRoundLimits = [10000, 10000, 10000, 15000] as const
const difficulties = [1, 2, 3, 4] as const
const countryByCode = new Map(
  corpus.countries.map((country) => [country.code, country]),
)
const questionIds = new Set<string>()
const roundIds = new Set<string>()
const distinctAnswerCountryCodes = new Set<string>()
const generatedMapCityIds = new Set<number>()
const correctPositions = [0, 0, 0, 0]
const eligibleCountriesByRound = new Map<
  (typeof expectedRoundTypes)[number],
  Map<string, CountryRecord>
>()

for (const roundType of expectedRoundTypes) {
  const countries = corpus.countries.filter(
    (country) =>
      country.status === 'active' &&
      country.eligibility[roundType] &&
      difficulties.includes(
        country.difficulty[roundType] as (typeof difficulties)[number],
      ),
  )
  check(
    countries.length > 5,
    `${roundType} source deck must contain more than five countries`,
  )
  eligibleCountriesByRound.set(
    roundType,
    new Map(countries.map((country) => [country.code, country])),
  )
}

const cityByGeonamesId = new Map(
  cityCorpus.cities.map((city) => [city.geonamesId, city]),
)
const expectedCityOptions = buildCityAutocompleteOptions(cityCorpus.cities)
const cityOptions = Array.isArray(challenge.cityOptions)
  ? challenge.cityOptions
  : []
check(
  Array.isArray(challenge.cityOptions),
  'Challenge must contain a city autocomplete lexicon',
)
check(
  cityOptions.length === expectedCityOptions.length,
  'City autocomplete lexicon must contain one option per retained city',
)
check(
  new Set(cityOptions.map((option) => option.id)).size === cityOptions.length,
  'City autocomplete option IDs must be unique',
)
for (const [index, expected] of expectedCityOptions.entries()) {
  const actual = cityOptions[index]
  check(
    actual?.id === expected.id &&
      actual?.label.en === expected.label.en &&
      actual?.label.es === expected.label.es,
    `City autocomplete option ${index + 1} differs from the retained city corpus`,
  )
}
for (const locale of ['en', 'es'] as const) {
  const optionIdsByLabel = new Map<string, string[]>()
  for (const option of cityOptions) {
    const normalizedLabel = normalizeGeoAnswer(option.label[locale], locale)
    optionIdsByLabel.set(normalizedLabel, [
      ...(optionIdsByLabel.get(normalizedLabel) ?? []),
      option.id,
    ])
  }

  for (const [normalizedLabel, optionIds] of optionIdsByLabel) {
    const matches = rankGeoAutocompleteCandidates(
      normalizedLabel,
      cityOptions,
      locale,
      {
        minimumCharacters: 1,
        maxResults: cityOptions.length,
      },
    )
    const exactMatches = matches.filter(
      (candidate) => candidate.normalizedLabel === normalizedLabel,
    )
    check(
      optionIds.length === 1
        ? exactMatches.length === 1 &&
            exactMatches[0]?.optionId === optionIds[0]
        : exactMatches.length === 0,
      optionIds.length === 1
        ? `Unique ${locale} city label "${normalizedLabel}" is not resolvable`
        : `Ambiguous ${locale} city label "${normalizedLabel}" must not autocomplete`,
    )
  }
}
const eligibleMapCountries =
  eligibleCountriesByRound.get('map') ?? new Map<string, CountryRecord>()
const eligibleMapCities = cityCorpus.cities.filter((city) =>
  eligibleMapCountries.has(city.countryCode),
)
const eligibleMapCityIds = new Set(
  eligibleMapCities.map((city) => city.geonamesId),
)

check(challenge.schemaVersion === 1, 'Challenge schemaVersion must be 1')
check(
  /^\d{4}-\d{2}-\d{2}$/u.test(challenge.publicationDate),
  'publicationDate must use YYYY-MM-DD',
)
check(
  challenge.id === `geo:${challenge.publicationDate}`,
  'Challenge ID must match publicationDate',
)
check(
  approval.schemaVersion === 1,
  'Generation approval schemaVersion must be 1',
)
check(
  challenge.generatorVersion === approval.generatorVersion,
  'Challenge generatorVersion is not approved',
)
check(
  challenge.rulesVersion === approval.rulesVersion,
  'Challenge rulesVersion is not approved',
)
check(
  challenge.sourceRevision === corpus.sourceRevision &&
    challenge.sourceRevision === approval.sourceRevision &&
    challenge.sourceRevision === manifest.sourceRevision &&
    challenge.sourceRevision === sourceLock.sourceRevision,
  'Country source revisions must match across challenge, corpus, assets, approval, and lock',
)
check(
  cityCorpus.sourceRevision === corpusSourceLock.sourceRevision,
  'City corpus source revision must match its source lock',
)
check(
  cityCorpus.sourceRevision === approval.citySourceRevision,
  'City corpus source revision is not approved',
)
check(
  cityCorpus.policyRevision === approval.cityPolicyRevision,
  'City corpus policy revision is not approved',
)
check(cityCorpus.schemaVersion === 1, 'City corpus schemaVersion must be 1')
check(
  new Set(corpus.countries.map(({ code }) => code)).size ===
    corpus.countries.length,
  'Country corpus contains duplicate ISO alpha-2 codes',
)
check(
  cityByGeonamesId.size === cityCorpus.cities.length,
  'City corpus contains duplicate GeoNames IDs',
)
for (const city of cityCorpus.cities) {
  check(
    city.sourceRevision === cityCorpus.sourceRevision,
    `City ${city.geonamesId} uses a stale source revision`,
  )
  check(
    countryByCode.has(city.countryCode),
    `City ${city.geonamesId} references unknown country ${city.countryCode}`,
  )
  check(
    isLocalizedText(city.names),
    `City ${city.geonamesId} lacks EN/ES names`,
  )
  check(
    Number.isFinite(city.latitude) &&
      city.latitude >= -90 &&
      city.latitude <= 90 &&
      Number.isFinite(city.longitude) &&
      city.longitude >= -180 &&
      city.longitude <= 180,
    `City ${city.geonamesId} has invalid coordinates`,
  )
  check(
    difficulties.includes(city.difficulty as (typeof difficulties)[number]),
    `City ${city.geonamesId} has invalid difficulty`,
  )
}
for (const country of eligibleMapCountries.values()) {
  check(
    eligibleMapCities.some(
      (city) => city.isCapital && city.countryCode === country.code,
    ),
    `${country.code} has no retained capital city`,
  )
}
for (const country of corpus.countries) {
  check(isLocalizedText(country.names), `${country.code} lacks EN/ES names`)
  check(
    isLocalizedText(country.capital.names),
    `${country.code} capital lacks EN/ES names`,
  )
  check(
    Number.isFinite(country.capital.latitude) &&
      country.capital.latitude >= -90 &&
      country.capital.latitude <= 90 &&
      Number.isFinite(country.capital.longitude) &&
      country.capital.longitude >= -180 &&
      country.capital.longitude <= 180,
    `${country.code} has invalid capital coordinates`,
  )
  for (const roundType of expectedRoundTypes) {
    check(
      country.eligibility[roundType] ===
        difficulties.includes(
          country.difficulty[roundType] as (typeof difficulties)[number],
        ),
      `${country.code} ${roundType} eligibility and difficulty disagree`,
    )
  }
  if (country.status === 'active' && country.eligibility.shape) {
    check(
      country.assets.shapeUrl === manifest.shapes[country.code]?.url,
      `${country.code} shape asset differs between corpus and manifest`,
    )
  }
  if (country.status === 'active' && country.eligibility.flag) {
    check(
      country.assets.flagUrl === manifest.flags[country.code]?.url,
      `${country.code} flag asset differs between corpus and manifest`,
    )
  }
}
check(
  cityOverrides.reviewQueue.length === 5 &&
    new Set(cityOverrides.reviewQueue.map(({ countryCode }) => countryCode))
      .size === 5,
  'City editorial review queue must retain five distinct country holds',
)
for (const hold of cityOverrides.reviewQueue) {
  const country = countryByCode.get(hold.countryCode)
  check(
    Boolean(country),
    `Editorial hold references unknown ${hold.countryCode}`,
  )
  check(
    Boolean(hold.topic.trim() && hold.reason.trim()),
    `${hold.countryCode} editorial hold lacks its rationale`,
  )
  if (country) {
    check(
      !country.eligibility.capital && !country.eligibility.map,
      `${hold.countryCode} capital/map content must remain held from play`,
    )
  }
}
check(
  manifest.naturalEarth.countries.sha256 ===
    sourceLock.naturalEarth.files.countries.sha256 &&
    manifest.naturalEarth.land.sha256 ===
      sourceLock.naturalEarth.files.land.sha256,
  'Natural Earth checksums differ between the asset manifest and source lock',
)
check(
  manifest.flagIcons.version === sourceLock.flagIcons.version,
  'flag-icons versions differ between the asset manifest and source lock',
)
check(
  [
    sourceLock.naturalEarth.license,
    sourceLock.cldr.license,
    sourceLock.flagIcons.license,
    sourceLock.wikidata.license,
    sourceLock.wikidata.responseSha256,
  ].every((value) => typeof value === 'string' && value.trim().length > 0),
  'A required source licence or response digest is missing',
)
check(
  [
    corpusSourceLock.geonames.snapshotDate,
    corpusSourceLock.geonames.license,
    corpusSourceLock.worldBank.termsUrl,
  ].every((value) => typeof value === 'string' && value.trim().length > 0),
  'A required city-corpus licence or snapshot marker is missing',
)
check(
  corpusSourceLock.worldBank.indicator === 'SP.POP.TOTL',
  'City coverage must use the World Bank total-population indicator',
)
check(
  corpusSourceLock.naturalEarth.file.sha256 ===
    sourceLock.naturalEarth.files.countries.sha256,
  'Country geometry checksum differs between source locks',
)
for (const [name, entry] of Object.entries(corpusSourceLock.geonames.files)) {
  validateLockedFile(`GeoNames ${name}`, entry)
}
validateLockedFile('World Bank population', corpusSourceLock.worldBank.file)
validateLockedFile(
  'Natural Earth country geometry',
  corpusSourceLock.naturalEarth.file,
)
const wikidataQueryPath = resolve(
  REPOSITORY_ROOT,
  sourceLock.wikidata.queryFile,
)
check(
  existsSync(wikidataQueryPath),
  `Missing Wikidata query: ${sourceLock.wikidata.queryFile}`,
)
if (existsSync(wikidataQueryPath)) {
  check(
    sha256(readFileSync(wikidataQueryPath)) === sourceLock.wikidata.querySha256,
    'Wikidata query checksum differs from the source lock',
  )
}
check(existsSync(join(REPOSITORY_ROOT, 'CREDITS.txt')), 'Missing CREDITS.txt')
check(
  approval.reviewBasis === 'automated-source-and-policy-validation',
  'Approval must describe its automated review basis honestly',
)

const expectedSeed = createHash('sha256')
  .update(
    `geo:${challenge.publicationDate}:${challenge.generatorVersion}:${challenge.sourceRevision}:${cityCorpus.sourceRevision}:${cityCorpus.policyRevision}:${challenge.rulesVersion}`,
  )
  .digest('hex')
check(challenge.seed === expectedSeed, 'Challenge seed is not reproducible')

check(
  challenge.rules.choice.min === 500 && challenge.rules.choice.max === 1000,
  'Choice scoring range must be 500–1000',
)
check(
  challenge.rules.streak.step === 0.1 && challenge.rules.streak.cap === 1.5,
  'Streak scoring must use a 0.1 step and 1.5 cap',
)
check(challenge.rules.feedbackMs === 500, 'Feedback duration must be 500 ms')
check(
  challenge.rules.wrongFeedbackMs === 2500,
  'Wrong-answer feedback duration must be 2500 ms',
)
check(
  challenge.rules.roundSummaryMs === 3000,
  'Round-summary duration must be 3000 ms',
)
const expectedMapBands = [
  [100, 1000],
  [300, 800],
  [750, 600],
  [1500, 400],
  [3000, 200],
  [20040, 0],
]
check(
  JSON.stringify(
    challenge.rules.mapBands.map(({ maxKm, score }) => [maxKm, score]),
  ) === JSON.stringify(expectedMapBands),
  'Map score bands do not match the approved rules version',
)

check(challenge.rounds.length === 4, 'Challenge must contain four rounds')

for (const [roundIndex, round] of challenge.rounds.entries()) {
  const expectedType = expectedRoundTypes[roundIndex]
  const expectedCountries =
    eligibleCountriesByRound.get(expectedType) ??
    new Map<string, CountryRecord>()
  const expectedQuestionCount = expectedCountries.size
  check(
    round.type === expectedType,
    `Round ${roundIndex + 1} must be ${expectedType}`,
  )
  check(
    round.questionLimitMs === expectedRoundLimits[roundIndex],
    `${round.type} round has the wrong time limit`,
  )
  check(
    round.roundLimitMs === GEO_ROUND_LIMIT_MS,
    `${round.type} round must use the ${GEO_ROUND_LIMIT_MS} ms shared limit`,
  )
  check(!roundIds.has(round.id), `Duplicate round ID: ${round.id}`)
  roundIds.add(round.id)
  check(
    round.questions.length === expectedQuestionCount,
    `${round.type} round must contain all ${expectedQuestionCount} eligible source questions`,
  )

  const continentCounts = new Map<string, number>()
  const roundAnswerCountryCodes = new Set<string>()
  const seenDifficulties = new Set<number>()
  let previousDifficulty = 0

  for (const [questionIndex, question] of round.questions.entries()) {
    const label = `${round.type} question ${questionIndex + 1}`
    check(question.type === round.type, `${label} type must match its round`)
    check(
      !questionIds.has(question.id),
      `Duplicate question ID: ${question.id}`,
    )
    questionIds.add(question.id)
    check(
      difficulties.includes(
        question.difficulty as (typeof difficulties)[number],
      ),
      `${label} has an invalid difficulty`,
    )
    check(
      question.difficulty >= previousDifficulty,
      `${label} breaks the increasing difficulty curve`,
    )
    previousDifficulty = question.difficulty
    seenDifficulties.add(question.difficulty)
    check(isLocalizedText(question.prompt), `${label} lacks an EN/ES prompt`)
    check(
      !roundAnswerCountryCodes.has(question.countryCode),
      `${round.type} repeats answer country ${question.countryCode}`,
    )
    roundAnswerCountryCodes.add(question.countryCode)
    distinctAnswerCountryCodes.add(question.countryCode)

    const country = countryByCode.get(question.countryCode)
    if (!country) {
      errors.push(`${label} references unknown country ${question.countryCode}`)
      continue
    }
    check(country.status === 'active', `${question.countryCode} is not active`)
    check(
      country.sourceRevision === challenge.sourceRevision,
      `${question.countryCode} uses a stale source revision`,
    )
    check(
      country.eligibility[round.type],
      `${question.countryCode} is not eligible for ${round.type}`,
    )
    check(
      expectedCountries.has(question.countryCode),
      `${label} is outside the eligible ${round.type} corpus`,
    )
    check(
      country.difficulty[round.type] === question.difficulty,
      `${question.countryCode} difficulty differs from the corpus`,
    )
    continentCounts.set(
      country.continent,
      (continentCounts.get(country.continent) ?? 0) + 1,
    )

    if (question.type === 'map') {
      const cityIdMatch = /^map-([a-z]{2})-(\d+)$/u.exec(question.id)
      const cityId = Number(cityIdMatch?.[2])
      const city = cityByGeonamesId.get(cityId)
      check(Boolean(cityIdMatch), `${label} has an invalid city question ID`)
      check(
        cityIdMatch?.[1].toLocaleUpperCase('en') === question.countryCode,
        `${label} city question ID has the wrong country code`,
      )
      check(Boolean(city), `${label} references unknown city ${cityId}`)
      check(
        eligibleMapCityIds.has(cityId),
        `${label} city is outside the eligible map corpus`,
      )
      check(
        !generatedMapCityIds.has(cityId),
        `Map round repeats city ${cityId}`,
      )
      generatedMapCityIds.add(cityId)
      const coordinate = question.answerCoordinate
      check(
        Number.isFinite(coordinate?.latitude) &&
          (coordinate?.latitude ?? 91) >= -90 &&
          (coordinate?.latitude ?? -91) <= 90,
        `${label} has an invalid latitude`,
      )
      check(
        Number.isFinite(coordinate?.longitude) &&
          (coordinate?.longitude ?? 181) >= -180 &&
          (coordinate?.longitude ?? -181) <= 180,
        `${label} has an invalid longitude`,
      )
      if (city) {
        check(
          city.countryCode === question.countryCode,
          `${label} city belongs to ${city.countryCode}`,
        )
        check(city.isCapital, `${label} must locate a capital city`)
        check(
          Math.abs((coordinate?.latitude ?? 999) - city.latitude) < 0.000001 &&
            Math.abs((coordinate?.longitude ?? 999) - city.longitude) <
              0.000001,
          `${label} coordinates differ from the city corpus`,
        )
        const sentenceName = (name: string) =>
          name.endsWith('.') ? name : `${name}.`
        check(
          question.prompt.en === `Locate ${sentenceName(city.names.en)}` &&
            question.prompt.es === `Localiza ${sentenceName(city.names.es)}`,
          `${label} prompt differs from the capital corpus`,
        )
      }
      continue
    }

    const options = question.options ?? []
    check(options.length === 4, `${label} must contain four choices`)
    check(
      new Set(options.map(({ id }) => id)).size === options.length,
      `${label} has duplicate option IDs`,
    )
    for (const option of options) {
      check(
        isLocalizedText(option.label),
        `${label} option ${option.id} lacks EN/ES labels`,
      )
      const optionCode = option.id
        .replace(/^country-/u, '')
        .replace(/^capital-/u, '')
        .toLocaleUpperCase('en')
      const optionCountry = countryByCode.get(optionCode)
      const usesCapitalLabel = question.type === 'capital'
      check(
        Boolean(optionCountry),
        `${label} option ${option.id} is absent from the source corpus`,
      )
      if (optionCountry) {
        const expectedLabel = usesCapitalLabel
          ? optionCountry.capital.names
          : optionCountry.names
        check(
          option.label.en === expectedLabel.en &&
            option.label.es === expectedLabel.es,
          `${label} option ${option.id} has stale labels`,
        )
        check(
          optionCountry.eligibility[round.type],
          `${label} option ${option.id} is outside the eligible ${round.type} corpus`,
        )
      }
    }
    for (const locale of ['en', 'es'] as const) {
      check(
        new Set(
          options.map(({ label: optionLabel }) =>
            normalizedLabel(optionLabel[locale]),
          ),
        ).size === options.length,
        `${label} has duplicate ${locale} option labels`,
      )
    }
    const correctIndex = options.findIndex(
      ({ id }) => id === question.correctOptionId,
    )
    check(correctIndex >= 0, `${label} correct option is missing`)
    if (correctIndex >= 0) {
      correctPositions[correctIndex] += 1
      const expectedCorrectLabel =
        question.type === 'capital' ? country.capital.names : country.names
      check(
        options[correctIndex].label.en === expectedCorrectLabel.en &&
          options[correctIndex].label.es === expectedCorrectLabel.es,
        `${label} correct labels differ from the source corpus`,
      )
    }

    if (question.type === 'shape' || question.type === 'flag') {
      const corpusUrl =
        question.type === 'shape'
          ? country.assets.shapeUrl
          : country.assets.flagUrl
      const manifestEntry =
        question.type === 'shape'
          ? manifest.shapes[question.countryCode]
          : manifest.flags[question.countryCode]
      check(
        question.assetUrl === corpusUrl &&
          question.assetUrl === manifestEntry?.url,
        `${label} asset URL differs across challenge, corpus, and manifest`,
      )
    }

    if (question.type === 'capital') {
      check(
        !('capitalDirection' in question),
        `${label} must not declare a reversible capital direction`,
      )
      check(
        question.prompt.en === `What is the capital of ${country.names.en}?` &&
          question.prompt.es === `¿Cuál es la capital de ${country.names.es}?`,
        `${label} must ask for the capital from the country`,
      )
      check(
        question.correctOptionId ===
          `capital-${question.countryCode.toLocaleLowerCase('en')}`,
        `${label} correct option must identify the country's capital`,
      )
      check(
        options.every(({ id }) => id.startsWith('capital-')),
        `${label} options must all be capitals`,
      )
    }
  }

  const expectedCountryCodes = new Set(expectedCountries.keys())
  check(
    roundAnswerCountryCodes.size === expectedCountryCodes.size &&
      [...expectedCountryCodes].every((code) =>
        roundAnswerCountryCodes.has(code),
      ),
    `${round.type} round does not cover every eligible country`,
  )
  check(
    seenDifficulties.size === difficulties.length &&
      difficulties.every((difficulty) => seenDifficulties.has(difficulty)),
    `${round.type} round must span all four difficulty levels`,
  )
  check(
    continentCounts.size >= 5,
    `${round.type} round must represent at least five continents`,
  )
}

const expectedQuestionCount = expectedRoundTypes.reduce(
  (total, roundType) =>
    total + (eligibleCountriesByRound.get(roundType)?.size ?? 0),
  0,
)
check(
  questionIds.size === expectedQuestionCount,
  `Challenge must contain ${expectedQuestionCount} unique question IDs`,
)
const expectedCapitalCityIds = new Set(
  eligibleMapCities
    .filter((city) => city.isCapital)
    .map((city) => city.geonamesId),
)
check(
  generatedMapCityIds.size === expectedCapitalCityIds.size &&
    [...expectedCapitalCityIds].every((cityId) =>
      generatedMapCityIds.has(cityId),
    ),
  'Map round must locate every eligible capital exactly once',
)
const activeCountryCodes = new Set(
  corpus.countries
    .filter((country) => country.status === 'active')
    .map((country) => country.code),
)
check(
  [...activeCountryCodes].every((code) => distinctAnswerCountryCodes.has(code)),
  'Challenge must exercise every active country across its source sections',
)
check(
  Math.max(...correctPositions) - Math.min(...correctPositions) <= 1,
  `Correct choice positions are not balanced: ${correctPositions.join(', ')}`,
)
check(
  activeCountryCodes.size >= 190,
  'Normalized corpus must contain the full playable country roster',
)

try {
  const runtimeChallenge = deriveRunChallenge(
    challenge as unknown as DailyGeoChallenge,
    0,
  )
  check(
    runtimeChallenge.rounds.every((round) => round.questions.length > 5),
    'Runtime sections must provide a timed question stream beyond five prompts',
  )
  const countrySections = new Map<string, string>()
  check(
    runtimeChallenge.rounds.every((round) =>
      round.questions.every((question) => {
        if (!question.countryCode) return false
        const previousSection = countrySections.get(question.countryCode)
        if (previousSection && previousSection !== round.id) return false
        countrySections.set(question.countryCode, round.id)
        return true
      }),
    ),
    'Runtime sections must use completely disjoint country sets',
  )
  check(
    runtimeChallenge.rounds.every((round) =>
      round.questions.every(
        (question, index) =>
          index === 0 ||
          question.difficulty >= round.questions[index - 1].difficulty,
      ),
    ),
    'Runtime sections must play as an ascending difficulty ramp',
  )
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error)
  errors.push(`Runtime challenge derivation failed: ${reason}`)
}

for (const [code, entry] of Object.entries(manifest.shapes)) {
  validateAsset(entry, 'shape', code)
}
for (const [code, entry] of Object.entries(manifest.flags)) {
  validateAsset(entry, 'flag', code)
}
check(
  Object.keys(manifest.shapes).length ===
    corpus.countries.filter(
      (country) =>
        country.status === 'active' && country.eligibility.shape === true,
    ).length,
  'Asset manifest must contain one shape per shape-eligible country',
)
check(
  Object.keys(manifest.flags).length ===
    corpus.countries.filter(
      (country) =>
        country.status === 'active' && country.eligibility.flag === true,
    ).length,
  'Asset manifest must contain one flag per flag-eligible country',
)

const mapPath = assetFileForUrl(manifest.map.url)
if (!mapPath || !existsSync(mapPath)) {
  errors.push(`Missing world map: ${manifest.map.url}`)
} else {
  const mapBytes = readFileSync(mapPath)
  check(
    manifest.map.url === '/games/geo/assets/map/world-map.svg',
    'World map must use its stable public URL',
  )
  check(
    sha256(mapBytes) === manifest.map.sha256,
    'World-map SHA-256 differs from the manifest',
  )
  check(
    mapBytes.length === manifest.map.bytes,
    'World-map byte count differs from the manifest',
  )
  check(mapBytes.length <= 150 * 1024, 'World map exceeds 150 KB')
  check(
    manifest.map.projection === 'EqualEarth',
    'World-map projection must be documented as EqualEarth',
  )
  const mapSource = mapBytes.toString('utf8')
  const mapTagNames = [
    ...mapSource.matchAll(/<\/?([a-z][a-z0-9:-]*)\b/giu),
  ].map((match) => match[1].toLocaleLowerCase('en'))
  check(
    mapTagNames.every((tagName) => tagName === 'svg' || tagName === 'path'),
    'World map must contain path geometry only',
  )
}

const expectedAssetFiles = new Set([
  ...Object.values(manifest.shapes).map(({ url }) => url),
  ...Object.values(manifest.flags).map(({ url }) => url),
])
for (const kind of ['shapes', 'flags'] as const) {
  const directory = join(PUBLIC_ROOT, 'games/geo/assets', kind)
  for (const filename of readdirSync(directory)) {
    const url = `/games/geo/assets/${kind}/${filename}`
    check(
      expectedAssetFiles.has(url),
      `Unreferenced generated asset must be removed: ${url}`,
    )
  }
}

const challengeBytes = readFileSync(challengePath)
const compressedChallengeBytes = gzipSync(challengeBytes).length
check(
  compressedChallengeBytes <= MAX_CHALLENGE_GZIP_BYTES,
  `Challenge JSON exceeds ${MAX_CHALLENGE_GZIP_BYTES} bytes gzip`,
)
check(
  statSync(challengePath).size === challengeBytes.length,
  'Challenge file could not be read completely',
)

if (errors.length > 0) {
  console.error(
    `Geography challenge validation failed with ${errors.length} error${
      errors.length === 1 ? '' : 's'
    }:`,
  )
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Validated ${relative(REPOSITORY_ROOT, challengePath)}`)
console.log(
  `${challenge.rounds
    .map((round) => `${round.type}:${round.questions.length}`)
    .join(' · ')} · ${distinctAnswerCountryCodes.size} active countries`,
)
console.log(
  `Choice positions ${correctPositions.join('/')} · ${GEO_ROUND_LIMIT_MS / 1000}s per round`,
)
console.log(
  `Challenge ${challengeBytes.length} B (${compressedChallengeBytes} B gzip) · map ${manifest.map.bytes} B`,
)
