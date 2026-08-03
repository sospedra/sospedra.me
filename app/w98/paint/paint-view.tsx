'use client'

import type React from 'react'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { isEditableTarget, useGameInput } from 'services/hotkeys'
import w98 from '../w98.module.css'
import { useBeforeUnloadGuard } from './exit-guard.ts'
import {
  type Handle,
  handleAt,
  handleTolerance,
  insideRect,
} from './geometry.ts'
import {
  AIRBRUSH_SIZES,
  BRUSH_CELLS,
  type BrushCell,
  ERASER_SIZES,
  FILL_STYLES,
  MAGNIFICATIONS,
  type Magnification,
  OPTION_WIDGET,
  type OptionWidget,
  SELECT_MODES,
  STROKE_SIZES,
  type ToolOptions,
} from './options.ts'
import css from './paint.module.css'
import { PALETTE } from './palette.ts'
import { type Mode, prospectiveSize } from './state.ts'
import { TOOLS, type ToolId, toolById } from './tools.ts'
import { type Paint, usePaint } from './use-paint.ts'

type DragHandle = {
  onPointerDown: React.PointerEventHandler<HTMLElement>
  onPointerMove: React.PointerEventHandler<HTMLElement>
  onPointerUp: React.PointerEventHandler<HTMLElement>
  onPointerCancel: React.PointerEventHandler<HTMLElement>
}

export type PaintHandle = {
  isDirty: () => boolean
  confirmExit: (proceed: () => void) => void
}

export type PaintWindowProps = {
  dragStyle: React.CSSProperties
  dragHandle: DragHandle
  active: boolean
  minimize: () => void
  close: () => void
  ref?: React.Ref<PaintHandle>
}

type MenuId = 'file' | 'edit'

type MenuItemSpec = {
  label: React.ReactNode
  name: string
  kbd?: string
}

const FILE_ITEMS: readonly MenuItemSpec[] = [
  {
    label: (
      <>
        <u>N</u>ew
      </>
    ),
    name: 'New',
  },
  {
    label: (
      <>
        <u>O</u>pen…
      </>
    ),
    name: 'Open',
    kbd: 'Ctrl+O',
  },
  {
    label: (
      <>
        Save <u>A</u>s…
      </>
    ),
    name: 'Save As',
    kbd: 'Ctrl+S',
  },
]

const EDIT_ITEMS: readonly (MenuItemSpec | 'divider')[] = [
  {
    label: (
      <>
        <u>U</u>ndo
      </>
    ),
    name: 'Undo',
    kbd: 'Ctrl+Z',
  },
  'divider',
  {
    label: (
      <>
        Cu<u>t</u>
      </>
    ),
    name: 'Cut',
    kbd: 'Ctrl+X',
  },
  {
    label: (
      <>
        <u>C</u>opy
      </>
    ),
    name: 'Copy',
    kbd: 'Ctrl+C',
  },
  {
    label: (
      <>
        <u>P</u>aste
      </>
    ),
    name: 'Paste',
    kbd: 'Ctrl+V',
  },
  {
    label: (
      <>
        C<u>l</u>ear Selection
      </>
    ),
    name: 'Clear Selection',
    kbd: 'Del',
  },
  {
    label: (
      <>
        Select <u>A</u>ll
      </>
    ),
    name: 'Select All',
    kbd: 'Ctrl+A',
  },
]

const PaintMenu: React.FC<{
  items: readonly (MenuItemSpec | 'divider')[]
  label: string
  disabled?: Record<string, boolean>
  act: (name: string) => void
}> = ({ items, label, disabled, act }) => (
  <div className={w98.menu} role='menu' aria-label={label}>
    {items.map((item, index) =>
      item === 'divider' ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: dividers are positional
        <hr key={index} />
      ) : (
        <button
          key={item.name}
          type='button'
          role='menuitem'
          className={w98.menuItem}
          disabled={disabled?.[item.name] ?? false}
          onClick={() => act(item.name)}
        >
          <span>{item.label}</span>
          {item.kbd && <kbd>{item.kbd}</kbd>}
        </button>
      ),
    )}
  </div>
)

const ToolBox: React.FC<{
  toolId: ToolId
  pick: (tool: ToolId) => void
}> = ({ toolId, pick }) => (
  <div className={css.toolGrid} role='toolbar' aria-label='Tools'>
    {TOOLS.map((tool) => (
      <button
        key={tool.id}
        type='button'
        className={css.toolButton}
        aria-pressed={tool.id === toolId}
        aria-label={tool.name}
        title={tool.name}
        onClick={() => pick(tool.id)}
      >
        <img src={tool.icon} alt='' draggable={false} />
      </button>
    ))}
  </div>
)

