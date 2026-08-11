import cn from 'clsx'
import { tapHaptic } from 'services/haptics'
import { useTheme } from 'services/theme'
import css from './tapes-hint.module.css'

const LETTERS = ['T', 'a', 'P', 'e', 'S']

const washi = (
  <>
    <i className={css.tape} data-corner='tl' />
    <i className={css.tape} data-corner='br' />
  </>
)

const SCRAPS = (
  <>
    {LETTERS.map((letter) => (
      <span key={letter} className={css.letter}>
        {letter}
        {washi}
      </span>
    ))}
    <span className={css.arrow}>↓{washi}</span>
  </>
)

type TapesHintProps = {
  variant: 'pinned' | 'shelf'
}

export function TapesHint({ variant }: TapesHintProps) {
  const { fxMode, osReducedMotion } = useTheme()
  const quiet = fxMode === 'quiet' || osReducedMotion

  if (variant === 'shelf') {
    return (
      <p className={cn(css.hint, css.shelf)} aria-hidden='true'>
        {SCRAPS}
      </p>
    )
  }

  const scrollToPile = () => {
    tapHaptic()
    document.getElementById('tape-pile')?.scrollIntoView({
      behavior: quiet ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    // the pile itself is the labeled control set; the sign is a pointer
    // shortcut, so it stays out of the a11y tree like the decor around it
    <button
      type='button'
      className={cn(css.hint, css.pinned)}
      aria-hidden='true'
      tabIndex={-1}
      onClick={scrollToPile}
    >
      {SCRAPS}
    </button>
  )
}
