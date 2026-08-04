import type { Metadata } from 'next'
import TravelView from './travel-view'

export const metadata: Metadata = {
  title: 'Travel',
  description:
    'The ship log. Every destination pinned on a low-orbit globe, every region a frequency on the signalscope. Twenty-two minutes to supernova.',
  alternates: { canonical: '/travel' },
}

export default function TravelPage() {
  return <TravelView />
}
