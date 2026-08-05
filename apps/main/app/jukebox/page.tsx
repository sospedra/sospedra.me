import type { Metadata } from 'next'
import JukeboxView from './jukebox-view'

export const metadata: Metadata = {
  title: 'Side projects',
  description:
    'The side-projects jukebox. Every record pressed in-house, one per subdomain. Press a letter, press a number.',
  alternates: { canonical: '/jukebox' },
}

export default function JukeboxPage() {
  return <JukeboxView />
}
