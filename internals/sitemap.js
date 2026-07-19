const { promises: fs } = require('fs')
const globby = require('globby')
const prettier = require('prettier')
const { join } = require('path')

const createSitemap = (routes) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${routes
    .map((route) => [
      `<url>`,
      `<loc>https://sospedra.me${route}</loc>`,
      `<changefreq>daily</changefreq>`,
      `<priority>0.7</priority>`,
      `</url>`,
    ])
    .flat()
    .join('\n')}
</urlset>`

;(async function sitemap() {
  const pages = await globby([
    'pages/**/*.tsx',
    '!pages/_*.tsx',
    '!pages/api',
    '!pages/**/\\[*',
  ])
  const papers = await globby(['content/papers/*/metadata.json'])
  const routes = [
    ...pages.map((page) =>
      page.replace('pages', '').replace('.tsx', '').replace('/index', ''),
    ),
    ...papers.map((paper) =>
      paper.replace('content/papers/', '/papers/').replace('/metadata.json', ''),
    ),
  ]
  const sitemap = createSitemap(routes)
  const file = prettier.format(sitemap, { parser: 'html' })

  await fs.writeFile(join(process.cwd(), 'public/sitemap.xml'), file)
})()
