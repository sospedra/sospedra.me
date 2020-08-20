import React, { useEffect } from 'react'
import Shell from 'components/Shell'
import Meta from 'components/Meta'
import Link, { LinkBack } from 'components/Link'
import css from './paper.module.css'
import Footer from '../Footer'
import { Paper } from '../files'

const PaperShell: React.FC<Paper> = (props) => {
  useEffect(() => {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth',
    })
  }, [])

  return (
    <Shell
      canonical={`/papers/${props.slug}`}
      className='w-full max-w-2xl px-4 pt-12 pb-20 mx-auto text-gray-200'
      description={props.excerpt}
      image={props.og}
      title={props.title}
      keywords={props.categories}
    >
      <Link url='/papers'>
        <LinkBack>Papers</LinkBack>
      </Link>

      <article>
        <h1 className='font-serif text-4xl text-cyan-300'>{props.title}</h1>
        <Meta
          className='mt-2 mb-12'
          time={props.createdAt}
          update={props.updatedAt}
          minutes={props.minutes}
        />

        <div className={`${css['markdown']} mb-8`}>{props.children}</div>
      </article>
      <Footer slug={props.slug} />
    </Shell>
  )
}

export default PaperShell
