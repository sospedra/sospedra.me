'use client'

import cn from 'clsx'
import { clamp, sum } from 'es-toolkit'
import { join, pipe, take } from 'es-toolkit/fp'
import { Press_Start_2P } from 'next/font/google'
import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { sfx } from './sounds'
import { GAMES_CONVERSATION, type StallSpec } from './stall-catalog'
import scene from './stall-dialog.module.css'

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  preload: false,
})

export const VIEWPORT_GUTTER = 8

export type DialogPosition = { left: number; top: number }

const TYPEWRITER_INTERVAL_MS = 9
const TYPE_BLIP_EVERY = 3
const GAMES_TURN_PAUSE_CHARS = 10

const countCharacters = (value: string) => Array.from(value).length
const sliceCharacters = (value: string, length: number) =>
  pipe(Array.from(value), take(length), join(''))

function getVisibleCharacters(
  timelinePosition: number,
  start: number,
  length: number,
) {
  return clamp(timelinePosition - start, 0, length)
}

function useTypewriter(active: boolean, totalCharacters: number) {
  const [visibleChars, setVisibleChars] = useState(0)

  useEffect(() => {
    if (!active) {
      setVisibleChars(0)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleChars(totalCharacters)
      return
    }

    setVisibleChars(0)
    let ticks = 0
    const timer = window.setInterval(() => {
      ticks += 1
      if (ticks % TYPE_BLIP_EVERY === 0) sfx.type()
      setVisibleChars((current) => {
        const next = Math.min(current + 1, totalCharacters)
        if (next >= totalCharacters) window.clearInterval(timer)
        return next
      })
    }, TYPEWRITER_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [active, totalCharacters])

  return visibleChars
}

function DialogContent(props: { desc: string; visibleChars: number }) {
  const { desc, visibleChars } = props
  const descLength = countCharacters(desc)
  const descVisibleChars = Math.min(visibleChars, descLength)

  return (
    <p className={scene.dialogDesc}>
      <span className={scene.srOnly}>{desc}</span>
      <span className={scene.typeMeasure} aria-hidden>
        {desc}
      </span>
      <span className={scene.typeText} aria-hidden>
        {sliceCharacters(desc, descVisibleChars)}
        {descVisibleChars < descLength && (
          <span className={scene.typeCursor}>_</span>
        )}
      </span>
    </p>
  )
}

function useDialogLayer() {
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    setLayer(document.querySelector<HTMLElement>('[data-bazaar-dialog-layer]'))
  }, [])
  return layer
}

export function Dialog(props: {
  spec: StallSpec
  active: boolean
  position: DialogPosition | null
  dialogRef: React.RefObject<HTMLDivElement | null>
}) {
  const { spec, active, position, dialogRef } = props
  const visibleChars = useTypewriter(active, countCharacters(spec.desc))
  const layer = useDialogLayer()

  if (!active || !position || !layer) return null

  return createPortal(
    <div
      ref={dialogRef}
      role='dialog'
      aria-label={`${spec.label} stall details`}
      className={cn(scene.dialog, pixelFont.className)}
      style={{ left: position.left, top: position.top }}
    >
      <DialogContent desc={spec.desc} visibleChars={visibleChars} />
    </div>,
    layer,
  )
}

export function GamesDialogs(props: {
  active: boolean
  position: DialogPosition | null
  dialogRef: React.RefObject<HTMLDivElement | null>
}) {
  const { active, position, dialogRef } = props
  const turnLengths = GAMES_CONVERSATION.map((turn) =>
    countCharacters(turn.text),
  )
  const totalCharacters =
    sum(turnLengths) + GAMES_TURN_PAUSE_CHARS * (GAMES_CONVERSATION.length - 1)
  const visibleChars = useTypewriter(active, totalCharacters)
  const layer = useDialogLayer()

  if (!active || !position || !layer) return null

  return createPortal(
    <div
      ref={dialogRef}
      role='dialog'
      aria-label='Games stall conversation'
      className={cn(scene.gamesDialogs, pixelFont.className)}
      style={{ left: position.left, top: position.top }}
    >
      {GAMES_CONVERSATION.map((turn, index) => {
        const turnStart =
          sum(turnLengths.slice(0, index)) + GAMES_TURN_PAUSE_CHARS * index
        const started = visibleChars >= turnStart
        const turnVisibleChars = getVisibleCharacters(
          visibleChars,
          turnStart,
          turnLengths[index],
        )

        return (
          <div
            key={`${turn.speaker}-${turn.text}`}
            className={cn(
              scene.dialog,
              scene.gamesDialog,
              turn.speaker === 'sister'
                ? scene.gamesDialogSister
                : scene.gamesDialogBrother,
              !started && scene.gamesDialogPending,
            )}
          >
            <span className={scene.srOnly}>{turn.speaker} says: </span>
            <DialogContent desc={turn.text} visibleChars={turnVisibleChars} />
          </div>
        )
      })}
    </div>,
    layer,
  )
}
