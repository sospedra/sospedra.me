import type React from 'react'
import { tapHaptic } from 'services/haptics'
import { match, P } from 'ts-pattern'
import { floodFill } from './fill.ts'
import {
  handleAt,
  handleTolerance,
  insideRect,
  type Point,
  type Rect,
  rectFromPoints,
} from './geometry.ts'
import type { Snapshot } from './history.ts'
import type { Magnification } from './options.ts'
import {
  clone,
  dashedRect,
  freehandSegment,
  inkColor,
  renderCurve,
  renderSelection,
  renderShape,
  shapeStyle,
} from './paint-render.ts'
import type { Rgba } from './palette.ts'
import {
  type Bitmap,
  drawPolygon,
  getPixel,
  scaleNearest,
  spray,
} from './raster.ts'
import {
  type Button,
  type PaintEvent,
  type PaintState,
  prospectiveSize,
  resizeRect,
  type Size,
} from './state.ts'
import { toolById } from './tools.ts'

export type PointerBindings = {
  onPointerDown: React.PointerEventHandler<HTMLCanvasElement>
  onPointerMove: React.PointerEventHandler<HTMLCanvasElement>
  onPointerUp: React.PointerEventHandler<HTMLCanvasElement>
  onPointerCancel: React.PointerEventHandler<HTMLCanvasElement>
  onPointerLeave: React.PointerEventHandler<HTMLCanvasElement>
  onDoubleClick: React.MouseEventHandler<HTMLCanvasElement>
  onContextMenu: React.MouseEventHandler<HTMLCanvasElement>
}

const SPRAY_MS = 50

const hexOf = (pixel: Rgba): string =>
  `#${[pixel[0], pixel[1], pixel[2]]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`

