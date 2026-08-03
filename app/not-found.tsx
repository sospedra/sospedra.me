import type { Metadata } from 'next'
import Shell from 'services/shell'
import NotFoundView from './not-found-view'

export const metadata: Metadata = {
  title: '404',
  robots: { index: false },
}

export default function NotFound() {
  return (
    <Shell className='relative w-full min-h-dvh overflow-hidden text-white'>
      <NotFoundView />
    </Shell>
  )
}
