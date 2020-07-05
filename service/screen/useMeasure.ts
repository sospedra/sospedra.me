import { useState, useRef, useEffect } from 'react'
import ResizeObserver from 'resize-observer-polyfill'

export function usePrevious(value: any) {
  const ref = useRef<typeof value>()
  useEffect(() => void (ref.current = value), [value])
  return ref.current
}

export function useMeasure() {
  const ref = useRef<HTMLDivElement>(null)
  const [bounds, set] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const { current: ro } = useRef(
    new ResizeObserver(([entry]) => {
      const { left, top, width, height } = entry.contentRect
      set({ left, top, width, height })
    }),
  )

  useEffect(() => {
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref.current])

  return { ref, ...bounds }
}
