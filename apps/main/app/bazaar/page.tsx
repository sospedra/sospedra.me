import type { Metadata } from 'next'
import { routeViewport } from 'services/transition/altitude'
import BazaarView from './bazaar-view'

export const metadata: Metadata = {
  title: 'Bazaar',
  description: 'A neon night market of my projects and side quests',
  alternates: { canonical: '/bazaar' },
}

export const viewport = routeViewport('/bazaar')

export default function BazaarPage() {
  return <BazaarView />
}
