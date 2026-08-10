'use client'

import { type RefObject, useEffect, useReducer, useRef } from 'react'
import type {
  SoundCloudProgress,
  SoundCloudSound,
  SoundCloudWidget,
} from './soundcloud.ts'
import { toTime } from './time.ts'

type PlaybackState = {
  songTitle: string
  isPlaying: boolean
  duration: string
  time: string
  progress: number
  progressEnd: number
}

type PlaybackEvent =
  | { type: 'cue'; sound: SoundCloudSound }
  | { type: 'play'; sound: SoundCloudSound }
  | { type: 'pause' }
  | { type: 'progress'; position: number }

const INITIAL_PLAYBACK: PlaybackState = {
  songTitle: '',
  isPlaying: false,
  duration: '0:00',
  time: '0:00',
  progress: 0,
  progressEnd: 0,
}

// SoundCloud titles read "artist - song"; the player shows the song alone
const songTitle = (sound: SoundCloudSound): string => {
  return (sound.title ?? '').split('-').pop()?.trim() ?? ''
}

const reducePlayback = (
  state: PlaybackState,
  event: PlaybackEvent,
): PlaybackState => {
  switch (event.type) {
    case 'cue':
    case 'play': {
      const duration = event.sound.duration ?? 0
      return {
        ...state,
        songTitle: songTitle(event.sound),
        duration: toTime(duration),
        progressEnd: duration,
        isPlaying: event.type === 'play' || state.isPlaying,
      }
    }
    case 'pause': {
      return { ...state, isPlaying: false }
    }
    case 'progress': {
      return {
        ...state,
        time: toTime(event.position),
        progress: event.position,
      }
    }
  }
}

export const usePlayback = (props: {
  ambience: RefObject<HTMLAudioElement | null>
  iframe: HTMLIFrameElement | null
  apiReady: boolean
}) => {
  const { ambience, iframe, apiReady } = props
  const [state, dispatch] = useReducer(reducePlayback, INITIAL_PLAYBACK)
  const widgetRef = useRef<SoundCloudWidget | null>(null)
  const pristineRef = useRef(true)

  useEffect(() => {
    if (!apiReady || !iframe || !window.SC) return

    const factory = window.SC.Widget
    const events = factory.Events
    const widget = factory(iframe)
    widgetRef.current = widget

    const onPlay = () => {
      if (pristineRef.current) {
        pristineRef.current = false
        ambience.current?.play().catch(() => undefined)
      }
      widget.getCurrentSound((sound) => dispatch({ type: 'play', sound }))
    }

    const onProgress = (payload?: SoundCloudProgress) => {
      if (!payload) return
      dispatch({ type: 'progress', position: payload.currentPosition })
    }

    widget.bind(events.READY, () => {
      widget.getCurrentSound((sound) => dispatch({ type: 'cue', sound }))
      widget.bind(events.PLAY, onPlay)
      widget.bind(events.PAUSE, () => dispatch({ type: 'pause' }))
      widget.bind(events.PLAY_PROGRESS, onProgress)
    })

    return () => {
      widget.unbind(events.READY)
      widget.unbind(events.PLAY)
      widget.unbind(events.PAUSE)
      widget.unbind(events.PLAY_PROGRESS)
      if (widgetRef.current === widget) widgetRef.current = null
    }
  }, [apiReady, iframe, ambience])

  return {
    ...state,
    play: () => widgetRef.current?.play(),
    pause: () => widgetRef.current?.pause(),
  }
}
