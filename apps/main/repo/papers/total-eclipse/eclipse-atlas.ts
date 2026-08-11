/**
 * The century catalogue: 188 central solar eclipses between 1900 and 2028,
 * their center lines, and the saros series each one belongs to.
 *
 * Derived fields are computed once at load. `frames` answers the only question
 * the paper cares about: did this shadow visit you.
 */

export type EclipseKind = 'T' | 'A' | 'H'

export type CatalogueEntry = {
  d: string
  k: EclipseKind
  s: number
  p: [number, number][]
  /** Country codes the umbra reached, stamped by build-eclipse-catalogue.mts. */
  c: string[]
}

export type AtlasEclipse = {
  id: number
  date: string
  kind: EclipseKind
  saros: number
  path: [number, number][]
  /** Year plus a fraction, for the timeline and the saros views. */
  fraction: number
  year: number
  dayOfYear: number
  mid: [number, number]
  midLatitude: number
  /** Country codes the umbra reached. */
  countries: string[]
}

export const toAtlas = (catalogue: CatalogueEntry[]): AtlasEclipse[] =>
  catalogue.map((entry, id) => {
    const year = Number(entry.d.slice(0, 4))
    const month = Number(entry.d.slice(5, 7))
    const day = Number(entry.d.slice(8, 10))
    const fraction = year + (month - 1) / 12 + day / 365
    const mid = entry.p[Math.floor(entry.p.length / 2)]
    return {
      id,
      date: entry.d,
      kind: entry.k,
      saros: entry.s,
      path: entry.p,
      fraction,
      year,
      dayOfYear: (fraction % 1) * 365,
      mid,
      midLatitude: mid[1],
      countries: entry.c ?? [],
    }
  })

export const KIND_NAME: Record<EclipseKind, string> = {
  T: 'total',
  A: 'annular',
  H: 'hybrid',
}

/** Total takes the yellow signal: the paper's whole argument is that switch. */
export const KIND_COLOR: Record<EclipseKind, string> = {
  T: 'var(--color-signal-yellow, #ffea00)',
  A: 'var(--color-signal-cyan, #6df7ea)',
  H: 'var(--color-signal-pink, #f04bb8)',
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const MONTH_LABELS = MONTHS

export const formatEclipseDate = (date: string): string => {
  const [year, month, day] = date.split('-')
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`
}

export const bySarosSeries = (
  eclipses: AtlasEclipse[],
): [number, AtlasEclipse[]][] => {
  const groups = new Map<number, AtlasEclipse[]>()
  for (const eclipse of eclipses) {
    const list = groups.get(eclipse.saros)
    if (list) list.push(eclipse)
    else groups.set(eclipse.saros, [eclipse])
  }
  return [...groups.entries()].sort((left, right) => left[0] - right[0])
}

/** The series that carries this paper: 1900 and 2026 are the same eclipse. */
export const PAPER_SAROS = 126
export const PAPER_ECLIPSE_DATE = '2026-08-12'
export const CATALOGUE_FIRST_YEAR = 1900
export const CATALOGUE_LAST_YEAR = 2028
