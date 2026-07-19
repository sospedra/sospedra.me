import { useState, useRef, useEffect } from 'react'

export function usePrevious(value: any) {
  const ref = useRef<typeof value>(undefined)
  useEffect(() => void (ref.current = value), [value])
  return ref.current
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
