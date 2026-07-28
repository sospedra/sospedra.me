import type { Metadata } from 'next'
import { Courier_Prime } from 'next/font/google'
import { PUZZLES } from './crossword-data'
import CrosswordsView from './crosswords-view'

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

export default function CrosswordsPage() {
  return (
    <CrosswordsView
      puzzles={PUZZLES}
      letterFontClassName={courierPrime.className}
    />
  )
}
