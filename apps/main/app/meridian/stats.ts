import { maxBy, sumBy } from 'es-toolkit'
import { flatMap, pipe, uniq } from 'es-toolkit/fp'
import { DAY_MS } from 'services/time'
import type {
  AnswerResult,
  DailyGeoChallenge,
  OfficialGeoRunRecord,
  PersistedGeoStats,
  RoundType,
} from './model'
import { isUtcPublicationDate } from './publication-date'

export type RoundStatistics = {
  type: RoundType
  score: number
  correctAnswers: number
  totalQuestions: number
}

export type GeoRunStatistics = {
  totalScore: number
  correctAnswers: number
  totalQuestions: number
  accuracyPercentage: number
  bestCorrectStreak: number
  medianChoiceResponseMs: number | null
  medianMapErrorKm: number | null
  rounds: RoundStatistics[]
}

const median = (values: readonly number[]) => {
  if (values.length === 0) return null

  const sorted = [...values].sort((left, right) => left - right)
  const midpoint = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[midpoint]

  return (sorted[midpoint - 1] + sorted[midpoint]) / 2
}

export const calculateRunStatistics = (
  challenge: DailyGeoChallenge,
  answers: readonly AnswerResult[],
): GeoRunStatistics => {
  const publishedQuestionIds = new Set(
    challenge.rounds.flatMap((round) =>
      round.questions.map((question) => question.id),
    ),
  )
  const orderedAnswers = answers.filter((answer) =>
    publishedQuestionIds.has(answer.questionId),
  )
  const totalQuestions = orderedAnswers.length
  const correctAnswers = orderedAnswers.filter(
    (answer) => answer.correct,
  ).length
  let streak = 0
  let bestCorrectStreak = 0

  for (const answer of orderedAnswers) {
    streak = answer.correct ? streak + 1 : 0
    bestCorrectStreak = Math.max(bestCorrectStreak, streak)
  }

  const choiceResponseTimes = orderedAnswers.flatMap((answer) =>
    answer.roundType === 'map' ? [] : [answer.elapsedMs],
  )
  const mapErrors = orderedAnswers.flatMap((answer) =>
    answer.kind === 'map-pin' && answer.distanceKm !== null
      ? [answer.distanceKm]
      : [],
  )
  const rounds = challenge.rounds.map((round): RoundStatistics => {
    const roundAnswers = orderedAnswers.filter(
      (answer) => answer.roundId === round.id,
    )

    return {
      type: round.type,
      score: sumBy(roundAnswers, (answer) => answer.score),
      correctAnswers: roundAnswers.filter((answer) => answer.correct).length,
      totalQuestions: roundAnswers.length,
    }
  })

  return {
    totalScore: sumBy(orderedAnswers, (answer) => answer.score),
    correctAnswers,
    totalQuestions,
    accuracyPercentage:
      totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
    bestCorrectStreak,
    medianChoiceResponseMs: median(choiceResponseTimes),
    medianMapErrorKm: median(mapErrors),
    rounds,
  }
}

export const createOfficialRunRecord = ({
  answers,
  challenge,
  completedAt,
}: {
  answers: readonly AnswerResult[]
  challenge: DailyGeoChallenge
  completedAt: string
}): OfficialGeoRunRecord => {
  const statistics = calculateRunStatistics(challenge, answers)

  return {
    challengeId: challenge.id,
    publicationDate: challenge.publicationDate,
    rulesVersion: challenge.rulesVersion,
    completedAt,
    totalScore: statistics.totalScore,
    correctAnswers: statistics.correctAnswers,
    totalQuestions: statistics.totalQuestions,
    bestStreak: statistics.bestCorrectStreak,
  }
}

export const recordOfficialRun = (
  stats: PersistedGeoStats,
  run: OfficialGeoRunRecord,
): PersistedGeoStats => {
  if (stats.runs.some((existing) => existing.challengeId === run.challengeId)) {
    return stats
  }

  return {
    schemaVersion: 1,
    runs: [...stats.runs, run].sort((left, right) =>
      left.publicationDate.localeCompare(right.publicationDate),
    ),
  }
}

const utcDayNumber = (date: string) => {
  if (!isUtcPublicationDate(date)) return null
  const [year, month, day] = date.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS)
}

const playedDays = (run: OfficialGeoRunRecord): number[] => {
  const day = utcDayNumber(run.publicationDate)
  return day === null ? [] : [day]
}

const newestFirst = (days: readonly number[]) =>
  days.toSorted((left, right) => right - left)

export const calculateDailyPlayStreak = (
  runs: readonly OfficialGeoRunRecord[],
) => {
  const days = pipe(runs, flatMap(playedDays), uniq(), newestFirst)
  if (days.length === 0) return 0

  let streak = 1
  for (let index = 1; index < days.length; index += 1) {
    if (days[index - 1] - days[index] !== 1) break
    streak += 1
  }
  return streak
}

export const personalBestFor = (
  runs: readonly OfficialGeoRunRecord[],
  rulesVersion: string,
) =>
  maxBy(
    runs.filter((run) => run.rulesVersion === rulesVersion),
    (run) => run.totalScore,
  )?.totalScore ?? null
