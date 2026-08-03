import type { Metadata } from 'next'
import VideoclubView from './videoclub-view'

export const metadata: Metadata = {
  title: 'Videoclub',
  description:
    'My conference talks on tape. A CRT, a VCR combo and five cassettes: finite state machines, functional programming and React Native.',
  alternates: { canonical: '/videoclub' },
}

export default function VideoclubPage() {
  return <VideoclubView />
}
