import type { Metadata } from 'next'
import { BOOMBOX_DESC } from 'service/descriptions'
import BoomboxView from './boombox-view'

export const metadata: Metadata = {
  title: 'Boombox',
  description: BOOMBOX_DESC,
  alternates: { canonical: '/boombox' },
}

export default function BoomboxPage() {
  return <BoomboxView />
}
