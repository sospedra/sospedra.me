import { coverUrl } from './blob-assets'
import css from './boombox.module.css'
import type { BoomboxState, Song } from './engine'

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
  if (stage !== 'play') return css.coverClear
  if (limit >= 11) return css.coverSoft
  if (limit >= 7) return css.coverMid
  return css.coverHeavy
}

const Hub = () => (
  <span className={css.hub}>
    <span className={css.teethBox}>
      <span className={css.teeth} />
      <span className={css.teeth} />
      <span className={css.teeth} />
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
      className={css.cassette}
      data-rolling={props.isPlaying}
      style={{ '--wound': props.wound } as React.CSSProperties}
    >
      <div className={css.shell}>
        {SHELL_SCREWS.map((corner) => (
          <span key={corner} className={css.tapeScrew} data-corner={corner}>
            <span className={css.tapeScrewSlot} />
          </span>
        ))}

        <div className={css.stickerOuter}>
          <div className={css.sticker}>
            <span className={css.aSide}>a</span>
            <div className={css.stickerScript}>
              <span
                className={css.scriptTitle}
                data-masked={!revealed}
                aria-hidden={!revealed}
              >
                {revealed ? props.daily.title : masked.title}
              </span>
              <span
                className={css.scriptArtist}
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
              className={`${css.albumSticker} ${coverBlurClass(props.limit, props.stage)}`}
              alt=''
              draggable={false}
            />
            <span className={css.stickerStripe} />
            <span className={css.chipTape}>bub-90</span>
            <span className={css.chipLogo}>saiwa®</span>
            <div className={css.hubBand}>
              <Hub />
              <div className={css.tapeWindow}>
                <span className={css.reelSupply} />
                <span className={css.reelTakeup} />
              </div>
              <Hub />
            </div>
          </div>
        </div>

        <div className={css.shellBottom}>
          <span className={css.tapeScrew} data-corner='c'>
            <span className={css.tapeScrewSlot} />
          </span>
          <span className={css.bottomShadow}>
            <span className={`${css.bottomHoles} ${css.holesA}`} />
            <span className={`${css.bottomHoles} ${css.holesB}`} />
            <span className={`${css.bottomHoles} ${css.holesC}`} />
          </span>
          <span className={`${css.shellHole} ${css.holeLeft}`} />
          <span className={`${css.shellHole} ${css.holeRight}`} />
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
