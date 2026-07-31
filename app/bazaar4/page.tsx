import type { Metadata } from 'next'
import Bazaar4View from './bazaar4-view'

export const metadata: Metadata = {
  title: 'Bazaar v4',
  description: 'The underground market, floor by floor.',
  robots: { index: false },
}

export default function Bazaar4Page() {
  return <Bazaar4View />
}
