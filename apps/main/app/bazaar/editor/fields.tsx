'use client'

import { useRef, useState } from 'react'
import type { Corner } from '../decor'
import css from './editor.module.css'

const clampTo = (value: number, min?: number, max?: number) =>
  Math.min(
    max ?? Number.POSITIVE_INFINITY,
    Math.max(min ?? Number.NEGATIVE_INFINITY, value),
  )

const modFactor = (event: { shiftKey: boolean; altKey: boolean }) => {
  if (event.shiftKey) return 10
  if (event.altKey) return 0.1
  return 1
}

export type ScrubProps = {
  label: string
  value: number
  step?: number
  min?: number
  max?: number
  precision?: number
  nudge?: number
  onBegin?: () => void
  onLive?: (value: number) => void
  onCommit: (value: number) => void
}

type ScrubDrag = { startX: number; base: number; moved: boolean }

function ScrubInput(props: {
  text: string
  setText: (text: string | null) => void
  commit: (raw: number) => void
}) {
  const done = () => {
    const parsed = Number.parseFloat(props.text)
    props.setText(null)
    if (Number.isFinite(parsed)) props.commit(parsed)
  }
  return (
    <input
      className={css.scrubInput}
      value={props.text}
      // biome-ignore lint/a11y/noAutofocus: the field swaps into type-in mode on demand
      autoFocus
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => props.setText(event.currentTarget.value)}
      onBlur={done}
      onKeyDown={(event) => {
        if (event.key === 'Enter') done()
        if (event.key === 'Escape') props.setText(null)
      }}
    />
  )
}

/** drag to adjust, click to type, − / + to step (shift ×10, alt ×0.1) */
export function Scrub(props: ScrubProps) {
  const { label, value, step = 0.5, precision = 1 } = props
  const nudge = props.nudge ?? (precision >= 2 ? 0.05 : 1)
  const [text, setText] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const drag = useRef<ScrubDrag | null>(null)

  const round = (raw: number) => Number(raw.toFixed(precision))
  const settle = (raw: number) => clampTo(round(raw), props.min, props.max)
  const dragValue = (state: ScrubDrag, event: React.PointerEvent) =>
    settle(
      state.base + (event.clientX - state.startX) * step * modFactor(event),
    )
  const bump = (event: React.MouseEvent, direction: 1 | -1) =>
    props.onCommit(settle(value + direction * nudge * modFactor(event)))

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, base: value, moved: false }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const state = drag.current
    if (!state) return
    if (!state.moved && Math.abs(event.clientX - state.startX) < 3) return
    if (!state.moved) {
      state.moved = true
      setLive(true)
      props.onBegin?.()
    }
    props.onLive?.(dragValue(state, event))
  }

  const onPointerUp = (event: React.PointerEvent) => {
    const state = drag.current
    drag.current = null
    setLive(false)
    if (!state) return
    if (state.moved) {
      props.onCommit(dragValue(state, event))
      return
    }
    setText(String(round(value)))
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const direction = { ArrowUp: 1, ArrowDown: -1 }[event.key]
    if (!direction) return
    event.preventDefault()
    props.onCommit(settle(value + direction * nudge * modFactor(event)))
  }

  return (
    <span className={css.scrub} data-live={live || text !== null || undefined}>
      <button
        type='button'
        className={css.stepBtn}
        aria-label={`${label} minus`}
        onClick={(event) => bump(event, -1)}
      >
        −
      </button>
      {text !== null ? (
        <ScrubInput text={text} setText={setText} commit={props.onCommit} />
      ) : (
        <button
          type='button'
          className={css.scrubDrag}
          aria-label={`${label}: ${round(value)}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <span className={css.scrubLabel}>{label}</span>
          <span className={css.scrubValue}>{round(value)}</span>
        </button>
      )}
      <button
        type='button'
        className={css.stepBtn}
        aria-label={`${label} plus`}
        onClick={(event) => bump(event, 1)}
      >
        +
      </button>
    </span>
  )
}

const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br']

export function CornerPad(props: {
  corner: Corner
  disabled?: boolean
  onPick: (corner: Corner) => void
}) {
  return (
    <span className={css.cornerPad}>
      {CORNERS.map((corner) => (
        <button
          key={corner}
          type='button'
          className={css.cornerDot}
          data-on={props.corner === corner || undefined}
          disabled={props.disabled}
          aria-label={`anchor corner ${corner}`}
          aria-pressed={props.corner === corner}
          onClick={() => props.onPick(corner)}
        />
      ))}
    </span>
  )
}

export function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div className={css.section}>
      <div className={css.eyebrow}>{props.title}</div>
      {props.children}
    </div>
  )
}
