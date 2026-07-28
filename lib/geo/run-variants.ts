import type {
  DailyGeoChallenge,
  Difficulty,
  GeoChallengeRules,
  LocalizedOption,
  MapQuestion,
  Question,
  Round,
} from './model.ts'

export type RunNonce = number | string

type DifficultyTier = 1 | 2 | 3 | 4

const DIFFICULTY_TIERS: DifficultyTier[] = [1, 2, 3, 4]

/**
 * Difficulty 5 existed in the first published pack. Folding it into tier 4
 * keeps old challenge files replayable while all newly generated content uses
 * the four-tier scale.
 */
const tierFor = (difficulty: Difficulty): DifficultyTier =>
  Math.min(4, Math.max(1, Number(difficulty))) as DifficultyTier

const hash32 = (value: string): number => {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

const createSeededRandom = (namespace: string): (() => number) => {
  let state = hash32(namespace) || 0x6d2b79f5

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000
  }
}

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
    const mapQuestion: MapQuestion = {
      ...question,
      prompt: { ...question.prompt },
      answerCoordinate: { ...question.answerCoordinate },
    }

    if (question.regionOptions) {
      mapQuestion.regionOptions = question.regionOptions.map(cloneOption)
    }
    if (question.regionAlternative) {
      mapQuestion.regionAlternative = {
        ...question.regionAlternative,
        options: question.regionAlternative.options.map(cloneOption),
      }
    }

    return mapQuestion
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
): Value[] => {
  const shuffled = [...values]
  const random = createSeededRandom(namespace)

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}

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

interface DifficultySlot {
  roundIndex: number
  tier: DifficultyTier
  candidates: string[]
}

interface CountryAssignment {
  roundIndex: number
  reservedTier?: DifficultySlot['tier']
}

/**
 * Finds country-disjoint opener and bridge assignments before the rest of the
 * deck is partitioned. The augmenting-path matching keeps every earlier slot
 * filled when a later slot can be satisfied without displacing it.
 */
const reserveFastRampCountries = (
  challenge: DailyGeoChallenge,
  pools: readonly CountryQuestionPool[],
  namespace: string,
): Map<string, CountryAssignment> => {
  const roundIndexes = challenge.rounds.map((_round, index) => index)
  const openerSlots = seededOrder(
    roundIndexes,
    `${namespace}:opener-rounds`,
  ).map((roundIndex): DifficultySlot => {
    const tier = seededOrder(
      [1, 2] as const,
      `${namespace}:round-${roundIndex}:opener-tier`,
    )[0]
    return {
      roundIndex,
      tier,
      candidates: seededOrder(
        pools
          .filter((pool) =>
            pool.groups.some(
              (group) =>
                group.roundIndex === roundIndex &&
                group.questions.some(
                  (question) => tierFor(question.difficulty) === tier,
                ),
            ),
          )
          .map((pool) => pool.countryKey),
        `${namespace}:tier-${tier}:round-${roundIndex}:countries`,
      ),
    }
  })
  const bridgeSlots = seededOrder(
    roundIndexes,
    `${namespace}:tier-3:rounds`,
  ).map(
    (roundIndex): DifficultySlot => ({
      roundIndex,
      tier: 3,
      candidates: seededOrder(
        pools
          .filter((pool) =>
            pool.groups.some(
              (group) =>
                group.roundIndex === roundIndex &&
                group.questions.some(
                  (question) => tierFor(question.difficulty) === 3,
                ),
            ),
          )
          .map((pool) => pool.countryKey),
        `${namespace}:tier-3:round-${roundIndex}:countries`,
      ),
    }),
  )
  const slots: DifficultySlot[] = [...openerSlots, ...bridgeSlots]

  const countryToSlot = new Map<string, number>()
  const slotToCountry = new Map<number, string>()

  const match = (slotIndex: number, visitedCountries: Set<string>): boolean => {
    const slot = slots[slotIndex]

    for (const key of slot.candidates) {
      if (visitedCountries.has(key)) continue
      visitedCountries.add(key)
      const previousSlot = countryToSlot.get(key)

      if (previousSlot === undefined || match(previousSlot, visitedCountries)) {
        countryToSlot.set(key, slotIndex)
        slotToCountry.set(slotIndex, key)
        return true
      }
    }

    return false
  }

  for (const slotIndex of slots.keys()) {
    match(slotIndex, new Set())
  }

  return new Map(
    [...slotToCountry].map(([slotIndex, key]) => [
      key,
      {
        roundIndex: slots[slotIndex].roundIndex,
        reservedTier: slots[slotIndex].tier,
      },
    ]),
  )
}

