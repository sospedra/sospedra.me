import type { Ref } from 'react'
import css from './tape-deck.module.css'
import type { Tape } from './tapes'
import type { TvState } from './tv-machine'

type TapeDeckProps = {
  activeTape: Tape
  slotRef: Ref<HTMLDivElement>
  state: TvState
}

export function TapeDeck({ activeTape, slotRef, state }: TapeDeckProps) {
  return (
    <div className={css.deck}>
      <div
        ref={slotRef}
        className={css.slot}
        data-open={state.status === 'inserting'}
        aria-busy={state.status === 'inserting'}
      >
        <i className={css.flap} aria-hidden='true' />
        <span className={css.sticker}>
          {activeTape.title} · {activeTape.venue} · {activeTape.lang}
        </span>
      </div>
      <div className={css.grille} aria-hidden='true' />
      <p className={css.brand}>
        <b>VHS HQ</b>
        <span>QUICK START · DIGITAL AUTO TRACKING</span>
        <b>2 HEAD</b>
      </p>
    </div>
  )
}
