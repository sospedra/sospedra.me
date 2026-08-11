import type { Metadata } from 'next'
import { Baloo_2, Nunito } from 'next/font/google'
import { routeViewport } from 'services/transition/altitude'
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
    'A plasticine playroom: poke the clay critters, follow their googly eyes, open the blind box, and roll fresh clay ropes on the pad.',
  alternates: { canonical: '/styles/clay' },
}

export const viewport = routeViewport('/styles/clay')

export default function ClayPage() {
  return <ClayView fontVars={`${chunky.variable} ${soft.variable}`} />
}
