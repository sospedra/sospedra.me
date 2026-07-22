import RouteHeader from 'components/RouteHeader'
import Shell from 'components/Shell'
import type { Metadata } from 'next'
import { REWRITE_DESC } from 'service/descriptions'
import { publicRewrites } from 'service/router'
import CopyButton from './copy-button'
import css from './rewrites.module.css'

export const metadata: Metadata = {
  title: 'Links',
  description: REWRITE_DESC,
  alternates: { canonical: '/r' },
}

export default function RewritesPage() {
  return (
    <Shell canonical='/r' className={css.page}>
      <RouteHeader
        title='Link shortener'
        sector='04.4'
        status='Routes resolved'
        description={`${REWRITE_DESC}. Activate a code and copy its short URL.`}
      />

      <section className={css.terminal} aria-labelledby='route-index-title'>
        <div className={css.terminalBar}>
          <strong id='route-index-title'>Route / Index</strong>
          <span>
            {publicRewrites.length} public route
            {publicRewrites.length === 1 ? '' : 's'}
          </span>
        </div>

        <ol className={css.rewrites}>
          {publicRewrites.map((rewrite) => (
            <li className={css.rewrite} key={rewrite.source}>
              <div className={css.field}>
                <span className={css.label}>Code</span>
                <CopyButton source={rewrite.source} />
              </div>

              <div className={css.field}>
                <span className={css.label}>Title</span>
                <span className={css.fieldValue}>{rewrite.title}</span>
              </div>

              <div className={`${css.field} ${css.destination}`}>
                <span className={css.label}>Destination</span>
                <a
                  className={css.destinationLink}
                  href={rewrite.destination}
                  rel='noopener noreferrer'
                  target='_blank'
                >
                  {rewrite.destination}
                  <span aria-hidden='true'> ↗</span>
                </a>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  )
}
