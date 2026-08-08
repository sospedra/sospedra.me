'use client'

import { clamp } from 'es-toolkit'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'services/link'
import css from './bazaar.module.css'
import {
  DIALOG_NUDGE,
  MOBILE_DIALOG_DROP,
  MOBILE_STALL_H,
  STALL_TUNE,
} from './decor'
import HostDecor from './host-decor'
import SceneStall from './scene-stall'
import { sfx } from './sounds'
import { stageBox } from './stage'
import scene from './stall-box.module.css'
import { DIMS, STALLS } from './stall-catalog'
import {
  Dialog,
  type DialogPosition,
  GamesDialogs,
  VIEWPORT_GUTTER,
} from './stall-dialog'
import type { BazaarStallId } from './stalls-manifest'

const MOBILE_BREAKPOINT_PX = 700
const HOVER_CLOSE_DELAY_MS = 140
const DIALOG_SIZE = {
  mobile: { maxWidth: 192, viewportShare: 0.62 },
  desktop: { maxWidth: 240, viewportShare: 0.76 },
}

/* the bubble hangs over the character's head, inside the stall box */
const DEFAULT_ANCHOR = { x: 0.5, y: 0.34 }

const dialogPositionFor = (
  wrap: HTMLElement,
  id: BazaarStallId,
  anchor = DEFAULT_ANCHOR,
): DialogPosition => {
  const rect = wrap.getBoundingClientRect()
  const stage = stageBox()
  const anchorX = (rect.left + rect.width * anchor.x - stage.left) / stage.scale
  const anchorY = (rect.top + rect.height * anchor.y - stage.top) / stage.scale
  const mobile = stage.width < MOBILE_BREAKPOINT_PX
  const size = mobile ? DIALOG_SIZE.mobile : DIALOG_SIZE.desktop
  const maxWidth = Math.min(size.maxWidth, stage.width * size.viewportShare)
  const half = maxWidth / 2
  const nudge = mobile ? undefined : DIALOG_NUDGE[id]
  return {
    left: clamp(
      anchorX + (nudge?.x ?? 0),
      half + VIEWPORT_GUTTER,
      stage.width - half - VIEWPORT_GUTTER,
    ),
    top: anchorY + (mobile ? (MOBILE_DIALOG_DROP[id] ?? 0) : (nudge?.y ?? 0)),
  }
}

export default function Stall(props: { id: BazaarStallId; eager?: boolean }) {
  const { id, eager } = props
  const spec = STALLS[id]
  const dims = DIMS[id]
  const tune = STALL_TUNE[id]
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dialogPosition, setDialogPosition] = useState<DialogPosition | null>(
    null,
  )
  const wrapRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const suppressFocusOpenRef = useRef(false)
  const active = open || focused

  const updateDialogPosition = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    setDialogPosition(dialogPositionFor(wrap, id, spec.anchor))
  }, [spec.anchor, id])

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  useEffect(() => {
    if (!active) return
    window.addEventListener('resize', updateDialogPosition)
    window.addEventListener('scroll', updateDialogPosition, true)
    return () => {
      window.removeEventListener('resize', updateDialogPosition)
      window.removeEventListener('scroll', updateDialogPosition, true)
    }
  }, [active, updateDialogPosition])

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    },
    [],
  )

  const openOnHover = () => {
    if (!window.matchMedia('(hover: hover)').matches) return
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    updateDialogPosition()
    setOpen(true)
  }

  const closeAfterHover = () => {
    if (!window.matchMedia('(hover: hover)').matches) return
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }

  const guardTap = (event: React.MouseEvent) => {
    const coarse = window.matchMedia('(hover: none)').matches
    if (coarse && !open) {
      event.preventDefault()
      updateDialogPosition()
      setOpen(true)
      sfx.stall(id)
      return
    }
    sfx.click()
  }

  const dismissDialog = () => {
    const link = wrapRef.current?.querySelector<HTMLAnchorElement>('a[href]')
    if (link && document.activeElement !== link) {
      // refocusing the stall link must not re-open the dialog it just closed
      suppressFocusOpenRef.current = true
      link.focus()
    }
    setOpen(false)
    setFocused(false)
  }

  const handleLinkKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === 'Escape') dismissDialog()
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: coordinates hover and focus state for the child link and its portalled dialog
    <div
      ref={wrapRef}
      className={css.stallWrap}
      style={
        {
          '--w': dims.width,
          '--h': dims.height,
          '--ar': dims.width / dims.height,
          '--lift': tune.lift,
          '--dim': tune.dim ?? 1,
          '--mh': MOBILE_STALL_H[id] && `${MOBILE_STALL_H[id]}px`,
        } as React.CSSProperties
      }
      data-stall={id}
      data-mh={MOBILE_STALL_H[id] !== undefined || undefined}
      data-edit-id={id}
      onMouseEnter={openOnHover}
      onMouseLeave={closeAfterHover}
      onFocusCapture={() => {
        if (suppressFocusOpenRef.current) {
          suppressFocusOpenRef.current = false
          return
        }
        updateDialogPosition()
        setFocused(true)
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget as Node | null
        if (!event.currentTarget.contains(next)) setFocused(false)
      }}
    >
      <Link
        className={scene.stall}
        aria-label={spec.label}
        aria-expanded={active}
        data-label={spec.label}
        onClick={guardTap}
        onMouseEnter={() => sfx.stall(id)}
        onKeyDown={handleLinkKeyDown}
        url={spec.href}
      >
        <SceneStall id={id} active={active} eager={eager} />
        {id === 'scavenger' && <span className={scene.scavEyes} aria-hidden />}
      </Link>
      <HostDecor host={`stall:${id}`} />
      {id === 'games' ? (
        <GamesDialogs
          active={active}
          position={dialogPosition}
          dialogRef={dialogRef}
        />
      ) : (
        <Dialog
          spec={spec}
          active={active}
          position={dialogPosition}
          dialogRef={dialogRef}
        />
      )}
    </div>
  )
}
