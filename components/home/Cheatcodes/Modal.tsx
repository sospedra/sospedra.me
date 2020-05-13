import React from 'react'
import { createPortal } from 'react-dom'
import css from './cheatcodes.module.css'

type Props = {
  close: () => void
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
              <button>X</button>
            </h3>
            <div>
              <p>
                This website fully support keyboard-base navigation. These are
                the most useful hotkeys:
              </p>
              <ul>
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
              <button>Ok</button>
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
