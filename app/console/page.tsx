import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { CONSOLE_DESC } from 'service/descriptions'
import { publicRewrites } from 'service/router'
import staticFiles from './static-files.json'
import TerminalView from './terminal-view'

export const metadata: Metadata = {
  title: 'Console',
  description: CONSOLE_DESC,
  alternates: { canonical: '/console' },
}

export default async function ConsolePage() {
  'use cache'
  cacheLife('max')

  return <TerminalView paths={staticFiles} links={publicRewrites} />
}
