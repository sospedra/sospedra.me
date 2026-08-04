#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCityAutocompleteOptions } from '../../app/meridian/city-options.ts'
import type {
  GeneratedCityCorpus,
  GeneratedCityRecord,
} from '../../app/meridian/corpus-model.ts'
import type { Question, Round, RoundType } from '../../app/meridian/model.ts'
import {
  assert,
  type CountryCorpus,
  countriesForRound,
  hash,
  makeChoiceQuestion,
  makeMapQuestion,
  mapTargetsForRound,
} from './lib-challenge-rounds.ts'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '../..')
const CORPUS_PATH = join(REPOSITORY_ROOT, 'repo/geo/generated/countries.json')
const CITIES_PATH = join(REPOSITORY_ROOT, 'repo/geo/generated/cities.json')
const GENERATOR_VERSION = '6.0.0'
const RULES_VERSION = 'geo-v7'
const ROUND_TYPES: RoundType[] = ['shape', 'flag', 'capital', 'map']
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

const corpus = readJson<CountryCorpus>(CORPUS_PATH)
const cityCorpus = existsSync(CITIES_PATH)
  ? readJson<GeneratedCityCorpus>(CITIES_PATH)
  : null
assert(cityCorpus, 'The retained city corpus is required')
assert(cityCorpus.schemaVersion === 1, 'Unsupported city-corpus schema')

const capitalCityByCountry = new Map<string, GeneratedCityRecord>()
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
  'repo/geo/challenges',
  `${publicationDate}.json`,
)
const sourceSeedRevision = `${corpus.sourceRevision}:${cityCorpus.sourceRevision}:${cityCorpus.policyRevision}`
const seed = hash(
  `geo:${publicationDate}:${GENERATOR_VERSION}:${sourceSeedRevision}:${RULES_VERSION}`,
)

let choiceQuestionOffset = 0
const rounds: Round[] = ROUND_TYPES.map((roundType) => {
  const countries = countriesForRound(roundType, corpus, seed)
  let questions: Question[]
  if (roundType === 'map') {
    questions = mapTargetsForRound(
      countries,
      capitalCityByCountry,
      cityCorpus,
    ).map(makeMapQuestion)
  } else {
    questions = countries.map((country, questionIndex) =>
      makeChoiceQuestion(
        seed,
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
    `${relative(REPOSITORY_ROOT, challengePath)} is stale; run pnpm cli geo:generate`,
  )
  console.log(
    `Deterministic challenge matches ${relative(REPOSITORY_ROOT, challengePath)}`,
  )
} else {
  // challenges are build artifacts; a fresh checkout has no directory
  mkdirSync(dirname(challengePath), { recursive: true })
  writeFileSync(challengePath, output)
  console.log(`Generated ${relative(REPOSITORY_ROOT, challengePath)}`)
}
console.log(
  rounds.map((round) => `${round.type}:${round.questions.length}`).join(' · '),
)
