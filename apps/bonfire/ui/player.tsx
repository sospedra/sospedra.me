'use client'

import clsx from 'clsx'
import Script from 'next/script'
import { type RefObject, useState } from 'react'
import { playlistEmbedUrl, SOUNDCLOUD_WIDGET_SCRIPT } from 'services/soundcloud'
import { usePlayback } from 'services/use-playback'
import css from './player.module.css'

export function Player(props: {
  ambience: RefObject<HTMLAudioElement | null>
  playlistID: string
}) {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null)
  const [apiReady, setApiReady] = useState(false)
  const playback = usePlayback({
    ambience: props.ambience,
    apiReady,
    iframe,
  })

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

      <div className='flex flex-row items-center justify-between'>
        <p className='text-ellipsis'>{playback.songTitle}</p>
        {playback.isPlaying ? (
          <button aria-label='pause' onClick={playback.pause} type='button'>
            ⏸
          </button>
        ) : (
          <button aria-label='play' onClick={playback.play} type='button'>
            ▶️
          </button>
        )}
      </div>
      <div className='flex flex-row items-center justify-between font-mono text-xs'>
        <span>{playback.time}</span>
        <progress
          className={clsx('flex flex-1 h-1 mx-2', css.progress)}
          max={playback.progressEnd}
          value={playback.progress}
        />
        <span>{playback.duration}</span>
      </div>
    </div>
  )
}
