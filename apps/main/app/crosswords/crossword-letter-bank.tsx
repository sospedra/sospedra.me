import cn from 'clsx'
import { type ReactNode, useEffect, useState } from 'react'
import { tapHaptic } from 'services/haptics'
import { queryTouchScreen } from 'services/screen'
import type { Copy } from './crossword-copy'
import type { CrosswordLocale } from './crossword-data'
import css from './crossword-letter-bank.module.css'
import { MOBILE_LAYOUT_MEDIA } from './crossword-viewport'

const LETTER_ROWS = {
  en: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'],
  es: ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'],
} satisfies Record<CrosswordLocale, [string, string, string]>

export const useLetterBank = () => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const touch = window.matchMedia(queryTouchScreen)
    const mobile = window.matchMedia(MOBILE_LAYOUT_MEDIA)
    const update = () => setEnabled(touch.matches && mobile.matches)
    update()
    touch.addEventListener('change', update)
    mobile.addEventListener('change', update)
    return () => {
      touch.removeEventListener('change', update)
      mobile.removeEventListener('change', update)
    }
  }, [])

  const proxyInputMode: 'none' | 'text' = enabled ? 'none' : 'text'

  return { enabled, proxyInputMode }
}

const BankKeyButton = ({
  children,
  label,
  onPress,
  wide,
}: {
  children: ReactNode
  label?: string
  onPress: () => void
  wide?: boolean
}) => {
  /* a tap must not move focus off the page body, or hardware keydowns start
     targeting this key; mousedown preventDefault also swallows :active, so
     the pressed face rides a pointer-driven attribute */
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)

  return (
    <button
      type='button'
      tabIndex={-1}
      aria-label={label}
      className={cn(css.bankKey, wide && css.bankKeyWide)}
      data-pressed={pressed || undefined}
      onPointerDown={() => {
        setPressed(true)
        tapHaptic()
      }}
      onMouseDown={(event) => event.preventDefault()}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onClick={onPress}
    >
      {children}
    </button>
  )
}

export const CrosswordLetterBank = ({
  copy,
  eraseBackward,
  locale,
  open,
  writeLetter,
}: {
  copy: Copy
  eraseBackward: () => void
  locale: CrosswordLocale
  open: boolean
  writeLetter: (value: string) => void
}) => {
  if (!open) return null

  const [top, home, bottom] = LETTER_ROWS[locale]
  const letterKeys = (letters: string) =>
    [...letters].map((letter) => (
      <BankKeyButton key={letter} onPress={() => writeLetter(letter)}>
        {letter}
      </BankKeyButton>
    ))

  return (
    <div className={css.letterBank}>
      <div className={css.bankRow}>{letterKeys(top)}</div>
      <div className={css.bankRow} data-inset={home.length === 9 || undefined}>
        {letterKeys(home)}
      </div>
      <div className={css.bankRow} data-inset>
        {letterKeys(bottom)}
        <BankKeyButton wide label={copy.bankErase} onPress={eraseBackward}>
          ⌫
        </BankKeyButton>
      </div>
    </div>
  )
}
