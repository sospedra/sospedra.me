import type { Metadata } from 'next'
import RubiksView from './rubiks-view'

export const metadata: Metadata = {
  title: "Rubik's",
  description:
    "A Rubik's cube in CSS 3D. Scramble it, race the clock, unwind the mess move by move. The record stands at 27 seconds.",
  alternates: { canonical: '/rubiks' },
}

export default function RubiksPage() {
  return <RubiksView />
}
