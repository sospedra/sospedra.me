import type { Metadata } from 'next'
import { Anton, Courier_Prime } from 'next/font/google'
import { routeViewport } from 'services/chrome'
import OverprintView from './overprint-view'

const poster = Anton({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-op-poster',
})

const typewriter = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-op-mono',
})

export const metadata: Metadata = {
  title: 'Overprint',
  description:
    'A two-ink riso press in the browser: real ink separations, drag-to-misregister plates, toggleable inks, and a smeared-scan chapter.',
  alternates: { canonical: '/styles/overprint' },
}

export const viewport = routeViewport('/styles/overprint')

export default function OverprintPage() {
  return (
    <OverprintView fontVars={`${poster.variable} ${typewriter.variable}`} />
  )
}
