import cn from 'clsx'
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
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

const useLetterBankEnabled = () => {
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

  return enabled
}

export const useLetterBank = (inputRef: RefObject<HTMLInputElement | null>) => {
  const bankRef = useRef<HTMLDivElement>(null)
  const releasedRef = useRef(false)
  const [open, setOpen] = useState(false)
  const enabled = useLetterBankEnabled()

  useEffect(() => {
    if (!enabled) setOpen(false)
  }, [enabled])

  const openBank = () => {
    releasedRef.current = false
    if (enabled) setOpen(true)
  }

  /* focus juggles through cells and keys on every tap; close only when it
     settles outside the proxy and the bank. iOS taps can blur the proxy
     with focus landing nowhere; reclaim it unless the blur was deliberate */
  const settleFocus = () => {
    window.requestAnimationFrame(() => {
      const active = document.activeElement
      const kept =
        active === inputRef.current ||
        (bankRef.current?.contains(active) ?? false)
      if (kept) return
      const evaporated = !active || active === document.body
      if (evaporated && open && !releasedRef.current) {
        inputRef.current?.focus({ preventScroll: true })
        return
      }
      releasedRef.current = false
      setOpen(false)
    })
  }

  const releaseProxy = useCallback(() => {
    releasedRef.current = true
    inputRef.current?.blur()
  }, [inputRef])

  const dismiss = () => {
    setOpen(false)
    releaseProxy()
  }

  const restoreFocus = () => {
    if (document.activeElement === inputRef.current) return
    inputRef.current?.focus({ preventScroll: true })
  }

  const proxyInputMode: 'none' | 'text' = enabled ? 'none' : 'text'

  return {
    bankRef,
    dismiss,
    open,
    openBank,
    proxyInputMode,
    releaseProxy,
    restoreFocus,
    settleFocus,
  }
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
  /* preventDefault keeps the proxy focused but also swallows :active, so the
     pressed face rides a pointer-driven attribute instead */
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)

  return (
    <button
      type='button'
      tabIndex={-1}
      aria-label={label}
      className={cn(css.bankKey, wide && css.bankKeyWide)}
      data-pressed={pressed || undefined}
      onPointerDown={(event) => {
        event.preventDefault()
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
  bankRef,
  copy,
  dismiss,
  eraseBackward,
  locale,
  open,
  restoreFocus,
  writeLetter,
}: {
  bankRef: RefObject<HTMLDivElement | null>
  copy: Copy
  dismiss: () => void
  eraseBackward: () => void
  locale: CrosswordLocale
  open: boolean
  restoreFocus: () => void
  writeLetter: (value: string) => void
}) => {
  if (!open) return null

  const [top, home, bottom] = LETTER_ROWS[locale]
  const press = (action: () => void) => () => {
    restoreFocus()
    action()
  }
  const letterKeys = (letters: string) =>
    [...letters].map((letter) => (
      <BankKeyButton key={letter} onPress={press(() => writeLetter(letter))}>
        {letter}
      </BankKeyButton>
    ))

  return (
    <div ref={bankRef} className={css.letterBank}>
      <div className={css.bankRow}>{letterKeys(top)}</div>
      <div className={css.bankRow} data-inset={home.length === 9 || undefined}>
        {letterKeys(home)}
      </div>
      <div className={css.bankRow}>
        <BankKeyButton wide label={copy.bankDismiss} onPress={dismiss}>
          ⌄
        </BankKeyButton>
        {letterKeys(bottom)}
        <BankKeyButton
          wide
          label={copy.bankErase}
          onPress={press(eraseBackward)}
        >
          ⌫
        </BankKeyButton>
      </div>
    </div>
  )
}
