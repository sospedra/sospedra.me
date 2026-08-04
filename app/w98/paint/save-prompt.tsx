import type React from 'react'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import w98 from '../w98.module.css'
import { useBeforeUnloadGuard } from './exit-guard.ts'
import css from './paint.module.css'
import type { Paint } from './use-paint.ts'

export type PaintHandle = {
  isDirty: () => boolean
  confirmExit: (proceed: () => void) => void
}

const trapTab = (event: KeyboardEvent, box: HTMLElement) => {
  if (event.key !== 'Tab') return
  const buttons = box.querySelectorAll('button')
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (!first || !last) return
  const active = document.activeElement
  if (!box.contains(active)) {
    event.preventDefault()
    first.focus()
    return
  }
  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
    return
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

const SavePrompt: React.FC<{
  onYes: () => void
  onNo: () => void
  onCancel: () => void
}> = ({ onYes, onNo, onCancel }) => {
  const boxRef = useRef<HTMLElement>(null)
  const yesRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const opener = document.activeElement
    yesRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => trapTab(event, box)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  return (
    <>
      <div className={css.dialogShield} aria-hidden='true' />
      <section
        ref={boxRef}
        className={css.dialog}
        role='alertdialog'
        aria-modal='true'
        aria-label='Save changes to untitled'
      >
        <header className={w98.titlebar}>
          <strong>Paint</strong>
        </header>
        <div className={css.dialogBody}>
          <p>Save changes to untitled?</p>
          <div className={css.dialogButtons}>
            <button
              ref={yesRef}
              type='button'
              className={css.dialogButton}
              onClick={onYes}
            >
              Yes
            </button>
            <button type='button' className={css.dialogButton} onClick={onNo}>
              No
            </button>
            <button
              type='button'
              className={css.dialogButton}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

export const useExitPrompt = ({
  dirty,
  paint,
  ref,
}: {
  dirty: boolean
  paint: Paint
  ref: React.Ref<PaintHandle> | undefined
}) => {
  const [prompt, setPrompt] = useState<(() => void) | null>(null)

  const confirmDirty = (action: () => void) => {
    if (paint.isDirty()) setPrompt(() => action)
    else action()
  }

  useImperativeHandle(ref, () => ({
    isDirty: paint.isDirty,
    confirmExit: confirmDirty,
  }))

  useBeforeUnloadGuard(dirty)

  const promptYes = async () => {
    const proceed = prompt
    setPrompt(null)
    await paint.saveFile()
    proceed?.()
  }

  const promptNo = () => {
    const proceed = prompt
    setPrompt(null)
    proceed?.()
  }

  const dismissPrompt = () => setPrompt(null)

  const exitPrompt = prompt ? (
    <SavePrompt
      onYes={() => void promptYes()}
      onNo={promptNo}
      onCancel={dismissPrompt}
    />
  ) : null

  return {
    confirmDirty,
    dismissPrompt,
    exitPrompt,
    promptOpen: prompt !== null,
  }
}
