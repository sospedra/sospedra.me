'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './bazaar4.module.css'
import { DECO_INVENTORY } from './deco-inventory'
import { GLOW_COLORS } from './decor-manifest'

type Sel = { el: HTMLElement; id: string }

const translateOf = (el: HTMLElement) => {
  const [x = '0', y = '0'] = el.style.translate.split(' ')
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 }
}

const visibleFloors = () =>
  [...document.querySelectorAll<HTMLElement>('[data-floor]')].filter(
    (f) => f.offsetParent !== null,
  )

/** px per sim unit, measured from any visible market floor (597 su tall) */
const measureSu = () => {
  const market = visibleFloors().find((f) => f.dataset.marketIndex)
  return market ? market.getBoundingClientRect().height / 597 : 1
}

/** smallest edit target under the pointer — occluded props stay pickable */
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

type LayoutEntry = {
  id: string
  floor: number
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
  const rect = el.getBoundingClientRect()
  const stage = floor?.querySelector<HTMLElement>('[data-stage]')
  const floorRect = (stage ?? floor)?.getBoundingClientRect()
  const rel = (v: number) => Math.round((v / su) * 10) / 10
  const entry: LayoutEntry = {
    id: el.dataset.editId ?? '?',
    floor: floor ? visibleFloors().indexOf(floor) : -1,
    x: rel(rect.left - (floorRect?.left ?? 0)),
    y: rel(rect.top - (floorRect?.top ?? 0)),
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
body.bz4-editing [data-edit-id] {
  outline: 1px dashed rgb(55 247 224 / 0.55);
  outline-offset: 1px;
  cursor: move;
}
body.bz4-editing [data-edit-id]:hover {
  outline-color: rgb(255 210 107 / 0.9);
}
`

/** drag to move, corner grabber to rescale, panel edits z + exports */
export default function LayoutEditor({ enabled }: { enabled: boolean }) {
  const [sel, setSel] = useState<Sel | null>(null)
  const [, bump] = useState(0)
  const touched = useRef(new Set<HTMLElement>())
  const anchorPick = useRef<HTMLElement | null>(null)
  const removed = useRef<{ id: string; floor: number }[]>([])
  const [invOpen, setInvOpen] = useState(false)
  const drag = useRef<{
    el: HTMLElement
    startX: number
    startY: number
    baseX: number
    baseY: number
  } | null>(null)
  const resize = useRef<{
    el: HTMLElement
    startDx: number
    startDy: number
    baseSx: number
    baseSy: number
  } | null>(null)

  useEffect(() => {
    if (!enabled) return
    document.body.classList.add('bz4-editing')
    return () => document.body.classList.remove('bz4-editing')
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest(`.${styles.editPanel}`)) return
      if ((e.target as HTMLElement).closest(`.${styles.editHandle}`)) return
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
      drag.current = {
        el,
        startX: e.clientX,
        startY: e.clientY,
        baseX: base.x,
        baseY: base.y,
      }
      setSel({ el, id: el.dataset.editId ?? '?' })
    }
    const move = (e: PointerEvent) => {
      const r = resize.current
      if (r) {
        e.preventDefault()
        const rect = r.el.getBoundingClientRect()
        const clampScale = (v: number) => Math.min(4, Math.max(0.15, v))
        const sx = clampScale(r.baseSx * ((e.clientX - rect.left) / r.startDx))
        const sy = clampScale(r.baseSy * ((e.clientY - rect.top) / r.startDy))
        r.el.style.transformOrigin = 'bottom center'
        r.el.style.scale = `${Math.round(sx * 1000) / 1000} ${Math.round(sy * 1000) / 1000}`
        touched.current.add(r.el)
        bump((n) => n + 1)
        return
      }
      const d = drag.current
      if (!d) return
      e.preventDefault()
      d.el.style.translate = `${d.baseX + e.clientX - d.startX}px ${d.baseY + e.clientY - d.startY}px`
      touched.current.add(d.el)
      bump((n) => n + 1)
    }
    const up = () => {
      drag.current = null
      resize.current = null
    }
    const swallowClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(`.${styles.editPanel}`)) return
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
    sel.el.classList.add(styles.editSel)
    return () => sel.el.classList.remove(styles.editSel)
  }, [sel])

  if (!enabled || typeof document === 'undefined') return null

  const su = measureSu()
  const selected = sel ? layoutEntry(sel.el, su) : null
  const selRect = sel?.el.getBoundingClientRect()

  const grabHandle = (e: React.PointerEvent) => {
    if (!sel) return
    e.preventDefault()
    e.stopPropagation()
    const rect = sel.el.getBoundingClientRect()
    const [bx = '1', by] = sel.el.style.scale.split(' ')
    resize.current = {
      el: sel.el,
      startDx: Math.max(8, e.clientX - rect.left),
      startDy: Math.max(8, e.clientY - rect.top),
      baseSx: Number.parseFloat(bx) || 1,
      baseSy: Number.parseFloat(by ?? bx) || 1,
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

  const copyLayout = () => {
    const items = [...touched.current]
      .filter((el) => el.isConnected)
      .map((el) => layoutEntry(el, su))
    const payload = JSON.stringify(
      {
        su: Math.round(su * 1000) / 1000,
        items,
        removed: removed.current,
      },
      null,
      2,
    )
    navigator.clipboard.writeText(payload)
    console.log('[bazaar4 layout]', payload)
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

  const spawnHost = () => {
    const floors = visibleFloors()
    const mid = window.innerHeight / 2
    const floor =
      floors.find((f) => {
        const r = f.getBoundingClientRect()
        return r.top < mid && r.bottom > mid
      }) ?? floors[0]
    if (!floor) return null
    const band = document.createElement('div')
    band.className = styles.floorStage
    band.dataset.stage = ''
    band.style.zIndex = '5'
    floor.appendChild(band)
    return band
  }

  const adopt = (band: HTMLElement, el: HTMLElement, editId: string) => {
    el.dataset.editId = editId
    el.dataset.editSpawned = '1'
    el.style.left = `calc(var(--su) * 690)`
    el.style.top = `calc(var(--su) * 300)`
    band.appendChild(el)
    touched.current.add(el)
    setSel({ el, id: editId })
  }

  const spawn = (name: string) => {
    const band = spawnHost()
    if (!band) return
    const img = document.createElement('img')
    img.src = `/images/bazaar4/deco/${name}.png`
    img.alt = ''
    img.draggable = false
    img.className = styles.decorItem
    img.style.height = `${Math.round(su * 120)}px`
    adopt(band, img, `deco:${name}`)
  }

  const spawnGlow = (color: string) => {
    const band = spawnHost()
    if (!band) return
    const div = document.createElement('div')
    div.className = styles.glowSpot
    div.style.width = `${Math.round(su * 220)}px`
    div.style.height = `${Math.round(su * 220)}px`
    div.style.background = `radial-gradient(circle, ${GLOW_COLORS[color]} 0%, transparent 68%)`
    div.style.pointerEvents = 'auto'
    adopt(band, div, `glow:${color}`)
  }

  const deleteSelected = () => {
    if (!sel) return
    if (sel.el.dataset.editSpawned) {
      touched.current.delete(sel.el)
      sel.el.parentElement?.remove()
    } else {
      const entry = layoutEntry(sel.el, su)
      removed.current.push({ id: entry.id, floor: entry.floor })
      sel.el.style.display = 'none'
      touched.current.delete(sel.el)
    }
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

  return createPortal(
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static editor-only stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      {selRect && (
        <div
          className={styles.editHandle}
          style={{ left: selRect.right - 8, top: selRect.bottom - 8 }}
          onPointerDown={grabHandle}
        />
      )}
      {invOpen && (
        <div className={styles.editInv}>
          <div className={styles.editPanelTitle}>
            inventory — click to place on the centered floor
          </div>
          <div className={styles.editInvGlows}>
            {Object.entries(GLOW_COLORS).map(([color, css]) => (
              <button
                key={color}
                type='button'
                className={styles.editInvGlow}
                title={`glow: ${color}`}
                style={{
                  background: `radial-gradient(circle, ${css} 0%, transparent 70%)`,
                }}
                onClick={() => spawnGlow(color)}
              >
                {color}
              </button>
            ))}
          </div>
          <div className={styles.editInvGrid}>
            {DECO_INVENTORY.map((name) => (
              <button
                key={name}
                type='button'
                className={styles.editInvItem}
                onClick={() => spawn(name)}
              >
                <img
                  src={`/images/bazaar4/deco/${name}.png`}
                  alt=''
                  loading='lazy'
                />
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={styles.editPanel}>
        <div className={styles.editPanelTitle}>layout editor</div>
        <div>drag = move · corner square = scale</div>
        {selected ? (
          <div className={styles.editPanelSel}>
            <strong>{selected.id}</strong> f{selected.floor}
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
          <div className={styles.editPanelSel}>click anything outlined</div>
        )}
        <div className={styles.editPanelRow}>
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
        </div>
        <div className={styles.editPanelRow}>
          <button type='button' onClick={() => nudgeBright(-0.1)}>
            dim
          </button>
          <button type='button' onClick={() => nudgeBright(0.1)}>
            bright
          </button>
          <button type='button' onClick={() => nudgeOpacity(-0.1)}>
            op-
          </button>
          <button type='button' onClick={() => nudgeOpacity(0.1)}>
            op+
          </button>
        </div>
        <div className={styles.editPanelRow}>
          <button type='button' onClick={() => nudgeZ(-1)}>
            z-
          </button>
          <button type='button' onClick={() => nudgeZ(1)}>
            z+
          </button>
          <button type='button' onClick={copyLayout}>
            copy ({touched.current.size})
          </button>
          <button type='button' onClick={deleteSelected}>
            delete
          </button>
          <button type='button' onClick={resetSelected}>
            reset sel
          </button>
          <button type='button' onClick={resetAll}>
            reset all
          </button>
          <button type='button' onClick={() => setInvOpen((p) => !p)}>
            {invOpen ? 'close inv' : 'inventory'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
