import type { Metadata } from 'next'
import cn from 'classnames'
import Link, { LinkBack } from 'components/Link'
import Meta from 'components/Meta'
import Shell from 'components/Shell'
import { fetchPapers } from 'service/markdown/files'
import { PAPERS_DESC } from 'service/descriptions'
import glitchCss from 'service/style/glitch.module.css'
import neonCss from 'service/style/neon.module.css'

export const metadata: Metadata = {
  title: 'Papers',
  description: `Personal blog by Rubén Sospedra. ${PAPERS_DESC}`,
  alternates: { canonical: '/papers' },
}

// deterministic per slug: Math.random() diverged between SSG html and hydration
const getTitleCss = (slug: string) => {
  const hash = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return hash % 10 === 0 ? glitchCss.glitch : neonCss.neon
}

export default async function PapersPage() {
  const papers = await fetchPapers()

  return (
    <Shell
      canonical='/papers'
      className='w-full max-w-2xl px-4 pt-12 pb-20 mx-auto text-gray-200'
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>

      <h1 className='text-4xl'>Papers</h1>
      <p className='pb-10'>{PAPERS_DESC}</p>

      <ul>
        {papers.map((paper) => (
          <li key={paper.slug} className='pt-2 pb-12'>
            <Link url={`/papers/${paper.slug}`}>
              <h2
                data-text={paper.title}
                className={cn('font-serif text-3xl', {
                  [getTitleCss(paper.slug)]: true,
                })}
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
