import type React from 'react'
import { tapHaptic } from 'services/haptics'
import type { Point } from './geometry.ts'
import type { Nub, PaintEvent, PaintState, Size } from './state.ts'

export type NubBindings = {
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>
  onPointerMove: React.PointerEventHandler<HTMLButtonElement>
  onPointerUp: React.PointerEventHandler<HTMLButtonElement>
  onPointerCancel: React.PointerEventHandler<HTMLButtonElement>
  onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>
}

const NUB_KEY_STEP = 8

const NUB_AXES: Record<Nub, Point> = {
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  se: { x: 1, y: 1 },
}

const ARROW_VECTORS: Record<string, Point> = {
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
}

const nubArrowDelta = (nub: Nub, key: string): Point | null => {
  const vector = ARROW_VECTORS[key]
  if (!vector) return null
  const axes = NUB_AXES[nub]
  const delta = { x: vector.x * axes.x, y: vector.y * axes.y }
  return delta.x === 0 && delta.y === 0 ? null : delta
}

export const createNubBindings = ({
  canvasRef,
  pointerIdRef,
  resizeCanvasTo,
  send,
  stateRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  pointerIdRef: React.RefObject<number | null>
  resizeCanvasTo: (target: Size) => void
  send: (event: PaintEvent) => void
  stateRef: React.RefObject<PaintState>
}) => {
  const stagePoint = (event: React.PointerEvent<Element>): Point => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const zoom = stateRef.current.zoom
    return {
      x: Math.floor((event.clientX - rect.left) / zoom),
      y: Math.floor((event.clientY - rect.top) / zoom),
    }
  }

  return (nub: Nub): NubBindings => ({
    onPointerDown: (event) => {
      if (event.button !== 0 || pointerIdRef.current !== null) return
      pointerIdRef.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      send({ type: 'resize-canvas', nub, at: stagePoint(event) })
    },
    onPointerMove: (event) => {
      if (pointerIdRef.current !== event.pointerId) return
      send({ type: 'move', at: stagePoint(event) })
    },
    onPointerUp: (event) => {
      if (pointerIdRef.current !== event.pointerId) return
      pointerIdRef.current = null
      tapHaptic()
      send({ type: 'up', at: stagePoint(event) })
    },
    onPointerCancel: (event) => {
      if (pointerIdRef.current !== event.pointerId) return
      pointerIdRef.current = null
      send({ type: 'cancel' })
    },
    onKeyDown: (event) => {
      const delta = nubArrowDelta(nub, event.key)
      if (!delta || pointerIdRef.current !== null) return
      const step = event.shiftKey ? 1 : NUB_KEY_STEP
      const size = stateRef.current.size
      resizeCanvasTo({
        width: Math.max(1, size.width + delta.x * step),
        height: Math.max(1, size.height + delta.y * step),
      })
      event.preventDefault()
    },
  })
}
