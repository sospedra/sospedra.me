import type { Metadata } from 'next'
import Bazaar3View from './bazaar3-view'

export const metadata: Metadata = {
  title: 'Bazaar v3',
  description: 'The next evolution of the night bazaar.',
  robots: { index: false },
}

export default function Bazaar3Page() {
  return <Bazaar3View />
}
