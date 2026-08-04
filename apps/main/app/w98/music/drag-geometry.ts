import { clamp } from 'es-toolkit'

export type DragPoint = { x: number; y: number }

export type DragRect = {
  bottom: number
  left: number
  right: number
  top: number
}

export type DragBounds = {
  maxX: number
  maxY: number
  minX: number
  minY: number
}

export const panelDragBounds = (
  offset: DragPoint,
  panelRect: DragRect,
  stageRect: DragRect,
): DragBounds => ({
  maxX: offset.x + stageRect.right - panelRect.right,
  maxY: offset.y + stageRect.bottom - panelRect.bottom,
  minX: offset.x + stageRect.left - panelRect.left,
  minY: offset.y + stageRect.top - panelRect.top,
})

const clampAxis = (value: number, min: number, max: number): number =>
  min <= max ? clamp(value, min, max) : (min + max) / 2

export const clampPanelOffset = (
  offset: DragPoint,
  panelRect: DragRect,
  stageRect: DragRect,
): DragPoint => {
  const bounds = panelDragBounds(offset, panelRect, stageRect)
  return {
    x: clampAxis(offset.x, bounds.minX, bounds.maxX),
    y: clampAxis(offset.y, bounds.minY, bounds.maxY),
  }
}

export const clampDragOffset = (
  offset: DragPoint,
  bounds: DragBounds,
): DragPoint => ({
  x: clampAxis(offset.x, bounds.minX, bounds.maxX),
  y: clampAxis(offset.y, bounds.minY, bounds.maxY),
})
