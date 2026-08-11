'use client'

import type React from 'react'
import { useRef, useState } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import {
  SLAP_POOL,
  STICKER_FACE,
  STICKER_LABEL,
  type StickerKind,
} from './sticker-art'
import css from './stickers.module.css'

type Spot = {
  kind: StickerKind
  x: number
  y: number
  r: number
  s: number
  fresh?: boolean
}
type Placement = { dx: number; dy: number; z: number }
type DragState = {
  id: string
  startX: number
  startY: number
  baseX: number
  baseY: number
}

const BOARD: Record<string, Spot> = {
  wordmark: { kind: 'wordmark', x: 50, y: 38, r: -4, s: 1 },
  stack: { kind: 'stack', x: 15, y: 22, r: -8, s: 1 },
  block: { kind: 'block', x: 84, y: 24, r: 6, s: 1 },
  cloud: { kind: 'cloud', x: 82, y: 66, r: -5, s: 1 },
  barcode: { kind: 'barcode', x: 20, y: 82, r: 3, s: 1 },
  smiley: { kind: 'smiley', x: 8, y: 55, r: 12, s: 1 },
  bolt: { kind: 'bolt', x: 68, y: 12, r: -14, s: 1 },
  flower: { kind: 'flower', x: 34, y: 12, r: 9, s: 0.9 },
  eye: { kind: 'eye', x: 62, y: 84, r: -7, s: 1 },
  cherry: { kind: 'cherry', x: 41, y: 78, r: -12, s: 1 },
  burst: { kind: 'burst', x: 92, y: 45, r: 10, s: 1 },
  ok: { kind: 'ok', x: 28, y: 60, r: 15, s: 0.85 },
}

const SPAWN_CAP = 22

const rand = (min: number, max: number) => min + Math.random() * (max - min)

const randomSpot = (kind: StickerKind): Spot => ({
  kind,
  x: rand(16, 78),
  y: rand(14, 74),
  r: rand(-17, 17),
  s: rand(0.75, 1.15),
  fresh: true,
})

const trimOldest = (spawned: Record<string, Spot>) => {
  const entries = Object.entries(spawned)
  if (entries.length < SPAWN_CAP) return spawned
  return Object.fromEntries(entries.slice(entries.length - SPAWN_CAP + 1))
}

type StickersViewProps = { fontVars: string }

const StickersView = ({ fontVars }: StickersViewProps) => {
  const [spawned, setSpawned] = useState<Record<string, Spot>>({})
  const [placements, setPlacements] = useState<Record<string, Placement>>({})
  const drag = useRef<DragState | null>(null)
  const zTop = useRef(20)
  const spawnCount = useRef(0)

  const stickers = { ...BOARD, ...spawned }

  const grab = (event: React.PointerEvent<HTMLDivElement>) => {
    const id = event.currentTarget.dataset.id
    if (!id) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const base = placements[id]
    zTop.current += 1
    drag.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      baseX: base?.dx ?? 0,
      baseY: base?.dy ?? 0,
    }
    setPlacements((prev) => ({
      ...prev,
      [id]: { dx: base?.dx ?? 0, dy: base?.dy ?? 0, z: zTop.current },
    }))
  }

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.id !== event.currentTarget.dataset.id) return
    const el = event.currentTarget
    el.style.setProperty(
      '--dx',
      `${state.baseX + event.clientX - state.startX}px`,
    )
    el.style.setProperty(
      '--dy',
      `${state.baseY + event.clientY - state.startY}px`,
    )
    el.dataset.dragging = 'true'
  }

  const drop = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.id !== event.currentTarget.dataset.id) return
    drag.current = null
    event.currentTarget.dataset.dragging = 'false'
    const dx = state.baseX + event.clientX - state.startX
    const dy = state.baseY + event.clientY - state.startY
    setPlacements((prev) => ({
      ...prev,
      [state.id]: { dx, dy, z: prev[state.id]?.z ?? 0 },
    }))
  }

  const slap = (kind?: StickerKind) => {
    const pick = kind ?? SLAP_POOL[Math.floor(Math.random() * SLAP_POOL.length)]
    spawnCount.current += 1
    const id = `slap-${spawnCount.current}`
    setSpawned((prev) => ({ ...trimOldest(prev), [id]: randomSpot(pick) }))
  }

  const stickerStyle = (id: string, spot: Spot) =>
    ({
      left: `${spot.x}%`,
      top: `${spot.y}%`,
      zIndex: placements[id]?.z,
      '--r': `${spot.r}deg`,
      '--s': spot.s,
      '--dx': `${placements[id]?.dx ?? 0}px`,
      '--dy': `${placements[id]?.dy ?? 0}px`,
    }) as React.CSSProperties

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <div className={css.backTag}>
        <Link url='/styles'>◀ styles</Link>
      </div>

      <section
        className={css.board}
        aria-label='Sticker board. Every sticker can be dragged.'
      >
        {Object.entries(stickers).map(([id, spot]) => (
          <div
            key={id}
            role='img'
            aria-label={STICKER_LABEL[spot.kind]}
            data-id={id}
            data-kind={spot.kind}
            data-fresh={spot.fresh ? 'true' : undefined}
            className={css.sticker}
            style={stickerStyle(id, spot)}
            onPointerDown={grab}
            onPointerMove={move}
            onPointerUp={drop}
            onPointerCancel={drop}
          >
            <div className={css.face}>{STICKER_FACE[spot.kind]}</div>
          </div>
        ))}
        <span className={`${css.doodle} ${css.doodlePeel}`} aria-hidden='true'>
          drag us anywhere ↯
        </span>
        <span className={`${css.doodle} ${css.doodleClub}`} aria-hidden='true'>
          est. 2026 — no refunds
        </span>
        <div className={css.tapeCorner} aria-hidden='true' />
      </section>

      <div className={css.tape} aria-hidden='true'>
        <div className={css.tapeTrack}>
          <span className={css.tapeText}>
            STICK IT ✶ PEEL IT ✶ SLAP IT ✶ TRADE IT ✶ NEVER EVER IRON IT ✶&nbsp;
          </span>
          <span className={css.tapeText}>
            STICK IT ✶ PEEL IT ✶ SLAP IT ✶ TRADE IT ✶ NEVER EVER IRON IT ✶&nbsp;
          </span>
        </div>
      </div>

      <section className={css.sheet}>
        <header className={css.sheetHead}>
          <h1 className={css.sheetTitle}>fresh sheet</h1>
          <p className={css.sheetNote}>tap one to slap a copy on the board ↑</p>
        </header>
        <div className={css.sheetGrid}>
          {SLAP_POOL.slice(0, 6).map((kind) => (
            <button
              key={kind}
              type='button'
              className={css.cell}
              onClick={() => slap(kind)}
              aria-label={`Peel a ${STICKER_LABEL[kind]} onto the board`}
            >
              <span className={css.cellFace}>{STICKER_FACE[kind]}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className={css.colophon}>
        <p>
          die-cut contour, kraft board, one thumb of grain. stickers are the
          loudest quiet medium: a brand you can hold, steal, and re-stick
          somewhere it does not belong.
        </p>
      </footer>

      <button type='button' className={css.slapBtn} onClick={() => slap()}>
        SLAP!
      </button>

      <div className={css.film} aria-hidden='true' />
    </Shell>
  )
}

export default StickersView
