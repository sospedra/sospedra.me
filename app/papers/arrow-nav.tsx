'use client'

import { useEffect } from 'react'

const ITEM_SELECTOR = '[data-arrow-item]'

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest('input, textarea, select, [contenteditable]'))

const shouldIgnoreKey = (event: KeyboardEvent) =>
  event.metaKey ||
  event.ctrlKey ||
  event.altKey ||
  event.shiftKey ||
  event.isComposing ||
  isEditableTarget(event.target)

const listItems = () =>
  Array.from(document.querySelectorAll<HTMLAnchorElement>(ITEM_SELECTOR))

const focusSibling = (delta: -1 | 1) => {
  const items = listItems()
  if (items.length === 0) return false

  const index = items.indexOf(document.activeElement as HTMLAnchorElement)
  const fallback = delta === 1 ? 0 : items.length - 1
  const target =
    index === -1
      ? items[fallback]
      : items[(index + delta + items.length) % items.length]

  target.focus()
  return true
}

const closestItem = (target: EventTarget | null) =>
  target instanceof Element ? target.closest(ITEM_SELECTOR) : null

const focusHoveredItem = (target: EventTarget | null) => {
  const item = closestItem(target)
  if (item instanceof HTMLElement && item !== document.activeElement) {
    item.focus()
  }
}

const blurDepartedItem = (event: PointerEvent) => {
  const item = closestItem(event.target)
  const destination = closestItem(event.relatedTarget)
  const leftTheItem =
    item instanceof HTMLElement &&
    item === document.activeElement &&
    destination !== item
  if (leftTheItem) item.blur()
}

const ARROW_DELTA: Record<string, 1 | -1> = { ArrowDown: 1, ArrowUp: -1 }

// arrow scrolling shifts the page under a resting mouse and fires pointerover;
// keyboard keeps the focus cursor until the mouse genuinely moves
function trackArrowNavigation() {
  let keyboardDriving = false

  const onKeyDown = (event: KeyboardEvent) => {
    if (shouldIgnoreKey(event)) return
    const delta = ARROW_DELTA[event.key]
    if (delta === undefined || !focusSibling(delta)) return
    keyboardDriving = true
    event.preventDefault()
  }

  const onPointerMove = () => {
    keyboardDriving = false
  }

  const onPointerOver = (event: PointerEvent) => {
    if (keyboardDriving) return
    focusHoveredItem(event.target)
  }

  const onPointerOut = (event: PointerEvent) => {
    if (keyboardDriving) return
    blurDepartedItem(event)
  }

  window.addEventListener('keydown', onKeyDown)
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerover', onPointerOver)
  document.addEventListener('pointerout', onPointerOut)
  return () => {
    window.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerover', onPointerOver)
    document.removeEventListener('pointerout', onPointerOut)
  }
}

// TV-remote nav: arrows walk the board, Enter reads, hover shares the focus
// cursor. Plain listeners: useHotkeys drops ArrowUp, the konami tracker owns it.
export default function ArrowNav() {
  useEffect(trackArrowNavigation, [])
  return null
}
