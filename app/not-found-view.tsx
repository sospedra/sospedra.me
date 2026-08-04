'use client'

import cn from 'clsx'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { cssVars } from 'services/css-vars'
import Link from 'services/link'
import { useSystem } from 'services/system'
import { useTheme } from 'services/theme'
import { useRouteTransition } from 'services/transition/context'
import css from './not-found.module.css'

const CHANNELS = [
  { id: 'desk', label: 'DESK FEED', intensity: '0.5s' },
  { id: 'kermit', label: 'GREEN ROOM', intensity: '2s' },
  { id: 'pedro', label: 'NIGHT CALL', intensity: '1s' },
  { id: 'static', label: 'RETURN VECTOR', intensity: '0.35s' },
] as const

const LIQUID_LAYER_TIMINGS = [
  { delay: '0s', duration: '25s' },
  { delay: '0.15s', duration: '15.9s' },
  { delay: '0.53s', duration: '26.4s' },
  { delay: '0.45s', duration: '17.8s' },
  { delay: '1.6s', duration: '19.2s' },
  { delay: '1.6s', duration: '29.2s' },
  { delay: '1.6s', duration: '20.2s' },
] as const

const HOME_LINK_WORDS = ['Take', 'me', 'to', 'a', 'safe', 'place'] as const

const HomeLinkLabel = () => (
  <span className={css.homeLinkLabel}>
    {HOME_LINK_WORDS.map((word) => (
      <span className={css.homeLinkWord} key={word}>
        {word}
      </span>
    ))}
  </span>
)

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean }
}

const scheduleIdle = (callback: () => void): (() => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(callback, { timeout: 1800 })
    return () => window.cancelIdleCallback(idleId)
  }
  const timeoutId = window.setTimeout(callback, 1200)
  return () => window.clearTimeout(timeoutId)
}

const NotFoundView: React.FC = () => {
  const [channelIndex, setChannelIndex] = useState(0)
  const [warmed, setWarmed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { navigateLater } = useRouteTransition()
  const { discover } = useSystem()
  const { fxMode } = useTheme()
  const motionAllowed = fxMode === 'full'
  const channel = CHANNELS[channelIndex]
  const locked = channelIndex === CHANNELS.length - 1
  const warmChannel =
    warmed && channelIndex + 1 < CHANNELS.length
      ? CHANNELS[channelIndex + 1]
      : null

  // biome-ignore lint/correctness/useExhaustiveDependencies: channel.id remounts the keyed video, playback must restart with it
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (motionAllowed) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [motionAllowed, channel.id])

  useEffect(() => {
    setWarmed(false)

    const saveData = (navigator as NavigatorWithConnection).connection?.saveData
    if (saveData || channelIndex + 1 >= CHANNELS.length) return

    return scheduleIdle(() => setWarmed(true))
  }, [channelIndex])

  const tuneForward = () => {
    if (locked) return

    const nextIndex = channelIndex + 1
    setChannelIndex(nextIndex)
    if (nextIndex === CHANNELS.length - 1) {
      discover('404')
      navigateLater('/', motionAllowed ? 1000 : 0)
    }
  }

  const tuneBackward = () => {
    if (locked || channelIndex === 0) return
    setChannelIndex((current) => current - 1)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      tuneForward()
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      tuneBackward()
    }
  }

  return (
    <div className={css.notfound}>
      <h1 className='sr-only'>Page not found</h1>
      <div
        aria-hidden='true'
        className={cn(css.message, channelIndex !== 0 && css.shake)}
        style={{ animationDuration: channel.intensity }}
      >
        <p>PAGE</p>
        <p>NOT</p>
        <p className={css.messageEnd}>FOUND</p>
        <p className={css.messageCode}>404</p>
      </div>

      <p className='sr-only' role='status' aria-live='polite'>
        Channel {channelIndex + 1} of {CHANNELS.length}: {channel.label}
      </p>

      <div className={css.tunerConsole}>
        <button
          aria-label={
            locked
              ? 'Return channel acquired. Navigating home.'
              : `Channel ${channelIndex + 1} of ${CHANNELS.length}, ${channel.label}. Activate to tune forward.`
          }
          className={cn(
            css.tuner,
            channelIndex !== 0 && css.expand,
            locked && css.locked,
          )}
          aria-disabled={locked}
          onClick={tuneForward}
          onKeyDown={handleKeyDown}
          type='button'
        >
          <video
            className={css.video}
            controls={false}
            key={channel.id}
            loop
            muted
            playsInline
            preload='auto'
            ref={videoRef}
          >
            <source src={`/video/${channel.id}.webm`} type='video/webm' />
            <source src={`/video/${channel.id}.mp4`} type='video/mp4' />
          </video>
          <span aria-hidden='true' className={css.frameLabel}>
            {locked ? 'HOME VECTOR LOCKED' : 'TUNE ▼'}
          </span>
        </button>
      </div>

      {warmChannel && (
        <video
          aria-hidden='true'
          className={css.preload}
          muted
          preload='auto'
          tabIndex={-1}
        >
          <source src={`/video/${warmChannel.id}.webm`} type='video/webm' />
          <source src={`/video/${warmChannel.id}.mp4`} type='video/mp4' />
        </video>
      )}

      <nav aria-label='Recovery route' className={css.nav}>
        <Link
          aria-label='Take me to a safe place'
          className={css.homeLink}
          url='/'
        >
          <span aria-hidden='true' className={css.homeLinkClip}>
            <span className={css.homeLiquidScene}>
              <span className={css.homeLiquidLight} />
              {LIQUID_LAYER_TIMINGS.map(({ delay, duration }) => (
                <span
                  className={css.homeLiquidLayer}
                  key={`${delay}-${duration}`}
                  style={cssVars({
                    '--liquid-delay': delay,
                    '--liquid-duration': duration,
                  })}
                />
              ))}
              <span className={css.homeLiquidBase} />
              <span className={css.homeLiquidSurface} />
            </span>
            <span className={css.homeLinkText}>
              <HomeLinkLabel />
            </span>
          </span>
        </Link>
      </nav>
    </div>
  )
}

export default NotFoundView
