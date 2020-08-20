import React from 'react'
import cn from 'classnames'
import memoize from 'memoize-one'
import Link, { LinkBack } from 'components/Link'
import { fetchPapers, Paper } from 'service/markdown/files'
import glitchCss from 'service/style/glitch.module.css'
import neonCss from 'service/style/neon.module.css'
import Meta from 'components/Meta'
import Shell from 'components/Shell'

export const PAPERS_DESC =
  "Highly curated content about JavaScript, web development, TypeScript, the Internet, patterns and, in general, technology. Not your usual blog. Favour valuable content over long and boring SEO-focused posts. Words are my own. It's dangerous to go unknowing, take some pills 💊"

const getTitleCss = memoize((_: string) => {
  return Math.random() < 0.9 ? neonCss.neon : glitchCss.glitch
})

const Papers: React.FC<{
  papers: Paper[]
}> = (props) => {
  return (
    <Shell
      title='Papers'
      className='w-full max-w-2xl px-4 pt-12 pb-20 mx-auto text-gray-200'
      description={`Personal blog by Rubén Sospedra. ${PAPERS_DESC}`}
      canonical='/papers'
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>

      <h1 className='text-4xl'>Papers</h1>
      <p className='pb-10'>{PAPERS_DESC}</p>

      <ul>
        {props.papers.map((paper) => (
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

export default Papers

export async function getStaticProps() {
  const papers = await fetchPapers()
  return {
    props: { papers },
  }
}
