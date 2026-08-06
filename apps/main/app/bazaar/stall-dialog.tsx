'use client'

import cn from 'clsx'
import { clamp, sum, sumBy } from 'es-toolkit'
import { join, pipe, take } from 'es-toolkit/fp'
import type { Route } from 'next'
import { Press_Start_2P } from 'next/font/google'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'services/link'
import { sfx } from './sounds'
import {
  GAMES_CONVERSATION,
  type StallLink,
  type StallSpec,
} from './stall-catalog'
import scene from './stall-dialog.module.css'

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  preload: false,
})

export const VIEWPORT_GUTTER = 8

export type DialogPosition = { left: number; top: number }

const TYPEWRITER_INTERVAL_MS = 9
const GAMES_TURN_PAUSE_CHARS = 10

const countCharacters = (value: string) => Array.from(value).length
const sliceCharacters = (value: string, length: number) =>
  pipe(Array.from(value), take(length), join(''))

function getDialogCharacterCount(desc: string, links: readonly StallLink[]) {
  return (
    countCharacters(desc) + sumBy(links, (link) => countCharacters(link.label))
  )
}

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
    const timer = window.setInterval(() => {
      setVisibleChars((current) => {
        const next = Math.min(current + 1, totalCharacters)
        if (next >= totalCharacters) window.clearInterval(timer)
        return next
      })
    }, TYPEWRITER_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [active, totalCharacters])

  const finish = useCallback(
    () => setVisibleChars(totalCharacters),
    [totalCharacters],
  )

  return { finish, visibleChars }
}

function DialogContent(props: {
  desc: string
  links: readonly StallLink[]
  visibleChars: number
  onLinkFocus: () => void
}) {
  const { desc, links, onLinkFocus, visibleChars } = props
  const descLength = countCharacters(desc)
  const descVisibleChars = Math.min(visibleChars, descLength)
  const linkLengths = links.map((link) => countCharacters(link.label))
  const linkStarts = linkLengths.map(
    (_, index) => descLength + sum(linkLengths.slice(0, index)),
  )

  return (
    <>
      <p
        className={cn(
          scene.dialogDesc,
          links.length === 0 && scene.dialogDescSolo,
        )}
      >
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
      {links.length > 0 && (
        <div className={scene.dialogLinks}>
          {links.map((link, index) => {
            const linkLength = linkLengths[index]
            const linkVisibleChars = getVisibleCharacters(
              visibleChars,
              linkStarts[index],
              linkLength,
            )
            const started = visibleChars >= linkStarts[index]
            const content = (
              <>
                <span className={scene.linkTypeMeasure} aria-hidden>
                  {link.label}
                </span>
                <span className={scene.linkTypeText} aria-hidden>
                  {sliceCharacters(link.label, linkVisibleChars)}
                  {started && linkVisibleChars < linkLength && (
                    <span className={scene.typeCursor}>_</span>
                  )}
                </span>
              </>
            )
            const className = cn(!started && scene.dialogLinkPending)

            return link.external ? (
              <a
                key={link.href}
                href={link.href}
                target='_blank'
                rel='noreferrer'
                aria-label={link.label}
                className={className}
                onClick={() => sfx.click()}
                onFocus={onLinkFocus}
              >
                {content}
              </a>
            ) : (
              <Link
                key={link.href}
                url={link.href as Route}
                aria-label={link.label}
                className={className}
                onClick={() => sfx.click()}
                onFocus={onLinkFocus}
              >
                {content}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

function AnimatedDialogContent(props: {
  desc: string
  links: readonly StallLink[]
  active: boolean
}) {
  const { active, desc, links } = props
  const totalCharacters = getDialogCharacterCount(desc, links)
  const { finish, visibleChars } = useTypewriter(active, totalCharacters)

  return (
    <DialogContent
      desc={desc}
      links={links}
      visibleChars={visibleChars}
      onLinkFocus={finish}
    />
  )
}

const axisShift = (start: number, end: number, limit: number) => {
  if (start < VIEWPORT_GUTTER) return VIEWPORT_GUTTER - start
  if (end > limit - VIEWPORT_GUTTER) return limit - VIEWPORT_GUTTER - end
  return 0
}

function useViewportClamp(
  dialogRef: React.RefObject<HTMLDivElement | null>,
  active: boolean,
  position: DialogPosition | null,
) {
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!active || !position || !dialog) return

    dialog.style.setProperty('--dialog-shift-x', '0px')
    dialog.style.setProperty('--dialog-shift-y', '0px')

    const rect = dialog.getBoundingClientRect()
    const shiftX = axisShift(rect.left, rect.right, window.innerWidth)
    const shiftY = axisShift(rect.top, rect.bottom, window.innerHeight)

    dialog.style.setProperty('--dialog-shift-x', `${shiftX}px`)
    dialog.style.setProperty('--dialog-shift-y', `${shiftY}px`)
  }, [active, dialogRef, position])
}

export function Dialog(props: {
  spec: StallSpec
  active: boolean
  position: DialogPosition | null
  dialogRef: React.RefObject<HTMLDivElement | null>
  onMouseEnter: () => void
  onMouseLeave: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const {
    spec,
    active,
    position,
    dialogRef,
    onMouseEnter,
    onMouseLeave,
    onKeyDown,
  } = props
  useViewportClamp(dialogRef, active, position)

  if (!active || !position) return null

  return createPortal(
    <div
      ref={dialogRef}
      role='dialog'
      aria-label={`${spec.label} stall details`}
      className={cn(scene.dialog, pixelFont.className)}
      style={{ left: position.left, top: position.top }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
    >
      <AnimatedDialogContent
        desc={spec.desc}
        links={spec.links}
        active={active}
      />
    </div>,
    document.body,
  )
}

export function GamesDialogs(props: {
  spec: StallSpec
  active: boolean
  position: DialogPosition | null
  dialogRef: React.RefObject<HTMLDivElement | null>
  onMouseEnter: () => void
  onMouseLeave: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const {
    spec,
    active,
    position,
    dialogRef,
    onMouseEnter,
    onMouseLeave,
    onKeyDown,
  } = props
  const lastTurnIndex = GAMES_CONVERSATION.length - 1
  const turnLengths = GAMES_CONVERSATION.map((turn, index) =>
    getDialogCharacterCount(
      turn.text,
      index === lastTurnIndex ? spec.links : [],
    ),
  )
  const totalCharacters =
    sum(turnLengths) + GAMES_TURN_PAUSE_CHARS * lastTurnIndex
  const { finish, visibleChars } = useTypewriter(active, totalCharacters)
  useViewportClamp(dialogRef, active, position)

  if (!active || !position) return null

  return createPortal(
    <div
      ref={dialogRef}
      role='dialog'
      aria-label='Games stall conversation'
      className={cn(scene.gamesDialogs, pixelFont.className)}
      style={{ left: position.left, top: position.top }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
    >
      {GAMES_CONVERSATION.map((turn, index) => {
        const links = index === lastTurnIndex ? spec.links : []
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
            <DialogContent
              desc={turn.text}
              links={links}
              visibleChars={turnVisibleChars}
              onLinkFocus={finish}
            />
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
