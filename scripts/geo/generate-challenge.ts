#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const GENERATOR_VERSION = '6.0.0'
const RULES_VERSION = 'geo-v7'
const ROUND_TYPES: RoundType[] = ['shape', 'flag', 'capital', 'map']
const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4]
const ROUND_LIMIT_MS = 60_000
const QUESTION_LIMITS: Record<RoundType, number> = {
  shape: 10_000,
  flag: 10_000,
  capital: 10_000,
  map: 15_000,
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

/* "Washington D.C." already ends the sentence; adding another dot reads wrong */
const withSentencePeriod = (name: string): string =>
  name.endsWith('.') ? name : `${name}.`

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
assert(cityCorpus, 'The retained city corpus is required')
assert(cityCorpus.schemaVersion === 1, 'Unsupported city-corpus schema')

const capitalCityByCountry = new Map<string, City>()
for (const city of cityCorpus.cities) {
  if (!city.isCapital) continue
  assert(
    !capitalCityByCountry.has(city.countryCode),
    `${city.countryCode} retains more than one capital city`,
  )
  capitalCityByCountry.set(city.countryCode, city)
}

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
const sourceSeedRevision = `${corpus.sourceRevision}:${cityCorpus.sourceRevision}:${cityCorpus.policyRevision}`
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

const makeMapQuestion = (target: MapTarget): MapQuestion => ({
  id: `map-${target.id}`,
  type: 'map',
  countryCode: target.country.code,
  difficulty: target.difficulty,
  prompt: {
    en: `Locate ${withSentencePeriod(target.names.en)}`,
    es: `Localiza ${withSentencePeriod(target.names.es)}`,
  },
  answerCoordinate: {
    latitude: target.latitude,
    longitude: target.longitude,
  },
})

/**
 * The map round locates capitals only. The wider retained-city corpus still
 * feeds the capital-round autocomplete lexicon. Locating a capital means
 * locating its country, so the prompt inherits the country map difficulty.
 */
const mapTargetsForRound = (countries: Country[]): MapTarget[] => {
  const targets = countries.map((country): MapTarget => {
    const capital = capitalCityByCountry.get(country.code)
    assert(capital, `${country.code} has no retained capital city`)
    assert(
      capital.sourceRevision === cityCorpus.sourceRevision,
      `Capital ${capital.geonamesId} uses a stale source revision`,
    )
    assert(
      Number.isFinite(capital.latitude) &&
        capital.latitude >= -90 &&
        capital.latitude <= 90 &&
        Number.isFinite(capital.longitude) &&
        capital.longitude >= -180 &&
        capital.longitude <= 180,
      `Capital ${capital.geonamesId} has invalid coordinates`,
    )
    const difficulty = country.difficulty.map
    assert(difficulty, `${country.code} lacks map difficulty`)
    return {
      id: `${country.code.toLocaleLowerCase('en')}-${capital.geonamesId}`,
      country,
      names: capital.names,
      latitude: capital.latitude,
      longitude: capital.longitude,
      difficulty,
    }
  })
  assert(targets.length >= 4, 'Map round needs at least four capital targets')
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
    wrongFeedbackMs: 2500,
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
  // Challenges are build artifacts now; a fresh checkout has no directory.
  mkdirSync(dirname(challengePath), { recursive: true })
  writeFileSync(challengePath, output)
  console.log(`Generated ${relative(REPOSITORY_ROOT, challengePath)}`)
}
console.log(
  rounds.map((round) => `${round.type}:${round.questions.length}`).join(' · '),
)
