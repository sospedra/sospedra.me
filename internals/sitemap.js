const fs = require('fs')
const { join } = require('path')
const { promisify } = require('util')

const readdir = promisify(fs.readdir)
const writeFile = promisify(fs.writeFile)

const createSitemapLOC = (pages) => [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`,
  pages.map((p) => [
    `<url>`,
    `<loc>https://sospedra.me/${p}</loc>`,
    `<changefreq>daily</changefreq>`,
    `<priority>0.7</priority>`,
    `</url>`,
  ]),
  `</urlset>`,
]

;(async () => {
  const root = join(process.cwd(), 'pages/papers')
  const pages = (await readdir(root, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => `papers/${dirent.name}`)
  const sitemap = createSitemapLOC(['', 'papers', 'about', ...pages])
  const file = sitemap.flat(Number.MAX_SAFE_INTEGER).join('')

  await writeFile(join(process.cwd(), 'public/sitemap.xml'), file)
})()
