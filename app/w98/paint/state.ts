import { clamp } from 'es-toolkit'
import { match, P } from 'ts-pattern'
import {
  type Handle,
  type Point,
  type Rect,
  rectFromPoints,
} from './geometry.ts'
import {
  DEFAULT_OPTIONS,
  type Magnification,
  type ToolOptions,
} from './options.ts'
import { DEFAULT_BG, DEFAULT_FG } from './palette.ts'
import { type ToolId, toolById } from './tools.ts'

export const INITIAL_WIDTH = 683
export const INITIAL_HEIGHT = 384

export type Button = 'left' | 'right'

export type Nub = 'e' | 's' | 'se'

export type CurvePhase = 'line' | 'c1' | 'c2'

export type Mode =
  | { kind: 'idle' }
  | { kind: 'freehand'; last: Point; button: Button }
  | { kind: 'shaping'; from: Point; to: Point; button: Button }
  | { kind: 'polygon'; points: readonly Point[]; to: Point; button: Button }
  | {
      kind: 'curving'
      phase: CurvePhase
      from: Point
      to: Point
      c1?: Point
      c2?: Point
      dragging: boolean
    }
  | { kind: 'selecting'; from: Point; to: Point }
  | { kind: 'selected'; rect: Rect }
  | { kind: 'movingSelection'; rect: Rect; grip: Point }
  | { kind: 'resizingSelection'; rect: Rect; handle: Handle; to: Point }
  | { kind: 'resizingCanvas'; nub: Nub; start: Point; to: Point }

export type PaintState = {
  tool: ToolId
  fg: string
  bg: string
  options: ToolOptions
  zoom: Magnification
  size: { width: number; height: number }
  dirty: boolean
  mode: Mode
}

export type PaintEvent =
  | { type: 'tool'; tool: ToolId }
  | { type: 'color'; slot: 'fg' | 'bg'; color: string }
  | { type: 'option'; patch: Partial<ToolOptions> }
  | { type: 'zoom'; level: Magnification }
  | { type: 'down'; at: Point; button: Button }
  | { type: 'move'; at: Point }
  | { type: 'up'; at: Point }
  | { type: 'dblclick' }
  | { type: 'cancel' }
  | { type: 'commit' }
  | { type: 'deselect' }
  | { type: 'select-rect'; rect: Rect }
  | { type: 'grab'; at: Point }
  | { type: 'grab-handle'; handle: Handle; at: Point }
  | { type: 'resize-canvas'; nub: Nub; at: Point }
  | { type: 'canvas-resized'; width: number; height: number }
  | { type: 'cleared'; width: number; height: number }
  | { type: 'opened'; width: number; height: number }
  | { type: 'saved' }

const IDLE: Mode = { kind: 'idle' }

export const INITIAL_PAINT: PaintState = {
  tool: 'pencil',
  fg: DEFAULT_FG,
  bg: DEFAULT_BG,
  options: DEFAULT_OPTIONS,
  zoom: 1,
  size: { width: INITIAL_WIDTH, height: INITIAL_HEIGHT },
  dirty: false,
  mode: IDLE,
}

const samePoint = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y

export type Size = { width: number; height: number }

const clampPoint = (at: Point, size: Size): Point => ({
  x: clamp(at.x, 0, size.width - 1),
  y: clamp(at.y, 0, size.height - 1),
})

export const prospectiveSize = (
  size: Size,
  mode: Extract<Mode, { kind: 'resizingCanvas' }>,
): Size => ({
  width:
    mode.nub === 's'
      ? size.width
      : Math.max(1, size.width + mode.to.x - mode.start.x),
  height:
    mode.nub === 'e'
      ? size.height
      : Math.max(1, size.height + mode.to.y - mode.start.y),
})

