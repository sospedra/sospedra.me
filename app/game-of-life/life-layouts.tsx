import Link, { LinkBack } from 'components/Link'
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type RefCallback,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { LifeState } from './engine'
import css from './game-of-life.module.css'
import type { LifeMechanicalSound } from './life-audio'
import {
  type InteractiveLifePreset,
  LIFE_PRESETS,
  type LifePreset,
} from './presets'
import controls from './uiverse-controls.module.css'

export type LifeTool = 'draw' | 'move'

type CanvasElementProps = Omit<
  ComponentPropsWithoutRef<'canvas'>,
  'children' | 'className' | 'ref'
>

export type LifeCanvasUi = {
  bind: RefCallback<HTMLCanvasElement>
  props: CanvasElementProps
  tool: LifeTool
  coordinateText: string
  zoom: number
  zoomText: string
  setTool: (tool: LifeTool) => void
  zoomBy: (factor: number) => void
  panBy: (screenX: number, screenY: number) => void
  fit: () => void
}

export type LifeLayoutProps = {
  state: LifeState
  running: boolean
  speed: number
  status: string
  seedName: string
  patternBayOpen: boolean
  canvas: LifeCanvasUi
  loadPreset: (preset: InteractiveLifePreset) => void
  toggleRunning: () => void
  stepOnce: () => void
  resetUniverse: () => void
  clearUniverse: () => void
  setSpeed: (speed: number) => void
  setPatternBayOpen: (open: boolean) => void
  soundEnabled: boolean
  toggleSound: () => void
  playMechanicalSound: (kind: LifeMechanicalSound) => void
  unlockAudio: () => void
}

const METER_SEGMENTS = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
] as const

const formatCount = (value: number) => value.toLocaleString('en-US')
const padGeneration = (value: number, length = 4) =>
  String(value).padStart(length, '0')
const meterLevel = (value: number, segments: number = METER_SEGMENTS.length) =>
  value <= 0 ? 0 : Math.min(segments, Math.ceil(Math.log2(value + 1)))

