import type { ComponentPropsWithoutRef, RefCallback } from 'react'
import css from './crt-assembly.module.css'

export type LifeTool = 'draw' | 'move'

type CanvasElementProps = Omit<
  ComponentPropsWithoutRef<'canvas'>,
  'children' | 'className' | 'ref'
>

export type LifeCanvasUi = {
  bind: RefCallback<HTMLCanvasElement>
  props: CanvasElementProps
  tool: LifeTool
  coordinateText: string
  zoom: number
  zoomText: string
  setTool: (tool: LifeTool) => void
  zoomBy: (factor: number) => void
  panBy: (screenX: number, screenY: number) => void
  fit: () => void
}

export const LifeCanvas = ({ canvas }: { canvas: LifeCanvasUi }) => (
  <canvas
    ref={canvas.bind}
    className={css.lifeCanvas}
    data-tool={canvas.tool}
    {...canvas.props}
  >
    An interactive infinite grid for Conway&apos;s Game of Life.
  </canvas>
)
