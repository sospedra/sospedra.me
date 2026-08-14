import type { Metadata } from 'next'
import { Archivo_Black, Space_Grotesk } from 'next/font/google'
import { routeViewport } from 'services/chrome'
import NeubrutalismView from './neubrutalism-view'

const shout = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-nb-shout',
})

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-nb-ui',
})

export const metadata: Metadata = {
  title: 'Neubrutalism',
  description:
    'A four-plate festival programme in neubrutalism: a LOUD! cover, a bento of working toys, a filterable schedule, and tickets, turned like slabs.',
  alternates: { canonical: '/styles/neubrutalism' },
}

export const viewport = routeViewport('/styles/neubrutalism')

export default function NeubrutalismPage() {
  return <NeubrutalismView fontVars={`${shout.variable} ${grotesk.variable}`} />
}
