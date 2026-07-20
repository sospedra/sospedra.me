import { useEffect, useRef, useState } from 'react'

export function usePrevious<T>(value: T) {
  const [prev, setPrev] = useState<T | undefined>(undefined)
  const [curr, setCurr] = useState(value)

  // render-phase adjust, the react-blessed derived-state pattern
  if (value !== curr) {
    setPrev(curr)
    setCurr(value)
  }

  return prev
}

export function useMeasure() {
  const ref = useRef<HTMLDivElement>(null)
  const [bounds, set] = useState({ left: 0, top: 0, width: 0, height: 0 })

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { left, top, width, height } = entry.contentRect
      set({ left, top, width, height })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  return { ref, ...bounds }
}
