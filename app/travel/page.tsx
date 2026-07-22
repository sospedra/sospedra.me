import type { Metadata } from 'next'
import { TRAVEL_DESC } from 'service/descriptions'
import TravelView from './travel-view'

export const metadata: Metadata = {
  title: 'Travel',
  description: TRAVEL_DESC,
  alternates: { canonical: '/travel' },
}

export default function TravelPage() {
  return <TravelView />
}
