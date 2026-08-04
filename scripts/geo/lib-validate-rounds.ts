import { isNotNil, sumBy } from 'es-toolkit'
import { filter, map, pipe } from 'es-toolkit/fp'
import type { GeneratedCityRecord } from '../../app/meridian/corpus-model.ts'
import type {
  CountryRecord,
  DailyGeoChallenge,
} from '../../app/meridian/model.ts'
import { GEO_ROUND_LIMIT_MS } from '../../app/meridian/model.ts'
import { deriveRunChallenge } from '../../app/meridian/run-variants.ts'
import {
  check,
  errors,
  isLocalizedText,
  normalizedLabel,
} from './lib-validate-core.ts'
import type {
  AssetManifest,
  Challenge,
  CountryCorpus,
} from './lib-validate-types.ts'

export const validateRounds = ({
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
}: {
  challenge: Challenge
  corpus: CountryCorpus
  manifest: AssetManifest
  countryByCode: Map<string, CountryRecord>
  cityByGeonamesId: Map<number, GeneratedCityRecord>
  eligibleCountriesByRound: Map<
    (typeof expectedRoundTypes)[number],
    Map<string, CountryRecord>
  >
  eligibleMapCityIds: Set<number>
  eligibleMapCities: GeneratedCityRecord[]
  expectedRoundTypes: readonly ('shape' | 'flag' | 'capital' | 'map')[]
  expectedRoundLimits: readonly number[]
  difficulties: readonly number[]
  questionIds: Set<string>
  roundIds: Set<string>
  distinctAnswerCountryCodes: Set<string>
  generatedMapCityIds: Set<number>
  correctPositions: number[]
}): void => {
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
        errors.push(
          `${label} references unknown country ${question.countryCode}`,
        )
        continue
      }
      check(
        country.status === 'active',
        `${question.countryCode} is not active`,
      )
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
            Math.abs((coordinate?.latitude ?? 999) - city.latitude) <
              0.000001 &&
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
          question.prompt.en ===
            `What is the capital of ${country.names.en}?` &&
            question.prompt.es ===
              `¿Cuál es la capital de ${country.names.es}?`,
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
    const continents = pipe(
      round.questions,
      map((question) => countryByCode.get(question.countryCode)?.continent),
      filter(isNotNil),
      (values) => new Set(values),
    )
    check(
      continents.size >= 5,
      `${round.type} round must represent at least five continents`,
    )
  }

  const expectedQuestionCount = sumBy(
    expectedRoundTypes,
    (roundType) => eligibleCountriesByRound.get(roundType)?.size ?? 0,
  )
  check(
    questionIds.size === expectedQuestionCount,
    `Challenge must contain ${expectedQuestionCount} unique question IDs`,
  )
  const expectedCapitalCityIds = pipe(
    eligibleMapCities,
    filter((city) => city.isCapital),
    map((city) => city.geonamesId),
    (ids) => new Set(ids),
  )
  check(
    generatedMapCityIds.size === expectedCapitalCityIds.size &&
      [...expectedCapitalCityIds].every((cityId) =>
        generatedMapCityIds.has(cityId),
      ),
    'Map round must locate every eligible capital exactly once',
  )
  const activeCountryCodes = pipe(
    corpus.countries,
    filter((country) => country.status === 'active'),
    map((country) => country.code),
    (codes) => new Set(codes),
  )
  check(
    [...activeCountryCodes].every((code) =>
      distinctAnswerCountryCodes.has(code),
    ),
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
}
