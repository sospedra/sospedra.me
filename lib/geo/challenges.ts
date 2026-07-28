import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DailyGeoChallenge } from './model'
import {
  latestPublicationDateOnOrBefore,
  resolveGeoPublicationDate,
} from './publication-date'

const challengeDirectory = join(process.cwd(), 'content/geo/challenges')
const challengeFilenamePattern = /^\d{4}-\d{2}-\d{2}\.json$/u

const readChallenge = (filename: string): DailyGeoChallenge =>
  JSON.parse(
    readFileSync(join(challengeDirectory, filename), 'utf8'),
  ) as DailyGeoChallenge

export const GEO_CHALLENGES = readdirSync(challengeDirectory)
  .filter((filename) => challengeFilenamePattern.test(filename))
  .sort()
  .map(readChallenge)

if (GEO_CHALLENGES.length === 0) {
  throw new Error('Meridian challenge inventory is empty')
}

export const GEO_CHALLENGE_DATES = GEO_CHALLENGES.map(
  (item) => item.publicationDate,
)

export const getGeoChallenge = (publicationDate: string) =>
  GEO_CHALLENGES.find((item) => item.publicationDate === publicationDate) ??
  null

export const GEO_PUBLICATION_DATE = resolveGeoPublicationDate(
  process.env.MERIDIAN_PUBLICATION_DATE,
)

// A server started before UTC midnight outlives its generated edition; serve
// the newest earlier one instead of crashing the route until regeneration.
const currentDate = latestPublicationDateOnOrBefore(
  GEO_CHALLENGE_DATES,
  GEO_PUBLICATION_DATE,
)
const currentChallenge = currentDate ? getGeoChallenge(currentDate) : null
if (!currentChallenge) {
  throw new Error(
    `No Meridian challenge on or before ${GEO_PUBLICATION_DATE}. Run "pnpm geo:generate ${GEO_PUBLICATION_DATE}" before building.`,
  )
}
if (currentChallenge.publicationDate !== GEO_PUBLICATION_DATE) {
  console.warn(
    `Meridian is serving the ${currentChallenge.publicationDate} edition for ${GEO_PUBLICATION_DATE}. Run "pnpm geo:generate ${GEO_PUBLICATION_DATE}" to refresh it.`,
  )
}

export const CURRENT_GEO_CHALLENGE = currentChallenge
