import type { Metadata } from 'next'
import { routeViewport } from 'services/chrome'
import TravelView from './travel-view'

export const metadata: Metadata = {
  title: 'Travel',
  description:
    'The ship log. Every destination pinned on a low-orbit globe, every region a frequency on the signalscope. Twenty-two minutes to supernova.',
  alternates: { canonical: '/travel' },
}

export const viewport = routeViewport('/travel')

export default function TravelPage() {
  return <TravelView />
}
