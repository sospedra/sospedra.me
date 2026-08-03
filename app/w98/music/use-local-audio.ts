'use client'

import { clamp } from 'es-toolkit'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type AudioGraphSettings,
  applyAudioGraphSettings,
  createMusicAudioGraph,
  type MusicAudioGraph,
} from './audio-graph'

const playbackErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Playback was blocked. Press play again to unlock audio.'
  }
  if (error instanceof Error && error.message) return error.message
  return 'The browser could not start the audio engine.'
}

type UseLocalAudioOptions = AudioGraphSettings & {
  onEnded?: () => void
}

export const useLocalAudio = (options: UseLocalAudioOptions) => {
  const { balance, bands, enabled, onEnded, preamp, volume } = options
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const graphRef = useRef<MusicAudioGraph | null>(null)
  const onEndedRef = useRef(onEnded)

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  useEffect(() => {
    if (!audio) return

    const onDuration = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration * 1000 : 0)
    const onTime = () => setPosition(audio.currentTime * 1000)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      onEndedRef.current?.()
    }
    const onError = () => {
      setError('This audio file could not be decoded by the browser.')
      setIsPlaying(false)
    }

    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [audio])

  useEffect(() => {
    const graph = graphRef.current
    if (graph) {
      applyAudioGraphSettings(graph, {
        balance,
        bands,
        enabled,
        preamp,
        volume,
      })
    }
  }, [balance, bands, enabled, preamp, volume])

  useEffect(
    () => () => {
      audio?.pause()
      const graph = graphRef.current
      if (!graph) return
      graph.source.disconnect()
      for (const filter of graph.filters) {
        filter.disconnect()
      }
      graph.preamp.disconnect()
      graph.panner.disconnect()
      graph.output.disconnect()
      graph.analyser.disconnect()
      void graph.context.close()
      graphRef.current = null
    },
    [audio],
  )

  const ensureGraph = useCallback(async (): Promise<MusicAudioGraph | null> => {
    if (!audio) return null

    let graph = graphRef.current
    if (!graph) {
      const context = new AudioContext()
      graph = createMusicAudioGraph(context, audio)
      graphRef.current = graph
      applyAudioGraphSettings(graph, {
        balance,
        bands,
        enabled,
        preamp,
        volume,
      })
    }

    if (graph.context.state === 'closed') {
      throw new Error('The audio engine was closed. Reload to reconnect it.')
    }
    if (graph.context.state !== 'running') await graph.context.resume()
    if (graph.context.state !== 'running') {
      throw new Error('The browser did not unlock the audio engine.')
    }
    return graph
  }, [audio, balance, bands, enabled, preamp, volume])

  const loadSource = useCallback(
    (source: string) => {
      if (!audio) return false
      audio.pause()
      audio.src = source
      audio.load()
      setDuration(0)
      setError(null)
      setPosition(0)
      return true
    },
    [audio],
  )

  const play = useCallback(async (): Promise<boolean> => {
    if (!audio?.src) return false

    try {
      await ensureGraph()
      await audio.play()
      setError(null)
      return true
    } catch (caughtError) {
      setError(playbackErrorMessage(caughtError))
      return false
    }
  }, [audio, ensureGraph])

  const toggle = useCallback(async (): Promise<boolean> => {
    if (!audio?.src) return false
    if (!audio.paused) {
      audio.pause()
      return true
    }
    return play()
  }, [audio, play])

  const pause = useCallback(() => {
    audio?.pause()
  }, [audio])

  const seek = useCallback(
    (milliseconds: number) => {
      if (!audio) return
      const seconds = clamp(milliseconds / 1000, 0, audio.duration || 0)
      audio.currentTime = seconds
      setPosition(seconds * 1000)
    },
    [audio],
  )

  return {
    bindAudio: setAudio,
    duration,
    error,
    isPlaying,
    loadSource,
    pause,
    play,
    position,
    seek,
    toggle,
  }
}
