'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BONFIRE_PLAYLIST,
  type SoundCloudProgress,
  type SoundCloudSound,
  type SoundCloudWidget,
  WIDGET_OPTIONS,
} from './soundcloud'

// target: a cold-cache SoundCloud widget fires READY well under 12s
const WIDGET_READY_TIMEOUT_MS = 12_000

const fromWidget = <Value>(
  get: (callback: (value: Value) => void) => void,
): Promise<Value> => new Promise((resolve) => get(resolve))

type SoundCloudState = {
  currentIndex: number
  currentSound: SoundCloudSound | null
  duration: number
  error: string | null
  isLoading: boolean
  isPlaying: boolean
  isReady: boolean
  position: number
  sounds: SoundCloudSound[]
  source: string
}

const initialState: SoundCloudState = {
  currentIndex: 0,
  currentSound: null,
  duration: 0,
  error: null,
  isLoading: true,
  isPlaying: false,
  isReady: false,
  position: 0,
  sounds: [],
  source: BONFIRE_PLAYLIST,
}

export const useSoundCloud = (outputVolume: number) => {
  const [state, setState] = useState(initialState)
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
    setState((current) => ({
      ...current,
      currentIndex,
      currentSound,
      duration,
      position: current.currentIndex === currentIndex ? current.position : 0,
      sounds: current.sounds.map((sound, index) =>
        index === currentIndex ? { ...sound, ...currentSound } : sound,
      ),
    }))
  }, [])

  const syncPlaylist = useCallback(
    (widget: SoundCloudWidget) => {
      const generation = ++playlistSyncRef.current
      widget.getSounds((sounds) => {
        if (generation !== playlistSyncRef.current) return
        setState((current) => ({ ...current, sounds }))
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
          setState((current) => ({
            ...current,
            error: null,
            isLoading: false,
            isReady: true,
          }))
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
      setState((current) => ({
        ...current,
        error: null,
        isLoading: false,
        isReady: true,
      }))
    }

    const onPlay = () => {
      void syncCurrentSound(widget)
      setState((current) => ({
        ...current,
        error: null,
        isLoading: false,
        isPlaying: true,
      }))
    }

    const onPause = () => {
      setState((current) => ({ ...current, isPlaying: false }))
    }

    const onFinish = () => {
      setState((current) => ({
        ...current,
        isPlaying: false,
        position: current.duration,
      }))
    }

    const onProgress = (payload?: SoundCloudProgress) => {
      if (!payload) return
      setState((current) => ({
        ...current,
        position: payload.currentPosition,
      }))
    }

    const onError = () => {
      setState((current) => ({
        ...current,
        error:
          'SoundCloud could not tune this signal. Check that the playlist is public and embeddable.',
        isLoading: false,
        isPlaying: false,
        isReady: false,
      }))
    }

    widget.bind(events.READY, onReady)
    widget.bind(events.PLAY, onPlay)
    widget.bind(events.PAUSE, onPause)
    widget.bind(events.FINISH, onFinish)
    widget.bind(events.PLAY_PROGRESS, onProgress)
    widget.bind(events.SEEK, onProgress)
    widget.bind(events.ERROR, onError)

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

  useEffect(() => {
    if (!iframe || state.isReady || state.error) return

    const timeout = window.setTimeout(() => {
      setState((current) =>
        current.isReady || current.error
          ? current
          : {
              ...current,
              error:
                'SoundCloud took too long to respond. Check content blockers, then reload.',
              isLoading: false,
              isPlaying: false,
            },
      )
    }, WIDGET_READY_TIMEOUT_MS)

    return () => window.clearTimeout(timeout)
  }, [iframe, state.error, state.isReady])

  useEffect(() => {
    if (!state.isReady) return
    widgetRef.current?.setVolume(Math.round(outputVolume * 100))
  }, [outputVolume, state.isReady])

  const loadSource = useCallback(
    (source: string) => {
      const generation = ++sourceLoadRef.current
      playlistSyncRef.current += 1
      soundSyncRef.current += 1
      setState((current) => ({
        ...current,
        currentIndex: 0,
        currentSound: null,
        duration: 0,
        error: null,
        isLoading: true,
        isPlaying: false,
        isReady: false,
        position: 0,
        sounds: [],
        source,
      }))

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
    setState((current) => ({ ...current, position }))
  }, [])

  const selectTrack = useCallback((index: number) => {
    const widget = widgetRef.current
    if (!widget) return
    setState((current) => ({
      ...current,
      currentIndex: index,
      currentSound: current.sounds[index] ?? null,
      duration: current.sounds[index]?.duration ?? 0,
      error: null,
      isLoading: true,
      position: 0,
    }))
    widget.skip(index)
    widget.play()
  }, [])

  const markApiReady = useCallback(() => {
    setApiReady(true)
  }, [])

  const markApiError = useCallback(() => {
    setState((current) => ({
      ...current,
      error: 'The SoundCloud player API could not be loaded.',
      isLoading: false,
      isPlaying: false,
      isReady: false,
    }))
  }, [])

  return {
    ...state,
    apiReady,
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
