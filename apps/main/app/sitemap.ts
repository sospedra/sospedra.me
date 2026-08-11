import type { MetadataRoute } from 'next'
import {
  DEFAULT_LOCALE,
  localesOf,
  paperPath,
  type ReaderLocale,
} from 'services/markdown/paper.locales'
import { fetchPapers } from 'services/markdown/paper.server-snapshot'
import type { Paper } from 'services/markdown/paper.types'
import { SITE_URL } from 'services/site'

const STATIC_ROUTES = [
  '',
  '/about',
  '/bazaar',
  '/boombox',
  '/camera',
  '/console',
  '/crosswords',
  '/game-of-life',
  '/games',
  '/w98',
  '/snake',
  '/manual',
  '/meridian',
  '/papers',
  '/rubiks',
  '/scavenger',
  '/videoclub',
  '/travel',
  '/uses',
]

const paperEntries = (paper: Paper): MetadataRoute.Sitemap => {
  const locales: ReaderLocale[] = [DEFAULT_LOCALE, ...localesOf(paper.slug)]
  const languages = Object.fromEntries(
    locales.map((locale) => [
      locale,
      `${SITE_URL}${paperPath(paper.slug, locale)}`,
    ]),
  )
  return locales.map((locale) => ({
    url: `${SITE_URL}${paperPath(paper.slug, locale)}`,
    lastModified: new Date(paper.updatedAt),
    alternates: { languages },
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const papers = await fetchPapers()

  return [
    ...STATIC_ROUTES.map((route) => ({ url: `${SITE_URL}${route}` })),
    ...papers.flatMap(paperEntries),
  ]
}
