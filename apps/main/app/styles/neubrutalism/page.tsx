import type { Metadata } from 'next'
import { Archivo_Black, Space_Grotesk } from 'next/font/google'
import { routeViewport } from 'services/transition/altitude'
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
    'A loud festival bento in neubrutalism: hard offset shadows, thick borders, flat candy colors, and toy controls that physically depress.',
  alternates: { canonical: '/styles/neubrutalism' },
}

export const viewport = routeViewport('/styles/neubrutalism')

export default function NeubrutalismPage() {
  return <NeubrutalismView fontVars={`${shout.variable} ${grotesk.variable}`} />
}
