export type ToolId =
  | 'select'
  | 'eraser'
  | 'fill'
  | 'pick'
  | 'magnifier'
  | 'pencil'
  | 'brush'
  | 'airbrush'
  | 'line'
  | 'curve'
  | 'rect'
  | 'polygon'
  | 'ellipse'
  | 'rrect'

export type ToolKind = 'select' | 'freehand' | 'shape' | 'point'

export type ToolDescriptor = {
  id: ToolId
  kind: ToolKind
  name: string
  icon: string
  cursor: string
}

// hotspots match the jspaint originals these cursor bitmaps come from
const cursor = (name: string, x: number, y: number, fallback: string) =>
  `url("/images/w98/paint/${name}.png") ${x} ${y}, ${fallback}`

const PRECISE = cursor('precise', 16, 16, 'crosshair')

export const TOOLS: readonly ToolDescriptor[] = [
  {
    id: 'select',
    kind: 'select',
    name: 'Select',
    icon: '/images/w98/paint/p_sel.gif',
    cursor: PRECISE,
  },
  {
    id: 'eraser',
    kind: 'freehand',
    name: 'Eraser',
    icon: '/images/w98/paint/p_erase.gif',
    cursor: PRECISE,
  },
  {
    id: 'fill',
    kind: 'point',
    name: 'Fill With Color',
    icon: '/images/w98/paint/p_paint.gif',
    cursor: cursor('fill-bucket', 8, 22, 'crosshair'),
  },
  {
    id: 'pick',
    kind: 'point',
    name: 'Pick Color',
    icon: '/images/w98/paint/p_eye.gif',
    cursor: cursor('eye-dropper', 9, 22, 'crosshair'),
  },
  {
    id: 'magnifier',
    kind: 'point',
    name: 'Magnifier',
    icon: '/images/w98/paint/p_zoom.gif',
    cursor: cursor('magnifier', 16, 16, 'zoom-in'),
  },
  {
    id: 'pencil',
    kind: 'freehand',
    name: 'Pencil',
    icon: '/images/w98/paint/p_pencil.gif',
    cursor: cursor('pencil', 13, 23, 'crosshair'),
  },
  {
    id: 'brush',
    kind: 'freehand',
    name: 'Brush',
    icon: '/images/w98/paint/p_brush.gif',
    cursor: PRECISE,
  },
  {
    id: 'airbrush',
    kind: 'freehand',
    name: 'Airbrush',
    icon: '/images/w98/paint/p_airb.gif',
    cursor: cursor('airbrush', 7, 22, 'crosshair'),
  },
  {
    id: 'line',
    kind: 'shape',
    name: 'Line',
    icon: '/images/w98/paint/p_line.gif',
    cursor: PRECISE,
  },
  {
    id: 'curve',
    kind: 'shape',
    name: 'Curve',
    icon: '/images/w98/paint/p_curve.gif',
    cursor: PRECISE,
  },
  {
    id: 'rect',
    kind: 'shape',
    name: 'Rectangle',
    icon: '/images/w98/paint/p_rect.gif',
    cursor: PRECISE,
  },
  {
    id: 'polygon',
    kind: 'shape',
    name: 'Polygon',
    icon: '/images/w98/paint/p_poly.gif',
    cursor: PRECISE,
  },
  {
    id: 'ellipse',
    kind: 'shape',
    name: 'Ellipse',
    icon: '/images/w98/paint/p_oval.gif',
    cursor: PRECISE,
  },
  {
    id: 'rrect',
    kind: 'shape',
    name: 'Rounded Rectangle',
    icon: '/images/w98/paint/p_rrect.gif',
    cursor: PRECISE,
  },
]

export const toolById = Object.fromEntries(
  TOOLS.map((tool) => [tool.id, tool]),
) as Record<ToolId, ToolDescriptor>
