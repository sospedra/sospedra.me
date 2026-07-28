#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCityAutocompleteOptions } from '../../lib/geo/city-options.ts'

type Locale = 'en' | 'es'
type RoundType = 'shape' | 'flag' | 'capital' | 'map'
type Difficulty = 1 | 2 | 3 | 4
type LocalizedText = Record<Locale, string>

type Country = {
  code: string
  names: LocalizedText
  continent: string
  subregion: string
  capital: {
    names: LocalizedText
    latitude: number
    longitude: number
  }
  assets: {
    shapeUrl?: string
    flagUrl?: string
  }
  eligibility: Record<RoundType, boolean>
  difficulty: Partial<Record<RoundType, Difficulty>>
  status: 'active' | 'review' | 'excluded'
}

type CountryCorpus = {
  schemaVersion: number
  sourceRevision: string
  countries: Country[]
}

type City = {
  geonamesId: number
  countryCode: string
  names: LocalizedText
  acceptedNames: Record<Locale, string[]>
  latitude: number
  longitude: number
  population: number
  populationRank: number
  featureCode: string
  isCapital: boolean
  difficulty: Difficulty
  sourceRevision: string
}

type CityCorpus = {
  schemaVersion: number
  sourceRevision: string
  policyRevision: string
  cities: City[]
}

type MapRegions = {
  schemaVersion: number
  regions: Record<string, LocalizedText>
  countryRegions: Record<string, string>
}

type MapTarget = {
  id: string
  country: Country
  names: LocalizedText
  latitude: number
  longitude: number
  difficulty: Difficulty
}

type Option = {
  id: string
  label: LocalizedText
}

type ChoiceQuestion = {
  id: string
  type: 'shape' | 'flag' | 'capital'
  countryCode: string
  difficulty: Difficulty
  prompt: LocalizedText
  assetUrl?: string
  options: Option[]
  correctOptionId: string
}

type MapQuestion = {
  id: string
  type: 'map'
  countryCode: string
  difficulty: Difficulty
  prompt: LocalizedText
  answerCoordinate: {
    latitude: number
    longitude: number
  }
  regionOptions: Option[]
  correctRegionOptionId: string
}

type Question = ChoiceQuestion | MapQuestion

type Round = {
  id: string
  type: RoundType
  questionLimitMs: number
  roundLimitMs: number
  questions: Question[]
}

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '../..')
const CORPUS_PATH = join(REPOSITORY_ROOT, 'data/geo/generated/countries.json')
const CITIES_PATH = join(REPOSITORY_ROOT, 'data/geo/generated/cities.json')
const MAP_REGIONS_PATH = join(
  REPOSITORY_ROOT,
  'data/geo/editorial/map-regions.json',
)
const GENERATOR_VERSION = '4.1.0'
const RULES_VERSION = 'geo-v6'
const ROUND_TYPES: RoundType[] = ['shape', 'flag', 'capital', 'map']
const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4]
const ROUND_LIMIT_MS = 60_000
const QUESTION_LIMITS: Record<RoundType, number> = {
  shape: 10_000,
  flag: 10_000,
  capital: 10_000,
  map: 15_000,
}
const DERIVED_REGION_LABELS: Record<string, LocalizedText> = {
  africa: { en: 'Africa', es: 'África' },
  asia: { en: 'Asia', es: 'Asia' },
  europe: { en: 'Europe', es: 'Europa' },
  'eastern-europe': { en: 'Eastern Europe', es: 'Europa oriental' },
  'western-asia': { en: 'Western Asia', es: 'Asia occidental' },
  'central-america': { en: 'Central America', es: 'América Central' },
  caribbean: { en: 'Caribbean', es: 'Caribe' },
  'middle-africa': { en: 'Central Africa', es: 'África central' },
  'southern-africa': { en: 'Southern Africa', es: 'África austral' },
  melanesia: { en: 'Melanesia', es: 'Melanesia' },
  micronesia: { en: 'Micronesia', es: 'Micronesia' },
  polynesia: { en: 'Polynesia', es: 'Polinesia' },
}
const SUBREGION_REGION_IDS: Record<string, string> = {
  'australia and new zealand': 'oceania',
  caribbean: 'caribbean',
  'central america': 'central-america',
  'central asia': 'central-asia',
  'eastern africa': 'east-africa',
  'eastern asia': 'east-asia',
  'eastern europe': 'eastern-europe',
  melanesia: 'melanesia',
  micronesia: 'micronesia',
  'middle africa': 'middle-africa',
  'northern africa': 'north-africa',
  'northern america': 'north-america',
  'northern europe': 'northern-europe',
  polynesia: 'polynesia',
  'south america': 'south-america',
  'south eastern asia': 'southeast-asia',
  'southern africa': 'southern-africa',
  'southern asia': 'south-asia',
  'southern europe': 'southern-europe',
  'western africa': 'west-africa',
  'western asia': 'western-asia',
  'western europe': 'western-europe',
}
const CONTINENT_REGION_IDS: Record<string, string> = {
  AF: 'africa',
  AS: 'asia',
  EU: 'europe',
  NA: 'north-america',
  OC: 'oceania',
  SA: 'south-america',
}

