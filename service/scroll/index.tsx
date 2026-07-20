import { useEffect, useRef } from 'react'

export const useScroll = <
  R extends HTMLDivElement,
  EventTarget extends Event & { target: { scrollTop: number } },
>(
  clbk: (e: EventTarget) => void,
  deps: readonly unknown[] = [],
) => {
  const ref = useRef<R>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const fn = (e: Event) => requestAnimationFrame(() => clbk(e as EventTarget))
    node.addEventListener('scroll', fn)
    return () => {
      node.removeEventListener('scroll', fn)
    }
  }, [...deps, clbk])

  return ref
}
