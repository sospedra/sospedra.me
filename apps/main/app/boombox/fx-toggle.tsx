import cn from 'clsx'
import css from './fx-toggle.module.css'

export const FxToggle = (props: {
  className?: string
  on: boolean
  onToggle: () => void
}) => (
  <label className={cn(css.fxSwitch, props.className)}>
    <input
      className={css.fxInput}
      type='checkbox'
      role='switch'
      checked={props.on}
      aria-checked={props.on}
      aria-label='Deck sound effects'
      onChange={props.onToggle}
    />
    <span className={css.fxToggle} aria-hidden>
      <span className={css.faceOff}>
        <b>off</b>
      </span>
      <span className={css.faceOn}>
        <b>on</b>
      </span>
    </span>
  </label>
)