const tracePoints = (history: readonly number[]) => {
  if (history.length < 2) return '0,22 100,22'
  const high = Math.max(...history, 1)
  return history
    .map((value, index) => {
      const x = (index / (history.length - 1)) * 100
      const y = 38 - (value / high) * 34
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

const PopulationTrace = ({ history }: { history: readonly number[] }) => (
  <svg
    className={css.scopeTrace}
    viewBox='0 0 100 42'
    preserveAspectRatio='none'
    aria-hidden='true'
  >
    <path d='M0 38H100M0 21H100M0 4H100' />
    <polyline points={tracePoints(history)} />
  </svg>
)

const Screw = ({ position }: { position: 'nw' | 'ne' | 'sw' | 'se' }) => (
  <i className={css.screw} data-position={position} aria-hidden='true' />
)

const LifeCanvas = ({ canvas }: { canvas: LifeCanvasUi }) => (
  <canvas
    ref={canvas.bind}
    className={css.lifeCanvas}
    data-tool={canvas.tool}
    {...canvas.props}
  >
    An interactive infinite grid for Conway&apos;s Game of Life.
  </canvas>
)

type ActionKeyProps = ComponentPropsWithoutRef<'button'>

const ActionKey = ({ children, ...props }: ActionKeyProps) => (
  <button
    data-life-sfx='key'
    {...props}
    type='button'
    className={controls.label}
    data-no-press-pulse
  >
    <div className={controls['back-side']} aria-hidden='true' />
    <span className={controls.text}>{children}</span>
    <span className={controls['bottom-line']} aria-hidden='true' />
  </button>
)

type RepeatActionKeyProps = Omit<ActionKeyProps, 'onClick'> & {
  action: () => void
  repeatCue: () => void
}

const RepeatActionKey = ({
  action,
  children,
  repeatCue,
  ...props
}: RepeatActionKeyProps) => {
  const [pressed, setPressed] = useState(false)
  const delayRef = useRef<number | null>(null)
  const repeatRef = useRef<number | null>(null)

  const stopRepeating = useCallback(() => {
    if (delayRef.current !== null) window.clearTimeout(delayRef.current)
    if (repeatRef.current !== null) window.clearInterval(repeatRef.current)
    delayRef.current = null
    repeatRef.current = null
    setPressed(false)
  }, [])

  useEffect(() => stopRepeating, [stopRepeating])

  const repeatAction = () => {
    repeatCue()
    action()
  }

  const startRepeating = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    stopRepeating()
    setPressed(true)
    action()
    event.currentTarget.setPointerCapture(event.pointerId)
    delayRef.current = window.setTimeout(() => {
      repeatAction()
      repeatRef.current = window.setInterval(repeatAction, 90)
    }, 280)
  }

  return (
    <ActionKey
      {...props}
      data-pressed={pressed ? 'true' : undefined}
      onBlur={stopRepeating}
      onClick={(event) => {
        if (event.detail === 0) action()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        setPressed(true)
        if (event.repeat) {
          event.preventDefault()
          repeatAction()
        }
      }}
      onKeyUp={(event) => {
        if (event.key === 'Enter' || event.key === ' ') stopRepeating()
      }}
      onLostPointerCapture={stopRepeating}
      onPointerCancel={stopRepeating}
      onPointerDown={startRepeating}
      onPointerLeave={stopRepeating}
      onPointerUp={stopRepeating}
    >
      {children}
    </ActionKey>
  )
}

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

const pilotDirection = (x: number, y: number): PilotDirection | 'idle' => {
  const horizontal = Math.abs(x) < 1 ? '' : x > 0 ? 'east' : 'west'
  const vertical = Math.abs(y) < 1 ? '' : y > 0 ? 'south' : 'north'

  if (vertical && horizontal) {
    return `${vertical}-${horizontal}` as PilotDirection
  }
  return (vertical || horizontal || 'idle') as PilotDirection | 'idle'
}

const GridPilot = ({
  canvas,
  playMechanicalSound,
}: Pick<LifeLayoutProps, 'canvas' | 'playMechanicalSound'>) => {
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

    // LifeCanvasUi.panBy moves the camera, so invert pointer deltas to keep the
    // grid itself under the held control and following the user's hand.
    canvas.panBy(-deltaX, -deltaY)

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
      canvas.panBy(-vector[0], -vector[1])
    } else if (event.key === 'Home' || event.key === '0') {
      event.preventDefault()
      playMechanicalSound('knob')
      canvas.fit()
    }
  }

  const zoomProgress = Math.max(0, Math.min(1, (canvas.zoom - 2) / 32))
  const pilotStyle = {
    '--pilot-x': `${offset.x}px`,
    '--pilot-y': `${offset.y}px`,
    '--pilot-tilt-x': `${offset.y * -0.55}deg`,
    '--pilot-tilt-y': `${offset.x * 0.55}deg`,
    '--pilot-zoom-angle': `${-135 + zoomProgress * 270}deg`,
  } as CSSProperties

  return (
    <section
      className={`${css.controlModule} ${css.gridPilot}`}
      data-direction={direction}
      aria-label='Grid view navigation'
    >
      <header>
        <span>Field slew</span>
        <output>{dragging ? 'Tracking' : canvas.zoomText}</output>
      </header>
      <button
        type='button'
        className={controls.dragPilot}
        data-direction={direction}
        data-dragging={dragging ? 'true' : 'false'}
        style={pilotStyle}
        aria-label='Press and hold, then drag to move the grid. Use arrow keys for precise movement and Home to fit the pattern.'
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
        <span className={`${controls.row} ${controls.pilot}`}>
          <span className={controls.container}>
            <span className={controls.around}>
              <span className={controls.handle}>
                <span className={controls['button-wrapper']}>
                  <span className={controls.inside}>
                    <span className={controls.dot} />
                    <span className={controls.dot} />
                    <span className={controls.dot} />
                    <span className={controls.dot} />
                  </span>
                </span>
              </span>
            </span>

            <svg
              className={`${controls.icon} ${
                direction.includes('north') ? controls.active : ''
              }`}
              viewBox='0 0 1024 1024'
              aria-hidden='true'
            >
              <path d='M512 330.666667c14.933333 0 29.866667 4.266667 40.533333 14.933333l277.33333399 234.666667c27.733333 23.466667 29.866667 64 8.53333301 89.6-23.466667 27.733333-64 29.866667-89.6 8.53333299L512 477.866667l-236.8 200.53333299c-27.733333 23.466667-68.266667 19.19999999-89.6-8.53333299-23.466667-27.733333-19.19999999-68.266667 8.53333301-89.6l277.33333399-234.666667c10.666667-10.666667 25.6-14.933333 40.533333-14.933333z' />
            </svg>
            <svg
              className={`${controls.icon} ${
                direction.includes('east') ? controls.active : ''
              }`}
              viewBox='0 0 200 200'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path d='M135.417 100C135.417 102.917 134.583 105.833 132.5 107.917L86.6667 162.083C82.0833 167.5 74.1667 167.917 69.1667 163.75C63.75 159.167 63.3333 151.25 67.5 146.25L106.667 100L67.5 53.75C62.9167 48.3333 63.75 40.4167 69.1667 36.25C74.5833 31.6667 82.5 32.5 86.6667 37.9167L132.5 92.0833C134.583 94.1667 135.417 97.0833 135.417 100Z' />
            </svg>
            <svg
              className={`${controls.icon} ${
                direction.includes('south') ? controls.active : ''
              }`}
              viewBox='0 0 200 200'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path d='M100 135.417C97.0833 135.417 94.1667 134.583 92.0833 132.5L37.9167 86.6667C32.5 82.0833 32.0833 74.1667 36.25 69.1667C40.8333 63.75 48.75 63.3333 53.75 67.5L100 106.667L146.25 67.5C151.667 62.9167 159.583 63.75 163.75 69.1667C168.333 74.5833 167.5 82.5 162.083 86.6667L107.917 132.5C105.833 134.583 102.917 135.417 100 135.417Z' />
            </svg>
            <svg
              className={`${controls.icon} ${
                direction.includes('west') ? controls.active : ''
              }`}
              viewBox='0 0 200 200'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path d='M64.5833 100C64.5833 97.0833 65.4167 94.1667 67.5 92.0833L113.333 37.9167C117.917 32.5 125.833 32.0833 130.833 36.25C136.25 40.8333 136.667 48.75 132.5 53.75L93.3333 100L132.5 146.25C137.083 151.667 136.25 159.583 130.833 163.75C125.417 168.333 117.5 167.5 113.333 162.083L67.5 107.917C65.4167 105.833 64.5833 102.917 64.5833 100Z' />
            </svg>
          </span>
        </span>
      </button>
    </section>
  )
}

