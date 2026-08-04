'use client'

import cn from 'clsx'
import type { Route } from 'next'
import type React from 'react'
import Icon from 'services/icon/icon'
import { useRouteTransition } from 'services/transition/context'
import { UNMOUNT_DELAY_MS } from 'services/transition/stage'
import { usePrefetch } from 'services/transition/use-prefetch'
import css from './link.module.css'

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  url: Route
  children: React.ReactNode
  instant?: boolean
  prefetchOnFocus?: boolean
  ref?: React.Ref<HTMLAnchorElement>
}

export default function Link(props: LinkProps) {
  const {
    children,
    download,
    instant,
    onClick,
    onFocus,
    onMouseEnter,
    onTouchStart,
    ref,
    target,
    url,
    prefetchOnFocus = true,
    ...nativeProps
  } = props
  const transition = useRouteTransition()
  const prefetch = usePrefetch(url)

  const navigateOnClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const shouldUseNativeNavigation =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === '_blank' ||
      (download !== undefined && download !== false)

    if (shouldUseNativeNavigation) return

    onClick?.(event)
    if (event.defaultPrevented) return

    event.preventDefault()
    transition.navigateLater(url, instant ? 0 : UNMOUNT_DELAY_MS)
  }

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
      onClick={navigateOnClick}
    >
      {children}
    </a>
  )
}

export const LinkBack: React.FC<{
  className?: string
  children: React.ReactNode
}> = (props) => {
  return (
    <span className={cn(css.back, props.className)}>
      <Icon name='back' />
      <span>{props.children}</span>
    </span>
  )
}
