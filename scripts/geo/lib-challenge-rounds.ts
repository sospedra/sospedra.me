import { createHash } from 'node:crypto'
import type {
  GeneratedCityCorpus,
  GeneratedCityRecord,
} from '../../app/meridian/corpus-model.ts'
import type {
  ChoiceQuestion,
  CountryRecord,
  Difficulty,
  Locale,
  LocalizedOption,
  LocalizedText,
  MapQuestion,
  RoundType,
} from '../../app/meridian/model.ts'

export type CountryCorpus = {
  schemaVersion: number
  sourceRevision: string
  countries: CountryRecord[]
}

type MapTarget = {
  id: string
  country: CountryRecord
  names: LocalizedText
  latitude: number
  longitude: number
  difficulty: Difficulty
}

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4]

export const hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

export const sortByHash = <Value>(
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
  correct: LocalizedOption,
  distractors: LocalizedOption[],
  correctIndex: number,
): LocalizedOption[] => {
  const options = [...distractors]
  options.splice(correctIndex, 0, correct)
  return options
}

const countryOption = (country: CountryRecord): LocalizedOption => ({
  id: `country-${country.code.toLocaleLowerCase('en')}`,
  label: country.names,
})

const capitalOption = (country: CountryRecord): LocalizedOption => ({
  id: `capital-${country.code.toLocaleLowerCase('en')}`,
  label: country.capital.names,
})

/* "Washington D.C." already ends the sentence; adding another dot reads wrong */
const withSentencePeriod = (name: string): string =>
  name.endsWith('.') ? name : `${name}.`

const optionLabelsAreUnique = (options: LocalizedOption[]): boolean =>
  (['en', 'es'] as Locale[]).every(
    (locale) =>
      new Set(
        options.map((option) =>
          option.label[locale].normalize('NFC').toLocaleLowerCase(locale),
        ),
      ).size === options.length,
  )

export const assert: (
  condition: unknown,
  message: string,
) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message)
}

export const countriesForRound = (
  roundType: RoundType,
  corpus: CountryCorpus,
  seed: string,
): CountryRecord[] => {
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

export const distractorCountries = (
  answer: CountryRecord,
  roundType: RoundType,
  pool: CountryRecord[],
  namespace: string,
  optionFor: (country: CountryRecord) => LocalizedOption,
): CountryRecord[] => {
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
  const distractors: CountryRecord[] = []
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

export const makeChoiceQuestion = (
  seed: string,
  roundType: 'shape' | 'flag' | 'capital',
  country: CountryRecord,
  pool: CountryRecord[],
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

export const makeMapQuestion = (target: MapTarget): MapQuestion => ({
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
export const mapTargetsForRound = (
  countries: CountryRecord[],
  capitalCityByCountry: Map<string, GeneratedCityRecord>,
  cityCorpus: GeneratedCityCorpus,
): MapTarget[] => {
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
