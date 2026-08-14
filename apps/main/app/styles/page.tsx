import type { Metadata } from 'next'
import {
  Anton,
  Archivo_Black,
  Baloo_2,
  Bodoni_Moda,
  Titan_One,
} from 'next/font/google'
import { routeViewport } from 'services/chrome'
import StylesView from './styles-view'

const bubble = Titan_One({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-lab-bubble',
})

const poster = Anton({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-lab-poster',
})

const serif = Bodoni_Moda({
  subsets: ['latin'],
  weight: '400',
  style: ['italic'],
  display: 'swap',
  preload: false,
  variable: '--font-lab-serif',
})

const chunky = Baloo_2({
  subsets: ['latin'],
  weight: '800',
  display: 'swap',
  preload: false,
  variable: '--font-lab-chunky',
})

const shout = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-lab-shout',
})

export const metadata: Metadata = {
  title: 'Style lab',
  description:
    'Six graphic aesthetics rebuilt as living pages: stickers, overprint, frasurbane, clay, the mishko melt, and neubrutalism.',
  alternates: { canonical: '/styles' },
}

export const viewport = routeViewport('/styles')

export default function StylesPage() {
  return (
    <StylesView
      fontVars={`${bubble.variable} ${poster.variable} ${serif.variable} ${chunky.variable} ${shout.variable}`}
    />
  )
}
