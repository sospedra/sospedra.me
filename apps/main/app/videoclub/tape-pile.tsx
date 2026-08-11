import cn from 'clsx'
import type { CSSProperties, Ref, RefObject } from 'react'
import { tapHaptic } from 'services/haptics'
import css from './tape-pile.module.css'
import { TAPES, type Tape } from './tapes'
import { TapesHint } from './tapes-hint'
import type { TvState } from './tv-machine'

const DRIFT = ['-0.4rem', '0.7rem', '-0.15rem', '0.9rem', '0.25rem']
const TIP = ['-0.5deg', '0.4deg', '-0.2deg', '0.6deg', '-0.35deg']
// marker pens matching the washi note palette, one per tape name
const INKS = ['#0f6159', '#8a6c14', '#a02368', '#503098', '#9c4a1d']

export const pileStyle = (index: number): CSSProperties =>
  ({
    '--drift': DRIFT[index % DRIFT.length],
    '--tip': TIP[index % TIP.length],
    '--ink': INKS[index % INKS.length],
  }) as CSSProperties

function SpineBar(props: { index: number; tape: Tape }) {
  return (
    <>
      <i className={css.notch} aria-hidden='true' />
      <span className={css.vhsLabel} aria-hidden='true'>
        <b className={css.vhsCode}>
          [{String(props.index + 1).padStart(2, '0')}]
        </b>
        <span className={css.vhsTitle}>
          <span className={css.vhsName}>{props.tape.title}</span>
          <small>{props.tape.venue}</small>
        </span>
        <b className={css.vhsTag}>[{props.tape.lang}]</b>
      </span>
    </>
  )
}

type TapePileProps = {
  spineFocusRef: RefObject<number | null>
  stackRefs: RefObject<(HTMLButtonElement | null)[]>
  state: TvState
  insertTape: (index: number) => void
}

export function TapePile({
  spineFocusRef,
  stackRefs,
  state,
  insertTape,
}: TapePileProps) {
  return (
    <section id='tape-pile' className={css.stack} aria-label='Tape pile'>
      <TapesHint variant='shelf' />
      <ul className={css.pile}>
        {TAPES.map((item, index) => {
          const pile = pileStyle(index)
          if (index === state.tape) {
            return (
              <li key={item.id}>
                <span className={css.bay} style={pile}>
                  IN DECK
                </span>
              </li>
            )
          }
          return (
            <li key={item.id}>
              <button
                ref={(element) => {
                  stackRefs.current[index] = element
                }}
                type='button'
                className={css.vhs}
                style={pile}
                disabled={state.status === 'inserting'}
                onClick={() => {
                  spineFocusRef.current = index
                  tapHaptic()
                  insertTape(index)
                }}
                aria-label={`Insert ${item.title}, ${item.venue}`}
              >
                <SpineBar index={index} tape={item} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

type TapeGhostProps = {
  incoming: number
  ref: Ref<HTMLDivElement>
}

export function TapeGhost({ incoming, ref }: TapeGhostProps) {
  return (
    <div
      ref={ref}
      className={cn(css.vhs, css.ghost)}
      style={pileStyle(incoming)}
      aria-hidden='true'
    >
      <SpineBar index={incoming} tape={TAPES[incoming]} />
    </div>
  )
}
