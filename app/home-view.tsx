'use client'

import { animated, config, useSpring } from '@react-spring/web'
import css from 'app/home.module.css'
import Link from 'components/Link'
import Shell from 'components/Shell'
import SpriteCar from 'components/Sprite/Car'
import SpriteCity from 'components/Sprite/City'
import Title from 'components/Title'
import Triangle from 'components/Triangle'
import { useEffect, useRef, useState } from 'react'
import { useNav } from 'service/nav'
import { useTransition } from 'service/transition'
import { usePrefetch } from 'service/transition/use-prefetch'

const BAZAAR_DURATION = 3500
const BAZAAR_OFFSET = -600

const focusOnHover = (ref: React.RefObject<HTMLAnchorElement | null>) => {
  return () => ref.current?.focus()
}

export default function HomeView() {
  const [epoch, setEpoch] = useState(0)
  const revived = useRef(false)

  // cacheComponents revives this page from a hidden Activity with the exit
  // offsets intact: effects re-run on reveal while refs survive, so a second
  // run means revival and the stage remounts to replay the entrance
  useEffect(() => {
    if (revived.current) setEpoch((e) => e + 1)
    revived.current = true
  }, [])

  return <HomeStage key={epoch} />
}

function HomeStage() {
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
                {}
                <a
                  ref={refs[2]}
                  href='/bazaar'
                  onMouseEnter={focusOnHover(refs[2])}
                  onClick={(e) => {
                    e.preventDefault()
                    setOffset([BAZAAR_OFFSET, 0])
                    const origin = window.location.pathname
                    setTimeout(() => {
                      // skip the cloud if a back/forward already left home
                      if (window.location.pathname !== origin) return
                      transition.setOffshore('cloud', BAZAAR_DURATION)
                    }, BAZAAR_DURATION - 1200)
                    transition.navigateLater('/bazaar', BAZAAR_DURATION - 500)
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
