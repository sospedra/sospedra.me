'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DECO_INVENTORY } from './deco-inventory'
import { GLOW_COLORS } from './decor-manifest'
import scene from './scene.module.css'

type Sel = { el: HTMLElement; id: string }

type HandleKind = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'

/* a full element-width drag changes scale by 40%: relaxed on purpose */
const SCALE_DAMP = 0.4

const DECO = '/images/bazaar/deco'

type SpawnKind = 'deco' | 'glow' | 'shadow'

type SpawnItem = {
  key: string
  kind: SpawnKind
  ref: string
  target: string
  x: number
  y: number
  w: number
  h: number
  z: number
}

/* z law: wf 0 · stairs 1 · props 2+ · stalls 3 · glows 4+ · seps 5 */
const SPAWN_DEFAULTS: Record<SpawnKind, { w: number; h: number; z: number }> = {
  deco: { w: 0, h: 160, z: 2 },
  glow: { w: 220, h: 220, z: 4 },
  shadow: { w: 220, h: 110, z: 4 },
}

/* spawn heights in su, baked from the editor session (the sizes
   that made each prop's art-pixel grain sit right in the scene) */
const SPAWN_H: Record<string, number> = {
  'archive-box': 120,
  'barrel-dented': 152,
  'bowl-tower': 83,
  'bulb-string': 68,
  'bulkhead-lamp': 55,
  'cable-drop': 220,
  'candle-pole': 415,
  'clip-wires': 62,
  'copper-pipe': 51,
  'crack-rebar': 120,
  'crate-stack': 180,
  'crt-pile': 148,
  'damp-stain': 92,
  'desk-lamp': 39,
  'exit-box': 48,
  'flyer-patch': 120,
  'graffiti-tag': 88,
  'joystick-bin': 86,
  'lantern-string': 66,
  'maneki-neko': 106,
  'map-barrel': 203,
  'menu-board': 138,
  'neon-column': 249,
  'noodle-vending': 172,
  'oil-drum': 144,
  'pachinko-husk': 310,
  'pendant-lamp': 175,
  'plant-basket': 168,
  'pulley-hook': 184,
  'rust-bleed': 80,
  'server-tower': 168,
  'sodium-pack': 79,
  'soot-vent': 120,
  standee: 248,
  'stencil-arrow': 62,
  'suitcase-stack': 128,
  toolbox: 70,
  'trash-pile': 78,
  'tube-light': 42,
  'tv-cart': 164,
  'wall-pallet': 144,
  'water-station': 120,
  'wheatpaste-ad': 50,
}

/* unknowns: the batch renders ~400px tall; median approved ratio is ~2.9 */
const FALLBACK_PX_PER_SU = 2.9

const GLOW_KEYS = Object.keys(GLOW_COLORS).filter((key) => key !== 'black')

const translateOf = (el: HTMLElement) => {
  const [x = '0', y = '0'] = el.style.translate.split(' ')
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 }
}

const visibleFloors = () =>
  [...document.querySelectorAll<HTMLElement>('[data-floor]')].filter(
    (f) => f.offsetParent !== null,
  )

const marketFloors = () =>
  visibleFloors().filter((f) => f.dataset.marketIndex !== undefined)

const streetFloor = () =>
  visibleFloors().find((f) => f.dataset.marketIndex === undefined) ?? null

const targetHost = (target: string) => {
  if (target === 'street') return streetFloor()
  const [kind, index] = target.split(':')
  if (kind === 'floor') return marketFloors()[Number(index)] ?? null
  return document.querySelector<HTMLElement>(`[data-bazaar-sep="${index}"]`)
}

/** the street keeps its own su; measure whatever var(--su) resolves
    to inside the host instead of assuming the page scale */
const hostSu = (host: HTMLElement) => {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:absolute;visibility:hidden;height:0;width:calc(var(--su) * 1000)'
  host.appendChild(probe)
  const su = probe.getBoundingClientRect().width / 1000
  probe.remove()
  return su || 1
}

/** the floor or sep band under the viewport center; nearest floor otherwise */
const centerHost = () => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  for (const hit of document.elementsFromPoint(cx, cy)) {
    const floor = (hit as HTMLElement).closest<HTMLElement>(
      '[data-market-index]',
    )
    if (floor)
      return { host: floor, target: `floor:${floor.dataset.marketIndex}` }
    const sep = (hit as HTMLElement).closest<HTMLElement>('[data-bazaar-sep]')
    if (sep) return { host: sep, target: `sep:${sep.dataset.bazaarSep}` }
    const street = (hit as HTMLElement).closest<HTMLElement>('[data-floor]')
    if (street && street.dataset.marketIndex === undefined) {
      return { host: street, target: 'street' }
    }
  }
  const nearest = marketFloors().toSorted((a, b) => {
    const da = Math.abs(a.getBoundingClientRect().top + a.offsetHeight / 2 - cy)
    const db = Math.abs(b.getBoundingClientRect().top + b.offsetHeight / 2 - cy)
    return da - db
  })[0]
  if (!nearest) return null
  return { host: nearest, target: `floor:${nearest.dataset.marketIndex}` }
}

