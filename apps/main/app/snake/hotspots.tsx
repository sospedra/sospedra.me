import type React from 'react'
import { isKeyboardClick } from 'services/keyboard-click'
import type { Dir } from './engine'
import css from './hotspots.module.css'

export const KEY_TURNS: Record<string, Dir> = {
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  '2': 'up',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  '4': 'left',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  '8': 'down',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  '6': 'right',
}

export const KEY_SELECT = new Set(['5', 'Enter', ' '])

const DIR_SPOT: Record<Dir, string> = {
  up: '2',
  left: '4',
  down: '8',
  right: '6',
}

export const spotForKey = (key: string) => {
  const dir = KEY_TURNS[key]
  if (dir) return DIR_SPOT[dir]
  return KEY_SELECT.has(key) ? '5' : null
}

type HotspotZone = {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export type Hotspot =
  | (HotspotZone & { kind: 'key' })
  | (HotspotZone & { kind: 'select'; label: string })
  | (HotspotZone & { kind: 'dir'; label: string; dir: Dir })

// percent rects measured over public/images/nokia-3310.webp
export const HOTSPOTS: Hotspot[] = [
  {
    id: 'navi',
    kind: 'select',
    x: 29.5,
    y: 50.3,
    width: 41,
    height: 5.5,
    label: 'Start or pause',
  },
  { id: 'soft-left', kind: 'key', x: 13.3, y: 53.7, width: 21.9, height: 8.7 },
  { id: 'soft-right', kind: 'key', x: 54.2, y: 56.2, width: 26, height: 7.5 },
  { id: '1', kind: 'key', x: 10.2, y: 65.5, width: 21, height: 6.2 },
  {
    id: '2',
    kind: 'dir',
    x: 39.1,
    y: 67.2,
    width: 21,
    height: 6.2,
    label: 'Steer up',
    dir: 'up',
  },
  { id: '3', kind: 'key', x: 68.8, y: 65.1, width: 21, height: 6.2 },
  {
    id: '4',
    kind: 'dir',
    x: 11.7,
    y: 72.5,
    width: 21,
    height: 6.2,
    label: 'Steer left',
    dir: 'left',
  },
  {
    id: '5',
    kind: 'select',
    x: 39.8,
    y: 74.2,
    width: 21,
    height: 6.2,
    label: 'Start or pause',
  },
  {
    id: '6',
    kind: 'dir',
    x: 68,
    y: 72.2,
    width: 21,
    height: 6.2,
    label: 'Steer right',
    dir: 'right',
  },
  { id: '7', kind: 'key', x: 13.3, y: 79.6, width: 21, height: 6.2 },
  {
    id: '8',
    kind: 'dir',
    x: 39.8,
    y: 81.3,
    width: 21,
    height: 6.2,
    label: 'Steer down',
    dir: 'down',
  },
  { id: '9', kind: 'key', x: 67.2, y: 79.2, width: 21, height: 6.2 },
  { id: 'star', kind: 'key', x: 14.1, y: 86.6, width: 21, height: 6.2 },
  { id: '0', kind: 'key', x: 39.8, y: 87.7, width: 21, height: 6.2 },
  { id: 'hash', kind: 'key', x: 66.4, y: 86.3, width: 21, height: 6.2 },
]

const MIN_TOUCH_TARGET = 44
const ACTIONABLE_HOTSPOTS = HOTSPOTS.filter((spot) => spot.kind !== 'key')

export const nearestActionableHotspot = (
  phone: HTMLElement,
  point: { x: number; y: number },
): Hotspot | null => {
  const phoneRect = phone.getBoundingClientRect()
  const candidates = ACTIONABLE_HOTSPOTS.flatMap((spot) => {
    const button = phone.querySelector<HTMLButtonElement>(
      `[data-hotspot="${spot.id}"]`,
    )
    if (!button) return []
    const rect = button.getBoundingClientRect()
    const xSlop = Math.max(0, (MIN_TOUCH_TARGET - rect.width) / 2)
    const ySlop = Math.max(0, (MIN_TOUCH_TARGET - rect.height) / 2)
    if (
      point.x < rect.left - xSlop ||
      point.x > rect.right + xSlop ||
      point.y < rect.top - ySlop ||
      point.y > rect.bottom + ySlop
    ) {
      return []
    }

    const centerX =
      phoneRect.left + ((spot.x + spot.width / 2) / 100) * phoneRect.width
    const centerY =
      phoneRect.top + ((spot.y + spot.height / 2) / 100) * phoneRect.height
    return [
      {
        distance: (point.x - centerX) ** 2 + (point.y - centerY) ** 2,
        spot,
      },
    ]
  })

  candidates.sort((a, b) => a.distance - b.distance)
  return candidates[0]?.spot ?? null
}

// taps act on pointerdown, so pointer clicks must not act a second time
export const pressProps = (act: () => void) => ({
  onPointerDown: () => act(),
  onClick: (event: React.MouseEvent) => {
    if (isKeyboardClick(event)) act()
  },
})

export function HotspotButton({
  spot,
  down,
  act,
  press,
}: {
  spot: Hotspot
  down: boolean
  act: () => void
  press: (down: boolean) => void
}) {
  const props = pressProps(act)
  const label = spot.kind === 'key' ? undefined : spot.label
  return (
    <button
      type='button'
      data-hotspot={spot.id}
      className={down ? `${css.hotspot} ${css.down}` : css.hotspot}
      style={
        {
          '--hotspot-left': `${spot.x}%`,
          '--hotspot-top': `${spot.y}%`,
          '--hotspot-width': `${spot.width}%`,
          '--hotspot-height': `${spot.height}%`,
          '--hotspot-bottom': `${spot.y + spot.height}%`,
        } as React.CSSProperties
      }
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      tabIndex={label ? undefined : -1}
      onClick={props.onClick}
      onPointerDown={() => {
        press(true)
        props.onPointerDown()
      }}
      onPointerUp={() => press(false)}
      onPointerLeave={() => press(false)}
      onPointerCancel={() => press(false)}
    />
  )
}
