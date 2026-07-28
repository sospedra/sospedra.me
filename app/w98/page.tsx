import type { Metadata } from 'next'
import { W98_DESC } from 'service/descriptions'
import Windows98View from './w98-view'

export const metadata: Metadata = {
  title: 'Windows 98',
  description: W98_DESC,
  alternates: { canonical: '/w98' },
}

export default function Windows98Page() {
  return <Windows98View />
}
