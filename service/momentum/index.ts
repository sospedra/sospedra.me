import { useEffect, useRef } from 'react'
import { useSpring } from 'react-spring'

export const useMomentum = (selector: string) => {
  const history = useRef(0)
  const [{ delta }, set] = useSpring(() => ({ delta: 0 }))

  useEffect(() => {
    const $element = document.querySelector<HTMLElement>(selector)

    if ($element) {
      const drag = (delta: number) => {
        requestAnimationFrame(() => {
          delta = delta * 0.91

          if (Math.abs(delta) > 10) {
            drag(delta)
            set({ delta })
          } else {
            set({ delta: 0 })
          }
        })
      }

      $element.addEventListener('scroll', () => {
        const { scrollTop } = $element
        const delta = scrollTop - history.current

        history.current = scrollTop

        drag(delta)
        set({ delta })
      })
    }
  }, [])

  return delta
}
