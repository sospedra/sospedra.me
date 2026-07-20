'use client'

import { animated, config, useSpring } from '@react-spring/web'
import css from 'app/home.module.css'
import Link from 'components/Link'
import Shell from 'components/Shell'
import SpriteCar from 'components/Sprite/Car'
import SpriteCity from 'components/Sprite/City'
import Title from 'components/Title'
import Triangle from 'components/Triangle'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNav } from 'service/nav'
import { useTheme } from 'service/theme'
import { useTransition } from 'service/transition'
import { usePrefetch } from 'service/transition/use-prefetch'

const BAZAAR_SIGNATURE_DURATION = 1200
const BAZAAR_EXPRESS_DURATION = 600
const BAZAAR_OFFSET = -600
const BAZAAR_SESSION_KEY = 'midnight-io:bazaar-ride'

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
  const [driveDuration, setDriveDuration] = useState(BAZAAR_EXPRESS_DURATION)
  const refs = useNav()
  const transition = useTransition()
  const { fxMode } = useTheme()
  const isDeparting = offsetX === BAZAAR_OFFSET
  const prefetchBazaar = usePrefetch('/bazaar')
  const { opacity, transform } = useSpring({
    // Meaningful content paints immediately; the stage only settles into place.
    from: { opacity: 0.88, transform: 'translate(0, 12px)' },
    opacity: 1,
    transform: `translate(${offsetX}vw, ${offsetY}vh)`,
    config: isDeparting ? { duration: driveDuration } : { duration: 480 },
  })
  const carSpring = useSpring({
    transform: `translateX(${isDeparting ? '100vw' : '0vw'})`,
    delay: isDeparting ? Math.min(250, driveDuration / 4) : 0,
    config: isDeparting
      ? { duration: Math.max(360, driveDuration / 2) }
      : config.slow,
  })

  useEffect(() => {
    if (!isDeparting) return
    const skipDeparture = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      transition.navigate('/bazaar')
    }
    window.addEventListener('keydown', skipDeparture)
    return () => window.removeEventListener('keydown', skipDeparture)
  }, [isDeparting, transition])

  const departForBazaar = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const shouldUseNativeNavigation =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey

    if (shouldUseNativeNavigation) return
    event.preventDefault()

    if (isDeparting) {
      transition.navigate('/bazaar')
      return
    }

    let isFirstRide = true
    try {
      isFirstRide = sessionStorage.getItem(BAZAAR_SESSION_KEY) !== 'complete'
      sessionStorage.setItem(BAZAAR_SESSION_KEY, 'complete')
    } catch {
      // Session storage is optional; retain the signature ride.
    }

    const duration =
      fxMode === 'quiet'
        ? 0
        : isFirstRide
          ? BAZAAR_SIGNATURE_DURATION
          : BAZAAR_EXPRESS_DURATION

    if (duration === 0) {
      transition.navigate('/bazaar')
      return
    }

    setDriveDuration(duration)
    setOffset([BAZAAR_OFFSET, 0])
    const origin = window.location.pathname
    if (duration > 1000) {
      window.setTimeout(
        () => {
          if (window.location.pathname !== origin) return
          transition.setOffshore('cloud', Math.min(duration, 1200))
        },
        Math.max(duration - 900, 0),
      )
    }
    transition.navigateLater('/bazaar', Math.max(duration - 220, 0))
  }

  return (
    <Shell
      className='flex flex-col items-center justify-center flex-1 w-screen h-dvh'
      shellClassName='overflow-y-hidden'
      canonical='/'
    >
      <animated.div
        className='flex flex-1 w-full'
        style={{ opacity, transform }}
      >
        <div className={css.main}>
          <Title />
          <p className={css.status}>MIDNIGHT I/O · BCN · SIGNAL ONLINE</p>

          <div className={css.menu}>
            <ul>
              <li>
                <Link
                  ref={refs[0]}
                  url='/papers'
                  onClick={() => setOffset([0, 100])}
                >
                  Papers
                </Link>
              </li>
              <li>
                <Link
                  ref={refs[1]}
                  url='/about'
                  onClick={() => setOffset([0, 100])}
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  ref={refs[2]}
                  href='/bazaar'
                  onMouseEnter={prefetchBazaar}
                  onFocus={prefetchBazaar}
                  onTouchStart={prefetchBazaar}
                  onClick={departForBazaar}
                >
                  {isDeparting ? 'Bazaar · skip' : 'Bazaar'}
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
