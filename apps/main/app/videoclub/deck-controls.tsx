import cn from 'clsx'
import type { Ref } from 'react'
import css from './deck-controls.module.css'
import type { TvState } from './tv-machine'

export const SEEK_STEP = 15
export const VOLUME_STEP = 0.1

function DeckKey(props: {
  glyph: string
  hint: string
  onPress: () => void
  kind?: 'transport' | 'volume'
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <span className={css.keyWrap} data-kind={props.kind ?? 'transport'}>
      <button
        ref={props.ref}
        type='button'
        className={css.key}
        onClick={props.onPress}
        aria-label={props.hint}
      >
        <span aria-hidden='true'>{props.glyph}</span>
      </button>
      <small aria-hidden='true'>{props.hint}</small>
    </span>
  )
}

type DeckControlsProps = {
  lit: boolean
  playKeyRef: Ref<HTMLButtonElement>
  powered: boolean
  state: TvState
  nudgeVolume: (step: number) => void
  power: () => void
  seek: (step: number) => void
  toggle: () => void
}

export function DeckControls({
  lit,
  playKeyRef,
  powered,
  state,
  nudgeVolume,
  power,
  seek,
  toggle,
}: DeckControlsProps) {
  return (
    <fieldset className={css.controls}>
      <legend className='sr-only'>Television and tape controls</legend>
      <p className={css.controlHeader} aria-hidden='true'>
        <span>FRONT AV / COMBO DECK</span>
        <b>STEREO</b>
      </p>

      <div className={css.avInputs} aria-hidden='true'>
        <span>
          <i data-signal='video' />
          VIDEO
        </span>
        <span>
          <i data-signal='audio' />
          AUDIO
        </span>
        <span>
          <i data-signal='phones' />
          PHONES
        </span>
      </div>

      <span className={css.keyWrap} data-kind='power'>
        <button
          type='button'
          className={cn(css.key, css.powerKey)}
          onClick={power}
          aria-pressed={powered}
          aria-label='Power'
        >
          <span aria-hidden='true'>⏻</span>
        </button>
        <small aria-hidden='true'>POWER</small>
        <i className={css.led} data-on={lit} aria-hidden='true' />
      </span>

      <fieldset className={css.transport}>
        <legend className='sr-only'>Tape transport</legend>
        <DeckKey glyph='◁◁' hint='REW' onPress={() => seek(-SEEK_STEP)} />
        <DeckKey
          ref={playKeyRef}
          glyph={state.status === 'playing' ? '❚❚' : '▷'}
          hint={state.status === 'playing' ? 'PAUSE' : 'PLAY'}
          onPress={toggle}
        />
        <DeckKey glyph='▷▷' hint='FF' onPress={() => seek(SEEK_STEP)} />
      </fieldset>

      <fieldset className={css.volumeKeys}>
        <legend className='sr-only'>Volume controls</legend>
        <DeckKey
          glyph='−'
          hint='VOL −'
          kind='volume'
          onPress={() => nudgeVolume(-VOLUME_STEP)}
        />
        <DeckKey
          glyph='+'
          hint='VOL +'
          kind='volume'
          onPress={() => nudgeVolume(VOLUME_STEP)}
        />
      </fieldset>
    </fieldset>
  )
}
