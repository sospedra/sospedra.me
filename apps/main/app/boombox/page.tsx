import type { Metadata, Viewport } from 'next'
import BoomboxView from './boombox-view'

export const metadata: Metadata = {
  title: 'Boombox',
  description:
    'Heardle on a cassette deck. One mystery tape a day: play the first second, guess the song in six tries, and every miss winds the spool a little further.',
  alternates: { canonical: '/boombox' },
}

/* the soft keyboard overlays the machine; it must never resize the layout */
export const viewport: Viewport = {
  interactiveWidget: 'resizes-visual',
}

export default function BoomboxPage() {
  return <BoomboxView />
}
