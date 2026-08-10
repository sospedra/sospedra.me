import { clamp } from 'es-toolkit'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { tapHaptic } from 'services/haptics'
import { isEditableTarget, letterKeysDisabled } from 'services/hotkeys'
import type { Face, reduce, Turn } from './engine'
import { type Orbit, type StickerHit, swipeMove } from './swipe.ts'

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
  sticker: StickerHit | null
  prime: boolean
  touch: boolean
  mode: 'pending' | 'orbit' | 'spent'
}

const stickerHit = (target: Element): StickerHit | null => {
  const tile = target.closest('[data-face]')
  const face = tile?.getAttribute('data-face')
  const pos = tile?.getAttribute('data-pos')?.split(',').map(Number)
  if (!face || pos?.length !== 3) return null
  return { face: face as Face, position: [pos[0], pos[1], pos[2]] }
}

export const useOrbitAndTap = (dispatch: Dispatch) => {
  const [orbit, setOrbit] = useState<Orbit>({ rotateX: -24, rotateY: -38 })
  const [orbiting, setOrbiting] = useState(false)
  const session = useRef<DragSession | null>(null)

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 2) return
    session.current = {
      x: event.clientX,
      y: event.clientY,
      sticker: stickerHit(event.target as Element),
      prime: event.button === 2 || event.shiftKey,
      touch: event.pointerType === 'touch',
      mode: 'pending',
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  // the first threshold crossing decides the gesture once: a touch swipe
  // that starts on a sticker turns a layer, everything else orbits
  const startDrag = (
    drag: DragSession,
    deltaX: number,
    deltaY: number,
  ): DragSession['mode'] => {
    if (!drag.touch || !drag.sticker) {
      setOrbiting(true)
      return 'orbit'
    }
    const move = swipeMove(orbit, drag.sticker, [deltaX, deltaY])
    if (move) {
      tapHaptic()
      dispatch({ type: 'PLAY', move, now: Date.now() })
    }
    return 'spent'
  }

  // true when the gesture crossed the threshold and settled on orbiting
  const resolvePending = (
    drag: DragSession,
    deltaX: number,
    deltaY: number,
  ) => {
    if (Math.hypot(deltaX, deltaY) < 6) return false
    drag.mode = startDrag(drag, deltaX, deltaY)
    return drag.mode === 'orbit'
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = session.current
    if (!drag || drag.mode === 'spent') return
    const deltaX = event.clientX - drag.x
    const deltaY = event.clientY - drag.y
    if (drag.mode === 'pending' && !resolvePending(drag, deltaX, deltaY)) {
      return
    }
    drag.x = event.clientX
    drag.y = event.clientY
    setOrbit((prev) => ({
      rotateX: clamp(prev.rotateX - deltaY * 0.4, -80, 80),
      rotateY: prev.rotateY + deltaX * 0.4,
    }))
  }

  const endDrag = () => {
    const drag = session.current
    session.current = null
    setOrbiting(false)
    return drag
  }

  const onPointerUp = () => {
    const drag = endDrag()
    if (drag?.mode !== 'pending' || !drag.sticker) return
    tapHaptic()
    dispatch({
      type: 'PLAY',
      move: { face: drag.sticker.face, prime: drag.prime },
      now: Date.now(),
    })
  }

  const onPointerCancel = () => {
    endDrag()
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

  return {
    orbit,
    orbiting,
    onOrbitKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  }
}
