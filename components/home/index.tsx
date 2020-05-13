import React, { useState, useEffect, useRef } from 'react'
import { NextPage } from 'next'
import { animated, config, useSpring } from 'react-spring'
import Link from 'components/sospedra/Link'
import Shell from 'components/sospedra/Shell'
import SpriteCity from 'components/sospedra/Sprite/City'
import Triangle from './Triangle'
import Title from './Title'
import Cheatcodes from './Cheatcodes'
import css from './home.module.css'
import { useMousetrap } from 'service/mousetrap'

const IndexPage: NextPage = () => {
  const [offset, setOffset] = useState(100)
  const [, setCursor] = useState(0)
  const refs = [
    useRef<HTMLAnchorElement>(null),
    useRef<HTMLAnchorElement>(null),
    useRef<HTMLButtonElement>(null),
  ] as const
  const { transform } = useSpring({
    transform: `translateY(${offset}vh)`,
    config: config.slow,
  })

  useEffect(() => {
    setOffset(0)
  }, [])

  useEffect(() => {
    if (refs[0].current) {
      refs[0].current.focus()
    }
  }, [refs[0].current])

  useMousetrap([
    [
      'alt+down',
      () => {
        setCursor((c) => {
          const index = c === refs.length - 1 ? 0 : c + 1
          const $el = refs[index].current
          if ($el) $el.focus()
          return index
        })
      },
    ],
    [
      'alt+up',
      () => {
        setCursor((c) => {
          const index = c === 0 ? refs.length - 1 : c - 1
          const $el = refs[index].current
          if ($el) $el.focus()
          return index
        })
      },
    ],
  ])

  return (
    <Shell
      className='flex flex-col items-center justify-center flex-1 w-screen h-screen'
      shellClassName='overflow-y-hidden'
    >
      <animated.div className='flex flex-1 w-full' style={{ transform }}>
        <div className={css.main}>
          <Title />

          <div className={css.menu}>
            <ul className=''>
              <li>
                <Link
                  ref={refs[0]}
                  url='/papers'
                  onClick={() => setOffset(100)}
                >
                  Papers
                </Link>
              </li>
              <li>
                <Link ref={refs[1]} url='/about' onClick={() => setOffset(100)}>
                  About
                </Link>
              </li>
              <li>
                <Cheatcodes ref={refs[2]} />
              </li>
            </ul>

            <Triangle />
          </div>
        </div>

        <SpriteCity />
      </animated.div>
    </Shell>
  )
}

export default IndexPage
