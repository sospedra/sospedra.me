'use client'

import { type ReactNode, useEffect, useRef } from 'react'

type ModalProps = {
  children: ReactNode
  className: string
  close: () => void
  labelId: string
  open: boolean
}

const Modal = ({ children, className, close, labelId, open }: ModalProps) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      window.requestAnimationFrame(() => {
        dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus()
      })
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelId}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
    >
      {children}
    </dialog>
  )
}

export default Modal
