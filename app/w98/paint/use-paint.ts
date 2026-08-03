import type React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { openPng, savePng } from './file-io.ts'
import { floodFill } from './fill.ts'
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
  getPx,
  type Pt,
  type Rect,
  type ShapeStyle,
  setPx,
  spray,
} from './raster.ts'
import {
  clipRect,
  fillRect,
  handleAt,
  handlePoints,
  handleTolerance,
  insideRect,
  lift,
  scaleNearest,
  stamp,
} from './selection.ts'
import {
  type Button,
  INITIAL_H,
  INITIAL_PAINT,
  INITIAL_W,
  type Nub,
  normRect,
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

const hexOf = (px: Rgba): string =>
  `#${[px[0], px[1], px[2]]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`

const clone = (bmp: Bitmap): Snapshot => ({
  data: bmp.data.slice(),
  w: bmp.w,
  h: bmp.h,
})

const emptyOverlay = (w: number, h: number): Bitmap => ({
  data: new Uint8ClampedArray(w * h * 4),
  w,
  h,
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
  bmp: Bitmap,
  state: PaintState,
  from: Pt,
  to: Pt,
  button: Button,
): void => {
  const color = inkColor(state, button)
  if (state.tool === 'pencil') {
    drawLine(bmp, from, to, { color, size: 1 })
    return
  }
  if (state.tool === 'brush') {
    brushStroke(bmp, from, to, { ...state.options.brush, color })
    return
  }
  if (state.tool === 'eraser') {
    brushStroke(bmp, from, to, {
      shape: 'square',
      size: state.options.eraserSize,
      color: toRgba(state.bg),
    })
  }
}

const renderShape = (
  bmp: Bitmap,
  state: PaintState,
  from: Pt,
  to: Pt,
  button: Button,
): void => {
  const style = shapeStyle(state, button)
  if (state.tool === 'line') {
    drawLine(bmp, from, to, {
      color: inkColor(state, button),
      size: state.options.strokeSize,
    })
    return
  }
  if (state.tool === 'rect') drawRect(bmp, from, to, style)
  if (state.tool === 'ellipse') drawEllipse(bmp, from, to, style)
  if (state.tool === 'rrect') drawRoundedRect(bmp, from, to, style)
}

const renderCurve = (
  bmp: Bitmap,
  state: PaintState,
  spec: { from: Pt; to: Pt; c1?: Pt; c2?: Pt },
  button: Button,
): void => {
  const c1 = spec.c1 ?? spec.from
  drawCurve(bmp, {
    from: spec.from,
    to: spec.to,
    c1,
    c2: spec.c2 ?? c1,
    color: inkColor(state, button),
    size: state.options.strokeSize,
  })
}

const dashedRect = (scratch: Bitmap, rect: Rect): void => {
  const x1 = rect.x + rect.w - 1
  const y1 = rect.y + rect.h - 1
  const plot = (x: number, y: number) =>
    setPx(scratch, x, y, (x + y) % 4 < 2 ? MARQUEE_DARK : MARQUEE_LIGHT)
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
      { x: point.x - 1, y: point.y - 1, w: 3, h: 3 },
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

const renderPreview = (scratch: Bitmap, state: PaintState, at: Pt): void => {
  const mode = state.mode
  if (mode.kind === 'selecting') {
    dashedRect(scratch, normRect(mode.from, at))
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
}

export const usePaint = () => {
  const [state, dispatch] = useReducer(reduce, INITIAL_PAINT)
  const stateRef = useRef(state)
  const bmpRef = useRef<Bitmap | null>(null)
  const scratchRef = useRef<Bitmap | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const historyRef = useRef(createHistory())
  const strokeUndoRef = useRef<Snapshot | null>(null)
  const floatRef = useRef<Bitmap | null>(null)
  const clipboardRef = useRef<Bitmap | null>(null)
  const lastPtRef = useRef<Pt>({ x: 0, y: 0 })
  const sprayTimerRef = useRef<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const lastZoomRef = useRef<Magnification>(2)
  const [hover, setHover] = useState<Pt | null>(null)

  useEffect(() => {
    stateRef.current = state
  })

  const blit = () => {
    const bmp = bmpRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!bmp || !ctx) return
    ctx.putImageData(new ImageData(bmp.data, bmp.w, bmp.h), 0, 0)
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
    ctx.putImageData(new ImageData(scratch.data, scratch.w, scratch.h), 0, 0)
  }

  const drawOverlay = (at: Pt) =>
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
    if (!bmpRef.current) bmpRef.current = createBitmap(size.w, size.h)
    if (
      !scratchRef.current ||
      scratchRef.current.w !== size.w ||
      scratchRef.current.h !== size.h
    ) {
      scratchRef.current = emptyOverlay(size.w, size.h)
    }
    const bmp = bmpRef.current
    canvasRef.current
      ?.getContext('2d')
      ?.putImageData(new ImageData(bmp.data, bmp.w, bmp.h), 0, 0)
  }, [state.size])

  const pushHistory = (before: Snapshot) => {
    historyRef.current = push(historyRef.current, before)
  }

  const mutateWhen = (change: (bmp: Bitmap) => boolean): boolean => {
    const bmp = bmpRef.current
    if (!bmp) return false
    const before = clone(bmp)
    if (!change(bmp)) return false
    pushHistory(before)
    blit()
    return true
  }

  const mutate = (change: (bmp: Bitmap) => void): void => {
    mutateWhen((bmp) => {
      change(bmp)
      return true
    })
  }

  const adopt = (snapshot: Snapshot) => {
    const previous = bmpRef.current
    bmpRef.current = { data: snapshot.data, w: snapshot.w, h: snapshot.h }
    const resized =
      !previous || previous.w !== snapshot.w || previous.h !== snapshot.h
    if (resized) {
      dispatch({ type: 'canvas-resized', w: snapshot.w, h: snapshot.h })
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
    const bmp = bmpRef.current
    const mode = stateRef.current.mode.kind
    if (!bmp) return
    if (mode === 'selected') dropSelection()
    else if (mode !== 'idle') return
    const restore = undo(historyRef.current, clone(bmp))
    if (!restore) return
    historyRef.current = restore.history
    adopt(restore.snapshot)
  }

  const doRedo = () => {
    const bmp = bmpRef.current
    const mode = stateRef.current.mode.kind
    if (!bmp) return
    if (mode === 'selected') dropSelection()
    else if (mode !== 'idle') return
    const restore = redo(historyRef.current, clone(bmp))
    if (!restore) return
    historyRef.current = restore.history
    adopt(restore.snapshot)
  }

  const liftIfNeeded = (rect: Rect) => {
    const bmp = bmpRef.current
    if (floatRef.current || !bmp) return
    const clipped = clipRect(rect, bmp.w, bmp.h)
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
    mutate((bmp) => {
      stamp(
        bmp,
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
    const bmp = bmpRef.current
    if (!rect || !bmp) return
    if (floatRef.current) {
      clipboardRef.current = floatRef.current
      return
    }
    const clipped = clipRect(rect, bmp.w, bmp.h)
    if (clipped) clipboardRef.current = lift(bmp, clipped)
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
      mutate((bmp) => {
        fillRect(bmp, rect, toRgba(stateRef.current.bg))
      })
    }
    clearOverlay()
    dispatch({ type: 'deselect' })
    dispatch({ type: 'commit' })
  }

  const paste = () => {
    const clip = clipboardRef.current
    if (!clip) return
    anchorFloat()
    floatRef.current = clip
    const rect = { x: 0, y: 0, w: clip.w, h: clip.h }
    send({ type: 'select-rect', rect })
    drawSelection(rect, true)
    dispatch({ type: 'commit' })
  }

  const selectAll = () => {
    anchorFloat()
    const bmp = bmpRef.current
    if (!bmp) return
    const rect = { x: 0, y: 0, w: bmp.w, h: bmp.h }
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
    const bmp = bmpRef.current
    if (!bmp || (target.w === bmp.w && target.h === bmp.h)) return
    const before = clone(bmp)
    const grown = createBitmap(target.w, target.h)
    stamp(grown, bmp, { x: 0, y: 0 })
    bmpRef.current = grown
    pushHistory(before)
    dispatch({ type: 'canvas-resized', w: target.w, h: target.h })
  }

  const newFile = () => {
    floatRef.current = null
    historyRef.current = createHistory()
    bmpRef.current = createBitmap(INITIAL_W, INITIAL_H)
    clearOverlay()
    blit()
    dispatch({ type: 'cleared', w: INITIAL_W, h: INITIAL_H })
  }

  const openFile = async (file: File) => {
    const opened = await openPng(file)
    if (!opened) return
    floatRef.current = null
    historyRef.current = createHistory()
    bmpRef.current = opened
    clearOverlay()
    blit()
    dispatch({ type: 'opened', w: opened.w, h: opened.h })
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
      const bmp = bmpRef.current
      if (!bmp) return
      spray(bmp, lastPtRef.current, { size, color, rng: Math.random })
      blit()
    }
    burst()
    sprayTimerRef.current = window.setInterval(burst, SPRAY_MS)
  }

  const applyPoint = (state: PaintState, at: Pt, button: Button) => {
    const bmp = bmpRef.current
    if (!bmp) return
    if (state.tool === 'fill') {
      const changed = mutateWhen((target) =>
        floodFill(target, at, inkColor(state, button)),
      )
      if (changed) dispatch({ type: 'commit' })
      return
    }
    if (state.tool === 'pick') {
      const px = getPx(bmp, at.x, at.y)
      if (!px) return
      dispatch({
        type: 'color',
        slot: button === 'right' ? 'bg' : 'fg',
        color: hexOf(px),
      })
      return
    }
    const level =
      button === 'right' || state.zoom !== 1 ? 1 : lastZoomRef.current
    dispatch({ type: 'zoom', level })
  }

  const applyDown = (state: PaintState, at: Pt, button: Button) => {
    const kind = toolById[state.tool].kind
    lastPtRef.current = at
    if (kind === 'point') {
      applyPoint(state, at, button)
      return
    }
    if (kind === 'freehand') {
      const bmp = bmpRef.current
      if (!bmp) return
      strokeUndoRef.current = clone(bmp)
      if (state.tool === 'airbrush') {
        startSpray(button)
        return
      }
      freehandSegment(bmp, state, at, at, button)
      blit()
      return
    }
    if (kind === 'shape') drawOverlay(at)
  }

  const movingRect = (
    mode: Extract<PaintState['mode'], { kind: 'movingSelection' }>,
    at: Pt,
  ): Rect => ({
    ...mode.rect,
    x: mode.rect.x + at.x - mode.grip.x,
    y: mode.rect.y + at.y - mode.grip.y,
  })

  const applyMove = (state: PaintState, at: Pt) => {
    const mode = state.mode
    if (mode.kind === 'freehand') {
      const bmp = bmpRef.current
      if (!bmp) return
      if (state.tool !== 'airbrush') {
        freehandSegment(bmp, state, mode.last, at, mode.button)
        blit()
      }
      lastPtRef.current = at
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

  const applyUp = (state: PaintState, at: Pt) => {
    const mode = state.mode
    if (mode.kind === 'freehand') {
      stopSpray()
      const before = strokeUndoRef.current
      strokeUndoRef.current = null
      if (before) pushHistory(before)
      return
    }
    if (mode.kind === 'shaping') {
      mutate((bmp) => {
        renderShape(bmp, state, mode.from, at, mode.button)
      })
      clearOverlay()
      return
    }
    if (mode.kind === 'curving' && mode.phase === 'c2' && mode.dragging) {
      mutate((bmp) => {
        renderCurve(bmp, state, { ...mode, c2: at }, 'left')
      })
      clearOverlay()
      return
    }
    if (mode.kind === 'selecting') {
      const rect = normRect(mode.from, mode.to)
      if (rect.w === 1 && rect.h === 1) clearOverlay()
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
      if (float) floatRef.current = scaleNearest(float, rect.w, rect.h)
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
    mutate((bmp) => {
      drawPolygon(bmp, mode.points, shapeStyle(state, mode.button))
    })
    clearOverlay()
  }

  const applyEffects = (state: PaintState, event: PaintEvent) => {
    switch (event.type) {
      case 'down':
        return applyDown(state, event.at, event.button)
      case 'move':
        return applyMove(state, event.at)
      case 'up':
        return applyUp(state, event.at)
      case 'dblclick':
        return applyDoubleClick(state)
      case 'tool':
      case 'cancel':
        anchorFloat()
        stopSpray()
        strokeUndoRef.current = null
        clearOverlay()
        return
      default:
        return
    }
  }

  const setZoom = (level: Magnification) => {
    if (level !== 1) lastZoomRef.current = level
    send({ type: 'zoom', level })
  }

  const pickTool = (tool: ToolId) => send({ type: 'tool', tool })

  const bitmapPoint = (event: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const zoom = stateRef.current.zoom
    return {
      x: Math.floor(event.nativeEvent.offsetX / zoom),
      y: Math.floor(event.nativeEvent.offsetY / zoom),
    }
  }

  const routeDown = (at: Pt, button: Button) => {
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

  const stagePoint = (event: React.PointerEvent<Element>): Pt => {
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
