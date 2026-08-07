'use client'

import cn from 'clsx'
import { clamp, isNotNil } from 'es-toolkit'
import { drop, find, map, pipe } from 'es-toolkit/fp'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'services/link'
import css from './bazaar.module.css'
import { STALL_TUNE } from './decor'
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
  mobile: { maxWidth: 240, viewportShare: 0.62 },
  desktop: { maxWidth: 300, viewportShare: 0.76 },
}

const focusNextStall = (wrap: HTMLElement): boolean => {
  const siblings = Array.from(wrap.parentElement?.children ?? [])
  const target = pipe(
    siblings,
    drop(siblings.indexOf(wrap) + 1),
    map((sibling) => sibling.querySelector<HTMLAnchorElement>('a[href]')),
    find(isNotNil),
  )
  target?.focus()
  return Boolean(target)
}

export default function Stall({ id }: { id: BazaarStallId }) {
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
    const rect = wrap.getBoundingClientRect()
    const stage = stageBox()
    const anchorX = (rect.left + rect.width / 2 - stage.left) / stage.scale
    const anchorY = (rect.top - stage.top) / stage.scale
    const mobile = stage.width < MOBILE_BREAKPOINT_PX
    const size = mobile ? DIALOG_SIZE.mobile : DIALOG_SIZE.desktop
    const maxWidth = Math.min(size.maxWidth, stage.width * size.viewportShare)
    const half = maxWidth / 2
    setDialogPosition({
      left: clamp(
        anchorX,
        half + VIEWPORT_GUTTER,
        stage.width - half - VIEWPORT_GUTTER,
      ),
      top: anchorY,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        !wrapRef.current?.contains(target) &&
        !dialogRef.current?.contains(target)
      ) {
        setOpen(false)
      }
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
    if (event.key === 'Escape') {
      dismissDialog()
      return
    }
    if (event.key !== 'Tab' || event.shiftKey) return
    const firstLink =
      dialogRef.current?.querySelector<HTMLAnchorElement>('a[href]')
    if (!firstLink) return
    event.preventDefault()
    firstLink.focus()
  }

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      dismissDialog()
      return
    }
    if (event.key !== 'Tab') return
    const links =
      dialogRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]')
    if (!links?.length) return

    if (event.shiftKey && document.activeElement === links[0]) {
      event.preventDefault()
      wrapRef.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus()
      return
    }
    if (event.shiftKey || document.activeElement !== links[links.length - 1]) {
      return
    }

    if (wrapRef.current && focusNextStall(wrapRef.current)) {
      event.preventDefault()
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: coordinates hover and focus state for the child link and its portalled dialog
    <div
      ref={wrapRef}
      className={cn(css.stallWrap, active && scene.dialogOpen)}
      style={
        {
          '--tint': spec.tint,
          '--w': dims.width,
          '--h': dims.height,
          '--ar': dims.width / dims.height,
          '--lift': tune.lift,
          '--dim': tune.dim ?? 1,
        } as React.CSSProperties
      }
      data-stall={id}
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
        if (
          !event.currentTarget.contains(next) &&
          !dialogRef.current?.contains(next)
        ) {
          setFocused(false)
        }
      }}
    >
      <Link
        className={scene.stall}
        aria-label={spec.label}
        aria-expanded={active}
        aria-haspopup='dialog'
        data-label={spec.label}
        onClick={guardTap}
        onMouseEnter={() => sfx.stall(id)}
        onKeyDown={handleLinkKeyDown}
        url={spec.href}
      >
        <SceneStall id={id} active={active} />
        {id === 'scavenger' && <span className={scene.scavEyes} aria-hidden />}
        <div className={scene.glowWash} />
      </Link>
      <HostDecor host={`stall:${id}`} />
      {id === 'games' ? (
        <GamesDialogs
          spec={spec}
          active={active}
          position={dialogPosition}
          dialogRef={dialogRef}
          onMouseEnter={openOnHover}
          onMouseLeave={closeAfterHover}
          onKeyDown={handleDialogKeyDown}
        />
      ) : (
        <Dialog
          spec={spec}
          active={active}
          position={dialogPosition}
          dialogRef={dialogRef}
          onMouseEnter={openOnHover}
          onMouseLeave={closeAfterHover}
          onKeyDown={handleDialogKeyDown}
        />
      )}
    </div>
  )
}
