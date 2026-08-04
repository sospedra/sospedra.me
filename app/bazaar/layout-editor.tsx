'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import EditorPanel, { type HandleKind } from './editor-panel'
import scene from './layout-editor.module.css'
import {
  DECO,
  FALLBACK_PX_PER_SU,
  SPAWN_DEFAULTS,
  SPAWN_H,
  type SpawnItem,
  type SpawnKind,
} from './spawn-catalog'
import SpawnLayer from './spawn-layer'
import SpawnTray from './spawn-tray'
import {
  centerHost,
  dependentsOf,
  hostSu,
  layoutEntry,
  measureSu,
  pickAt,
  translateOf,
} from './stage-probe'

type Sel = { el: HTMLElement; id: string }

/* a full element-width drag changes scale by 40%: relaxed on purpose */
const SCALE_DAMP = 0.4

/** drag = move; corners scale KEEPING aspect; edges scale one axis; damped.
    Moving an element drags everything anchored to it; scaling never does. */
export default function LayoutEditor({ enabled }: { enabled: boolean }) {
  const [sel, setSel] = useState<Sel | null>(null)
  const [, bump] = useState(0)
  const [items, setItems] = useState<SpawnItem[]>([])
  const touched = useRef(new Set<HTMLElement>())
  const anchorPick = useRef<HTMLElement | null>(null)
  const removed = useRef<{ id: string; floor: number }[]>([])
  const spawnCounter = useRef(0)
  const pendingSel = useRef<string | null>(null)
  const drag = useRef<{
    el: HTMLElement
    startX: number
    startY: number
    baseX: number
    baseY: number
    followers: { el: HTMLElement; baseX: number; baseY: number }[]
  } | null>(null)
  const resize = useRef<{
    el: HTMLElement
    kind: HandleKind
    startX: number
    startY: number
    baseSx: number
    baseSy: number
    w: number
    h: number
  } | null>(null)

  useEffect(() => {
    if (!enabled) return
    document.body.classList.add('bazaar-editing')
    return () => document.body.classList.remove('bazaar-editing')
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const clampScale = (v: number) => Math.min(6, Math.max(0.1, v))
    const round3 = (v: number) => Math.round(v * 1000) / 1000

    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest(`.${scene.editPanel}`)) return
      if ((e.target as HTMLElement).closest(`.${scene.editHandle}`)) return
      const el = pickAt(e.clientX, e.clientY)
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      const picker = anchorPick.current
      if (picker && el !== picker) {
        picker.dataset.editAnchor = el.dataset.editId
        touched.current.add(picker)
        anchorPick.current = null
        bump((n) => n + 1)
        return
      }
      if (picker) {
        anchorPick.current = null
        bump((n) => n + 1)
        return
      }
      const base = translateOf(el)
      const followers = (
        el.dataset.editId ? dependentsOf(el.dataset.editId) : []
      )
        .filter((f) => f !== el)
        .map((f) => {
          const t = translateOf(f)
          return { el: f, baseX: t.x, baseY: t.y }
        })
      drag.current = {
        el,
        startX: e.clientX,
        startY: e.clientY,
        baseX: base.x,
        baseY: base.y,
        followers,
      }
      setSel({ el, id: el.dataset.editId ?? '?' })
    }

    const move = (e: PointerEvent) => {
      const r = resize.current
      if (r) {
        e.preventDefault()
        const dx = e.clientX - r.startX
        const dy = e.clientY - r.startY
        let sx = r.baseSx
        let sy = r.baseSy
        if (r.kind === 'l' || r.kind === 'r') {
          const dir = r.kind === 'r' ? 1 : -1
          sx = clampScale(r.baseSx * (1 + (SCALE_DAMP * dir * dx) / r.w))
        } else if (r.kind === 't' || r.kind === 'b') {
          const dir = r.kind === 'b' ? 1 : -1
          sy = clampScale(r.baseSy * (1 + (SCALE_DAMP * dir * dy) / r.h))
        } else {
          /* corner: one uniform factor, aspect ratio held by construction */
          const ux = r.kind.includes('r') ? 1 : -1
          const uy = r.kind.includes('b') ? 1 : -1
          const along = ((ux * dx) / r.w + (uy * dy) / r.h) / 2
          const k = clampScale(1 + SCALE_DAMP * along)
          sx = clampScale(r.baseSx * k)
          sy = clampScale(r.baseSy * k)
        }
        r.el.style.transformOrigin = 'bottom center'
        r.el.style.scale = `${round3(sx)} ${round3(sy)}`
        touched.current.add(r.el)
        bump((n) => n + 1)
        return
      }
      const d = drag.current
      if (!d) return
      e.preventDefault()
      /* stalls ride the layout horizontally: the editor only moves them up/down */
      const dx = d.el.dataset.stall !== undefined ? 0 : e.clientX - d.startX
      const dy = e.clientY - d.startY
      d.el.style.translate = `${d.baseX + dx}px ${d.baseY + dy}px`
      touched.current.add(d.el)
      for (const follower of d.followers) {
        follower.el.style.translate = `${follower.baseX + dx}px ${follower.baseY + dy}px`
        touched.current.add(follower.el)
      }
      bump((n) => n + 1)
    }

    const up = () => {
      drag.current = null
      resize.current = null
    }
    const swallowClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(`.${scene.editPanel}`)) return
      if ((e.target as HTMLElement).closest('[data-edit-id]')) {
        e.preventDefault()
        e.stopPropagation()
      }
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
      drag.current = null
      resize.current = null
    }
  }, [enabled])

  useEffect(() => {
    if (!sel) return
    sel.el.classList.add(scene.editSel)
    return () => sel.el.classList.remove(scene.editSel)
  }, [sel])

  /* a fresh spawn selects itself once its portal lands in the DOM */
  useEffect(() => {
    const key = pendingSel.current
    if (!key) return
    const el = document.querySelector<HTMLElement>(`[data-edit-id="${key}"]`)
    if (!el) return
    pendingSel.current = null
    setSel({ el, id: key })
  }, [items])

  if (typeof document === 'undefined') return null

  if (!enabled) return <SpawnLayer items={items} />

  const su = measureSu()
  const selected = sel ? layoutEntry(sel.el, su) : null
  const selRect = sel?.el.getBoundingClientRect()

  const grabHandle = (kind: HandleKind) => (e: React.PointerEvent) => {
    if (!sel) return
    e.preventDefault()
    e.stopPropagation()
    const rect = sel.el.getBoundingClientRect()
    const [bx = '1', by] = sel.el.style.scale.split(' ')
    resize.current = {
      el: sel.el,
      kind,
      startX: e.clientX,
      startY: e.clientY,
      baseSx: Number.parseFloat(bx) || 1,
      baseSy: Number.parseFloat(by ?? bx) || 1,
      w: Math.max(24, rect.width),
      h: Math.max(24, rect.height),
    }
  }

  const toggleAnchorPick = () => {
    if (!sel) return
    anchorPick.current = anchorPick.current ? null : sel.el
    bump((n) => n + 1)
  }

  const clearAnchor = () => {
    if (!sel) return
    delete sel.el.dataset.editAnchor
    bump((n) => n + 1)
  }

  const nudgeBright = (delta: number) => {
    if (!sel) return
    const current =
      Number.parseFloat(
        /brightness\(([\d.]+)\)/.exec(sel.el.style.filter)?.[1] ?? '1',
      ) || 1
    const next = Math.min(3, Math.max(0.1, current + delta))
    sel.el.style.filter = `brightness(${Math.round(next * 100) / 100})`
    touched.current.add(sel.el)
    bump((n) => n + 1)
  }

  const nudgeOpacity = (delta: number) => {
    if (!sel) return
    const current = Number.parseFloat(sel.el.style.opacity || '1') || 1
    const next = Math.min(1, Math.max(0.05, current + delta))
    sel.el.style.opacity = String(Math.round(next * 100) / 100)
    touched.current.add(sel.el)
    bump((n) => n + 1)
  }

  const nudgeZ = (delta: number) => {
    if (!sel) return
    const current =
      sel.el.style.zIndex !== ''
        ? Number.parseInt(sel.el.style.zIndex, 10)
        : Number.parseInt(getComputedStyle(sel.el).zIndex, 10) || 0
    sel.el.style.zIndex = String(current + delta)
    touched.current.add(sel.el)
    bump((n) => n + 1)
  }

  /** drop the item at the viewport center, clamped inside the host box */
  const placeAtCenter = (
    kind: SpawnKind,
    ref: string,
    w: number,
    h: number,
    centerW: number,
  ) => {
    const spot = centerHost()
    if (!spot) return
    const suNow = hostSu(spot.host)
    const rect = spot.host.getBoundingClientRect()
    const hostW = rect.width / suNow
    const hostH = rect.height / suNow
    const clamp = (v: number, max: number) =>
      Math.round(Math.min(Math.max(v, 0), Math.max(0, max)))
    spawnCounter.current += 1
    const key = `add:${kind}:${ref}:${spawnCounter.current}`
    pendingSel.current = key
    const item: SpawnItem = {
      key,
      kind,
      ref,
      target: spot.target,
      x: clamp(
        (window.innerWidth / 2 - rect.left) / suNow - centerW / 2,
        hostW - centerW,
      ),
      y: clamp((window.innerHeight / 2 - rect.top) / suNow - h / 2, hostH - h),
      w,
      h,
      z: SPAWN_DEFAULTS[kind].z,
    }
    setItems((current) => [...current, item])
  }

  const spawn = (kind: SpawnKind, ref: string) => {
    const defaults = SPAWN_DEFAULTS[kind]
    if (kind !== 'deco') {
      placeAtCenter(kind, ref, defaults.w, defaults.h, defaults.w)
      return
    }
    /* deco spawns at its approved size; unknowns via median ratio */
    const probe = new Image()
    probe.onload = () => {
      const h =
        SPAWN_H[ref] ??
        Math.min(420, Math.round(probe.naturalHeight / FALLBACK_PX_PER_SU)) ??
        defaults.h
      const centerW = Math.round((h * probe.naturalWidth) / probe.naturalHeight)
      placeAtCenter('deco', ref, 0, h, centerW)
    }
    probe.onerror = () =>
      placeAtCenter('deco', ref, 0, SPAWN_H[ref] ?? defaults.h, defaults.h)
    probe.src = `${DECO}/${ref}.png`
  }

  const copyLayout = () => {
    const entries = [...touched.current]
      .filter((el) => el.isConnected)
      .map((el) => layoutEntry(el, su))
    const payload = JSON.stringify(
      {
        su: Math.round(su * 1000) / 1000,
        items: entries,
        spawned: items,
        removed: removed.current,
      },
      null,
      2,
    )
    navigator.clipboard.writeText(payload)
    // biome-ignore lint/suspicious/noConsole: clipboard fallback, the console is the dump surface
    console.log('[bazaar layout]', payload)
  }

  const resetSelected = () => {
    if (!sel) return
    sel.el.style.translate = ''
    sel.el.style.scale = ''
    sel.el.style.zIndex = ''
    sel.el.style.filter = ''
    sel.el.style.opacity = ''
    touched.current.delete(sel.el)
    bump((n) => n + 1)
  }

  const deleteSelected = () => {
    if (!sel) return
    if (items.some((item) => item.key === sel.id)) {
      setItems((current) => current.filter((item) => item.key !== sel.id))
      setSel(null)
      return
    }
    const entry = layoutEntry(sel.el, su)
    removed.current.push({ id: entry.id, floor: entry.floor })
    sel.el.style.display = 'none'
    touched.current.delete(sel.el)
    setSel(null)
    bump((n) => n + 1)
  }

  const resetAll = () => {
    for (const el of touched.current) {
      el.style.translate = ''
      el.style.scale = ''
      el.style.zIndex = ''
      el.style.filter = ''
      el.style.opacity = ''
    }
    touched.current.clear()
    bump((n) => n + 1)
  }

  return (
    <>
      <SpawnLayer items={items} />
      {createPortal(
        <EditorPanel
          selRect={selRect}
          grabHandle={grabHandle}
          selected={selected}
          anchorPicking={anchorPick.current !== null}
          onSetAnchor={toggleAnchorPick}
          onUnanchor={clearAnchor}
          nudgeBright={nudgeBright}
          nudgeOpacity={nudgeOpacity}
          nudgeZ={nudgeZ}
          copyLayout={copyLayout}
          copyCount={touched.current.size + items.length}
          deleteSelected={deleteSelected}
          resetSelected={resetSelected}
          resetAll={resetAll}
        >
          <SpawnTray spawn={spawn} />
        </EditorPanel>,
        document.body,
      )}
    </>
  )
}
