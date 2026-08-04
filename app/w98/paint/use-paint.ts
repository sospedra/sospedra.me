import type React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { match, P } from 'ts-pattern'
import { openPng, savePng } from './file-io.ts'
import { floodFill } from './fill.ts'
import {
  clipRect,
  handleAt,
  handlePoints,
  handleTolerance,
  insideRect,
  type Point,
  type Rect,
  rectFromPoints,
} from './geometry.ts'
import { createHistory, push, redo, type Snapshot, undo } from './history.ts'
import type { Magnification } from './options.ts'
import { type Rgba, toRgba } from './palette.ts'
import {
  type Bitmap,
  brushStroke,
  createBitmap,
  drawCurve,
  drawEllipse,
  drawLine,
  drawPolygon,
  drawRect,
  drawRoundedRect,
  getPixel,
  type ShapeStyle,
  scaleNearest,
  setPixel,
  spray,
} from './raster.ts'
import { fillRect, lift, stamp } from './selection.ts'
import {
  type Button,
  INITIAL_HEIGHT,
  INITIAL_PAINT,
  INITIAL_WIDTH,
  type Nub,
  type PaintEvent,
  type PaintState,
  prospectiveSize,
  reduce,
  resizeRect,
  type Size,
} from './state.ts'
import { type ToolId, toolById } from './tools.ts'

const SPRAY_MS = 50

const MARQUEE_DARK: Rgba = [0, 0, 0, 255]
const MARQUEE_LIGHT: Rgba = [255, 255, 255, 255]
const HANDLE_INK: Rgba = [0, 0, 128, 255]

const hexOf = (pixel: Rgba): string =>
  `#${[pixel[0], pixel[1], pixel[2]]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`

const clone = (bitmap: Bitmap): Snapshot => ({
  data: bitmap.data.slice(),
  width: bitmap.width,
  height: bitmap.height,
})

const emptyOverlay = (width: number, height: number): Bitmap => ({
  data: new Uint8ClampedArray(width * height * 4),
  width,
  height,
})

const inkColor = (state: PaintState, button: Button): Rgba =>
  toRgba(button === 'right' ? state.bg : state.fg)

const shapeStyle = (state: PaintState, button: Button): ShapeStyle => {
  const main = inkColor(state, button)
  const other = toRgba(button === 'right' ? state.fg : state.bg)
  if (state.options.fillStyle === 'outline') return { stroke: main }
  if (state.options.fillStyle === 'both') return { stroke: main, fill: other }
  return { fill: main }
}

const freehandSegment = (
  bitmap: Bitmap,
  state: PaintState,
  from: Point,
  to: Point,
  button: Button,
): void => {
  const color = inkColor(state, button)
  if (state.tool === 'pencil') {
    drawLine(bitmap, from, to, { color, size: 1 })
    return
  }
  if (state.tool === 'brush') {
    brushStroke(bitmap, from, to, { ...state.options.brush, color })
    return
  }
  if (state.tool === 'eraser') {
    brushStroke(bitmap, from, to, {
      shape: 'square',
      size: state.options.eraserSize,
      color: toRgba(state.bg),
    })
  }
}

const renderShape = (
  bitmap: Bitmap,
  state: PaintState,
  from: Point,
  to: Point,
  button: Button,
): void => {
  const style = shapeStyle(state, button)
  if (state.tool === 'line') {
    drawLine(bitmap, from, to, {
      color: inkColor(state, button),
      size: state.options.strokeSize,
    })
    return
  }
  if (state.tool === 'rect') drawRect(bitmap, from, to, style)
  if (state.tool === 'ellipse') drawEllipse(bitmap, from, to, style)
  if (state.tool === 'rrect') drawRoundedRect(bitmap, from, to, style)
}

const renderCurve = (
  bitmap: Bitmap,
  state: PaintState,
  spec: { from: Point; to: Point; c1?: Point; c2?: Point },
  button: Button,
): void => {
  const c1 = spec.c1 ?? spec.from
  drawCurve(bitmap, {
    from: spec.from,
    to: spec.to,
    c1,
    c2: spec.c2 ?? c1,
    color: inkColor(state, button),
    size: state.options.strokeSize,
  })
}

const dashedRect = (scratch: Bitmap, rect: Rect): void => {
  const x1 = rect.x + rect.width - 1
  const y1 = rect.y + rect.height - 1
  const plot = (x: number, y: number) =>
    setPixel(scratch, x, y, (x + y) % 4 < 2 ? MARQUEE_DARK : MARQUEE_LIGHT)
  for (let x = rect.x; x <= x1; x++) {
    plot(x, rect.y)
    plot(x, y1)
  }
  for (let y = rect.y; y <= y1; y++) {
    plot(rect.x, y)
    plot(x1, y)
  }
}

