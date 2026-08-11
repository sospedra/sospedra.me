'use client'

import { useEffect, useRef, useState } from 'react'

const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20)

// sheets pin with position: sticky, so covered sheets keep intersecting at
// ratio 1 and rect.top 0: the observer only feeds each sheet its --turn
// progress var; the ACTIVE index derives from scroll position, which also
// makes backward jumps land, and turnTo targets flow offsets, not rects
export const useSheetStack = () => {
  const refs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const sheet = entry.target as HTMLElement
          sheet.style.setProperty('--turn', entry.intersectionRatio.toFixed(3))
        }
      },
      { threshold: THRESHOLDS },
    )
    for (const sheet of refs.current) {
      if (sheet) observer.observe(sheet)
    }

    let raf = 0
    const sync = () => {
      raf = 0
      const index = Math.min(
        refs.current.length - 1,
        Math.max(0, Math.round(window.scrollY / window.innerHeight)),
      )
      refs.current[index]?.setAttribute('data-active', 'true')
      setActive(index)
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(sync)
    }
    sync()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const turnTo = (index: number) => {
    const sheet = refs.current[index]
    if (!sheet) return
    window.scrollTo({ top: sheet.offsetTop, behavior: 'smooth' })
  }

  return { refs, active, turnTo }
}
