import { isNotNil, sumBy } from 'es-toolkit'
import type { GeneratedCityRecord } from '../../app/meridian/corpus-model.ts'
import type {
  CountryRecord,
  DailyGeoChallenge,
  RoundType,
} from '../../app/meridian/model.ts'
import { GEO_ROUND_LIMIT_MS } from '../../app/meridian/model.ts'
import { deriveRunChallenge } from '../../app/meridian/run-variants.ts'
import {
  check,
  errors,
  isCoordinateWithin,
  isLocalizedText,
  normalizedLabel,
} from './lib-validate-core.ts'
import type {
  AssetManifest,
  Challenge,
  CountryCorpus,
} from './lib-validate-types.ts'

type ChallengeRound = Challenge['rounds'][number]
type ChallengeQuestion = ChallengeRound['questions'][number]
type ChallengeOption = NonNullable<ChallengeQuestion['options']>[number]

type RoundsValidationContext = {
  challenge: Challenge
  corpus: CountryCorpus
  manifest: AssetManifest
  countryByCode: Map<string, CountryRecord>
  cityByGeonamesId: Map<number, GeneratedCityRecord>
  eligibleCountriesByRound: Map<RoundType, Map<string, CountryRecord>>
  eligibleMapCityIds: Set<number>
  eligibleMapCities: GeneratedCityRecord[]
  expectedRoundTypes: readonly RoundType[]
  expectedRoundLimits: readonly number[]
  difficulties: readonly number[]
  questionIds: Set<string>
  roundIds: Set<string>
  distinctAnswerCountryCodes: Set<string>
  generatedMapCityIds: Set<number>
  correctPositions: number[]
}

type QuestionScope = {
  round: ChallengeRound
  question: ChallengeQuestion
  questionIndex: number
  label: string
  expectedCountries: Map<string, CountryRecord>
  answerCountryCodes: Set<string>
}

const asSentence = (name: string): string =>
  name.endsWith('.') ? name : `${name}.`

const nearlyEquals = (value: number | undefined, expected: number): boolean =>
  Math.abs((value ?? Number.NaN) - expected) < 0.000001

const setsEqual = <Value>(
  actual: ReadonlySet<Value>,
  expected: ReadonlySet<Value>,
): boolean =>
  actual.size === expected.size &&
  [...expected].every((value) => actual.has(value))

const optionCountryCode = (optionId: string): string => {
  const prefix = ['country-', 'capital-'].find((candidate) =>
    optionId.startsWith(candidate),
  )
  const bareCode = prefix ? optionId.slice(prefix.length) : optionId
  return bareCode.toLocaleUpperCase('en')
}

export const validateRounds = (context: RoundsValidationContext): void => {
  for (const [roundIndex, round] of context.challenge.rounds.entries()) {
    validateRound(context, round, roundIndex)
  }
  validateQuestionTotals(context)
  validateMapCoverage(context)
  validateCountryCoverage(context)
  validateChoiceBalance(context.correctPositions)
}

const validateRound = (
  context: RoundsValidationContext,
  round: ChallengeRound,
  roundIndex: number,
): void => {
  const expectedType = context.expectedRoundTypes[roundIndex]
  const expectedCountries =
    context.eligibleCountriesByRound.get(expectedType) ??
    new Map<string, CountryRecord>()
  check(
    round.type === expectedType,
    `Round ${roundIndex + 1} must be ${expectedType}`,
  )
  check(
    round.questionLimitMs === context.expectedRoundLimits[roundIndex],
    `${round.type} round has the wrong time limit`,
  )
  check(
    round.roundLimitMs === GEO_ROUND_LIMIT_MS,
    `${round.type} round must use the ${GEO_ROUND_LIMIT_MS} ms shared limit`,
  )
  check(!context.roundIds.has(round.id), `Duplicate round ID: ${round.id}`)
  context.roundIds.add(round.id)
  check(
    round.questions.length === expectedCountries.size,
    `${round.type} round must contain all ${expectedCountries.size} eligible source questions`,
  )
  const answerCountryCodes = new Set<string>()
  for (const [questionIndex, question] of round.questions.entries()) {
    validateQuestion(context, {
      round,
      question,
      questionIndex,
      label: `${round.type} question ${questionIndex + 1}`,
      expectedCountries,
      answerCountryCodes,
    })
  }
  validateRoundCoverage(context, round, expectedCountries)
}

