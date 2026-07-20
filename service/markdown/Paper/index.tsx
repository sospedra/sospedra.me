import Link, { LinkBack } from 'components/Link'
import Meta from 'components/Meta'
import RouteHeader from 'components/RouteHeader'
import Shell from 'components/Shell'
import type React from 'react'
import Footer from '../Footer'
import type { Paper } from '../files'
import css from './paper.module.css'

const PaperShell: React.FC<Paper & { children: React.ReactNode }> = (props) => {
  if (props.slug === 'scroll-60fps-animation') {
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

  return (
    <Shell
      canonical={`/papers/${props.slug}`}
      className={css.frame}
      description={props.excerpt}
      image={props.og}
      title={props.title}
      keywords={props.categories}
    >
      <div className={css.scanhead} aria-hidden='true' />
      <RouteHeader
        backHref='/papers'
        backLabel='Papers'
        sector='02.1'
        status='Transmission open'
        title={props.title}
        description={
          <Meta
            className='mt-2'
            time={props.createdAt}
            update={props.updatedAt}
            minutes={props.minutes}
          />
        }
      />
      <article>
        <div className={`${css.markdown} ${css.regularMarkdown} mb-8`}>
          {props.children}
        </div>
      </article>
      <Footer slug={props.slug} />
    </Shell>
  )
}

export default PaperShell
