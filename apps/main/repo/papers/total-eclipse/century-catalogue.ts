import catalogue from './data/eclipses.json'
import {
  type CatalogueEntry,
  PAPER_ECLIPSE_DATE,
  toAtlas,
} from './eclipse-atlas.ts'

/** Shared by both century figures, so the catalogue is parsed once. */
export const ECLIPSES = toAtlas(catalogue as CatalogueEntry[])

export const PAPER_ID =
  ECLIPSES.find((eclipse) => eclipse.date === PAPER_ECLIPSE_DATE)?.id ?? null
