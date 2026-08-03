'use client'

import {
  animated,
  config,
  useReducedMotion,
  useSpring,
} from '@react-spring/web'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useHotkeys } from 'services/hotkeys'
import Link from 'services/link'
import Shell from 'services/shell'
import { useTheme } from 'services/theme'
import { useRouteTransition } from 'services/transition/context'
import { usePrefetch } from 'services/transition/use-prefetch'
import SpriteCity from './city-sprite'
import css from './home.module.css'
import SpriteMoon from './moon-sprite'
import Title from './title'
import Triangle from './triangle'
import { useNav } from './use-nav'

const BAZAAR_SIGNATURE_DURATION = 3100
const BAZAAR_EXPRESS_DURATION = 2500
const BAZAAR_OFFSET = -250
const BAZAAR_SESSION_KEY = 'midnight-io:bazaar-ride'
const HOME_INTRO_DURATION = 1200
const CAR_ARRIVAL_DURATION = 820
const CAR_SHUTDOWN_DELAY = 320
const CAR_EXIT_DURATION = 340

const loadSpriteCar = () => import('services/car/car')
const SpriteCar = dynamic(loadSpriteCar, { ssr: false })

const bezierAxis = (c1: number, c2: number) => (u: number) =>
  3 * (1 - u) * (1 - u) * u * c1 + 3 * (1 - u) * u * u * c2 + u * u * u

// cubic-bezier(0.4, 0, 0.6, 0.52), must match --drive-ease in home.module.css:
// the car pulls away from rest and settles into a ~1.2x cruise on the bridge
const driveTime = bezierAxis(0.4, 0.6)
const driveProgress = bezierAxis(0, 0.52)

const driveEase = (t: number) => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  let lo = 0
  let hi = 1
  // per-frame hot path: 20 bisection steps pin u within 1e-6
  for (let step = 0; step < 20; step++) {
    const mid = (lo + hi) / 2
    if (driveTime(mid) < t) lo = mid
    else hi = mid
  }
  return driveProgress((lo + hi) / 2)
}

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
  const transition = useRouteTransition()
  const { fxMode } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const motionAllowed = fxMode === 'full' && !prefersReducedMotion
  const isDeparting = offsetX === BAZAAR_OFFSET
  const isWorldMoving = offsetX !== 0 || offsetY !== 0
  const prefetchBazaar = usePrefetch('/bazaar')
  const { transform } = useSpring({
    transform: `translate3d(${offsetX}vw, ${offsetY}vh, 0)`,
    immediate: !motionAllowed,
    config: isDeparting
      ? { duration: driveDuration, easing: driveEase }
      : config.slow,
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

  const carParked = carVisible && !carArriving && !isDeparting
  useHotkeys([
    [
      'e',
      (event) => {
        if (!carParked) return
        event.preventDefault()
        dispatch({ type: 'engine-toggle' })
      },
    ],
  ])

  return (
    <Shell
      className='flex flex-col items-center justify-center flex-1 w-screen h-dvh'
      shellClassName='overflow-hidden'
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
        <span className={css.blackout} />
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
              engineOn={engineOn}
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
