'use client'

import type React from 'react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import css from './fullscreen.module.css'

const Fullscreen: React.FC<{
  label: string
  trigger: string
  triggerClassName: string
  fit?: 'center' | 'fill'
  meta?: ReactNode
  caption?: string
  children: ReactNode
}> = (props) => {
  const dialog = useRef<HTMLDialogElement>(null)
  // markdown emits media inside p tags, so the dialog portals out to stay valid HTML
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const close = () => dialog.current?.close()

  const closeOnStage = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) close()
  }

  const viewer = (
    <dialog
      aria-label={`${props.label} fullscreen`}
      className={css.viewer}
      data-fullscreen-viewer='true'
      ref={dialog}
    >
      <div className={css.chrome}>
        <span className={css.identity}>
          <span aria-hidden='true' className={css.signal} />
          <span>{props.label}</span>
        </span>
        <span className={css.meta}>
          {props.meta}
          <button
            aria-label='Close fullscreen'
            className={css.close}
            onClick={close}
            type='button'
          >
            <span aria-hidden='true'>
              CLOSE <kbd>ESC</kbd>
            </span>
          </button>
        </span>
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stage click mirrors backdrop close, CLOSE and ESC stay the accessible paths */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: ESC already closes via the native dialog cancel */}
      <div
        className={css.stage}
        data-fit={props.fit ?? 'center'}
        onClick={closeOnStage}
      >
        {props.children}
      </div>
      {props.caption ? <p className={css.caption}>{props.caption}</p> : null}
    </dialog>
  )

  return (
    <>
      <button
        aria-label={`${props.label} fullscreen`}
        className={props.triggerClassName}
        onClick={() => dialog.current?.showModal()}
        type='button'
      >
        <span aria-hidden='true'>{props.trigger}</span>
      </button>
      {mounted ? createPortal(viewer, document.body) : null}
    </>
  )
}

export default Fullscreen
