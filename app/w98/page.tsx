import type { Metadata } from 'next'
import Windows98View from './w98-view'

export const metadata: Metadata = {
  title: 'Windows 98',
  description:
    'A Windows 98 desktop in the browser. Sweep a responsive Minesweeper field, draw in Paint, play your library through Winamp and tune live disco radio in RealPlayer.',
  alternates: { canonical: '/w98' },
}

export default function Windows98Page() {
  return <Windows98View />
}
