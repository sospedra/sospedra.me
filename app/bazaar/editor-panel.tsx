'use client'

import { useRef, useState } from 'react'
import scene from './layout-editor.module.css'
import type { LayoutEntry } from './stage-probe'

export type HandleKind = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'

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

const hideLabel = (hideBelow: LayoutEntry['hideBelow']) =>
  hideBelow ? `hide <${hideBelow} ▸` : 'show all ▸'

function SelectedInfo({ selected }: { selected: LayoutEntry | null }) {
  if (!selected) {
    return <div className={scene.editPanelSel}>click anything outlined</div>
  }
  return (
    <div className={scene.editPanelSel}>
      <strong>{selected.id}</strong> f{selected.floor}
      {selected.host && <> {selected.host}</>}
      <br />x {selected.x} · y {selected.y}
      <br />w {selected.w} · h {selected.h} · s {selected.scale}×
      {selected.scaleY}
      {selected.z !== null && <> · z {selected.z}</>}
      {selected.hideBelow !== undefined && (
        <>
          {' '}
          · hide {'<'}
          {selected.hideBelow}
        </>
      )}
      {selected.skin && <> · {selected.skin}</>}
      {selected.anchor && (
        <>
          <br />
          anchor {selected.anchor} +{selected.ax},{selected.ay}
        </>
      )}
    </div>
  )
}

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

export default function EditorPanel(props: {
  selRect: DOMRect | undefined
  grabHandle: (kind: HandleKind) => (e: React.PointerEvent) => void
  selected: LayoutEntry | null
  anchorPicking: boolean
  onSetAnchor: () => void
  onUnanchor: () => void
  onCycleHideBelow: () => void
  onCycleSkin: () => void
  nudgeBright: (delta: number) => void
  nudgeOpacity: (delta: number) => void
  nudgeZ: (delta: number) => void
  copyLayout: () => void
  copyCount: number
  deleteSelected: () => void
  resetSelected: () => void
  resetAll: () => void
  children: React.ReactNode
}) {
  const {
    selRect,
    grabHandle,
    selected,
    anchorPicking,
    onSetAnchor,
    onUnanchor,
    onCycleHideBelow,
    onCycleSkin,
    nudgeBright,
    nudgeOpacity,
    nudgeZ,
    copyLayout,
    copyCount,
    deleteSelected,
    resetSelected,
    resetAll,
    children,
  } = props
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(
    null,
  )
  const panelDrag = useRef<{
    startX: number
    startY: number
    baseX: number
    baseY: number
  } | null>(null)

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

  return (
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
        <SelectedInfo selected={selected} />
        <div className={scene.editPanelRow}>
          <button type='button' onClick={onSetAnchor}>
            {anchorPicking ? 'click target…' : 'set anchor'}
          </button>
          <button type='button' onClick={onUnanchor}>
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
            copy ({copyCount})
          </button>
        </div>
        <div className={scene.editPanelRow}>
          <button type='button' onClick={onCycleHideBelow}>
            {hideLabel(selected?.hideBelow)}
          </button>
          {(selected?.id.startsWith('sep:') ||
            selected?.id.startsWith('wall:')) && (
            <button type='button' onClick={onCycleSkin}>
              skin ▸
            </button>
          )}
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
        {children}
      </div>
    </>
  )
}
