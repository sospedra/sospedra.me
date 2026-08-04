import 'server-only'

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { filter, map, pipe } from 'es-toolkit/fp'
import { cacheLife, cacheTag } from 'next/cache'
import { serverEnv } from 'services/env.server'
import { createLogger } from 'services/logger'
import * as z from 'zod/mini'
import type { DailyGeoChallenge } from './model'
import {
  latestPublicationDateOnOrBefore,
  resolveGeoPublicationDate,
} from './publication-date'

const log = createLogger('meridian.challenges')
const challengeDirectory = join(process.cwd(), 'repo/geo/challenges')
const challengeFilenamePattern = /^\d{4}-\d{2}-\d{2}\.json$/u

const ascending = (values: readonly string[]) => values.toSorted()

export class GeoChallengeFileError extends Error {
  constructor(date: string) {
    super(`challenge file ${date}.json fails the shape check`)
    this.name = 'GeoChallengeFileError'
  }
}

/* Shape gate only. The deep contract runs in CI through
   scripts/geo/validate-challenge.ts before any file lands here. */
const challengeShapeSchema = z.object({
  publicationDate: z.string(),
  rounds: z
    .array(z.object({ questions: z.array(z.unknown()) }))
    .check(z.minLength(1)),
})

const isDailyGeoChallenge = (value: unknown): value is DailyGeoChallenge =>
  challengeShapeSchema.safeParse(value).success

/* Revalidation re-picks the newest published edition, so rollover needs no
   cron and no rebuild. Correctness needs cache expire (1 day) <= the window
   prebuild generates ahead (14 days). */
export async function loadCurrentGeoChallenge(): Promise<DailyGeoChallenge> {
  'use cache'
  cacheLife('hours')
  cacheTag('meridian')

  const dates = pipe(
    await readdir(challengeDirectory),
    filter((filename) => challengeFilenamePattern.test(filename)),
    map((filename) => filename.slice(0, 10)),
    ascending,
  )
  const today = resolveGeoPublicationDate(
    serverEnv.meridianPublicationDate ?? undefined,
  )
  const current = latestPublicationDateOnOrBefore(dates, today)
  if (!current) {
    throw new Error(
      `No Meridian challenge on or before ${today}. Run "pnpm cli geo:generate ${today}" first.`,
    )
  }
  if (current !== today) {
    log.warn(`serving the ${current} edition for ${today}`, {
      hint: 'regenerate the window to refresh it',
    })
  }
  const raw = await readFile(
    join(challengeDirectory, `${current}.json`),
    'utf8',
  )
  const challenge: unknown = JSON.parse(raw)
  if (!isDailyGeoChallenge(challenge)) throw new GeoChallengeFileError(current)
  return challenge
}
