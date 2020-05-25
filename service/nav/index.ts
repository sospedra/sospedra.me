import { useRef, useState } from 'react'
import { useMousetrap } from 'service/mousetrap'

export const useNav = () => {
  const [, setCursor] = useState(0)
  const refs = [
    useRef<HTMLAnchorElement>(null),
    useRef<HTMLAnchorElement>(null),
    useRef<HTMLButtonElement>(null),
  ] as const

  useMousetrap([
    [
      'alt+down',
      () => {
        setCursor((c) => {
          const index = c === refs.length - 1 ? 0 : c + 1
          const $el = refs[index].current
          if ($el) $el.focus()
          return index
        })
      },
    ],
    [
      'alt+up',
      () => {
        setCursor((c) => {
          const index = c === 0 ? refs.length - 1 : c - 1
          const $el = refs[index].current
          if ($el) $el.focus()
          return index
        })
      },
    ],
  ])

  return refs
}
