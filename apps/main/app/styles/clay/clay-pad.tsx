'use client'

import { useEffect, useRef, useState } from 'react'
import css from './clay.module.css'

type Rope = { lo: string; mid: string; hi: string }

const ROPES: Rope[] = [
  { lo: '#6da893', mid: '#9fd8c9', hi: '#d3f2e8' },
  { lo: '#8a77b8', mid: '#b9a8e3', hi: '#ded2f7' },
  { lo: '#c4a45a', mid: '#f5d789', hi: '#fdf0c8' },
  { lo: '#5f82b4', mid: '#92b4e3', hi: '#cfe0f7' },
  { lo: '#c26a60', mid: '#ef9a8f', hi: '#ffd2c9' },
]

type Point = { x: number; y: number }

const segment = (
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  rope: Rope,
) => {
  const passes = [
    { color: rope.lo, width: 30, offset: 4, alpha: 1 },
    { color: rope.mid, width: 26, offset: 0, alpha: 1 },
    { color: rope.hi, width: 9, offset: -7, alpha: 0.8 },
  ]
  for (const pass of passes) {
    ctx.globalAlpha = pass.alpha
    ctx.strokeStyle = pass.color
    ctx.lineWidth = pass.width
    ctx.beginPath()
    ctx.moveTo(from.x, from.y + pass.offset)
    ctx.lineTo(to.x, to.y + pass.offset)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

const ClayPad = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const last = useRef<Point | null>(null)
  const ropeIndex = useRef(0)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      const rect = canvas.getBoundingClientRect()
      const snapshot = canvas.width > 0 ? canvas.toDataURL() : null
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (!snapshot) return
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height)
      img.src = snapshot
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  const localPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const begin = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    ropeIndex.current = (ropeIndex.current + 1) % ROPES.length
    last.current = localPoint(event)
    setTouched(true)
  }

  const roll = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const from = last.current
    if (!from) return
    const ctx = event.currentTarget.getContext('2d')
    if (!ctx) return
    const to = localPoint(event)
    segment(ctx, from, to, ROPES[ropeIndex.current])
    last.current = to
  }

  const finish = () => {
    last.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setTouched(false)
  }

  return (
    <div className={css.pad}>
      <canvas
        ref={canvasRef}
        className={css.padCanvas}
        aria-label='Clay drawing pad. Drag to roll clay ropes.'
        onPointerDown={begin}
        onPointerMove={roll}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      {!touched && (
        <span className={css.padHint} aria-hidden='true'>
          drag here — every stroke is a fresh rope
        </span>
      )}
      <button type='button' className={css.chip} onClick={clear}>
        smash it flat
      </button>
    </div>
  )
}

export default ClayPad
