'use client'

import { sumBy, uniqBy } from 'es-toolkit'
import Script from 'next/script'
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { fetchJson, HTTPError } from 'services/http'
import {
  BUNDLED_PLAYLIST_MANIFEST_URL,
  parseBundledPlaylist,
} from './bundled-playlist'
import { EQ_FREQUENCIES } from './equalizer'
import EqualizerPanel from './equalizer-panel'
import { extensionOf, stemOf } from './format'
import css from './music.module.css'
import {
  INITIAL_PLAYBACK,
  localDeckIndex,
  type PlaybackState,
  reducePlayback,
} from './playback-state'
import Player from './player'
import {
  BONFIRE_PLAYLIST,
  SOUNDCLOUD_WIDGET_SCRIPT,
  type SoundCloudSound,
  soundCloudEmbedUrl,
} from './soundcloud'
import type { SoundCloudStatus } from './soundcloud-state'
import Tracklist from './tracklist'
import type { LocalMusicTrack, MusicTrack, SoundCloudMusicTrack } from './types'
import { useDraggablePanel } from './use-draggable-panel'
import { useLocalAudio } from './use-local-audio'
import { useSoundCloud } from './use-soundcloud'

export type WinampPanelId = 'equalizer' | 'player' | 'tracklist'
export type WinampPanelVisibility = Record<WinampPanelId, boolean>

export type MusicViewProps = {
  onClosePanel: (panel: WinampPanelId) => void
  onOpenPanel: (panel: WinampPanelId) => void
  panels: WinampPanelVisibility
}

const PANEL_IDS: readonly WinampPanelId[] = ['player', 'equalizer', 'tracklist']

const trackFromFile = (file: File): LocalMusicTrack => {
  const stem = stemOf(file.name)
  const separator = stem.indexOf(' - ')
  const artist = separator > 0 ? stem.slice(0, separator).trim() : ''
  const title = separator > 0 ? stem.slice(separator + 3).trim() : stem

  return {
    album: '',
    artist,
    duration: 0,
    id: `${file.name}:${file.size}:${file.lastModified}:${crypto.randomUUID()}`,
    kind: 'local',
    src: URL.createObjectURL(file),
    title: title || 'Untitled',
    type: extensionOf(file.name),
  }
}

const trackFromSoundCloud = (
  sound: SoundCloudSound,
  soundIndex: number,
): SoundCloudMusicTrack => ({
  album: '',
  artist: sound.user?.username ?? '',
  duration: sound.duration ?? 0,
  id: `soundcloud:${sound.urn ?? sound.id ?? soundIndex}`,
  kind: 'soundcloud',
  permalink: sound.permalink_url ?? BONFIRE_PLAYLIST,
  soundIndex,
  title: sound.title ?? `Track ${soundIndex + 1}`,
  type: 'SC',
})

type DeckTracks = {
  fallbackSound: SoundCloudSound | null
  localTracks: LocalMusicTrack[]
  soundCloudTracks: SoundCloudMusicTrack[]
}

const currentTrackOf = (
  playback: PlaybackState,
  decks: DeckTracks,
): MusicTrack | null => {
  switch (playback.source) {
    case 'local':
      return decks.localTracks[playback.index] ?? null
    case 'none':
      return null
    case 'soundcloud':
      return (
        decks.soundCloudTracks[playback.index] ??
        (decks.fallbackSound
          ? trackFromSoundCloud(decks.fallbackSound, playback.index)
          : null)
      )
  }
}

const currentIndexOf = (playback: PlaybackState, decks: DeckTracks): number => {
  switch (playback.source) {
    case 'local':
      return decks.localTracks[playback.index]
        ? decks.soundCloudTracks.length + playback.index
        : -1
    case 'none':
      return -1
    case 'soundcloud':
      return decks.soundCloudTracks[playback.index] ? playback.index : -1
  }
}

const withLiveDuration = (
  localTracks: LocalMusicTrack[],
  localDeck: number,
  loadedDuration: number,
): LocalMusicTrack[] =>
  localTracks.map((track, index) =>
    index === localDeck && loadedDuration > 0
      ? { ...track, duration: loadedDuration }
      : track,
  )

const panelLayer = (
  activePanel: WinampPanelId,
  panel: WinampPanelId,
  restingLayer: number,
): number => (activePanel === panel ? 30 : restingLayer)

type PlayerFeed = {
  canPlay: boolean
  duration: number
  isPlaying: boolean
  position: number
}

const soundCloudPlayerFeed = (
  soundCloud: { duration: number; position: number; status: SoundCloudStatus },
  hasTrack: boolean,
): PlayerFeed => ({
  canPlay:
    (soundCloud.status.phase === 'playing' ||
      soundCloud.status.phase === 'ready') &&
    hasTrack,
  duration: soundCloud.duration,
  isPlaying: soundCloud.status.phase === 'playing',
  position: soundCloud.position,
})

const bundledPlaylistFailure = (error: unknown): string => {
  if (error instanceof HTTPError) {
    return `The default playlist could not be loaded (${error.response.status}).`
  }
  return error instanceof Error
    ? error.message
    : 'The default playlist could not be loaded.'
}

