import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fetchSpanishDailyPayload } from '../../app/crosswords/spanish-daily.server-fetcher.ts'
import {
  spanishChallengeFromPayload,
  withSpanishPuzzle,
} from '../../app/crosswords/spanish-daily.ts'

/* The feed serves only its latest puzzle, so each day gets one archive
   shot; the challenge file keeps it after the feed rolls over. */

const payload = await fetchSpanishDailyPayload().catch(() => null)
if (payload === null) {
  console.log('spanish daily: feed unavailable, nothing archived')
  process.exit(0)
}

const spanish = spanishChallengeFromPayload(payload)
if (!spanish) {
  console.log('spanish daily: feed answered without a valid puzzle')
  process.exit(0)
}

const target = join(
  'repo/crosswords/challenges',
  `${spanish.publicationDate}.json`,
)
const stored = await readFile(target, 'utf8').catch(() => null)
if (stored === null) {
  console.log(`spanish daily: no challenge file for ${spanish.publicationDate}`)
  process.exit(0)
}

const [merged] = withSpanishPuzzle([JSON.parse(stored)], spanish)
const next = `${JSON.stringify(merged, null, 2)}\n`
if (next === stored) {
  console.log(`spanish daily: ${spanish.publicationDate} already archived`)
  process.exit(0)
}

await writeFile(target, next)
console.log(`spanish daily: archived ${spanish.publicationDate}`)
