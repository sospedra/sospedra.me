'use client'

import { useEffect, useState } from 'react'
import { useStoreSelector } from 'services/external-store'
import { GLOW_COLORS, isSpotKind, spriteSrc } from '../decor'
import { axisX, axisY, HANDLES, type HandleKind } from './gestures'
import css from './overlay.module.css'
import { editEl, hostAt, hostEl, pickAt } from './probe'
import {
  anchorPickStore,
  dragSpawnStore,
  getNode,
  hoverStore,
  selectionStore,
} from './store'

const rectStyle = (rect: DOMRect): React.CSSProperties => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
})

const sameRect = (a: DOMRect | null, b: DOMRect | null) => {
  if (a === null || b === null) return a === b
  return (
    Math.round(a.left) === Math.round(b.left) &&
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height)
  )
}

const liveRect = (id: string | null) => {
  if (!id) return null
  const el = editEl(id)
  return el ? el.getBoundingClientRect() : null
}

const handlePoint = (kind: HandleKind, rect: DOMRect) => {
  const xs = {
    '-1': rect.left,
    '0': rect.left + rect.width / 2,
    '1': rect.right,
  }
  const ys = {
    '-1': rect.top,
    '0': rect.top + rect.height / 2,
    '1': rect.bottom,
  }
  return {
    left: xs[String(axisX(kind)) as keyof typeof xs],
    top: ys[String(axisY(kind)) as keyof typeof ys],
  }
}

type PickTarget = { rect: DOMRect; label: string }

const computePickTarget = (event: PointerEvent): PickTarget | null => {
  const picked = pickAt(event.clientX, event.clientY)
  if (picked && getNode(picked.id)) {
    return {
      rect: picked.el.getBoundingClientRect(),
      label: `node:${picked.id}`,
    }
  }
  const host = hostAt(event.clientX, event.clientY)
  const el = host ? hostEl(host) : null
  return el && host ? { rect: el.getBoundingClientRect(), label: host } : null
}

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const

function SpawnGhost({ x, y }: { x: number; y: number }) {
  const spawn = useStoreSelector(dragSpawnStore, (value) => value)
  if (!spawn) return null
  if (isSpotKind(spawn.kind)) {
    return (
      <div
        className={css.ghost}
        style={{
          left: x,
          top: y,
          width: 72,
          background: GLOW_COLORS[spawn.ref],
        }}
      />
    )
  }
  return (
    <img
      className={css.ghost}
      style={{ left: x, top: y }}
      src={spriteSrc(spawn.kind, spawn.ref)}
      alt=''
    />
  )
}

/* rects come from live layout, so a rAF poll beats mirroring every write */
const useLiveRects = () => {
  const [selRect, setSelRect] = useState<DOMRect | null>(null)
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    let frame = 0
    const tick = () => {
      setSelRect((previous) => {
        const next = liveRect(selectionStore.get()?.id ?? null)
        return sameRect(previous, next) ? previous : next
      })
      setHoverRect((previous) => {
        const next = liveRect(hoverStore.get())
        return sameRect(previous, next) ? previous : next
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  return { selRect, hoverRect }
}

const usePointerTrack = () => {
  const [pickTarget, setPickTarget] = useState<PickTarget | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (dragSpawnStore.get()) {
        setPointer({ x: event.clientX, y: event.clientY })
      }
      if (anchorPickStore.get()) setPickTarget(computePickTarget(event))
    }
    document.addEventListener('pointermove', onMove)
    return () => document.removeEventListener('pointermove', onMove)
  }, [])
  return { pickTarget, pointer }
}

/** selection brackets, resize handles, hover ring, anchor-pick target, ghost */
export default function Overlay(props: {
  startResize: (kind: HandleKind) => (event: React.PointerEvent) => void
}) {
  const selection = useStoreSelector(selectionStore, (value) => value)
  const picking = useStoreSelector(anchorPickStore, (value) => value)
  const spawning = useStoreSelector(dragSpawnStore, (value) => value !== null)
  const { selRect, hoverRect } = useLiveRects()
  const { pickTarget, pointer } = usePointerTrack()

  return (
    <>
      {hoverRect && (
        <div className={css.hoverRing} style={rectStyle(hoverRect)} />
      )}
      {picking && pickTarget && (
        <div className={css.hostRing} style={rectStyle(pickTarget.rect)}>
          <span>{pickTarget.label}</span>
        </div>
      )}
      {selection && selRect && (
        <>
          <div className={css.selRing} style={rectStyle(selRect)}>
            {CORNERS.map((corner) => (
              <span key={corner} className={css.bracket} data-c={corner} />
            ))}
          </div>
          {HANDLES.map(({ kind, cursor }) => (
            <div
              key={kind}
              className={css.handle}
              data-editor-ui=''
              style={{ ...handlePoint(kind, selRect), cursor }}
              onPointerDown={props.startResize(kind)}
            />
          ))}
        </>
      )}
      {spawning && pointer && <SpawnGhost x={pointer.x} y={pointer.y} />}
    </>
  )
}
