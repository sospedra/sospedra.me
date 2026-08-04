import {
  readJson,
  type StorageLike,
  type StorageLoadStatus,
  writeJson,
} from '../../services/storage.ts'
import type { GeoGameState } from './game-state'
import type {
  DailyGeoChallenge,
  GeoSettings,
  PersistedGeoRun,
  PersistedGeoStats,
} from './model'
import { roundTimeLimitMs } from './model'
import { geoSettingsSchema, geoStatsSchema, isAnswerResult } from './run-schema'
import { validatePersistedGeoRun } from './run-validation'

export { isAnswerResult, validatePersistedGeoRun }

type GeoLoadResult<T> = { status: StorageLoadStatus; value: T }

const GEO_SETTINGS_STORAGE_KEY = 'games:geo:v1:settings'
const GEO_STATS_STORAGE_KEY = 'games:geo:v1:stats'

const geoRunStorageKey = (publicationDate: string) =>
  `games:geo:v1:run:${publicationDate}`

export const DEFAULT_GEO_SETTINGS: GeoSettings = {
  schemaVersion: 1,
  sound: true,
  reducedMotion: false,
}

export const loadGeoSettings = (
  storage: StorageLike | null,
): GeoLoadResult<GeoSettings> => {
  const loaded = readJson(storage, GEO_SETTINGS_STORAGE_KEY)
  if (loaded.status !== 'ok') {
    return { status: loaded.status, value: { ...DEFAULT_GEO_SETTINGS } }
  }

  const parsed = geoSettingsSchema.safeParse(loaded.value)
  return parsed.success
    ? { status: 'ok', value: parsed.data }
    : { status: 'invalid', value: { ...DEFAULT_GEO_SETTINGS } }
}

export const saveGeoSettings = (
  storage: StorageLike | null,
  settings: GeoSettings,
) => writeJson(storage, GEO_SETTINGS_STORAGE_KEY, settings)

export const loadGeoStats = (
  storage: StorageLike | null,
): GeoLoadResult<PersistedGeoStats> => {
  const loaded = readJson(storage, GEO_STATS_STORAGE_KEY)
  if (loaded.status !== 'ok') {
    return {
      status: loaded.status,
      value: { schemaVersion: 1, runs: [] },
    }
  }

  const parsed = geoStatsSchema.safeParse(loaded.value)
  return parsed.success
    ? { status: 'ok', value: parsed.data }
    : { status: 'invalid', value: { schemaVersion: 1, runs: [] } }
}

export const saveGeoStats = (
  storage: StorageLike | null,
  stats: PersistedGeoStats,
) => writeJson(storage, GEO_STATS_STORAGE_KEY, stats)

export const serializeGeoRun = (
  state: GeoGameState,
): PersistedGeoRun | null => {
  if (!state.startedAt || state.runKind !== 'official') return null
  const round = state.challenge.rounds[state.roundIndex]
  const reachedRoundDeadline = Boolean(
    round && state.roundElapsedMs >= roundTimeLimitMs(round),
  )
  const roundCompleteByPhase =
    state.phase === 'round-summary' ||
    state.phase === 'between-rounds-paused' ||
    state.phase === 'completed'
  const roundComplete = roundCompleteByPhase || reachedRoundDeadline
  const feedbackPending =
    state.phase === 'feedback' ||
    ((state.phase === 'visibility-paused' || state.phase === 'countdown') &&
      state.visibilityReturnPhase === 'feedback')
  const answeredInRound = round
    ? state.answers.filter((answer) => answer.roundId === round.id).length
    : 0
  const timedOutWithUnanswered =
    reachedRoundDeadline && state.questionIndex === answeredInRound

  return {
    schemaVersion: 1,
    challengeId: state.challenge.id,
    rulesVersion: state.challenge.rulesVersion,
    status: state.phase === 'completed' ? 'completed' : 'started',
    roundIndex: state.roundIndex,
    questionIndex: state.questionIndex,
    answers: [...state.answers],
    score: state.score,
    currentStreak: timedOutWithUnanswered ? 0 : state.currentStreak,
    bestStreak: state.bestStreak,
    startedAt: state.startedAt,
    completedAt: state.completedAt ?? undefined,
    questionElapsedMs: state.questionElapsedMs,
    roundElapsedMs: state.roundElapsedMs,
    roundComplete,
    feedbackPending: !roundComplete && feedbackPending,
  }
}

export const loadGeoRun = (
  storage: StorageLike | null,
  challenge: DailyGeoChallenge,
): GeoLoadResult<PersistedGeoRun | null> => {
  const loaded = readJson(storage, geoRunStorageKey(challenge.publicationDate))
  if (loaded.status !== 'ok') {
    return { status: loaded.status, value: null }
  }

  const run = validatePersistedGeoRun(loaded.value, challenge)
  return run ? { status: 'ok', value: run } : { status: 'invalid', value: null }
}

export const saveGeoRun = (
  storage: StorageLike | null,
  publicationDate: string,
  run: PersistedGeoRun,
) => writeJson(storage, geoRunStorageKey(publicationDate), run)

export const removeGeoRun = (
  storage: StorageLike | null,
  publicationDate: string,
) => {
  if (!storage) return false

  try {
    storage.removeItem(geoRunStorageKey(publicationDate))
    return true
  } catch {
    return false
  }
}