const FieldControls = ({
  canvas,
  playMechanicalSound,
  resetUniverse,
}: {
  canvas: LifeCanvasUi
  playMechanicalSound: (kind: LifeMechanicalSound) => void
  resetUniverse: () => void
}) => (
  <section className={`${css.controlModule} ${css.fieldControls}`}>
    <header>
      <span>Field input</span>
      <output>Seed memory</output>
    </header>

    <div className={css.fieldModeSwitch}>
      <button
        type='button'
        className={controls.modeButton}
        data-control='reset'
        aria-label='Restore the loaded seed at generation zero'
        data-life-sfx='key'
        data-no-press-pulse
        onClick={resetUniverse}
      >
        <span className={controls.modeOutline} aria-hidden='true' />
        <span className={controls.modeButtonTop}>
          <i className={controls.modeLed} aria-hidden='true' />
          <span className={controls.modeIcon} aria-hidden='true' />
          <span className={controls.modeLabel}>
            <small>Restore seed</small>
            <strong>Reset</strong>
          </span>
        </span>
        <span className={controls.modeButtonBottom} aria-hidden='true' />
        <span className={controls.modeButtonBase} aria-hidden='true' />
      </button>
    </div>

    <fieldset className={css.opticsKeys}>
      <legend className='sr-only'>Canvas magnification</legend>
      <div className={`${controls['radio-input']} ${controls.labKeyBank}`}>
        <RepeatActionKey
          aria-label='Zoom out. Press and hold for continuous zoom.'
          action={() => canvas.zoomBy(1 / 1.12)}
          repeatCue={() => playMechanicalSound('key')}
        >
          −
        </RepeatActionKey>
        <ActionKey aria-label='Fit live cells in view' onClick={canvas.fit}>
          Fit
        </ActionKey>
        <RepeatActionKey
          aria-label='Zoom in. Press and hold for continuous zoom.'
          action={() => canvas.zoomBy(1.12)}
          repeatCue={() => playMechanicalSound('key')}
        >
          +
        </RepeatActionKey>
      </div>
    </fieldset>
  </section>
)

const SpeedControl = ({
  playMechanicalSound,
  speed,
  setSpeed,
}: {
  playMechanicalSound: (kind: LifeMechanicalSound) => void
  speed: number
  setSpeed: (speed: number) => void
}) => {
  const progress = ((speed - 1) / 29) * 100
  const knobAngle = -135 + progress * 2.7
  const style = {
    '--throttle': `${progress}%`,
    '--knob-angle': `${knobAngle}deg`,
  } as CSSProperties

  return (
    <section
      className={`${css.controlModule} ${css.throttleModule}`}
      style={style}
    >
      <header>
        <span>Cycle throttle</span>
        <output htmlFor='cycle-throttle'>
          {String(speed).padStart(2, '0')} Hz
        </output>
      </header>
      <label className={css.throttle} htmlFor='cycle-throttle'>
        <span className='sr-only'>Simulation speed</span>
        <span className={css.speedKnobAssembly} aria-hidden='true'>
          <span className={css.speedKnobScale} />
          <b className={css.speedKnob}>
            <span className={css.speedKnobFace}>
              <i />
            </span>
          </b>
        </span>
        <input
          id='cycle-throttle'
          type='range'
          min='1'
          max='30'
          step='1'
          value={speed}
          aria-valuetext={`${speed} ${speed === 1 ? 'generation' : 'generations'} per second`}
          onChange={(event) => {
            playMechanicalSound('knob')
            setSpeed(Number(event.target.value))
          }}
        />
        <small aria-hidden='true'>
          <span>01</span>
          <span>15</span>
          <span>30</span>
        </small>
      </label>
    </section>
  )
}

