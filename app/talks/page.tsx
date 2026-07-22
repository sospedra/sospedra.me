import type { Metadata } from 'next'
import { TALKS_DESC } from 'service/descriptions'
import TalksView from './talks-view'

export const metadata: Metadata = {
  title: 'Talks',
  description: TALKS_DESC,
  alternates: { canonical: '/talks' },
}

export default function TalksPage() {
  return <TalksView />
}