const drawHandles = (scratch: Bitmap, rect: Rect): void => {
  for (const [, point] of handlePoints(rect)) {
    fillRect(
      scratch,
      { x: point.x - 1, y: point.y - 1, width: 3, height: 3 },
      HANDLE_INK,
    )
  }
}

type SelectionLook = { handles: boolean; skip?: Rgba }

const renderSelection = (
  scratch: Bitmap,
  rect: Rect,
  float: Bitmap | null,
  look: SelectionLook,
): void => {
  if (float) {
    stamp(
      scratch,
      float,
      { x: rect.x, y: rect.y },
      look.skip ? { skip: look.skip } : {},
    )
  }
  dashedRect(scratch, rect)
  if (look.handles) drawHandles(scratch, rect)
}

const renderPreview = (scratch: Bitmap, state: PaintState, at: Point): void => {
  const mode = state.mode
  if (mode.kind === 'selecting') {
    dashedRect(scratch, rectFromPoints(mode.from, at))
    return
  }
  if (mode.kind === 'shaping') {
    renderShape(scratch, state, mode.from, at, mode.button)
    return
  }
  if (mode.kind === 'polygon') {
    const color = inkColor(state, mode.button)
    for (let i = 0; i + 1 < mode.points.length; i++) {
      drawLine(scratch, mode.points[i], mode.points[i + 1], { color, size: 1 })
    }
    const last = mode.points.at(-1)
    if (last) drawLine(scratch, last, at, { color, size: 1 })
    return
  }
  if (mode.kind !== 'curving') return
  if (mode.phase === 'line') {
    drawLine(scratch, mode.from, at, {
      color: inkColor(state, 'left'),
      size: state.options.strokeSize,
    })
    return
  }
  const spec =
    mode.phase === 'c1'
      ? { from: mode.from, to: mode.to, c1: at }
      : { from: mode.from, to: mode.to, c1: mode.c1, c2: at }
  renderCurve(scratch, state, spec, 'left')
}

export type PointerBindings = {
  onPointerDown: React.PointerEventHandler<HTMLCanvasElement>
  onPointerMove: React.PointerEventHandler<HTMLCanvasElement>
  onPointerUp: React.PointerEventHandler<HTMLCanvasElement>
  onPointerCancel: React.PointerEventHandler<HTMLCanvasElement>
  onPointerLeave: React.PointerEventHandler<HTMLCanvasElement>
  onDoubleClick: React.MouseEventHandler<HTMLCanvasElement>
  onContextMenu: React.MouseEventHandler<HTMLCanvasElement>
}

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

