import { useEffect, useRef } from 'react'

export const useScroll = <R extends HTMLElement>(
  clbk: (...args: any[]) => any,
  deps: any[] = [],
) => {
  const ref = useRef<R>(null)
  const fn = () => requestAnimationFrame(clbk)

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
