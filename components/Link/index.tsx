'use client'

import cn from 'clsx'
import Icon from 'components/Icon'
import type { Route } from 'next'
import React from 'react'
import { useTransition } from 'service/transition'
import { usePrefetch } from 'service/transition/use-prefetch'
import css from './link.module.css'

const Link = React.forwardRef(function Link(
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    url: Route
    children: React.ReactNode
    instant?: boolean
    prefetchOnFocus?: boolean
  },
  ref?: React.Ref<HTMLAnchorElement>,
) {
  const {
    children,
    download,
    instant,
    onClick,
    onFocus,
    onMouseEnter,
    onTouchStart,
    target,
    url,
    prefetchOnFocus = true,
    ...nativeProps
  } = props
  const transition = useTransition()
  const prefetch = usePrefetch(url)

  return (
    <a
      {...nativeProps}
      ref={ref}
      href={url}
      target={target}
      download={download}
      onFocus={(event) => {
        onFocus?.(event)
        if (prefetchOnFocus) prefetch()
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event)
        prefetch()
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event)
        prefetch()
      }}
      onClick={(e) => {
        const shouldUseNativeNavigation =
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          target === '_blank' ||
          (download !== undefined && download !== false)

        if (shouldUseNativeNavigation) return

        onClick?.(e)
        if (e.defaultPrevented) return

        e.preventDefault()
        transition.navigateLater(url, instant ? 0 : 360)
      }}
    >
      {children}
    </a>
  )
})

export const LinkBack: React.FC<{
  className?: string
  children: React.ReactNode
}> = (props) => {
  return (
    <span className={cn(css.back, props.className)}>
      <Icon name='back.svg' />
      <span>{props.children}</span>
    </span>
  )
}

export default Link
