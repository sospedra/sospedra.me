'use client'

import Link, { LinkBack } from 'components/Link'
import Meta from 'components/Meta'
import Shell from 'components/Shell'
import type React from 'react'
import { useEffect } from 'react'
import Footer from '../Footer'
import type { Paper } from '../files'
import css from './paper.module.css'

const PaperShell: React.FC<Paper & { children: React.ReactNode }> = (props) => {
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

        <div className={`${css.markdown} mb-8`}>{props.children}</div>
      </article>
      <Footer slug={props.slug} />
    </Shell>
  )
}

export default PaperShell
