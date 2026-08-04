import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import css from './axis-dial.module.css'

const DIAL_DEGREES_PER_PIXEL = 0.42
const DIAL_KEY_STEP = 2
const DIAL_PAGE_STEP = 15

type DialKeyTurn = { dir: -1 | 1; step: number; horizontalOnly?: boolean }

const DIAL_KEY_TURNS: Record<string, DialKeyTurn> = {
  ArrowUp: { dir: 1, step: DIAL_KEY_STEP },
  ArrowRight: { dir: 1, step: DIAL_KEY_STEP, horizontalOnly: true },
  ArrowDown: { dir: -1, step: DIAL_KEY_STEP },
  ArrowLeft: { dir: -1, step: DIAL_KEY_STEP, horizontalOnly: true },
  PageUp: { dir: 1, step: DIAL_PAGE_STEP },
  PageDown: { dir: -1, step: DIAL_PAGE_STEP },
}

type AxisDialDrag = {
  angle: number | null
  pointerId: number
  x: number
  y: number
}

const pointerAngle = (event: ReactPointerEvent<HTMLDivElement>): number => {
  const rect = event.currentTarget.getBoundingClientRect()
  return (
    (Math.atan2(
      event.clientY - (rect.top + rect.height / 2),
      event.clientX - (rect.left + rect.width / 2),
    ) *
      180) /
    Math.PI
  )
}

const signedAngleDelta = (from: number, to: number): number =>
  ((to - from + 540) % 360) - 180

export default function AxisDial(props: {
  id: string
  leftLimit: string
  rightLimit: string
  min: number
  max: number
  initialValue: number
  initialKnobAngle: number
  orientation: 'horizontal' | 'vertical'
  increaseKnobDirection: -1 | 1
  ariaLabel: string
  hint: string
  formatAriaValue: (value: number) => string
  controlRef: RefObject<HTMLDivElement | null>
  knobRef: RefObject<HTMLSpanElement | null>
  onTurn: (knobDelta: number) => void
  onSetValue: (value: number) => void
  onInteractionChange: (active: boolean) => void
  armAudio: () => void
  playRotaryTick: (direction: -1 | 1) => void
}) {
  const {
    id,
    leftLimit,
    rightLimit,
    min,
    max,
    initialValue,
    initialKnobAngle,
    orientation,
    increaseKnobDirection,
    ariaLabel,
    hint,
    formatAriaValue,
    controlRef,
    knobRef,
    onTurn,
    onSetValue,
    onInteractionChange,
    armAudio,
    playRotaryTick,
  } = props
  const dragRef = useRef<AxisDialDrag | null>(null)
  const [dragging, setDragging] = useState(false)

  const turnDial = useCallback(
    (turn: number) => {
      if (!Number.isFinite(turn) || Math.abs(turn) < 0.001) return
      onTurn(turn)
      playRotaryTick(turn > 0 ? 1 : -1)
    },
    [onTurn, playRotaryTick],
  )

  useEffect(() => {
    const control = controlRef.current
    if (!control) return
    // React delegates wheel events passively. This physical control must keep
    // the page still while the user turns it.
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.deltaY === 0) return
      event.preventDefault()
      event.stopPropagation()
      armAudio()
      const valueDirection = event.deltaY < 0 ? 1 : -1
      turnDial(valueDirection * increaseKnobDirection * DIAL_KEY_STEP)
    }
    control.addEventListener('wheel', handleWheel, { passive: false })
    return () => control.removeEventListener('wheel', handleWheel)
  }, [armAudio, controlRef, increaseKnobDirection, turnDial])

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const radius = Math.hypot(event.clientX - centerX, event.clientY - centerY)
    armAudio()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      angle:
        radius > Math.min(rect.width, rect.height) * 0.2
          ? pointerAngle(event)
          : null,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    setDragging(true)
    onInteractionChange(true)
    event.preventDefault()
    event.stopPropagation()
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    let turn: number
    if (drag.angle === null) {
      const distance = event.clientX - drag.x - (event.clientY - drag.y)
      turn = distance * DIAL_DEGREES_PER_PIXEL
    } else {
      const angle = pointerAngle(event)
      turn = signedAngleDelta(drag.angle, angle)
      drag.angle = angle
    }
    drag.x = event.clientX
    drag.y = event.clientY
    turnDial(event.shiftKey ? turn / 4 : turn)
    event.preventDefault()
    event.stopPropagation()
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    onInteractionChange(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const snapToLimit = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    value: number,
    tick: -1 | 1,
  ) => {
    event.preventDefault()
    if (Number(event.currentTarget.getAttribute('aria-valuenow')) === value)
      return
    armAudio()
    onSetValue(value)
    playRotaryTick(tick)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Home') {
      snapToLimit(event, min, increaseKnobDirection === 1 ? -1 : 1)
      return
    }
    if (event.key === 'End') {
      snapToLimit(event, max, increaseKnobDirection)
      return
    }
    const turn = DIAL_KEY_TURNS[event.key]
    if (!turn) return
    if (turn.horizontalOnly && orientation === 'vertical') return
    event.preventDefault()
    armAudio()
    turnDial(turn.dir * increaseKnobDirection * turn.step)
  }

  return (
    <div className={css.axisDial}>
      <span className={css.rangeDialLimit} data-side='left' aria-hidden='true'>
        {leftLimit}
      </span>
      <span className={css.rangeDialWell}>
        <div
          id={id}
          ref={controlRef}
          className={css.rangeDialInput}
          data-travel-sfx='knob'
          role='slider'
          tabIndex={0}
          data-dragging={dragging}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Math.round(initialValue)}
          aria-valuetext={formatAriaValue(initialValue)}
          aria-orientation={orientation}
          aria-controls='travel-globe-canvas'
          aria-describedby={`${id}-hint`}
          onKeyDown={handleKeyDown}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={() => {
            if (!dragRef.current) return
            dragRef.current = null
            setDragging(false)
            onInteractionChange(false)
          }}
        />
        <span
          ref={knobRef}
          className={css.rangeKnob}
          style={
            {
              '--range-angle': `${initialKnobAngle}deg`,
            } as CSSProperties
          }
          aria-hidden='true'
        >
          <span className={css.rangeKnobShaft} />
          <span className={css.rangeKnobFace}>
            <i />
          </span>
        </span>
      </span>
      <span className={css.rangeDialLimit} data-side='right' aria-hidden='true'>
        {rightLimit}
      </span>
      <span id={`${id}-hint`} className='sr-only'>
        {hint}
      </span>
    </div>
  )
}
