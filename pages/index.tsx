import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import { animated, config, useSpring } from 'react-spring'
import { useNav } from 'service/nav'
import Link from 'components/Link'
import Shell from 'components/Shell'
import SpriteCity from 'components/Sprite/City'
import SpriteCar from 'components/Sprite/Car'
import Triangle from 'components/Triangle'
import Title from 'components/Title'
import Cheatcodes from 'components/Cheatcodes'
import css from './home.module.css'
import { useTransition } from 'service/transition'

const BAZAAR_DURATION = 3500
const BAZAAR_OFFSET = -600

const IndexPage: NextPage = () => {
  const [[offsetX, offsetY], setOffset] = useState([0, 100])
  const refs = useNav()
  const transition = useTransition()
  const { transform } = useSpring({
    transform: `translate(${offsetX}vw, ${offsetY}vh)`,
    config:
      offsetX === BAZAAR_OFFSET ? { duration: BAZAAR_DURATION } : config.slow,
  })
  const carSpring = useSpring({
    transform: `translateX(${offsetX === BAZAAR_OFFSET ? '100vw' : '0vw'})`,
    delay: 500,
    config: config.slow,
  })

  transition.usePrefetch('/bazaar')

  useEffect(() => {
    setOffset([0, 0])
  }, [])

  return (
    <Shell
      className='flex flex-col items-center justify-center flex-1 w-screen h-screen'
      description='Rubén Sospedra ▼ javascript hacker'
      shellClassName='overflow-y-hidden'
      canonical='/'
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
                  onClick={() => setOffset([0, 100])}
                >
                  Papers
                </Link>
              </li>
              <li>
                <Link
                  ref={refs[1]}
                  url='/about'
                  onMouseEnter={() => refs[1].current?.focus()}
                  onClick={() => setOffset([0, 100])}
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  ref={refs[2]}
                  href='/bazaar'
                  onMouseEnter={() => refs[2].current?.focus()}
                  onClick={(e) => {
                    e.preventDefault()
                    setOffset([BAZAAR_OFFSET, 0])
                    setTimeout(() => {
                      transition.setOffshore('cloud', BAZAAR_DURATION)
                    }, BAZAAR_DURATION - 1000)
                    setTimeout(() => {
                      transition.navigate('/bazaar', '/bazaar')
                    }, BAZAAR_DURATION - 500)
                  }}
                >
                  Bazaar
                </a>
              </li>
              <li>
                <Cheatcodes
                  ref={refs[3]}
                  onMouseEnter={() => refs[3].current?.focus()}
                />
              </li>
            </ul>

            <Triangle />
          </div>
        </div>
        <SpriteCity />
      </animated.div>

      <animated.div
        className='fixed bottom-0'
        style={{
          left: 'calc(calc(20vw + 30vh) * -1)',
          ...carSpring,
        }}
      >
        <SpriteCar />
      </animated.div>
    </Shell>
  )
}

export default IndexPage
