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
import SpriteCity from 'components/Sprite/City'
import SpriteMoon from 'components/Sprite/Moon'
import Title from 'components/Title'
import Triangle from 'components/Triangle'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useNav } from 'service/nav'
import { useTheme } from 'service/theme'
import { useTransition } from 'service/transition'
import { usePrefetch } from 'service/transition/use-prefetch'

const BAZAAR_SIGNATURE_DURATION = 3100
const BAZAAR_EXPRESS_DURATION = 2500
const BAZAAR_OFFSET = -200
const BAZAAR_SESSION_KEY = 'midnight-io:bazaar-ride'
const HOME_INTRO_DURATION = 1200
const CAR_ARRIVAL_DURATION = 820
const CAR_SHUTDOWN_DELAY = 320
const CAR_EXIT_DURATION = 340

const loadSpriteCar = () => import('components/Sprite/Car')
const SpriteCar = dynamic(loadSpriteCar, { ssr: false })

type StageState = {
  offset: readonly [number, number]
  driveDuration: number
  engineOn: boolean
  carVisible: boolean
  carArriving: boolean
  isLeavingHome: boolean
}

type StageEvent =
  | { type: 'reveal-car' }
  | { type: 'car-arrive' }
  | { type: 'car-park' }
  | { type: 'engine-on' }
  | { type: 'engine-off' }
  | { type: 'engine-toggle' }
  | { type: 'depart'; duration: number }
  | { type: 'leave-home' }

const INITIAL_STAGE: StageState = {
  offset: [0, 0],
  driveDuration: BAZAAR_EXPRESS_DURATION,
  engineOn: false,
  carVisible: false,
  carArriving: false,
  isLeavingHome: false,
}

function stageReducer(state: StageState, event: StageEvent): StageState {
  switch (event.type) {
    case 'reveal-car':
      return { ...state, carVisible: true }
    case 'car-arrive':
      return { ...state, engineOn: true, carArriving: true, carVisible: true }
    case 'car-park':
      return { ...state, carArriving: false }
    case 'engine-on':
      return { ...state, engineOn: true }
    case 'engine-off':
      return { ...state, engineOn: false }
    case 'engine-toggle':
      return { ...state, engineOn: !state.engineOn }
    case 'depart':
      return {
        ...state,
        carVisible: true,
        carArriving: false,
        driveDuration: event.duration,
        offset: [BAZAAR_OFFSET, 0],
      }
    case 'leave-home':
      return {
        ...state,
        engineOn: false,
        carArriving: false,
        isLeavingHome: true,
        offset: [0, 100],
      }
  }
}

function carPose(stage: StageState, isDeparting: boolean) {
  if (stage.isLeavingHome) {
    return { opacity: 0, transform: 'translate3d(0vw, 100vh, 0)' }
  }
  if (stage.carVisible) {
    return { opacity: 1, transform: 'translate3d(0vw, 0vh, 0)' }
  }
  return {
    opacity: isDeparting ? 1 : 0,
    transform: 'translate3d(-30vw, 0vh, 0)',
  }
}

function carSpringConfig(stage: StageState) {
  if (stage.carArriving) return { duration: CAR_ARRIVAL_DURATION }
  if (stage.isLeavingHome) return { duration: CAR_EXIT_DURATION }
  return config.slow
}

function carDockState(stage: StageState, isDeparting: boolean) {
  if (isDeparting) return 'departing'
  if (stage.carArriving) return 'arriving'
  if (stage.engineOn) return 'idling'
  return 'parked'
}

function claimFirstRide() {
  try {
    const isFirstRide =
      sessionStorage.getItem(BAZAAR_SESSION_KEY) !== 'complete'
    sessionStorage.setItem(BAZAAR_SESSION_KEY, 'complete')
    return isFirstRide
  } catch {
    // Session storage is optional; retain the signature ride.
    return true
  }
}

export default function HomeView() {
  const [epoch, setEpoch] = useState(0)
  const revived = useRef(false)

  // cacheComponents revives this page with the exit offsets intact: effects
  // re-run while refs survive, so a second run means revival and a remount
  useEffect(() => {
    if (revived.current) setEpoch((e) => e + 1)
    revived.current = true
  }, [])

  return <HomeStage key={epoch} />
}