/** px per sim unit, measured from any visible market floor (597 su tall) */
const measureSu = () => {
  const market = visibleFloors().find((f) => f.dataset.marketIndex)
  return market ? market.getBoundingClientRect().height / 597 : 1
}

/** smallest edit target under the pointer — occluded items stay pickable */
const pickAt = (x: number, y: number) => {
  const hits = new Set<HTMLElement>()
  for (const el of document.elementsFromPoint(x, y)) {
    const target = (el as HTMLElement).closest<HTMLElement>('[data-edit-id]')
    if (target) hits.add(target)
  }
  return [...hits].toSorted((a, b) => {
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    return ra.width * ra.height - rb.width * rb.height
  })[0]
}

/** everything anchored to rootId, transitively; drags follow, scales don't */
const dependentsOf = (rootId: string) => {
  const all = [...document.querySelectorAll<HTMLElement>('[data-edit-anchor]')]
  const out: HTMLElement[] = []
  const queue = [rootId]
  while (queue.length > 0) {
    const id = queue.pop()
    for (const el of all) {
      if (el.dataset.editAnchor !== id || out.includes(el)) continue
      out.push(el)
      if (el.dataset.editId) queue.push(el.dataset.editId)
    }
  }
  return out
}

type LayoutEntry = {
  id: string
  floor: number
  host?: string
  spawn?: string
  x: number
  y: number
  w: number
  h: number
  scale: number
  scaleY: number
  z: number | null
  bright: number
  opacity: number
  anchor?: string
  ax?: number
  ay?: number
}

const layoutEntry = (el: HTMLElement, su: number): LayoutEntry => {
  const floor = el.closest<HTMLElement>('[data-floor]')
  const sep = el.closest<HTMLElement>('[data-bazaar-sep]')
  const street = floor && floor.dataset.marketIndex === undefined ? floor : null
  const rect = el.getBoundingClientRect()
  const stageRect = floor
    ?.querySelector<HTMLElement>('[data-stage]')
    ?.getBoundingClientRect()
  const containerRect =
    sep?.getBoundingClientRect() ??
    (stageRect && stageRect.width > 0 ? stageRect : undefined) ??
    floor?.getBoundingClientRect()
  const localSu = street ? hostSu(street) : su
  const rel = (v: number) => Math.round((v / localSu) * 10) / 10
  const entry: LayoutEntry = {
    id: el.dataset.editId ?? '?',
    floor: floor ? visibleFloors().indexOf(floor) : -1,
    x: rel(rect.left - (containerRect?.left ?? 0)),
    y: rel(rect.top - (containerRect?.top ?? 0)),
    w: rel(rect.width),
    h: rel(rect.height),
    bright:
      Number.parseFloat(
        /brightness\(([\d.]+)\)/.exec(el.style.filter)?.[1] ?? '1',
      ) || 1,
    opacity: Number.parseFloat(el.style.opacity || '1') || 1,
    scale: Number.parseFloat(el.style.scale.split(' ')[0] || '1') || 1,
    scaleY:
      Number.parseFloat(
        el.style.scale.split(' ')[1] ?? el.style.scale.split(' ')[0] ?? '1',
      ) || 1,
    z: el.style.zIndex === '' ? null : Number.parseInt(el.style.zIndex, 10),
  }
  if (sep) entry.host = `sep:${sep.dataset.bazaarSep}`
  if (street) entry.host = 'street'
  if (el.dataset.editSpawn) entry.spawn = el.dataset.editSpawn
  const anchorId = el.dataset.editAnchor
  if (anchorId) {
    const target =
      floor?.querySelector<HTMLElement>(`[data-edit-id="${anchorId}"]`) ??
      document.querySelector<HTMLElement>(`[data-edit-id="${anchorId}"]`)
    if (target) {
      const ar = target.getBoundingClientRect()
      entry.anchor = anchorId
      entry.ax = rel(rect.left - ar.left)
      entry.ay = rel(rect.top - ar.top)
    }
  }
  return entry
}

