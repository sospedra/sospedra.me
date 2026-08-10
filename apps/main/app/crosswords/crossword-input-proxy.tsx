import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  useRef,
} from 'react'
import type { Copy } from './crossword-copy'
import css from './crosswords.module.css'

export const CrosswordInputProxy = ({
  composingRef,
  copy,
  eraseBackward,
  inputMode,
  inputRef,
  onBlur,
  onFocus,
  onKeyDown,
  writeLetter,
}: {
  composingRef: RefObject<boolean>
  copy: Copy
  eraseBackward: () => void
  inputMode: 'none' | 'text'
  inputRef: RefObject<HTMLInputElement | null>
  onBlur: () => void
  onFocus: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  writeLetter: (value: string) => void
}) => {
  const skipInputRef = useRef(false)

  return (
    <label className={css.inputProxy}>
      <span>{copy.inputLabel}</span>
      <input
        ref={inputRef}
        type='text'
        inputMode={inputMode}
        autoCapitalize='characters'
        autoComplete='off'
        spellCheck={false}
        tabIndex={-1}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onBeforeInput={(event: FormEvent<HTMLInputElement>) => {
          const native = event.nativeEvent as InputEvent
          if (native.inputType === 'deleteContentBackward') {
            event.preventDefault()
            eraseBackward()
          }
        }}
        onCompositionStart={() => {
          composingRef.current = true
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false
          skipInputRef.current = true
          writeLetter(event.data)
          event.currentTarget.value = ''
        }}
        onInput={(event: FormEvent<HTMLInputElement>) => {
          if (skipInputRef.current) {
            skipInputRef.current = false
            event.currentTarget.value = ''
            return
          }
          if (!composingRef.current) writeLetter(event.currentTarget.value)
          event.currentTarget.value = ''
        }}
      />
    </label>
  )
}
