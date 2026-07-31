'use client'

import { useEffect } from 'react'

/* mobile keyboards shrink the visual viewport without resizing the window;
   the custom property carries the real height into the css */
export const useViewportHeightVar = (name: string) => {
  useEffect(() => {
    const viewport = window.visualViewport
    let frame = 0
    const update = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const height = viewport?.height ?? window.innerHeight
        document.documentElement.style.setProperty(name, `${height}px`)
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
      document.documentElement.style.removeProperty(name)
    }
  }, [name])
}
