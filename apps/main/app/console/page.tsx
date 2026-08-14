import type { Metadata } from 'next'
import { routeViewport } from 'services/chrome'
import { publicRewrites } from './rewrites'
import staticFiles from './static-files.json'
import TerminalView from './terminal-view'

export const metadata: Metadata = {
  title: 'Console',
  description:
    'Every public asset and short link, served from an amber-phosphor terminal. Type HELP.',
  alternates: { canonical: '/console' },
}

export const viewport = routeViewport('/console')

export default function ConsolePage() {
  return <TerminalView paths={staticFiles} links={publicRewrites} />
}
