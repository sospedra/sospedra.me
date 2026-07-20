import { useRef, useState } from 'react'
import { useHotkeys } from 'service/hotkeys'

export const useNav = () => {
  const [, setCursor] = useState(-1)
  // statement-level hook calls: the react compiler skips hooks
  // hidden inside array literals and corrupts the hook order
  const first = useRef<HTMLAnchorElement>(null)
  const second = useRef<HTMLAnchorElement>(null)
  const third = useRef<HTMLAnchorElement>(null)
  const refs = [first, second, third] as const

  useHotkeys([
    [
      ['Alt+ArrowDown', 'j'],
      (event) => {
        event.preventDefault()
        setCursor((c) => {
          const index = c === refs.length - 1 ? 0 : c + 1
          const $el = refs[index].current
          if ($el) $el.focus()
          return index
        })
      },
    ],
    [
      ['Alt+ArrowUp', 'k'],
      (event) => {
        event.preventDefault()
        setCursor((c) => {
          const index = c <= 0 ? refs.length - 1 : c - 1
          const $el = refs[index].current
          if ($el) $el.focus()
          return index
        })
      },
    ],
  ])

  return refs
}
