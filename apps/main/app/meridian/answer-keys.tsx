import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { tapHaptic } from 'services/haptics'
import { queryTouchScreen } from 'services/screen'
import css from './answer-keys.module.css'
import type { GeoMessages } from './geo-messages'

const MOBILE_ANSWER_MEDIA = '(max-width: 800px)'
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const

/* the OS keyboard steals half the viewport and the stage cannot survive it,
   so touch phones type on these keys and the field asks for no keyboard */
export const useAnswerKeys = () => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const touch = window.matchMedia(queryTouchScreen)
    const mobile = window.matchMedia(MOBILE_ANSWER_MEDIA)
    const update = () => setEnabled(touch.matches && mobile.matches)
    update()
    touch.addEventListener('change', update)
    mobile.addEventListener('change', update)
    return () => {
      touch.removeEventListener('change', update)
      mobile.removeEventListener('change', update)
    }
  }, [])

  return { enabled, inputMode: enabled ? ('none' as const) : ('text' as const) }
}

const AnswerKey = ({
  children,
  disabled,
  label,
  onDown,
  onPress,
  tone,
}: {
  children: ReactNode
  disabled: boolean
  label?: string
  onDown: () => void
  onPress: () => void
  tone?: 'dismiss' | 'erase' | 'space'
}) => {
  /* preventDefault keeps the field focused but also swallows :active, so the
     pressed face rides a pointer-driven attribute */
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)

  return (
    <button
      type='button'
      tabIndex={-1}
      disabled={disabled}
      aria-label={label}
      className={css.key}
      data-tone={tone}
      data-pressed={pressed || undefined}
      onPointerDown={(event) => {
        event.preventDefault()
        setPressed(true)
        tapHaptic()
        onDown()
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onClick={onPress}
    >
      {children}
    </button>
  )
}

export const AnswerKeys = ({
  copy,
  disabled,
  onDismiss,
  onErase,
  onKeystroke,
  onWrite,
}: {
  copy: GeoMessages
  disabled: boolean
  onDismiss: () => void
  onErase: () => void
  onKeystroke: () => void
  onWrite: (character: string) => void
}) => {
  const [top, home, bottom] = KEY_ROWS
  const letterKeys = (letters: string) =>
    [...letters].map((letter) => (
      <AnswerKey
        key={letter}
        disabled={disabled}
        onDown={onKeystroke}
        onPress={() => onWrite(letter)}
      >
        {letter}
      </AnswerKey>
    ))

  return (
    <div className={css.keyBank}>
      <div className={css.keyRow}>{letterKeys(top)}</div>
      <div className={css.keyRow} data-inset='true'>
        {letterKeys(home)}
      </div>
      <div className={css.keyRow}>
        <AnswerKey
          disabled={disabled}
          label={copy.keysDismiss}
          onDown={onKeystroke}
          onPress={onDismiss}
          tone='dismiss'
        >
          ⌄
        </AnswerKey>
        {letterKeys(bottom)}
        <AnswerKey
          disabled={disabled}
          label={copy.keysSpace}
          onDown={onKeystroke}
          onPress={() => onWrite(' ')}
          tone='space'
        >
          ␣
        </AnswerKey>
        <AnswerKey
          disabled={disabled}
          label={copy.keysErase}
          onDown={onKeystroke}
          onPress={onErase}
          tone='erase'
        >
          ⌫
        </AnswerKey>
      </div>
    </div>
  )
}
