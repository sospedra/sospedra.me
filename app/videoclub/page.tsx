import type { Metadata } from 'next'
import { VIDEOCLUB_DESC } from 'service/descriptions'
import VideoclubView from './videoclub-view'

export const metadata: Metadata = {
  title: 'Videoclub',
  description: VIDEOCLUB_DESC,
  alternates: { canonical: '/videoclub' },
}

export default function VideoclubPage() {
  return <VideoclubView />
}
