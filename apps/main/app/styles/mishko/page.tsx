import type { Metadata } from 'next'
import { Archivo_Black, Space_Grotesk, UnifrakturCook } from 'next/font/google'
import { routeViewport } from 'services/chrome'
import MishkoView from './mishko-view'

const heavy = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-mk-heavy',
})

const utility = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  preload: false,
  variable: '--font-mk-utility',
})

const gothic = UnifrakturCook({
  subsets: ['latin'],
  weight: '700',
  display: 'swap',
  preload: false,
  variable: '--font-mk-gothic',
})

export const metadata: Metadata = {
  title: 'Mishko effect',
  description:
    'A live melt lab: type a phrase, pick a thermal ramp, and rub the poster — a WebGL shader liquifies the letters under your pointer.',
  alternates: { canonical: '/styles/mishko' },
}

export const viewport = routeViewport('/styles/mishko')

export default function MishkoPage() {
  return (
    <MishkoView
      fontVars={`${heavy.variable} ${utility.variable} ${gothic.variable}`}
    />
  )
}
