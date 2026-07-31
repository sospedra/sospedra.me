import ArrowNav from 'components/ArrowNav'
import Icon from 'components/Icon'
import Link from 'components/Link'
import { pizzaSlices, readingLabel } from 'components/Meta'
import RouteHeader from 'components/RouteHeader'
import Shell from 'components/Shell'
import type { Metadata, Route } from 'next'
import type React from 'react'
import { PAPERS_DESC } from 'service/descriptions'
import { fetchPapers, type Paper } from 'service/markdown/files'
import glitchCss from 'service/style/glitch.module.css'
import css from './papers.module.css'

export const metadata: Metadata = {
  title: 'Papers',
  description: `Personal blog by Rubén Sospedra. ${PAPERS_DESC}`,
  alternates: { canonical: '/papers' },
}

// the board is P202; every paper broadcasts on the pages after it
const FIRST_ROW_PAGE = 203

// fixed UTC: server html and client hydration must render the same date
const stampFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
})

const stamp = (iso: string) => stampFormat.format(new Date(iso)).toUpperCase()

function PizzaTime(props: { paper: Paper }) {
  const icons = pizzaSlices(props.paper.minutes)
  const label = readingLabel(props.paper.minutes)

  return (
    <span className={css.slices} role='img' title={label} aria-label={label}>
      {icons.map((name, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: identical static slices
        <Icon name={name} key={idx} />
      ))}
    </span>
  )
}

const FASTEXT_KEYS = [
  { color: 'var(--color-signal-cyan, #6df7ea)', label: 'Home', url: '/' },
  {
    color: 'var(--color-signal-pink-hot, #ff4fd8)',
    label: 'About',
    url: '/about',
  },
  { color: '#8a5cff', label: 'Bazaar', url: '/bazaar' },
  {
    color: 'var(--color-signal-yellow, #ffea00)',
    label: 'RSS',
    url: '/rss.xml',
  },
] satisfies Array<{ color: string; label: string; url: Route }>

function BroadcastRow(props: { paper: Paper; index: number }) {
  return (
    <li>
      <Link
        url={`/papers/${props.paper.slug}` as Route}
        className={glitchCss.legacyTrigger}
        data-arrow-item=''
        prefetchOnFocus={false}
      >
        <div className={css.rowLine}>
          <span className={css.pg}>P{FIRST_ROW_PAGE + props.index}</span>
          <h2
            aria-label={props.paper.title}
            data-text={props.paper.title}
            className={`${css.rowTitle} ${glitchCss.legacyGlitch}`}
          >
            {props.paper.title}
          </h2>
          <span className={css.leader} aria-hidden='true' />
          <span className={css.rowMeta}>
            <PizzaTime paper={props.paper} /> · {stamp(props.paper.createdAt)}
          </span>
        </div>
        <p className={css.rowExcerpt}>{props.paper.excerpt}</p>
      </Link>
    </li>
  )
}

export default async function PapersPage() {
  const papers = await fetchPapers()
  const [headline, ...archive] = papers

  return (
    <Shell className={css.frame}>
      <div className={css.receiver}>
        <RouteHeader
          className={css.routeHeader}
          title='Papers'
          sector='02'
          status='On air'
          description={PAPERS_DESC}
        >
          <div className={css.signalMeter} aria-hidden='true'>
            <span />
            <span />
            <span />
            <span />
            <span />
            <small>SYNC 05</small>
          </div>
        </RouteHeader>

        <section className={css.board} aria-label='Papers index'>
          <p className={css.band}>
            <span>P202</span>
            <span lang='ja' aria-hidden='true'>
              夜間放送
            </span>
            <span>{papers.length} FILES</span>
          </p>

          <Link
            url={`/papers/${headline.slug}` as Route}
            className={`${css.headline} ${glitchCss.trigger}`}
            data-arrow-item=''
            prefetchOnFocus={false}
          >
            <p className={css.headlineTag}>
              <span>
                <span className={css.blink} aria-hidden='true'>
                  ▓
                </span>{' '}
                LATEST TRANSMISSION
              </span>
              <span className={css.leader} aria-hidden='true' />
              <span className={css.rowMeta}>
                <PizzaTime paper={headline} /> · {stamp(headline.createdAt)}
              </span>
            </p>
            <h2
              aria-label={headline.title}
              data-text={headline.title}
              className={glitchCss.glitch}
            >
              {headline.title}
            </h2>
            <p className={css.headlineExcerpt}>{headline.excerpt}</p>
          </Link>

          <ol className={css.rows}>
            {archive.map((paper, index) => (
              <BroadcastRow key={paper.slug} paper={paper} index={index} />
            ))}
          </ol>

          <nav className={css.fastext} aria-label='Fastext shortcuts'>
            {FASTEXT_KEYS.map((key) => (
              <Link key={key.label} url={key.url}>
                <i
                  aria-hidden='true'
                  style={{ '--key-color': key.color } as React.CSSProperties}
                />
                {key.label}
              </Link>
            ))}
          </nav>
        </section>

        <footer className={css.receiverFooter}>
          <span>↑↓ / J K SELECT · ENTER READ</span>
          <span>TEXT SERVICE / CH.02</span>
        </footer>

        <div className={css.readLine} aria-hidden='true'>
          <span>▶</span>
          <span>◀</span>
        </div>
      </div>

      <ArrowNav />
    </Shell>
  )
}
