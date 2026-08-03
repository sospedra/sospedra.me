import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useId,
  useRef,
  useState,
} from 'react'
import { formatTime } from './format'
import css from './music.module.css'
import { normalizeSoundCloudPlaylist } from './soundcloud'
import type { DragPanelProps, MusicTrack } from './types'

type TracklistProps = {
  currentIndex: number
  dragProps: DragPanelProps
  onClose: () => void
  onFiles: (files: File[]) => void
  onSelect: (index: number) => void
  onSoundCloudPlaylist: (source: string) => void
  selectedDuration: number
  selectedIndex: number
  totalDuration: number
  tracks: readonly MusicTrack[]
}

const audioFiles = (files: FileList | File[]): File[] =>
  Array.from(files).filter(
    (file) =>
      file.type.startsWith('audio/') ||
      /\.(aac|flac|m4a|mp3|oga|ogg|opus|wav|webm)$/i.test(file.name),
  )

export default function Tracklist({
  currentIndex,
  dragProps,
  onClose,
  onFiles,
  onSelect,
  onSoundCloudPlaylist,
  selectedDuration,
  selectedIndex,
  totalDuration,
  tracks,
}: TracklistProps) {
  const [draggingFiles, setDraggingFiles] = useState(false)
  const [pickerView, setPickerView] = useState<'choose' | 'soundcloud'>(
    'choose',
  )
  const [playlistDraft, setPlaylistDraft] = useState('')
  const [playlistError, setPlaylistError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const playlistInputRef = useRef<HTMLInputElement>(null)
  const dialogTitleId = useId()
  const playlistHintId = useId()
  const playlistErrorId = useId()

  const acceptFiles = (files: FileList | File[]) => {
    const accepted = audioFiles(files)
    if (accepted.length > 0) onFiles(accepted)
  }

  const changeFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) acceptFiles(event.target.files)
    event.target.value = ''
  }

  const dropFiles = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDraggingFiles(false)
    acceptFiles(event.dataTransfer.files)
  }

  const resetPicker = () => {
    setPickerView('choose')
    setPlaylistDraft('')
    setPlaylistError(null)
  }

  const openSourcePicker = () => {
    resetPicker()
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }

  const chooseLocalFiles = () => {
    dialogRef.current?.close()
    fileInputRef.current?.click()
  }

  const chooseSoundCloudPlaylist = () => {
    setPickerView('soundcloud')
    requestAnimationFrame(() => playlistInputRef.current?.focus())
  }

  const submitSoundCloudPlaylist = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = normalizeSoundCloudPlaylist(playlistDraft)
    if (!result.ok) {
      setPlaylistError(result.reason)
      return
    }
    onSoundCloudPlaylist(result.playlist)
    dialogRef.current?.close()
  }

  return (
    <section
      id='winamp-tracklist-panel'
      className={`${css.panel} ${css.tracklistPanel}`}
      data-calibration-id='P03'
      data-calibration-label='Tracklist panel'
      data-calibration-kind='panel'
      {...dragProps}
    >
      <img
        className={css.skin}
        src='/images/music/tracklist.png'
        width='1608'
        height='978'
        alt=''
        draggable={false}
      />

      <input
        ref={fileInputRef}
        className={css.srOnly}
        type='file'
        accept='audio/*,.flac,.m4a,.mp3,.oga,.ogg,.opus,.wav,.webm'
        multiple
        onChange={changeFiles}
      />
      <button
        type='button'
        className={css.addFilesHotspot}
        data-calibration-id='H20'
        data-calibration-label='Add files'
        data-calibration-kind='control'
        aria-haspopup='dialog'
        aria-label='Add local files or a SoundCloud playlist'
        onClick={openSourcePicker}
      />

      <dialog
        ref={dialogRef}
        className={css.sourceDialog}
        data-no-drag
        aria-labelledby={dialogTitleId}
        onClose={resetPicker}
      >
        <h2 id={dialogTitleId}>Add music</h2>
        {pickerView === 'choose' ? (
          <div className={css.sourceDialogActions}>
            <button type='button' onClick={chooseLocalFiles}>
              Local files
            </button>
            <button type='button' onClick={chooseSoundCloudPlaylist}>
              SoundCloud playlist
            </button>
            <button type='button' onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
          </div>
        ) : (
          <form noValidate onSubmit={submitSoundCloudPlaylist}>
            <label htmlFor='music-soundcloud-playlist'>
              SoundCloud playlist link
            </label>
            <input
              ref={playlistInputRef}
              id='music-soundcloud-playlist'
              type='text'
              inputMode='url'
              autoComplete='url'
              required
              spellCheck={false}
              value={playlistDraft}
              aria-invalid={playlistError ? true : undefined}
              aria-describedby={`${playlistHintId}${playlistError ? ` ${playlistErrorId}` : ''}`}
              onChange={(event) => {
                setPlaylistDraft(event.target.value)
                setPlaylistError(null)
              }}
            />
            <p id={playlistHintId}>Public SoundCloud playlist or embed link.</p>
            {playlistError ? (
              <p id={playlistErrorId} role='alert'>
                {playlistError}
              </p>
            ) : null}
            <div className={css.sourceDialogActions}>
              <button type='submit'>Load playlist</button>
              <button type='button' onClick={() => setPickerView('choose')}>
                Back
              </button>
              <button type='button' onClick={() => dialogRef.current?.close()}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </dialog>

      <section
        className={css.trackViewport}
        data-calibration-id='H21'
        data-calibration-label='Track viewport'
        data-calibration-kind='control'
        data-file-drag={draggingFiles}
        data-no-drag
        aria-label='Audio file drop zone'
        onDragEnter={(event) => {
          event.preventDefault()
          setDraggingFiles(true)
        }}
        onDragLeave={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setDraggingFiles(false)
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={dropFiles}
      >
        {tracks.length > 0 ? (
          <ol className={css.trackRows} aria-label='Audio tracklist'>
            {tracks.map((track, index) => (
              <li key={track.id}>
                <button
                  type='button'
                  className={css.trackRow}
                  data-calibration-id={`T${String(index + 1).padStart(2, '0')}`}
                  data-calibration-label={`Track ${index + 1}`}
                  data-calibration-kind='track'
                  data-active={index === currentIndex}
                  data-selected={index === selectedIndex}
                  aria-current={index === currentIndex ? 'true' : undefined}
                  aria-pressed={index === selectedIndex}
                  onClick={() => onSelect(index)}
                >
                  <span>{track.title}</span>
                  <span>{track.artist}</span>
                  <span>{track.album}</span>
                  <span>{track.type}</span>
                  <time>{formatTime(track.duration)}</time>
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <output className={css.selectedTime}>
        Selected: {formatTime(selectedDuration)}
      </output>
      <output className={css.totalTime}>
        Total Time: {formatTime(totalDuration)}
      </output>

      <button
        type='button'
        className={`${css.hotspot} ${css.tracklistCloseHotspot}`}
        data-calibration-id='H24'
        data-calibration-label='Close tracklist'
        data-calibration-kind='control'
        aria-label='Close tracklist'
        onClick={onClose}
      />
    </section>
  )
}
