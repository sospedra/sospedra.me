'use client'

import { useEffect, useRef } from 'react'
import css from './clay.module.css'
import { type ClayBlob, createClayBlob } from './clay-blob'
import { Eyes, useGooglyEyes } from './clay-critters'

type ClaySpecimenProps = { active: boolean }

const ClaySpecimen = ({ active }: ClaySpecimenProps) => {
  const stage = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const blobRef = useRef<ClayBlob | null>(null)
  useGooglyEyes(stage)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const blob = createClayBlob(canvas)
    blobRef.current = blob
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const applyMotion = () => blob.setFrozen(media.matches)
    applyMotion()
    media.addEventListener('change', applyMotion)
    return () => {
      media.removeEventListener('change', applyMotion)
      blobRef.current = null
      blob.dispose()
    }
  }, [])

  useEffect(() => {
    const sync = () => {
      const blob = blobRef.current
      if (!blob) return
      if (active && !document.hidden) blob.start()
      else blob.stop()
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      blobRef.current?.stop()
    }
  }, [active])

  return (
    <div ref={stage} className={css.specimenStage}>
      <canvas
        ref={canvasRef}
        className={css.specimenCanvas}
        role='img'
        aria-label='A soft mint clay blob, slowly breathing. Press to poke it.'
        onPointerDown={() => blobRef.current?.poke()}
      />
      <span className={css.specimenEyes} aria-hidden='true'>
        <Eyes wide />
      </span>
    </div>
  )
}

export default ClaySpecimen
