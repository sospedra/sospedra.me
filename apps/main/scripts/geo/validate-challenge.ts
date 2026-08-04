#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import type { GeneratedCityCorpus } from '../../app/meridian/corpus-model.ts'
import type { CountryRecord } from '../../app/meridian/model.ts'
import { GEO_ROUND_LIMIT_MS } from '../../app/meridian/model.ts'
import { resolveGeoPublicationDate } from '../../app/meridian/publication-date.ts'
import { check, errors, REPOSITORY_ROOT } from './lib-validate-core.ts'
import { validateCorpusDocuments } from './lib-validate-corpus.ts'
import {
  validateGeneratedAssets,
  validateSourceLocks,
} from './lib-validate-file-integrity.ts'
import {
  validateRounds,
  validateRuntimeSections,
} from './lib-validate-rounds.ts'
import type {
  AssetManifest,
  Challenge,
  CityOverrides,
  CorpusSourceLock,
  CountryCorpus,
  GenerationApproval,
  SourceLock,
} from './lib-validate-types.ts'

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

const readJson = <Value>(path: string): Value => {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Value
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Cannot read ${relative(REPOSITORY_ROOT, path)}: ${reason}`)
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

const { cityByGeonamesId, eligibleMapCities, eligibleMapCityIds } =
  validateCorpusDocuments({
    challenge,
    corpus,
    cityCorpus,
    manifest,
    approval,
    sourceLock,
    corpusSourceLock,
    cityOverrides,
    countryByCode,
    eligibleCountriesByRound,
    expectedRoundTypes,
    difficulties,
  })
validateSourceLocks({ manifest, sourceLock, corpusSourceLock, approval })

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

validateRounds({
  challenge,
  corpus,
  manifest,
  countryByCode,
  cityByGeonamesId,
  eligibleCountriesByRound,
  eligibleMapCityIds,
  eligibleMapCities,
  expectedRoundTypes,
  expectedRoundLimits,
  difficulties,
  questionIds,
  roundIds,
  distinctAnswerCountryCodes,
  generatedMapCityIds,
  correctPositions,
})

validateRuntimeSections({ challenge })

validateGeneratedAssets({ manifest, corpus })

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