type WidgetProps = {
  options: ToolOptions
  patch: (partial: Partial<ToolOptions>) => void
  zoom: Magnification
  setZoom: (zoom: Magnification) => void
}

const StrokeOptions: React.FC<WidgetProps> = ({ options, patch }) => (
  <>
    {STROKE_SIZES.map((size) => (
      <button
        key={size}
        type='button'
        className={css.optionButton}
        style={{ height: 8 }}
        aria-pressed={size === options.strokeSize}
        aria-label={`${size} pixel line`}
        onClick={() => patch({ strokeSize: size })}
      >
        <span className={css.strokeMark} style={{ height: size }} />
      </button>
    ))}
  </>
)

const EraserOptions: React.FC<WidgetProps> = ({ options, patch }) => (
  <>
    {ERASER_SIZES.map((size) => (
      <button
        key={size}
        type='button'
        className={css.optionButton}
        style={{ height: 14 }}
        aria-pressed={size === options.eraserSize}
        aria-label={`${size} pixel eraser`}
        onClick={() => patch({ eraserSize: size })}
      >
        <span
          className={css.eraserMark}
          style={{ width: size, height: size }}
        />
      </button>
    ))}
  </>
)

const markThickness = (size: number) => Math.max(1, Math.round(size / 4))

const BrushMark: React.FC<{ cell: BrushCell }> = ({ cell }) => {
  const slim = cell.shape === 'diagonal' || cell.shape === 'reverseDiagonal'
  return (
    <span
      className={css.brushMark}
      data-shape={cell.shape}
      style={{
        width: cell.size,
        height: slim ? markThickness(cell.size) : cell.size,
      }}
    />
  )
}

const BrushOptions: React.FC<WidgetProps> = ({ options, patch }) => (
  <div className={css.brushGrid}>
    {BRUSH_CELLS.map((cell) => (
      <button
        key={`${cell.shape}-${cell.size}`}
        type='button'
        className={css.brushCell}
        aria-pressed={
          cell.shape === options.brush.shape && cell.size === options.brush.size
        }
        aria-label={`${cell.size} pixel ${cell.shape} brush`}
        onClick={() => patch({ brush: cell })}
      >
        <BrushMark cell={cell} />
      </button>
    ))}
  </div>
)

const SPRAY_DISPLAY = [10, 14, 18]

const AirbrushOptions: React.FC<WidgetProps> = ({ options, patch }) => (
  <>
    {AIRBRUSH_SIZES.map((size, index) => (
      <button
        key={size}
        type='button'
        className={css.optionButton}
        style={{ height: SPRAY_DISPLAY[index] + 2 }}
        aria-pressed={size === options.airbrushSize}
        aria-label={`${size} pixel spray`}
        onClick={() => patch({ airbrushSize: size })}
      >
        <span
          className={css.sprayMark}
          style={{ width: SPRAY_DISPLAY[index], height: SPRAY_DISPLAY[index] }}
        />
      </button>
    ))}
  </>
)

const MagnifierOptions: React.FC<WidgetProps> = ({ zoom, setZoom }) => (
  <>
    {MAGNIFICATIONS.map((level) => (
      <button
        key={level}
        type='button'
        className={css.optionButton}
        style={{ height: 14 }}
        aria-pressed={level === zoom}
        aria-label={`Zoom ${level}x`}
        onClick={() => setZoom(level)}
      >
        <span className={css.magLabel}>{level}x</span>
      </button>
    ))}
  </>
)

const FillStyleOptions: React.FC<WidgetProps> = ({ options, patch }) => (
  <>
    {FILL_STYLES.map((style) => (
      <button
        key={style}
        type='button'
        className={css.optionButton}
        style={{ height: 16 }}
        aria-pressed={style === options.fillStyle}
        aria-label={`Shape style ${style}`}
        onClick={() => patch({ fillStyle: style })}
      >
        <span className={css.fillMark} data-style={style} />
      </button>
    ))}
  </>
)

const SELECT_MODE_ICON = {
  opaque: '/images/w98/paint/p_opaq.gif',
  transparent: '/images/w98/paint/p_trans.gif',
}

const SelectModeOptions: React.FC<WidgetProps> = ({ options, patch }) => (
  <>
    {SELECT_MODES.map((mode) => (
      <button
        key={mode}
        type='button'
        className={css.optionButton}
        style={{ height: 20 }}
        aria-pressed={mode === options.selectMode}
        aria-label={`${mode} selection`}
        onClick={() => patch({ selectMode: mode })}
      >
        <img src={SELECT_MODE_ICON[mode]} alt='' draggable={false} />
      </button>
    ))}
  </>
)

