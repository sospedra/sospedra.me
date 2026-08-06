import type { MetadataRoute } from 'next'
import { fetchPapers } from 'services/markdown/paper.server-snapshot'
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const papers = await fetchPapers()

  return [
    ...STATIC_ROUTES.map((route) => ({ url: `${SITE_URL}${route}` })),
    ...papers.map((paper) => ({
      url: `${SITE_URL}/papers/${paper.slug}`,
      lastModified: new Date(paper.updatedAt),
    })),
  ]
}
