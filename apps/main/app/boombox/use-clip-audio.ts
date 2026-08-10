'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ensureRunning } from 'services/audio/kit'

type ClipAudioOptions = {
  /* seconds of the clip the player may hear; playback hard-stops there */
  limit: number
  onLimit?: () => void
  eqGains: readonly number[]
  volume: number
}

export const EQ_BANDS = [60, 250, 1000, 4000, 12000] as const

type ClipGraph = {
  analyser: AnalyserNode
  context: AudioContext
  filters: BiquadFilterNode[]
  master: GainNode
}

export type ClipAudio = ReturnType<typeof useClipAudio>

const tenths = (time: number) => Math.round(time * 10) / 10

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

  useEffect(() => {
    optionsRef.current = options
  })

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

  const stopAtLimit = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setSeconds(0)
    optionsRef.current.onLimit?.()
  }, [])

  /* timeupdate is too coarse to police the unlock boundary; poll each frame */
  useEffect(() => {
    if (!isPlaying) return

    let frame = 0
    const tick = () => {
      const audio = audioRef.current
      if (!audio) return

      setSeconds(tenths(audio.currentTime))

      if (audio.currentTime >= optionsRef.current.limit) {
        stopAtLimit()
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, stopAtLimit])

  /* rAF overshoots a frame, audible on the 0.1s cut; a timer lands the stop.
     it re-arms itself so a mid-play rewind never cuts the clip early */
  useEffect(() => {
    if (!isPlaying) return

    const limit = options.limit
    let timer = 0
    const arm = () => {
      const audio = audioRef.current
      if (!audio) return
      const remaining = limit - audio.currentTime
      if (remaining <= 0.02) {
        stopAtLimit()
        return
      }
      timer = window.setTimeout(arm, remaining * 1000)
    }

    arm()
    return () => clearTimeout(timer)
  }, [isPlaying, options.limit, stopAtLimit])

  /* the element source must be created inside a user gesture and only once;
     the newborn graph seeds EQ and volume from the latest settings */
  const ensureGraph = useCallback(() => {
    const audio = audioRef.current
    if (!audio || typeof AudioContext === 'undefined') return null
    if (graphRef.current) return graphRef.current

    try {
      const graph = buildGraph(audio)
      const { eqGains, volume } = optionsRef.current
      for (const [band, filter] of graph.filters.entries()) {
        filter.gain.value = eqGains[band] ?? 0
      }
      graph.master.gain.value = Math.min(Math.max(volume, 0), 1)
      graphRef.current = graph
      analyserRef.current = graph.analyser
      return graph
    } catch {
      return null
    }
  }, [])

  const play = useCallback(() => {
    const graph = ensureGraph()
    if (graph) ensureRunning(graph.context)
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

  const seek = useCallback((to: number) => {
    const audio = audioRef.current
    if (!audio) return
    const target = Math.max(0, to)
    audio.currentTime = target
    setSeconds(tenths(target))
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
    seek,
    setBand,
    setVolume,
    stop,
  }
}
