import {
  handlePoints,
  type Point,
  type Rect,
  rectFromPoints,
} from './geometry.ts'
import type { Snapshot } from './history.ts'
import { type Rgba, toRgba } from './palette.ts'
import {
  type Bitmap,
  brushStroke,
  drawCurve,
  drawEllipse,
  drawLine,
  drawRect,
  drawRoundedRect,
  type ShapeStyle,
  setPixel,
} from './raster.ts'
import { fillRect, stamp } from './selection.ts'
import type { Button, PaintState } from './state.ts'

const MARQUEE_DARK: Rgba = [0, 0, 0, 255]
const MARQUEE_LIGHT: Rgba = [255, 255, 255, 255]
const HANDLE_INK: Rgba = [0, 0, 128, 255]

export const clone = (bitmap: Bitmap): Snapshot => ({
  data: bitmap.data.slice(),
  width: bitmap.width,
  height: bitmap.height,
})

export const inkColor = (state: PaintState, button: Button): Rgba =>
  toRgba(button === 'right' ? state.bg : state.fg)

export const shapeStyle = (state: PaintState, button: Button): ShapeStyle => {
  const main = inkColor(state, button)
  const other = toRgba(button === 'right' ? state.fg : state.bg)
  if (state.options.fillStyle === 'outline') return { stroke: main }
  if (state.options.fillStyle === 'both') return { stroke: main, fill: other }
  return { fill: main }
}

export const freehandSegment = (
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

export const renderShape = (
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

export const renderCurve = (
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

export const dashedRect = (scratch: Bitmap, rect: Rect): void => {
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

export const renderSelection = (
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

export const renderPreview = (
  scratch: Bitmap,
  state: PaintState,
  at: Point,
): void => {
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
