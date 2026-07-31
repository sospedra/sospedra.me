'use client'

import Shell from 'components/Shell'
import { readLocal, writeLocal } from 'lib/storage'
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { useGameInput } from 'service/hotkeys'
import {
  type Camera,
  cameraForBounds,
  cellAtClientPoint,
  drawLifeCanvas,
  panCamera,
  zoomCameraAt,
} from './canvas'
import {
  boundsOf,
  type Cell,
  type CellSet,
  createLifeState,
  keyOf,
  lifeReducer,
  rasterLine,
} from './engine'
import css from './game-of-life.module.css'
import { createLifeAudio, type LifeMechanicalSound } from './life-audio'
import { LifeLayout, type LifeTool } from './life-layouts'
import {
  DEFAULT_PRESET,
  type InteractiveLifePreset,
  LIFE_PRESETS,
} from './presets'
import { LIFE_CANVAS_PALETTE } from './themes'

type PointerSession =
  | {
      kind: 'draw'
      id: number
      alive: boolean
      last: Cell
      visited: Set<string>
    }
  | {
      kind: 'move'
      id: number
      clientX: number
      clientY: number
    }

const DEFAULT_SPEED = 8
const LIFE_SOUND_KEY = 'game-of-life-sound-v2'
const INITIAL_CAMERA: Camera = { x: 11, y: 11, zoom: 16 }
const COMPACT_PRESET_MEDIA =
  '(max-width: 45rem), (max-width: 59.99rem) and (max-height: 32rem) and (orientation: landscape)'

