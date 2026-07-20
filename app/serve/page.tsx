import RouteHeader from 'components/RouteHeader'
import Shell from 'components/Shell'
import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { SERVE_DESC } from 'service/descriptions'
import { pathsToTree } from 'service/io'
import staticFiles from 'service/io/static-files.json'
import css from '../../components/Serve/serve.module.css'
import ServeTree from './serve-tree'

export const metadata: Metadata = {
  title: 'Serve',
  description: SERVE_DESC,
  alternates: { canonical: '/serve' },
}

export default async function ServePage() {
  'use cache'
  cacheLife('max')

  const tree = pathsToTree(staticFiles.map((p) => p.split('/')))

  return (
    <Shell canonical='/serve' className={css.page}>
      <RouteHeader
        title='Serve assets'
        sector='04.3'
        status='Directory mounted'
        description={`${SERVE_DESC}.`}
      />

      <section className={css.terminal} aria-labelledby='asset-index-title'>
        <div className={css.terminalBar}>
          <strong id='asset-index-title'>Public / Index</strong>
          <span>{staticFiles.length} assets / read-only</span>
        </div>
        <div className={css.tree}>
          <ServeTree tree={tree} />
        </div>
      </section>
    </Shell>
  )
}
