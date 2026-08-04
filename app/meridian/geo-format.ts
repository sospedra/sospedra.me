import { DAY_MS } from 'services/time'
import type { GeoLocale, GeoMessages } from './geo-messages'
import type { DailyGeoChallenge, Round, RoundType } from './model'
import { roundTimeLimitMs } from './model'

export const LOW_TIME_THRESHOLD_MS = 10_000

export const formatScore = (score: number, locale: GeoLocale) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES').format(score)

export const formatDate = (date: string, locale: GeoLocale) =>
  new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
    weekday: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`))

export const formatDuration = (
  milliseconds: number | null,
  locale: GeoLocale,
) => {
  if (milliseconds === null) return '—'
  const seconds = milliseconds / 1000
  return `${new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(seconds)} s`
}

export const formatRoundClock = (remainingMs: number) => {
  const safeRemaining = Math.max(0, remainingMs)
  if (safeRemaining <= LOW_TIME_THRESHOLD_MS && safeRemaining > 0) {
    return `${Math.floor(safeRemaining / 1000)}.${Math.floor(
      (safeRemaining % 1000) / 100,
    )}`
  }

  const totalSeconds = Math.ceil(safeRemaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export const roundSeconds = (round: Round) =>
  Math.max(1, Math.round(roundTimeLimitMs(round) / 1000))

export const formatDistance = (
  kilometres: number | null,
  locale: GeoLocale,
) => {
  if (kilometres === null) return '—'
  return `${new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES', {
    maximumFractionDigits: 0,
  }).format(kilometres)} km`
}

export const challengeSequence = (challenge: DailyGeoChallenge) => {
  if (challenge.sequence) return challenge.sequence
  const date = new Date(`${challenge.publicationDate}T00:00:00Z`)
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  return Math.floor((date.getTime() - yearStart) / DAY_MS) + 1
}

export const roundName = (copy: GeoMessages, type: RoundType) => copy[type]

export const roundInstruction = (copy: GeoMessages, type: RoundType) => {
  if (type === 'shape') return copy.shapeInstruction
  if (type === 'flag') return copy.flagInstruction
  if (type === 'capital') return copy.capitalInstruction
  return copy.mapInstruction
}