export default function GameOfLifeView() {
  const [state, dispatch] = useReducer(
    lifeReducer,
    createLifeState(DEFAULT_PRESET.cells, DEFAULT_PRESET.id),
  )
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [patternBayOpen, setPatternBayOpen] = useState(false)
  const [tool, setTool] = useState<LifeTool>('draw')
  const [camera, setCamera] = useState<Camera>(INITIAL_CAMERA)
  const [hover, setHover] = useState<Cell | null>(null)
  const [cursor, setCursor] = useState<Cell>([11, 11])
  const [canvasFocused, setCanvasFocused] = useState(false)
  const [canvasEpoch, setCanvasEpoch] = useState(0)
  const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null)
  const [announcement, setAnnouncement] = useState(
    `${DEFAULT_PRESET.title} loaded. ${DEFAULT_PRESET.cells.size} live cells.`,
  )
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef<PointerSession | null>(null)
  const cameraRef = useRef(camera)
  const [audio] = useState(createLifeAudio)
  useGameInput()

  const playMechanicalSound = useCallback(
    (kind: LifeMechanicalSound) => audio.play(kind),
    [audio],
  )

  const commitCamera = useCallback((resolve: (current: Camera) => Camera) => {
    setCamera((current) => {
      const next = resolve(current)
      cameraRef.current = next
      return next
    })
  }, [])

  const bindCanvas = useCallback((node: HTMLCanvasElement | null) => {
    if (canvasRef.current === node) return
    canvasRef.current = node
    pointerRef.current = null
    setHover(null)
    setCanvasFocused(false)
    setCanvasNode(node)
  }, [])

  const selectedPreset = useMemo(
    () => LIFE_PRESETS.find((preset) => preset.id === state.presetId),
    [state.presetId],
  )
  const seedName = selectedPreset?.title ?? 'Custom seed'
  const status =
    state.cells.size === 0
      ? state.generation > 0
        ? 'Extinct'
        : 'Field empty'
      : running
        ? 'Running'
        : state.generation === 0
          ? 'Seed ready'
          : 'Paused'

  const fitCells = useCallback(
    (cells: CellSet) => {
      const canvas = canvasRef.current
      if (!canvas) return
      commitCamera(() => cameraForBounds(canvas, boundsOf(cells)))
    },
    [commitCamera],
  )

  const loadPreset = useCallback(
    (preset: InteractiveLifePreset) => {
      setRunning(false)
      setPatternBayOpen(false)
      dispatch({ type: 'load', cells: preset.cells, presetId: preset.id })
      const bounds = boundsOf(preset.cells)
      setCursor([
        Math.floor((bounds.minX + bounds.maxX) / 2),
        Math.floor((bounds.minY + bounds.maxY) / 2),
      ])
      setAnnouncement(
        `${preset.title} loaded. ${preset.cells.size} live cells.`,
      )
      requestAnimationFrame(() => fitCells(preset.cells))
    },
    [fitCells],
  )

  const toggleRunning = useCallback(() => {
    if (state.cells.size === 0) {
      setAnnouncement('The field is empty. Draw a seed or load a preset first.')
      return
    }
    const next = !running
    audio.play('switch')
    audio.setRunning(next, speed)
    setRunning(next)
    setAnnouncement(next ? 'Simulation running.' : 'Simulation paused.')
  }, [audio, running, speed, state.cells.size])

  const toggleSound = useCallback(() => {
    const next = !soundEnabled
    setSoundEnabled(next)
    audio.setEnabled(next)
    writeLocal(LIFE_SOUND_KEY, next ? 'on' : 'off')
    if (next) {
      audio.play('key')
      if (running) audio.setRunning(true, speed)
    }
    setAnnouncement(`Mechanical audio ${next ? 'on' : 'off'}.`)
  }, [audio, running, soundEnabled, speed])

  const stepOnce = useCallback(() => {
    if (state.cells.size === 0) {
      setAnnouncement('The field is empty. Draw a seed or load a preset first.')
      return
    }
    setRunning(false)
    dispatch({ type: 'step' })
    setAnnouncement('Advanced one generation.')
  }, [state.cells.size])

  const resetUniverse = useCallback(() => {
    setRunning(false)
    dispatch({ type: 'reset' })
    setAnnouncement('Seed restored to generation zero.')
  }, [])

  const clearUniverse = useCallback(() => {
    setRunning(false)
    dispatch({ type: 'clear' })
    setAnnouncement('Field cleared. Draw a new seed.')
  }, [])

  const paintCells = useCallback((cells: readonly Cell[], alive: boolean) => {
    setRunning(false)
    dispatch({ type: 'paint', cells, alive })
  }, [])

  const paintDragCells = useCallback(
    (
      session: Extract<PointerSession, { kind: 'draw' }>,
      cells: readonly Cell[],
    ) => {
      const changed: Cell[] = []

      for (const cell of cells) {
        const key = keyOf(...cell)
        if (session.visited.has(key)) continue
        session.visited.add(key)
        if (state.cells.has(key) === session.alive) continue
        changed.push(cell)
      }

      if (changed.length === 0) return
      audio.playCells(session.alive, changed.length)
      paintCells(changed, session.alive)
    },
    [audio, paintCells, state.cells],
  )

  const zoomBy = useCallback(
    (factor: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      commitCamera((current) => {
        const next = zoomCameraAt(
          canvas,
          current,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          current.zoom * factor,
        )
        return next.zoom === current.zoom ? current : next
      })
    },
    [commitCamera],
  )

  const panBy = useCallback(
    (screenX: number, screenY: number) => {
      commitCamera((current) => panCamera(current, -screenX, -screenY))
    },
    [commitCamera],
  )

  useEffect(() => {
    if (readLocal(LIFE_SOUND_KEY) !== 'off') return
    setSoundEnabled(false)
    audio.setEnabled(false)
  }, [audio])

  useEffect(() => {
    audio.setEnabled(soundEnabled)
    audio.setRunning(running, speed)
  }, [audio, running, soundEnabled, speed])

  useEffect(() => () => audio.dispose(), [audio])

  useEffect(() => {
    const frame = requestAnimationFrame(() => fitCells(DEFAULT_PRESET.cells))
    return () => cancelAnimationFrame(frame)
  }, [fitCells])

  useEffect(() => {
    if (!running) return
    const clock = window.setInterval(
      () => dispatch({ type: 'step' }),
      1000 / speed,
    )
    return () => window.clearInterval(clock)
  }, [running, speed])

  useEffect(() => {
    if (!running || state.generation === 0 || state.cells.size > 0) return
    setRunning(false)
    setAnnouncement(`The universe went dark at generation ${state.generation}.`)
  }, [running, state.cells.size, state.generation])

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (!document.hidden) return
      setRunning(false)
    }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () =>
      document.removeEventListener('visibilitychange', pauseWhenHidden)
  }, [])

  useEffect(() => {
    if (!canvasNode) return
    const observer = new ResizeObserver(() =>
      setCanvasEpoch((epoch) => epoch + 1),
    )
    observer.observe(canvasNode)
    return () => observer.disconnect()
  }, [canvasNode])

  useEffect(() => {
    if (!canvasNode) return
    // ResizeObserver increments this token so the backing store is redrawn.
    void canvasEpoch
    drawLifeCanvas(canvasNode, {
      births: state.births,
      camera,
      cells: state.cells,
      cursor,
      hover,
      palette: LIFE_CANVAS_PALETTE,
      running,
      showCursor: canvasFocused,
    })
  }, [
    camera,
    canvasEpoch,
    canvasNode,
    canvasFocused,
    cursor,
    hover,
    running,
    state.births,
    state.cells,
  ])

  useEffect(() => {
    cameraRef.current = camera
  }, [camera])

  useEffect(() => {
    if (!canvasNode) return

    const handleWheel = (event: globalThis.WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.5) return

      const deltaUnit =
        event.deltaMode === globalThis.WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === globalThis.WheelEvent.DOM_DELTA_PAGE
            ? canvasNode.clientHeight
            : 1
      const delta = Math.max(-240, Math.min(240, event.deltaY * deltaUnit))
      if (delta === 0) return

      const current = cameraRef.current
      const next = zoomCameraAt(
        canvasNode,
        current,
        event.clientX,
        event.clientY,
        current.zoom * Math.exp(-delta * 0.0015),
      )

      // At either zoom limit, release outward scrolling back to the page.
      if (next.zoom === current.zoom) return

      event.preventDefault()
      commitCamera(() => next)
    }

    canvasNode.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvasNode.removeEventListener('wheel', handleWheel)
  }, [canvasNode, commitCamera])

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (event.key === 'Escape' && patternBayOpen) {
        event.preventDefault()
        playMechanicalSound('key')
        setPatternBayOpen(false)
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('button, a, input, select, textarea, [contenteditable]')
      ) {
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        toggleRunning()
      } else if (event.key === '.') {
        event.preventDefault()
        playMechanicalSound('key')
        stepOnce()
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        playMechanicalSound('key')
        resetUniverse()
      } else if (event.key.toLowerCase() === 'c') {
        event.preventDefault()
        playMechanicalSound('key')
        clearUniverse()
      } else if (event.key.toLowerCase() === 'd') {
        playMechanicalSound('lever')
        setTool('draw')
      } else if (event.key.toLowerCase() === 'm') {
        playMechanicalSound('lever')
        setTool('move')
      } else if (event.key.toLowerCase() === 'f') {
        playMechanicalSound('knob')
        fitCells(state.cells)
      } else if (event.key.toLowerCase() === 'p') {
        event.preventDefault()
        playMechanicalSound('key')
        if (window.matchMedia(COMPACT_PRESET_MEDIA).matches) {
          setPatternBayOpen((current) => !current)
        } else {
          setPatternBayOpen(false)
          requestAnimationFrame(() => {
            const rail = document.querySelector<HTMLElement>('#preset-rail')
            const target =
              rail?.querySelector<HTMLElement>('[aria-current="true"]') ??
              rail?.querySelector<HTMLElement>('button, a[href]')
            target?.focus()
          })
        }
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [
    clearUniverse,
    fitCells,
    playMechanicalSound,
    resetUniverse,
    patternBayOpen,
    state.cells,
    stepOnce,
    toggleRunning,
  ])

  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.button !== 1 && event.button !== 2) return
    const canvas = event.currentTarget
    canvas.focus()
    canvas.setPointerCapture(event.pointerId)

    const move =
      tool === 'move' ||
      event.button === 1 ||
      event.button === 2 ||
      event.altKey
    if (move) {
      pointerRef.current = {
        kind: 'move',
        id: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      }
      return
    }

    const cell = cellAtClientPoint(canvas, camera, event.clientX, event.clientY)
    const alive = !state.cells.has(keyOf(...cell))
    const session: Extract<PointerSession, { kind: 'draw' }> = {
      kind: 'draw',
      id: event.pointerId,
      alive,
      last: cell,
      visited: new Set(),
    }
    pointerRef.current = session
    setCursor(cell)
    paintDragCells(session, [cell])
    setAnnouncement(alive ? 'Drawing live cells.' : 'Erasing live cells.')
  }

  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const session = pointerRef.current
    if (!session || session.id !== event.pointerId) {
      setHover(
        cellAtClientPoint(
          event.currentTarget,
          camera,
          event.clientX,
          event.clientY,
        ),
      )
      return
    }

    if (session.kind === 'move') {
      const deltaX = event.clientX - session.clientX
      const deltaY = event.clientY - session.clientY
      session.clientX = event.clientX
      session.clientY = event.clientY
      commitCamera((current) => panCamera(current, deltaX, deltaY))
      return
    }

    const cell = cellAtClientPoint(
      event.currentTarget,
      camera,
      event.clientX,
      event.clientY,
    )
    if (cell[0] === session.last[0] && cell[1] === session.last[1]) return
    const line = rasterLine(session.last, cell)
    session.last = cell
    setCursor(cell)
    paintDragCells(session, line)
  }

  const pointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointerRef.current?.id !== event.pointerId) return
    pointerRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const keyCanvas = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    const directions: Record<string, Cell> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    }
    const direction = directions[event.key]
    if (direction) {
      event.preventDefault()
      const next: Cell = [cursor[0] + direction[0], cursor[1] + direction[1]]
      setCursor(next)

      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        commitCamera((current) => {
          const halfWidth = rect.width / (2 * current.zoom)
          const halfHeight = rect.height / (2 * current.zoom)
          const marginX = Math.min(2, halfWidth * 0.4)
          const marginY = Math.min(2, halfHeight * 0.4)
          const cellX = next[0] + 0.5
          const cellY = next[1] + 0.5
          let x = current.x
          let y = current.y

          if (cellX < current.x - halfWidth + marginX) {
            x = cellX + halfWidth - marginX
          } else if (cellX > current.x + halfWidth - marginX) {
            x = cellX - halfWidth + marginX
          }
          if (cellY < current.y - halfHeight + marginY) {
            y = cellY + halfHeight - marginY
          } else if (cellY > current.y + halfHeight - marginY) {
            y = cellY - halfHeight + marginY
          }

          return x === current.x && y === current.y
            ? current
            : { ...current, x, y }
        })
      }
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const alive = !state.cells.has(keyOf(...cursor))
      audio.playCells(alive)
      paintCells([cursor], alive)
      setAnnouncement(alive ? 'Keyboard cell placed.' : 'Keyboard cell erased.')
      return
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      playMechanicalSound('key')
      zoomBy(1.2)
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      playMechanicalSound('key')
      zoomBy(1 / 1.2)
    }
  }

  const coordinateText = hover
    ? `x ${hover[0]} / y ${hover[1]}`
    : canvasFocused
      ? `cursor x ${cursor[0]} / y ${cursor[1]}`
      : 'infinite plane'

  return (
    <Shell className={`relative w-full ${css.page}`} shellClassName={css.shell}>
      <LifeLayout
        state={state}
        running={running}
        speed={speed}
        status={status}
        seedName={seedName}
        patternBayOpen={patternBayOpen}
        loadPreset={loadPreset}
        toggleRunning={toggleRunning}
        stepOnce={stepOnce}
        resetUniverse={resetUniverse}
        clearUniverse={clearUniverse}
        playMechanicalSound={playMechanicalSound}
        unlockAudio={audio.unlock}
        setSpeed={setSpeed}
        setPatternBayOpen={setPatternBayOpen}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        canvas={{
          bind: bindCanvas,
          tool,
          coordinateText,
          zoom: camera.zoom,
          zoomText: `${Math.round(camera.zoom)} px / cell`,
          setTool,
          zoomBy,
          panBy,
          fit: () => fitCells(state.cells),
          props: {
            tabIndex: 0,
            'aria-label': 'Infinite Game of Life canvas',
            'aria-describedby': 'life-canvas-help',
            'aria-keyshortcuts':
              'ArrowUp ArrowDown ArrowLeft ArrowRight Enter + -',
            onBlur: () => setCanvasFocused(false),
            onContextMenu: (event) => event.preventDefault(),
            onFocus: () => setCanvasFocused(true),
            onKeyDown: keyCanvas,
            onPointerCancel: pointerEnd,
            onPointerDown: pointerDown,
            onPointerLeave: () => {
              if (!pointerRef.current) setHover(null)
            },
            onPointerMove: pointerMove,
            onPointerUp: pointerEnd,
          },
        }}
      />
      <p id='life-canvas-help' className='sr-only'>
        Drag to paint or erase cells. Right-drag to pan. Use the mousewheel or
        plus and minus keys to zoom. Hold a physical plus or minus control for
        continuous zoom. Press Space to play or pause, period to step, R to
        reset, and P to move to the preset library. When the canvas is focused,
        use the arrow keys to move the cell cursor and Enter to toggle that
        cell. On a touchscreen, tap to draw and choose Slew to move around the
        field. The Field Slew control also moves the grid: press and hold its
        knob, then drag with a mouse or finger.
      </p>
      <p className='sr-only' role='status' aria-live='polite'>
        {announcement}
      </p>
    </Shell>
  )
}
