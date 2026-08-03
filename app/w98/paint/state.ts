import {
  DEFAULT_OPTIONS,
  type Magnification,
  type ToolOptions,
} from './options.ts'
import { DEFAULT_BG, DEFAULT_FG } from './palette.ts'
import type { Pt, Rect } from './raster.ts'
import { type ToolId, toolById } from './tools.ts'

export const INITIAL_W = 683
export const INITIAL_H = 384

export type Button = 'left' | 'right'

export type Nub = 'e' | 's' | 'se'

export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export type CurvePhase = 'line' | 'c1' | 'c2'

export type Mode =
  | { kind: 'idle' }
  | { kind: 'freehand'; last: Pt; button: Button }
  | { kind: 'shaping'; from: Pt; to: Pt; button: Button }
  | { kind: 'polygon'; points: readonly Pt[]; to: Pt; button: Button }
  | {
      kind: 'curving'
      phase: CurvePhase
      from: Pt
      to: Pt
      c1?: Pt
      c2?: Pt
      dragging: boolean
    }
  | { kind: 'selecting'; from: Pt; to: Pt }
  | { kind: 'selected'; rect: Rect }
  | { kind: 'movingSelection'; rect: Rect; grip: Pt }
  | { kind: 'resizingSelection'; rect: Rect; handle: Handle; to: Pt }
  | { kind: 'resizingCanvas'; nub: Nub; start: Pt; to: Pt }

export type PaintState = {
  tool: ToolId
  fg: string
  bg: string
  options: ToolOptions
  zoom: Magnification
  size: { w: number; h: number }
  dirty: boolean
  mode: Mode
}

export type PaintEvent =
  | { type: 'tool'; tool: ToolId }
  | { type: 'color'; slot: 'fg' | 'bg'; color: string }
  | { type: 'option'; patch: Partial<ToolOptions> }
  | { type: 'zoom'; level: Magnification }
  | { type: 'down'; at: Pt; button: Button }
  | { type: 'move'; at: Pt }
  | { type: 'up'; at: Pt }
  | { type: 'dblclick' }
  | { type: 'cancel' }
  | { type: 'commit' }
  | { type: 'deselect' }
  | { type: 'select-rect'; rect: Rect }
  | { type: 'grab'; at: Pt }
  | { type: 'grab-handle'; handle: Handle; at: Pt }
  | { type: 'resize-canvas'; nub: Nub; at: Pt }
  | { type: 'canvas-resized'; w: number; h: number }
  | { type: 'cleared'; w: number; h: number }
  | { type: 'opened'; w: number; h: number }
  | { type: 'saved' }

const IDLE: Mode = { kind: 'idle' }

export const INITIAL_PAINT: PaintState = {
  tool: 'pencil',
  fg: DEFAULT_FG,
  bg: DEFAULT_BG,
  options: DEFAULT_OPTIONS,
  zoom: 1,
  size: { w: INITIAL_W, h: INITIAL_H },
  dirty: false,
  mode: IDLE,
}

const samePt = (a: Pt, b: Pt): boolean => a.x === b.x && a.y === b.y

export const normRect = (a: Pt, b: Pt): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(b.x - a.x) + 1,
  h: Math.abs(b.y - a.y) + 1,
})

export type Size = { w: number; h: number }

const clampPt = (at: Pt, size: Size): Pt => ({
  x: Math.min(Math.max(at.x, 0), size.w - 1),
  y: Math.min(Math.max(at.y, 0), size.h - 1),
})

export const prospectiveSize = (
  size: Size,
  mode: Extract<Mode, { kind: 'resizingCanvas' }>,
): Size => ({
  w: mode.nub === 's' ? size.w : Math.max(1, size.w + mode.to.x - mode.start.x),
  h: mode.nub === 'e' ? size.h : Math.max(1, size.h + mode.to.y - mode.start.y),
})

