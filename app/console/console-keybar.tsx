import cn from 'clsx'
import css from './console-keybar.module.css'
import type { Execute } from './console-output'

const FKEYS = [
  ['F1', 'Help', 'help'],
  ['F3', 'Exit', 'exit'],
  ['F6', 'Clear', 'clear'],
  ['F9', 'Links', 'links'],
] as const

export const FKEY_COMMANDS = Object.fromEntries(
  FKEYS.map(([key, , command]) => [key, command]),
)

export function ConsoleKeybar(props: {
  execute: Execute
  muted: boolean
  toggleAudio: () => void
}) {
  const { execute, muted, toggleAudio } = props

  return (
    <div className={css.keybar}>
      <div className={css.fkeys}>
        {FKEYS.map(([key, label, command]) => (
          <button key={key} type='button' onClick={() => execute([command])}>
            <b>{key}</b>={label}
          </button>
        ))}
      </div>
      <div className={css.plates}>
        <span className={css.plate}>
          <i aria-hidden='true' /> System ready
        </span>
        <span className={css.plate}>S: read-only</span>
        <button
          type='button'
          className={cn(css.plate, css.plateButton)}
          aria-pressed={!muted}
          aria-label={muted ? 'Turn audio on' : 'Turn audio off'}
          onClick={() => toggleAudio()}
        >
          ♪ {muted ? 'OFF' : 'ON'}
        </button>
      </div>
    </div>
  )
}
