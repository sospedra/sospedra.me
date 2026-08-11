import type { Metadata } from 'next'
import {
  Bodoni_Moda,
  Cinzel,
  EB_Garamond,
  UnifrakturMaguntia,
} from 'next/font/google'
import { routeViewport } from 'services/transition/altitude'
import FrasurbaneView from './frasurbane-view'

const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
  variable: '--font-fr-display',
})

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  preload: false,
  variable: '--font-fr-caps',
})

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
  variable: '--font-fr-text',
})

const blackletter = UnifrakturMaguntia({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-fr-gothic',
})

export const metadata: Metadata = {
  title: 'Frasurbane',
  description:
    'One editorial spread, two decades: the warm 1994 urbane original and its 2024 gothic remix, flipped by a single toggle.',
  alternates: { canonical: '/styles/frasurbane' },
}

export const viewport = routeViewport('/styles/frasurbane')

export default function FrasurbanePage() {
  return (
    <FrasurbaneView
      fontVars={`${bodoni.variable} ${cinzel.variable} ${garamond.variable} ${blackletter.variable}`}
    />
  )
}
