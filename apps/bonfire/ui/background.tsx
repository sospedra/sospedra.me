'use client'

import { useEffect, useRef } from 'react'

export function Background() {
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      const el = video.current
      if (!el) return
      if (media.matches) {
        el.pause()
        return
      }
      el.play().catch(() => undefined)
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  return (
    <video
      autoPlay
      className='pointer-events-none fixed top-0 left-0 -z-10 h-full w-full bg-night object-cover'
      loop
      muted
      playsInline
      poster='/cover.jpg'
      preload='auto'
      ref={video}
    >
      <source src='/background.webm' type='video/webm' />
      <source src='/background.mp4' type='video/mp4' />
    </video>
  )
}
