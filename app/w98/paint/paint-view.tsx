'use client'

import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { isEditableTarget, useGameInput } from 'services/hotkeys'
import w98 from '../w98.module.css'
import { CanvasStage, StatusBar } from './canvas-stage.tsx'
import type { ToolOptions } from './options.ts'
import css from './paint.module.css'
import { PaletteBar, ToolboxAside } from './paint-controls.tsx'
import {
  EDIT_ITEMS,
  FILE_ITEMS,
  type MenuId,
  PaintMenu,
} from './paint-menu.tsx'
import { type PaintHandle, useExitPrompt } from './save-prompt.tsx'
import { usePaint } from './use-paint.ts'

export type { PaintHandle } from './save-prompt.tsx'

type DragHandle = {
  onPointerDown: React.PointerEventHandler<HTMLElement>
  onPointerMove: React.PointerEventHandler<HTMLElement>
  onPointerUp: React.PointerEventHandler<HTMLElement>
  onPointerCancel: React.PointerEventHandler<HTMLElement>
}

export type PaintWindowProps = {
  dragStyle: React.CSSProperties
  dragHandle: DragHandle
  active: boolean
  minimize: () => void
  close: () => void
  ref?: React.Ref<PaintHandle>
}

// paint owns the keyboard while focused: the global single-key routes go quiet
const ClaimKeys: React.FC = () => {
  useGameInput()
  return null
}

export default function PaintWindow({
  dragStyle,
  dragHandle,
  active,
  minimize,
  close,
  ref,
}: PaintWindowProps) {
  const paint = usePaint()
  const { state } = paint
  const [menu, setMenu] = useState<MenuId | null>(null)

  const { confirmDirty, dismissPrompt, exitPrompt, promptOpen } = useExitPrompt(
    { dirty: state.dirty, paint, ref },
  )

  const openPicker = () => paint.fileInputRef.current?.click()

  const MENU_ACTIONS: Record<string, () => void> = {
    New: () => confirmDirty(paint.newFile),
    Open: () => confirmDirty(openPicker),
    'Save As': () => {
      void paint.saveFile()
    },
    Undo: paint.undo,
    Cut: paint.cut,
    Copy: paint.copy,
    Paste: paint.paste,
    'Clear Selection': paint.clearSelection,
    'Select All': paint.selectAll,
  }

  const menuAction = (name: string) => {
    setMenu(null)
    MENU_ACTIONS[name]?.()
  }

  const MOD_ACTIONS: Record<string, () => void> = {
    z: paint.undo,
    'shift+z': paint.redo,
    y: paint.redo,
    x: paint.cut,
    c: paint.copy,
    v: paint.paste,
    a: paint.selectAll,
    s: () => {
      void paint.saveFile()
    },
    o: () => confirmDirty(openPicker),
  }

  const plainKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (promptOpen) dismissPrompt()
      else if (menu) setMenu(null)
      else paint.escape()
      event.preventDefault()
      return
    }
    const clears = event.key === 'Delete' || event.key === 'Backspace'
    if (clears && state.mode.kind === 'selected') {
      paint.clearSelection()
      event.preventDefault()
    }
  }

  const handleKey = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return
    if (!event.metaKey && !event.ctrlKey) {
      plainKey(event)
      return
    }
    const key = event.key.toLowerCase()
    const shifted = event.shiftKey ? MOD_ACTIONS[`shift+${key}`] : undefined
    const action = shifted ?? MOD_ACTIONS[key]
    if (!action) return
    event.preventDefault()
    action()
  }

  const keyRef = useRef(handleKey)
  useEffect(() => {
    keyRef.current = handleKey
  })
  useEffect(() => {
    if (!active) return
    const listener = (event: KeyboardEvent) => keyRef.current(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [active])

  const patch = (partial: Partial<ToolOptions>) =>
    paint.send({ type: 'option', patch: partial })

  const hasSelection = state.mode.kind === 'selected'

  const editDisabled: Record<string, boolean> = {
    Undo: !paint.canUndo(),
    Cut: !hasSelection,
    Copy: !hasSelection,
    Paste: !paint.canPaste(),
    'Clear Selection': !hasSelection,
  }

  const menuTrigger = (id: MenuId, label: React.ReactNode) => (
    <button
      type='button'
      className={w98.menuTrigger}
      aria-haspopup='menu'
      aria-expanded={menu === id}
      onClick={() => setMenu(menu === id ? null : id)}
    >
      {label}
    </button>
  )

  return (
    <section className={w98.paintWindow} style={dragStyle} aria-label='Paint'>
      {active && <ClaimKeys />}
      <header className={w98.titlebar} {...dragHandle}>
        <span className={w98.paintAppIcon} aria-hidden='true' />
        <strong>untitled - Paint</strong>
        <span className={w98.windowControls}>
          <button type='button' aria-label='Minimize Paint' onClick={minimize}>
            _
          </button>
          <span aria-hidden='true'>□</span>
          <button
            type='button'
            aria-label='Close Paint'
            onClick={() => confirmDirty(close)}
          >
            ×
          </button>
        </span>
      </header>

      {menu && (
        <button
          type='button'
          className={w98.menuBackdrop}
          aria-label='Close menu'
          onClick={() => setMenu(null)}
        />
      )}

      <nav className={w98.menubar} aria-label='Paint menus'>
        <div className={w98.menuSlot}>
          {menuTrigger(
            'file',
            <>
              <u>F</u>ile
            </>,
          )}
          {menu === 'file' && (
            <PaintMenu items={FILE_ITEMS} label='File menu' act={menuAction} />
          )}
        </div>
        <div className={w98.menuSlot}>
          {menuTrigger(
            'edit',
            <>
              <u>E</u>dit
            </>,
          )}
          {menu === 'edit' && (
            <PaintMenu
              items={EDIT_ITEMS}
              label='Edit menu'
              disabled={editDisabled}
              act={menuAction}
            />
          )}
        </div>
      </nav>

      <div className={css.body}>
        <ToolboxAside
          toolId={state.tool}
          pick={paint.pickTool}
          options={state.options}
          patch={patch}
          zoom={state.zoom}
          setZoom={paint.setZoom}
        />
        <CanvasStage paint={paint} />
      </div>

      <PaletteBar
        fg={state.fg}
        bg={state.bg}
        setFg={(color) => paint.send({ type: 'color', slot: 'fg', color })}
        setBg={(color) => paint.send({ type: 'color', slot: 'bg', color })}
      />

      <StatusBar hover={paint.hover} mode={state.mode} size={state.size} />

      <input
        ref={paint.fileInputRef}
        className={css.fileInput}
        type='file'
        accept='image/png'
        tabIndex={-1}
        aria-hidden='true'
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void paint.openFile(file)
          event.target.value = ''
        }}
      />

      {exitPrompt}
    </section>
  )
}