const TransportControls = ({
  canvas,
  clearUniverse,
  running,
  soundEnabled,
  state,
  stepOnce,
  toggleSound,
  toggleRunning,
}: Pick<
  LifeLayoutProps,
  | 'canvas'
  | 'clearUniverse'
  | 'running'
  | 'soundEnabled'
  | 'state'
  | 'stepOnce'
  | 'toggleSound'
  | 'toggleRunning'
>) => (
  <section className={`${css.controlModule} ${css.transportControls}`}>
    <div className={css.transportHardware}>
      <div
        className={css.runHardware}
        data-running={running ? 'true' : 'false'}
        data-disabled={state.cells.size === 0 ? 'true' : 'false'}
      >
        <span
          className={`${controls.switch} ${controls.runSwitch}`}
          data-disabled={state.cells.size === 0 ? 'true' : 'false'}
        >
          <span className={controls['switch-border1']}>
            <span className={controls['switch-border2']}>
              <input
                checked={running}
                type='checkbox'
                id='life-run-switch'
                role='switch'
                aria-checked={running}
                aria-label={running ? 'Stop simulation' : 'Start simulation'}
                disabled={state.cells.size === 0}
                onChange={toggleRunning}
              />
              <label
                htmlFor='life-run-switch'
                aria-label={running ? 'Stop simulation' : 'Start simulation'}
              />
              <span className={controls['switch-top']} />
              <span className={controls['switch-shadow']} />
              <span className={controls['switch-handle']} />
              <span className={controls['switch-handle-left']} />
              <span className={controls['switch-handle-right']} />
              <span className={controls['switch-handle-top']} />
              <span className={controls['switch-handle-bottom']} />
              <span className={controls['switch-handle-base']} />
            </span>
          </span>
        </span>

        <span className={css.runStatusLeds} aria-hidden='true'>
          <span data-lit={running ? 'true' : 'false'}>
            <i />
            On
          </span>
          <span data-lit={running ? 'false' : 'true'}>
            <i />
            Off
          </span>
        </span>
      </div>

      <label
        className={controls.fieldSwitch}
        data-life-sfx='lever'
        aria-label='Field tool: Draw or Slew'
      >
        <input
          className={controls.fieldSwitchInput}
          type='checkbox'
          checked={canvas.tool === 'move'}
          role='switch'
          aria-checked={canvas.tool === 'move'}
          aria-label='Field tool: Draw or Slew'
          onChange={(event) =>
            canvas.setTool(event.currentTarget.checked ? 'move' : 'draw')
          }
        />
        <span className={controls.fieldToggle} aria-hidden='true'>
          <span className={controls.fieldToggleLeft}>
            <b>Draw</b>
          </span>
          <span className={controls.fieldToggleRight}>
            <b>Slew</b>
          </span>
        </span>
      </label>
    </div>

    <div className={css.transportKeys}>
      <div className={`${controls['radio-input']} ${controls.labKeyBank}`}>
        <ActionKey aria-label='Advance one generation' onClick={stepOnce}>
          Step
        </ActionKey>
        <ActionKey aria-label='Clear all live cells' onClick={clearUniverse}>
          Clear
        </ActionKey>
        <ActionKey
          aria-label={
            soundEnabled
              ? 'Turn mechanical audio off'
              : 'Turn mechanical audio on'
          }
          aria-pressed={soundEnabled}
          data-on={soundEnabled ? 'true' : 'false'}
          onClick={toggleSound}
        >
          {soundEnabled ? 'Sfx on' : 'Sfx off'}
        </ActionKey>
      </div>
    </div>
  </section>
)

