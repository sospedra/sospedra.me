import { maxBy } from 'es-toolkit'
import { Feed, type Item } from 'feed'
import { cacheLife, cacheTag } from 'next/cache'
import { fetchPapers } from 'services/markdown/paper.server-snapshot'
import type { Paper } from 'services/markdown/paper.types'
import { SITE_URL } from 'services/site'

const FEED_URL = `${SITE_URL}/rss.xml`

const itemFrom = (paper: Paper): Item => {
  const url = `${SITE_URL}/papers/${paper.slug}`
  return {
    title: paper.title,
    link: url,
    guid: url,
    date: new Date(paper.updatedAt),
    description: `<img src="${SITE_URL}${paper.og}" /><p>${paper.excerpt}</p>`,
    category: paper.categories.map((name) => ({ name })),
  }
}

const createRss = (papers: Paper[]): string => {
  const newest = maxBy(papers, (paper) => Date.parse(paper.updatedAt))
  const lastBuild = newest ? new Date(newest.updatedAt) : new Date(0)

  const feed = new Feed({
    title: 'Rubén Sospedra papers',
    description:
      "Highly curated content about JavaScript, clients development, the Internet, and occasionally, philosophy. Not your usual blog. Favour valuable content over long and boring SEO-focused posts. Words are my own. It's dangerous to go unknowing, take some pills 💊",
    link: FEED_URL,
    feed: FEED_URL,
    image: `${SITE_URL}/sospedra.png`,
    language: 'en-us',
    updated: lastBuild,
    copyright: `Copyright ${lastBuild.getUTCFullYear()} Rubén Sospedra. The contents of this feed are available for non-commercial use only.`,
    generator: false,
  })
  for (const paper of papers) feed.addItem(itemFrom(paper))
  return feed.rss2()
}

// the whole feed derives from committed content, so its dates do too
const buildFeed = async () => {
  'use cache'
  cacheLife('max')
  cacheTag('papers')
  const papers = await fetchPapers()
  return createRss(papers)
}

export async function GET() {
  return new Response(await buildFeed(), {
    headers: { 'Content-Type': 'application/rss+xml' },
  })
}
