'use client'

import Link from 'components/Link'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useSystem } from 'service/system'
import { useTheme } from 'service/theme'
import { useTransition } from 'service/transition'
import css from './404.module.css'

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

type LiquidLayerStyle = React.CSSProperties & {
  '--liquid-delay': string
  '--liquid-duration': string
}

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

type WindowWithOptionalIdle = {
  cancelIdleCallback?: (handle: number) => void
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number
}

const Component404: React.FC = () => {
  const [channelIndex, setChannelIndex] = useState(0)
  const [warmIndex, setWarmIndex] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { navigateLater } = useTransition()
  const { discover } = useSystem()
  const { fxMode } = useTheme()
  const motionAllowed = fxMode === 'full'
  const channel = CHANNELS[channelIndex]
  const locked = channelIndex === CHANNELS.length - 1

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (motionAllowed) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [motionAllowed])

  useEffect(() => {
    setWarmIndex(null)

    const nextIndex = channelIndex + 1
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData
    if (saveData || nextIndex >= CHANNELS.length) return

    const warmNext = () => setWarmIndex(nextIndex)
    const idleWindow = window as unknown as WindowWithOptionalIdle
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(warmNext, { timeout: 1800 })
      return () => idleWindow.cancelIdleCallback?.(idleId)
    }

    const timeoutId = setTimeout(warmNext, 1200)
    return () => clearTimeout(timeoutId)
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
        className={`${css.message} ${channelIndex !== 0 && css.shake}`}
        style={{ animationDuration: channel.intensity }}
      >
        <p>PAGE</p>
        <p>NOT</p>
        <p className={css.messageEnd}>FOUND</p>
        <p className={css.messageCode}>404</p>
      </div>

      <p className='sr-only' role='status' aria-live='polite'>
        Channel {channelIndex + 1} of 4: {channel.label}
      </p>

      <div className={css.tunerConsole}>
        <button
          aria-label={
            locked
              ? 'Return channel acquired. Navigating home.'
              : `Channel ${channelIndex + 1} of 4, ${channel.label}. Activate to tune forward.`
          }
          className={`${css.tuner} ${channelIndex !== 0 ? css.expand : ''} ${locked ? css.locked : ''}`}
          disabled={locked}
          onClick={tuneForward}
          onKeyDown={handleKeyDown}
          type='button'
        >
          <video
            autoPlay={motionAllowed}
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

      {warmIndex !== null && (
        <video
          aria-hidden='true'
          className={css.preload}
          muted
          preload='auto'
          tabIndex={-1}
        >
          <source
            src={`/video/${CHANNELS[warmIndex].id}.webm`}
            type='video/webm'
          />
          <source
            src={`/video/${CHANNELS[warmIndex].id}.mp4`}
            type='video/mp4'
          />
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
                  style={
                    {
                      '--liquid-delay': delay,
                      '--liquid-duration': duration,
                    } as LiquidLayerStyle
                  }
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

export default Component404
