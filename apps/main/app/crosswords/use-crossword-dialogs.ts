import { type RefObject, useRef, useState } from 'react'

export type DialogName = 'clues' | 'help' | null

/* remembers the control that opened a dialog and hands focus back on close;
   opening also drops the OS keyboard on touch devices without the bank */
export const useCrosswordDialogs = (
  inputRef: RefObject<HTMLInputElement | null>,
) => {
  const [dialog, setDialog] = useState<DialogName>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const closeDialog = () => {
    setDialog(null)
    window.requestAnimationFrame(() => openerRef.current?.focus())
  }

  const openDialog = (
    name: Exclude<DialogName, null>,
    opener?: HTMLElement,
  ) => {
    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    inputRef.current?.blur()
    openerRef.current = opener ?? activeElement
    setDialog(name)
  }

  return { closeDialog, dialog, openDialog, openerRef, setDialog }
}
