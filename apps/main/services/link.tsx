'use client'

import cn from 'clsx'
import type { Route } from 'next'
import type React from 'react'
import Icon from 'services/icon/icon'
import { useRouteTransition } from 'services/transition/context'
import {
  useWarmRouteAudioOnTouch,
  warmRouteAudio,
} from 'services/transition/route-audio'
import { usePrefetch } from 'services/transition/use-prefetch'
import css from './link.module.css'

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  url: Route
  children: React.ReactNode
  prefetchOnFocus?: boolean
  ref?: React.Ref<HTMLAnchorElement>
}

type AnchorDownload = React.AnchorHTMLAttributes<HTMLAnchorElement>['download']

const usesNativeNavigation = (
  event: React.MouseEvent<HTMLAnchorElement>,
  target: string | undefined,
  download: AnchorDownload,
) =>
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey ||
  target === '_blank' ||
  (download !== undefined && download !== false)

export default function Link(props: LinkProps) {
  const {
    children,
    download,
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
  useWarmRouteAudioOnTouch(url)

  const navigateOnClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (usesNativeNavigation(event, target, download)) return

    onClick?.(event)
    if (event.defaultPrevented) return

    event.preventDefault()
    // navigate immediately: every ms before router.push is a window where
    // the browser back button walks past the page the visitor is leaving
    transition.navigate(url)
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
        if (prefetchOnFocus) warmRouteAudio(url)
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event)
        prefetch()
        warmRouteAudio(url)
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event)
        prefetch()
        warmRouteAudio(url)
      }}
      onClick={navigateOnClick}
    >
      {children}
    </a>
  )
}

type GoBackProps = React.AnchorHTMLAttributes<HTMLAnchorElement>

export function GoBack(props: GoBackProps) {
  const { children, download, onClick, target, ...nativeProps } = props
  const transition = useRouteTransition()

  const navigateBack = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (usesNativeNavigation(event, target, download)) return

    onClick?.(event)
    if (event.defaultPrevented) return

    event.preventDefault()
    transition.navigateBack()
  }

  return (
    <a
      {...nativeProps}
      href='/'
      target={target}
      download={download}
      onClick={navigateBack}
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