const PopulationPod = ({ state }: { state: LifeState }) => {
  const signalLevel = meterLevel(state.cells.size)

  return (
    <aside
      className={`${css.instrumentPod} ${css.populationPod}`}
      aria-label='Population telemetry'
    >
      <Screw position='ne' />
      <Screw position='sw' />
      <span className={css.instrumentLabel}>Bio signal</span>
      <div className={css.populationReadout}>
        <span>Population</span>
        <strong>{formatCount(state.cells.size)}</strong>
      </div>
      <div className={css.signalBank} aria-hidden='true'>
        {METER_SEGMENTS.map((segment, index) => (
          <i key={segment} data-on={index < signalLevel ? 'true' : 'false'} />
        ))}
      </div>
      <dl className={css.deltaReadout}>
        <div>
          <dt>Born</dt>
          <dd>+{formatCount(state.birthsCount)}</dd>
        </div>
        <div>
          <dt>Lost</dt>
          <dd>−{formatCount(state.deathsCount)}</dd>
        </div>
      </dl>
      <div className={css.scope}>
        <PopulationTrace history={state.history} />
      </div>
    </aside>
  )
}

const CrtAssembly = ({
  canvas,
  running,
  seedName,
  state,
  status,
}: {
  canvas: LifeCanvasUi
  running: boolean
  seedName: string
  state: LifeState
  status: string
}) => {
  const liveLevel = meterLevel(state.cells.size, 8)
  const churnLevel = meterLevel(state.birthsCount + state.deathsCount, 8)

  return (
    <section className={css.crtAssembly} aria-label='Life field display'>
      <div className={css.crtBezel}>
        <Screw position='nw' />
        <Screw position='ne' />
        <Screw position='sw' />
        <Screw position='se' />
        <div className={css.crtGlass} data-running={running ? 'true' : 'false'}>
          <LifeCanvas canvas={canvas} />
          <div className={css.scanlines} aria-hidden='true' />
          <div className={css.targetReticle} aria-hidden='true'>
            <i />
            <i />
          </div>
          <div className={css.edgeMeter} data-side='left' aria-hidden='true'>
            {METER_SEGMENTS.slice(0, 8).map((segment, index) => (
              <i key={segment} data-on={index < liveLevel ? 'true' : 'false'} />
            ))}
          </div>
          <div className={css.edgeMeter} data-side='right' aria-hidden='true'>
            {METER_SEGMENTS.slice(0, 8).map((segment, index) => (
              <i
                key={segment}
                data-on={index < churnLevel ? 'true' : 'false'}
              />
            ))}
          </div>
          <div className={`${css.screenReadout} ${css.screenReadoutTop}`}>
            <span>Life field / live plane</span>
            <span>{canvas.coordinateText}</span>
          </div>
          <div className={`${css.screenReadout} ${css.screenReadoutBottom}`}>
            <span>Gen {padGeneration(state.generation)}</span>
            <span>Pop {formatCount(state.cells.size)}</span>
            <span>{canvas.zoomText}</span>
            <span>B3 / S23</span>
          </div>
          <div className={css.cellLegend} aria-hidden='true'>
            <span>
              <i /> live
            </span>
            <span>
              <i /> newborn
            </span>
          </div>
        </div>
      </div>
      <footer className={css.crtFooter} aria-hidden='true'>
        <span>Program / {seedName}</span>
        <i />
        <i />
        <i />
        <strong>{status}</strong>
      </footer>
    </section>
  )
}

const SourceLink = ({
  children,
  preset,
}: {
  children: ReactNode
  preset: LifePreset
}) => (
  <a
    className={css.sourceLink}
    href={preset.sourceHref}
    aria-label={`Open source pattern for ${preset.title}`}
    target='_blank'
    rel='noreferrer'
  >
    {children}
  </a>
)

const CartridgeBody = ({
  active = false,
  index,
  preset,
}: {
  active?: boolean
  index: number
  preset: LifePreset
}) => (
  <>
    <span className={css.cartridgeIndex}>
      {String(index + 1).padStart(2, '0')}
    </span>
    <i className={css.cartridgeNotch} aria-hidden='true' />
    <strong>{preset.title}</strong>
    <em className={css.cartridgeFamily}>{preset.family}</em>
    <small>{preset.note}</small>
    <b className={css.cartridgeAction}>
      {preset.kind === 'reference'
        ? `${preset.actionLabel} ↗`
        : active
          ? 'Loaded ✓'
          : 'Load preset →'}
    </b>
  </>
)

const RailPresetBody = ({
  index,
  preset,
}: {
  index: number
  preset: LifePreset
}) => (
  <>
    <span className={css.railPresetIndex}>
      {String(index + 1).padStart(2, '0')}
    </span>
    <span className={css.railPresetCopy}>
      <strong>{preset.title}</strong>
      <small>{preset.family}</small>
    </span>
    <span className={css.railPresetState} aria-hidden='true' />
  </>
)

