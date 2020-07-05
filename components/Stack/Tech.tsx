import React, { useRef, useEffect } from 'react'
import cn from 'classnames'
import {
  animated,
  interpolate,
  OpaqueInterpolation,
  useSpring,
} from 'react-spring'
import { createCache } from 'service/cache'
import { useMomentum } from 'service/momentum'
import { useStack } from 'service/stack'
import css from './tech.module.css'
import Icon from 'components/Icon'

const FACTOR_X = 10
const FACTOR_Y = 5
const DELTA_CLAMP = [-300, 300]
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
        range: DELTA_CLAMP,
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
  route: string
  name: string
  delta: OpaqueInterpolation<number>
  description: string
  isGithub: boolean
}> = (props) => {
  const ref = useRef<HTMLAnchorElement>(null)
  const [{ x, y }, set] = useSpring(() => ({ x: 0, y: 0 }))
  const transpolate = createTranspolate(props.delta, x, y)

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
        href={props.route}
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
          <Icon
            name={props.isGithub ? 'github.svg' : 'web.svg'}
            className='inline pr-2'
          />
          <span>{props.description}</span>
        </p>
      </a>
    </li>
  )
}

const TechList: React.FC<{}> = () => {
  const delta = useMomentum('#vbody')
  const { results } = useStack()

  useEffect(() => {
    const $vbody = document.querySelector('#vbody')
    if ($vbody) {
      $vbody.addEventListener('scroll', cache.clear)
      return () => $vbody.removeEventListener('scroll', cache.clear)
    }
  }, [])

  useEffect(() => {
    cache.clear()
  }, [results])

  return (
    <animated.ul
      className={cn('pb-32', css.list)}
      style={{
        transform: delta
          .interpolate({ range: DELTA_CLAMP, output: [-6, 6] })
          .interpolate((d) => `skewY(${d}deg)`),
      }}
    >
      {results.map((tech) => (
        <Tech key={tech.route} delta={delta} {...tech} />
      ))}
    </animated.ul>
  )
}

export default TechList
