import type { Metadata } from 'next'
import { STACK_DESC } from 'service/descriptions'
import Shell from 'components/Shell'
import Link, { LinkBack } from 'components/Link'
import StackView from './stack-view'

export const metadata: Metadata = {
  title: 'Stack',
  description: STACK_DESC,
  alternates: { canonical: '/stack' },
}

export default function StackPage() {
  return (
    <Shell
      canonical='/stack'
      className='relative w-full h-full max-w-4xl px-4 pt-12 pb-20 mx-auto text-white'
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>
      <h1 className='text-3xl md:text-4xl'>My hand-picked stack</h1>
      <p className='pb-10'>{STACK_DESC}</p>

      <StackView />
    </Shell>
  )
}
