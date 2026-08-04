import cn from 'clsx'
import type { CSSProperties, Ref, RefObject } from 'react'
import css from './tape-pile.module.css'
import { TAPES, type Tape } from './tapes'
import type { TvState } from './tv-machine'

const DRIFT = ['-0.4rem', '0.7rem', '-0.15rem', '0.9rem', '0.25rem']
const TIP = ['-0.5deg', '0.4deg', '-0.2deg', '0.6deg', '-0.35deg']

export const pileStyle = (index: number): CSSProperties =>
  ({
    '--drift': DRIFT[index % DRIFT.length],
    '--tip': TIP[index % TIP.length],
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
  lit: boolean
  spineFocusRef: RefObject<number | null>
  stackRefs: RefObject<(HTMLButtonElement | null)[]>
  state: TvState
  insertTape: (index: number) => void
}

export function TapePile({
  lit,
  spineFocusRef,
  stackRefs,
  state,
  insertTape,
}: TapePileProps) {
  return (
    <section className={css.stack} aria-label='Tape pile'>
      <span className={css.onAir} data-live={lit} aria-hidden='true'>
        ON AIR
      </span>
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
