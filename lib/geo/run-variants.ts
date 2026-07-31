import { createRng, shuffleWith } from '../random.ts'
import type {
  DailyGeoChallenge,
  Difficulty,
  GeoChallengeRules,
  LocalizedOption,
  Question,
  Round,
} from './model.ts'

export type RunNonce = number | string

type DifficultyTier = 1 | 2 | 3 | 4

const DIFFICULTY_TIERS: DifficultyTier[] = [1, 2, 3, 4]

/**
 * How many prompts each easier tier contributes to a round deck. The ramp is
 * answer-indexed while the round is time-boxed, so fast play compresses it:
 * the runway must absorb a blitz. With 8-5-3 a fast player reaches tier 3
 * around question fourteen, near the end of a 60-second clock, and a casual
 * run never leaves the easy half. Tier 4 stays the uncapped tail.
 */
const RAMP_QUOTAS: Record<DifficultyTier, number> = {
  1: 8,
  2: 5,
  3: 3,
  4: Number.POSITIVE_INFINITY,
}

/**
 * Difficulty 5 existed in the first published pack. Folding it into tier 4
 * keeps old challenge files replayable while all newly generated content uses
 * the four-tier scale.
 */
const tierFor = (difficulty: Difficulty): DifficultyTier =>
  Math.min(4, Math.max(1, Number(difficulty))) as DifficultyTier

const nonceKey = (nonce: RunNonce): string => {
  if (typeof nonce === 'number') {
    if (!Number.isFinite(nonce)) {
      throw new RangeError('Run nonce must be finite')
    }

    return String(Math.trunc(nonce))
  }

  return nonce
}

const cloneOption = (option: LocalizedOption): LocalizedOption => ({
  ...option,
  label: { ...option.label },
})

const cloneQuestion = (question: Question): Question => {
  if (question.type === 'map') {
    return {
      ...question,
      prompt: { ...question.prompt },
      answerCoordinate: { ...question.answerCoordinate },
    }
  }

  return {
    ...question,
    prompt: { ...question.prompt },
    options: question.options.map(cloneOption),
  }
}

const cloneRules = (
  rules: GeoChallengeRules | undefined,
): GeoChallengeRules | undefined =>
  rules
    ? {
        ...rules,
        choice: { ...rules.choice },
        streak: { ...rules.streak },
        mapBands: rules.mapBands.map((band) => ({ ...band })),
      }
    : undefined

const seededOrder = <Value>(
  values: readonly Value[],
  namespace: string,
): Value[] => shuffleWith(createRng(namespace), values)

interface CountryQuestionGroup {
  countryKey: string
  roundIndex: number
  questions: Question[]
}

interface CountryQuestionPool {
  countryKey: string
  groups: CountryQuestionGroup[]
}

const countryKey = (question: Question, round: Round): string =>
  question.countryCode ?? `${round.id}:${question.id}`

const countryPoolsFor = (
  challenge: DailyGeoChallenge,
): CountryQuestionPool[] => {
  const pools = new Map<string, Map<number, Question[]>>()

  for (const [roundIndex, round] of challenge.rounds.entries()) {
    for (const question of round.questions) {
      const key = countryKey(question, round)
      const groups = pools.get(key) ?? new Map<number, Question[]>()
      const questions = groups.get(roundIndex) ?? []
      questions.push(question)
      groups.set(roundIndex, questions)
      pools.set(key, groups)
    }
  }

  return [...pools].map(([key, groups]) => ({
    countryKey: key,
    groups: [...groups].map(([roundIndex, questions]) => ({
      countryKey: key,
      roundIndex,
      questions,
    })),
  }))
}

/**
 * Countries constrained to fewer sections are placed first so the flexible
 * ones can even out the per-round counts afterwards.
 */
