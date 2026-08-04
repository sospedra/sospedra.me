import type { ToolId } from './tools.ts'

export const ERASER_SIZES = [4, 6, 8, 10] as const

export const BRUSH_SHAPES = [
  'circle',
  'square',
  'reverseDiagonal',
  'diagonal',
] as const

export type BrushShape = (typeof BRUSH_SHAPES)[number]

// circles run 7/4/1, the other shapes 8/5/2, like the original picker
export const BRUSH_SIZES: Record<BrushShape, readonly number[]> = {
  circle: [7, 4, 1],
  square: [8, 5, 2],
  reverseDiagonal: [8, 5, 2],
  diagonal: [8, 5, 2],
}

export type BrushCell = { shape: BrushShape; size: number }

export const BRUSH_CELLS: readonly BrushCell[] = [0, 1, 2].flatMap((row) =>
  BRUSH_SHAPES.map((shape) => ({ shape, size: BRUSH_SIZES[shape][row] })),
)

export const AIRBRUSH_SIZES = [9, 16, 24] as const

export const STROKE_SIZES = [1, 2, 3, 4, 5] as const

export const MAGNIFICATIONS = [1, 2, 6, 8] as const

export type Magnification = (typeof MAGNIFICATIONS)[number]

export const FILL_STYLES = ['outline', 'both', 'fill'] as const

export type FillStyle = (typeof FILL_STYLES)[number]

export const SELECT_MODES = ['opaque', 'transparent'] as const

export type SelectMode = (typeof SELECT_MODES)[number]

export type ToolOptions = {
  eraserSize: number
  brush: BrushCell
  airbrushSize: number
  strokeSize: number
  fillStyle: FillStyle
  selectMode: SelectMode
}

export const DEFAULT_OPTIONS: ToolOptions = {
  eraserSize: 8,
  brush: { shape: 'circle', size: 4 },
  airbrushSize: 9,
  strokeSize: 1,
  fillStyle: 'outline',
  selectMode: 'opaque',
}

export type OptionWidget =
  | 'none'
  | 'selectMode'
  | 'eraser'
  | 'brush'
  | 'airbrush'
  | 'stroke'
  | 'magnifier'
  | 'fillStyle'

export const OPTION_WIDGET: Record<ToolId, OptionWidget> = {
  select: 'selectMode',
  eraser: 'eraser',
  fill: 'none',
  pick: 'none',
  magnifier: 'magnifier',
  pencil: 'none',
  brush: 'brush',
  airbrush: 'airbrush',
  line: 'stroke',
  curve: 'stroke',
  rect: 'fillStyle',
  polygon: 'fillStyle',
  ellipse: 'fillStyle',
  rrect: 'fillStyle',
}
