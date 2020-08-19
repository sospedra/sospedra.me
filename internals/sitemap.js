const { promises: fs } = require('fs')
const globby = require('globby')
const prettier = require('prettier')
const { join } = require('path')

const createSitemap = (pages) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${pages
    .map((p) =>
      p
        .replace('pages', '')
        .replace('.tsx', '')
        .replace('.mdx', '')
        .replace('/index', ''),
    )
    .map((p) => [
      `<url>`,
      `<loc>https://sospedra.me${p}</loc>`,
      `<changefreq>daily</changefreq>`,
      `<priority>0.7</priority>`,
      `</url>`,
    ])
    .flat()
    .join('\n')}
</urlset>`

;(async function sitemap() {
  const pages = await globby([
    'pages/**/*{.tsx,.mdx}',
    '!pages/_*{.tsx,.ts}',
    '!pages/api',
  ])
  const sitemap = createSitemap(pages)
  const file = prettier.format(sitemap, { parser: 'html' })

  await fs.writeFile(join(process.cwd(), 'public/sitemap.xml'), file)
})()
