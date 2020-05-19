import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import { animated, config, useSpring } from 'react-spring'
import Link from 'components/sospedra/Link'
import Shell from 'components/sospedra/Shell'
import SpriteCity from 'components/sospedra/Sprite/City'
import { useNav } from './service/nav'
import Triangle from './Triangle'
import Title from './Title'
import Cheatcodes from './Cheatcodes'
import css from './home.module.css'

const IndexPage: NextPage = () => {
  const [offset, setOffset] = useState(100)
  const refs = useNav()
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
      description='Rubén Sospedra ▼ javascript hacker'
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
                  onMouseEnter={() => refs[0].current?.focus()}
                  onClick={() => setOffset(100)}
                >
                  Papers
                </Link>
              </li>
              <li>
                <Link
                  ref={refs[1]}
                  url='/about'
                  onMouseEnter={() => refs[1].current?.focus()}
                  onClick={() => setOffset(100)}
                >
                  About
                </Link>
              </li>
              <li>
                <Cheatcodes
                  ref={refs[2]}
                  onMouseEnter={() => refs[2].current?.focus()}
                />
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
