import type React from 'react'
import { clipRect, type Rect } from './geometry.ts'
import { type Rgba, toRgba } from './palette.ts'
import type { Bitmap } from './raster.ts'
import { fillRect, lift, stamp } from './selection.ts'
import type { PaintEvent, PaintState } from './state.ts'

export const createSelectionOps = ({
  bitmapRef,
  clearOverlay,
  clipboardRef,
  dispatch,
  drawSelection,
  floatRef,
  mutate,
  send,
  stateRef,
  transparencyKey,
}: {
  bitmapRef: React.RefObject<Bitmap | null>
  clearOverlay: () => void
  clipboardRef: React.RefObject<Bitmap | null>
  dispatch: React.Dispatch<PaintEvent>
  drawSelection: (rect: Rect, handles: boolean) => void
  floatRef: React.RefObject<Bitmap | null>
  mutate: (change: (bitmap: Bitmap) => void) => void
  send: (event: PaintEvent) => void
  stateRef: React.RefObject<PaintState>
  transparencyKey: () => Rgba | undefined
}) => {
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

  return {
    anchorFloat,
    clearSelection,
    copySelection,
    cutSelection,
    escapeGesture,
    liftIfNeeded,
    paste,
    selectAll,
    selectedRect,
  }
}
