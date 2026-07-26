import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { SERVE_DESC } from 'service/descriptions'
import staticFiles from 'service/io/static-files.json'
import { publicRewrites } from 'service/router'
import TerminalView from './terminal-view'

export const metadata: Metadata = {
  title: 'Serve',
  description: SERVE_DESC,
  alternates: { canonical: '/serve' },
}

// assets live under /public on disk but are served from the site root
const PUBLIC_PREFIX = '/public'

export default async function ServePage() {
  'use cache'
  cacheLife('max')

  const paths = staticFiles.map((path) => path.slice(PUBLIC_PREFIX.length))

  return <TerminalView paths={paths} links={publicRewrites} />
}
