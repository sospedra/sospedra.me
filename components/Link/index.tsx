'use client'

import React from 'react'
import { useTransition } from 'service/transition'
import { usePrefetch } from 'service/transition/use-prefetch'
import Icon from 'components/Icon'
import css from './link.module.css'

const Link = React.forwardRef(function Link(
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    url: string
    children: React.ReactNode
    instant?: boolean
  },
  ref?: React.Ref<HTMLAnchorElement>,
) {
  const { url, onClick, instant, ...nativeProps } = props
  const transition = useTransition()

  usePrefetch(url)

  return (
    <a
      {...nativeProps}
      ref={ref}
      href={url}
      onClick={(e) => {
        e.preventDefault()
        onClick?.(e)
        setTimeout(
          () => {
            transition.navigate(url)
          },
          instant ? 0 : 360,
        )
      }}
    >
      {props.children}
    </a>
  )
})

export const LinkBack: React.FC<{
  className?: string
  children: React.ReactNode
}> = (props) => {
  return (
    <nav className={`${css.back} ${props.className}`}>
      <Icon name='back.svg' />
      <span>{props.children}</span>
    </nav>
  )
}

export default Link
