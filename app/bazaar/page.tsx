import type { Metadata } from 'next'
import { BAZAAR_DESC } from 'service/descriptions'
import BazaarView from './bazaar-view'

export const metadata: Metadata = {
  title: 'Bazaar',
  description: BAZAAR_DESC,
  alternates: { canonical: '/bazaar' },
}

export default function BazaarPage() {
  return <BazaarView />
}
