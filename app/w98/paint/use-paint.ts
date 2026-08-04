import { useEffect, useReducer, useRef, useState } from 'react'
import { openPng, savePng } from './file-io.ts'
import type { Point, Rect } from './geometry.ts'
import { createHistory, push, redo, type Snapshot, undo } from './history.ts'
import type { Magnification } from './options.ts'
import { createPointerGestures } from './paint-gestures.ts'
import { clone, renderPreview, renderSelection } from './paint-render.ts'
import { createSelectionOps } from './paint-selection.ts'
import { type Rgba, toRgba } from './palette.ts'
import { type Bitmap, createBitmap } from './raster.ts'
import { createNubBindings } from './resize-nub.ts'
import { stamp } from './selection.ts'
import {
  INITIAL_HEIGHT,
  INITIAL_PAINT,
  INITIAL_WIDTH,
  type PaintEvent,
  reduce,
  type Size,
} from './state.ts'
import type { ToolId } from './tools.ts'

const emptyOverlay = (width: number, height: number): Bitmap => ({
  data: new Uint8ClampedArray(width * height * 4),
  width,
  height,
})

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
    gestures.applyEffects(stateRef.current, event)
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

  const selectionOps = createSelectionOps({
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
  })

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
      selectionOps.anchorFloat()
      dispatch({ type: 'deselect' })
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const saved = await savePng(canvas)
    if (saved) dispatch({ type: 'saved' })
  }

  const setZoom = (level: Magnification) => {
    if (level !== 1) lastZoomRef.current = level
    send({ type: 'zoom', level })
  }

  const pickTool = (tool: ToolId) => send({ type: 'tool', tool })

  const gestures = createPointerGestures({
    anchorFloat: selectionOps.anchorFloat,
    bitmapRef,
    blit,
    clearOverlay,
    dispatch,
    drawOverlay,
    drawSelection,
    floatRef,
    lastPointRef,
    lastZoomRef,
    liftIfNeeded: selectionOps.liftIfNeeded,
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
  })

  const nubBindings = createNubBindings({
    canvasRef,
    pointerIdRef,
    resizeCanvasTo,
    send,
    stateRef,
  })

  return {
    state,
    send,
    hover,
    canvasRef,
    overlayRef,
    fileInputRef,
    pointerHandlers: gestures.pointerHandlers,
    nubBindings,
    pickTool,
    setZoom,
    undo: doUndo,
    redo: doRedo,
    canUndo: () => historyRef.current.past.length > 0,
    canPaste: () => clipboardRef.current !== null,
    cut: selectionOps.cutSelection,
    copy: selectionOps.copySelection,
    paste: selectionOps.paste,
    clearSelection: selectionOps.clearSelection,
    selectAll: selectionOps.selectAll,
    escape: selectionOps.escapeGesture,
    newFile,
    openFile,
    saveFile,
    isDirty: () => stateRef.current.dirty,
  }
}

export type Paint = ReturnType<typeof usePaint>
