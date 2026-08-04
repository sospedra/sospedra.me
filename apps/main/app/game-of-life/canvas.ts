import { clamp } from 'es-toolkit'
import {
  type Bounds,
  type Cell,
  type CellSet,
  cellOf,
  keyOf,
} from './engine.ts'

export type Camera = {
  x: number
  y: number
  zoom: number
}

export type CanvasPalette = {
  background: readonly [string, string, string]
  gridMinor: string
  gridMajor: string
  origin: string
  survivor: string
  newborn: string
  survivorGlow: string
  newbornGlow: string
  survivorHighlight: string
  newbornHighlight: string
  hoverAlive: string
  hoverDead: string
  cursor: string
  running: string
}

type DrawOptions = {
  cells: CellSet
  births: CellSet
  camera: Camera
  hover: Cell | null
  cursor: Cell
  showCursor: boolean
  running: boolean
  palette: CanvasPalette
}

export const MIN_ZOOM = 2
export const MAX_ZOOM = 34
const MAX_DPR = 2
const FIT_PADDING_CELLS = 8
const FIT_MAX_ZOOM = 24
const CURSOR_MARGIN_CELLS = 2
const CURSOR_MARGIN_SHARE = 0.4
const MINOR_GRID_MIN_ZOOM = 7
const MAJOR_GRID_STEP = 5
const TIGHT_INSET_MIN_ZOOM = 10
const CELL_INSET_TIGHT = 1.5
const CELL_INSET_LOOSE = 0.65
const HIGHLIGHT_MIN_ZOOM = 12
const GLOW_MAX_CELLS = 1800
const GLOW_MIN_ZOOM = 6
const GLOW_MAX_BLUR = 8
const GLOW_BLUR_PER_ZOOM = 0.4
const RUNNING_LAMP_RIGHT = 15
const RUNNING_LAMP_TOP = 8
const RUNNING_LAMP_SIZE = 7

type Frame = {
  context: CanvasRenderingContext2D
  camera: Camera
  width: number
  height: number
  palette: CanvasPalette
}

const clampZoom = (zoom: number) => clamp(zoom, MIN_ZOOM, MAX_ZOOM)

const canvasMetrics = (canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  return { width: rect.width, height: rect.height, dpr }
}