const mergeBundledTracks = (
  current: LocalMusicTrack[],
  bundledTracks: LocalMusicTrack[],
): LocalMusicTrack[] =>
  uniqBy([...current, ...bundledTracks], (track) => track.id)

const probeDuration = async (
  track: LocalMusicTrack,
): Promise<number | null> => {
  const probe = document.createElement('audio')
  probe.preload = 'metadata'

  const metadata = new Promise<number>((resolve) => {
    probe.addEventListener(
      'loadedmetadata',
      () =>
        resolve(
          Number.isFinite(probe.duration)
            ? Math.round(probe.duration * 1000)
            : 0,
        ),
      { once: true },
    )
  })
  const failure = new Promise<null>((resolve) => {
    probe.addEventListener('error', () => resolve(null), { once: true })
  })

  probe.src = track.src
  const duration = await Promise.race([metadata, failure])
  probe.removeAttribute('src')
  probe.load()
  return duration
}

export default function MusicView({
  onClosePanel,
  onOpenPanel,
  panels,
}: MusicViewProps) {
  const [playback, dispatchPlayback] = useReducer(
    reducePlayback,
    INITIAL_PLAYBACK,
  )
  const [activePanel, setActivePanel] = useState<WinampPanelId>(
    () => PANEL_IDS.find((panel) => panels[panel]) ?? 'player',
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

  const playerDrag = useDraggablePanel(
    'Audio player',
    panelLayer(activePanel, 'player', 3),
    () => setActivePanel('player'),
  )
  const equalizerDrag = useDraggablePanel(
    'Equalizer',
    panelLayer(activePanel, 'equalizer', 2),
    () => setActivePanel('equalizer'),
  )
  const tracklistDrag = useDraggablePanel(
    'Tracklist',
    panelLayer(activePanel, 'tracklist', 1),
    () => setActivePanel('tracklist'),
  )

  const closePanel = useCallback(
    (panel: WinampPanelId) => {
      onClosePanel(panel)
      const nextActivePanel = PANEL_IDS.find(
        (candidate) => candidate !== panel && panels[candidate],
      )
      if (!nextActivePanel) return
      setActivePanel((current) =>
        current === panel ? nextActivePanel : current,
      )
    },
    [onClosePanel, panels],
  )

  const openPanel = useCallback(
    (panel: WinampPanelId) => {
      setActivePanel(panel)
      onOpenPanel(panel)
    },
    [onOpenPanel],
  )

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

  return (
    <section className={css.winamp} aria-label='Winamp music player'>
      <h2 className={css.srOnly}>Winamp music player</h2>
      <p className={css.srOnly} aria-live='polite'>
        {playback.source === 'soundcloud'
          ? soundCloudError
          : (audio.error ?? bundledPlaylistError)}
      </p>

      {soundCloudRequested ? (
        <>
          <Script
            src={SOUNDCLOUD_WIDGET_SCRIPT}
            strategy='afterInteractive'
            onReady={soundCloud.markApiReady}
            onError={soundCloud.markApiError}
          />
          <iframe
            ref={soundCloud.bindIframe}
            className={css.soundCloudEmbed}
            src={soundCloudEmbedUrl(BONFIRE_PLAYLIST)}
            title='SoundCloud playlist audio engine'
            allow='autoplay; encrypted-media'
            aria-hidden='true'
            tabIndex={-1}
          />
        </>
      ) : null}

      {/* biome-ignore lint/a11y/useMediaCaption: user-selected local audio has no author-provided caption track */}
      <audio
        ref={audio.bindAudio}
        className={css.audioElement}
        preload='metadata'
      />

      <div className={css.stage}>
        {panels.player ? (
          <Player
            canPlay={playerFeed.canPlay}
            dragProps={playerDrag}
            duration={playerFeed.duration}
            equalizerOpen={panels.equalizer}
            isPlaying={playerFeed.isPlaying}
            onClose={() => closePanel('player')}
            onNext={next}
            onOpenEqualizer={() => openPanel('equalizer')}
            onOpenTracklist={() => openPanel('tracklist')}
            onPrevious={previous}
            onSeek={seek}
            onToggle={toggle}
            onVolumeChange={setVolume}
            position={playerFeed.position}
            track={currentTrack}
            tracklistOpen={panels.tracklist}
            volume={volume}
          />
        ) : null}
        {panels.equalizer ? (
          <EqualizerPanel
            balance={balance}
            bands={bands}
            dragProps={equalizerDrag}
            onBalanceChange={setBalance}
            onBandChange={changeBand}
            onClose={() => closePanel('equalizer')}
            processingEnabled={playback.source !== 'soundcloud'}
          />
        ) : null}
        {panels.tracklist ? (
          <Tracklist
            currentIndex={currentIndex}
            dragProps={tracklistDrag}
            onClose={() => closePanel('tracklist')}
            onFiles={addFiles}
            onSelect={selectTrack}
            onSoundCloudPlaylist={loadSoundCloudPlaylist}
            selectedDuration={tracks[selectedIndex]?.duration ?? 0}
            selectedIndex={selectedIndex}
            totalDuration={totalDuration}
            tracks={tracks}
          />
        ) : null}
      </div>
    </section>
  )
}