const WIDGET_VIEW: Record<OptionWidget, React.FC<WidgetProps> | null> = {
  none: null,
  selectMode: SelectModeOptions,
  eraser: EraserOptions,
  brush: BrushOptions,
  airbrush: AirbrushOptions,
  stroke: StrokeOptions,
  magnifier: MagnifierOptions,
  fillStyle: FillStyleOptions,
}

const OptionsBox: React.FC<WidgetProps & { toolId: ToolId }> = ({
  toolId,
  ...widget
}) => {
  const Widget = WIDGET_VIEW[OPTION_WIDGET[toolId]]
  return (
    <fieldset className={css.optionsBox}>
      <legend className='sr-only'>Tool options</legend>
      {Widget && <Widget {...widget} />}
    </fieldset>
  )
}

const PaletteBar: React.FC<{
  fg: string
  bg: string
  setFg: (color: string) => void
  setBg: (color: string) => void
}> = ({ fg, bg, setFg, setBg }) => (
  <div className={css.palette}>
    <span
      className={css.currentColors}
      role='img'
      aria-label={`Foreground ${fg}, background ${bg}`}
    >
      <i className={css.bgSwatch} style={{ background: bg }} />
      <i className={css.fgSwatch} style={{ background: fg }} />
    </span>
    <fieldset className={css.swatches}>
      <legend className='sr-only'>Color palette</legend>
      {PALETTE.map((color) => (
        <button
          key={color}
          type='button'
          className={css.swatch}
          style={{ background: color }}
          aria-label={`Color ${color}`}
          onClick={() => setFg(color)}
          onContextMenu={(event) => {
            event.preventDefault()
            setBg(color)
          }}
        />
      ))}
    </fieldset>
  </div>
)

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

// paint owns the keyboard while focused: the global single-key routes go quiet
const ClaimKeys: React.FC = () => {
  useGameInput()
  return null
}

