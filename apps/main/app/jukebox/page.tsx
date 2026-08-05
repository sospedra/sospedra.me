import type { Metadata } from 'next'
import { Righteous, Special_Elite } from 'next/font/google'
import JukeboxView from './jukebox-view'

const righteous = Righteous({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-disp',
  display: 'swap',
})

const specialElite = Special_Elite({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-type',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Side projects',
  description:
    'The side-projects jukebox. Every record pressed in-house, one per subdomain. Press a letter, press a number.',
  alternates: { canonical: '/jukebox' },
}

export default function JukeboxPage() {
  return (
    <JukeboxView
      fontClassName={`${righteous.variable} ${specialElite.variable}`}
    />
  )
}
