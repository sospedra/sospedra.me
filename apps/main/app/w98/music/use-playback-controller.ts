import { sumBy } from 'es-toolkit'
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { fetchJson } from 'services/http'
import {
  BUNDLED_PLAYLIST_MANIFEST_URL,
  parseBundledPlaylist,
} from './bundled-playlist'
import { EQ_FREQUENCIES } from './equalizer'
import {
  INITIAL_PLAYBACK,
  localDeckIndex,
  reducePlayback,
} from './playback-state'
import {
  bundledPlaylistFailure,
  currentIndexOf,
  currentTrackOf,
  type DeckTracks,
  mergeBundledTracks,
  type PlayerFeed,
  probeDuration,
  soundCloudPlayerFeed,
  trackFromFile,
  trackFromSoundCloud,
  withLiveDuration,
} from './playback-view'
import type { LocalMusicTrack, MusicTrack } from './types'
import { useLocalAudio } from './use-local-audio'
import { useSoundCloud } from './use-soundcloud'

export const usePlaybackController = () => {
  const [playback, dispatchPlayback] = useReducer(
    reducePlayback,
    INITIAL_PLAYBACK,
  )
  const [balance, setBalance] = useState(0)
  const [bands, setBands] = useState<number[]>(
    Array.from({ length: EQ_FREQUENCIES.length }, () => 0),
  )
  const [bundledPlaylistError, setBundledPlaylistError] = useState<
    string | null
  >(null)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [localTracks, setLocalTracks] = useState<LocalMusicTrack[]>([])
  const [soundCloudRequested, setSoundCloudRequested] = useState(false)
  const [volume, setVolume] = useState(0.72)
  const loadedLocalSourceRef = useRef<string | null>(null)
  const objectUrlsRef = useRef(new Set<string>())

  const audio = useLocalAudio({
    balance,
    bands,
    enabled: true,
    onEnded: () => {
      if (playback.source === 'local') next()
    },
    preamp: 0,
    volume,
  })
  const soundCloud = useSoundCloud(volume)

  useEffect(() => {
    dispatchPlayback({
      index: soundCloud.currentIndex,
      type: 'sync-soundcloud',
    })
  }, [soundCloud.currentIndex])

  const localDeck = localDeckIndex(playback)
  const soundCloudTracks = useMemo(
    () =>
      soundCloudRequested ? soundCloud.sounds.map(trackFromSoundCloud) : [],
    [soundCloud.sounds, soundCloudRequested],
  )
  const tracks = useMemo<MusicTrack[]>(
    () => [
      ...soundCloudTracks,
      ...withLiveDuration(localTracks, localDeck, audio.duration),
    ],
    [audio.duration, localDeck, localTracks, soundCloudTracks],
  )
  const decks: DeckTracks = {
    fallbackSound: soundCloud.currentSound,
    localTracks,
    soundCloudTracks,
  }
  const currentTrack = currentTrackOf(playback, decks)
  const currentIndex = currentIndexOf(playback, decks)
  const localCurrentTrack = localTracks[localDeck] ?? null
  const selectedIndex = tracks.findIndex(
    (track) => track.id === selectedTrackId,
  )
  const totalDuration = useMemo(
    () => sumBy(tracks, (track) => track.duration),
    [tracks],
  )
  const soundCloudError =
    soundCloud.status.phase === 'error' ? soundCloud.status.message : null
  const playerFeed: PlayerFeed =
    playback.source === 'soundcloud'
      ? soundCloudPlayerFeed(soundCloud, currentTrack !== null)
      : {
          canPlay: localCurrentTrack !== null,
          duration: audio.duration,
          isPlaying: audio.isPlaying,
          position: audio.position,
        }
  const playbackError =
    playback.source === 'soundcloud'
      ? soundCloudError
      : (audio.error ?? bundledPlaylistError)
  const trackAnnouncement = currentTrack
    ? `${playerFeed.isPlaying ? 'Playing' : 'Paused'}: ${currentTrack.title}`
    : null

  const loadLocalTrackSource = useCallback(
    (track: LocalMusicTrack): boolean => {
      if (!audio.loadSource(track.src)) return false
      loadedLocalSourceRef.current = track.src
      return true
    },
    [audio.loadSource],
  )

  const playLocalIndex = useCallback(
    async (index: number) => {
      const track = localTracks[index]
      if (!track) return

      soundCloud.pause()
      dispatchPlayback({ index, type: 'play-local' })
      if (index === localDeckIndex(playback)) {
        await audio.toggle()
        return
      }

      loadLocalTrackSource(track)
      await audio.play()
    },
    [
      audio.play,
      audio.toggle,
      loadLocalTrackSource,
      localTracks,
      playback,
      soundCloud.pause,
    ],
  )

  const next = useCallback(() => {
    if (playback.source === 'soundcloud') {
      soundCloud.next()
      return
    }
    if (localTracks.length === 0) return
    const nextIndex = localDeck < 0 ? 0 : (localDeck + 1) % localTracks.length
    void playLocalIndex(nextIndex)
  }, [
    localDeck,
    localTracks.length,
    playLocalIndex,
    playback.source,
    soundCloud.next,
  ])

  const previous = useCallback(() => {
    if (playback.source === 'soundcloud') {
      soundCloud.previous()
      return
    }
    if (localTracks.length === 0) return
    const previousIndex =
      localDeck <= 0 ? localTracks.length - 1 : localDeck - 1
    void playLocalIndex(previousIndex)
  }, [
    localDeck,
    localTracks.length,
    playLocalIndex,
    playback.source,
    soundCloud.previous,
  ])

  const addFiles = useCallback(
    (files: File[]) => {
      const additions = files.map(trackFromFile)
      if (additions.length === 0) return

      for (const track of additions) {
        objectUrlsRef.current.add(track.src)
      }
      const firstIndex = localTracks.length
      setLocalTracks((current) => [...current, ...additions])

      void Promise.all(additions.map(probeDuration)).then((durations) => {
        const byId = new Map(
          additions.map((track, index) => [track.id, durations[index] ?? 0]),
        )
        setLocalTracks((current) =>
          current.map((track) => ({
            ...track,
            duration: byId.get(track.id) ?? track.duration,
          })),
        )
      })

      soundCloud.pause()
      setSelectedTrackId(additions[0].id)
      loadLocalTrackSource(additions[0])
      dispatchPlayback({ index: firstIndex, type: 'play-local' })
      void audio.play()
    },
    [audio.play, loadLocalTrackSource, localTracks.length, soundCloud.pause],
  )

  const selectTrack = useCallback(
    (index: number) => {
      const track = tracks[index]
      if (!track) return
      setSelectedTrackId(track.id)

      if (track.kind === 'soundcloud') {
        audio.pause()
        dispatchPlayback({ index: track.soundIndex, type: 'select-soundcloud' })
        soundCloud.selectTrack(track.soundIndex)
        return
      }

      const localIndex = localTracks.findIndex(
        (localTrack) => localTrack.id === track.id,
      )
      void playLocalIndex(localIndex)
    },
    [audio.pause, localTracks, playLocalIndex, soundCloud.selectTrack, tracks],
  )

  const loadSoundCloudPlaylist = useCallback(
    (source: string) => {
      audio.pause()
      soundCloud.pause()
      setSoundCloudRequested(true)
      dispatchPlayback({ type: 'load-soundcloud' })
      setSelectedTrackId(null)
      soundCloud.loadSource(source)
    },
    [audio.pause, soundCloud.loadSource, soundCloud.pause],
  )

  const toggle = useCallback(() => {
    if (playback.source === 'soundcloud') {
      soundCloud.toggle()
      return
    }
    void audio.toggle()
  }, [audio.toggle, playback.source, soundCloud.toggle])

  const seek = useCallback(
    (position: number) => {
      if (playback.source === 'soundcloud') {
        soundCloud.seek(position)
        return
      }
      audio.seek(position)
    },
    [audio.seek, playback.source, soundCloud.seek],
  )

  const changeBand = (index: number, value: number) => {
    setBands((current) =>
      current.map((band, bandIndex) => (bandIndex === index ? value : band)),
    )
  }

  useEffect(() => {
    const controller = new AbortController()

    const loadBundledPlaylist = async () => {
      let bundledTracks: LocalMusicTrack[]
      try {
        bundledTracks = await fetchJson(
          BUNDLED_PLAYLIST_MANIFEST_URL,
          { parse: parseBundledPlaylist },
          { signal: controller.signal },
        )
      } catch (error) {
        if (controller.signal.aborted) return
        setBundledPlaylistError(bundledPlaylistFailure(error))
        return
      }

      setLocalTracks((current) => mergeBundledTracks(current, bundledTracks))
      dispatchPlayback({ type: 'bundled-ready' })
      setSelectedTrackId((current) => current ?? bundledTracks[0]?.id ?? null)
      setBundledPlaylistError(null)
    }

    void loadBundledPlaylist()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (
      playback.source !== 'local' ||
      !localCurrentTrack ||
      loadedLocalSourceRef.current === localCurrentTrack.src
    ) {
      return
    }
    loadLocalTrackSource(localCurrentTrack)
  }, [loadLocalTrackSource, localCurrentTrack, playback.source])

  useEffect(
    () => () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url)
      }
      objectUrlsRef.current.clear()
    },
    [],
  )

  return {
    addFiles,
    audio,
    balance,
    bands,
    changeBand,
    currentIndex,
    currentTrack,
    loadSoundCloudPlaylist,
    next,
    playback,
    playbackError,
    playerFeed,
    previous,
    seek,
    selectTrack,
    selectedIndex,
    setBalance,
    setVolume,
    soundCloud,
    soundCloudRequested,
    toggle,
    totalDuration,
    trackAnnouncement,
    tracks,
    volume,
  }
}
