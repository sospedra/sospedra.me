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

const padChannel = (index: number) => String(index + 1).padStart(2, '0')

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

      <div className={css.statusPanel} role='status' aria-live='polite'>
        <span className={css.signal} aria-hidden='true' />
        <span>CH {padChannel(channelIndex)}/04</span>
        <strong>{channel.label}</strong>
      </div>

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

        <p className={css.instructions}>
          {locked ? (
            'Signal acquired / returning home'
          ) : (
            <>
              Tap / Enter / Space: next <span aria-hidden='true'>·</span>{' '}
              Arrows: tune
            </>
          )}
        </p>
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

      <nav aria-label='Recovery routes' className={css.nav}>
        <Link url='/'>Take me to a safe place</Link>
        <Link url='/serve'>I was looking for a static asset</Link>
      </nav>
    </div>
  )
}

export default Component404
