import type { Metadata, Route } from 'next'
import ArrowNav from 'services/arrow-nav'
import { cssVars } from 'services/css-vars'
import Link from 'services/link'
import { Reading } from 'services/markdown/meta'
import { fetchPapers } from 'services/markdown/paper.server-snapshot'
import type { Paper } from 'services/markdown/paper.types'
import RouteHeader from 'services/route-header'
import Shell from 'services/shell'
import glitchCss from 'services/style/glitch.module.css'
import css from './papers.module.css'

export const metadata: Metadata = {
  title: 'Papers',
  description: `Personal blog by Rubén Sospedra. ${"Papers on JavaScript, TypeScript, the web platform and the occasional politics of software. Not your usual blog: dense over long, niche over SEO chum. Words are my own. It's dangerous to go unknowing, take some pills 💊"}`,
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
            <Reading minutes={props.paper.minutes} className={css.slices} /> ·{' '}
            {stamp(props.paper.createdAt)}
          </span>
        </div>
        <p className={css.rowExcerpt}>{props.paper.excerpt}</p>
      </Link>
    </li>
  )
}

function Headline(props: { paper: Paper }) {
  return (
    <Link
      url={`/papers/${props.paper.slug}` as Route}
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
          <Reading minutes={props.paper.minutes} className={css.slices} /> ·{' '}
          {stamp(props.paper.createdAt)}
        </span>
      </p>
      <h2
        aria-label={props.paper.title}
        data-text={props.paper.title}
        className={glitchCss.glitch}
      >
        {props.paper.title}
      </h2>
      <p className={css.headlineExcerpt}>{props.paper.excerpt}</p>
    </Link>
  )
}

export default async function PapersPage() {
  const papers = await fetchPapers()
  const headline = papers.at(0)
  const archive = papers.slice(1)

  return (
    <Shell className={css.frame}>
      <div className={css.receiver}>
        <RouteHeader
          className={css.routeHeader}
          title='Papers'
          sector='02'
          status='On air'
          description={
            "Papers on JavaScript, TypeScript, the web platform and the occasional politics of software. Not your usual blog: dense over long, niche over SEO chum. Words are my own. It's dangerous to go unknowing, take some pills 💊"
          }
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

          {headline ? (
            <Headline paper={headline} />
          ) : (
            <p className={css.headlineTag}>
              <span>
                <span className={css.blink} aria-hidden='true'>
                  ▓
                </span>{' '}
                NO TRANSMISSIONS ON FILE
              </span>
            </p>
          )}

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
                  style={cssVars({ '--key-color': key.color })}
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
