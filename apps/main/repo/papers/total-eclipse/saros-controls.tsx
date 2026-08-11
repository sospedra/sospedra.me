'use client'

import type React from 'react'
import { useRef } from 'react'
import css from './saros-globe.module.css'
import type { Member } from './saros-path.ts'

export type ScrubPhase = 'tap' | 'drag'

type Props = {
  members: readonly Member[]
  index: number
  heroIndex: number
  playing: boolean
  scrubbing: boolean
  colorOf: (member: Member) => string
  labelOf: (member: Member) => string
  onTogglePlay: () => void
  onStep: (delta: number) => void
  onScrub: (index: number, phase: ScrubPhase) => void
  onScrubStart: () => void
  onScrubEnd: () => void
}

const PlayIcon = () => (
  <svg viewBox='0 0 16 16' width='12' height='12' aria-hidden='true'>
    <path d='M4.5 2.6v10.8L13.5 8z' fill='currentColor' />
  </svg>
)

const PauseIcon = () => (
  <svg viewBox='0 0 16 16' width='12' height='12' aria-hidden='true'>
    <rect
      x='3.6'
      y='2.6'
      width='3.1'
      height='10.8'
      rx='1'
      fill='currentColor'
    />
    <rect
      x='9.3'
      y='2.6'
      width='3.1'
      height='10.8'
      rx='1'
      fill='currentColor'
    />
  </svg>
)

const ChevronIcon = () => (
  <svg viewBox='0 0 16 16' width='12' height='12' aria-hidden='true'>
    <path
      d='M10 3.2 5.4 8l4.6 4.8'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }

const SarosControls: React.FC<Props> = ({
  members,
  index,
  heroIndex,
  playing,
  scrubbing,
  colorOf,
  labelOf,
  onTogglePlay,
  onStep,
  onScrub,
  onScrubStart,
  onScrubEnd,
}) => {
  const railRef = useRef<HTMLDivElement>(null)

  const memberAt = (clientX: number) => {
    const rail = railRef.current
    if (!rail) return index
    const box = rail.getBoundingClientRect()
    const fraction = Math.min(
      0.999,
      Math.max(0, (clientX - box.left) / box.width),
    )
    return Math.floor(fraction * members.length)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    onScrubStart()
    onScrub(memberAt(event.clientX), 'tap')
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    onScrub(memberAt(event.clientX), 'drag')
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = KEY_STEP[event.key]
    if (!delta) return
    event.preventDefault()
    onStep(delta)
  }

  const current = members[index]
  const playheadFraction = (index + 0.5) / members.length

  return (
    <>
      <div className={css.scrub} data-scrubbing={scrubbing || undefined}>
        <button
          type='button'
          className={css.hero}
          style={{ left: `${((heroIndex + 0.5) / members.length) * 100}%` }}
          onClick={() => onScrub(heroIndex, 'tap')}
        >
          2026
        </button>
        <div
          ref={railRef}
          role='slider'
          tabIndex={0}
          aria-label='saros 126 member'
          aria-valuemin={1}
          aria-valuemax={members.length}
          aria-valuenow={index + 1}
          aria-valuetext={`${current.date}, ${labelOf(current)}`}
          className={css.rail}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onScrubEnd}
          onPointerCancel={onScrubEnd}
          onKeyDown={onKeyDown}
        >
          <div className={css.segments}>
            {members.map((member, i) => (
              <i
                key={member.key}
                className={i <= index ? css.segPast : css.seg}
                style={{ background: colorOf(member) }}
              />
            ))}
          </div>
          <div
            className={css.playheadTrack}
            style={{ transform: `translateX(${playheadFraction * 100}%)` }}
          >
            <i className={css.playhead} style={{ color: colorOf(current) }} />
          </div>
        </div>
      </div>

      <div className={css.bar}>
        <button
          type='button'
          className={css.control}
          onClick={() => onStep(-1)}
        >
          <ChevronIcon />
          <span className={css.sr}>previous eclipse</span>
        </button>
        <button type='button' className={css.control} onClick={onTogglePlay}>
          {playing ? <PauseIcon /> : <PlayIcon />}
          <span className={css.sr}>{playing ? 'pause' : 'play'}</span>
        </button>
        <button
          type='button'
          className={`${css.control} ${css.flip}`}
          onClick={() => onStep(1)}
        >
          <ChevronIcon />
          <span className={css.sr}>next eclipse</span>
        </button>
        <span className={css.hint}>
          drag the globe to spin · tap to hold a place
        </span>
      </div>
    </>
  )
}

export default SarosControls
