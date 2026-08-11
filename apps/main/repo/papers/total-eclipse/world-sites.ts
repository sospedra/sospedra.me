import { ECLIPSE_COUNTRIES, type EclipseSite } from './eclipse-countries.ts'

/** Every named site across the nine countries, for the world map layer. */
export const WORLD_SITES: EclipseSite[] = ECLIPSE_COUNTRIES.flatMap(
  (country) => country.sites,
)
