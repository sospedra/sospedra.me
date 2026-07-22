import type React from 'react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { hasMotion, matchScreen, queryTouchScreen } from 'service/screen'
import css from './cheatcodes.module.css'

type Props = {
  close: () => void
}

const Message: React.FC = () => {
  const isTouchScreen = matchScreen(queryTouchScreen)

  if (isTouchScreen && hasMotion()) {
    return (
      <p>
        <kbd>⌇⌇⌇</kbd> Shake the phone!
      </p>
    )
  }

  if (isTouchScreen) {
    return (
      <p>
        Cheatcodes need a keyboard or a motion sensor. This device has neither.
        Sorry!
      </p>
    )
  }

  return (
    <>
      <p>
        This website fully supports keyboard navigation. These are{' '}
        <b>some useful</b> hotkeys. There are more. Discover them!
      </p>
      <ul>
        <li>
          <kbd>h</kbd> Go to /
        </li>
        <li>
          <kbd>a</kbd> Go to /about
        </li>
        <li>
          <kbd>p</kbd> Go to /papers
        </li>
        <li>
          <kbd>b</kbd> Go back
        </li>
        <li>
          <kbd>g</kbd>+<kbd>key</kbd> Warp to any sector
        </li>
        <li>
          <kbd>esc</kbd> Close things
        </li>
        <li>
          <kbd>↑↑↓↓←→←→ba</kbd> wait, wat?
        </li>
      </ul>
    </>
  )
}

const Modal: React.FC<Props> = (props) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previouslyFocused?.focus()
  }, [])

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, a[href], [tabindex]:not([tabindex="-1"])',
    )
    if (!controls?.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <aside className={css.overlay}>
      <button
        type='button'
        className={css.backdrop}
        aria-label='Close cheatcodes'
        onClick={props.close}
      />
      <div className={css.container}>
        <div
          ref={dialogRef}
          className={css.window}
          role='dialog'
          aria-modal='true'
          aria-labelledby='cheatcodes-title'
          onKeyDown={trapFocus}
        >
          <h3>
            <span id='cheatcodes-title'>Cheatcodes</span>
            <button
              ref={closeRef}
              type='button'
              onClick={props.close}
              aria-label='Close cheatcodes'
            >
              X
            </button>
          </h3>
          <div>
            <Message />
            <button type='button' onClick={props.close}>
              Ok
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function PortalModal(props: Props) {
  return createPortal(<Modal {...props} />, document.body)
}
