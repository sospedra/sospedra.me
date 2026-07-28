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
    new URL('../../content/geo/challenges/2026-07-27.json', import.meta.url),
    'utf8',
  ),
) as DailyGeoChallenge

const tierFor = (difficulty: Difficulty): number =>
  Math.min(4, Number(difficulty))

const countrySetKey = (
  questions: DailyGeoChallenge['rounds'][number]['questions'],
): string =>
  questions
    .map((question) => question.countryCode ?? question.id)
    .sort()
    .join('|')

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
      const difficulty: Difficulty =
        index < 8 ? 1 : index < 12 ? 2 : index < 20 ? 3 : 4

      return {
        ...template,
        id: `${round.id}-${countryCode}`,
        countryCode,
        difficulty,
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

test('keeps selected question facts while applying the truthful fast ramp', () => {
  const source = expandedChallenge()
  const variant = deriveRunChallenge(source, 0)

  assert.equal(variant.id, source.id)
  assert.deepEqual(variant.rules, source.rules)

  for (const [roundIndex, round] of variant.rounds.entries()) {
    const sourceRound = source.rounds[roundIndex]
    const sourceById = new Map(
      sourceRound.questions.map((question) => [question.id, question]),
    )
    const difficulties = round.questions.map((question) =>
      tierFor(question.difficulty),
    )

    assert.equal(round.id, sourceRound.id)
    assert.equal(round.questionLimitMs, sourceRound.questionLimitMs)
    assert.equal(round.roundLimitMs, sourceRound.roundLimitMs)
    assert.ok(round.questions.length >= 3)
    assert.ok(difficulties[0] === 1 || difficulties[0] === 2)
    assert.deepEqual(difficulties.slice(1, 3), [3, 4])
    assert.ok(difficulties.slice(2).every((difficulty) => difficulty === 4))

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

test('partitions a fully overlapping source into disjoint strict-ramp decks', () => {
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
    assert.ok(
      round.questions[0].difficulty === 1 ||
        round.questions[0].difficulty === 2,
    )
    assert.equal(round.questions[1].difficulty, 3)
    assert.ok(
      round.questions.slice(2).every((question) => question.difficulty === 4),
    )
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

test('never drops below full difficulty after question three across many seeds', () => {
  const source = expandedChallenge()
  const selectedCountries = new Set<string>()
  const openerTiers = new Set<number>()

  for (let nonce = 0; nonce < 256; nonce += 1) {
    const variant = deriveRunChallenge(source, nonce)
    for (const country of allCountryCodes(variant)) {
      selectedCountries.add(country)
    }

    for (const round of variant.rounds) {
      const difficulties = round.questions.map((question) =>
        tierFor(question.difficulty),
      )
      openerTiers.add(difficulties[0])
      assert.ok(difficulties[0] === 1 || difficulties[0] === 2)
      assert.equal(difficulties[1], 3)
      assert.ok(difficulties.slice(2).every((difficulty) => difficulty === 4))
    }
  }

  assert.deepEqual(openerTiers, new Set([1, 2]))
  assert.deepEqual(selectedCountries, new Set(allCountryCodes(source)))
})

test('keeps all 194 roster countries reachable without breaking the ramp', () => {
  const sourceCountries = new Set(allCountryCodes(challenge))
  const selectedCountries = new Set<string>()
  const openerTiers = new Set<number>()

  for (let nonce = 0; nonce < 256; nonce += 1) {
    const variant = deriveRunChallenge(challenge, nonce)
    const runCountries = allCountryCodes(variant)
    assert.equal(new Set(runCountries).size, runCountries.length)

    for (const round of variant.rounds) {
      const difficulties = round.questions.map((question) =>
        tierFor(question.difficulty),
      )
      openerTiers.add(difficulties[0])
      assert.ok(difficulties[0] === 1 || difficulties[0] === 2)
      assert.equal(difficulties[1], 3)
      assert.ok(difficulties.slice(2).every((difficulty) => difficulty === 4))

      for (const question of round.questions) {
        assert.ok(question.countryCode)
        selectedCountries.add(question.countryCode)
      }
    }
  }

  assert.deepEqual(openerTiers, new Set([1, 2]))
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

test('preserves the source tier reserved for map opener and bridge cities', () => {
  const source = structuredClone(challenge)
  const mapRound = source.rounds.find((round) => round.type === 'map')
  assert.ok(mapRound)
  const openerTemplate = structuredClone(mapRound.questions[0])
  const bridgeTemplate = structuredClone(mapRound.questions[1])
  mapRound.questions = [
    {
      ...structuredClone(openerTemplate),
      id: 'map-XA-easy',
      countryCode: 'XA',
      difficulty: 1,
    },
    {
      ...structuredClone(openerTemplate),
      id: 'map-XA-hard',
      countryCode: 'XA',
      difficulty: 4,
    },
    {
      ...structuredClone(openerTemplate),
      id: 'map-XC-medium',
      countryCode: 'XC',
      difficulty: 2,
    },
    {
      ...structuredClone(openerTemplate),
      id: 'map-XC-hard',
      countryCode: 'XC',
      difficulty: 4,
    },
    {
      ...structuredClone(bridgeTemplate),
      id: 'map-XB-bridge',
      countryCode: 'XB',
      difficulty: 3,
    },
    {
      ...structuredClone(bridgeTemplate),
      id: 'map-XB-hard',
      countryCode: 'XB',
      difficulty: 4,
    },
  ]
  source.rounds = [mapRound]
  const sourceDifficultyById = new Map(
    mapRound.questions.map((question) => [question.id, question.difficulty]),
  )
  const openerTiers = new Set<number>()

  for (let nonce = 0; nonce < 256; nonce += 1) {
    const derived = deriveRunChallenge(source, `map-tier-${nonce}`)
    const questions = derived.rounds[0].questions
    const sourceDifficulties = questions.map((question) =>
      sourceDifficultyById.get(question.id),
    )
    openerTiers.add(questions[0].difficulty)

    assert.ok(questions[0].difficulty === 1 || questions[0].difficulty === 2)
    assert.equal(questions[1].difficulty, 3)
    assert.deepEqual(
      sourceDifficulties,
      questions.map(({ difficulty }) => difficulty),
    )
  }

  assert.deepEqual(openerTiers, new Set([1, 2]))
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
