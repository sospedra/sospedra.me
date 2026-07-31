import type { Metadata } from 'next'
import Bazaar5View from './bazaar5-view'

export const metadata: Metadata = {
  title: 'Bazaar v5',
  description: 'The underground market on the validated layout system.',
  robots: { index: false },
}

export default function Bazaar5Page() {
  return <Bazaar5View />
}
