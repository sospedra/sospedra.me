import type { Metadata } from 'next'
import { Baloo_2, Nunito } from 'next/font/google'
import { routeViewport } from 'services/chrome'
import ClayView from './clay-view'

const chunky = Baloo_2({
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
  preload: false,
  variable: '--font-clay-display',
})

const soft = Nunito({
  subsets: ['latin'],
  weight: ['500', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-clay-body',
})

export const metadata: Metadata = {
  title: 'Clay',
  description:
    'The Plasticine Review, a four-plate toy catalog: a WebGL clay specimen with googly eyes, a blind-box catalog, and a clay-rope workshop.',
  alternates: { canonical: '/styles/clay' },
}

export const viewport = routeViewport('/styles/clay')

export default function ClayPage() {
  return <ClayView fontVars={`${chunky.variable} ${soft.variable}`} />
}
