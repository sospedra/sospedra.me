'use client'

import cn from 'clsx'
import type React from 'react'
import { useMemo, useReducer, useSyncExternalStore } from 'react'
import { cssVars } from 'services/css-vars'
import External from 'services/external'
import { sceneTrap, type Trap, useHotkeys } from 'services/hotkeys'
import Link from 'services/link'
import Shell from 'services/shell'
import { soundPreference } from '../bazaar/sounds'
import caseCss from './case.module.css'
import discCss from './disc.module.css'
import { DiscArt } from './disc-faces'
import { DISCS, type Disc } from './discs'
import css from './scavenger.module.css'
import {
  closedPageTransform,
  heldDisc,
  INITIAL_STATE,
  MAX_SPREAD,
  PAGE_COUNT,
  type PagePose,
  pageTransform,
  reduce,
  SPREAD_COUNT,
  spreadDiscs,
  spreadLabel,
  type WalletState,
} from './wallet'
import {
  CARD_ID,
  dragFlipJustEnded,
  useBootSequence,
  useCloseNavigation,
  useDragGestures,
  usePointerFallback,
  useWalletActions,
  useWalletTimers,
  type WalletActions,
} from './wallet-input'
import { walletSfx } from './wallet-sfx'

const soundOff = () => false

type DiscMotion = 'in' | 'ejecting' | 'ghost' | 'inserting'

const discMotion = (state: WalletState, disc: number): DiscMotion => {
  if (heldDisc(state) !== disc) return 'in'
  if (state.phase === 'eject') return 'ejecting'
  if (state.phase === 'insert') return 'inserting'
  return 'ghost'
}

const announcementFor = (state: WalletState): string => {
  if (state.phase === 'boot' || state.phase === 'opening') return ''
  if (state.phase === 'closing') return 'Wallet zipped shut. Going back.'
  if (state.phase === 'out') {
    const record = DISCS[state.disc]
    return record ? `${record.title}. ${record.oneLiner}` : ''
  }
  if (heldDisc(state) !== null) return ''
  const titles = spreadDiscs(state.spread)
    .map((disc) => DISCS[disc]?.title)
    .filter(Boolean)
  return `Spread ${state.spread + 1} of ${SPREAD_COUNT}: ${titles.join(', ')}`
}

type SleeveProps = {
  disc: Disc | undefined
  index: number
  side: 'a' | 'b'
  active: boolean
  motion: DiscMotion
  onToggle: (disc: number) => void
  registerButton: (disc: number, node: HTMLButtonElement | null) => void
}

function Sleeve({
  disc,
  index,
  side,
  active,
  motion,
  onToggle,
  registerButton,
}: SleeveProps) {
  const num = String(index + 1).padStart(2, '0')
  return (
    <div className={cn(css.face, side === 'b' && css.faceB)} inert={!active}>
      {disc ? (
        <button
          type='button'
          ref={(node) => registerButton(index, node)}
          className={discCss.hit}
          style={cssVars({ '--h': disc.hue })}
          data-state={motion}
          aria-expanded={motion === 'ghost'}
          aria-controls={motion === 'ghost' ? CARD_ID : undefined}
          aria-label={disc.title}
          onClick={() => onToggle(index)}
        >
          <span className={discCss.lift}>
            <DiscArt disc={disc} />
          </span>
        </button>
      ) : null}
      <span className={discCss.pocket} aria-hidden='true' />
      <span className={css.tag} aria-hidden='true'>
        {disc ? `${num} · ${disc.id}` : `${num} · open slot`}
      </span>
    </div>
  )
}

function Floater({ state }: { state: WalletState }) {
  if (state.phase !== 'out' && state.phase !== 'return') return null
  const disc = DISCS[state.disc]
  if (!disc) return null
  const style = cssVars({
    '--h': disc.hue,
    '--dx': `${state.from?.dx ?? 0}px`,
    '--dy': `${state.from?.dy ?? 0}px`,
    '--size': `${state.from?.size ?? 300}px`,
  })
  return (
    <div
      className={discCss.floater}
      data-motion={state.phase === 'out' ? 'out' : 'back'}
      style={style}
      aria-hidden='true'
    >
      <span className={discCss.bob}>
        <span className={discCss.persp}>
          <DiscArt disc={disc} />
        </span>
      </span>
    </div>
  )
}

type WalletDerived = {
  held: number | null
  record: Disc | undefined
  onSpread: number[]
}

const deriveWallet = (state: WalletState): WalletDerived => {
  return {
    held: heldDisc(state),
    record: state.phase === 'out' ? DISCS[state.disc] : undefined,
    onSpread: 'spread' in state ? spreadDiscs(state.spread) : [],
  }
}

const pagePose = (state: WalletState, page: number): PagePose => {
  if (state.phase === 'boot') return closedPageTransform(page)
  if (state.phase === 'closing') return closedPageTransform(page)
  if (state.phase === 'opening') return pageTransform(page, 0)
  return pageTransform(page, state.spread)
}

const pageStyle = (state: WalletState, page: number): React.CSSProperties => {
  const pose = pagePose(state, page)
  return cssVars({
    '--i': page,
    '--ry': `${pose.ry}deg`,
    '--z': `${pose.z}px`,
  })
}

