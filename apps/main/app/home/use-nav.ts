import { useRef } from 'react'
import { useHotkeys } from 'services/hotkeys'

export const useNav = () => {
  const cursor = useRef(-1)
  // statement-level hook calls: the react compiler skips hooks
  // hidden inside array literals and corrupts the hook order
  const first = useRef<HTMLAnchorElement>(null)
  const second = useRef<HTMLAnchorElement>(null)
  const third = useRef<HTMLAnchorElement>(null)
  const refs = [first, second, third] as const

  const step = (direction: 1 | -1) => {
    const last = refs.length - 1
    const forward = cursor.current >= last ? 0 : cursor.current + 1
    const backward = cursor.current <= 0 ? last : cursor.current - 1
    const index = direction === 1 ? forward : backward
    cursor.current = index
    refs[index].current?.focus()
  }

  useHotkeys([
    [
      ['Alt+ArrowDown', 'j'],
      (event) => {
        event.preventDefault()
        step(1)
      },
    ],
    [
      ['Alt+ArrowUp', 'k'],
      (event) => {
        event.preventDefault()
        step(-1)
      },
    ],
  ])

  return refs
}
