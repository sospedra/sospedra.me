import { GetServerSideProps } from 'next'
import { getAllPosts } from 'service/api'

const createSitemap = (
  pages: string[],
) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${pages
    .map(
      (p) => `<url>
  <loc>https://sospedra.me${p}</loc>
  <changefreq>daily</changefreq>
  <priority>0.7</priority>
  </url>`,
    )
    .join('')}
</urlset>
`

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const allPosts = getAllPosts([
    'excerpt',
    'readingMinutes',
    'slug',
    'timeStamp',
    'title',
  ])

  res.setHeader('content-type', 'application/xml')
  res.write(
    createSitemap([
      '/',
      '/about',
      '/papers',
      ...allPosts.map(({ slug }) => `/papers/${slug}`),
    ]),
  )
  res.end()

  return { props: {} }
}

export default () => null