const PresetRail = ({
  loadPreset,
  railRef,
  state,
}: {
  loadPreset: (preset: InteractiveLifePreset) => void
  railRef: Ref<HTMLElement>
  state: LifeState
}) => (
  <aside
    id='preset-rail'
    ref={railRef}
    className={css.presetRail}
    aria-labelledby='preset-rail-title'
  >
    <header>
      <span>Pattern bank · {LIFE_PRESETS.length}</span>
      <strong id='preset-rail-title'>Preset library</strong>
      <small>Scroll / press to load</small>
    </header>
    <ol>
      {LIFE_PRESETS.map((preset, index) => {
        const active =
          preset.kind === 'interactive' && state.presetId === preset.id

        return (
          <li key={preset.id} data-active={active} data-kind={preset.kind}>
            {preset.kind === 'interactive' ? (
              <button
                type='button'
                className={css.railPreset}
                aria-current={active ? 'true' : undefined}
                data-life-sfx='cartridge'
                data-no-press-pulse
                onClick={() => loadPreset(preset)}
              >
                <RailPresetBody index={index} preset={preset} />
              </button>
            ) : (
              <a
                className={css.railPreset}
                data-life-sfx='cartridge'
                data-no-press-pulse
                href={preset.sourceHref}
                aria-label={`${preset.title}. Open reference dossier`}
                target='_blank'
                rel='noreferrer'
              >
                <RailPresetBody index={index} preset={preset} />
              </a>
            )}
          </li>
        )
      })}
    </ol>
    <footer className={css.railInstrumentRow} aria-hidden='true'>
      <span>
        <i /> Gen <b>{padGeneration(state.generation, 3)}</b>
      </span>
      <span>
        Pop <b>{formatCount(state.cells.size)}</b>
      </span>
      <span>B3 / S23</span>
    </footer>
  </aside>
)