export const createPointerGestures = ({
  anchorFloat,
  bitmapRef,
  blit,
  clearOverlay,
  dispatch,
  drawOverlay,
  drawSelection,
  floatRef,
  lastPointRef,
  lastZoomRef,
  liftIfNeeded,
  mutate,
  mutateWhen,
  paintOverlay,
  pointerIdRef,
  pushHistory,
  resizeCanvasTo,
  send,
  setHover,
  sprayTimerRef,
  stateRef,
  stopSpray,
  strokeUndoRef,
  transparencyKey,
}: {
  anchorFloat: () => void
  bitmapRef: React.RefObject<Bitmap | null>
  blit: () => void
  clearOverlay: () => void
  dispatch: React.Dispatch<PaintEvent>
  drawOverlay: (at: Point) => void
  drawSelection: (rect: Rect, handles: boolean) => void
  floatRef: React.RefObject<Bitmap | null>
  lastPointRef: React.RefObject<Point>
  lastZoomRef: React.RefObject<Magnification>
  liftIfNeeded: (rect: Rect) => void
  mutate: (change: (bitmap: Bitmap) => void) => void
  mutateWhen: (change: (bitmap: Bitmap) => boolean) => boolean
  paintOverlay: (render: (scratch: Bitmap) => void) => void
  pointerIdRef: React.RefObject<number | null>
  pushHistory: (before: Snapshot) => void
  resizeCanvasTo: (target: Size) => void
  send: (event: PaintEvent) => void
  setHover: (point: Point | null) => void
  sprayTimerRef: React.RefObject<number | null>
  stateRef: React.RefObject<PaintState>
  stopSpray: () => void
  strokeUndoRef: React.RefObject<Snapshot | null>
  transparencyKey: () => Rgba | undefined
}) => {
  const startSpray = (button: Button) => {
    const captured = stateRef.current
    const color = inkColor(captured, button)
    const size = captured.options.airbrushSize
    const burst = () => {
      const bitmap = bitmapRef.current
      if (!bitmap) return
      spray(bitmap, lastPointRef.current, { size, color, rng: Math.random })
      blit()
    }
    burst()
    sprayTimerRef.current = window.setInterval(burst, SPRAY_MS)
  }

  const applyPoint = (state: PaintState, at: Point, button: Button) => {
    const bitmap = bitmapRef.current
    if (!bitmap) return
    if (state.tool === 'fill') {
      const changed = mutateWhen((target) =>
        floodFill(target, at, inkColor(state, button)),
      )
      if (changed) {
        tapHaptic()
        dispatch({ type: 'commit' })
      }
      return
    }
    if (state.tool === 'pick') {
      const pixel = getPixel(bitmap, at.x, at.y)
      if (!pixel) return
      dispatch({
        type: 'color',
        slot: button === 'right' ? 'bg' : 'fg',
        color: hexOf(pixel),
      })
      return
    }
    const level =
      button === 'right' || state.zoom !== 1 ? 1 : lastZoomRef.current
    dispatch({ type: 'zoom', level })
  }

  const applyDown = (state: PaintState, at: Point, button: Button) => {
    const kind = toolById[state.tool].kind
    lastPointRef.current = at
    if (kind === 'point') {
      applyPoint(state, at, button)
      return
    }
    if (kind === 'freehand') {
      const bitmap = bitmapRef.current
      if (!bitmap) return
      strokeUndoRef.current = clone(bitmap)
      if (state.tool === 'airbrush') {
        startSpray(button)
        return
      }
      freehandSegment(bitmap, state, at, at, button)
      blit()
      return
    }
    if (kind === 'shape') drawOverlay(at)
  }

  const movingRect = (
    mode: Extract<PaintState['mode'], { kind: 'movingSelection' }>,
    at: Point,
  ): Rect => ({
    ...mode.rect,
    x: mode.rect.x + at.x - mode.grip.x,
    y: mode.rect.y + at.y - mode.grip.y,
  })

  const applyMove = (state: PaintState, at: Point) => {
    const mode = state.mode
    if (mode.kind === 'freehand') {
      const bitmap = bitmapRef.current
      if (!bitmap) return
      if (state.tool !== 'airbrush') {
        freehandSegment(bitmap, state, mode.last, at, mode.button)
        blit()
      }
      lastPointRef.current = at
      return
    }
    if (mode.kind === 'movingSelection') {
      drawSelection(movingRect(mode, at), false)
      return
    }
    if (mode.kind === 'resizingSelection') {
      paintOverlay((scratch) => {
        renderSelection(scratch, mode.rect, floatRef.current, {
          handles: false,
          skip: transparencyKey(),
        })
        dashedRect(scratch, resizeRect(mode.rect, mode.handle, at))
      })
      return
    }
    const previews =
      mode.kind === 'selecting' ||
      mode.kind === 'shaping' ||
      mode.kind === 'polygon' ||
      (mode.kind === 'curving' && mode.dragging)
    if (previews) drawOverlay(at)
  }

  const applyUp = (state: PaintState, at: Point) => {
    const mode = state.mode
    if (mode.kind === 'freehand') {
      stopSpray()
      const before = strokeUndoRef.current
      strokeUndoRef.current = null
      if (before) pushHistory(before)
      return
    }
    if (mode.kind === 'shaping') {
      mutate((bitmap) => {
        renderShape(bitmap, state, mode.from, at, mode.button)
      })
      clearOverlay()
      return
    }
    if (mode.kind === 'curving' && mode.phase === 'c2' && mode.dragging) {
      mutate((bitmap) => {
        renderCurve(bitmap, state, { ...mode, c2: at }, 'left')
      })
      clearOverlay()
      return
    }
    if (mode.kind === 'selecting') {
      const rect = rectFromPoints(mode.from, mode.to)
      if (rect.width === 1 && rect.height === 1) clearOverlay()
      else drawSelection(rect, true)
      return
    }
    if (mode.kind === 'movingSelection') {
      drawSelection(mode.rect, true)
      return
    }
    if (mode.kind === 'resizingSelection') {
      const rect = resizeRect(mode.rect, mode.handle, mode.to)
      const float = floatRef.current
      if (float) {
        floatRef.current = scaleNearest(float, rect.width, rect.height)
      }
      drawSelection(rect, true)
      return
    }
    if (mode.kind === 'resizingCanvas') {
      resizeCanvasTo(prospectiveSize(state.size, mode))
    }
  }

  const applyDoubleClick = (state: PaintState) => {
    const mode = state.mode
    if (mode.kind !== 'polygon' || mode.points.length < 2) return
    mutate((bitmap) => {
      drawPolygon(bitmap, mode.points, shapeStyle(state, mode.button))
    })
    clearOverlay()
  }

  const applyEffects = (state: PaintState, event: PaintEvent) =>
    match(event)
      .with({ type: 'down' }, (event) =>
        applyDown(state, event.at, event.button),
      )
      .with({ type: 'move' }, ({ at }) => applyMove(state, at))
      .with({ type: 'up' }, ({ at }) => applyUp(state, at))
      .with({ type: 'dblclick' }, () => applyDoubleClick(state))
      .with({ type: P.union('tool', 'cancel') }, () => {
        anchorFloat()
        stopSpray()
        strokeUndoRef.current = null
        clearOverlay()
      })
      .otherwise(() => undefined)

  const bitmapPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const zoom = stateRef.current.zoom
    return {
      x: Math.floor(event.nativeEvent.offsetX / zoom),
      y: Math.floor(event.nativeEvent.offsetY / zoom),
    }
  }

  const routeDown = (at: Point, button: Button) => {
    const captured = stateRef.current
    if (captured.mode.kind === 'selected') {
      if (captured.tool === 'select') {
        const rect = captured.mode.rect
        const handle = handleAt(rect, at, handleTolerance(captured.zoom))
        if (handle) {
          liftIfNeeded(rect)
          send({ type: 'grab-handle', handle, at })
          return
        }
        if (insideRect(rect, at)) {
          liftIfNeeded(rect)
          send({ type: 'grab', at })
          return
        }
      }
      anchorFloat()
      dispatch({ type: 'deselect' })
    }
    send({ type: 'down', at, button })
  }

  const pointerHandlers: PointerBindings = {
    onPointerDown: (event) => {
      if (event.button !== 0 && event.button !== 2) return
      if (pointerIdRef.current !== null) return
      pointerIdRef.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      routeDown(bitmapPoint(event), event.button === 2 ? 'right' : 'left')
    },
    onPointerMove: (event) => {
      const at = bitmapPoint(event)
      setHover(at)
      if (pointerIdRef.current !== event.pointerId) return
      send({ type: 'move', at })
    },
    onPointerUp: (event) => {
      if (pointerIdRef.current !== event.pointerId) return
      pointerIdRef.current = null
      tapHaptic()
      send({ type: 'up', at: bitmapPoint(event) })
    },
    onPointerCancel: (event) => {
      if (pointerIdRef.current !== event.pointerId) return
      pointerIdRef.current = null
      send({ type: 'cancel' })
    },
    onPointerLeave: () => setHover(null),
    onDoubleClick: () => send({ type: 'dblclick' }),
    onContextMenu: (event) => event.preventDefault(),
  }

  return { applyEffects, pointerHandlers }
}
