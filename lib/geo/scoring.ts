import { clamp } from 'es-toolkit'
import type { GeoChallengeRules, MapDistanceBand } from './model'
import { nonNegativeFinite } from './numeric'

export const CHOICE_MIN_BASE_SCORE = 500
export const CHOICE_SPEED_BONUS = 500
export const STREAK_MULTIPLIER_STEP = 0.1
export const MAX_MULTIPLIER_STREAK = 5

export const DEFAULT_GEO_CHALLENGE_RULES: GeoChallengeRules = {
  choice: {
    min: CHOICE_MIN_BASE_SCORE,
    max: CHOICE_MIN_BASE_SCORE + CHOICE_SPEED_BONUS,
  },
  streak: {
    step: STREAK_MULTIPLIER_STEP,
    cap: 1 + MAX_MULTIPLIER_STREAK * STREAK_MULTIPLIER_STEP,
  },
  mapBands: [
    { maxKm: 100, score: 1000 },
    { maxKm: 300, score: 800 },
    { maxKm: 750, score: 600 },
    { maxKm: 1500, score: 400 },
    { maxKm: 3000, score: 200 },
    { maxKm: 20040, score: 0 },
  ],
  feedbackMs: 650,
  roundSummaryMs: 3000,
}

export type ScoringRules = Pick<
  GeoChallengeRules,
  'choice' | 'streak' | 'mapBands'
>

export interface ScoreBreakdown {
  baseScore: number
  streakMultiplier: number
  score: number
}

export interface ChoiceScoreInput {
  correct: boolean
  elapsedMs: number
  questionLimitMs: number
  correctStreak: number
  rules?: ScoringRules
}

export interface ChoiceScore extends ScoreBreakdown {
  elapsedMs: number
  remainingMs: number
  speedRatio: number
}

export interface MapBaseScore {
  baseScore: number
  distanceBand: Exclude<MapDistanceBand, 'expired'>
}

export const streakMultiplierFor = (
  correctStreak: number,
  rules: Pick<GeoChallengeRules, 'streak'> = DEFAULT_GEO_CHALLENGE_RULES,
) => {
  const normalizedStreak = Math.floor(nonNegativeFinite(correctStreak))
  const step = nonNegativeFinite(rules.streak.step)
  const cap = Math.max(1, nonNegativeFinite(rules.streak.cap))
  return Math.min(cap, 1 + normalizedStreak * step)
}

export const scoreChoiceAnswer = ({
  correct,
  elapsedMs,
  questionLimitMs,
  correctStreak,
  rules = DEFAULT_GEO_CHALLENGE_RULES,
}: ChoiceScoreInput): ChoiceScore => {
  const limit = nonNegativeFinite(questionLimitMs)
  const elapsed = Number.isFinite(elapsedMs)
    ? clamp(Math.max(0, elapsedMs), 0, limit)
    : limit
  const remainingMs = Math.max(0, limit - elapsed)
  const speedRatio = limit > 0 ? clamp(remainingMs / limit, 0, 1) : 0
  const streakMultiplier = streakMultiplierFor(correctStreak, rules)

  if (!correct) {
    return {
      elapsedMs: elapsed,
      remainingMs,
      speedRatio,
      baseScore: 0,
      streakMultiplier,
      score: 0,
    }
  }

  const minimum = nonNegativeFinite(rules.choice.min)
  const maximum = Math.max(minimum, nonNegativeFinite(rules.choice.max))
  const baseScore = minimum + Math.round((maximum - minimum) * speedRatio)

  return {
    elapsedMs: elapsed,
    remainingMs,
    speedRatio,
    baseScore,
    streakMultiplier,
    score: Math.round(baseScore * streakMultiplier),
  }
}

const MAP_DISTANCE_BANDS: Exclude<MapDistanceBand, 'expired' | 'miss'>[] = [
  'within-100',
  'within-300',
  'within-750',
  'within-1500',
  'within-3000',
]

export const mapBaseScoreForDistance = (
  distanceKm: number,
  rules: Pick<GeoChallengeRules, 'mapBands'> = DEFAULT_GEO_CHALLENGE_RULES,
): MapBaseScore => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return { baseScore: 0, distanceBand: 'miss' }
  }

  for (let index = 0; index < rules.mapBands.length; index += 1) {
    const band = rules.mapBands[index]
    if (
      Number.isFinite(band.maxKm) &&
      distanceKm <= band.maxKm &&
      Number.isFinite(band.score)
    ) {
      return {
        baseScore: Math.max(0, Math.round(band.score)),
        distanceBand:
          band.score > 0 ? (MAP_DISTANCE_BANDS[index] ?? 'miss') : 'miss',
      }
    }
  }

  return { baseScore: 0, distanceBand: 'miss' }
}

export const scoreMapAnswer = (
  distanceKm: number,
  correctStreak: number,
  rules: ScoringRules = DEFAULT_GEO_CHALLENGE_RULES,
): ScoreBreakdown & MapBaseScore => {
  const mapScore = mapBaseScoreForDistance(distanceKm, rules)
  const streakMultiplier = streakMultiplierFor(correctStreak, rules)

  return {
    ...mapScore,
    streakMultiplier,
    score: Math.round(mapScore.baseScore * streakMultiplier),
  }
}
