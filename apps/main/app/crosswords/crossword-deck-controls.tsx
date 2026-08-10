import cn from 'clsx'
import type { CSSProperties, ReactNode } from 'react'
import { tapHaptic } from 'services/haptics'
import css from './crossword-parameter-bank.module.css'
import switches from './crossword-switch-bank.module.css'
import tools from './crossword-toolbar.module.css'
import cw from './crosswords.module.css'

const KNOB_ARC_DEGREES = 264

export const ParameterKnob = ({
  label,
  max,
  onChange,
  tone,
  value,
  valueText,
}: {
  label: string
  max: number
  onChange: (value: number) => void
  tone: 'blue' | 'ember' | 'ivory'
  value: number
  valueText: string
}) => {
  const rotation = (value / Math.max(1, max) - 0.5) * KNOB_ARC_DEGREES

  return (
    <label className={css.parameterKnob} data-tone={tone}>
      <span className={css.parameterLabel}>{label}</span>
      <span className={css.knobWell}>
        <input
          type='range'
          min={0}
          max={max}
          step={1}
          value={value}
          aria-label={label}
          aria-valuetext={valueText}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span
          className={cn(css.knobDial, cw.knobDial)}
          style={{ '--cw-knob-turn': `${rotation}deg` } as CSSProperties}
          aria-hidden='true'
        >
          <span />
        </span>
      </span>
      <output>{valueText}</output>
    </label>
  )
}

export const ParameterSlider = ({
  label,
  max,
  onChange,
  tone,
  value,
  valueText,
}: {
  label: string
  max: number
  onChange: (value: number) => void
  tone: 'blue' | 'ember' | 'ivory'
  value: number
  valueText: string
}) => (
  <label className={css.parameterSlider} data-tone={tone} data-stops={max + 1}>
    <span className={css.parameterLabel}>{label}</span>
    <span className={css.slideWell}>
      <input
        type='range'
        min={0}
        max={max}
        step={1}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className={css.slideTrack} aria-hidden='true'>
        <span
          className={cn(css.slideThumb, cw.slideThumb)}
          style={
            {
              '--cw-slide-stop': value / Math.max(1, max),
            } as CSSProperties
          }
        />
      </span>
    </span>
    <output>{valueText}</output>
  </label>
)

export const DeckSwitch = ({
  active,
  label,
  offLabel,
  onClick,
  onLabel,
}: {
  active: boolean
  label: string
  offLabel: string
  onClick: () => void
  onLabel: string
}) => (
  <button
    type='button'
    className={cn(switches.deckSwitch, cw.deckSwitch)}
    data-active={active}
    aria-label={`${label}: ${active ? onLabel : offLabel}`}
    aria-pressed={active}
    onClick={() => {
      tapHaptic()
      onClick()
    }}
  >
    <span className={switches.switchLegend}>{label}</span>
    <span
      className={cn(switches.switchTrack, cw.switchTrack)}
      aria-hidden='true'
    >
      <span />
    </span>
    <span className={switches.switchValue}>{active ? onLabel : offLabel}</span>
  </button>
)

export const ToolbarButton = ({
  active,
  children,
  className,
  descriptionId,
  disabled,
  hasPopup,
  label,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  className?: string
  descriptionId?: string
  disabled?: boolean
  hasPopup?: boolean
  label: string
  onClick: (button: HTMLButtonElement) => void
}) => (
  <button
    type='button'
    className={cn(tools.toolButton, cw.toolButton, className)}
    aria-label={label}
    aria-describedby={descriptionId}
    aria-haspopup={hasPopup ? 'dialog' : undefined}
    aria-pressed={active}
    disabled={disabled}
    onClick={(event) => {
      tapHaptic()
      onClick(event.currentTarget)
    }}
  >
    {children}
  </button>
)