const resizeBackingStore = (
  canvas: HTMLCanvasElement,
  metrics: { width: number; height: number; dpr: number },
) => {
  const width = Math.max(1, Math.round(metrics.width * metrics.dpr))
  const height = Math.max(1, Math.round(metrics.height * metrics.dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
}

export const cellAtClientPoint = (
  canvas: HTMLCanvasElement,
  camera: Camera,
  clientX: number,
  clientY: number,
): Cell => {
  const rect = canvas.getBoundingClientRect()
  return [
    Math.floor(camera.x + (clientX - rect.left - rect.width / 2) / camera.zoom),
    Math.floor(camera.y + (clientY - rect.top - rect.height / 2) / camera.zoom),
  ]
}

export const panCamera = (
  camera: Camera,
  deltaX: number,
  deltaY: number,
): Camera => ({
  ...camera,
  x: camera.x - deltaX / camera.zoom,
  y: camera.y - deltaY / camera.zoom,
})

export const zoomCameraAt = (
  canvas: HTMLCanvasElement,
  camera: Camera,
  clientX: number,
  clientY: number,
  zoom: number,
): Camera => {
  const rect = canvas.getBoundingClientRect()
  const offsetX = clientX - rect.left - rect.width / 2
  const offsetY = clientY - rect.top - rect.height / 2
  const nextZoom = clampZoom(zoom)
  const worldX = camera.x + offsetX / camera.zoom
  const worldY = camera.y + offsetY / camera.zoom

  return {
    x: worldX - offsetX / nextZoom,
    y: worldY - offsetY / nextZoom,
    zoom: nextZoom,
  }
}

export const cameraForBounds = (
  canvas: HTMLCanvasElement,
  bounds: Bounds,
): Camera => {
  const rect = canvas.getBoundingClientRect()
  const horizontal = rect.width / (bounds.width + FIT_PADDING_CELLS)
  const vertical = rect.height / (bounds.height + FIT_PADDING_CELLS)

  return {
    x: (bounds.minX + bounds.maxX + 1) / 2,
    y: (bounds.minY + bounds.maxY + 1) / 2,
    zoom: clampZoom(Math.min(horizontal, vertical, FIT_MAX_ZOOM)),
  }
}

const centerOnAxis = (
  center: number,
  half: number,
  margin: number,
  target: number,
) => {
  if (target < center - half + margin) return target + half - margin
  if (target > center + half - margin) return target - half + margin
  return center
}

export const keepCellInView = (
  camera: Camera,
  rect: { width: number; height: number },
  cell: Cell,
): Camera => {
  const halfWidth = rect.width / (2 * camera.zoom)
  const halfHeight = rect.height / (2 * camera.zoom)
  const marginX = Math.min(CURSOR_MARGIN_CELLS, halfWidth * CURSOR_MARGIN_SHARE)
  const marginY = Math.min(
    CURSOR_MARGIN_CELLS,
    halfHeight * CURSOR_MARGIN_SHARE,
  )
  const x = centerOnAxis(camera.x, halfWidth, marginX, cell[0] + 0.5)
  const y = centerOnAxis(camera.y, halfHeight, marginY, cell[1] + 0.5)

  if (x === camera.x && y === camera.y) return camera
  return { ...camera, x, y }
}

const traceGrid = (frame: Frame, step: number) => {
  const { camera, context, height, width } = frame
  const { zoom } = camera
  const left = camera.x - width / (2 * zoom)
  const right = camera.x + width / (2 * zoom)
  const top = camera.y - height / (2 * zoom)
  const bottom = camera.y + height / (2 * zoom)
  const startX = Math.floor(left / step) * step
  const startY = Math.floor(top / step) * step

  context.beginPath()
  for (let x = startX; x <= right; x += step) {
    const screenX = Math.round(width / 2 + (x - camera.x) * zoom) + 0.5
    context.moveTo(screenX, 0)
    context.lineTo(screenX, height)
  }
  for (let y = startY; y <= bottom; y += step) {
    const screenY = Math.round(height / 2 + (y - camera.y) * zoom) + 0.5
    context.moveTo(0, screenY)
    context.lineTo(width, screenY)
  }
}

const drawGrid = (frame: Frame) => {
  const { camera, context, height, palette, width } = frame

  if (camera.zoom >= MINOR_GRID_MIN_ZOOM) {
    traceGrid(frame, 1)
    context.strokeStyle = palette.gridMinor
    context.lineWidth = 1
    context.stroke()
  }

  traceGrid(frame, MAJOR_GRID_STEP)
  context.strokeStyle = palette.gridMajor
  context.lineWidth = 1
  context.stroke()

  const originX = Math.round(width / 2 - camera.x * camera.zoom) + 0.5
  const originY = Math.round(height / 2 - camera.y * camera.zoom) + 0.5
  context.beginPath()
  context.moveTo(originX, 0)
  context.lineTo(originX, height)
  context.moveTo(0, originY)
  context.lineTo(width, originY)
  context.strokeStyle = palette.origin
  context.stroke()
}

const drawCellMarker = (
  frame: Frame,
  marker: { cell: Cell; color: string; inset: number },
) => {
  const { camera, context, height, width } = frame
  const [x, y] = marker.cell
  const left = width / 2 + (x - camera.x) * camera.zoom
  const top = height / 2 + (y - camera.y) * camera.zoom
  context.strokeStyle = marker.color
  context.lineWidth = 2
  const size = Math.max(2, Math.round(camera.zoom - marker.inset * 2))
  context.strokeRect(
    Math.round(left + marker.inset),
    Math.round(top + marker.inset),
    size,
    size,
  )
}

const drawBackdrop = (frame: Frame) => {
  const { context, height, palette, width } = frame
  const backdrop = context.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72,
  )
  backdrop.addColorStop(0, palette.background[0])
  backdrop.addColorStop(0.6, palette.background[1])
  backdrop.addColorStop(1, palette.background[2])
  context.fillStyle = backdrop
  context.fillRect(0, 0, width, height)
}

const drawCell = (
  frame: Frame,
  spot: { screenX: number; screenY: number; size: number; newborn: boolean },
) => {
  const { camera, context, palette } = frame
  context.fillStyle = spot.newborn ? palette.newborn : palette.survivor
  context.fillRect(
    Math.round(spot.screenX),
    Math.round(spot.screenY),
    Math.max(1, Math.ceil(spot.size)),
    Math.max(1, Math.ceil(spot.size)),
  )

  if (camera.zoom < HIGHLIGHT_MIN_ZOOM) return
  context.shadowBlur = 0
  context.fillStyle = spot.newborn
    ? palette.newbornHighlight
    : palette.survivorHighlight
  context.fillRect(
    Math.round(spot.screenX + spot.size * 0.2),
    Math.round(spot.screenY + spot.size * 0.2),
    Math.max(1, Math.round(spot.size * 0.22)),
    Math.max(1, Math.round(spot.size * 0.22)),
  )
}

export const drawLifeCanvas = (
  canvas: HTMLCanvasElement,
  options: DrawOptions,
) => {
  const context = canvas.getContext('2d')
  if (!context) return

  const metrics = canvasMetrics(canvas)
  resizeBackingStore(canvas, metrics)
  const { dpr, height, width } = metrics
  const { births, camera, cells, palette } = options
  const frame: Frame = { camera, context, height, palette, width }
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)

  drawBackdrop(frame)
  drawGrid(frame)

  const inset =
    camera.zoom >= TIGHT_INSET_MIN_ZOOM ? CELL_INSET_TIGHT : CELL_INSET_LOOSE
  const cellSize = Math.max(1, camera.zoom - inset * 2)
  const left = camera.x - width / (2 * camera.zoom) - 1
  const right = camera.x + width / (2 * camera.zoom) + 1
  const top = camera.y - height / (2 * camera.zoom) - 1
  const bottom = camera.y + height / (2 * camera.zoom) + 1
  const useGlow = cells.size < GLOW_MAX_CELLS && camera.zoom >= GLOW_MIN_ZOOM

  const glowBlur = Math.min(GLOW_MAX_BLUR, camera.zoom * GLOW_BLUR_PER_ZOOM)
  if (useGlow) {
    context.shadowBlur = glowBlur
    context.shadowColor = palette.survivorGlow
  }

  // shadowColor assignment parses a css color; write it only when the kind flips
  let glowNewborn = false
  for (const key of cells) {
    const [x, y] = cellOf(key)
    if (x < left || x > right || y < top || y > bottom) continue
    const newborn = births.has(key)
    const screenX = width / 2 + (x - camera.x) * camera.zoom + inset
    const screenY = height / 2 + (y - camera.y) * camera.zoom + inset

    if (useGlow && newborn !== glowNewborn) {
      context.shadowColor = newborn ? palette.newbornGlow : palette.survivorGlow
      glowNewborn = newborn
    }
    drawCell(frame, { newborn, screenX, screenY, size: cellSize })
    if (useGlow) context.shadowBlur = glowBlur
  }

  context.shadowBlur = 0
  if (options.hover) {
    const hoverAlive = cells.has(keyOf(...options.hover))
    drawCellMarker(frame, {
      cell: options.hover,
      color: hoverAlive ? palette.hoverAlive : palette.hoverDead,
      inset: 2.5,
    })
  }

  if (options.showCursor) {
    drawCellMarker(frame, {
      cell: options.cursor,
      color: palette.cursor,
      inset: 0.75,
    })
  }

  if (options.running) {
    context.fillStyle = palette.running
    context.fillRect(
      width - RUNNING_LAMP_RIGHT,
      RUNNING_LAMP_TOP,
      RUNNING_LAMP_SIZE,
      RUNNING_LAMP_SIZE,
    )
  }
}
