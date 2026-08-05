'use client'

import cn from 'clsx'
import css from './key-pad.module.css'
import { RECORDS, selectorCode } from './records'

const LETTERS = [...new Set(RECORDS.map((_, index) => selectorCode(index)[0]))]
// matches selection.ts's column height (COLUMN = 6), not exported from there
const DIGITS = [1, 2, 3, 4, 5, 6]

export type DisplayState = { text: string; err: boolean }

export default function KeyPad({
  armedLetter,
  downKeys,
  display,
  sound,
  onLetter,
  onNumber,
  onToggleSound,
}: {
  armedLetter: string | null
  downKeys: ReadonlySet<string>
  display: DisplayState
  sound: boolean
  onLetter: (letter: string) => void
  onNumber: (digit: number) => void
  onToggleSound: () => void
}) {
  return (
    <section className={css.deckplate}>
      <p className={css.hint} aria-hidden>
        TYPE A LETTER, THEN A NUMBER · OR PRESS A STRIP
      </p>
      <div className={css.console}>
        <fieldset className={css.keys} aria-label='Letter keys'>
          {LETTERS.map((letter) => (
            <button
              key={letter}
              type='button'
              className={cn(
                css.key,
                armedLetter === letter && css.lit,
                downKeys.has(letter) && css.down,
              )}
              onClick={() => onLetter(letter)}
            >
              {letter}
            </button>
          ))}
        </fieldset>
        <div className={cn(css.window, display.err && css.err)} aria-hidden>
          {display.text}
        </div>
        <fieldset className={css.keys} aria-label='Number keys'>
          {DIGITS.map((digit) => (
            <button
              key={digit}
              type='button'
              className={cn(css.key, downKeys.has(String(digit)) && css.down)}
              onClick={() => onNumber(digit)}
            >
              {digit}
            </button>
          ))}
        </fieldset>
        <button
          type='button'
          className={css.soundToggle}
          aria-pressed={sound}
          onClick={onToggleSound}
        >
          SOUND <span aria-hidden='true'>{sound ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </section>
  )
}
