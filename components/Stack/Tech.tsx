import React, { useRef, useEffect } from 'react'
import {
  animated,
  interpolate,
  OpaqueInterpolation,
  useSpring,
} from 'react-spring'
import { createCache } from 'service/cache'
import css from './tech.module.css'

const FACTOR_X = 10
const FACTOR_Y = 5
const cache = createCache((element: HTMLAnchorElement) => {
  return element.getBoundingClientRect()
})
const createTranspolate = (
  delta: OpaqueInterpolation<number>,
  x: OpaqueInterpolation<number>,
  y: OpaqueInterpolation<number>,
) => (outputDelta: number, outputX = FACTOR_X, outputY = FACTOR_Y) => {
  return interpolate(
    [
      delta.interpolate({
        range: [-300, 300],
        output: [-outputDelta, outputDelta],
      }),
      x.interpolate({
        range: [-FACTOR_X, FACTOR_X],
        output: [-outputX, outputX],
      }),
      y.interpolate({
        range: [-FACTOR_Y, FACTOR_Y],
        output: [-outputY, outputY],
      }),
    ],
    (d, x, y) => {
      return `translate3d(${d}px, ${d}px, ${d}px) translate(${x}px, ${y}px)`
    },
  )
}

const Tech: React.FC<{
  url: string
  name: string
  delta: OpaqueInterpolation<number>
  stars: number
  description: string
}> = (props) => {
  const ref = useRef<HTMLAnchorElement>(null)
  const [{ x, y }, set] = useSpring(() => ({ x: 0, y: 0 }))
  const transpolate = createTranspolate(props.delta, x, y)

  useEffect(() => {
    const $vbody = document.querySelector('#vbody')
    if ($vbody) {
      $vbody.addEventListener('scroll', cache.clear)
      return () => $vbody.removeEventListener('scroll', cache.clear)
    }
  }, [])

  useEffect(() => {
    if (ref.current) {
      const { current } = ref

      const onmove = ({ clientY, clientX }: MouseEvent) => {
        const { left, top, width, height } = cache.get(current)
        const x = (clientX - left) / width
        const y = (clientY - top) / height
        set({
          x: (x - 0.5) * 2 * FACTOR_X,
          y: (y - 0.5) * 2 * FACTOR_Y,
        })
      }

      const onout = () => {
        set({ x: 0, y: 0 })
      }

      current.addEventListener('mousemove', onmove)
      current.addEventListener('mouseout', onout)
      return () => {
        current?.removeEventListener('mousemove', onmove)
        current?.removeEventListener('mousemout', onout)
      }
    }
  }, [ref.current])

  return (
    <li>
      <a
        ref={ref}
        href={props.url}
        target='_blank'
        rel='noopener noreferrer'
        className={css.tech}
      >
        <animated.div
          style={{
            transform: x
              .interpolate({ range: [-FACTOR_X, FACTOR_X], output: [1, -1] })
              .interpolate((d) => `skewY(${d}deg)`),
          }}
        >
          <h4>{props.name}</h4>
          <animated.span
            className={css.trail1}
            style={{ transform: transpolate(15) }}
          >
            {props.name}
          </animated.span>
          <animated.span
            className={css.trail2}
            style={{ transform: transpolate(30, 12, 15) }}
          >
            {props.name}
          </animated.span>
        </animated.div>
        <p>
          <code className='inline pr-2'>★{props.stars}</code>
          <span>{props.description}</span>
        </p>
      </a>
    </li>
  )
}

export default Tech
