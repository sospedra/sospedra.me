import { escape as escapeXml } from 'es-toolkit'
import { cacheLife, cacheTag } from 'next/cache'
import { fetchPapers } from 'services/markdown/paper.server-snapshot'
import type { Paper } from 'services/markdown/paper.types'
import { SITE_URL } from 'services/site'

const createItem = (paper: Paper) => {
  const description = escapeXml(
    `<img src="${SITE_URL}${paper.og}" /><p>${paper.excerpt}</p>`,
  )
  const categories = paper.categories.map(
    (category) => `<category>${escapeXml(category)}</category>`,
  )

  return `
    <item>
    <title>${escapeXml(paper.title)}</title>
    <pubDate>${new Date(paper.updatedAt).toUTCString()}</pubDate>
    <link>${SITE_URL}/papers/${paper.slug}</link>
    <guid isPermaLink="false">${SITE_URL}/papers/${paper.slug}</guid>
    <description>${description}</description>
    ${categories.join('')}
    </item>
  `
}

const createRSS = (papers: Paper[]) => {
  const newestUpdate = papers
    .map((paper) => paper.updatedAt)
    .toSorted()
    .at(-1)
  const lastBuild = newestUpdate ? new Date(newestUpdate) : new Date(0)

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title>Rubén Sospedra papers</title>
<link>${SITE_URL}/rss.xml</link>
<image>
  <url>${SITE_URL}/sospedra.png</url>
  <title>Rubén Sospedra papers</title>
  <link>${SITE_URL}/rss.xml</link>
</image>
<description>${escapeXml("Highly curated content about JavaScript, clients development, the Internet, and occasionally, philosophy. Not your usual blog. Favour valuable content over long and boring SEO-focused posts. Words are my own. It's dangerous to go unknowing, take some pills 💊")}</description>
<language>en-us</language>
<copyright>Copyright ${lastBuild.getUTCFullYear()} Rubén Sospedra. The contents of this feed are available for non-commercial use only.</copyright>
<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
<lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
  ${papers.map(createItem).join('')}
</channel>
</rss>`
}

// the whole feed derives from committed content, so its dates do too
const buildFeed = async () => {
  'use cache'
  cacheLife('max')
  cacheTag('papers')
  const papers = await fetchPapers()
  return createRSS(papers)
}

export async function GET() {
  return new Response(await buildFeed(), {
    headers: { 'Content-Type': 'application/rss+xml' },
  })
}
