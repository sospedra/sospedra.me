import { type Bounds, type Cell, type CellSet, cellOf, keyOf } from './engine'

export type Camera = {
  x: number
  y: number
  zoom: number
}

export type CanvasPalette = {
  mode: 'circuit' | 'poster' | 'ember' | 'organic'
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

const MIN_ZOOM = 2
const MAX_ZOOM = 34
const MAX_DPR = 2

export const clampZoom = (zoom: number) =>
  Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))

const canvasSize = (canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const width = Math.max(1, Math.round(rect.width * dpr))
  const height = Math.max(1, Math.round(rect.height * dpr))

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  return { width: rect.width, height: rect.height, dpr, rect }
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
  const horizontal = rect.width / (bounds.width + 8)
  const vertical = rect.height / (bounds.height + 8)

  return {
    x: (bounds.minX + bounds.maxX + 1) / 2,
    y: (bounds.minY + bounds.maxY + 1) / 2,
    zoom: clampZoom(Math.min(horizontal, vertical, 24)),
  }
}

const traceGrid = (
  context: CanvasRenderingContext2D,
  camera: Camera,
  width: number,
  height: number,
  step: number,
) => {
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

const drawGrid = (
  context: CanvasRenderingContext2D,
  camera: Camera,
  width: number,
  height: number,
  palette: CanvasPalette,
) => {
  const minorThreshold =
    palette.mode === 'circuit'
      ? 7
      : palette.mode === 'poster'
        ? 11
        : palette.mode === 'organic'
          ? 14
          : Number.POSITIVE_INFINITY
  const majorStep =
    palette.mode === 'ember' ? 7 : palette.mode === 'organic' ? 6 : 5

  context.setLineDash(
    palette.mode === 'organic' ? [1, Math.max(2, camera.zoom * 0.24)] : [],
  )

  if (camera.zoom >= minorThreshold) {
    traceGrid(context, camera, width, height, 1)
    context.strokeStyle = palette.gridMinor
    context.lineWidth = 1
    context.stroke()
  }

  traceGrid(context, camera, width, height, majorStep)
  context.strokeStyle = palette.gridMajor
  context.lineWidth = 1
  context.stroke()
  context.setLineDash([])

  if (palette.mode === 'organic') return
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
  context: CanvasRenderingContext2D,
  cell: Cell,
  camera: Camera,
  width: number,
  height: number,
  color: string,
  inset: number,
  mode: CanvasPalette['mode'],
) => {
  const [x, y] = cell
  const left = width / 2 + (x - camera.x) * camera.zoom
  const top = height / 2 + (y - camera.y) * camera.zoom
  context.strokeStyle = color
  context.lineWidth = 2
  const size = Math.max(2, Math.round(camera.zoom - inset * 2))
  const markerLeft = Math.round(left + inset)
  const markerTop = Math.round(top + inset)

  if (mode === 'organic') {
    context.beginPath()
    context.arc(
      markerLeft + size / 2,
      markerTop + size / 2,
      size / 2,
      0,
      Math.PI * 2,
    )
    context.stroke()
    return
  }

  if (mode === 'ember') {
    const centerX = markerLeft + size / 2
    const centerY = markerTop + size / 2
    context.beginPath()
    context.moveTo(centerX, markerTop)
    context.lineTo(markerLeft + size, centerY)
    context.lineTo(centerX, markerTop + size)
    context.lineTo(markerLeft, centerY)
    context.closePath()
    context.stroke()
    return
  }

  if (mode === 'poster') context.setLineDash([4, 2])
  context.strokeRect(markerLeft, markerTop, size, size)
  context.setLineDash([])
}

const drawBackdrop = (
  context: CanvasRenderingContext2D,
  palette: CanvasPalette,
  width: number,
  height: number,
) => {
  if (palette.mode === 'poster') {
    const backdrop = context.createLinearGradient(0, 0, width, height)
    backdrop.addColorStop(0, palette.background[0])
    backdrop.addColorStop(0.62, palette.background[1])
    backdrop.addColorStop(1, palette.background[2])
    context.fillStyle = backdrop
    context.fillRect(0, 0, width, height)

    context.beginPath()
    context.arc(
      width * 0.78,
      height * 0.2,
      Math.min(width, height) * 0.17,
      0,
      Math.PI * 2,
    )
    context.strokeStyle = palette.origin
    context.lineWidth = 2
    context.stroke()
    return
  }

  if (palette.mode === 'organic') {
    const backdrop = context.createLinearGradient(0, 0, 0, height)
    backdrop.addColorStop(0, palette.background[0])
    backdrop.addColorStop(0.58, palette.background[1])
    backdrop.addColorStop(1, palette.background[2])
    context.fillStyle = backdrop
    context.fillRect(0, 0, width, height)

    const light = context.createRadialGradient(
      width * 0.2,
      height * 0.12,
      0,
      width * 0.2,
      height * 0.12,
      Math.max(width, height) * 0.45,
    )
    light.addColorStop(0, 'rgb(255 249 205 / 32%)')
    light.addColorStop(1, 'rgb(255 249 205 / 0%)')
    context.fillStyle = light
    context.fillRect(0, 0, width, height)
    return
  }

  const centerY = palette.mode === 'ember' ? height * 0.88 : height / 2
  const backdrop = context.createRadialGradient(
    width / 2,
    centerY,
    0,
    width / 2,
    centerY,
    Math.max(width, height) * 0.72,
  )
  backdrop.addColorStop(0, palette.background[0])
  backdrop.addColorStop(0.6, palette.background[1])
  backdrop.addColorStop(1, palette.background[2])
  context.fillStyle = backdrop
  context.fillRect(0, 0, width, height)
}

const fillDiamond = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
) => {
  context.beginPath()
  context.moveTo(centerX, centerY - radius)
  context.lineTo(centerX + radius, centerY)
  context.lineTo(centerX, centerY + radius)
  context.lineTo(centerX - radius, centerY)
  context.closePath()
  context.fill()
}

