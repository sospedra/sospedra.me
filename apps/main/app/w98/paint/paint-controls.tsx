import type React from 'react'
import { tapHaptic } from 'services/haptics'
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
import { colorName, PALETTE } from './palette.ts'
import { TOOLS, type ToolId } from './tools.ts'

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

export const ToolboxAside: React.FC<{
  toolId: ToolId
  pick: (tool: ToolId) => void
  options: ToolOptions
  patch: (partial: Partial<ToolOptions>) => void
  zoom: Magnification
  setZoom: (zoom: Magnification) => void
}> = ({ toolId, pick, options, patch, zoom, setZoom }) => (
  <aside className={css.toolbox}>
    <ToolBox toolId={toolId} pick={pick} />
    <OptionsBox
      toolId={toolId}
      options={options}
      patch={patch}
      zoom={zoom}
      setZoom={setZoom}
    />
  </aside>
)

export const PaletteBar: React.FC<{
  fg: string
  bg: string
  setFg: (color: string) => void
  setBg: (color: string) => void
}> = ({ fg, bg, setFg, setBg }) => (
  <div className={css.palette}>
    <span
      className={css.currentColors}
      role='img'
      aria-label={`Foreground ${colorName(fg)}, background ${colorName(bg)}`}
    >
      <i className={css.bgSwatch} style={{ background: bg }} />
      <i className={css.fgSwatch} style={{ background: fg }} />
    </span>
    <fieldset className={css.swatches}>
      <legend className='sr-only'>Color palette</legend>
      <p className='sr-only'>
        Click sets foreground. Alt plus click or right click sets background.
      </p>
      {PALETTE.map((color) => (
        <button
          key={color}
          type='button'
          className={css.swatch}
          style={{ background: color }}
          aria-label={`Color ${colorName(color)}`}
          onClick={(event) => {
            tapHaptic()
            if (event.altKey) setBg(color)
            else setFg(color)
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            setBg(color)
          }}
        />
      ))}
    </fieldset>
  </div>
)
