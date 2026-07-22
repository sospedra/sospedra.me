import Meta from 'components/Meta'
import RouteHeader from 'components/RouteHeader'
import Shell from 'components/Shell'
import type React from 'react'
import Footer from '../Footer'
import type { Paper } from '../files'
import css from './paper.module.css'

const PaperShell: React.FC<Paper & { children: React.ReactNode }> = (props) => {
  return (
    <Shell
      stage
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
            minutes={props.minutes}
          />
        }
      />
      <article data-prose-signal='on'>
        <div className={`${css.markdown} ${css.regularMarkdown} mb-8`}>
          {props.children}
        </div>
      </article>
      <Footer slug={props.slug} />
    </Shell>
  )
}

export default PaperShell