const GLOBAL_CSS = `
body.bazaar-editing [data-edit-id] {
  outline: 1px dashed rgb(55 247 224 / 0.55);
  outline-offset: 1px;
  cursor: move;
  pointer-events: auto !important;
}
body.bazaar-editing [data-edit-id]:hover {
  outline-color: rgb(255 210 107 / 0.9);
}
`

const HANDLES: { kind: HandleKind; cursor: string }[] = [
  { kind: 'tl', cursor: 'nwse-resize' },
  { kind: 't', cursor: 'ns-resize' },
  { kind: 'tr', cursor: 'nesw-resize' },
  { kind: 'l', cursor: 'ew-resize' },
  { kind: 'r', cursor: 'ew-resize' },
  { kind: 'bl', cursor: 'nesw-resize' },
  { kind: 'b', cursor: 'ns-resize' },
  { kind: 'br', cursor: 'nwse-resize' },
]

const handlePos = (kind: HandleKind, r: DOMRect) => {
  const cx = r.left + r.width / 2 - 5
  const cy = r.top + r.height / 2 - 5
  const x = kind.includes('l')
    ? r.left - 5
    : kind.includes('r')
      ? r.right - 5
      : cx
  const y = kind.includes('t')
    ? r.top - 5
    : kind.includes('b')
      ? r.bottom - 5
      : cy
  return { left: x, top: y }
}

/** drag = move; corners scale KEEPING aspect; edges scale one axis; damped.
    Moving an element drags everything anchored to it; scaling never does. */
