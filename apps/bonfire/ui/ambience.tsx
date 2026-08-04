'use client'

import { type RefObject, useEffect, useState } from 'react'

const AMBIENCE_VOLUME = 0.5

export function AmbienceToggle(props: {
  audioRef: RefObject<HTMLAudioElement | null>
}) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const audio = props.audioRef.current
    if (!audio) return

    audio.volume = AMBIENCE_VOLUME
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [props.audioRef])

  const toggle = () => {
    const audio = props.audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      return
    }
    audio.play().catch(() => undefined)
  }

  return (
    <div>
      <audio loop preload='auto' ref={props.audioRef}>
        <source src='/bonfire.aac' type='audio/aac' />
      </audio>

      <label className='flex flex-row items-center justify-end w-full text-sm cursor-pointer'>
        <input
          checked={playing}
          className='cursor-pointer'
          name='ambience'
          onChange={toggle}
          type='checkbox'
        />
        <span className='ml-1'>ambience sound</span>
      </label>
    </div>
  )
}
