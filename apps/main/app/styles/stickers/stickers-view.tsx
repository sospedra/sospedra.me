'use client'

import type React from 'react'
import { useRef, useState } from 'react'
import Link from 'services/link'
import Shell from 'services/shell'
import { useSheetStack } from '../use-sheet-stack'
import {
  BOARD,
  type DragState,
  type Landing,
  type Placement,
  randomSpot,
  type Spot,
  trimOldest,
} from './board'
import { SLAP_POOL, type StickerKind } from './sticker-art'
import css from './stickers.module.css'
import { BackPlate, BoardPlate, CoverPlate, OpEdPlate } from './stickers-pages'

type StickersViewProps = { fontVars: string }

const StickersView = ({ fontVars }: StickersViewProps) => {
  const { refs, active } = useSheetStack()
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

  // the hook's turnTo uses scrollIntoView, a no-op on sticky-pinned sheets
  const turnToPlate = (index: number) => {
    const sheet = refs.current[index]
    if (!sheet) return
    const top =
      (sheet.parentElement?.offsetTop ?? 0) + index * sheet.offsetHeight
    window.scrollTo({ top, behavior: 'smooth' })
  }

  const spawn = (kind: StickerKind, landing: Landing) => {
    spawnCount.current += 1
    const id = `slap-${spawnCount.current}`
    setSpawned((prev) => ({
      ...trimOldest(prev),
      [id]: randomSpot(kind, landing),
    }))
  }

  const slapRandom = () =>
    spawn(SLAP_POOL[Math.floor(Math.random() * SLAP_POOL.length)], 'near')

  const peelFromBack = (kind: StickerKind) => {
    spawn(kind, 'far')
    turnToPlate(1)
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

  const plates = [
    { id: 'cover', no: '1', title: 'COVER', tone: 'sun', body: <CoverPlate /> },
    {
      id: 'board',
      no: '2',
      title: 'THE BOARD',
      tone: 'street',
      body: (
        <BoardPlate
          stickers={stickers}
          styleFor={stickerStyle}
          onGrab={grab}
          onMove={move}
          onDrop={drop}
          onSlap={slapRandom}
        />
      ),
    },
    {
      id: 'oped',
      no: '3',
      title: 'THE OP-ED',
      tone: 'noon',
      body: <OpEdPlate />,
    },
    {
      id: 'back',
      no: '4',
      title: 'BACK PAGE',
      tone: 'dusk',
      body: <BackPlate onPeel={peelFromBack} />,
    },
  ]

  return (
    <Shell className={`${css.page} ${fontVars}`}>
      <div className={css.backTag}>
        <Link url='/styles'>◀ styles</Link>
      </div>

      <nav className={css.rail} aria-label='Issue plates'>
        {plates.map((plate, index) => (
          <button
            key={plate.id}
            type='button'
            className={css.railDot}
            data-on={active === index ? 'true' : undefined}
            aria-label={`Turn to plate ${plate.no}: ${plate.title}`}
            onClick={() => turnToPlate(index)}
          >
            {plate.no}
          </button>
        ))}
      </nav>

      <div className={css.issue}>
        {plates.map((plate, index) => (
          <section
            key={plate.id}
            ref={(node) => {
              refs.current[index] = node
            }}
            data-sheet={index}
            data-tone={plate.tone}
            className={css.sheet}
            aria-label={`Plate ${plate.no} — ${plate.title}`}
          >
            <div className={css.sheetInner}>
              <p className={css.runHead}>
                <span>THE ADHESIVE TIMES</span>
                <span className={css.runHeadTitle}>{plate.title}</span>
                <span>No. 44</span>
              </p>
              {plate.body}
              <p className={css.folio}>
                <span>FREE PRESS · GLUE FUNDED</span>
                <span>{plate.no} / 4</span>
              </p>
            </div>
          </section>
        ))}
      </div>

      <div className={css.film} aria-hidden='true' />
    </Shell>
  )
}

export default StickersView
