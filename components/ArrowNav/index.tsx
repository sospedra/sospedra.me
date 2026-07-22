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
  Array.from(document.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
    (item) => item.checkVisibility?.() ?? true,
  )

const focusSibling = (delta: -1 | 1) => {
  const items = listItems()
  if (items.length === 0) return false

  const index = items.indexOf(document.activeElement as HTMLElement)
  const fallback = delta === 1 ? 0 : items.length - 1
  const target =
    index === -1
      ? items[fallback]
      : items[(index + delta + items.length) % items.length]

  target.focus()
  return true
}

const activateFocusedItem = () => {
  const item = document.activeElement
  if (!(item instanceof HTMLElement) || !item.matches(ITEM_SELECTOR))
    return false
  item.click()
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

const KEY_DELTA: Record<string, 1 | -1> = {
  ArrowDown: 1,
  ArrowUp: -1,
  j: 1,
  k: -1,
}

// arrow scrolling shifts the page under a resting mouse and fires pointerover;
// keyboard keeps the focus cursor until the mouse genuinely moves
function trackArrowNavigation(activationKeys: string[]) {
  let keyboardDriving = false
  const activation = new Set(activationKeys)

  const onKeyDown = (event: KeyboardEvent) => {
    if (shouldIgnoreKey(event)) return
    if (activation.has(event.key) && activateFocusedItem()) {
      event.preventDefault()
      return
    }
    const delta = KEY_DELTA[event.key]
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

  // capture phase: j/k must claim the list cursor before the global
  // page-scroll trap sees the event (it skips defaultPrevented ones)
  window.addEventListener('keydown', onKeyDown, { capture: true })
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerover', onPointerOver)
  document.addEventListener('pointerout', onPointerOut)
  return () => {
    window.removeEventListener('keydown', onKeyDown, { capture: true })
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerover', onPointerOver)
    document.removeEventListener('pointerout', onPointerOut)
  }
}

// TV-remote nav for any screen marking rows with data-arrow-item: arrows or
// j/k walk the list, Enter follows natively, `o` (plus any extra activation
// keys) clicks the focused row. Hover shares the same focus cursor.
export default function ArrowNav(props: { activationKeys?: string[] }) {
  const keys = props.activationKeys?.join(' ') ?? 'o'
  useEffect(() => trackArrowNavigation(keys.split(' ')), [keys])
  return null
}