const validateQuestion = (
  context: RoundsValidationContext,
  scope: QuestionScope,
): void => {
  validateQuestionIdentity(context, scope)
  const country = context.countryByCode.get(scope.question.countryCode)
  if (!country) {
    errors.push(
      `${scope.label} references unknown country ${scope.question.countryCode}`,
    )
    return
  }
  validateQuestionCountry(context, scope, country)
  if (scope.question.type === 'map') {
    validateMapQuestion(context, scope)
    return
  }
  validateChoiceQuestion(context, scope, country)
}

const validateQuestionIdentity = (
  context: RoundsValidationContext,
  scope: QuestionScope,
): void => {
  const { round, question, questionIndex, label, answerCountryCodes } = scope
  check(question.type === round.type, `${label} type must match its round`)
  check(
    !context.questionIds.has(question.id),
    `Duplicate question ID: ${question.id}`,
  )
  context.questionIds.add(question.id)
  check(
    context.difficulties.includes(question.difficulty),
    `${label} has an invalid difficulty`,
  )
  const previousDifficulty = round.questions[questionIndex - 1]?.difficulty ?? 0
  check(
    question.difficulty >= previousDifficulty,
    `${label} breaks the increasing difficulty curve`,
  )
  check(isLocalizedText(question.prompt), `${label} lacks an EN/ES prompt`)
  check(
    !answerCountryCodes.has(question.countryCode),
    `${round.type} repeats answer country ${question.countryCode}`,
  )
  answerCountryCodes.add(question.countryCode)
  context.distinctAnswerCountryCodes.add(question.countryCode)
}