const readJson = <Value>(path: string): Value =>
  JSON.parse(readFileSync(path, 'utf8')) as Value

const stableJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`

const hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

const sortByHash = <Value>(
  values: Value[],
  keyFor: (value: Value) => string,
  namespace: string,
): Value[] =>
  [...values].sort((left, right) =>
    hash(`${namespace}:${keyFor(left)}`).localeCompare(
      hash(`${namespace}:${keyFor(right)}`),
    ),
  )

const optionAt = (
  correct: Option,
  distractors: Option[],
  correctIndex: number,
): Option[] => {
  const options = [...distractors]
  options.splice(correctIndex, 0, correct)
  return options
}

const countryOption = (country: Country): Option => ({
  id: `country-${country.code.toLocaleLowerCase('en')}`,
  label: country.names,
})

const capitalOption = (country: Country): Option => ({
  id: `capital-${country.code.toLocaleLowerCase('en')}`,
  label: country.capital.names,
})

const optionLabelsAreUnique = (options: Option[]): boolean =>
  (['en', 'es'] as Locale[]).every(
    (locale) =>
      new Set(
        options.map((option) =>
          option.label[locale].normalize('NFC').toLocaleLowerCase(locale),
        ),
      ).size === options.length,
  )

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(message)
}

const corpus = readJson<CountryCorpus>(CORPUS_PATH)
const cityCorpus = existsSync(CITIES_PATH)
  ? readJson<CityCorpus>(CITIES_PATH)
  : null
const mapRegions = readJson<MapRegions>(MAP_REGIONS_PATH)
const regionLabels = {
  ...DERIVED_REGION_LABELS,
  ...mapRegions.regions,
}
assert(cityCorpus, 'The retained city corpus is required')
assert(cityCorpus.schemaVersion === 1, 'Unsupported city-corpus schema')

const countryByCode = new Map(
  corpus.countries.map((country) => [country.code, country]),
)

const cliDate = process.argv.find(
  (argument, index) => index > 1 && !argument.startsWith('--'),
)
const configuredDate = process.env.MERIDIAN_PUBLICATION_DATE?.trim()
const publicationDate =
  cliDate || configuredDate || new Date().toISOString().slice(0, 10)
assert(
  /^\d{4}-\d{2}-\d{2}$/u.test(publicationDate),
  'Publication date must use YYYY-MM-DD',
)
const parsedPublicationDate = new Date(`${publicationDate}T00:00:00.000Z`)
assert(
  !Number.isNaN(parsedPublicationDate.valueOf()) &&
    parsedPublicationDate.toISOString().slice(0, 10) === publicationDate,
  'Publication date must be a real UTC calendar date',
)
const checkOnly = process.argv.includes('--check')
const challengePath = join(
  REPOSITORY_ROOT,
  'content/geo/challenges',
  `${publicationDate}.json`,
)
const sourceSeedRevision = cityCorpus
  ? `${corpus.sourceRevision}:${cityCorpus.sourceRevision}:${cityCorpus.policyRevision}`
  : `${corpus.sourceRevision}:capital-fallback`
const seed = hash(
  `geo:${publicationDate}:${GENERATOR_VERSION}:${sourceSeedRevision}:${RULES_VERSION}`,
)

const countriesForRound = (roundType: RoundType): Country[] => {
  const countries = DIFFICULTIES.flatMap((difficulty) =>
    sortByHash(
      corpus.countries.filter(
        (country) =>
          country.status === 'active' &&
          country.eligibility[roundType] &&
          country.difficulty[roundType] === difficulty,
      ),
      (country) => country.code,
      `${seed}:source-order:${roundType}:${difficulty}`,
    ),
  )
  assert(countries.length >= 4, `${roundType} needs at least four countries`)
  return countries
}

const normalizedRegionKey = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z]+/gu, ' ')
    .trim()

const regionIdForCountry = (country: Country): string => {
  const explicitRegionId = mapRegions.countryRegions[country.code]
  if (explicitRegionId) return explicitRegionId
  const subregionId =
    SUBREGION_REGION_IDS[normalizedRegionKey(country.subregion)]
  if (subregionId) return subregionId
  const continentId = CONTINENT_REGION_IDS[country.continent]
  assert(
    continentId,
    `${country.code} has no region mapping for ${country.subregion}`,
  )
  return continentId
}

const distractorCountries = (
  answer: Country,
  roundType: RoundType,
  pool: Country[],
  namespace: string,
  optionFor: (country: Country) => Option,
): Country[] => {
  const answerDifficulty = answer.difficulty[roundType]
  assert(answerDifficulty, `${answer.code} lacks ${roundType} difficulty`)
  const candidates = [...pool]
    .filter((candidate) => candidate.code !== answer.code)
    .sort((left, right) => {
      const leftDifficulty = left.difficulty[roundType]
      const rightDifficulty = right.difficulty[roundType]
      assert(leftDifficulty, `${left.code} lacks ${roundType} difficulty`)
      assert(rightDifficulty, `${right.code} lacks ${roundType} difficulty`)
      const leftDifference = Math.abs(leftDifficulty - answerDifficulty)
      const rightDifference = Math.abs(rightDifficulty - answerDifficulty)
      const leftSameContinent = left.continent === answer.continent ? 0 : 1
      const rightSameContinent = right.continent === answer.continent ? 0 : 1
      return (
        leftDifference - rightDifference ||
        leftSameContinent - rightSameContinent ||
        hash(`${namespace}:${left.code}`).localeCompare(
          hash(`${namespace}:${right.code}`),
        )
      )
    })
  const usedLabels = new Set(
    (['en', 'es'] as Locale[]).map(
      (locale) =>
        `${locale}:${optionFor(answer)
          .label[locale].normalize('NFC')
          .toLocaleLowerCase(locale)}`,
    ),
  )
  const distractors: Country[] = []
  for (const candidate of candidates) {
    const option = optionFor(candidate)
    const labels = (['en', 'es'] as Locale[]).map(
      (locale) =>
        `${locale}:${option.label[locale]
          .normalize('NFC')
          .toLocaleLowerCase(locale)}`,
    )
    if (labels.some((label) => usedLabels.has(label))) continue
    for (const label of labels) usedLabels.add(label)
    distractors.push(candidate)
    if (distractors.length === 3) break
  }
  assert(
    distractors.length === 3,
    `${answer.code} lacks three unambiguous ${roundType} distractors`,
  )
  return distractors
}

const makeChoiceQuestion = (
  roundType: 'shape' | 'flag' | 'capital',
  country: Country,
  pool: Country[],
  questionIndex: number,
  choiceIndex: number,
): ChoiceQuestion => {
  const difficulty = country.difficulty[roundType]
  assert(difficulty, `${country.code} lacks ${roundType} difficulty`)
  const questionId = `${roundType}-${String(questionIndex + 1).padStart(2, '0')}`
  const namespace = `${seed}:${questionId}:distractors`
  const optionFor = roundType === 'capital' ? capitalOption : countryOption
  const distractors = distractorCountries(
    country,
    roundType,
    pool,
    namespace,
    optionFor,
  )
  const correctOption = optionFor(country)
  const distractorOptions = sortByHash(
    distractors.map(optionFor),
    (option) => option.id,
    `${seed}:${questionId}:option-order`,
  )
  const options = optionAt(correctOption, distractorOptions, choiceIndex % 4)
  assert(optionLabelsAreUnique(options), `${questionId} has ambiguous labels`)

  if (roundType === 'shape') {
    assert(country.assets.shapeUrl, `${country.code} lacks a shape asset`)
    return {
      id: questionId,
      type: 'shape',
      countryCode: country.code,
      difficulty,
      prompt: {
        en: 'Identify the country from its silhouette.',
        es: 'Identifica el país por su silueta.',
      },
      assetUrl: country.assets.shapeUrl,
      options,
      correctOptionId: correctOption.id,
    }
  }

  if (roundType === 'flag') {
    assert(country.assets.flagUrl, `${country.code} lacks a flag asset`)
    return {
      id: questionId,
      type: 'flag',
      countryCode: country.code,
      difficulty,
      prompt: {
        en: 'Identify the country from its flag.',
        es: 'Identifica el país por su bandera.',
      },
      assetUrl: country.assets.flagUrl,
      options,
      correctOptionId: correctOption.id,
    }
  }

  return {
    id: questionId,
    type: 'capital',
    countryCode: country.code,
    difficulty,
    prompt: {
      en: `What is the capital of ${country.names.en}?`,
      es: `¿Cuál es la capital de ${country.names.es}?`,
    },
    options,
    correctOptionId: correctOption.id,
  }
}

const makeMapQuestion = (
  target: MapTarget,
  questionIndex: number,
): MapQuestion => {
  const { country, difficulty } = target
  const questionId = `map-${target.id}`
  const correctRegionId = regionIdForCountry(country)
  const correctRegion = regionLabels[correctRegionId]
  assert(correctRegion, `${country.code} references unknown region`)
  const distractorRegionIds = sortByHash(
    Object.keys(regionLabels).filter(
      (regionId) => regionId !== correctRegionId,
    ),
    (regionId) => regionId,
    `${seed}:${questionId}:regions`,
  ).slice(0, 3)
  const correctOption = {
    id: `region-${correctRegionId}`,
    label: correctRegion,
  }
  const regionOptions = optionAt(
    correctOption,
    distractorRegionIds.map((regionId) => ({
      id: `region-${regionId}`,
      label: regionLabels[regionId],
    })),
    questionIndex % 4,
  )
  assert(
    optionLabelsAreUnique(regionOptions),
    `${questionId} has ambiguous region labels`,
  )

  return {
    id: questionId,
    type: 'map',
    countryCode: country.code,
    difficulty,
    prompt: {
      en: `Locate ${target.names.en}.`,
      es: `Localiza ${target.names.es}.`,
    },
    answerCoordinate: {
      latitude: target.latitude,
      longitude: target.longitude,
    },
    regionOptions,
    correctRegionOptionId: correctOption.id,
  }
}

const mapTargetsForRound = (countries: Country[]): MapTarget[] => {
  if (!cityCorpus) {
    return countries.map((country) => ({
      id: `${country.code.toLocaleLowerCase('en')}-capital`,
      country,
      names: country.capital.names,
      latitude: country.capital.latitude,
      longitude: country.capital.longitude,
      difficulty: country.difficulty.map as Difficulty,
    }))
  }

  const eligibleCountryCodes = new Set(countries.map((country) => country.code))
  const seenGeonamesIds = new Set<number>()
  const targets = DIFFICULTIES.flatMap((difficulty) =>
    sortByHash(
      cityCorpus.cities
        .filter(
          (city) =>
            eligibleCountryCodes.has(city.countryCode) &&
            city.difficulty === difficulty,
        )
        .map((city): MapTarget => {
          assert(
            city.sourceRevision === cityCorpus.sourceRevision,
            `City ${city.geonamesId} uses a stale source revision`,
          )
          assert(
            !seenGeonamesIds.has(city.geonamesId),
            `City corpus repeats GeoNames ID ${city.geonamesId}`,
          )
          seenGeonamesIds.add(city.geonamesId)
          const country = countryByCode.get(city.countryCode)
          assert(country, `City ${city.geonamesId} references unknown country`)
          assert(
            Number.isFinite(city.latitude) &&
              city.latitude >= -90 &&
              city.latitude <= 90,
            `City ${city.geonamesId} has invalid latitude`,
          )
          assert(
            Number.isFinite(city.longitude) &&
              city.longitude >= -180 &&
              city.longitude <= 180,
            `City ${city.geonamesId} has invalid longitude`,
          )
          return {
            id: `${city.countryCode.toLocaleLowerCase('en')}-${city.geonamesId}`,
            country,
            names: city.names,
            latitude: city.latitude,
            longitude: city.longitude,
            difficulty: city.difficulty,
          }
        }),
      (target) => target.id,
      `${seed}:source-order:map-city:${difficulty}`,
    ),
  )

  const coveredCountryCodes = new Set(
    targets.map((target) => target.country.code),
  )
  for (const country of countries) {
    assert(
      coveredCountryCodes.has(country.code),
      `City corpus has no retained map location for ${country.code}`,
    )
  }
  assert(targets.length >= 4, 'Map round needs at least four retained cities')
  return targets
}

let choiceQuestionOffset = 0
const rounds: Round[] = ROUND_TYPES.map((roundType) => {
  const countries = countriesForRound(roundType)
  let questions: Question[]
  if (roundType === 'map') {
    questions = mapTargetsForRound(countries).map(makeMapQuestion)
  } else {
    questions = countries.map((country, questionIndex) =>
      makeChoiceQuestion(
        roundType,
        country,
        countries,
        questionIndex,
        choiceQuestionOffset + questionIndex,
      ),
    )
    choiceQuestionOffset += questions.length
  }
  return {
    id: `round-${roundType}`,
    type: roundType,
    questionLimitMs: QUESTION_LIMITS[roundType],
    roundLimitMs: ROUND_LIMIT_MS,
    questions,
  }
})

const challenge = {
  schemaVersion: 1,
  generatorVersion: GENERATOR_VERSION,
  rulesVersion: RULES_VERSION,
  id: `geo:${publicationDate}`,
  publicationDate,
  seed,
  sourceRevision: corpus.sourceRevision,
  cityOptions: buildCityAutocompleteOptions(cityCorpus.cities),
  rules: {
    choice: {
      min: 500,
      max: 1000,
    },
    streak: {
      step: 0.1,
      cap: 1.5,
    },
    mapBands: [
      { maxKm: 100, score: 1000 },
      { maxKm: 300, score: 800 },
      { maxKm: 750, score: 600 },
      { maxKm: 1500, score: 400 },
      { maxKm: 3000, score: 200 },
      { maxKm: 20040, score: 0 },
    ],
    feedbackMs: 500,
    roundSummaryMs: 3000,
  },
  rounds,
}

const output = stableJson(challenge)
if (checkOnly) {
  assert(
    existsSync(challengePath),
    `Missing ${relative(REPOSITORY_ROOT, challengePath)}`,
  )
  const committed = readFileSync(challengePath, 'utf8')
  assert(
    committed === output,
    `${relative(REPOSITORY_ROOT, challengePath)} is stale; run pnpm geo:generate`,
  )
  console.log(
    `Deterministic challenge matches ${relative(REPOSITORY_ROOT, challengePath)}`,
  )
} else {
  writeFileSync(challengePath, output)
  console.log(`Generated ${relative(REPOSITORY_ROOT, challengePath)}`)
}
console.log(
  rounds.map((round) => `${round.type}:${round.questions.length}`).join(' · '),
)
