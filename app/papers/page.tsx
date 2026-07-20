import cn from 'clsx'
import Link from 'components/Link'
import Meta from 'components/Meta'
import RouteHeader from 'components/RouteHeader'
import Shell from 'components/Shell'
import { sum } from 'es-toolkit'
import type { Metadata, Route } from 'next'
import { PAPERS_DESC } from 'service/descriptions'
import { fetchPapers } from 'service/markdown/files'
import glitchCss from 'service/style/glitch.module.css'
import neonCss from 'service/style/neon.module.css'
import css from './papers.module.css'

export const metadata: Metadata = {
  title: 'Papers',
  description: `Personal blog by Rubén Sospedra. ${PAPERS_DESC}`,
  alternates: { canonical: '/papers' },
}

// deterministic per slug: Math.random() diverged between SSG html and hydration
const getTitleCss = (slug: string) => {
  const hash = sum([...slug].map((char) => char.charCodeAt(0)))
  return hash % 10 === 0 ? glitchCss.glitch : neonCss.neon
}

export default async function PapersPage() {
  const papers = await fetchPapers()

  return (
    <Shell canonical='/papers' className={css.frame}>
      <RouteHeader
        title='Papers'
        sector='02'
        status='Index locked'
        description={PAPERS_DESC}
      />

      <ul className={css.list}>
        {papers.map((paper) => (
          <li key={paper.slug}>
            <Link url={`/papers/${paper.slug}` as Route}>
              <h2
                data-text={paper.title}
                className={cn(css.paperTitle, getTitleCss(paper.slug))}
              >
                {paper.title}
              </h2>
            </Link>
            <Meta
              className='mb-2'
              time={paper.createdAt}
              minutes={paper.minutes}
            />
            <p>{paper.excerpt}</p>
          </li>
        ))}
      </ul>
    </Shell>
  )
}
