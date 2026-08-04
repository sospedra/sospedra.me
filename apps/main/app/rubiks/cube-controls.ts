import { clamp } from 'es-toolkit'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { isEditableTarget, letterKeysDisabled } from 'services/hotkeys'
import type { Face, reduce, Turn } from './engine'

export const TURN_MS: Record<Turn['kind'], number> = {
  play: 180,
  undo: 180,
  redo: 180,
  scramble: 110,
  solve: 130,
}

const KEY_FACES: Record<string, Face> = {
  u: 'U',
  d: 'D',
  l: 'L',
  r: 'R',
  f: 'F',
  b: 'B',
}

export type Dispatch = React.Dispatch<Parameters<typeof reduce>[1]>

export const useTurnClock = (turning: Turn | null, dispatch: Dispatch) => {
  const [spun, setSpun] = useState(false)

  useEffect(() => {
    if (!turning) return
    const frame = requestAnimationFrame(() => setSpun(true))
    const timeout = window.setTimeout(() => {
      setSpun(false)
      dispatch({ type: 'TURN_END', now: Date.now() })
    }, TURN_MS[turning.kind])
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [turning, dispatch])

  return spun
}

export const useMoveKeys = (dispatch: Dispatch) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return
      }
      // taps on stickers stay as the pointer path when letter keys are off
      if (isEditableTarget(event.target) || letterKeysDisabled()) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' })
        return
      }
      const face = KEY_FACES[key]
      if (!face) return
      event.preventDefault()
      dispatch({
        type: 'PLAY',
        move: { face, prime: event.shiftKey },
        now: Date.now(),
      })
    }

    // capture phase, like snake: face letters stay on the cube even
    // before the global traps check the game input claim
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [dispatch])
}

type DragSession = {
  x: number
  y: number
  face: Face | null
  prime: boolean
  moved: boolean
}

type Orbit = { rotateX: number; rotateY: number }

export const useOrbitAndTap = (dispatch: Dispatch) => {
  const [orbit, setOrbit] = useState<Orbit>({ rotateX: -24, rotateY: -38 })
  const session = useRef<DragSession | null>(null)

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 2) return
    const target = event.target as Element
    const face = target.closest('[data-face]')?.getAttribute('data-face')
    session.current = {
      x: event.clientX,
      y: event.clientY,
      face: (face as Face) ?? null,
      prime: event.button === 2 || event.shiftKey,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = session.current
    if (!drag) return
    const deltaX = event.clientX - drag.x
    const deltaY = event.clientY - drag.y
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 6) return
    drag.moved = true
    drag.x = event.clientX
    drag.y = event.clientY
    setOrbit((prev) => ({
      rotateX: clamp(prev.rotateX - deltaY * 0.4, -80, 80),
      rotateY: prev.rotateY + deltaX * 0.4,
    }))
  }

  const onPointerUp = () => {
    const drag = session.current
    session.current = null
    if (!drag || drag.moved || !drag.face) return
    dispatch({
      type: 'PLAY',
      move: { face: drag.face, prime: drag.prime },
      now: Date.now(),
    })
  }

  // keyboard orbit: drag stays pointer sugar, arrows reach every angle
  const ORBIT_KEY_DEG = 12
  const onOrbitKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = {
      ArrowUp: { x: ORBIT_KEY_DEG, y: 0 },
      ArrowDown: { x: -ORBIT_KEY_DEG, y: 0 },
      ArrowLeft: { x: 0, y: -ORBIT_KEY_DEG },
      ArrowRight: { x: 0, y: ORBIT_KEY_DEG },
    }[event.key]
    if (!step) return
    event.preventDefault()
    setOrbit((prev) => ({
      rotateX: clamp(prev.rotateX + step.x, -80, 80),
      rotateY: prev.rotateY + step.y,
    }))
  }

  return { orbit, onPointerDown, onPointerMove, onPointerUp, onOrbitKeyDown }
}
