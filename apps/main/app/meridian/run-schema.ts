import * as z from 'zod/mini'
import type { AnswerResult } from './model'
import { isIsoDateTime } from './model'
import { isUtcPublicationDate } from './publication-date'

const nonEmptyString = z.string().check(z.minLength(1))
const finiteNonNegative = z.number().check(z.nonnegative())
const nonNegativeInt = z.int().check(z.nonnegative())
const isoDateTime = z.string().check(z.refine(isIsoDateTime))
const isoDate = z.string().check(z.refine(isUtcPublicationDate))

const geoCoordinateSchema = z.object({
  latitude: z.number().check(z.gte(-90), z.lte(90)),
  longitude: z.number().check(z.gte(-180), z.lte(180)),
})

const answerBaseShape = {
  questionId: nonEmptyString,
  roundId: nonEmptyString,
  roundType: z.enum(['shape', 'flag', 'capital', 'map']),
  attemptIndex: z.optional(nonNegativeInt),
  difficulty: z.literal([1, 2, 3, 4]),
  elapsedMs: finiteNonNegative,
  roundElapsedMs: z.optional(finiteNonNegative),
  questionLimitMs: finiteNonNegative,
  remainingMs: finiteNonNegative,
  correct: z.boolean(),
  expired: z.boolean(),
  skipped: z.optional(z.boolean()),
  baseScore: nonNegativeInt,
  streakBefore: nonNegativeInt,
  streakAfter: nonNegativeInt,
  streakMultiplier: finiteNonNegative,
  score: nonNegativeInt,
  answeredAt: isoDateTime,
}

const choiceAnswerSchema = z.object({
  ...answerBaseShape,
  kind: z.literal('choice'),
  selectedOptionId: z.nullable(nonEmptyString),
  correctOptionId: nonEmptyString,
  submittedText: z.optional(nonEmptyString),
})

const mapPinAnswerSchema = z.object({
  ...answerBaseShape,
  kind: z.literal('map-pin'),
  submittedCoordinate: z.nullable(geoCoordinateSchema),
  answerCoordinate: geoCoordinateSchema,
  distanceKm: z.nullable(finiteNonNegative),
  distanceBand: z.enum([
    'within-100',
    'within-300',
    'within-750',
    'within-1500',
    'within-3000',
    'miss',
    'expired',
  ]),
})

export const answerResultSchema = z
  .discriminatedUnion('kind', [choiceAnswerSchema, mapPinAnswerSchema])
  .check(
    z.refine((answer) => answer.remainingMs <= answer.questionLimitMs),
    z.refine((answer) => !(answer.expired && answer.skipped)),
  )

export const isAnswerResult = (value: unknown): value is AnswerResult =>
  answerResultSchema.safeParse(value).success

export const geoSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  sound: z.boolean(),
  reducedMotion: z.boolean(),
})

const officialRunRecordSchema = z
  .object({
    challengeId: nonEmptyString,
    publicationDate: isoDate,
    rulesVersion: nonEmptyString,
    completedAt: isoDateTime,
    totalScore: nonNegativeInt,
    correctAnswers: nonNegativeInt,
    totalQuestions: nonNegativeInt,
    bestStreak: nonNegativeInt,
  })
  .check(z.refine((record) => record.correctAnswers <= record.totalQuestions))

export const geoStatsSchema = z.object({
  schemaVersion: z.literal(1),
  runs: z.array(officialRunRecordSchema),
})

export const persistedGeoRunSchema = z
  .object({
    schemaVersion: z.literal(1),
    challengeId: z.string(),
    rulesVersion: z.string(),
    status: z.enum(['started', 'completed']),
    roundIndex: nonNegativeInt,
    questionIndex: nonNegativeInt,
    answers: z.array(answerResultSchema),
    score: nonNegativeInt,
    currentStreak: nonNegativeInt,
    bestStreak: nonNegativeInt,
    startedAt: isoDateTime,
    completedAt: z.optional(isoDateTime),
    questionElapsedMs: z.optional(finiteNonNegative),
    roundElapsedMs: z.optional(finiteNonNegative),
    roundComplete: z.optional(z.boolean()),
    feedbackPending: z.optional(z.boolean()),
  })
  .check(
    z.refine(
      (run) => !(run.roundComplete === true && run.feedbackPending === true),
    ),
  )
