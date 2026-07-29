import type { Metadata } from 'next'
import { G_SNAKE_DESC } from 'service/descriptions'
import SnakeView from './snake-view'

export const metadata: Metadata = {
  title: 'Snake',
  description: G_SNAKE_DESC,
  alternates: { canonical: '/snake' },
}

export default function GSnakePage() {
  return <SnakeView />
}
