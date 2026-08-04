import { filter, pipe } from 'es-toolkit/fp'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u

const ascending = (values: readonly string[]) => values.toSorted()

export const isUtcPublicationDate = (value: string): boolean => {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

export const utcPublicationDate = (now = new Date()): string =>
  now.toISOString().slice(0, 10)

export const latestPublicationDateOnOrBefore = (
  dates: readonly string[],
  date: string,
): string | null =>
  pipe(
    dates,
    filter((candidate) => candidate <= date),
    ascending,
  ).at(-1) ?? null

export const resolveGeoPublicationDate = (
  configuredDate: string | undefined,
  now = new Date(),
): string => {
  const requested = configuredDate?.trim() || utcPublicationDate(now)
  if (!isUtcPublicationDate(requested)) {
    throw new RangeError(
      `MERIDIAN_PUBLICATION_DATE must use a real UTC date in YYYY-MM-DD form; received "${requested}"`,
    )
  }
  return requested
}
