import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { DailyGeoChallenge, Difficulty, Question } from './model.ts'
import {
  deriveDailyChallenge,
  deriveRunChallenge,
  differentRunNonce,
  runChallengeSignature,
} from './run-variants.ts'

const challenge = JSON.parse(
  readFileSync(
    new URL('./fixtures/run-variants-challenge.json', import.meta.url),
    'utf8',
  ),
) as DailyGeoChallenge

const tierFor = (difficulty: Difficulty): number =>
  Math.min(4, Number(difficulty))

const RAMP_QUOTAS: Record<number, number> = {
  1: 8,
  2: 5,
  3: 3,
  4: Number.POSITIVE_INFINITY,
}

const assertAscendingRampDeck = (
  questions: readonly Question[],
  label: string,
): void => {
  const tiers = questions.map((question) => tierFor(question.difficulty))
  for (let index = 1; index < tiers.length; index += 1) {
    assert.ok(
      tiers[index] >= tiers[index - 1],
      `${label}: tier ${tiers[index]} follows ${tiers[index - 1]} at ${index}`,
    )
  }
  for (const tier of [1, 2, 3]) {
    const count = tiers.filter((value) => value === tier).length
    assert.ok(
      count <= RAMP_QUOTAS[tier],
      `${label}: tier ${tier} exceeds its ramp quota with ${count} prompts`,
    )
  }
}

const countrySetKey = (
  questions: DailyGeoChallenge['rounds'][number]['questions'],
): string =>
  questions
    .map((question) => question.countryCode ?? question.id)
    .sort()
    .join('|')

const rampDifficulty = (index: number): Difficulty => {
  if (index < 8) return 1
  if (index < 12) return 2
  if (index < 20) return 3
  return 4
}

const expandedChallenge = (countryCount = 80): DailyGeoChallenge => ({
  ...structuredClone(challenge),
  id: 'expanded-country-pool',
  rounds: challenge.rounds.map((round) => ({
    ...structuredClone(round),
    questions: Array.from({ length: countryCount }, (_value, index) => {
      const template = structuredClone(
        round.questions[index % round.questions.length],
      ) as Question
      const countryCode = `X${String(index).padStart(3, '0')}`

      return {
        ...template,
        id: `${round.id}-${countryCode}`,
        countryCode,
        difficulty: rampDifficulty(index),
      }
    }),
  })),
})

const allCountryCodes = (value: DailyGeoChallenge): string[] =>
  value.rounds.flatMap((round) =>
    round.questions.map((question) => question.countryCode ?? question.id),
  )

test('derives the same full decks for the same nonce without mutating its source', () => {
  const source = expandedChallenge()
  const sourceSnapshot = structuredClone(source)
  const first = deriveRunChallenge(source, 7)
  const second = deriveRunChallenge(source, 7)

  assert.deepEqual(first, second)
  assert.deepEqual(source, sourceSnapshot)
  assert.notStrictEqual(first, source)
  assert.notStrictEqual(first.rules, source.rules)
  assert.notStrictEqual(first.rounds[0], source.rounds[0])
  assert.notStrictEqual(
    first.rounds[0].questions[0],
    source.rounds[0].questions[0],
  )
})

test('seeds the official queue by publication date', () => {
  const source = expandedChallenge()
  const first = deriveDailyChallenge(source)
  const second = deriveDailyChallenge(structuredClone(source))
  const nextDate = deriveDailyChallenge({
    ...structuredClone(source),
    publicationDate: '2026-07-28',
  })

  assert.deepEqual(first, second)
  assert.notDeepEqual(
    first.rounds.map((round) =>
      round.questions.map((question) => question.countryCode),
    ),
    nextDate.rounds.map((round) =>
      round.questions.map((question) => question.countryCode),
    ),
  )
})

test('keeps selected question facts while applying the ascending ramp', () => {
  const source = expandedChallenge()
  const variant = deriveRunChallenge(source, 0)

  assert.equal(variant.id, source.id)
  assert.deepEqual(variant.rules, source.rules)

  for (const [roundIndex, round] of variant.rounds.entries()) {
    const sourceRound = source.rounds[roundIndex]
    const sourceById = new Map(
      sourceRound.questions.map((question) => [question.id, question]),
    )

    assert.equal(round.id, sourceRound.id)
    assert.equal(round.questionLimitMs, sourceRound.questionLimitMs)
    assert.equal(round.roundLimitMs, sourceRound.roundLimitMs)
    assert.ok(round.questions.length >= 3)
    assertAscendingRampDeck(round.questions, round.id)

    for (const question of round.questions) {
      const sourceQuestion = sourceById.get(question.id)
      assert.ok(sourceQuestion)
      assert.deepEqual(question, sourceQuestion)
    }
  }
})

