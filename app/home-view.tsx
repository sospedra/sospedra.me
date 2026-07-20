'use client'

import {
  animated,
  config,
  useReducedMotion,
  useSpring,
} from '@react-spring/web'
import css from 'app/home.module.css'
import Link from 'components/Link'
import Shell from 'components/Shell'
import SpriteCar from 'components/Sprite/Car'
import SpriteCity from 'components/Sprite/City'
import Title from 'components/Title'
import Triangle from 'components/Triangle'
import { useRouter } from 'next/navigation'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNav } from 'service/nav'
import { useTheme } from 'service/theme'
import { useTransition } from 'service/transition'
import { usePrefetch } from 'service/transition/use-prefetch'

const BAZAAR_SIGNATURE_DURATION = 3500
const BAZAAR_EXPRESS_DURATION = 2200
const BAZAAR_OFFSET = -180
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
  const router = useRouter()
  const refs = useNav()
  const transition = useTransition()
  const { fxMode } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const motionAllowed = fxMode === 'full' && !prefersReducedMotion
  const isDeparting = offsetX === BAZAAR_OFFSET
  const prefetchBazaar = usePrefetch('/bazaar')
  const { opacity, transform } = useSpring({
    // The original stage reveal is part of the site's identity: the whole
    // night-drive scene rises into view, then remains directly manipulable.
    from: { opacity: 0.82, transform: 'translate3d(0, 100vh, 0)' },
    opacity: 1,
    transform: `translate3d(${offsetX}vw, ${offsetY}vh, 0)`,
    immediate: !motionAllowed,
    config: isDeparting ? { duration: driveDuration } : config.slow,
  })
  const carSpring = useSpring({
    transform: `translate3d(${isDeparting ? '100vw' : '0vw'}, 0, 0)`,
    delay: isDeparting ? Math.min(420, driveDuration * 0.12) : 0,
    immediate: !motionAllowed,
    config: isDeparting
      ? { duration: Math.max(900, driveDuration * 0.55) }
      : config.slow,
  })

  useEffect(() => {
    if (!isDeparting) return
    const skipDeparture = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      router.push('/bazaar')
    }
    window.addEventListener('keydown', skipDeparture)
    return () => window.removeEventListener('keydown', skipDeparture)
  }, [isDeparting, router])

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
      router.push('/bazaar')
      return
    }

    let isFirstRide = true
    try {
      isFirstRide = sessionStorage.getItem(BAZAAR_SESSION_KEY) !== 'complete'
      sessionStorage.setItem(BAZAAR_SESSION_KEY, 'complete')
    } catch {
      // Session storage is optional; retain the signature ride.
    }

    const duration = !motionAllowed
      ? 0
      : isFirstRide
        ? BAZAAR_SIGNATURE_DURATION
        : BAZAAR_EXPRESS_DURATION

    if (duration === 0) {
      router.push('/bazaar')
      return
    }

    setDriveDuration(duration)
    setOffset([BAZAAR_OFFSET, 0])
    const origin = window.location.pathname
    if (duration > 1400) {
      window.setTimeout(
        () => {
          if (window.location.pathname !== origin) return
          transition.setOffshore('cloud', 1900)
        },
        Math.max(duration - 1450, 0),
      )
    }
    // Provider commits 360ms after the route signal, so this lands exactly
    // as the drive completes while the cloud wipe is still covering the cut.
    transition.navigateLater('/bazaar', Math.max(duration - 360, 0))
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