// selection handles never flip the rect: edges clamp at one pixel
export const resizeRect = (rect: Rect, handle: Handle, to: Pt): Rect => {
  let x0 = rect.x
  let y0 = rect.y
  let x1 = rect.x + rect.w - 1
  let y1 = rect.y + rect.h - 1
  if (handle.includes('w')) x0 = Math.min(to.x, x1)
  if (handle.includes('e')) x1 = Math.max(to.x, x0)
  if (handle.includes('n')) y0 = Math.min(to.y, y1)
  if (handle.includes('s')) y1 = Math.max(to.y, y0)
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

const downCurve = (mode: Mode, at: Pt): Mode => {
  if (mode.kind !== 'curving') {
    return { kind: 'curving', phase: 'line', from: at, to: at, dragging: true }
  }
  if (mode.phase === 'c1') return { ...mode, c1: at, dragging: true }
  return { ...mode, c2: at, dragging: true }
}

const downPolygon = (mode: Mode, at: Pt, button: Button): Mode => {
  if (mode.kind === 'polygon') return { ...mode, to: at }
  return { kind: 'polygon', points: [at], to: at, button }
}

const reduceDown = (state: PaintState, at: Pt, button: Button): PaintState => {
  const kind = toolById[state.tool].kind
  if (kind === 'point') return state
  if (kind === 'freehand') {
    return { ...state, mode: { kind: 'freehand', last: at, button } }
  }
  if (kind === 'select') {
    const from = clampPt(at, state.size)
    return { ...state, mode: { kind: 'selecting', from, to: from } }
  }
  if (state.tool === 'curve') {
    return { ...state, mode: downCurve(state.mode, at) }
  }
  if (state.tool === 'polygon') {
    return { ...state, mode: downPolygon(state.mode, at, button) }
  }
  return { ...state, mode: { kind: 'shaping', from: at, to: at, button } }
}

const moveCurve = (mode: Extract<Mode, { kind: 'curving' }>, at: Pt): Mode => {
  if (!mode.dragging) return mode
  if (mode.phase === 'line') return { ...mode, to: at }
  if (mode.phase === 'c1') return { ...mode, c1: at }
  return { ...mode, c2: at }
}

const movedMode = (mode: Mode, at: Pt, size: Size): Mode => {
  switch (mode.kind) {
    case 'freehand':
      return { ...mode, last: at }
    case 'selecting':
      return { ...mode, to: clampPt(at, size) }
    case 'shaping':
    case 'polygon':
      return { ...mode, to: at }
    case 'curving':
      return moveCurve(mode, at)
    case 'movingSelection':
      return {
        ...mode,
        grip: at,
        rect: {
          ...mode.rect,
          x: mode.rect.x + at.x - mode.grip.x,
          y: mode.rect.y + at.y - mode.grip.y,
        },
      }
    case 'resizingSelection':
    case 'resizingCanvas':
      return { ...mode, to: at }
    default:
      return mode
  }
}

const upCurve = (
  state: PaintState,
  mode: Extract<Mode, { kind: 'curving' }>,
): PaintState => {
  if (mode.phase === 'line') {
    if (samePt(mode.from, mode.to)) return { ...state, mode: IDLE }
    return { ...state, mode: { ...mode, phase: 'c1', dragging: false } }
  }
  if (mode.phase === 'c1') {
    return { ...state, mode: { ...mode, phase: 'c2', dragging: false } }
  }
  return { ...state, mode: IDLE, dirty: true }
}

const upPolygon = (
  state: PaintState,
  mode: Extract<Mode, { kind: 'polygon' }>,
  at: Pt,
): PaintState => {
  const last = mode.points.at(-1)
  if (last && samePt(last, at)) return state
  return { ...state, mode: { ...mode, points: [...mode.points, at], to: at } }
}

const upSelecting = (state: PaintState, from: Pt, to: Pt): PaintState => {
  const rect = normRect(from, to)
  if (rect.w === 1 && rect.h === 1) return { ...state, mode: IDLE }
  return { ...state, mode: { kind: 'selected', rect } }
}

const reduceUp = (state: PaintState, at: Pt): PaintState => {
  const mode = state.mode
  switch (mode.kind) {
    case 'freehand':
    case 'shaping':
      return { ...state, mode: IDLE, dirty: true }
    case 'polygon':
      return upPolygon(state, mode, at)
    case 'curving':
      return upCurve(state, mode)
    case 'selecting':
      return upSelecting(state, mode.from, mode.to)
    case 'movingSelection':
      return {
        ...state,
        mode: { kind: 'selected', rect: mode.rect },
        dirty: true,
      }
    case 'resizingSelection':
      return {
        ...state,
        dirty: true,
        mode: {
          kind: 'selected',
          rect: resizeRect(mode.rect, mode.handle, mode.to),
        },
      }
    case 'resizingCanvas':
      return { ...state, mode: IDLE }
    default:
      return state
  }
}

export const reduce = (state: PaintState, event: PaintEvent): PaintState => {
  switch (event.type) {
    case 'tool':
      if (event.tool === state.tool) return state
      return { ...state, tool: event.tool, mode: IDLE }
    case 'color':
      return event.slot === 'fg'
        ? { ...state, fg: event.color }
        : { ...state, bg: event.color }
    case 'option':
      return { ...state, options: { ...state.options, ...event.patch } }
    case 'zoom':
      return { ...state, zoom: event.level }
    case 'down':
      return reduceDown(state, event.at, event.button)
    case 'move': {
      const moved = movedMode(state.mode, event.at, state.size)
      return moved === state.mode ? state : { ...state, mode: moved }
    }
    case 'up':
      return reduceUp(state, event.at)
    case 'dblclick':
      if (state.mode.kind !== 'polygon' || state.mode.points.length < 2) {
        return state
      }
      return { ...state, mode: IDLE, dirty: true }
    case 'cancel':
      return state.mode.kind === 'idle' ? state : { ...state, mode: IDLE }
    case 'commit':
      return { ...state, dirty: true }
    case 'deselect':
      if (state.mode.kind !== 'selected' && state.mode.kind !== 'selecting') {
        return state
      }
      return { ...state, mode: IDLE }
    case 'select-rect':
      return {
        ...state,
        tool: 'select',
        mode: { kind: 'selected', rect: event.rect },
      }
    case 'grab':
      if (state.mode.kind !== 'selected') return state
      return {
        ...state,
        mode: {
          kind: 'movingSelection',
          rect: state.mode.rect,
          grip: event.at,
        },
      }
    case 'grab-handle':
      if (state.mode.kind !== 'selected') return state
      return {
        ...state,
        mode: {
          kind: 'resizingSelection',
          rect: state.mode.rect,
          handle: event.handle,
          to: event.at,
        },
      }
    case 'resize-canvas':
      return {
        ...state,
        mode: {
          kind: 'resizingCanvas',
          nub: event.nub,
          start: event.at,
          to: event.at,
        },
      }
    case 'canvas-resized':
      return {
        ...state,
        size: { w: event.w, h: event.h },
        dirty: true,
        mode: IDLE,
      }
    case 'cleared':
      return {
        ...state,
        size: { w: event.w, h: event.h },
        dirty: false,
        zoom: 1,
        mode: IDLE,
      }
    case 'opened':
      return {
        ...state,
        size: { w: event.w, h: event.h },
        dirty: false,
        zoom: 1,
        mode: IDLE,
      }
    case 'saved':
      return { ...state, dirty: false }
  }
}
