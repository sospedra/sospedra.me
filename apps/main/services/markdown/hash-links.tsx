'use client'

import { useEffect } from 'react'

const hashHrefFrom = (target: EventTarget | null): string | null => {
  if (!(target instanceof Element)) return null
  const href = target.closest('a')?.getAttribute('href')
  return href?.startsWith('#') ? href : null
}

const usesNativeClick = (event: MouseEvent) =>
  event.defaultPrevented ||
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey

// a pushed hash entry is what the yellow Back would pop instead of leaving,
// so heading self-links replace the current entry and keep its history state
export default function HashLinks() {
  useEffect(() => {
    const replaceHashNavigation = (event: MouseEvent) => {
      if (usesNativeClick(event)) return
      const href = hashHrefFrom(event.target)
      if (href === null) return
      const heading = document.getElementById(href.slice(1))
      if (heading === null) return
      event.preventDefault()
      window.history.replaceState(window.history.state, '', href)
      heading.scrollIntoView()
    }
    document.addEventListener('click', replaceHashNavigation)
    return () => document.removeEventListener('click', replaceHashNavigation)
  }, [])

  return null
}
