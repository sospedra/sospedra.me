'use client'

import clsx from 'clsx'
import Script from 'next/script'
import { type RefObject, useEffect, useState } from 'react'
import { playlistEmbedUrl, SOUNDCLOUD_WIDGET_SCRIPT } from 'services/soundcloud'
import { usePlayback } from 'services/use-playback'
import type { Session } from 'services/use-session'
import { PauseIcon, PlayIcon } from 'ui/icons'
import css from './player.module.css'

const CONTROL =
  'grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-firelight transition duration-150 ease-out-strong hover:border-ember hover:text-ember active:scale-95'

export function Player(props: {
  ambience: RefObject<HTMLAudioElement | null>
  playlistID: string
  session: Session
}) {
  const { runtime, publishNow, bindPlayback } = props.session
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null)
  const [apiReady, setApiReady] = useState(false)
  const hosting = runtime.phase === 'host'
  const playback = usePlayback({
    ambience: props.ambience,
    apiReady,
    iframe,
    onTransport: hosting ? publishNow : undefined,
  })

  const { readState } = playback
  useEffect(() => {
    if (!hosting) return
    bindPlayback(readState)
    return () => bindPlayback(null)
  }, [hosting, bindPlayback, readState])

  const seatedSnapshot = runtime.phase === 'seated' ? runtime.snapshot : null
  const { applySnapshot } = playback
  useEffect(() => {
    if (seatedSnapshot === null) return
    void applySnapshot(seatedSnapshot)
  }, [seatedSnapshot, applySnapshot])

  return (
    <div>
      <Script
        onReady={() => setApiReady(true)}
        src={SOUNDCLOUD_WIDGET_SCRIPT}
      />
      <div className='hidden'>
        <iframe
          allow='autoplay'
          ref={setIframe}
          src={playlistEmbedUrl(props.playlistID)}
          title='SoundCloud player'
        />
      </div>

      <div className='flex flex-row items-center gap-3'>
        <p
          className={clsx(
            'min-w-0 flex-1 truncate text-sm',
            playback.songTitle ? 'text-firelight' : 'text-ash italic',
          )}
        >
          {playback.songTitle || 'gathering wood…'}
        </p>
        {runtime.phase !== 'seated' &&
          (playback.isPlaying ? (
            <button
              aria-label='pause'
              className={CONTROL}
              onClick={playback.pause}
              type='button'
            >
              <PauseIcon />
            </button>
          ) : (
            <button
              aria-label='play'
              className={CONTROL}
              onClick={playback.play}
              type='button'
            >
              <PlayIcon />
            </button>
          ))}
      </div>
      <div className='mt-2 flex flex-row items-center gap-2 font-mono text-[11px] text-ash'>
        <span>{playback.time}</span>
        <progress
          className={clsx('h-1.5 flex-1', css.progress)}
          max={playback.progressEnd}
          value={playback.progress}
        />
        <span>{playback.duration}</span>
      </div>
    </div>
  )
}