export default function PaintWindow({
  dragStyle,
  dragHandle,
  active,
  minimize,
  close,
  ref,
}: PaintWindowProps) {
  const paint = usePaint()
  const { state } = paint
  const [menu, setMenu] = useState<MenuId | null>(null)
  const [prompt, setPrompt] = useState<(() => void) | null>(null)

  const confirmDirty = (action: () => void) => {
    if (paint.isDirty()) setPrompt(() => action)
    else action()
  }

  useImperativeHandle(ref, () => ({
    isDirty: paint.isDirty,
    confirmExit: confirmDirty,
  }))

  useBeforeUnloadGuard(state.dirty)

  const openPicker = () => paint.fileInputRef.current?.click()

  const promptYes = async () => {
    const proceed = prompt
    setPrompt(null)
    await paint.saveFile()
    proceed?.()
  }

  const promptNo = () => {
    const proceed = prompt
    setPrompt(null)
    proceed?.()
  }

  const MENU_ACTIONS: Record<string, () => void> = {
    New: () => confirmDirty(paint.newFile),
    Open: () => confirmDirty(openPicker),
    'Save As': () => {
      void paint.saveFile()
    },
    Undo: paint.undo,
    Cut: paint.cut,
    Copy: paint.copy,
    Paste: paint.paste,
    'Clear Selection': paint.clearSelection,
    'Select All': paint.selectAll,
  }

  const menuAction = (name: string) => {
    setMenu(null)
    MENU_ACTIONS[name]?.()
  }

  const MOD_ACTIONS: Record<string, () => void> = {
    z: paint.undo,
    'shift+z': paint.redo,
    y: paint.redo,
    x: paint.cut,
    c: paint.copy,
    v: paint.paste,
    a: paint.selectAll,
    s: () => {
      void paint.saveFile()
    },
    o: () => confirmDirty(openPicker),
  }

  const plainKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (prompt) setPrompt(null)
      else if (menu) setMenu(null)
      else paint.escape()
      event.preventDefault()
      return
    }
    const clears = event.key === 'Delete' || event.key === 'Backspace'
    if (clears && state.mode.kind === 'selected') {
      paint.clearSelection()
      event.preventDefault()
    }
  }

  const handleKey = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return
    if (!event.metaKey && !event.ctrlKey) {
      plainKey(event)
      return
    }
    const key = event.key.toLowerCase()
    const shifted = event.shiftKey ? MOD_ACTIONS[`shift+${key}`] : undefined
    const action = shifted ?? MOD_ACTIONS[key]
    if (!action) return
    event.preventDefault()
    action()
  }

  const keyRef = useRef(handleKey)
  useEffect(() => {
    keyRef.current = handleKey
  })
  useEffect(() => {
    if (!active) return
    const listener = (event: KeyboardEvent) => keyRef.current(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [active])

  const patch = (partial: Partial<ToolOptions>) =>
    paint.send({ type: 'option', patch: partial })

  const zoomed = {
    width: state.size.width * state.zoom,
    height: state.size.height * state.zoom,
  }

  const hasSelection = state.mode.kind === 'selected'

  const editDisabled: Record<string, boolean> = {
    Undo: !paint.canUndo(),
    Cut: !hasSelection,
    Copy: !hasSelection,
    Paste: !paint.canPaste(),
    'Clear Selection': !hasSelection,
  }

  const resizing =
    state.mode.kind === 'resizingCanvas'
      ? prospectiveSize(state.size, state.mode)
      : null

  const menuTrigger = (id: MenuId, label: React.ReactNode) => (
    <button
      type='button'
      className={w98.menuTrigger}
      aria-haspopup='menu'
      aria-expanded={menu === id}
      onClick={() => setMenu(menu === id ? null : id)}
    >
      {label}
    </button>
  )

  return (
    <section className={w98.paintWindow} style={dragStyle} aria-label='Paint'>
      {active && <ClaimKeys />}
      <header className={w98.titlebar} {...dragHandle}>
        <span className={w98.paintAppIcon} aria-hidden='true' />
        <strong>untitled - Paint</strong>
        <span className={w98.windowControls}>
          <button type='button' aria-label='Minimize Paint' onClick={minimize}>
            _
          </button>
          <span aria-hidden='true'>□</span>
          <button
            type='button'
            aria-label='Close Paint'
            onClick={() => confirmDirty(close)}
          >
            ×
          </button>
        </span>
      </header>

      {menu && (
        <button
          type='button'
          className={w98.menuBackdrop}
          aria-label='Close menu'
          onClick={() => setMenu(null)}
        />
      )}

      <nav className={w98.menubar} aria-label='Paint menus'>
        <div className={w98.menuSlot}>
          {menuTrigger(
            'file',
            <>
              <u>F</u>ile
            </>,
          )}
          {menu === 'file' && (
            <PaintMenu items={FILE_ITEMS} label='File menu' act={menuAction} />
          )}
        </div>
        <div className={w98.menuSlot}>
          {menuTrigger(
            'edit',
            <>
              <u>E</u>dit
            </>,
          )}
          {menu === 'edit' && (
            <PaintMenu
              items={EDIT_ITEMS}
              label='Edit menu'
              disabled={editDisabled}
              act={menuAction}
            />
          )}
        </div>
      </nav>

      <div className={css.body}>
        <aside className={css.toolbox}>
          <ToolBox toolId={state.tool} pick={paint.pickTool} />
          <OptionsBox
            toolId={state.tool}
            options={state.options}
            patch={patch}
            zoom={state.zoom}
            setZoom={paint.setZoom}
          />
        </aside>
        <div className={css.canvasArea}>
          <div className={css.canvasStage}>
            <canvas
              ref={paint.canvasRef}
              className={css.bitmap}
              width={state.size.width}
              height={state.size.height}
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
              style={zoomed}
            />
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
      </div>

      <PaletteBar
        fg={state.fg}
        bg={state.bg}
        setFg={(color) => paint.send({ type: 'color', slot: 'fg', color })}
        setBg={(color) => paint.send({ type: 'color', slot: 'bg', color })}
      />

      <footer className={css.statusBar}>
        <span className={css.statusText}>Ready</span>
        <span className={css.statusCoords}>
          {paint.hover ? `${paint.hover.x},${paint.hover.y}` : ''}
        </span>
        <span className={css.statusSize}>
          {gestureSize(state.mode) ??
            `${state.size.width} x ${state.size.height}`}
        </span>
      </footer>

      <input
        ref={paint.fileInputRef}
        className={css.fileInput}
        type='file'
        accept='image/png'
        tabIndex={-1}
        aria-hidden='true'
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void paint.openFile(file)
          event.target.value = ''
        }}
      />

      {prompt && (
        <>
          <div className={css.dialogShield} aria-hidden='true' />
          <section
            className={css.dialog}
            role='alertdialog'
            aria-modal='true'
            aria-label='Save changes to untitled'
          >
            <header className={w98.titlebar}>
              <strong>Paint</strong>
            </header>
            <div className={css.dialogBody}>
              <p>Save changes to untitled?</p>
              <div className={css.dialogButtons}>
                <button
                  type='button'
                  className={css.dialogButton}
                  onClick={() => void promptYes()}
                >
                  Yes
                </button>
                <button
                  type='button'
                  className={css.dialogButton}
                  onClick={promptNo}
                >
                  No
                </button>
                <button
                  type='button'
                  className={css.dialogButton}
                  onClick={() => setPrompt(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  )
}
