'use client'

import type React from 'react'
import { useEffect } from 'react'

const GLITCH_ODDS = 0.2

const mediaFrom = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null
  return target.closest('[data-paper-media]')
}

const crossesBoundary = (media: Element, related: EventTarget | null) =>
  !(related instanceof Node && media.contains(related))

const GlitchRoll: React.FC = () => {
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return
    const roll = (event: PointerEvent) => {
      const media = mediaFrom(event.target)
      if (!media || !crossesBoundary(media, event.relatedTarget)) return
      media.toggleAttribute('data-glitch', Math.random() < GLITCH_ODDS)
    }
    const clear = (event: PointerEvent) => {
      const media = mediaFrom(event.target)
      if (!media || !crossesBoundary(media, event.relatedTarget)) return
      media.removeAttribute('data-glitch')
    }
    document.addEventListener('pointerover', roll, { passive: true })
    document.addEventListener('pointerout', clear, { passive: true })
    return () => {
      document.removeEventListener('pointerover', roll)
      document.removeEventListener('pointerout', clear)
    }
  }, [])
  return null
}

export default GlitchRoll
