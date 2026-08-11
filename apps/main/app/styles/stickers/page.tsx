import type { Metadata } from 'next'
import { Caveat, Titan_One } from 'next/font/google'
import { routeViewport } from 'services/transition/altitude'
import StickersView from './stickers-view'

const bubble = Titan_One({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-sticker-bubble',
})

const marker = Caveat({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-sticker-marker',
})

export const metadata: Metadata = {
  title: 'Stickers',
  description:
    'A die-cut sticker bomb on kraft board. Drag every sticker, peel fresh ones off the sheet, slap random ones on.',
  alternates: { canonical: '/styles/stickers' },
}

export const viewport = routeViewport('/styles/stickers')

export default function StickersPage() {
  return <StickersView fontVars={`${bubble.variable} ${marker.variable}`} />
}
