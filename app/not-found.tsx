import Component404 from 'components/404'
import Shell from 'components/Shell'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404',
  robots: { index: false },
}

export default function NotFound() {
  return (
    <Shell
      canonical='/404'
      className='relative w-full h-screen overflow-hidden text-white'
    >
      <Component404 />
    </Shell>
  )
}
