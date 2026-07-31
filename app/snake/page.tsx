import type { Metadata } from 'next'
import { SNAKE_DESC } from 'service/descriptions'
import SnakeView from './snake-view'

export const metadata: Metadata = {
  title: 'Snake',
  description: SNAKE_DESC,
  alternates: { canonical: '/snake' },
}

export default function GSnakePage() {
  return <SnakeView />
}
