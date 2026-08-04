import { coverUrl } from './blob-assets'
import css from './cassette-bay.module.css'
import mold from './cassette-shell.module.css'
import label from './cassette-sticker.module.css'
import type { BoomboxState, Song } from './engine'
import spool from './tape-reels.module.css'

const SHELL_SCREWS = ['tl', 'tr', 'bl', 'br']

const CHARS = 'aabccddeefghiijklmnnoopqrssttuuvwxyz'
/* deterministic index-hash: every render and hydration agrees on the mask */
const scribble = (text: string) =>
  [...text]
    .map((char, index) =>
      char === ' '
        ? ' '
        : CHARS.charAt(
            ((char.codePointAt(0) ?? 0) + index * 31) % CHARS.length,
          ),
    )
    .join('')

const coverBlurClass = (limit: number, stage: BoomboxState['stage']) => {
  if (stage !== 'play') return label.coverClear
  if (limit >= 11) return label.coverSoft
  if (limit >= 7) return label.coverMid
  return label.coverHeavy
}

const Hub = () => (
  <span className={spool.hub}>
    <span className={spool.teethBox}>
      <span className={spool.teeth} />
      <span className={spool.teeth} />
      <span className={spool.teeth} />
    </span>
  </span>
)

export const Cassette = (props: {
  daily: Song
  isPlaying: boolean
  limit: number
  stage: BoomboxState['stage']
  wound: number
}) => {
  const masked = {
    artist: scribble(props.daily.artist),
    title: scribble(props.daily.title),
  }
  const revealed = props.stage !== 'play'

  return (
    <div
      className={`${mold.cassette} ${css.cassette} ${spool.cassette}`}
      data-rolling={props.isPlaying}
      style={{ '--wound': props.wound } as React.CSSProperties}
    >
      <div className={mold.shell}>
        {SHELL_SCREWS.map((corner) => (
          <span key={corner} className={mold.tapeScrew} data-corner={corner}>
            <span className={mold.tapeScrewSlot} />
          </span>
        ))}

        <div className={label.stickerOuter}>
          <div className={label.sticker}>
            <span className={label.aSide}>a</span>
            <div className={label.stickerScript}>
              <span
                className={label.scriptTitle}
                data-masked={!revealed}
                aria-hidden={!revealed}
              >
                {revealed ? props.daily.title : masked.title}
              </span>
              <span
                className={label.scriptArtist}
                data-masked={!revealed}
                aria-hidden={!revealed}
              >
                {revealed ? props.daily.artist : masked.artist}
              </span>
              {!revealed && (
                <span className='sr-only'>Answer hidden until solved</span>
              )}
            </div>
            {/* the cover is the answer; alt text would spoil it */}
            <img
              src={coverUrl(props.daily.id)}
              className={`${label.albumSticker} ${coverBlurClass(props.limit, props.stage)}`}
              alt=''
              draggable={false}
            />
            <span className={label.stickerStripe} />
            <span className={label.chipTape}>bub-90</span>
            <span className={label.chipLogo}>saiwa®</span>
            <div className={spool.hubBand}>
              <Hub />
              <div className={spool.tapeWindow}>
                <span className={spool.reelSupply} />
                <span className={spool.reelTakeup} />
              </div>
              <Hub />
            </div>
          </div>
        </div>

        <div className={mold.shellBottom}>
          <span className={mold.tapeScrew} data-corner='c'>
            <span className={mold.tapeScrewSlot} />
          </span>
          <span className={mold.bottomShadow}>
            <span className={`${mold.bottomHoles} ${mold.holesA}`} />
            <span className={`${mold.bottomHoles} ${mold.holesB}`} />
            <span className={`${mold.bottomHoles} ${mold.holesC}`} />
          </span>
          <span className={`${mold.shellHole} ${mold.holeLeft}`} />
          <span className={`${mold.shellHole} ${mold.holeRight}`} />
        </div>
      </div>
    </div>
  )
}

export const CassettePane = (props: {
  daily: Song
  doorOpen: boolean
  isPlaying: boolean
  limit: number
  stage: BoomboxState['stage']
  tapeExpired: boolean
  wound: number
  onLoadNewTape: () => void
}) => (
  <div className={css.pane} data-open={props.doorOpen}>
    <div className={css.doorCase}>
      <div className={css.caseTopLabel}>boombox mixtape player</div>
      <div className={css.caseBottomLabel}>auto reverse</div>
    </div>
    <Cassette
      daily={props.daily}
      isPlaying={props.isPlaying}
      limit={props.limit}
      stage={props.stage}
      wound={props.wound}
    />
    {props.tapeExpired && (
      <button
        type='button'
        className={css.newTapeSlip}
        onClick={props.onLoadNewTape}
      >
        ● new tape ready · press to load
      </button>
    )}
  </div>
)