const PatternBay = ({
  close,
  loadPreset,
  state,
}: {
  close: () => void
  loadPreset: (preset: InteractiveLifePreset) => void
  state: LifeState
}) => {
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (event.key !== 'Tab' || !dialogRef.current) return

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((node) => node.offsetParent !== null)
    const first = focusable.at(0)
    const last = focusable.at(-1)
    if (!first || !last) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div id='pattern-bay' className={css.patternOverlay}>
      <button
        type='button'
        className={css.patternScrim}
        aria-label='Close pattern bay'
        tabIndex={-1}
        onClick={close}
      />
      <section
        ref={dialogRef}
        className={css.patternBay}
        role='dialog'
        aria-modal='true'
        aria-labelledby='pattern-bay-title'
        onKeyDown={handleDialogKeyDown}
      >
        <header>
          <div>
            <span>11 runnable seeds · 2 dossiers</span>
            <h2 id='pattern-bay-title'>Choose a pattern</h2>
          </div>
          <p>
            Press a cartridge to load it now. Orange dossiers open reference
            patterns built for a remote HashLife engine.
          </p>
          <a
            className={css.protocolLink}
            href='https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life'
            target='_blank'
            rel='noreferrer'
          >
            B3/S23 protocol ↗
          </a>
          <button
            ref={closeButtonRef}
            type='button'
            className={css.patternClose}
            aria-label='Close pattern bay'
            onClick={close}
          >
            Close <span aria-hidden='true'>×</span>
          </button>
        </header>
        <ol>
          {LIFE_PRESETS.map((preset, index) => {
            const active =
              preset.kind === 'interactive' && state.presetId === preset.id

            return (
              <li key={preset.id} data-active={active} data-kind={preset.kind}>
                {preset.kind === 'interactive' ? (
                  <>
                    <button
                      type='button'
                      className={css.cartridge}
                      aria-pressed={active}
                      data-life-sfx='cartridge'
                      onClick={() => loadPreset(preset)}
                    >
                      <CartridgeBody
                        active={active}
                        index={index}
                        preset={preset}
                      />
                    </button>
                    <SourceLink preset={preset}>Info ↗</SourceLink>
                  </>
                ) : (
                  <a
                    className={`${css.cartridge} ${css.referenceCartridge}`}
                    data-life-sfx='cartridge'
                    href={preset.sourceHref}
                    aria-label={`${preset.title}. Reference-scale pattern; open source dossier`}
                    target='_blank'
                    rel='noreferrer'
                    onClick={close}
                  >
                    <CartridgeBody index={index} preset={preset} />
                  </a>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

const PatternTrigger = ({
  buttonRef,
  className,
  onToggle,
  open,
  seedName,
  selectedNumber,
}: {
  buttonRef: Ref<HTMLButtonElement>
  className: string
  onToggle: () => void
  open: boolean
  seedName: string
  selectedNumber: string
}) => (
  <button
    ref={buttonRef}
    type='button'
    className={`${css.patternHandle} ${className}`}
    aria-expanded={open}
    aria-controls='pattern-bay'
    aria-keyshortcuts='P'
    onClick={onToggle}
  >
    <span className={css.patternHandleLabel}>
      Preset selector <i aria-hidden='true' />
    </span>
    <strong className={css.patternHandleSelection}>
      {selectedNumber} / {String(LIFE_PRESETS.length).padStart(2, '0')} ·{' '}
      {seedName}
    </strong>
    <span className={css.patternHandleAction}>
      <b className={css.patternActionFull}>
        {open ? 'Close presets' : 'Choose preset'}
      </b>
      <b className={css.patternActionCompact}>{open ? 'Close' : 'Presets'}</b>
      <i aria-hidden='true'>{open ? '↑' : '↓'}</i>
    </span>
  </button>
)

export const LifeLayout = ({
  canvas,
  clearUniverse,
  loadPreset,
  patternBayOpen,
  playMechanicalSound,
  resetUniverse,
  running,
  seedName,
  setPatternBayOpen,
  setSpeed,
  speed,
  state,
  status,
  stepOnce,
  soundEnabled,
  toggleSound,
  toggleRunning,
  unlockAudio,
}: LifeLayoutProps) => {
  const selectedIndex = LIFE_PRESETS.findIndex(
    (preset) => preset.id === state.presetId,
  )
  const selectedNumber =
    selectedIndex < 0 ? '--' : String(selectedIndex + 1).padStart(2, '0')
  const deckPatternHandleRef = useRef<HTMLButtonElement>(null)
  const presetRailRef = useRef<HTMLElement>(null)
  const pressAnimationsRef = useRef(new Map<HTMLElement, Animation>())

  useEffect(
    () => () => {
      for (const animation of pressAnimationsRef.current.values()) {
        animation.cancel()
      }
      pressAnimationsRef.current.clear()
    },
    [],
  )

  const pulseMechanicalControl = (
    origin: EventTarget | null,
    keyboardActivation = false,
  ) => {
    if (!(origin instanceof Element)) return
    const control = origin.closest<HTMLElement>(
      'button:not(:disabled), a[href]',
    )
    if (!control || control.classList.contains(css.patternScrim)) return
    const keyboardReset =
      keyboardActivation && control.classList.contains(controls.modeButton)
    if (control.hasAttribute('data-no-press-pulse') && !keyboardReset) return
    if (control.getAttribute('aria-disabled') === 'true') return

    const surface = keyboardReset
      ? (control.querySelector<HTMLElement>(`.${controls.modeButtonTop}`) ??
        control)
      : control.classList.contains(css.patternHandle)
        ? (control.querySelector<HTMLElement>(`.${css.patternHandleAction}`) ??
          control)
        : control
    pressAnimationsRef.current.get(surface)?.cancel()

    const style = window.getComputedStyle(surface)
    const restTransform =
      style.transform === 'none' ? 'translateY(0)' : style.transform
    const restShadow = style.boxShadow
    const restFilter = style.filter
    const pressedShadow =
      style.getPropertyValue('--life-key-pressed').trim() || restShadow
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const animation = surface.animate(
      reduceMotion
        ? [
            { boxShadow: restShadow, filter: restFilter, offset: 0 },
            {
              boxShadow: pressedShadow,
              filter: 'brightness(0.88)',
              offset: 0.35,
            },
            {
              boxShadow: pressedShadow,
              filter: 'brightness(0.88)',
              offset: 0.65,
            },
            { boxShadow: restShadow, filter: restFilter, offset: 1 },
          ]
        : [
            {
              boxShadow: restShadow,
              filter: restFilter,
              offset: 0,
              transform: restTransform,
            },
            {
              boxShadow: pressedShadow,
              filter: 'brightness(0.86) saturate(0.92)',
              offset: 0.42,
              transform: 'translateY(0.34rem) scale(0.985)',
            },
            {
              boxShadow: pressedShadow,
              filter: 'brightness(0.86) saturate(0.92)',
              offset: 0.62,
              transform: 'translateY(0.34rem) scale(0.985)',
            },
            {
              boxShadow: restShadow,
              filter: 'brightness(1.06)',
              offset: 0.82,
              transform: 'translateY(-0.14rem) scale(1.005)',
            },
            {
              boxShadow: restShadow,
              filter: restFilter,
              offset: 1,
              transform: restTransform,
            },
          ],
      {
        duration: reduceMotion ? 180 : 300,
        easing: 'cubic-bezier(0.2, 0.84, 0.2, 1)',
      },
    )
    pressAnimationsRef.current.set(surface, animation)
    void animation.finished
      .catch(() => undefined)
      .then(() => {
        if (pressAnimationsRef.current.get(surface) === animation) {
          pressAnimationsRef.current.delete(surface)
        }
      })
  }

  const cueMechanicalControl = (origin: EventTarget | null) => {
    if (!(origin instanceof Element)) return
    const declared = origin.closest<HTMLElement>('[data-life-sfx]')
    const control =
      declared ?? origin.closest<HTMLElement>('button:not(:disabled), a[href]')
    if (!control || control.classList.contains(css.patternScrim)) return
    if (
      control.matches(':disabled') ||
      control.getAttribute('aria-disabled') === 'true' ||
      control.getAttribute('data-disabled') === 'true' ||
      control.querySelector(':disabled')
    ) {
      return
    }

    const kind = (declared?.dataset.lifeSfx ?? 'key') as LifeMechanicalSound
    playMechanicalSound(kind)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    pulseMechanicalControl(event.target)
    cueMechanicalControl(event.target)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') unlockAudio()
  }

  const handleMechanicalClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.detail !== 0) {
      unlockAudio()
      return
    }
    pulseMechanicalControl(event.target, true)
    cueMechanicalControl(event.target)
  }

  const returnFocusToPatternHandle = () => {
    requestAnimationFrame(() => {
      const activeRailPreset =
        presetRailRef.current?.querySelector<HTMLElement>(
          '[aria-current="true"]',
        ) ??
        presetRailRef.current?.querySelector<HTMLElement>('button, a[href]')
      const visibleTarget = [
        deckPatternHandleRef.current,
        activeRailPreset,
      ].find((target) => target && target.getClientRects().length > 0)
      visibleTarget?.focus()
    })
  }
  const closePatternBay = () => {
    setPatternBayOpen(false)
    returnFocusToPatternHandle()
  }
  const loadFromPatternBay = (preset: InteractiveLifePreset) => {
    loadPreset(preset)
    returnFocusToPatternHandle()
  }
  const togglePatternBay = () => {
    patternBayOpen ? closePatternBay() : setPatternBayOpen(true)
  }

  return (
    <article
      className={css.cockpit}
      data-running={running ? 'true' : 'false'}
      aria-labelledby='life-engine-title'
      onClickCapture={handleMechanicalClick}
      onPointerDownCapture={handlePointerDown}
      onPointerUpCapture={handlePointerUp}
    >
      <header className={css.crown}>
        <Link url='/' className={css.backKey} aria-label='Back to home'>
          <LinkBack className={css.backKeyControl}>Home</LinkBack>
          <small>Eject</small>
        </Link>

        <div className={css.identityPlate}>
          <span>Conway field instrument</span>
          <h1 id='life-engine-title'>
            Life engine <em>C-70</em>
          </h1>
        </div>

        <div className={css.programPlate}>
          <span>Docked program / {selectedNumber}</span>
          <strong>{seedName}</strong>
        </div>

        <div
          className={css.systemLamp}
          data-running={running ? 'true' : 'false'}
          data-empty={state.cells.size === 0 ? 'true' : 'false'}
        >
          <i aria-hidden='true' />
          <span>System</span>
          <strong>{status}</strong>
        </div>
      </header>

      <div className={css.workbench}>
        <PresetRail
          railRef={presetRailRef}
          loadPreset={loadPreset}
          state={state}
        />
        <section className={css.forwardBay}>
          <CrtAssembly
            canvas={canvas}
            running={running}
            seedName={seedName}
            state={state}
            status={status}
          />
          <PopulationPod state={state} />
        </section>

        <section className={css.controlDeck} aria-label='Simulation controls'>
          <FieldControls
            canvas={canvas}
            playMechanicalSound={playMechanicalSound}
            resetUniverse={resetUniverse}
          />
          <SpeedControl
            playMechanicalSound={playMechanicalSound}
            speed={speed}
            setSpeed={setSpeed}
          />
          <TransportControls
            canvas={canvas}
            clearUniverse={clearUniverse}
            running={running}
            soundEnabled={soundEnabled}
            state={state}
            stepOnce={stepOnce}
            toggleSound={toggleSound}
            toggleRunning={toggleRunning}
          />
          <GridPilot
            canvas={canvas}
            playMechanicalSound={playMechanicalSound}
          />

          <PatternTrigger
            buttonRef={deckPatternHandleRef}
            className={css.patternHandleDeck}
            onToggle={togglePatternBay}
            open={patternBayOpen}
            seedName={seedName}
            selectedNumber={selectedNumber}
          />
        </section>
      </div>

      {patternBayOpen ? (
        <PatternBay
          close={closePatternBay}
          loadPreset={loadFromPatternBay}
          state={state}
        />
      ) : null}
    </article>
  )
}
