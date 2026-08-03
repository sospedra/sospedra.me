import type { Metadata } from 'next'
import SnakeView from './snake-view'

export const metadata: Metadata = {
  title: 'Snake',
  description:
    'Snake, straight from the Nokia 3310. An 84×48 green LCD, one hungry snake and a top score that never leaves your browser.',
  alternates: { canonical: '/snake' },
}

export default function GSnakePage() {
  return <SnakeView />
}
