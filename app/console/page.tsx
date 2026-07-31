import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { CONSOLE_DESC } from 'service/descriptions'
import { STATIC_ROOT } from 'service/io'
import staticFiles from 'service/io/static-files.json'
import { publicRewrites } from 'service/router'
import TerminalView from './terminal-view'

export const metadata: Metadata = {
  title: 'Console',
  description: CONSOLE_DESC,
  alternates: { canonical: '/console' },
}

// assets live under the static root on disk but are served from the site root
const PUBLIC_PREFIX = `/${STATIC_ROOT}`

export default async function ConsolePage() {
  'use cache'
  cacheLife('max')

  const paths = staticFiles.map((path) => path.slice(PUBLIC_PREFIX.length))

  return <TerminalView paths={paths} links={publicRewrites} />
}