const validateQuestionCountry = (
  context: RoundsValidationContext,
  scope: QuestionScope,
  country: CountryRecord,
): void => {
  const { round, question, label, expectedCountries } = scope
  check(country.status === 'active', `${question.countryCode} is not active`)
  check(
    country.sourceRevision === context.challenge.sourceRevision,
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
}

const MAP_QUESTION_ID = /^map-([a-z]{2})-(\d+)$/u

const validateMapQuestion = (
  context: RoundsValidationContext,
  scope: QuestionScope,
): void => {
  const { question, label } = scope
  const cityIdMatch = MAP_QUESTION_ID.exec(question.id)
  const cityId = Number(cityIdMatch?.[2])
  const city = context.cityByGeonamesId.get(cityId)
  check(Boolean(cityIdMatch), `${label} has an invalid city question ID`)
  check(
    cityIdMatch?.[1].toLocaleUpperCase('en') === question.countryCode,
    `${label} city question ID has the wrong country code`,
  )
  check(Boolean(city), `${label} references unknown city ${cityId}`)
  check(
    context.eligibleMapCityIds.has(cityId),
    `${label} city is outside the eligible map corpus`,
  )
  check(
    !context.generatedMapCityIds.has(cityId),
    `Map round repeats city ${cityId}`,
  )
  context.generatedMapCityIds.add(cityId)
  const coordinate = question.answerCoordinate
  check(
    isCoordinateWithin(coordinate?.latitude, 90),
    `${label} has an invalid latitude`,
  )
  check(
    isCoordinateWithin(coordinate?.longitude, 180),
    `${label} has an invalid longitude`,
  )
  if (city) validateMapCity(scope, city)
}

const validateMapCity = (
  scope: QuestionScope,
  city: GeneratedCityRecord,
): void => {
  const { question, label } = scope
  const coordinate = question.answerCoordinate
  check(
    city.countryCode === question.countryCode,
    `${label} city belongs to ${city.countryCode}`,
  )
  check(city.isCapital, `${label} must locate a capital city`)
  check(
    nearlyEquals(coordinate?.latitude, city.latitude) &&
      nearlyEquals(coordinate?.longitude, city.longitude),
    `${label} coordinates differ from the city corpus`,
  )
  check(
    question.prompt.en === `Locate ${asSentence(city.names.en)}` &&
      question.prompt.es === `Localiza ${asSentence(city.names.es)}`,
    `${label} prompt differs from the capital corpus`,
  )
}

const validateChoiceQuestion = (
  context: RoundsValidationContext,
  scope: QuestionScope,
  country: CountryRecord,
): void => {
  const options = scope.question.options ?? []
  validateOptionSet(scope, options)
  for (const option of options) validateOption(context, scope, option)
  validateCorrectOption(context, scope, country)
  validateQuestionAssets(context, scope, country)
  validateCapitalQuestion(scope, country)
}

const validateOptionSet = (
  scope: QuestionScope,
  options: readonly ChallengeOption[],
): void => {
  const { label } = scope
  check(options.length === 4, `${label} must contain four choices`)
  check(
    new Set(options.map(({ id }) => id)).size === options.length,
    `${label} has duplicate option IDs`,
  )
  for (const locale of ['en', 'es'] as const) {
    check(
      new Set(options.map((option) => normalizedLabel(option.label[locale])))
        .size === options.length,
      `${label} has duplicate ${locale} option labels`,
    )
  }
}

const validateOption = (
  context: RoundsValidationContext,
  scope: QuestionScope,
  option: ChallengeOption,
): void => {
  const { round, question, label } = scope
  check(
    isLocalizedText(option.label),
    `${label} option ${option.id} lacks EN/ES labels`,
  )
  const optionCountry = context.countryByCode.get(optionCountryCode(option.id))
  check(
    Boolean(optionCountry),
    `${label} option ${option.id} is absent from the source corpus`,
  )
  if (!optionCountry) return
  const expectedLabel =
    question.type === 'capital'
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

const validateCorrectOption = (
  context: RoundsValidationContext,
  scope: QuestionScope,
  country: CountryRecord,
): void => {
  const { question, label } = scope
  const options = question.options ?? []
  const correctIndex = options.findIndex(
    ({ id }) => id === question.correctOptionId,
  )
  check(correctIndex >= 0, `${label} correct option is missing`)
  if (correctIndex < 0) return
  context.correctPositions[correctIndex] += 1
  const expectedLabel =
    question.type === 'capital' ? country.capital.names : country.names
  check(
    options[correctIndex].label.en === expectedLabel.en &&
      options[correctIndex].label.es === expectedLabel.es,
    `${label} correct labels differ from the source corpus`,
  )
}

const validateQuestionAssets = (
  context: RoundsValidationContext,
  scope: QuestionScope,
  country: CountryRecord,
): void => {
  const { question, label } = scope
  if (question.type !== 'shape' && question.type !== 'flag') return
  const expected =
    question.type === 'shape'
      ? {
          url: country.assets.shapeUrl,
          manifestEntry: context.manifest.shapes[question.countryCode],
        }
      : {
          url: country.assets.flagUrl,
          manifestEntry: context.manifest.flags[question.countryCode],
        }
  check(
    question.assetUrl === expected.url &&
      question.assetUrl === expected.manifestEntry?.url,
    `${label} asset URL differs across challenge, corpus, and manifest`,
  )
}

const validateCapitalQuestion = (
  scope: QuestionScope,
  country: CountryRecord,
): void => {
  const { question, label } = scope
  if (question.type !== 'capital') return
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
    (question.options ?? []).every(({ id }) => id.startsWith('capital-')),
    `${label} options must all be capitals`,
  )
}

const validateRoundCoverage = (
  context: RoundsValidationContext,
  round: ChallengeRound,
  expectedCountries: Map<string, CountryRecord>,
): void => {
  const answerCountryCodes = new Set(
    round.questions.map((question) => question.countryCode),
  )
  check(
    setsEqual(answerCountryCodes, new Set(expectedCountries.keys())),
    `${round.type} round does not cover every eligible country`,
  )
  const seenDifficulties = new Set(
    round.questions.map((question) => question.difficulty),
  )
  check(
    seenDifficulties.size === context.difficulties.length &&
      context.difficulties.every((difficulty) =>
        seenDifficulties.has(difficulty),
      ),
    `${round.type} round must span all four difficulty levels`,
  )
  const continents = new Set(
    round.questions
      .map(
        (question) =>
          context.countryByCode.get(question.countryCode)?.continent,
      )
      .filter(isNotNil),
  )
  check(
    continents.size >= 5,
    `${round.type} round must represent at least five continents`,
  )
}

const validateQuestionTotals = (context: RoundsValidationContext): void => {
  const expectedQuestionCount = sumBy(
    context.expectedRoundTypes,
    (roundType) => context.eligibleCountriesByRound.get(roundType)?.size ?? 0,
  )
  check(
    context.questionIds.size === expectedQuestionCount,
    `Challenge must contain ${expectedQuestionCount} unique question IDs`,
  )
}

const validateMapCoverage = (context: RoundsValidationContext): void => {
  const expectedCapitalCityIds = new Set(
    context.eligibleMapCities
      .filter((city) => city.isCapital)
      .map((city) => city.geonamesId),
  )
  check(
    setsEqual(context.generatedMapCityIds, expectedCapitalCityIds),
    'Map round must locate every eligible capital exactly once',
  )
}

const validateCountryCoverage = (context: RoundsValidationContext): void => {
  const activeCountryCodes = new Set(
    context.corpus.countries
      .filter((country) => country.status === 'active')
      .map((country) => country.code),
  )
  check(
    [...activeCountryCodes].every((code) =>
      context.distinctAnswerCountryCodes.has(code),
    ),
    'Challenge must exercise every active country across its source sections',
  )
  check(
    activeCountryCodes.size >= 190,
    'Normalized corpus must contain the full playable country roster',
  )
}

const validateChoiceBalance = (correctPositions: readonly number[]): void => {
  check(
    Math.max(...correctPositions) - Math.min(...correctPositions) <= 1,
    `Correct choice positions are not balanced: ${correctPositions.join(', ')}`,
  )
}

type RuntimeRound = ReturnType<typeof deriveRunChallenge>['rounds'][number]

const isAscendingDifficulty = (round: RuntimeRound): boolean =>
  round.questions.every(
    (question, index) =>
      index === 0 ||
      question.difficulty >= round.questions[index - 1].difficulty,
  )

const hasDisjointCountrySections = (
  rounds: readonly RuntimeRound[],
): boolean => {
  const placements = rounds.flatMap((round) =>
    round.questions.map((question) => ({
      countryCode: question.countryCode,
      roundId: round.id,
    })),
  )
  if (placements.some((placement) => !placement.countryCode)) return false
  const roundByCountry = new Map(
    placements.map((placement) => [placement.countryCode, placement.roundId]),
  )
  return placements.every(
    (placement) =>
      roundByCountry.get(placement.countryCode) === placement.roundId,
  )
}

export const validateRuntimeSections = ({
  challenge,
}: {
  challenge: Challenge
}): void => {
  try {
    const runtimeChallenge = deriveRunChallenge(
      challenge as unknown as DailyGeoChallenge,
      0,
    )
    check(
      runtimeChallenge.rounds.every((round) => round.questions.length > 5),
      'Runtime sections must provide a timed question stream beyond five prompts',
    )
    check(
      hasDisjointCountrySections(runtimeChallenge.rounds),
      'Runtime sections must use completely disjoint country sets',
    )
    check(
      runtimeChallenge.rounds.every(isAscendingDifficulty),
      'Runtime sections must play as an ascending difficulty ramp',
    )
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    errors.push(`Runtime challenge derivation failed: ${reason}`)
  }
}
