'use client'

import { type RefObject, useEffect, useState } from 'react'
import { tapHaptic } from 'services/haptics'

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
    tapHaptic()
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

      <label className='mt-3 flex w-full cursor-pointer flex-row items-center justify-end gap-2 text-xs text-ash select-none'>
        <input
          checked={playing}
          className='peer sr-only'
          name='ambience'
          onChange={toggle}
          type='checkbox'
        />
        <span>ambience sound</span>
        <span
          aria-hidden='true'
          className='relative h-[18px] w-8 rounded-full bg-white/15 transition-colors duration-150 after:absolute after:top-0.5 after:left-0.5 after:size-3.5 after:rounded-full after:bg-ash after:transition-transform after:duration-150 after:ease-out-strong peer-checked:bg-ember/80 peer-checked:after:translate-x-3.5 peer-checked:after:bg-night peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember'
        />
      </label>
    </div>
  )
}
