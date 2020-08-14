import { useEffect, useRef } from 'react'
import { debounce } from 'ts-debounce'

export const useScroll = <R extends HTMLElement>(
  clbk: (...args: any[]) => any,
  deps: any[] = [],
) => {
  const ref = useRef<R>(null)
  const fn = debounce(clbk, 24, { isImmediate: true })

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
