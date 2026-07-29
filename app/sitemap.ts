import type { MetadataRoute } from 'next'
import { fetchPapers } from 'service/markdown/files'

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
    url: `https://sospedra.me${route}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }))
}