export default function LayoutEditor({ enabled }: { enabled: boolean }) {
  const [sel, setSel] = useState<Sel | null>(null)
  const [, bump] = useState(0)
  const [items, setItems] = useState<SpawnItem[]>([])
  const [showList, setShowList] = useState(true)
  const [filter, setFilter] = useState('')
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(
    null,
  )
  const touched = useRef(new Set<HTMLElement>())
  const anchorPick = useRef<HTMLElement | null>(null)
  const removed = useRef<{ id: string; floor: number }[]>([])
  const spawnCounter = useRef(0)
  const pendingSel = useRef<string | null>(null)
  const panelDrag = useRef<{
    startX: number
    startY: number
    baseX: number
    baseY: number
  } | null>(null)
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

  /* spawned items render with the editor off too: toggle to preview clean */
  const spawnNodes = items.map((item) => {
    const host = targetHost(item.target)
    if (!host) return null
    const base: React.CSSProperties = {
      position: 'absolute',
      left: `calc(var(--su) * ${item.x})`,
      top: `calc(var(--su) * ${item.y})`,
      zIndex: item.z,
      pointerEvents: 'none',
    }
    const node =
      item.kind === 'deco' ? (
        <img
          src={`${DECO}/${item.ref}.png`}
          alt=''
          draggable={false}
          data-edit-id={item.key}
          data-edit-spawn={`${item.kind}:${item.ref}`}
          style={{
            ...base,
            height: `calc(var(--su) * ${item.h})`,
            imageRendering: 'pixelated',
          }}
        />
      ) : (
        <div
          aria-hidden
          data-edit-id={item.key}
          data-edit-spawn={`${item.kind}:${item.ref}`}
          style={{
            ...base,
            width: `calc(var(--su) * ${item.w})`,
            height: `calc(var(--su) * ${item.h})`,
            background: `radial-gradient(ellipse, ${GLOW_COLORS[item.ref]} 0%, transparent 68%)`,
            mixBlendMode: item.kind === 'shadow' ? 'multiply' : 'screen',
          }}
        />
      )
    return createPortal(node, host, item.key)
  })

  if (!enabled) return <>{spawnNodes}</>

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

  const onPanelTitleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const panel = e.currentTarget.parentElement
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const base = panelPos ?? { x: rect.left, y: rect.top }
    panelDrag.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: base.x,
      baseY: base.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPanelTitleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = panelDrag.current
    if (!d) return
    setPanelPos({
      x: d.baseX + e.clientX - d.startX,
      y: d.baseY + e.clientY - d.startY,
    })
  }

  const shownProps = DECO_INVENTORY.filter((id) => id.includes(filter))

  return (
    <>
      {spawnNodes}
      {createPortal(
        <>
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static editor-only stylesheet */}
          <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
          {selRect &&
            HANDLES.map(({ kind, cursor }) => (
              <div
                key={kind}
                className={scene.editHandle}
                style={{ ...handlePos(kind, selRect), cursor }}
                onPointerDown={grabHandle(kind)}
              />
            ))}
          <div
            className={scene.editPanel}
            style={{
              width: 312,
              maxHeight: 'calc(100vh - 5rem)',
              overflowY: 'auto',
              ...(panelPos && {
                left: panelPos.x,
                top: panelPos.y,
                right: 'auto',
                bottom: 'auto',
              }),
            }}
          >
            <div
              className={scene.editPanelTitle}
              style={{ cursor: 'grab', touchAction: 'none' }}
              onPointerDown={onPanelTitleDown}
              onPointerMove={onPanelTitleMove}
              onPointerUp={() => {
                panelDrag.current = null
              }}
            >
              layout editor v5 ⠿
            </div>
            <div>drag = move · corners = scale · edges = one axis</div>
            {selected ? (
              <div className={scene.editPanelSel}>
                <strong>{selected.id}</strong> f{selected.floor}
                {selected.host && <> {selected.host}</>}
                <br />x {selected.x} · y {selected.y}
                <br />w {selected.w} · h {selected.h} · s {selected.scale}×
                {selected.scaleY}
                {selected.z !== null && <> · z {selected.z}</>}
                {selected.anchor && (
                  <>
                    <br />
                    anchor {selected.anchor} +{selected.ax},{selected.ay}
                  </>
                )}
              </div>
            ) : (
              <div className={scene.editPanelSel}>click anything outlined</div>
            )}
            <div className={scene.editPanelRow}>
              <button
                type='button'
                onClick={() => {
                  if (!sel) return
                  anchorPick.current = anchorPick.current ? null : sel.el
                  bump((n) => n + 1)
                }}
              >
                {anchorPick.current ? 'click target…' : 'set anchor'}
              </button>
              <button
                type='button'
                onClick={() => {
                  if (!sel) return
                  delete sel.el.dataset.editAnchor
                  bump((n) => n + 1)
                }}
              >
                unanchor
              </button>
              <button type='button' onClick={() => nudgeBright(-0.1)}>
                dim
              </button>
              <button type='button' onClick={() => nudgeBright(0.1)}>
                bright
              </button>
            </div>
            <div className={scene.editPanelRow}>
              <button type='button' onClick={() => nudgeOpacity(-0.1)}>
                op-
              </button>
              <button type='button' onClick={() => nudgeOpacity(0.1)}>
                op+
              </button>
              <button type='button' onClick={() => nudgeZ(-1)}>
                z-
              </button>
              <button type='button' onClick={() => nudgeZ(1)}>
                z+
              </button>
              <button type='button' onClick={copyLayout}>
                copy ({touched.current.size + items.length})
              </button>
            </div>
            <div className={scene.editPanelRow}>
              <button type='button' onClick={deleteSelected}>
                delete
              </button>
              <button type='button' onClick={resetSelected}>
                reset sel
              </button>
              <button type='button' onClick={resetAll}>
                reset all
              </button>
            </div>
            <div className={scene.editPanelRow} style={{ marginTop: 8 }}>
              {GLOW_KEYS.map((key) => (
                <button
                  key={key}
                  type='button'
                  title={`glow ${key} — spawns at viewport center`}
                  style={{
                    width: 24,
                    height: 24,
                    background: GLOW_COLORS[key],
                    border: '1px solid #444',
                  }}
                  onClick={() => spawn('glow', key)}
                />
              ))}
              <button
                type='button'
                title='shadow — spawns at viewport center'
                style={{
                  width: 24,
                  height: 24,
                  background: '#000',
                  border: '1px solid #444',
                }}
                onClick={() => spawn('shadow', 'black')}
              />
              <button type='button' onClick={() => setShowList((v) => !v)}>
                {showList ? 'props ▴' : 'props ▾'}
              </button>
            </div>
            {showList && (
              <>
                <input
                  value={filter}
                  placeholder='filter props…'
                  onChange={(e) => setFilter(e.target.value)}
                  style={{
                    width: '100%',
                    margin: '4px 0',
                    padding: '3px 6px',
                    background: '#06070d',
                    border: '1px solid #444',
                    color: '#cfd3d8',
                    font: 'inherit',
                  }}
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 5,
                    maxHeight: 420,
                    overflowY: 'auto',
                  }}
                >
                  {shownProps.map((id) => (
                    <button
                      key={id}
                      type='button'
                      title={`${id} — spawns at viewport center`}
                      style={{
                        padding: 3,
                        background: '#141827',
                        border: '1px solid #333',
                        cursor: 'pointer',
                        color: '#8b93a2',
                      }}
                      onClick={() => spawn('deco', id)}
                    >
                      <img
                        src={`${DECO}/${id}.png`}
                        alt={id}
                        loading='lazy'
                        style={{
                          width: '100%',
                          height: 72,
                          objectFit: 'contain',
                        }}
                      />
                      <div
                        style={{
                          fontSize: 9,
                          lineHeight: '11px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {id}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
