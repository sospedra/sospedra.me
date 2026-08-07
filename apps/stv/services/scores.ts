import { closest } from './levenshtein.ts'
import { normalize } from './normalize.ts'

export type Match = {
  hour: string
  live_minute: string
  local: string
  minute: string
  result: string
  visitor: string
}

export type Score = {
  matchtime: string | null
  result: string | null
}

const NO_SCORE: Score = { matchtime: null, result: null }

const SCORES_ENDPOINT = 'https://apiclient.besoccerapps.com/scripts/api/api.php'
const SCORES_KEY = 'ba0bfba154a751ca8eeb39fb5e31232c'
const DAY_IN_MS = 86_400_000

const MATCH_FIELDS = [
  'hour',
  'live_minute',
  'local',
  'minute',
  'result',
  'visitor',
] as const

const isMatch = (value: unknown): value is Match => {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return MATCH_FIELDS.every((field) => typeof record[field] === 'string')
}

const normalizeMatch = (match: Match): Match => {
  return {
    hour: normalize(match.hour),
    live_minute: normalize(match.live_minute),
    local: normalize(match.local),
    minute: normalize(match.minute),
    result: normalize(match.result),
    visitor: normalize(match.visitor),
  }
}

export const parseMatches = (payload: unknown): Match[] => {
  if (typeof payload !== 'object' || payload === null) return []
  const matches = (payload as Record<string, unknown>).matches
  if (!Array.isArray(matches)) return []
  return matches.filter(isMatch).map(normalizeMatch)
}

const scoresUrl = (day: string): string => {
  const url = new URL(SCORES_ENDPOINT)
  url.searchParams.set('format', 'json')
  url.searchParams.set('req', 'matchsday')
  url.searchParams.set('key', SCORES_KEY)
  url.searchParams.set('date', day)
  return url.toString()
}

const fetchScoresByDay = async (day: string): Promise<Match[]> => {
  const response = await fetch(scoresUrl(day))
  if (!response.ok) throw new Error(`besoccer answered ${response.status}`)
  return parseMatches(await response.json())
}

const isoDay = (unix: number): string => {
  return new Date(unix).toISOString().split('T')[0]
}

export const fetchScores = async (now: number): Promise<Match[]> => {
  const days = [isoDay(now), isoDay(now - DAY_IN_MS)]
  try {
    const matches = await Promise.all(days.map(fetchScoresByDay))
    return matches.flat()
  } catch {
    return []
  }
}

export const findScore = (
  matches: readonly Match[],
  query: { sport: string; teams: string; time: string },
): Score => {
  if (normalize(query.sport) !== 'futbol') return NO_SCORE
  const time = normalize(query.time)
  const candidates = matches.filter(
    (match) => time === `${match.hour}:${match.minute}`,
  )
  const byTeams = new Map(
    candidates.map((match) => [`${match.local}-${match.visitor}`, match]),
  )
  const key = closest(normalize(query.teams), [...byTeams.keys()])
  const match = key === undefined ? undefined : byTeams.get(key)
  if (match === undefined) return NO_SCORE
  return { matchtime: match.live_minute || null, result: match.result || null }
}
