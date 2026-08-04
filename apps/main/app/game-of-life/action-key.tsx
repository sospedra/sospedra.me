import {
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { isKeyboardClick } from 'services/keyboard-click'
import keyBank from './key-bank.module.css'
import pushButtons from './push-buttons.module.css'

type ActionKeyProps = ComponentPropsWithoutRef<'button'>

export const ActionKey = ({ children, ...props }: ActionKeyProps) => (
  <button
    data-life-sfx='key'
    {...props}
    type='button'
    className={keyBank.label}
    data-no-press-pulse
  >
    <div className={keyBank['back-side']} aria-hidden='true' />
    <span className={`${keyBank.text} ${pushButtons.text}`}>{children}</span>
    <span className={keyBank['bottom-line']} aria-hidden='true' />
  </button>
)

type RepeatActionKeyProps = Omit<ActionKeyProps, 'onClick'> & {
  action: () => void
  repeatCue: () => void
}

export const RepeatActionKey = ({
  action,
  children,
  repeatCue,
  ...props
}: RepeatActionKeyProps) => {
  const [pressed, setPressed] = useState(false)
  const delayRef = useRef<number | null>(null)
  const repeatRef = useRef<number | null>(null)

  const stopRepeating = useCallback(() => {
    if (delayRef.current !== null) window.clearTimeout(delayRef.current)
    if (repeatRef.current !== null) window.clearInterval(repeatRef.current)
    delayRef.current = null
    repeatRef.current = null
    setPressed(false)
  }, [])

  useEffect(() => stopRepeating, [stopRepeating])

  const repeatAction = () => {
    repeatCue()
    action()
  }

  const startRepeating = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    stopRepeating()
    setPressed(true)
    action()
    event.currentTarget.setPointerCapture(event.pointerId)
    delayRef.current = window.setTimeout(() => {
      repeatAction()
      repeatRef.current = window.setInterval(repeatAction, 90)
    }, 280)
  }

  return (
    <ActionKey
      {...props}
      data-pressed={pressed ? 'true' : undefined}
      onBlur={stopRepeating}
      onClick={(event) => {
        if (isKeyboardClick(event)) action()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        setPressed(true)
        if (event.repeat) {
          event.preventDefault()
          repeatAction()
        }
      }}
      onKeyUp={(event) => {
        if (event.key === 'Enter' || event.key === ' ') stopRepeating()
      }}
      onLostPointerCapture={stopRepeating}
      onPointerCancel={stopRepeating}
      onPointerDown={startRepeating}
      onPointerLeave={stopRepeating}
      onPointerUp={stopRepeating}
    >
      {children}
    </ActionKey>
  )
}
