import type { Metadata } from 'next'
import { Courier_Prime } from 'next/font/google'
import { routeViewport } from 'services/transition/altitude'
import {
  loadRecentChallenges,
  loadSpanishDaily,
} from './crosswords.server-snapshot'
import CrosswordsView from './crosswords-view'
import { withSpanishPuzzle } from './spanish-daily'

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Crosswords',
  description:
    'A bilingual daily crossword with keyboard-first play in English and Spanish.',
  alternates: { canonical: '/crosswords' },
}

export const viewport = routeViewport('/crosswords')

export default async function CrosswordsPage() {
  const [challenges, spanish] = await Promise.all([
    loadRecentChallenges(),
    loadSpanishDaily().catch(() => null),
  ])
  const editions = spanish ? withSpanishPuzzle(challenges, spanish) : challenges
  return (
    <CrosswordsView
      challenges={editions}
      letterFontClassName={courierPrime.className}
    />
  )
}
