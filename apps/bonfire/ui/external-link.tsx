import clsx from 'clsx'
import type { ReactNode } from 'react'

export function ExternalLink(props: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <a
      className={clsx('font-bold hover:underline', props.className)}
      href={props.href}
      rel='noopener noreferrer'
      target='_blank'
    >
      {props.children}
    </a>
  )
}
