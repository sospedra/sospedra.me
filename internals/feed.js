const { promises: fs } = require('fs')
const globby = require('globby')
const { join } = require('path')

const esc = (unsafe) =>
  unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const createRSS = (metadata) => `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title><![CDATA[Rubén Sospedra papers]]></title>
<link>https://sospedra.me/rss.xml</link>
<image>
  <url>https://sospedra.me/sospedra.png</url>
  <title>Rubén Sospedra papers</title>
  <link>https://sospedra.me/rss.xml</link>
</image>
<description><![CDATA[Highly curated content about JavaScript, web development, TypeScript, the Internet, patterns and, in general, technology. Not your usual blog. Favour valuable content over long and boring SEO-focused posts. Words are my own. It's dangerous to go unknowing, take some pills 💊]]></description>
<language>en-us</language>
<copyright>Copyright ${new Date().getFullYear()} Rubén Sospedra. The contents of this feed are available for non-commercial use only.</copyright>
<atom:link href="https://sospedra.me/rss.xml" rel="self" type="application/rss+xml" />
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${metadata
    .map((meta) => {
      const title = esc(meta.title)
      const excerpt = esc(meta.excerpt)
      const pubdate = new Date(meta.updatedAt).toUTCString()
      const categories = meta.categories.map(
        (category) => `<category>${category}</category>`,
      )

      return `
        <item>
        <title><![CDATA[${title}]]></title>
        <pubDate>${pubdate}</pubDate>
        <link>https://sospedra.me/papers/${meta.slug}</link>
        <guid isPermaLink="false">https://sospedra.me/papers/${meta.slug}</guid>
        <description>
          <![CDATA[
            <img src="https://sospedra.me/${meta.og}" />
            <p>${excerpt}</p>
          ]]>
        </description>
        ${categories.join('')}
        </item>
      `
    })
    .join('')}
</channel>
</rss>`

;(async function feed() {
  const pages = await globby(['pages/papers/**/metadata.json'])
  const metadata = await Promise.all(
    pages.map(async (p) => JSON.parse(await fs.readFile(p, 'utf-8'))),
  )
  const rss = createRSS(metadata)

  await fs.writeFile(join(process.cwd(), 'public/rss.xml'), rss)
})()
