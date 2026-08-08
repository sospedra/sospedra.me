'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from 'services/theme'
import PixelGhost from './pixel-ghost'
import css from './seance.module.css'
import type { SeanceScene } from './seance-scene'

export type Origin = { x: number; y: number }

type SeanceProps = {
  close: () => void
  open: boolean
  origin: Origin | null
}

export default function Seance(props: SeanceProps) {
  const { fxMode } = useTheme()
  const quiet = fxMode === 'quiet'
  const hostRef = useRef<HTMLDivElement>(null)
  const escapeRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!props.open) return
    escapeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.open, props.close])

  useEffect(() => {
    const host = hostRef.current
    if (!props.open || quiet || !host || !mounted) return

    let scene: SeanceScene | undefined
    let disposed = false
    setReady(false)
    const origin = props.origin
    import('./seance-scene').then((mod) => {
      if (disposed) return
      scene = mod.createSeanceScene(host, {
        onReady: () => setReady(true),
        origin,
      })
    })

    return () => {
      disposed = true
      scene?.dispose()
      setReady(false)
    }
  }, [props.open, quiet, mounted, props.origin])

  if (!props.open || !mounted) return null

  return createPortal(
    <div className={css.overlay}>
      {quiet ? (
        <span className={css.quietGhost}>
          <PixelGhost />
        </span>
      ) : (
        <div className={css.stage} data-ready={ready} ref={hostRef} />
      )}
      <button
        className={css.escape}
        onClick={props.close}
        ref={escapeRef}
        type='button'
      >
        escape
      </button>
    </div>,
    document.body,
  )
}
