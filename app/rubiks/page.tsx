import type { Metadata } from 'next'
import { RUBIKS_DESC } from 'service/descriptions'
import RubiksView from './rubiks-view'

export const metadata: Metadata = {
  title: "Rubik's",
  description: RUBIKS_DESC,
  alternates: { canonical: '/rubiks' },
}

export default function RubiksPage() {
  return <RubiksView />
}