function NavArrows({
  state,
  actions,
}: {
  state: WalletState
  actions: WalletActions
}) {
  const spread = state.phase === 'browse' ? state.spread : null
  const arrowFlip = (direction: 1 | -1) => {
    if (dragFlipJustEnded()) return
    actions.flip(direction)
  }
  return (
    <>
      <button
        type='button'
        ref={actions.prevButton}
        className={css.navArrow}
        data-side='prev'
        aria-label='previous spread'
        aria-disabled={spread === null || spread === 0}
        onClick={() => arrowFlip(-1)}
      >
        ‹
      </button>
      <button
        type='button'
        ref={actions.nextButton}
        className={css.navArrow}
        data-side='next'
        aria-label='next spread'
        aria-disabled={spread === null || spread === MAX_SPREAD}
        onClick={() => arrowFlip(1)}
      >
        ›
      </button>
    </>
  )
}

export default function ScavengerView() {
  const [state, dispatch] = useReducer(reduce, INITIAL_STATE)
  useBootSequence(state, dispatch)
  const sound = useSyncExternalStore(
    soundPreference.subscribe,
    soundPreference.isEnabled,
    soundOff,
  )
  const actions = useWalletActions(state, dispatch)
  const { flip, putBack, toggleDisc, closeWallet, registerButton } = actions
  usePointerFallback(state, actions)
  useWalletTimers(state, actions, dispatch)
  useCloseNavigation(state)
  useDragGestures(flip)

  const traps = useMemo<Trap[]>(
    () => [
      ['ArrowLeft', sceneTrap(() => flip(-1))],
      ['ArrowRight', sceneTrap(() => flip(1))],
      ['Escape', () => putBack()],
    ],
    [flip, putBack],
  )
  useHotkeys(traps)

  const toggleSound = () => {
    const next = !sound
    soundPreference.setEnabled(next)
    if (next) walletSfx.flip()
  }

  const { held, record, onSpread } = deriveWallet(state)
  const faceActive = (disc: number) =>
    onSpread.includes(disc) && (held === null || held === disc)

  return (
    <Shell>
      <div
        className={css.scene}
        data-out={held === null ? undefined : 'true'}
        data-boot={state.phase === 'boot' ? 'true' : undefined}
        data-opening={state.phase === 'opening' ? 'true' : undefined}
        data-closing={state.phase === 'closing' ? 'true' : undefined}
      >
        <h1 className='sr-only'>Side projects</h1>
        <div className={css.wallet} style={cssVars({ '--pages': PAGE_COUNT })}>
          <div className={caseCss.ground} />
          <div className={cn(caseCss.half, caseCss.halfLeft)}>
            <div className={cn(caseCss.pad, caseCss.padLeft)} />
          </div>
          <div className={cn(caseCss.half, caseCss.halfRight)}>
            <div className={cn(caseCss.pad, caseCss.padRight)} />
          </div>
          <div className={caseCss.spine} />
          <button
            type='button'
            ref={actions.zipButton}
            className={caseCss.zipPull}
            aria-label='zip the wallet shut and go back'
            onClick={closeWallet}
          />
          {Array.from({ length: PAGE_COUNT }, (_, page) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: sleeves are positional, the wallet never reorders
            <div key={page} className={css.page} style={pageStyle(state, page)}>
              <Sleeve
                disc={DISCS[page * 2]}
                index={page * 2}
                side='a'
                active={faceActive(page * 2)}
                motion={discMotion(state, page * 2)}
                onToggle={toggleDisc}
                registerButton={registerButton}
              />
              <Sleeve
                disc={DISCS[page * 2 + 1]}
                index={page * 2 + 1}
                side='b'
                active={faceActive(page * 2 + 1)}
                motion={discMotion(state, page * 2 + 1)}
                onToggle={toggleDisc}
                registerButton={registerButton}
              />
            </div>
          ))}
        </div>
        <Floater state={state} />
        <NavArrows state={state} actions={actions} />
        {record ? (
          <aside id={CARD_ID} className={css.card}>
            <h2 className={css.cardTitle}>{record.title}</h2>
            <p className={css.cardLine}>{record.oneLiner}</p>
            <p
              className={css.cardLiner}
            >{`pressed ${record.pressed} · ${record.stack}`}</p>
            {record.status === 'pressed' ? (
              <External href={record.url} className={css.cardLink}>
                play it
              </External>
            ) : (
              <span className={css.cardStamp}>test pressing</span>
            )}
          </aside>
        ) : null}
        <p className={css.counter} aria-hidden='true'>
          {spreadLabel('spread' in state ? state.spread : 0)}
        </p>
        <footer className={css.hud}>
          <Link url='/' className={css.hudLink}>
            home
          </Link>
          <span className={css.hint}>
            <b>scroll</b> flip pages
          </span>
          <span className={css.hint}>
            <b>click</b> pull a disc
          </span>
          <span className={css.hint}>
            <b>esc</b> put it back
          </span>
          <button
            type='button'
            className={css.hudButton}
            aria-pressed={sound}
            onClick={toggleSound}
          >
            sound <span aria-hidden='true'>{sound ? 'on' : 'off'}</span>
          </button>
        </footer>
        <p className='sr-only' role='status'>
          {announcementFor(state)}
        </p>
        <div className={css.veil} aria-hidden='true' />
      </div>
    </Shell>
  )
}
