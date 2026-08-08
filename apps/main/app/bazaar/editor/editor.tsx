'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { regimeAt } from '../decor'
import { decorStore, stageSimStore } from '../decor-store'
import { reapplyChrome, scrubStaleChromeStorage } from './chrome-store'
import Dock from './dock'
import {
  applyDrag,
  applyResize,
  chromeResizeState,
  type Drag,
  type HandleKind,
  handleDown,
  nodeResizeState,
  type Resize,
  settleDrag,
  settleResize,
  spawnFromDrag,
  swallowClick,
} from './gestures'
import { handleEditorKey } from './keys'
import Overlay from './overlay'
import { editEl } from './probe'
import {
  anchorPickStore,
  dragSpawnStore,
  getNode,
  hoverStore,
  selectionStore,
  stageSizeStore,
  suSimStore,
} from './store'

const usePointerControls = () => {
  const drag = useRef<Drag | null>(null)
  const resize = useRef<Resize | null>(null)

  useEffect(() => {
    const down = (event: PointerEvent) => handleDown(event, drag)

    const move = (event: PointerEvent) => {
      if (resize.current) {
        event.preventDefault()
        applyResize(resize.current, event)
        return
      }
      if (!drag.current) return
      event.preventDefault()
      applyDrag(drag.current, event)
    }

    const up = (event: PointerEvent) => {
      if (spawnFromDrag(event)) return
      settleResize(resize.current)
      resize.current = null
      settleDrag(drag.current)
      drag.current = null
    }

    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointermove', move, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('click', swallowClick, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('click', swallowClick, true)
    }
  }, [])

  return (kind: HandleKind) => (event: React.PointerEvent) => {
    const selection = selectionStore.get()
    if (!selection) return
    const el = editEl(selection.id)
    if (!el) return
    event.preventDefault()
    event.stopPropagation()
    const rect = el.getBoundingClientRect()
    resize.current =
      selection.kind === 'node'
        ? nodeResizeState(selection.id, kind, event, rect)
        : chromeResizeState(selection.id, kind, event, rect)
  }
}

const useKeyboard = () => {
  useEffect(() => {
    document.addEventListener('keydown', handleEditorKey)
    return () => document.removeEventListener('keydown', handleEditorKey)
  }, [])
}

const useStageWiring = () => {
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>('[data-bazaar-stage]')
    if (!stage) return
    const measure = () =>
      stageSizeStore.set({ w: stage.offsetWidth, h: stage.offsetHeight })
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    measure()
    scrubStaleChromeStorage()
    reapplyChrome()
    let regime = regimeAt(stage.offsetWidth)
    const unsubscribeSize = stageSizeStore.subscribe(() => {
      const next = regimeAt(stageSizeStore.get().w)
      if (next === regime) return
      regime = next
      reapplyChrome()
    })
    const unsubscribePick = anchorPickStore.subscribe(() => {
      if (anchorPickStore.get()) stage.setAttribute('data-anchor-pick', '')
      else stage.removeAttribute('data-anchor-pick')
    })
    const unsubscribeDoc = decorStore.subscribe(() => {
      const selection = selectionStore.get()
      if (selection?.kind === 'node' && !getNode(selection.id)) {
        selectionStore.set(null)
      }
    })
    return () => {
      observer.disconnect()
      unsubscribeSize()
      unsubscribePick()
      unsubscribeDoc()
      stage.removeAttribute('data-anchor-pick')
      stageSimStore.set(null)
      suSimStore.set(null)
      anchorPickStore.set(null)
      dragSpawnStore.set(null)
      hoverStore.set(null)
    }
  }, [])
}

/** the bazaar maintenance terminal: canvas controls plus the dock */
export default function Editor() {
  useStageWiring()
  useKeyboard()
  const startResize = usePointerControls()
  return createPortal(
    <>
      <Dock />
      <Overlay startResize={startResize} />
    </>,
    document.body,
  )
}
