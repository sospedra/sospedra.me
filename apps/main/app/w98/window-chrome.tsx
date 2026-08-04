import { clamp } from 'es-toolkit'
import type React from 'react'
import { useRef, useState } from 'react'
import type { AppId, DesktopState } from './desktop.ts'
import css from './w98.module.css'

export const WindowControls: React.FC<{
  appName: string
  minimize: () => void
  close: () => void
}> = ({ appName, minimize, close }) => (
  <span className={css.windowControls}>
    <button type='button' aria-label={`Minimize ${appName}`} onClick={minimize}>
      _
    </button>
    <span aria-hidden='true'>□</span>
    <button type='button' aria-label={`Close ${appName}`} onClick={close}>
      ×
    </button>
  </span>
)

type WindowGrab = {
  pointer: number
  originX: number
  originY: number
  baseX: number
  baseY: number
  titlebar: DOMRect
  area: DOMRect
}

// reachable slack: a dragged-out window keeps this much titlebar on screen
const DRAG_SLACK = 48

const within = (value: number, lower: number, upper: number): number =>
  lower > upper ? 0 : clamp(value, lower, upper)

export const useWindowDrag = (
  areaRef: React.RefObject<HTMLDivElement | null>,
) => {
  const [shift, setShift] = useState({ x: 0, y: 0 })
  const grabRef = useRef<WindowGrab | null>(null)

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target instanceof Element && event.target.closest('button, a'))
      return
    const area = areaRef.current
    if (!area) return
    event.currentTarget.setPointerCapture(event.pointerId)
    grabRef.current = {
      pointer: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      baseX: shift.x,
      baseY: shift.y,
      titlebar: event.currentTarget.getBoundingClientRect(),
      area: area.getBoundingClientRect(),
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const grab = grabRef.current
    if (!grab || grab.pointer !== event.pointerId) return
    const { titlebar, area } = grab
    const dx = within(
      event.clientX - grab.originX,
      area.left - titlebar.right + DRAG_SLACK,
      area.right - titlebar.left - DRAG_SLACK,
    )
    const dy = within(
      event.clientY - grab.originY,
      area.top - titlebar.top,
      area.bottom - titlebar.bottom,
    )
    setShift({ x: grab.baseX + dx, y: grab.baseY + dy })
  }

  const onPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    if (grabRef.current?.pointer !== event.pointerId) return
    grabRef.current = null
  }

  return {
    style: { translate: `${shift.x}px ${shift.y}px` } as React.CSSProperties,
    handle: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  }
}

export type WindowDrag = ReturnType<typeof useWindowDrag>

export const AppArea: React.FC<{
  app: AppId
  className: string
  desktop: DesktopState
  activate: (app: AppId) => void
  activateOnFocus?: boolean
  children: React.ReactNode
}> = ({ app, className, desktop, activate, activateOnFocus, children }) => {
  const appWindow = desktop.apps[app]
  return (
    <div
      className={className}
      data-hidden={!appWindow.open || appWindow.minimized}
      data-active={desktop.active === app}
      onPointerDownCapture={() => activate(app)}
      onFocusCapture={activateOnFocus ? () => activate(app) : undefined}
    >
      {appWindow.open && children}
    </div>
  )
}
