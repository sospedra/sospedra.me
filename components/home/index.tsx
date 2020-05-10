import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import { animated, config, useSpring } from 'react-spring'
import Link from 'components/sospedra/Link'
import Shell from 'components/sospedra/Shell'
import SpriteCity from 'components/sospedra/Sprite/City'
import Triangle from './Triangle'
import Title from './Title'
import css from './home.module.css'

const IndexPage: NextPage = () => {
  const [offset, setOffset] = useState(100)
  const { transform } = useSpring({
    transform: `translateY(${offset}vh)`,
    config: config.slow,
  })

  useEffect(() => {
    setOffset(0)
  }, [])

  return (
    <Shell
      className='flex flex-col items-center justify-center flex-1 w-screen h-screen'
      shellClassName='overflow-y-hidden'
    >
      <animated.div className='flex flex-1' style={{ transform }}>
        <div className={css.main}>
          <Title />

          <div className={css.menu}>
            <ul className=''>
              <li>
                <Link url='/papers' onClick={() => setOffset(100)}>
                  Papers
                </Link>
              </li>
              <li>
                <Link url='/about' onClick={() => setOffset(100)}>
                  About
                </Link>
              </li>
              <li>
                <a href='mailto:hello@sospedra.me'>Hire me</a>
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