export const usePaint = () => {
  const [state, dispatch] = useReducer(reduce, INITIAL_PAINT)
  const stateRef = useRef(state)
  const bitmapRef = useRef<Bitmap | null>(null)
  const scratchRef = useRef<Bitmap | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const historyRef = useRef(createHistory())
  const strokeUndoRef = useRef<Snapshot | null>(null)
  const floatRef = useRef<Bitmap | null>(null)
  const clipboardRef = useRef<Bitmap | null>(null)
  const lastPointRef = useRef<Point>({ x: 0, y: 0 })
  const sprayTimerRef = useRef<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const lastZoomRef = useRef<Magnification>(2)
  const [hover, setHover] = useState<Point | null>(null)

  useEffect(() => {
    stateRef.current = state
  })

  const blit = () => {
    const bitmap = bitmapRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!bitmap || !ctx) return
    ctx.putImageData(
      new ImageData(bitmap.data, bitmap.width, bitmap.height),
      0,
      0,
    )
  }

  const clearOverlay = () => {
    const overlay = overlayRef.current
    overlay?.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height)
  }

  const paintOverlay = (render: (scratch: Bitmap) => void) => {
    const scratch = scratchRef.current
    const ctx = overlayRef.current?.getContext('2d')
    if (!scratch || !ctx) return
    scratch.data.fill(0)
    render(scratch)
    ctx.putImageData(
      new ImageData(scratch.data, scratch.width, scratch.height),
      0,
      0,
    )
  }

  const drawOverlay = (at: Point) =>
    paintOverlay((scratch) => renderPreview(scratch, stateRef.current, at))

  const transparencyKey = (): Rgba | undefined => {
    const captured = stateRef.current
    if (captured.options.selectMode !== 'transparent') return undefined
    return toRgba(captured.bg)
  }

  const drawSelection = (rect: Rect, handles: boolean) =>
    paintOverlay((scratch) =>
      renderSelection(scratch, rect, floatRef.current, {
        handles,
        skip: transparencyKey(),
      }),
    )

  const stopSpray = () => {
    if (sprayTimerRef.current !== null) {
      window.clearInterval(sprayTimerRef.current)
      sprayTimerRef.current = null
    }
  }

  useEffect(
    () => () => {
      if (sprayTimerRef.current !== null) {
        window.clearInterval(sprayTimerRef.current)
      }
    },
    [],
  )

  // the size drives the canvas attributes, and changed attributes wipe the
  // pixels: rebuild the backing buffers and repaint after every size change
  useEffect(() => {
    const size = state.size
    if (!bitmapRef.current) {
      bitmapRef.current = createBitmap(size.width, size.height)
    }
    if (
      !scratchRef.current ||
      scratchRef.current.width !== size.width ||
      scratchRef.current.height !== size.height
    ) {
      scratchRef.current = emptyOverlay(size.width, size.height)
    }
    const bitmap = bitmapRef.current
    canvasRef.current
      ?.getContext('2d')
      ?.putImageData(
        new ImageData(bitmap.data, bitmap.width, bitmap.height),
        0,
        0,
      )
  }, [state.size])

  const pushHistory = (before: Snapshot) => {
    historyRef.current = push(historyRef.current, before)
  }

  const mutateWhen = (change: (bitmap: Bitmap) => boolean): boolean => {
    const bitmap = bitmapRef.current
    if (!bitmap) return false
    const before = clone(bitmap)
    if (!change(bitmap)) return false
    pushHistory(before)
    blit()
    return true
  }

  const mutate = (change: (bitmap: Bitmap) => void): void => {
    mutateWhen((bitmap) => {
      change(bitmap)
      return true
    })
  }

  const adopt = (snapshot: Snapshot) => {
    const previous = bitmapRef.current
    bitmapRef.current = {
      data: snapshot.data,
      width: snapshot.width,
      height: snapshot.height,
    }
    const resized =
      !previous ||
      previous.width !== snapshot.width ||
      previous.height !== snapshot.height
    if (resized) {
      dispatch({
        type: 'canvas-resized',
        width: snapshot.width,
        height: snapshot.height,
      })
      return
    }
    blit()
    dispatch({ type: 'commit' })
  }

  const send = (event: PaintEvent) => {
    applyEffects(stateRef.current, event)
    dispatch(event)
  }

  const dropSelection = () => {
    floatRef.current = null
    clearOverlay()
    dispatch({ type: 'deselect' })
  }

  const doUndo = () => {
    const bitmap = bitmapRef.current
    const mode = stateRef.current.mode.kind
    if (!bitmap) return
    if (mode === 'selected') dropSelection()
    else if (mode !== 'idle') return
    const restore = undo(historyRef.current, clone(bitmap))
    if (!restore) return
    historyRef.current = restore.history
    adopt(restore.snapshot)
  }

  const doRedo = () => {
    const bitmap = bitmapRef.current
    const mode = stateRef.current.mode.kind
    if (!bitmap) return
    if (mode === 'selected') dropSelection()
    else if (mode !== 'idle') return
    const restore = redo(historyRef.current, clone(bitmap))
    if (!restore) return
    historyRef.current = restore.history
    adopt(restore.snapshot)
  }

  const liftIfNeeded = (rect: Rect) => {
    const bitmap = bitmapRef.current
    if (floatRef.current || !bitmap) return
    const clipped = clipRect(rect, bitmap.width, bitmap.height)
    if (!clipped) return
    mutate((target) => {
      floatRef.current = lift(target, clipped)
      fillRect(target, clipped, toRgba(stateRef.current.bg))
    })
  }

  const anchorFloat = () => {
    const float = floatRef.current
    const mode = stateRef.current.mode
    if (!float) return
    floatRef.current = null
    const anchored =
      mode.kind === 'selected' ||
      mode.kind === 'movingSelection' ||
      mode.kind === 'resizingSelection'
    if (!anchored) return
    const key = transparencyKey()
    mutate((bitmap) => {
      stamp(
        bitmap,
        float,
        { x: mode.rect.x, y: mode.rect.y },
        key ? { skip: key } : {},
      )
    })
    clearOverlay()
    dispatch({ type: 'commit' })
  }

  const selectedRect = (): Rect | null => {
    const mode = stateRef.current.mode
    return mode.kind === 'selected' ? mode.rect : null
  }

  const copySelection = () => {
    const rect = selectedRect()
    const bitmap = bitmapRef.current
    if (!rect || !bitmap) return
    if (floatRef.current) {
      clipboardRef.current = floatRef.current
      return
    }
    const clipped = clipRect(rect, bitmap.width, bitmap.height)
    if (clipped) clipboardRef.current = lift(bitmap, clipped)
  }

  const cutSelection = () => {
    const rect = selectedRect()
    if (!rect) return
    liftIfNeeded(rect)
    clipboardRef.current = floatRef.current
    floatRef.current = null
    clearOverlay()
    dispatch({ type: 'deselect' })
    dispatch({ type: 'commit' })
  }

  const clearSelection = () => {
    const rect = selectedRect()
    if (!rect) return
    if (floatRef.current) {
      floatRef.current = null
    } else {
      mutate((bitmap) => {
        fillRect(bitmap, rect, toRgba(stateRef.current.bg))
      })
    }
    clearOverlay()
    dispatch({ type: 'deselect' })
    dispatch({ type: 'commit' })
  }

  const paste = () => {
    const clipboard = clipboardRef.current
    if (!clipboard) return
    anchorFloat()
    floatRef.current = clipboard
    const rect = {
      x: 0,
      y: 0,
      width: clipboard.width,
      height: clipboard.height,
    }
    send({ type: 'select-rect', rect })
    drawSelection(rect, true)
    dispatch({ type: 'commit' })
  }

  const selectAll = () => {
    anchorFloat()
    const bitmap = bitmapRef.current
    if (!bitmap) return
    const rect = { x: 0, y: 0, width: bitmap.width, height: bitmap.height }
    send({ type: 'select-rect', rect })
    drawSelection(rect, true)
  }

  const escapeGesture = () => {
    if (stateRef.current.mode.kind === 'selected') {
      anchorFloat()
      dispatch({ type: 'deselect' })
      return
    }
    send({ type: 'cancel' })
  }

  const resizeCanvasTo = (target: Size) => {
    const bitmap = bitmapRef.current
    if (
      !bitmap ||
      (target.width === bitmap.width && target.height === bitmap.height)
    ) {
      return
    }
    const before = clone(bitmap)
    const grown = createBitmap(target.width, target.height)
    stamp(grown, bitmap, { x: 0, y: 0 })
    bitmapRef.current = grown
    pushHistory(before)
    dispatch({
      type: 'canvas-resized',
      width: target.width,
      height: target.height,
    })
  }

  const newFile = () => {
    floatRef.current = null
    historyRef.current = createHistory()
    bitmapRef.current = createBitmap(INITIAL_WIDTH, INITIAL_HEIGHT)
    clearOverlay()
    blit()
    dispatch({ type: 'cleared', width: INITIAL_WIDTH, height: INITIAL_HEIGHT })
  }

  const openFile = async (file: File) => {
    const opened = await openPng(file)
    if (!opened) return
    floatRef.current = null
    historyRef.current = createHistory()
    bitmapRef.current = opened
    clearOverlay()
    blit()
    dispatch({ type: 'opened', width: opened.width, height: opened.height })
  }

  const saveFile = async () => {
    if (stateRef.current.mode.kind === 'selected') {
      anchorFloat()
      dispatch({ type: 'deselect' })
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const saved = await savePng(canvas)
    if (saved) dispatch({ type: 'saved' })
  }

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
      if (changed) dispatch({ type: 'commit' })
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

  const setZoom = (level: Magnification) => {
    if (level !== 1) lastZoomRef.current = level
    send({ type: 'zoom', level })
  }

  const pickTool = (tool: ToolId) => send({ type: 'tool', tool })

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

  const stagePoint = (event: React.PointerEvent<Element>): Point => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const zoom = stateRef.current.zoom
    return {
      x: Math.floor((event.clientX - rect.left) / zoom),
      y: Math.floor((event.clientY - rect.top) / zoom),
    }
  }

  const nubBindings = (nub: Nub): NubBindings => ({
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

  return {
    state,
    send,
    hover,
    canvasRef,
    overlayRef,
    fileInputRef,
    pointerHandlers,
    nubBindings,
    pickTool,
    setZoom,
    undo: doUndo,
    redo: doRedo,
    canUndo: () => historyRef.current.past.length > 0,
    canPaste: () => clipboardRef.current !== null,
    cut: cutSelection,
    copy: copySelection,
    paste,
    clearSelection,
    selectAll,
    escape: escapeGesture,
    newFile,
    openFile,
    saveFile,
    isDirty: () => stateRef.current.dirty,
  }
}

export type Paint = ReturnType<typeof usePaint>