const assignCountryPools = (
  challenge: DailyGeoChallenge,
  pools: readonly CountryQuestionPool[],
  namespace: string,
): Map<string, CountryAssignment> => {
  const assignments = reserveFastRampCountries(challenge, pools, namespace)
  const countryCounts = challenge.rounds.map(() => 0)

  const recordAssignment = (pool: CountryQuestionPool, roundIndex: number) => {
    const group = pool.groups.find(
      (candidate) => candidate.roundIndex === roundIndex,
    )
    if (!group) {
      throw new RangeError('Country was assigned to an ineligible section')
    }
    countryCounts[roundIndex] += 1
  }

  for (const pool of pools) {
    const assignment = assignments.get(pool.countryKey)
    if (assignment) recordAssignment(pool, assignment.roundIndex)
  }

  const unassigned = seededOrder(
    pools.filter((pool) => !assignments.has(pool.countryKey)),
    `${namespace}:remaining-countries`,
  ).sort((left, right) => left.groups.length - right.groups.length)

  for (const pool of unassigned) {
    const candidates = seededOrder(
      pool.groups,
      `${namespace}:country-${pool.countryKey}:sections`,
    ).sort(
      (left, right) =>
        countryCounts[left.roundIndex] - countryCounts[right.roundIndex],
    )
    const selected = candidates[0]
    if (!selected) continue
    assignments.set(pool.countryKey, { roundIndex: selected.roundIndex })
    recordAssignment(pool, selected.roundIndex)
  }

  return assignments
}

/**
 * The player meets one genuinely approachable tier-1 or tier-2 prompt, one
 * genuine tier-3 bridge, then only full-difficulty material. The seeded opener
 * tier keeps both easier corpus bands reachable across games. Questions are
 * never relabelled as harder.
 */
const orderRoundQuestions = (
  questions: readonly Question[],
  namespace: string,
): Question[] => {
  const buckets = new Map<DifficultyTier, Question[]>(
    DIFFICULTY_TIERS.map((tier) => [
      tier,
      seededOrder(
        questions.filter((question) => tierFor(question.difficulty) === tier),
        `${namespace}:tier-${tier}`,
      ),
    ]),
  )
  const opener = buckets.get(1)?.shift() ?? buckets.get(2)?.shift()
  const bridge = buckets.get(3)?.shift()

  return [
    ...(opener ? [opener] : []),
    ...(bridge ? [bridge] : []),
    ...(buckets.get(4) ?? []),
  ]
}

/**
 * Derives a persistence-safe runtime variant of a published challenge.
 *
 * Countries in the source pool are assigned to one eligible minigame before
 * the strict easy → tier 3 → tier 4 difficulty curve is selected. Both easy
 * tiers are seeded into the opener across games; neither appears after it.
 * When a section offers several prompts for one country (for example retained
 * cities), the nonce selects one at the required tier. Emitted country sets
 * stay disjoint without disguising an easy prompt as hard.
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
        const assignment = assignments.get(pool.countryKey)
        if (assignment?.roundIndex !== roundIndex) return []
        const questions =
          pool.groups.find((group) => group.roundIndex === roundIndex)
            ?.questions ?? []
        const eligibleQuestions = assignment.reservedTier
          ? questions.filter(
              (question) =>
                tierFor(question.difficulty) === assignment.reservedTier,
            )
          : questions.filter((question) => tierFor(question.difficulty) === 4)
        const selected = seededOrder(
          eligibleQuestions,
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
