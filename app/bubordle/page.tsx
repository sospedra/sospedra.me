import type { Metadata } from 'next'
import { BUBORDLE_DESC } from 'service/descriptions'
import BubordleView from './bubordle-view'

export const metadata: Metadata = {
  title: 'Bubordle',
  description: BUBORDLE_DESC,
  alternates: { canonical: '/bubordle' },
}

export default function BubordlePage() {
  return <BubordleView />
}
