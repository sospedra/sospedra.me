'use client'

import Script from 'next/script'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BUNDLED_PLAYLIST_MANIFEST_URL,
  parseBundledPlaylist,
} from './bundled-playlist'
import { EQ_FREQUENCIES } from './equalizer'
import EqualizerPanel from './equalizer-panel'
import css from './music.module.css'
import Player from './player'
import {
  BONFIRE_PLAYLIST,
  SOUNDCLOUD_WIDGET_SCRIPT,
  type SoundCloudSound,
  soundCloudEmbedUrl,
} from './soundcloud'
import Tracklist from './tracklist'
import type { LocalMusicTrack, MusicTrack, SoundCloudMusicTrack } from './types'
import { useDraggablePanel } from './use-draggable-panel'
import { useLocalAudio } from './use-local-audio'
import { useSoundCloud } from './use-soundcloud'

type ActiveSource = 'local' | 'soundcloud'
export type WinampPanelId = 'equalizer' | 'player' | 'tracklist'
export type WinampPanelVisibility = Record<WinampPanelId, boolean>

export type MusicViewProps = {
  onClosePanel: (panel: WinampPanelId) => void
  onOpenPanel: (panel: WinampPanelId) => void
  panels: WinampPanelVisibility
}

const PANEL_IDS: readonly WinampPanelId[] = ['player', 'equalizer', 'tracklist']

const extensionOf = (fileName: string): string => {
  const extension = fileName.split('.').at(-1)
  return extension && extension !== fileName ? extension.toUpperCase() : 'AUDIO'
}

