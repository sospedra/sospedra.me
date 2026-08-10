'use client'

import { useEffect, useState } from 'react'

type ViewportHeightVar =
  | '--boombox-viewport-height'
  | '--crossword-viewport-height'
  | '--geo-viewport-height'

const KEYBOARD_INSET = 120

/* mobile keyboards shrink the visual viewport without resizing the window;
   height + pageTop go into css vars so surfaces can size and counter-pan.
   The returned flag compares the visible band against the tallest band seen
   at this width, so it reads both iOS and Android resizes-content. */
export const useViewportHeightVar = (name: ViewportHeightVar) => {
  const [softKeyboard, setSoftKeyboard] = useState(false)

  useEffect(() => {
    const viewport = window.visualViewport
    const offsetName = name.replace('-height', '-offset')
    let frame = 0
    let restWidth = 0
    let restHeight = 0
    const update = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const height = viewport?.height ?? window.innerHeight
        const width = viewport?.width ?? window.innerWidth
        const root = document.documentElement.style
        root.setProperty(name, `${height}px`)
        root.setProperty(offsetName, `${viewport?.pageTop ?? 0}px`)
        if (width !== restWidth) {
          restWidth = width
          restHeight = 0
        }
        restHeight = Math.max(restHeight, height)
        setSoftKeyboard(restHeight - height > KEYBOARD_INSET)
      })
    }
    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(frame)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      const root = document.documentElement.style
      root.removeProperty(name)
      root.removeProperty(offsetName)
    }
  }, [name])

  return softKeyboard
}
