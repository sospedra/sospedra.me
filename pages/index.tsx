import { useState } from 'react'
import { NextPage } from 'next'
import { animated, config, useSpring } from '@react-spring/web'
import { useNav } from 'service/nav'
import { useTransition } from 'service/transition'
import { usePrefetch } from 'service/transition/use-prefetch'
import Link from 'components/Link'
import Shell from 'components/Shell'
import SpriteCity from 'components/Sprite/City'
import SpriteCar from 'components/Sprite/Car'
import Triangle from 'components/Triangle'
import Title from 'components/Title'
import css from './home.module.css'

const BAZAAR_DURATION = 3500
const BAZAAR_OFFSET = -600

const focusOnHover = (ref: React.RefObject<HTMLAnchorElement | null>) => {
  return () => ref.current?.focus()
}

const IndexPage: NextPage = () => {
  const [[offsetX, offsetY], setOffset] = useState([0, 0])
  const refs = useNav()
  const transition = useTransition()
  const { transform } = useSpring({
    // from replaces the old mount effect: the menu slides up on entrance
    from: { transform: 'translate(0vw, 100vh)' },
    transform: `translate(${offsetX}vw, ${offsetY}vh)`,
    config:
      offsetX === BAZAAR_OFFSET ? { duration: BAZAAR_DURATION } : config.slow,
  })
  const carSpring = useSpring({
    transform: `translateX(${offsetX === BAZAAR_OFFSET ? '100vw' : '0vw'})`,
    delay: 500,
    config: config.slow,
  })

  usePrefetch('/bazaar')

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
            <ul>
              <li>
                <Link
                  ref={refs[0]}
                  url='/papers'
                  onMouseEnter={focusOnHover(refs[0])}
                  onClick={() => setOffset([0, 100])}
                >
                  Papers
                </Link>
              </li>
              <li>
                <Link
                  ref={refs[1]}
                  url='/about'
                  onMouseEnter={focusOnHover(refs[1])}
                  onClick={() => setOffset([0, 100])}
                >
                  About
                </Link>
              </li>
              <li>
                {/* custom 3.5s drive-away sequence owns this navigation */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a
                  ref={refs[2]}
                  href='/bazaar'
                  onMouseEnter={focusOnHover(refs[2])}
                  onClick={(e) => {
                    e.preventDefault()
                    setOffset([BAZAAR_OFFSET, 0])
                    setTimeout(() => {
                      transition.setOffshore('cloud', BAZAAR_DURATION)
                    }, BAZAAR_DURATION - 1200)
                    setTimeout(() => {
                      transition.navigate('/bazaar')
                    }, BAZAAR_DURATION - 500)
                  }}
                >
                  Bazaar
                </a>
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
