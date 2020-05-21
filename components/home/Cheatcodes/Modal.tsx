import React from 'react'
import { createPortal } from 'react-dom'
import { matchScreen, queryTouchScreen } from 'service/screen'
import css from './cheatcodes.module.css'

type Props = {
  close: () => void
}

const Message: React.FC<{}> = () => {
  const isTouchScreen = matchScreen(queryTouchScreen)
  const hasMotion = !!window.DeviceMotionEvent

  if (isTouchScreen) {
    if (hasMotion) {
      return (
        <p>
          <kbd
            style={{
              letterSpacing: '-0.5rem',
              paddingLeft: 0,
              paddingRight: '0.4rem',
            }}
          >
            ⌇⌇⌇
          </kbd>{' '}
          Shake the phone!
        </p>
      )
    } else {
      return (
        <p>
          Cheatcodes are available only on keyboard controlled devices and
          devices with acceleration support.
        </p>
      )
    }
  }

  return (
    <>
      <p>
        This website fully support keyboard-base navigation. These are{' '}
        <b>some useful</b> hotkeys but there are more. Discover them!
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
  return (
    <aside className='absolute inset-0 z-30'>
      <div
        className='flex items-center justify-center w-full h-full cursor-pointer'
        style={{ background: 'rgba(0, 0, 0, 0.33)' }}
        onClick={() => props.close()}
      >
        <div
          className='w-full h-auto max-w-sm p-4 cursor-default'
          onClick={(e) => e.stopPropagation()}
        >
          <div className={css.window}>
            <h3>
              <span>Cheatcodes</span>
              <button onClick={props.close}>X</button>
            </h3>
            <div>
              <Message />
              <button autoFocus onClick={props.close}>
                Ok
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function PortalModal(props: Props) {
  return createPortal(<Modal {...props} />, document.body)
}
