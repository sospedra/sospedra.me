import { indexNodes, isSpotKind, rootCornerOf } from '../decor'
import { decorStore } from '../decor-store'
import { chromePatchOf, editChrome } from './chrome-store'
import { parsePair } from './gestures'
import { redo, undo } from './history'
import { CORNER_SIGN } from './probe'
import {
  anchorPickStore,
  currentRegime,
  duplicateNode,
  editNode,
  editPlacement,
  getNode,
  keysStore,
  removeNode,
  resolvedPlacement,
  round1,
  save,
  selectionStore,
  toggleRegime,
} from './store'

const nudgeSelection = (dx: number, dy: number) => {
  const selection = selectionStore.get()
  if (!selection) return
  if (selection.kind === 'chrome') {
    const base = parsePair(chromePatchOf(selection.id).translate)
    editChrome(selection.id, {
      translate: `${Math.round(base.x + dx)}px ${Math.round(base.y + dy)}px`,
    })
    return
  }
  const node = getNode(selection.id)
  if (!node) return
  const sign = CORNER_SIGN[rootCornerOf(indexNodes(decorStore.get()), node)]
  const place = resolvedPlacement(node)
  editPlacement(selection.id, {
    x: round1(place.x + dx * sign.x),
    y: round1(place.y + dy * sign.y),
  })
}

const deleteSelection = () => {
  const selection = selectionStore.get()
  if (!selection) return
  if (selection.kind === 'node') {
    removeNode(selection.id)
    return
  }
  editChrome(selection.id, { display: 'none' })
}

const nudgeZ = (delta: number) => {
  const selection = selectionStore.get()
  if (!selection) return
  if (selection.kind === 'node') {
    const node = getNode(selection.id)
    if (node) editNode(selection.id, { z: node.z + delta })
    return
  }
  const current =
    Number.parseInt(chromePatchOf(selection.id).zIndex ?? '', 10) || 0
  editChrome(selection.id, { zIndex: String(current + delta) })
}

const escapeAction = () => {
  if (anchorPickStore.get()) anchorPickStore.set(null)
  else selectionStore.set(null)
}

const flipSelection = () => {
  const selection = selectionStore.get()
  if (selection?.kind !== 'node') return
  const node = getNode(selection.id)
  if (node && !isSpotKind(node.kind)) {
    editNode(selection.id, { flip: node.flip ? undefined : true })
  }
}

const hideSelectionHere = () => {
  const selection = selectionStore.get()
  if (selection?.kind === 'node') toggleRegime(selection.id, currentRegime())
}

const duplicateSelection = () => {
  const selection = selectionStore.get()
  if (selection?.kind === 'node') duplicateNode(selection.id)
}

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

const arrowStep = (event: KeyboardEvent) => {
  if (event.shiftKey) return 10
  if (event.altKey) return 0.1
  return 1
}

const PLAIN_KEYS: Record<string, () => void> = {
  Escape: escapeAction,
  Backspace: deleteSelection,
  Delete: deleteSelection,
  '?': () => keysStore.set(!keysStore.get()),
  '[': () => nudgeZ(-1),
  ']': () => nudgeZ(1),
  f: flipSelection,
  h: hideSelectionHere,
}

const META_KEYS: Record<string, () => void> = {
  z: undo,
  s: save,
  d: duplicateSelection,
}

const handleMetaKey = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()
  const action = META_KEYS[key]
  if (!action) return
  event.preventDefault()
  if (key === 'z' && event.shiftKey) {
    redo()
    return
  }
  action()
}

const handlePlainKey = (event: KeyboardEvent) => {
  const arrow = ARROWS[event.key]
  if (arrow && selectionStore.get()) {
    event.preventDefault()
    const step = arrowStep(event)
    nudgeSelection(arrow[0] * step, arrow[1] * step)
    return
  }
  PLAIN_KEYS[event.key]?.()
}

export const handleEditorKey = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (target.closest('input, textarea, [contenteditable]')) return
  if (event.metaKey || event.ctrlKey) {
    handleMetaKey(event)
    return
  }
  handlePlainKey(event)
}
