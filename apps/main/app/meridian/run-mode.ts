import type { DailyGeoChallenge, RoundType } from './model'
import type { RunNonce } from './run-variants'

export type GeoGameMode = 'daily' | 'practice'

export type PracticeRound = 'all' | RoundType

export const PRACTICE_ROUNDS: PracticeRound[] = [
  'all',
  'shape',
  'flag',
  'capital',
  'map',
]

export const createSessionNonce = (
  fallback: RunNonce = 'practice',
): RunNonce => {
  if (typeof window === 'undefined') return fallback

  try {
    return window.crypto.randomUUID()
  } catch {
    // Older secure contexts may expose getRandomValues without randomUUID.
  }

  try {
    const values = new Uint32Array(4)
    window.crypto.getRandomValues(values)
    return [...values]
      .map((value) => value.toString(16).padStart(8, '0'))
      .join('')
  } catch {
    return `${String(fallback)}:${Date.now()}`
  }
}

export const practiceChallenge = (
  challenge: DailyGeoChallenge,
  practiceRound: PracticeRound,
): DailyGeoChallenge => {
  if (practiceRound === 'all') {
    return { ...challenge, id: `${challenge.id}:practice:all` }
  }
  return {
    ...challenge,
    id: `${challenge.id}:practice:${practiceRound}`,
    rounds: challenge.rounds.filter((round) => round.type === practiceRound),
  }
}
