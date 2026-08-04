import { useCallback, useState } from 'react'
import type { WinampPanelId, WinampPanelVisibility } from './types'
import { useDraggablePanel } from './use-draggable-panel'

const PANEL_IDS: readonly WinampPanelId[] = ['player', 'equalizer', 'tracklist']

const panelLayer = (
  activePanel: WinampPanelId,
  panel: WinampPanelId,
  restingLayer: number,
): number => (activePanel === panel ? 30 : restingLayer)

export const usePanelActivation = (
  panels: WinampPanelVisibility,
  onClosePanel: (panel: WinampPanelId) => void,
  onOpenPanel: (panel: WinampPanelId) => void,
) => {
  const [activePanel, setActivePanel] = useState<WinampPanelId>(
    () => PANEL_IDS.find((panel) => panels[panel]) ?? 'player',
  )

  const playerDrag = useDraggablePanel(
    'Audio player',
    panelLayer(activePanel, 'player', 3),
    () => setActivePanel('player'),
  )
  const equalizerDrag = useDraggablePanel(
    'Equalizer',
    panelLayer(activePanel, 'equalizer', 2),
    () => setActivePanel('equalizer'),
  )
  const tracklistDrag = useDraggablePanel(
    'Tracklist',
    panelLayer(activePanel, 'tracklist', 1),
    () => setActivePanel('tracklist'),
  )

  const closePanel = useCallback(
    (panel: WinampPanelId) => {
      onClosePanel(panel)
      const nextActivePanel = PANEL_IDS.find(
        (candidate) => candidate !== panel && panels[candidate],
      )
      if (!nextActivePanel) return
      setActivePanel((current) =>
        current === panel ? nextActivePanel : current,
      )
    },
    [onClosePanel, panels],
  )

  const openPanel = useCallback(
    (panel: WinampPanelId) => {
      setActivePanel(panel)
      onOpenPanel(panel)
    },
    [onOpenPanel],
  )

  return { closePanel, equalizerDrag, openPanel, playerDrag, tracklistDrag }
}
