import cn from 'clsx'
import css from './key-pad.module.css'

const LETTERS = ['A', 'B']
const DIGITS = [1, 2, 3, 4, 5, 6]

export default function KeyPad({
  armed,
  onLetter,
  onNumber,
}: {
  armed: string | null
  onLetter: (letter: string) => void
  onNumber: (digit: number) => void
}) {
  return (
    <div className={css.pad}>
      <div className={css.row}>
        {LETTERS.map((letter) => (
          <button
            key={letter}
            type='button'
            className={cn(css.key, armed === letter && css.lit)}
            aria-pressed={armed === letter}
            onClick={() => onLetter(letter)}
          >
            {letter}
          </button>
        ))}
      </div>
      <div className={css.row}>
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type='button'
            className={css.key}
            onClick={() => onNumber(digit)}
          >
            {digit}
          </button>
        ))}
      </div>
    </div>
  )
}
