'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type ClipAudioOptions = {
  /* seconds of the clip the player may hear; playback hard-stops there */
  limit: number
  onLimit?: () => void
}

export const EQ_BANDS = [60, 250, 1000, 4000, 12000] as const

type ClipGraph = {
  analyser: AnalyserNode
  context: AudioContext
  filters: BiquadFilterNode[]
  master: GainNode
}

export type ClipAudio = ReturnType<typeof useClipAudio>

const createElement = (src: string) => {
  const audio = new Audio()
  audio.crossOrigin = 'anonymous'
  audio.preload = 'auto'
  audio.src = src
  return audio
}

const buildGraph = (audio: HTMLAudioElement): ClipGraph => {
  const context = new AudioContext()
  const source = context.createMediaElementSource(audio)
  const filters = EQ_BANDS.map((frequency) => {
    const filter = context.createBiquadFilter()
    filter.type = 'peaking'
    filter.frequency.value = frequency
    filter.Q.value = 1
    filter.gain.value = 0
    return filter
  })
  const master = context.createGain()
  const analyser = context.createAnalyser()
  analyser.fftSize = 64

  const chain = [source, ...filters, master, analyser]
  for (let index = 0; index < chain.length - 1; index++) {
    chain[index]?.connect(chain[index + 1] as AudioNode)
  }
  analyser.connect(context.destination)

  return { analyser, context, filters, master }
}

export const useClipAudio = (src: string, options: ClipAudioOptions) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const graphRef = useRef<ClipGraph | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const audio = createElement(src)
    audioRef.current = audio

    const markReady = () => setIsReady(true)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setSeconds(0)
      audio.currentTime = 0
    }

    audio.addEventListener('canplaythrough', markReady)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('canplaythrough', markReady)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.src = ''
      audioRef.current = null
      void graphRef.current?.context.close().catch(() => undefined)
      graphRef.current = null
      analyserRef.current = null
    }
  }, [src])

  /* timeupdate is too coarse to police the unlock boundary; poll each frame */
  useEffect(() => {
    if (!isPlaying) return

    let frame = 0
    const tick = () => {
      const audio = audioRef.current
      if (!audio) return
      const { limit, onLimit } = optionsRef.current

      setSeconds(Math.floor(audio.currentTime))

      if (audio.currentTime >= limit) {
        audio.pause()
        audio.currentTime = 0
        setSeconds(0)
        onLimit?.()
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying])

  /* the element source must be created inside a user gesture and only once */
  const ensureGraph = useCallback(() => {
    const audio = audioRef.current
    if (!audio || typeof AudioContext === 'undefined') return null
    if (graphRef.current) return graphRef.current

    try {
      const graph = buildGraph(audio)
      graphRef.current = graph
      analyserRef.current = graph.analyser
      return graph
    } catch {
      return null
    }
  }, [])

  const play = useCallback(() => {
    ensureGraph()
    audioRef.current?.play().catch(() => setIsPlaying(false))
  }, [ensureGraph])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setSeconds(0)
  }, [])

  const setBand = useCallback((band: number, gainDb: number) => {
    const filter = graphRef.current?.filters[band]
    if (!filter) return
    filter.gain.value = gainDb
  }, [])

  const setVolume = useCallback((volume: number) => {
    const graph = graphRef.current
    if (!graph) return
    graph.master.gain.value = Math.min(Math.max(volume, 0), 1)
  }, [])

  return {
    analyser: analyserRef,
    isPlaying,
    isReady,
    pause,
    play,
    seconds,
    setBand,
    setVolume,
    stop,
  }
}
