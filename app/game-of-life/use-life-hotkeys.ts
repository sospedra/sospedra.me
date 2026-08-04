import { useEffect } from 'react'
import type { CellSet } from './engine'
import type { LifeMechanicalSound } from './life-audio'
import type { LifeTool } from './life-canvas'

type LifeHotkeyOptions = {
  cells: CellSet
  clearUniverse: () => void
  fitCells: (cells: CellSet) => void
  jumpToPresets: () => void
  playMechanicalSound: (kind: LifeMechanicalSound) => void
  resetUniverse: () => void
  setAnnouncement: (message: string) => void
  setTool: (tool: LifeTool) => void
  stepOnce: () => void
  toggleRunning: () => void
}

export const useLifeHotkeys = ({
  cells,
  clearUniverse,
  fitCells,
  jumpToPresets,
  playMechanicalSound,
  resetUniverse,
  setAnnouncement,
  setTool,
  stepOnce,
  toggleRunning,
}: LifeHotkeyOptions) => {
  useEffect(() => {
    const shortcuts: Record<
      string,
      { cue?: LifeMechanicalSound; keepDefault?: boolean; run: () => void }
    > = {
      ' ': { run: toggleRunning },
      '.': { cue: 'key', run: stepOnce },
      c: { cue: 'key', run: clearUniverse },
      d: {
        cue: 'lever',
        keepDefault: true,
        run: () => {
          setTool('draw')
          setAnnouncement('Draw tool active.')
        },
      },
      f: { cue: 'knob', keepDefault: true, run: () => fitCells(cells) },
      m: {
        cue: 'lever',
        keepDefault: true,
        run: () => {
          setTool('move')
          setAnnouncement('Slew tool active.')
        },
      },
      p: { cue: 'key', run: jumpToPresets },
      r: { cue: 'key', run: resetUniverse },
    }

    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('button, a, input, select, textarea, [contenteditable]')
      ) {
        return
      }

      const shortcut = shortcuts[event.key.toLowerCase()]
      if (!shortcut) return
      if (!shortcut.keepDefault) event.preventDefault()
      if (shortcut.cue) playMechanicalSound(shortcut.cue)
      shortcut.run()
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [
    cells,
    clearUniverse,
    fitCells,
    jumpToPresets,
    playMechanicalSound,
    resetUniverse,
    setAnnouncement,
    setTool,
    stepOnce,
    toggleRunning,
  ])
}