export const resizeRect = (rect: Rect, handle: Handle, to: Point): Rect => {
  let x0 = rect.x
  let y0 = rect.y
  let x1 = rect.x + rect.width - 1
  let y1 = rect.y + rect.height - 1
  if (handle.includes('w')) x0 = Math.min(to.x, x1)
  if (handle.includes('e')) x1 = Math.max(to.x, x0)
  if (handle.includes('n')) y0 = Math.min(to.y, y1)
  if (handle.includes('s')) y1 = Math.max(to.y, y0)
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

const downCurve = (mode: Mode, at: Point): Mode => {
  if (mode.kind !== 'curving') {
    return { kind: 'curving', phase: 'line', from: at, to: at, dragging: true }
  }
  if (mode.phase === 'c1') return { ...mode, c1: at, dragging: true }
  return { ...mode, c2: at, dragging: true }
}

const downPolygon = (mode: Mode, at: Point, button: Button): Mode => {
  if (mode.kind === 'polygon') return { ...mode, to: at }
  return { kind: 'polygon', points: [at], to: at, button }
}

const reduceDown = (
  state: PaintState,
  at: Point,
  button: Button,
): PaintState => {
  const kind = toolById[state.tool].kind
  if (kind === 'point') return state
  if (kind === 'freehand') {
    return { ...state, mode: { kind: 'freehand', last: at, button } }
  }
  if (kind === 'select') {
    const from = clampPoint(at, state.size)
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

const moveCurve = (
  mode: Extract<Mode, { kind: 'curving' }>,
  at: Point,
): Mode => {
  if (!mode.dragging) return mode
  if (mode.phase === 'line') return { ...mode, to: at }
  if (mode.phase === 'c1') return { ...mode, c1: at }
  return { ...mode, c2: at }
}

const movedMode = (mode: Mode, at: Point, size: Size): Mode =>
  match(mode)
    .returnType<Mode>()
    .with({ kind: 'freehand' }, (mode) => ({ ...mode, last: at }))
    .with({ kind: 'selecting' }, (mode) => ({
      ...mode,
      to: clampPoint(at, size),
    }))
    .with({ kind: P.union('shaping', 'polygon') }, (mode) => ({
      ...mode,
      to: at,
    }))
    .with({ kind: 'curving' }, (mode) => moveCurve(mode, at))
    .with({ kind: 'movingSelection' }, (mode) => ({
      ...mode,
      grip: at,
      rect: {
        ...mode.rect,
        x: mode.rect.x + at.x - mode.grip.x,
        y: mode.rect.y + at.y - mode.grip.y,
      },
    }))
    .with({ kind: P.union('resizingSelection', 'resizingCanvas') }, (mode) => ({
      ...mode,
      to: at,
    }))
    .otherwise(() => mode)

const upCurve = (
  state: PaintState,
  mode: Extract<Mode, { kind: 'curving' }>,
): PaintState => {
  if (mode.phase === 'line') {
    if (samePoint(mode.from, mode.to)) return { ...state, mode: IDLE }
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
  at: Point,
): PaintState => {
  const last = mode.points.at(-1)
  if (last && samePoint(last, at)) return state
  return { ...state, mode: { ...mode, points: [...mode.points, at], to: at } }
}

const upSelecting = (state: PaintState, from: Point, to: Point): PaintState => {
  const rect = rectFromPoints(from, to)
  if (rect.width === 1 && rect.height === 1) return { ...state, mode: IDLE }
  return { ...state, mode: { kind: 'selected', rect } }
}

const reduceUp = (state: PaintState, at: Point): PaintState =>
  match(state.mode)
    .returnType<PaintState>()
    .with({ kind: P.union('freehand', 'shaping') }, () => ({
      ...state,
      mode: IDLE,
      dirty: true,
    }))
    .with({ kind: 'polygon' }, (mode) => upPolygon(state, mode, at))
    .with({ kind: 'curving' }, (mode) => upCurve(state, mode))
    .with({ kind: 'selecting' }, (mode) =>
      upSelecting(state, mode.from, mode.to),
    )
    .with({ kind: 'movingSelection' }, ({ rect }) => ({
      ...state,
      mode: { kind: 'selected', rect },
      dirty: true,
    }))
    .with({ kind: 'resizingSelection' }, (mode) => ({
      ...state,
      dirty: true,
      mode: {
        kind: 'selected',
        rect: resizeRect(mode.rect, mode.handle, mode.to),
      },
    }))
    .with({ kind: 'resizingCanvas' }, () => ({ ...state, mode: IDLE }))
    .otherwise(() => state)

export const reduce = (state: PaintState, event: PaintEvent): PaintState =>
  match(event)
    .returnType<PaintState>()
    .with({ type: 'tool' }, ({ tool }) => {
      if (tool === state.tool) return state
      return { ...state, tool, mode: IDLE }
    })
    .with({ type: 'color' }, (event) =>
      event.slot === 'fg'
        ? { ...state, fg: event.color }
        : { ...state, bg: event.color },
    )
    .with({ type: 'option' }, ({ patch }) => ({
      ...state,
      options: { ...state.options, ...patch },
    }))
    .with({ type: 'zoom' }, ({ level }) => ({ ...state, zoom: level }))
    .with({ type: 'down' }, (event) =>
      reduceDown(state, event.at, event.button),
    )
    .with({ type: 'move' }, ({ at }) => {
      const moved = movedMode(state.mode, at, state.size)
      return moved === state.mode ? state : { ...state, mode: moved }
    })
    .with({ type: 'up' }, ({ at }) => reduceUp(state, at))
    .with({ type: 'dblclick' }, () => {
      if (state.mode.kind !== 'polygon' || state.mode.points.length < 2) {
        return state
      }
      return { ...state, mode: IDLE, dirty: true }
    })
    .with({ type: 'cancel' }, () =>
      state.mode.kind === 'idle' ? state : { ...state, mode: IDLE },
    )
    .with({ type: 'commit' }, () => ({ ...state, dirty: true }))
    .with({ type: 'deselect' }, () => {
      if (state.mode.kind !== 'selected' && state.mode.kind !== 'selecting') {
        return state
      }
      return { ...state, mode: IDLE }
    })
    .with({ type: 'select-rect' }, ({ rect }) => ({
      ...state,
      tool: 'select',
      mode: { kind: 'selected', rect },
    }))
    .with({ type: 'grab' }, ({ at }) => {
      if (state.mode.kind !== 'selected') return state
      return {
        ...state,
        mode: {
          kind: 'movingSelection',
          rect: state.mode.rect,
          grip: at,
        },
      }
    })
    .with({ type: 'grab-handle' }, (event) => {
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
    })
    .with({ type: 'resize-canvas' }, (event) => ({
      ...state,
      mode: {
        kind: 'resizingCanvas',
        nub: event.nub,
        start: event.at,
        to: event.at,
      },
    }))
    .with({ type: 'canvas-resized' }, (event) => ({
      ...state,
      size: { width: event.width, height: event.height },
      dirty: true,
      mode: IDLE,
    }))
    .with({ type: 'cleared' }, (event) => ({
      ...state,
      size: { width: event.width, height: event.height },
      dirty: false,
      zoom: 1,
      mode: IDLE,
    }))
    .with({ type: 'opened' }, (event) => ({
      ...state,
      size: { width: event.width, height: event.height },
      dirty: false,
      zoom: 1,
      mode: IDLE,
    }))
    .with({ type: 'saved' }, () => ({ ...state, dirty: false }))
    .exhaustive()
