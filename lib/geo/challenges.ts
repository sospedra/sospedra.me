import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cacheLife } from 'next/cache'
import type { DailyGeoChallenge } from './model'
import {
  latestPublicationDateOnOrBefore,
  resolveGeoPublicationDate,
} from './publication-date'

const challengeDirectory = join(process.cwd(), 'content/geo/challenges')
const challengeFilenamePattern = /^\d{4}-\d{2}-\d{2}\.json$/u

/* Revalidation re-picks the newest published edition, so rollover needs no
   cron and no rebuild. Correctness needs cache expire (1 day) <= the window
   prebuild generates ahead (14 days). */
export async function loadCurrentGeoChallenge(): Promise<DailyGeoChallenge> {
  'use cache'
  cacheLife('hours')

  const dates = (await readdir(challengeDirectory))
    .filter((filename) => challengeFilenamePattern.test(filename))
    .map((filename) => filename.slice(0, 10))
    .sort()
  const today = resolveGeoPublicationDate(process.env.MERIDIAN_PUBLICATION_DATE)
  const current = latestPublicationDateOnOrBefore(dates, today)
  if (!current) {
    throw new Error(
      `No Meridian challenge on or before ${today}. Run "pnpm geo:generate ${today}" first.`,
    )
  }
  if (current !== today) {
    console.warn(
      `Meridian is serving the ${current} edition for ${today}. Regenerate the window to refresh it.`,
    )
  }
  const raw = await readFile(
    join(challengeDirectory, `${current}.json`),
    'utf8',
  )
  return JSON.parse(raw) as DailyGeoChallenge
}
