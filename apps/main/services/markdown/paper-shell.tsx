import cn from 'clsx'
import type React from 'react'
import Meta from 'services/markdown/meta'
import RouteHeader from 'services/route-header'
import Shell from 'services/shell'
import Footer from './footer'
import css from './paper-shell.module.css'

const PaperShell: React.FC<{
  createdAt: string
  minutes: number
  slug: string
  title: string
  children: React.ReactNode
}> = (props) => {
  return (
    <Shell stage className={css.frame}>
      <div className={css.scanhead} aria-hidden='true' />
      <RouteHeader
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
        <div className={cn(css.markdown, css.paperMarkdown, 'mb-8')}>
          {props.children}
        </div>
      </article>
      <Footer slug={props.slug} />
    </Shell>
  )
}

export default PaperShell
