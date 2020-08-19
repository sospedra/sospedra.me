const { promises: fs } = require('fs')
const globby = require('globby')
const { join } = require('path')

const createRSS = (metadata) => `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title><![CDATA[ Rubén Sospedra Papers ]]></title>
<link>https://sospedra.me</link>
<description><![CDATA[ Words are my own. It's dangerous to go unknowing, take some pills 💊 ]]></description>
<language>en-us</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${metadata
    .map(
      (meta) => `
    <item>
    <title><![CDATA[ ${meta.title} ]]></title>
    <pubDate>${new Date(meta.updatedAt).toUTCString()}</pubDate>
    <link>https://sospedra.me/papers/${meta.slug}</link>
    <guid isPermaLink="false">https://sospedra.me/papers/${meta.slug}</guid>
    <description>${encodeURIComponent(meta.excerpt)}</description>
    <content:encoded><div style="width: 100%; margin: 0 auto; max-width: 800px; padding: 40px 40px;"><p>${encodeURIComponent(
      meta.excerpt,
    )}</p></div></content:encoded>
    </item>
    `,
    )
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