test('numeric nonces produce varied, country-disjoint hard section decks', () => {
  const source = expandedChallenge()
  const variants = Array.from({ length: 9 }, (_value, nonce) =>
    deriveRunChallenge(source, nonce),
  )

  for (const variant of variants) {
    const countries = allCountryCodes(variant)
    assert.equal(new Set(countries).size, countries.length)
    assert.ok(countries.length >= 60)
    assert.ok(variant.rounds.every((round) => round.questions.length >= 3))
  }

  for (const roundIndex of source.rounds.keys()) {
    const countrySets = variants.map((variant) =>
      countrySetKey(variant.rounds[roundIndex].questions),
    )
    assert.ok(
      new Set(countrySets).size >= 6,
      `round ${roundIndex + 1} did not vary enough across seeded runs`,
    )
  }

  for (let nonce = 1; nonce < variants.length; nonce += 1) {
    assert.notDeepEqual(
      variants[nonce - 1].rounds.map((round) => countrySetKey(round.questions)),
      variants[nonce].rounds.map((round) => countrySetKey(round.questions)),
    )
  }
})

test('never selects a country for more than one minigame', () => {
  const variant = deriveRunChallenge(challenge, 3)
  const sourceCountries = new Set(allCountryCodes(challenge))
  const usedCountries = new Set<string>()

  for (const round of variant.rounds) {
    for (const question of round.questions) {
      assert.ok(question.countryCode)
      assert.equal(usedCountries.has(question.countryCode), false)
      usedCountries.add(question.countryCode)
    }
  }
  assert.ok(usedCountries.size > 0)
  assert.ok([...usedCountries].every((code) => sourceCountries.has(code)))
})

test('partitions a fully overlapping source into disjoint ramp decks', () => {
  const sourceRound = challenge.rounds[0]
  const collisionChallenge: DailyGeoChallenge = {
    ...challenge,
    rounds: challenge.rounds.map(() => ({
      ...sourceRound,
      questions: sourceRound.questions.map((question) =>
        structuredClone(question),
      ),
    })),
  }
  const variant = deriveRunChallenge(collisionChallenge, 3)

  const selectedCountries = allCountryCodes(variant)
  assert.equal(new Set(selectedCountries).size, selectedCountries.length)
  for (const round of variant.rounds) {
    assertAscendingRampDeck(round.questions, round.id)
  }
})

test('accepts deterministic text seeds and validates numeric nonces', () => {
  assert.deepEqual(
    deriveRunChallenge(challenge, 'practice-alpha'),
    deriveRunChallenge(challenge, 'practice-alpha'),
  )
  assert.throws(
    () => deriveRunChallenge(challenge, Number.NaN),
    /Run nonce must be finite/u,
  )
})

test('keeps every deck ascending across many seeds', () => {
  const source = expandedChallenge()
  const selectedCountries = new Set<string>()

  for (let nonce = 0; nonce < 256; nonce += 1) {
    const variant = deriveRunChallenge(source, nonce)
    for (const country of allCountryCodes(variant)) {
      selectedCountries.add(country)
    }

    for (const round of variant.rounds) {
      assertAscendingRampDeck(round.questions, `nonce ${nonce} ${round.id}`)
    }
  }

  assert.deepEqual(selectedCountries, new Set(allCountryCodes(source)))
})

test('keeps all 194 roster countries reachable without breaking the ramp', () => {
  const sourceCountries = new Set(allCountryCodes(challenge))
  const selectedCountries = new Set<string>()

  for (let nonce = 0; nonce < 256; nonce += 1) {
    const variant = deriveRunChallenge(challenge, nonce)
    const runCountries = allCountryCodes(variant)
    assert.equal(new Set(runCountries).size, runCountries.length)

    for (const round of variant.rounds) {
      assertAscendingRampDeck(round.questions, `nonce ${nonce} ${round.id}`)

      for (const question of round.questions) {
        assert.ok(question.countryCode)
        selectedCountries.add(question.countryCode)
      }
    }
  }

  assert.deepEqual(selectedCountries, sourceCountries)
})

