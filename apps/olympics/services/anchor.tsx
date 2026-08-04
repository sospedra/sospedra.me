import type { ReactNode } from 'react'

export const Anchor = (props: { href: string; children: ReactNode }) => {
  return (
    <a
      href={props.href}
      target='_blank'
      rel='noopener noreferrer'
      className='text-green-600 underline'
    >
      {props.children}
    </a>
  )
}
