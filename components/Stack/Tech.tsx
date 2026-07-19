import React, { useRef, useEffect } from 'react'
import cn from 'classnames'
import { animated, to, SpringValue, useSpring } from '@react-spring/web'
import { createCache } from 'service/cache'
import { useStack } from 'service/stack'
import css from './tech.module.css'
import Icon from 'components/Icon'

const FACTOR_X = 10
const FACTOR_Y = 5
const cache = createCache((element: HTMLAnchorElement) => {
  return element.getBoundingClientRect()
})
const createTranspolate = (x: SpringValue<number>, y: SpringValue<number>) => (
  outputX = FACTOR_X,
  outputY = FACTOR_Y,
) => {
  return to(
    [
      x.to({
        range: [-FACTOR_X, FACTOR_X],
        output: [-outputX, outputX],
      }),
      y.to({
        range: [-FACTOR_Y, FACTOR_Y],
        output: [-outputY, outputY],
      }),
    ],
    (x, y) => {
      return `translate(${x}px, ${y}px)`
    },
  )
}

const Tech: React.FC<{
  route: string
  name: string
  description: string
  isGithub: boolean
}> = (props) => {
  const ref = useRef<HTMLAnchorElement>(null)
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }))
  const transpolate = createTranspolate(x, y)

  useEffect(() => {
    if (ref.current) {
      const { current } = ref

      const onmove = ({ clientY, clientX }: MouseEvent) => {
        const { left, top, width, height } = cache.get(current)
        const x = (clientX - left) / width
        const y = (clientY - top) / height
        api.start({
          x: (x - 0.5) * 2 * FACTOR_X,
          y: (y - 0.5) * 2 * FACTOR_Y,
        })
      }

      const onout = () => {
        api.start({ x: 0, y: 0 })
      }

      current.addEventListener('mousemove', onmove)
      current.addEventListener('mouseout', onout)
      return () => {
        current?.removeEventListener('mousemove', onmove)
        current?.removeEventListener('mouseout', onout)
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
              .to({ range: [-FACTOR_X, FACTOR_X], output: [1, -1] })
              .to((d) => `skewY(${d}deg)`),
          }}
        >
          <h4>{props.name}</h4>
          <animated.span
            className={css.trail1}
            style={{ transform: transpolate() }}
          >
            {props.name}
          </animated.span>
          <animated.span
            className={css.trail2}
            style={{ transform: transpolate(12, 15) }}
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
    <ul className={cn('pb-32', css.list)}>
      {results.map((tech) => (
        <Tech key={tech.route} {...tech} />
      ))}
    </ul>
  )
}

export default TechList
