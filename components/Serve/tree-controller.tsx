'use client'

import ArrowNav from 'components/ArrowNav'
import type React from 'react'
import { useEffect, useRef } from 'react'

export default function TreeController(props: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const requested = new Set(
      new URLSearchParams(window.location.search)
        .get('e')
        ?.split('.')
        .filter(Boolean) || [],
    )

    const details = root.querySelectorAll('details')
    for (const directory of details) {
      if (requested.has(directory.dataset.nodeName || '')) {
        directory.open = true
        directory.dataset.highlighted = 'true'
      }
    }
  }, [])

  return (
    <div ref={rootRef}>
      {props.children}
      <ArrowNav />
    </div>
  )
}
