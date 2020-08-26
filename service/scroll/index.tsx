import { useEffect, useRef } from 'react'

export const useScroll = <
  R extends HTMLDivElement,
  EventTarget extends Event & { target: { scrollTop: number } }
>(
  clbk: (e: EventTarget) => any,
  deps: any[] = [],
) => {
  const ref = useRef<R>(null)
  const fn = (e: Event) => requestAnimationFrame(() => clbk(e as EventTarget))

  useEffect(() => {
    if (ref.current) {
      ref.current.addEventListener('scroll', fn)
      return () => {
        ref.current?.removeEventListener('scroll', fn)
      }
    }
  }, [...deps, ref])

  return ref
}
