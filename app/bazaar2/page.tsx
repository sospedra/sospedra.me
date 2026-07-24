import type { Metadata } from 'next'
import Bazaar2View from './bazaar2-view'

export const metadata: Metadata = {
  title: 'Bazaar v2',
  description: 'Work-in-progress rebuild of the night bazaar.',
  robots: { index: false },
}

export default function Bazaar2Page() {
  return <Bazaar2View />
}
