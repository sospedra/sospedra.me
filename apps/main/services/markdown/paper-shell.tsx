import cn from 'clsx'
import type React from 'react'
import Meta from 'services/markdown/meta'
import RouteHeader from 'services/route-header'
import Shell from 'services/shell'
import Footer from './footer'
import HashLinks from './hash-links'
import { DEFAULT_LOCALE, type ReaderLocale } from './paper.locales.ts'
import PaperLangs from './paper-langs'
import css from './paper-shell.module.css'

const PaperShell: React.FC<{
  createdAt: string
  minutes: number
  slug: string
  title: string
  locale?: ReaderLocale
  children: React.ReactNode
}> = (props) => {
  const locale = props.locale ?? DEFAULT_LOCALE

  return (
    <Shell stage className={css.frame}>
      <div className={css.scanhead} aria-hidden='true' />
      <RouteHeader
        sector='02.1'
        status='Transmission open'
        title={props.title}
        description={
          <>
            <Meta
              className='mt-2'
              time={props.createdAt}
              minutes={props.minutes}
            />
            <PaperLangs slug={props.slug} locale={locale} />
          </>
        }
      />
      <article data-prose-signal='on' lang={locale}>
        <HashLinks />
        <div className={cn(css.markdown, css.paperMarkdown, 'mb-8')}>
          {props.children}
        </div>
      </article>
      <Footer slug={props.slug} locale={locale} />
    </Shell>
  )
}

export default PaperShell
