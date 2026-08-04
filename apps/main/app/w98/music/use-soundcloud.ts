'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  type SoundCloudProgress,
  type SoundCloudSound,
  type SoundCloudWidget,
  WIDGET_OPTIONS,
} from './soundcloud'
import { INITIAL_SOUNDCLOUD, reduceSoundCloud } from './soundcloud-state'

// target: a cold-cache SoundCloud widget fires READY well under 12s
const WIDGET_READY_TIMEOUT_MS = 12_000

const TIMEOUT_MESSAGE =
  'SoundCloud took too long to respond. Check content blockers, then reload.'
const WIDGET_ERROR_MESSAGE =
  'SoundCloud could not tune this signal. Check that the playlist is public and embeddable.'
const API_ERROR_MESSAGE = 'The SoundCloud player API could not be loaded.'

const fromWidget = <Value>(
  get: (callback: (value: Value) => void) => void,
): Promise<Value> => new Promise((resolve) => get(resolve))

export const useSoundCloud = (outputVolume: number) => {
  const [state, dispatch] = useReducer(reduceSoundCloud, INITIAL_SOUNDCLOUD)
  const [apiReady, setApiReady] = useState(false)
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null)
  const widgetRef = useRef<SoundCloudWidget | null>(null)
  const pendingSourceRef = useRef<{
    generation: number
    source: string
  } | null>(null)
  const playlistSyncRef = useRef(0)
  const sourceLoadRef = useRef(0)
  const soundSyncRef = useRef(0)
  const volumeRef = useRef(outputVolume)
  const widgetReadyRef = useRef(false)

  useEffect(() => {
    volumeRef.current = outputVolume
  }, [outputVolume])

  const syncCurrentSound = useCallback(async (widget: SoundCloudWidget) => {
    const generation = ++soundSyncRef.current
    const [currentSound, currentIndex, duration] = await Promise.all([
      fromWidget<SoundCloudSound>((callback) =>
        widget.getCurrentSound(callback),
      ),
      fromWidget<number>((callback) => widget.getCurrentSoundIndex(callback)),
      fromWidget<number>((callback) => widget.getDuration(callback)),
    ])
    if (generation !== soundSyncRef.current) return
    dispatch({ currentIndex, currentSound, duration, type: 'sound-sync' })
  }, [])

  const syncPlaylist = useCallback(
    (widget: SoundCloudWidget) => {
      const generation = ++playlistSyncRef.current
      widget.getSounds((sounds) => {
        if (generation !== playlistSyncRef.current) return
        dispatch({ sounds, type: 'playlist-sync' })
      })
      void syncCurrentSound(widget)
    },
    [syncCurrentSound],
  )

  const loadWidgetSource = useCallback(
    (widget: SoundCloudWidget, source: string, generation: number) => {
      widget.load(source, {
        ...WIDGET_OPTIONS,
        callback: () => {
          if (generation !== sourceLoadRef.current) return
          widget.setVolume(Math.round(volumeRef.current * 100))
          dispatch({ type: 'ready' })
          syncPlaylist(widget)
        },
      })
    },
    [syncPlaylist],
  )

  useEffect(() => {
    if (!apiReady || !iframe || !window.SC) return

    const factory = window.SC.Widget
    const events = factory.Events
    const widget = factory(iframe)
    widgetRef.current = widget

    const onReady = () => {
      widgetReadyRef.current = true
      const pendingSource = pendingSourceRef.current
      if (pendingSource) {
        pendingSourceRef.current = null
        loadWidgetSource(widget, pendingSource.source, pendingSource.generation)
        return
      }

      sourceLoadRef.current += 1
      widget.setVolume(Math.round(volumeRef.current * 100))
      syncPlaylist(widget)
      dispatch({ type: 'ready' })
    }

    const onPlay = () => {
      void syncCurrentSound(widget)
      dispatch({ type: 'play' })
    }

    const onProgress = (payload?: SoundCloudProgress) => {
      if (!payload) return
      dispatch({ position: payload.currentPosition, type: 'progress' })
    }

    widget.bind(events.READY, onReady)
    widget.bind(events.PLAY, onPlay)
    widget.bind(events.PAUSE, () => dispatch({ type: 'pause' }))
    widget.bind(events.FINISH, () => dispatch({ type: 'finish' }))
    widget.bind(events.PLAY_PROGRESS, onProgress)
    widget.bind(events.SEEK, onProgress)
    widget.bind(events.ERROR, () =>
      dispatch({ message: WIDGET_ERROR_MESSAGE, type: 'error' }),
    )

    return () => {
      widget.pause()
      widget.unbind(events.READY)
      widget.unbind(events.PLAY)
      widget.unbind(events.PAUSE)
      widget.unbind(events.FINISH)
      widget.unbind(events.PLAY_PROGRESS)
      widget.unbind(events.SEEK)
      widget.unbind(events.ERROR)
      playlistSyncRef.current += 1
      sourceLoadRef.current += 1
      soundSyncRef.current += 1
      widgetReadyRef.current = false
      if (widgetRef.current === widget) widgetRef.current = null
    }
  }, [apiReady, iframe, loadWidgetSource, syncCurrentSound, syncPlaylist])

  const phase = state.status.phase

  useEffect(() => {
    if (!iframe || phase !== 'loading') return

    const timeout = window.setTimeout(() => {
      dispatch({ message: TIMEOUT_MESSAGE, type: 'timeout' })
    }, WIDGET_READY_TIMEOUT_MS)

    return () => window.clearTimeout(timeout)
  }, [iframe, phase])

  const widgetInteractive = phase === 'playing' || phase === 'ready'

  useEffect(() => {
    if (!widgetInteractive) return
    widgetRef.current?.setVolume(Math.round(outputVolume * 100))
  }, [outputVolume, widgetInteractive])

  const loadSource = useCallback(
    (source: string) => {
      const generation = ++sourceLoadRef.current
      playlistSyncRef.current += 1
      soundSyncRef.current += 1
      dispatch({ type: 'load-start' })

      const widget = widgetRef.current
      if (!widget || !widgetReadyRef.current) {
        pendingSourceRef.current = { generation, source }
        return
      }

      pendingSourceRef.current = null
      loadWidgetSource(widget, source, generation)
    },
    [loadWidgetSource],
  )

  const toggle = useCallback(() => {
    widgetRef.current?.toggle()
  }, [])

  const pause = useCallback(() => {
    widgetRef.current?.pause()
  }, [])

  const previous = useCallback(() => {
    widgetRef.current?.prev()
  }, [])

  const next = useCallback(() => {
    widgetRef.current?.next()
  }, [])

  const seek = useCallback((position: number) => {
    widgetRef.current?.seekTo(position)
    dispatch({ position, type: 'progress' })
  }, [])

  const selectTrack = useCallback((index: number) => {
    const widget = widgetRef.current
    if (!widget) return
    dispatch({ index, type: 'select-track' })
    widget.skip(index)
    widget.play()
  }, [])

  const markApiReady = useCallback(() => {
    setApiReady(true)
  }, [])

  const markApiError = useCallback(() => {
    dispatch({ message: API_ERROR_MESSAGE, type: 'error' })
  }, [])

  return {
    ...state,
    bindIframe: setIframe,
    loadSource,
    markApiError,
    markApiReady,
    next,
    pause,
    previous,
    seek,
    selectTrack,
    toggle,
  }
}
