import { type BoomboxState, FULL_UNLOCK, UNLOCKS } from './engine'
import css from './lever-bank.module.css'

export const skipSecondsGain = (state: BoomboxState) => {
  const current = UNLOCKS[state.guesses.length] ?? FULL_UNLOCK
  const next = UNLOCKS[state.guesses.length + 1]
  return next === undefined ? 0 : next - current
}

type TransportKeyName = 'play' | 'stop' | 'rew' | 'skip' | 'share'

export const DECK_KEY_ORDER = ['play', 'stop', 'rew', 'skip', 'share'] as const
export const TAD_KEY_ORDER = ['rew', 'play', 'skip', 'stop', 'share'] as const

type TransportProps = {
  canRewind: boolean
  copied: boolean
  playing: boolean
  soundReady: boolean
  soundPlaying: boolean
  skipGain: number
  onPlay: () => void
  onStop: () => void
  onRewind: () => void
  onSkip: () => void
  onShare: () => void
  order: readonly TransportKeyName[]
  size: 'deck' | 'tad'
}

type LeverSpec = {
  glyph: string
  word: string
  on?: boolean
  red?: boolean
  pressed?: boolean
  disabled?: boolean
  ariaLabel: string
  onPress: () => void
}

/* latching lever keys: legends silkscreened on the fascia, blank caps
   slide under the slot mouth. latched keys stay down; both decks share it */
const LeverBank = (props: { size: 'deck' | 'tad'; keys: LeverSpec[] }) => (
  <div className={css.leverBank} data-size={props.size}>
    <div className={css.leverLegend} aria-hidden>
      {props.keys.map((key) => (
        <span key={key.ariaLabel} className={css.legendCell}>
          <b>{key.word}</b>
          {key.red ? <i data-dot='true' /> : <i>{key.glyph}</i>}
        </span>
      ))}
    </div>
    <div className={css.leverSlot}>
      {props.keys.map((key) => (
        <button
          key={key.ariaLabel}
          type='button'
          className={css.leverKey}
          data-on={key.on}
          aria-label={key.ariaLabel}
          aria-pressed={key.pressed}
          onClick={key.onPress}
          disabled={key.disabled}
        >
          <span className={css.leverCap} aria-hidden />
        </button>
      ))}
    </div>
  </div>
)

export const Transport = (props: TransportProps) => {
  const keys = {
    play: {
      glyph: '▶',
      word: 'play',
      on: props.soundPlaying,
      pressed: props.soundPlaying,
      ariaLabel: 'Play',
      onPress: props.onPlay,
      disabled: !props.soundReady,
    },
    stop: {
      glyph: '◼',
      word: 'stop',
      ariaLabel: 'Stop',
      onPress: props.onStop,
    },
    rew: {
      glyph: '◀◀',
      word: 'rew',
      ariaLabel: 'Rewind to the previous waypoint',
      onPress: props.onRewind,
      disabled: !props.canRewind,
    },
    skip: {
      glyph: '▶▶',
      word: props.skipGain > 0 ? `skip +${props.skipGain}s` : 'skip',
      ariaLabel: 'Skip attempt',
      onPress: props.onSkip,
      disabled: !props.playing,
    },
    share: {
      glyph: '●',
      word: props.copied ? 'copied.' : 'rec·share',
      on: props.copied,
      red: true,
      ariaLabel: 'Share result',
      onPress: props.onShare,
      disabled: props.playing,
    },
  } satisfies Record<TransportKeyName, LeverSpec>

  return (
    <LeverBank size={props.size} keys={props.order.map((name) => keys[name])} />
  )
}
