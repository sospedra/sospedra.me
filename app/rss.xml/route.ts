import { escape as escapeHtml } from 'es-toolkit'
import { cacheLife } from 'next/cache'
import { fetchPapers, type Paper } from 'service/markdown/files'

const createItem = (meta: Paper) => {
  const title = escapeHtml(meta.title)
  const excerpt = escapeHtml(meta.excerpt)
  const pubdate = new Date(meta.updatedAt).toUTCString()
  const categories = meta.categories.map(
    (category) => `<category>${escapeHtml(category)}</category>`,
  )

  return `
    <item>
    <title><![CDATA[${title}]]></title>
    <pubDate>${pubdate}</pubDate>
    <link>https://sospedra.me/papers/${meta.slug}</link>
    <guid isPermaLink="false">https://sospedra.me/papers/${meta.slug}</guid>
    <description>
      <![CDATA[
        <img src="https://sospedra.me${meta.og}" />
        <p>${excerpt}</p>
      ]]>
    </description>
    ${categories.join('')}
    </item>
  `
}

const createRSS = (papers: Paper[]) => `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title><![CDATA[Rubén Sospedra papers]]></title>
<link>https://sospedra.me/rss.xml</link>
<image>
  <url>https://sospedra.me/sospedra.png</url>
  <title>Rubén Sospedra papers</title>
  <link>https://sospedra.me/rss.xml</link>
</image>
<description><![CDATA[Highly curated content about JavaScript, clients development, the Internet, and occasionally, philosophy. Not your usual blog. Favour valuable content over long and boring SEO-focused posts. Words are my own. It's dangerous to go unknowing, take some pills 💊]]></description>
<language>en-us</language>
<copyright>Copyright ${new Date().getFullYear()} Rubén Sospedra. The contents of this feed are available for non-commercial use only.</copyright>
<atom:link href="https://sospedra.me/rss.xml" rel="self" type="application/rss+xml" />
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${papers.map(createItem).join('')}
</channel>
</rss>`

// cached, so the feed and its build dates prerender into the shell
const buildFeed = async () => {
  'use cache'
  cacheLife('max')
  const papers = await fetchPapers()
  return createRSS(papers)
}

export async function GET() {
  return new Response(await buildFeed(), {
    headers: { 'Content-Type': 'application/rss+xml' },
  })
}
