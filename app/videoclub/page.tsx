import type { Metadata } from 'next'
import { TALKS_DESC } from 'service/descriptions'
import VideoclubView from './videoclub-view'

export const metadata: Metadata = {
  title: 'Videoclub',
  description: TALKS_DESC,
  alternates: { canonical: '/videoclub' },
}

export default function VideoclubPage() {
  return <VideoclubView />
}
