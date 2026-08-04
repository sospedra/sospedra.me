'use client'

import Script from 'next/script'
import EqualizerPanel from './equalizer-panel'
import css from './music.module.css'
import Player from './player'
import {
  BONFIRE_PLAYLIST,
  SOUNDCLOUD_WIDGET_SCRIPT,
  soundCloudEmbedUrl,
} from './soundcloud'
import Tracklist from './tracklist'
import type { WinampPanelId, WinampPanelVisibility } from './types'
import { usePanelActivation } from './use-panel-activation'
import { usePlaybackController } from './use-playback-controller'

export type { WinampPanelId, WinampPanelVisibility }

export type MusicViewProps = {
  onClosePanel: (panel: WinampPanelId) => void
  onOpenPanel: (panel: WinampPanelId) => void
  panels: WinampPanelVisibility
}

export default function MusicView({
  onClosePanel,
  onOpenPanel,
  panels,
}: MusicViewProps) {
  const { closePanel, equalizerDrag, openPanel, playerDrag, tracklistDrag } =
    usePanelActivation(panels, onClosePanel, onOpenPanel)
  const {
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
  } = usePlaybackController()

  return (
    <section className={css.winamp} aria-label='Winamp music player'>
      <h2 className={css.srOnly}>Winamp music player</h2>
      <p className={css.srOnly} aria-live='polite'>
        {playbackError ?? trackAnnouncement}
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
