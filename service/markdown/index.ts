import unified from 'unified'
import parse from 'remark-parse'
import abbr from 'remark-abbr'
import external from 'remark-external-links'
import squeeze from 'remark-squeeze-paragraphs'
import terms from 'remark-terms'
import breaks from 'remark-breaks'
import slug from 'remark-slug'
import autolink from 'remark-autolink-headings'
import remark2rehype from 'remark-rehype'
import a11yEmoji from 'rehype-accessible-emojis'
import shiki from 'rehype-shiki'
import str from 'rehype-stringify'

export default async function markdownToReact(markdown: string) {
  const hast = await unified()
    .use(parse)
    .use(external)
    .use(abbr)
    .use(squeeze)
    .use(breaks)
    .use(terms, [
      {
        name: 'highlight',
        class: 'highlight',
        start: '{',
        end: '}',
      },
    ])
    .use(slug)
    .use(autolink)
    .use(remark2rehype)
    .use(a11yEmoji)
    .use(shiki, {
      theme: 'Material-Theme-Darker-High-Contrast',
    })
    .use(str)
    .process(markdown)

  return hast.toString()
}
