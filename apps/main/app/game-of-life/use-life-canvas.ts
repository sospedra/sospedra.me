import { clamp, debounce } from 'es-toolkit'
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { tapHaptic } from 'services/haptics'
import {
  type Camera,
  cameraForBounds,
  cellAtClientPoint,
  drawLifeCanvas,
  keepCellInView,
  panCamera,
  zoomCameraAt,
} from './canvas'
import {
  boundsOf,
  type Cell,
  type CellSet,
  keyOf,
  type LifeState,
  rasterLine,
} from './engine'
import type { LifeAudio, LifeMechanicalSound } from './life-audio'
import type { LifeCanvasUi, LifeTool } from './life-canvas'
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

const INITIAL_CAMERA: Camera = { x: 11, y: 11, zoom: 16 }

const CURSOR_DIRECTIONS: Record<string, Cell> = {
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
}

type LifeCanvasOptions = {
  audio: LifeAudio
  paintCells: (cells: readonly Cell[], alive: boolean) => void
  playMechanicalSound: (kind: LifeMechanicalSound) => void
  running: boolean
  setAnnouncement: (message: string) => void
  state: LifeState
}

export const useLifeCanvas = ({
  audio,
  paintCells,
  playMechanicalSound,
  running,
  setAnnouncement,
  state,
}: LifeCanvasOptions) => {
  const [tool, setTool] = useState<LifeTool>('draw')
  const [camera, setCamera] = useState<Camera>(INITIAL_CAMERA)
  const [hover, setHover] = useState<Cell | null>(null)
  const [cursor, setCursor] = useState<Cell>([11, 11])
  const [canvasFocused, setCanvasFocused] = useState(false)
  const [canvasEpoch, setCanvasEpoch] = useState(0)
  const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef<PointerSession | null>(null)
  const cameraRef = useRef(camera)

  const commitCamera = useCallback((resolve: (current: Camera) => Camera) => {
    setCamera((current) => {
      const next = resolve(current)
      cameraRef.current = next
      return next
    })
  }, [])

  // Thunk defers reading cameraRef until after the zoom state commit.
  const announceSoon = useMemo(
    () => debounce((message: () => string) => setAnnouncement(message()), 350),
    [setAnnouncement],
  )

  useEffect(() => () => announceSoon.cancel(), [announceSoon])

  const bindCanvas = useCallback((node: HTMLCanvasElement | null) => {
    if (canvasRef.current === node) return
    canvasRef.current = node
    pointerRef.current = null
    setHover(null)
    setCanvasFocused(false)
    setCanvasNode(node)
  }, [])

  const fitCells = useCallback(
    (cells: CellSet) => {
      const canvas = canvasRef.current
      if (!canvas) return
      commitCamera(() => cameraForBounds(canvas, boundsOf(cells)))
    },
    [commitCamera],
  )

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
      const delta = clamp(event.deltaY * deltaUnit, -240, 240)
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

  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.button !== 1 && event.button !== 2) return
    const canvas = event.currentTarget
    canvas.focus({ preventScroll: true })
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
    tapHaptic()
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
    tapHaptic()
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

    const direction = CURSOR_DIRECTIONS[event.key]
    if (direction) {
      event.preventDefault()
      const next: Cell = [cursor[0] + direction[0], cursor[1] + direction[1]]
      setCursor(next)
      announceSoon(() => `x ${next[0]}, y ${next[1]}`)

      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        commitCamera((current) => keepCellInView(current, rect, next))
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
      announceSoon(() => `zoom ${Math.round(cameraRef.current.zoom)}x`)
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      playMechanicalSound('key')
      zoomBy(1 / 1.2)
      announceSoon(() => `zoom ${Math.round(cameraRef.current.zoom)}x`)
    }
  }

  const coordinateText = hover
    ? `x ${hover[0]} / y ${hover[1]}`
    : canvasFocused
      ? `cursor x ${cursor[0]} / y ${cursor[1]}`
      : 'infinite plane'

  const canvas: LifeCanvasUi = {
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
      'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight Enter + -',
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
  }

  return { canvas, fitCells, setCursor }
}
