import type { MetadataRoute } from 'next'
import { fetchPapers } from 'service/markdown/files'
import { SITE_URL } from 'service/site'

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
  '/videoclub',
  '/travel',
  '/uses',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const papers = await fetchPapers()
  const routes = [
    ...STATIC_ROUTES,
    ...papers.map((paper) => `/papers/${paper.slug}`),
  ]

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }))
}
