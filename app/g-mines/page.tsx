import type { Metadata } from 'next'
import { MINES_DESC } from 'service/descriptions'
import MinesView from './mines-view'

export const metadata: Metadata = {
  title: 'Mines',
  description: MINES_DESC,
  alternates: { canonical: '/g-mines' },
}

export default function MinesPage() {
  return <MinesView />
}
