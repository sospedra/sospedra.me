import React from 'react'
import cn from 'classnames'
import Link, { LinkBack } from 'components/Link'
import { fetchPapers, Paper } from 'service/markdown/files'
import glitchCss from 'service/style/glitch.module.css'
import neonCss from 'service/style/neon.module.css'
import Meta from 'components/Meta'
import Shell from 'components/Shell'
import { PAPERS_DESC } from 'service/descriptions'

// deterministic per slug: Math.random() diverged between SSG html and hydration
const getTitleCss = (slug: string) => {
  const hash = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return hash % 10 === 0 ? glitchCss.glitch : neonCss.neon
}

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