const assignCountryPools = (
  challenge: DailyGeoChallenge,
  pools: readonly CountryQuestionPool[],
  namespace: string,
): Map<string, number> => {
  const assignments = new Map<string, number>()
  const countryCounts = challenge.rounds.map(() => 0)
  const ordered = seededOrder(pools, `${namespace}:remaining-countries`).sort(
    (left, right) => left.groups.length - right.groups.length,
  )

  for (const pool of ordered) {
    const candidates = seededOrder(
      pool.groups,
      `${namespace}:country-${pool.countryKey}:sections`,
    ).sort(
      (left, right) =>
        countryCounts[left.roundIndex] - countryCounts[right.roundIndex],
    )
    const selected = candidates[0]
    if (!selected) continue
    assignments.set(pool.countryKey, selected.roundIndex)
    countryCounts[selected.roundIndex] += 1
  }

  return assignments
}

/**
 * Orders a deck as a strict ascending ramp: every tier-1 pick, then tier 2,
 * then tier 3, then the full tier-4 tail. Easier tiers are capped by
 * RAMP_QUOTAS and seeded, so the surplus easy prompts rotate across games.
 * Questions are never relabelled as harder.
 */
const orderRoundQuestions = (
  questions: readonly Question[],
  namespace: string,
): Question[] =>
  DIFFICULTY_TIERS.flatMap((tier) =>
    seededOrder(
      questions.filter((question) => tierFor(question.difficulty) === tier),
      `${namespace}:tier-${tier}`,
    ).slice(0, RAMP_QUOTAS[tier]),
  )

/**
 * Derives a persistence-safe runtime variant of a published challenge.
 *
 * Countries in the source pool are assigned to one eligible minigame, each
 * contributes one seeded prompt, and every round deck plays as an ascending
 * tier 1 → 4 ramp. Emitted country sets stay disjoint across minigames and no
 * prompt is disguised as a harder one.
 */
export const deriveRunChallenge = (
  challenge: DailyGeoChallenge,
  runNonce: RunNonce,
): DailyGeoChallenge => {
  const nonce = nonceKey(runNonce)
  const namespace = `${challenge.seed}:run-${nonce}`
  const pools = countryPoolsFor(challenge)
  const assignments = assignCountryPools(challenge, pools, namespace)
  const rounds = challenge.rounds.map((round, roundIndex) => ({
    ...round,
    questions: orderRoundQuestions(
      pools.flatMap((pool) => {
        if (assignments.get(pool.countryKey) !== roundIndex) return []
        const questions =
          pool.groups.find((group) => group.roundIndex === roundIndex)
            ?.questions ?? []
        const selected = seededOrder(
          questions,
          `${namespace}:round-${round.id}:country-${pool.countryKey}`,
        )[0]
        return selected ? [selected] : []
      }),
      `${namespace}:round-${round.id}`,
    ).map(cloneQuestion),
  }))

  return {
    ...challenge,
    rules: cloneRules(challenge.rules),
    rounds,
  }
}

/**
 * Derives the one official queue for a publication date. The date is an
 * explicit seed input so every player receives the same ordered questions.
 */
export const deriveDailyChallenge = (
  challenge: DailyGeoChallenge,
): DailyGeoChallenge =>
  deriveRunChallenge(challenge, `daily:${challenge.publicationDate}`)

export const runChallengeSignature = (challenge: DailyGeoChallenge): string =>
  challenge.rounds
    .map(
      (round) =>
        `${round.type}:${round.questions
          .map((question) => question.id)
          .join(',')}`,
    )
    .join('|')

/**
 * Rejects a nonce that reproduces the current practice game. The retry suffix
 * is deterministic so callers can start with a full-entropy browser UUID while
 * tests can force and verify the collision path.
 */
export const differentRunNonce = (
  challenge: DailyGeoChallenge,
  currentChallenge: DailyGeoChallenge,
  initialNonce: RunNonce,
): RunNonce => {
  const currentSignature = runChallengeSignature(currentChallenge)

  for (let attempt = 0; attempt < 4096; attempt += 1) {
    const candidate =
      attempt === 0 ? initialNonce : `${String(initialNonce)}:retry-${attempt}`
    const candidateChallenge = deriveRunChallenge(challenge, candidate)
    if (runChallengeSignature(candidateChallenge) !== currentSignature) {
      return candidate
    }
  }

  throw new RangeError('Practice challenge has no distinct seeded variant')
}