const trackFromFile = (file: File): LocalMusicTrack => {
  const stem = file.name.replace(/\.[^.]+$/, '')
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

const probeDuration = (track: LocalMusicTrack): Promise<number> =>
  new Promise((resolve) => {
    const probe = document.createElement('audio')
    let finished = false
    const finish = (duration: number) => {
      if (finished) return
      finished = true
      probe.removeAttribute('src')
      probe.load()
      resolve(duration)
    }
    probe.preload = 'metadata'
    probe.addEventListener(
      'loadedmetadata',
      () =>
        finish(
          Number.isFinite(probe.duration)
            ? Math.round(probe.duration * 1000)
            : 0,
        ),
      { once: true },
    )
    probe.addEventListener('error', () => finish(0), { once: true })
    probe.src = track.src
  })

export default function MusicView({
  onClosePanel,
  onOpenPanel,
  panels,
}: MusicViewProps) {
  const [activeSource, setActiveSource] = useState<ActiveSource>('local')
  const [activePanel, setActivePanel] = useState<WinampPanelId>(
    () => PANEL_IDS.find((panel) => panels[panel]) ?? 'player',
  )
  const [balance, setBalance] = useState(0)
  const [bands, setBands] = useState<number[]>(
    Array.from({ length: EQ_FREQUENCIES.length }, () => 0),
  )
  const [currentLocalIndex, setCurrentLocalIndex] = useState(-1)
  const [bundledPlaylistError, setBundledPlaylistError] = useState<
    string | null
  >(null)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [localTracks, setLocalTracks] = useState<LocalMusicTrack[]>([])
  const [soundCloudRequested, setSoundCloudRequested] = useState(false)
  const [volume, setVolume] = useState(0.72)
  const loadedLocalSourceRef = useRef<string | null>(null)
  const objectUrlsRef = useRef(new Set<string>())
  const handledEndedRef = useRef(0)

  const audio = useLocalAudio({
    balance,
    bands,
    enabled: true,
    preamp: 0,
    volume,
  })
  const soundCloud = useSoundCloud(volume)

  const playerDrag = useDraggablePanel(
    'Audio player',
    activePanel === 'player' ? 30 : 3,
    () => setActivePanel('player'),
  )
  const equalizerDrag = useDraggablePanel(
    'Equalizer',
    activePanel === 'equalizer' ? 30 : 2,
    () => setActivePanel('equalizer'),
  )
  const tracklistDrag = useDraggablePanel(
    'Tracklist',
    activePanel === 'tracklist' ? 30 : 1,
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

  const soundCloudTracks = useMemo(
    () =>
      soundCloudRequested ? soundCloud.sounds.map(trackFromSoundCloud) : [],
    [soundCloud.sounds, soundCloudRequested],
  )
  const tracks = useMemo<MusicTrack[]>(
    () => [...soundCloudTracks, ...localTracks],
    [localTracks, soundCloudTracks],
  )
  const soundCloudCurrentTrack =
    soundCloudTracks[soundCloud.currentIndex] ??
    (soundCloud.currentSound
      ? trackFromSoundCloud(soundCloud.currentSound, soundCloud.currentIndex)
      : null)
  const localCurrentTrack = localTracks[currentLocalIndex] ?? null
  const currentTrack =
    activeSource === 'soundcloud' ? soundCloudCurrentTrack : localCurrentTrack
  const currentIndex =
    activeSource === 'soundcloud'
      ? soundCloudTracks[soundCloud.currentIndex]
        ? soundCloud.currentIndex
        : -1
      : localCurrentTrack
        ? soundCloudTracks.length + currentLocalIndex
        : -1
  const selectedIndex = selectedTrackId
    ? tracks.findIndex((track) => track.id === selectedTrackId)
    : -1
  const totalDuration = useMemo(
    () => tracks.reduce((total, track) => total + track.duration, 0),
    [tracks],
  )

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
      setActiveSource('local')
      if (index === currentLocalIndex) {
        await audio.toggle()
        return
      }

      loadLocalTrackSource(track)
      setCurrentLocalIndex(index)
      await audio.play()
    },
    [
      audio.play,
      audio.toggle,
      currentLocalIndex,
      loadLocalTrackSource,
      localTracks,
      soundCloud.pause,
    ],
  )

  const next = useCallback(() => {
    if (activeSource === 'soundcloud') {
      soundCloud.next()
      return
    }
    if (localTracks.length === 0) return
    const nextIndex =
      currentLocalIndex < 0 ? 0 : (currentLocalIndex + 1) % localTracks.length
    void playLocalIndex(nextIndex)
  }, [
    activeSource,
    currentLocalIndex,
    localTracks.length,
    playLocalIndex,
    soundCloud.next,
  ])

  const previous = useCallback(() => {
    if (activeSource === 'soundcloud') {
      soundCloud.previous()
      return
    }
    if (localTracks.length === 0) return
    const previousIndex =
      currentLocalIndex <= 0 ? localTracks.length - 1 : currentLocalIndex - 1
    void playLocalIndex(previousIndex)
  }, [
    activeSource,
    currentLocalIndex,
    localTracks.length,
    playLocalIndex,
    soundCloud.previous,
  ])

  const addFiles = useCallback(
    (files: File[]) => {
      const additions = files.map(trackFromFile)
      if (additions.length === 0) return

      additions.forEach((track) => {
        objectUrlsRef.current.add(track.src)
      })
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
      setActiveSource('local')
      setSelectedTrackId(additions[0].id)
      loadLocalTrackSource(additions[0])
      setCurrentLocalIndex(firstIndex)
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
        setActiveSource('soundcloud')
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
      setActiveSource('soundcloud')
      setSelectedTrackId(null)
      soundCloud.loadSource(source)
    },
    [audio.pause, soundCloud.loadSource, soundCloud.pause],
  )

  const toggle = useCallback(() => {
    if (activeSource === 'soundcloud') {
      soundCloud.toggle()
      return
    }
    void audio.toggle()
  }, [activeSource, audio.toggle, soundCloud.toggle])

  const seek = useCallback(
    (position: number) => {
      if (activeSource === 'soundcloud') {
        soundCloud.seek(position)
        return
      }
      audio.seek(position)
    },
    [activeSource, audio.seek, soundCloud.seek],
  )

  const changeBand = (index: number, value: number) => {
    setBands((current) =>
      current.map((band, bandIndex) => (bandIndex === index ? value : band)),
    )
  }

  useEffect(() => {
    const controller = new AbortController()

    const loadBundledPlaylist = async () => {
      try {
        const response = await fetch(BUNDLED_PLAYLIST_MANIFEST_URL, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(
            `The default playlist could not be loaded (${response.status}).`,
          )
        }

        const bundledTracks = parseBundledPlaylist(await response.json())
        setLocalTracks((current) => {
          const existingIds = new Set(current.map((track) => track.id))
          return [
            ...current,
            ...bundledTracks.filter((track) => !existingIds.has(track.id)),
          ]
        })
        setCurrentLocalIndex((current) => (current < 0 ? 0 : current))
        setSelectedTrackId((current) => current ?? bundledTracks[0]?.id ?? null)
        setBundledPlaylistError(null)
      } catch (error) {
        if (controller.signal.aborted) return
        setBundledPlaylistError(
          error instanceof Error
            ? error.message
            : 'The default playlist could not be loaded.',
        )
      }
    }

    void loadBundledPlaylist()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (
      activeSource !== 'local' ||
      !localCurrentTrack ||
      loadedLocalSourceRef.current === localCurrentTrack.src
    ) {
      return
    }
    loadLocalTrackSource(localCurrentTrack)
  }, [activeSource, loadLocalTrackSource, localCurrentTrack])

  useEffect(() => {
    if (!localCurrentTrack || audio.duration <= 0) return
    setLocalTracks((current) =>
      current.map((track, index) =>
        index === currentLocalIndex &&
        Math.abs(track.duration - audio.duration) > 500
          ? { ...track, duration: audio.duration }
          : track,
      ),
    )
  }, [audio.duration, currentLocalIndex, localCurrentTrack])

  useEffect(() => {
    if (activeSource !== 'local') return
    if (
      audio.endedSequence === 0 ||
      handledEndedRef.current === audio.endedSequence
    ) {
      return
    }
    handledEndedRef.current = audio.endedSequence
    next()
  }, [activeSource, audio.endedSequence, next])

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url)
      })
      objectUrlsRef.current.clear()
    },
    [],
  )

  return (
    <section className={css.winamp} aria-label='Winamp music player'>
      <h2 className={css.srOnly}>Winamp music player</h2>
      <p className={css.srOnly} aria-live='polite'>
        {activeSource === 'soundcloud'
          ? soundCloud.error
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
            canPlay={
              activeSource === 'soundcloud'
                ? soundCloud.isReady && soundCloudCurrentTrack !== null
                : localCurrentTrack !== null
            }
            dragProps={playerDrag}
            duration={
              activeSource === 'soundcloud'
                ? soundCloud.duration
                : audio.duration
            }
            equalizerOpen={panels.equalizer}
            isPlaying={
              activeSource === 'soundcloud'
                ? soundCloud.isPlaying
                : audio.isPlaying
            }
            onClose={() => closePanel('player')}
            onNext={next}
            onOpenEqualizer={() => openPanel('equalizer')}
            onOpenTracklist={() => openPanel('tracklist')}
            onPrevious={previous}
            onSeek={seek}
            onToggle={toggle}
            onVolumeChange={setVolume}
            position={
              activeSource === 'soundcloud'
                ? soundCloud.position
                : audio.position
            }
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
            processingEnabled={activeSource === 'local'}
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