function HomeStage() {
  const [stage, dispatch] = useReducer(stageReducer, INITIAL_STAGE)
  const { carArriving, carVisible, driveDuration, engineOn, isLeavingHome } =
    stage
  const [offsetX, offsetY] = stage.offset
  const router = useRouter()
  const refs = useNav()
  const transition = useTransition()
  const { fxMode } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const motionAllowed = fxMode === 'full' && !prefersReducedMotion
  const isDeparting = offsetX === BAZAAR_OFFSET
  const isWorldMoving = offsetX !== 0 || offsetY !== 0
  const prefetchBazaar = usePrefetch('/bazaar')
  const { transform } = useSpring({
    transform: `translate3d(${offsetX}vw, ${offsetY}vh, 0)`,
    immediate: !motionAllowed,
    config: isDeparting ? { duration: driveDuration } : config.slow,
  })
  const carSpring = useSpring({
    ...carPose(stage, isDeparting),
    immediate: !motionAllowed,
    config: carSpringConfig(stage),
  })

  useEffect(() => {
    if (!motionAllowed) {
      dispatch({ type: 'reveal-car' })
      return
    }

    // Keep the car and its four SVG layers out of the first paint, but warm
    // the code split before it drives in at the end of the home intro.
    const warmCar = window.setTimeout(() => {
      void loadSpriteCar()
    }, 320)
    const arrive = window.setTimeout(() => {
      dispatch({ type: 'car-arrive' })
    }, HOME_INTRO_DURATION)
    const park = window.setTimeout(() => {
      dispatch({ type: 'car-park' })
    }, HOME_INTRO_DURATION + CAR_ARRIVAL_DURATION)
    const shutdown = window.setTimeout(
      () => {
        dispatch({ type: 'engine-off' })
      },
      HOME_INTRO_DURATION + CAR_ARRIVAL_DURATION + CAR_SHUTDOWN_DELAY,
    )

    return () => {
      window.clearTimeout(warmCar)
      window.clearTimeout(arrive)
      window.clearTimeout(park)
      window.clearTimeout(shutdown)
    }
  }, [motionAllowed])

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

    void loadSpriteCar()
    dispatch({ type: 'engine-on' })

    const isFirstRide = claimFirstRide()
    if (!motionAllowed) {
      router.push('/bazaar')
      return
    }

    const duration = isFirstRide
      ? BAZAAR_SIGNATURE_DURATION
      : BAZAAR_EXPRESS_DURATION
    dispatch({ type: 'depart', duration })
    transition.navigateLater('/bazaar', Math.max(duration - 360, 0))
  }

  const leaveHome = () => dispatch({ type: 'leave-home' })

  return (
    <Shell
      className='flex flex-col items-center justify-center flex-1 w-screen h-dvh'
      shellClassName='overflow-hidden'
      canonical='/'
    >
      <animated.div
        className={css.world}
        data-driving={isDeparting ? 'true' : 'false'}
        style={isWorldMoving ? { transform } : undefined}
      >
        <div className={css.homeRunway}>
          <div className={css.homeFrame}>
            <div className={css.main}>
              <Title />

              <div className={css.menu}>
                <ul>
                  <li>
                    <Link ref={refs[0]} url='/papers' onClick={leaveHome}>
                      Papers
                    </Link>
                  </li>
                  <li>
                    <Link ref={refs[1]} url='/about' onClick={leaveHome}>
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
                      Bazaar
                    </a>
                  </li>
                </ul>

                <Triangle />
              </div>
            </div>
          </div>
        </div>
        <SpriteMoon />
        <SpriteCity />
      </animated.div>

      <div
        aria-hidden='true'
        className={css.foreground}
        data-driving={isDeparting ? 'true' : 'false'}
        data-leaving={isLeavingHome ? 'true' : 'false'}
        style={{ '--drive-ms': `${driveDuration}ms` } as CSSProperties}
      >
        <div className={css.fgTrackWorld}>
          <span className={css.fgLamps} />
          <span className={css.fgGapTower} />
        </div>
        <div className={css.fgTrackNear}>
          <span className={css.fgNearBlock} />
        </div>
        <div className={css.fgTrackNearest}>
          <span className={css.fgNearestTower} />
        </div>
      </div>

      <animated.div
        className={css.carDock}
        data-drive-duration-ms={driveDuration}
        data-journey-car='true'
        data-car-state={carDockState(stage, isDeparting)}
        style={carSpring}
      >
        <div
          className={css.carJourney}
          style={{ animationDuration: `${driveDuration}ms` }}
        >
          {(carVisible || isDeparting) && (
            <SpriteCar
              engineOn={engineOn || isDeparting}
              isMoving={carArriving || isDeparting}
              disabled={carArriving || isDeparting || !carVisible}
              onToggle={() => dispatch({ type: 'engine-toggle' })}
            />
          )}
        </div>
      </animated.div>
    </Shell>
  )
}
