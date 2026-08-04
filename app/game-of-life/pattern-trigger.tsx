import type { Ref } from 'react'
import css from './pattern-handle.module.css'
import { LIFE_PRESETS } from './presets'

export const PatternTrigger = ({
  buttonRef,
  className,
  onToggle,
  open,
  seedName,
  selectedNumber,
}: {
  buttonRef: Ref<HTMLButtonElement>
  className: string
  onToggle: () => void
  open: boolean
  seedName: string
  selectedNumber: string
}) => (
  <button
    ref={buttonRef}
    type='button'
    className={`${css.patternHandle} ${className}`}
    aria-expanded={open}
    aria-controls={open ? 'pattern-bay' : undefined}
    aria-keyshortcuts='P'
    onClick={onToggle}
  >
    <span className={css.patternHandleLabel}>
      Preset selector <i aria-hidden='true' />
    </span>
    <strong className={css.patternHandleSelection}>
      {selectedNumber} / {String(LIFE_PRESETS.length).padStart(2, '0')} ·{' '}
      {seedName}
    </strong>
    <span className={css.patternHandleAction}>
      <b className={css.patternActionFull}>
        {open ? 'Close presets' : 'Choose preset'}
      </b>
      <b className={css.patternActionCompact}>{open ? 'Close' : 'Presets'}</b>
      <i aria-hidden='true'>{open ? '↑' : '↓'}</i>
    </span>
  </button>
)