test('selects one seeded city prompt per country instead of repeating it', () => {
  const source = structuredClone(challenge)
  const mapRound = source.rounds.find((round) => round.type === 'map')
  assert.ok(mapRound)
  const template = structuredClone(mapRound.questions[0])
  mapRound.questions = [
    {
      ...structuredClone(template),
      id: 'map-XA-easy',
      countryCode: 'XA',
      difficulty: 1,
    },
    {
      ...structuredClone(template),
      id: 'map-XA-hard',
      countryCode: 'XA',
      difficulty: 4,
    },
    {
      ...structuredClone(template),
      id: 'map-XB-bridge',
      countryCode: 'XB',
      difficulty: 3,
    },
    {
      ...structuredClone(template),
      id: 'map-XB-hard',
      countryCode: 'XB',
      difficulty: 4,
    },
    {
      ...structuredClone(template),
      id: 'map-XD-medium',
      countryCode: 'XD',
      difficulty: 2,
    },
    {
      ...structuredClone(template),
      id: 'map-XD-hard',
      countryCode: 'XD',
      difficulty: 4,
    },
    ...Array.from({ length: 3 }, (_value, index) => ({
      ...structuredClone(template),
      id: `map-XC-city-${index}`,
      countryCode: 'XC',
      difficulty: 4 as const,
    })),
  ]
  source.rounds = [mapRound]

  const selectedIds = new Set<string>()
  for (let nonce = 0; nonce < 12; nonce += 1) {
    const variant = deriveRunChallenge(source, nonce)
    const selected: Question[] = variant.rounds
      .flatMap((round) => round.questions)
      .filter((question) => question.countryCode === 'XC')
    assert.equal(selected.length, 1)
    selectedIds.add(selected[0].id)
  }

  assert.ok(selectedIds.size > 1)
})

test('orders multi-prompt countries into the ramp without relabelling', () => {
  const source = structuredClone(challenge)
  const mapRound = source.rounds.find((round) => round.type === 'map')
  assert.ok(mapRound)
  const template = structuredClone(mapRound.questions[0])
  mapRound.questions = [
    {
      ...structuredClone(template),
      id: 'map-XA-easy',
      countryCode: 'XA',
      difficulty: 1,
    },
    {
      ...structuredClone(template),
      id: 'map-XA-hard',
      countryCode: 'XA',
      difficulty: 4,
    },
    {
      ...structuredClone(template),
      id: 'map-XC-medium',
      countryCode: 'XC',
      difficulty: 2,
    },
    {
      ...structuredClone(template),
      id: 'map-XC-hard',
      countryCode: 'XC',
      difficulty: 4,
    },
    {
      ...structuredClone(template),
      id: 'map-XB-bridge',
      countryCode: 'XB',
      difficulty: 3,
    },
    {
      ...structuredClone(template),
      id: 'map-XB-hard',
      countryCode: 'XB',
      difficulty: 4,
    },
  ]
  source.rounds = [mapRound]
  const sourceDifficultyById = new Map(
    mapRound.questions.map((question) => [question.id, question.difficulty]),
  )
  const selectedIds = new Set<string>()

  for (let nonce = 0; nonce < 256; nonce += 1) {
    const derived = deriveRunChallenge(source, `map-tier-${nonce}`)
    const questions = derived.rounds[0].questions
    const countries = questions.map((question) => question.countryCode)

    assert.equal(new Set(countries).size, countries.length)
    assertAscendingRampDeck(questions, `nonce ${nonce}`)
    for (const question of questions) {
      assert.equal(
        question.difficulty,
        sourceDifficultyById.get(question.id),
        `${question.id} was relabelled`,
      )
      selectedIds.add(question.id)
    }
  }

  assert.equal(selectedIds.size, mapRound.questions.length)
})

test('signatures capture the selected prompts and their order', () => {
  const source = expandedChallenge()
  const first = deriveRunChallenge(source, 'practice-first')
  const identical = deriveRunChallenge(source, 'practice-first')
  const signatures = new Set(
    Array.from({ length: 64 }, (_value, nonce) =>
      runChallengeSignature(deriveRunChallenge(source, `practice-${nonce}`)),
    ),
  )

  assert.equal(runChallengeSignature(first), runChallengeSignature(identical))
  assert.ok(signatures.size > 60)
})

test('rejects repeated practice signatures across many forced collisions', () => {
  const source = expandedChallenge()

  for (let nonce = 0; nonce < 128; nonce += 1) {
    const current = deriveRunChallenge(source, `practice-${nonce}`)
    const nextNonce = differentRunNonce(source, current, `practice-${nonce}`)
    const next = deriveRunChallenge(source, nextNonce)

    assert.notEqual(runChallengeSignature(next), runChallengeSignature(current))
  }
})
