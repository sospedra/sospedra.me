import { clamp } from 'es-toolkit'
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from 'react'
import { MAX_ZOOM, MIN_ZOOM } from './canvas'
import controlDeck from './control-deck.module.css'
import css from './grid-pilot.module.css'
import type { LifeMechanicalSound } from './life-audio'
import type { LifeCanvasUi } from './life-canvas'
import { KNOB_MIN_ANGLE, KNOB_SWEEP } from './life-instruments'
import pilotPad from './pilot-pad.module.css'

type PilotDirection =
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west'

type PilotDrag = {
  id: number
  lastX: number
  lastY: number
  originX: number
  originY: number
}

const clampPilotOffset = (x: number, y: number) => {
  const magnitude = Math.hypot(x, y)
  if (magnitude <= 12) return { x, y }
  const scale = 12 / magnitude
  return { x: x * scale, y: y * scale }
}

type AxisSign = -1 | 0 | 1

const PILOT_DIRECTIONS: Record<
  `${AxisSign},${AxisSign}`,
  PilotDirection | 'idle'
> = {
  '-1,-1': 'north-west',
  '-1,0': 'west',
  '-1,1': 'south-west',
  '0,-1': 'north',
  '0,0': 'idle',
  '0,1': 'south',
  '1,-1': 'north-east',
  '1,0': 'east',
  '1,1': 'south-east',
}

const axisSign = (value: number): AxisSign => {
  if (Math.abs(value) < 1) return 0
  return value > 0 ? 1 : -1
}

const pilotDirection = (x: number, y: number): PilotDirection | 'idle' =>
  PILOT_DIRECTIONS[`${axisSign(x)},${axisSign(y)}`]

const CHEVRON_PATH =
  'M512 330.666667c14.933333 0 29.866667 4.266667 40.533333 14.933333l277.33333399 234.666667c27.733333 23.466667 29.866667 64 8.53333301 89.6-23.466667 27.733333-64 29.866667-89.6 8.53333299L512 477.866667l-236.8 200.53333299c-27.733333 23.466667-68.266667 19.19999999-89.6-8.53333299-23.466667-27.733333-19.19999999-68.266667 8.53333301-89.6l277.33333399-234.666667c10.666667-10.666667 25.6-14.933333 40.533333-14.933333z'

const CHEVRON_ANGLES = { east: 90, north: 0, south: 180, west: 270 } as const

/* rotation rides the path attribute: .icon centers itself with a CSS transform */
const Chevron = ({
  active,
  heading,
}: {
  active: boolean
  heading: keyof typeof CHEVRON_ANGLES
}) => (
  <svg
    className={`${pilotPad.icon} ${active ? pilotPad.active : ''}`}
    viewBox='0 0 1024 1024'
    aria-hidden='true'
  >
    <path
      d={CHEVRON_PATH}
      transform={`rotate(${CHEVRON_ANGLES[heading]} 512 512)`}
    />
  </svg>
)

export const GridPilot = ({
  canvas,
  playMechanicalSound,
}: {
  canvas: LifeCanvasUi
  playMechanicalSound: (kind: LifeMechanicalSound) => void
}) => {
  const [direction, setDirection] = useState<PilotDirection | 'idle'>('idle')
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<PilotDrag | null>(null)

  const stopPanning = (pointerId?: number) => {
    if (pointerId !== undefined && dragRef.current?.id !== pointerId) return
    dragRef.current = null
    setDragging(false)
    setDirection('idle')
    setOffset({ x: 0, y: 0 })
  }

  const startPanning = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || dragRef.current !== null) return
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      id: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      originX: event.clientX,
      originY: event.clientY,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const movePanning = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()

    const deltaX = event.clientX - drag.lastX
    const deltaY = event.clientY - drag.lastY
    drag.lastX = event.clientX
    drag.lastY = event.clientY

    if (deltaX !== 0 || deltaY !== 0) playMechanicalSound('knob')

    // the knob steers the viewport: drag north flies north, the grid slides south
    canvas.panBy(deltaX, deltaY)

    const nextOffset = clampPilotOffset(
      event.clientX - drag.originX,
      event.clientY - drag.originY,
    )
    setOffset(nextOffset)
    setDirection(pilotDirection(nextOffset.x, nextOffset.y))
  }

  const finishPanning = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerId !== dragRef.current?.id) return
    event.stopPropagation()
    stopPanning(event.pointerId)
  }

  const keyboardPan = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const vectors: Partial<Record<string, readonly [number, number]>> = {
      ArrowDown: [0, 48],
      ArrowLeft: [-48, 0],
      ArrowRight: [48, 0],
      ArrowUp: [0, -48],
    }
    const vector = vectors[event.key]
    if (vector) {
      event.preventDefault()
      playMechanicalSound('knob')
      canvas.panBy(...vector)
    } else if (event.key === 'Home' || event.key === '0') {
      event.preventDefault()
      playMechanicalSound('knob')
      canvas.fit()
    }
  }

  const zoomProgress = clamp(
    (canvas.zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM),
    0,
    1,
  )
  const pilotStyle = {
    '--pilot-x': `${offset.x}px`,
    '--pilot-y': `${offset.y}px`,
    '--pilot-tilt-x': `${offset.y * -0.55}deg`,
    '--pilot-tilt-y': `${offset.x * 0.55}deg`,
    '--pilot-zoom-angle': `${KNOB_MIN_ANGLE + zoomProgress * KNOB_SWEEP}deg`,
  } as CSSProperties

  return (
    <section
      className={`${controlDeck.controlModule} ${css.gridPilot}`}
      data-direction={direction}
      aria-label='Grid view navigation'
    >
      <header>
        <span>Field slew</span>
        <output>{dragging ? 'Tracking' : canvas.zoomText}</output>
      </header>
      <button
        type='button'
        className={pilotPad.dragPilot}
        data-direction={direction}
        data-dragging={dragging ? 'true' : 'false'}
        style={pilotStyle}
        aria-label='Field slew'
        aria-describedby='field-slew-help'
        aria-keyshortcuts='ArrowUp ArrowDown ArrowLeft ArrowRight Home 0'
        data-life-sfx='knob'
        data-no-press-pulse
        onKeyDown={keyboardPan}
        onLostPointerCapture={finishPanning}
        onPointerCancel={finishPanning}
        onPointerDown={startPanning}
        onPointerMove={movePanning}
        onPointerUp={finishPanning}
      >
        <span className={`${pilotPad.row} ${pilotPad.pilot}`}>
          <span className={pilotPad.container}>
            <span className={pilotPad.around}>
              <span className={pilotPad.handle}>
                <span className={pilotPad['button-wrapper']}>
                  <span className={pilotPad.inside}>
                    <span className={pilotPad.dot} />
                    <span className={pilotPad.dot} />
                    <span className={pilotPad.dot} />
                    <span className={pilotPad.dot} />
                  </span>
                </span>
              </span>
            </span>

            <Chevron heading='north' active={direction.includes('north')} />
            <Chevron heading='east' active={direction.includes('east')} />
            <Chevron heading='south' active={direction.includes('south')} />
            <Chevron heading='west' active={direction.includes('west')} />
          </span>
        </span>
      </button>
      <span id='field-slew-help' className='sr-only'>
        Press and hold, then drag to fly the view across the field. Use arrow
        keys for precise movement and Home to fit the pattern.
      </span>
    </section>
  )
}