const drawCell = (
  context: CanvasRenderingContext2D,
  palette: CanvasPalette,
  screenX: number,
  screenY: number,
  cellSize: number,
  newborn: boolean,
  zoom: number,
) => {
  const color = newborn ? palette.newborn : palette.survivor
  const highlight = newborn
    ? palette.newbornHighlight
    : palette.survivorHighlight

  if (palette.mode === 'poster') {
    context.shadowBlur = 0
    if (newborn) {
      context.fillStyle = palette.newbornGlow
      context.fillRect(
        Math.round(screenX + 2),
        Math.round(screenY + 2),
        Math.max(1, Math.ceil(cellSize)),
        Math.max(1, Math.ceil(cellSize)),
      )
    }
    context.fillStyle = color
    context.fillRect(
      Math.round(screenX),
      Math.round(screenY),
      Math.max(1, Math.ceil(cellSize)),
      Math.max(1, Math.ceil(cellSize)),
    )
    if (zoom >= 11) {
      context.beginPath()
      context.moveTo(screenX + cellSize * 0.68, screenY)
      context.lineTo(screenX + cellSize, screenY + cellSize * 0.32)
      context.strokeStyle = highlight
      context.lineWidth = 1.5
      context.stroke()
    }
    return
  }

  if (palette.mode === 'ember') {
    const centerX = screenX + cellSize / 2
    const centerY = screenY + cellSize / 2
    context.fillStyle = color
    fillDiamond(context, centerX, centerY, cellSize * 0.48)
    if (zoom >= 9) {
      context.shadowBlur = 0
      context.fillStyle = highlight
      fillDiamond(context, centerX, centerY, cellSize * 0.19)
    }
    return
  }

  if (palette.mode === 'organic') {
    const centerX = screenX + cellSize / 2
    const centerY = screenY + cellSize / 2
    const radius = cellSize * 0.44
    context.fillStyle = color
    context.beginPath()
    context.ellipse(
      centerX,
      centerY,
      newborn ? radius * 0.78 : radius,
      radius,
      newborn ? Math.PI / 4 : 0,
      0,
      Math.PI * 2,
    )
    context.fill()
    if (zoom >= 10) {
      context.shadowBlur = 0
      context.fillStyle = highlight
      context.beginPath()
      context.arc(
        centerX - radius * 0.22,
        centerY - radius * 0.24,
        Math.max(1, radius * 0.18),
        0,
        Math.PI * 2,
      )
      context.fill()
    }
    return
  }

  context.fillStyle = color
  context.fillRect(
    Math.round(screenX),
    Math.round(screenY),
    Math.max(1, Math.ceil(cellSize)),
    Math.max(1, Math.ceil(cellSize)),
  )

  if (zoom >= 12) {
    context.shadowBlur = 0
    context.fillStyle = highlight
    context.fillRect(
      Math.round(screenX + cellSize * 0.2),
      Math.round(screenY + cellSize * 0.2),
      Math.max(1, Math.round(cellSize * 0.22)),
      Math.max(1, Math.round(cellSize * 0.22)),
    )
  }
}

export const drawLifeCanvas = (
  canvas: HTMLCanvasElement,
  options: DrawOptions,
) => {
  const context = canvas.getContext('2d')
  if (!context) return

  const { dpr, height, width } = canvasSize(canvas)
  const { births, camera, cells, palette } = options
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)

  drawBackdrop(context, palette, width, height)

  drawGrid(context, camera, width, height, palette)

  const inset = camera.zoom >= 10 ? 1.5 : 0.65
  const cellSize = Math.max(1, camera.zoom - inset * 2)
  const left = camera.x - width / (2 * camera.zoom) - 1
  const right = camera.x + width / (2 * camera.zoom) + 1
  const top = camera.y - height / (2 * camera.zoom) - 1
  const bottom = camera.y + height / (2 * camera.zoom) + 1
  const useGlow =
    palette.mode !== 'poster' && cells.size < 1800 && camera.zoom >= 6

  if (useGlow) {
    context.shadowBlur = Math.min(8, camera.zoom * 0.4)
    context.shadowColor = palette.survivorGlow
  }

  for (const key of cells) {
    const [x, y] = cellOf(key)
    if (x < left || x > right || y < top || y > bottom) continue
    const newborn = births.has(key)
    const screenX = width / 2 + (x - camera.x) * camera.zoom + inset
    const screenY = height / 2 + (y - camera.y) * camera.zoom + inset

    if (useGlow) {
      context.shadowColor = newborn ? palette.newbornGlow : palette.survivorGlow
    }
    drawCell(context, palette, screenX, screenY, cellSize, newborn, camera.zoom)
    if (useGlow) {
      context.shadowBlur = Math.min(8, camera.zoom * 0.4)
      context.shadowColor = palette.survivorGlow
    }
  }

  context.shadowBlur = 0
  if (options.hover) {
    const hoverAlive = cells.has(keyOf(...options.hover))
    drawCellMarker(
      context,
      options.hover,
      camera,
      width,
      height,
      hoverAlive ? palette.hoverAlive : palette.hoverDead,
      2.5,
      palette.mode,
    )
  }

  if (options.showCursor) {
    drawCellMarker(
      context,
      options.cursor,
      camera,
      width,
      height,
      palette.cursor,
      0.75,
      palette.mode,
    )
  }

  if (options.running) {
    context.fillStyle = palette.running
    context.fillRect(width - 15, 8, 7, 7)
  }
}
