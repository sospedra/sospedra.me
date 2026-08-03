import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cacheLife, cacheTag } from 'next/cache'
import { DAY_MS, utcDayString } from 'services/time'
import type { CrosswordChallengeFile } from './crossword-data'
import {
  type SpanishDailyChallenge,
  spanishChallengeFromPayload,
} from './spanish-daily'
import { fetchSpanishDailyPayload } from './spanish-daily.server-fetcher'

const CHALLENGES_DIR = join(process.cwd(), 'repo/crosswords/challenges')

/* Revalidation slides the window forward daily; no cron, no rebuild. The
   client picks by its own calendar from the shipped editions. Correctness
   needs expire (1 day) <= the horizon (+1 day) below. */
export async function loadRecentChallenges(): Promise<
  CrosswordChallengeFile[]
> {
  'use cache'
  cacheLife('hours')
  cacheTag('crosswords')

  const files = (await readdir(CHALLENGES_DIR))
    .filter((file) => file.endsWith('.json'))
    .sort()

  // The archive pre-generates years ahead; ship only editions up to the
  // render date plus one day so the newest published one is tomorrow's.
  const horizon = utcDayString(new Date(Date.now() + DAY_MS))
  const published = files.filter((file) => file.slice(0, 10) <= horizon)
  const picked = (published.length > 0 ? published : files).slice(-5)
  return Promise.all(
    picked.map(async (file) =>
      JSON.parse(await readFile(join(CHALLENGES_DIR, file), 'utf8')),
    ),
  )
}

/* The feed publishes one Spanish 13×13 per day. An invalid or missing
   edition caches as null and that day degrades to English-only. A failed
   fetch throws instead, so the miss verdict is never cached. */
export async function loadSpanishDaily(): Promise<SpanishDailyChallenge | null> {
  'use cache'
  cacheLife('hours')
  cacheTag('crosswords')
  return spanishChallengeFromPayload(await fetchSpanishDailyPayload())
}
