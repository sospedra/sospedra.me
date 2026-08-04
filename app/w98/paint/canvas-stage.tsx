import type React from 'react'
import {
  type Handle,
  handleAt,
  handleTolerance,
  insideRect,
  type Point,
} from './geometry.ts'
import css from './paint.module.css'
import { type Mode, prospectiveSize, type Size } from './state.ts'
import { toolById } from './tools.ts'
import type { Paint } from './use-paint.ts'

const gestureSize = (mode: Mode): string | null => {
  if (mode.kind !== 'shaping' && mode.kind !== 'selecting') return null
  const width = Math.abs(mode.to.x - mode.from.x) + 1
  const height = Math.abs(mode.to.y - mode.from.y) + 1
  return `${width} x ${height}`
}

const cursorOf = (name: string, fallback: string) =>
  `url("/images/w98/paint/${name}.png") 16 16, ${fallback}`

const MOVE_CURSOR = cursorOf('move', 'move')

const HANDLE_CURSORS: Record<Handle, string> = {
  n: cursorOf('ns-resize', 'ns-resize'),
  s: cursorOf('ns-resize', 'ns-resize'),
  e: cursorOf('ew-resize', 'ew-resize'),
  w: cursorOf('ew-resize', 'ew-resize'),
  ne: cursorOf('nesw-resize', 'nesw-resize'),
  sw: cursorOf('nesw-resize', 'nesw-resize'),
  nw: cursorOf('nwse-resize', 'nwse-resize'),
  se: cursorOf('nwse-resize', 'nwse-resize'),
}

const selectionCursor = (paint: Paint): string | null => {
  const mode = paint.state.mode
  if (mode.kind === 'movingSelection') return MOVE_CURSOR
  if (mode.kind === 'resizingSelection') return HANDLE_CURSORS[mode.handle]
  const eligible =
    paint.state.tool === 'select' && mode.kind === 'selected' && paint.hover
  if (!eligible || !paint.hover) return null
  const handle = handleAt(
    mode.rect,
    paint.hover,
    handleTolerance(paint.state.zoom),
  )
  if (handle) return HANDLE_CURSORS[handle]
  return insideRect(mode.rect, paint.hover) ? MOVE_CURSOR : null
}

export const CanvasStage: React.FC<{ paint: Paint }> = ({ paint }) => {
  const { state } = paint
  const zoomed = {
    width: state.size.width * state.zoom,
    height: state.size.height * state.zoom,
  }
  const resizing =
    state.mode.kind === 'resizingCanvas'
      ? prospectiveSize(state.size, state.mode)
      : null
  return (
    <div className={css.canvasArea}>
      <div className={css.canvasStage}>
        <canvas
          ref={paint.canvasRef}
          className={css.bitmap}
          width={state.size.width}
          height={state.size.height}
          aria-label='Paint canvas'
          style={{
            ...zoomed,
            cursor: selectionCursor(paint) ?? toolById[state.tool].cursor,
          }}
          {...paint.pointerHandlers}
        />
        <canvas
          ref={paint.overlayRef}
          className={css.overlay}
          width={state.size.width}
          height={state.size.height}
          aria-hidden='true'
          tabIndex={-1}
          style={zoomed}
        />
        <p className='sr-only'>Drawing needs a pointer.</p>
        {resizing && (
          <span
            className={css.resizePreview}
            style={{
              width: resizing.width * state.zoom,
              height: resizing.height * state.zoom,
            }}
          />
        )}
        <button
          type='button'
          className={css.nubE}
          aria-label='Resize canvas width'
          {...paint.nubBindings('e')}
        />
        <button
          type='button'
          className={css.nubS}
          aria-label='Resize canvas height'
          {...paint.nubBindings('s')}
        />
        <button
          type='button'
          className={css.nubSE}
          aria-label='Resize canvas'
          {...paint.nubBindings('se')}
        />
      </div>
    </div>
  )
}

export const StatusBar: React.FC<{
  hover: Point | null
  mode: Mode
  size: Size
}> = ({ hover, mode, size }) => (
  <footer className={css.statusBar}>
    <span className={css.statusText}>Ready</span>
    <span className={css.statusCoords}>
      {hover ? `${hover.x},${hover.y}` : ''}
    </span>
    <span className={css.statusSize}>
      {gestureSize(mode) ?? `${size.width} x ${size.height}`}
    </span>
  </footer>
)
