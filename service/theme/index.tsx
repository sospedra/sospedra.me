'use client'

import type React from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type FxMode = 'full' | 'quiet'
type Palette = 'midnight' | 'maintenance'

type ThemeContextValue = {
  fxMode: FxMode
  osReducedMotion: boolean
  palette: Palette
  setFxMode: (mode: FxMode) => void
  setPalette: (palette: Palette) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  fxMode: 'full',
  osReducedMotion: false,
  palette: 'midnight',
  setFxMode: () => {},
  setPalette: () => {},
})

const FX_KEY = 'midnight-io:fx'
const PALETTE_KEY = 'midnight-io:palette'

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  const [fxPreference, setFxPreference] = useState<FxMode>('full')
  const [palette, setPaletteState] = useState<Palette>('midnight')
  const [osReducedMotion, setOsReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => setOsReducedMotion(media.matches)
    syncMotion()
    media.addEventListener('change', syncMotion)

    try {
      const storedFx = localStorage.getItem(FX_KEY)
      const storedPalette = localStorage.getItem(PALETTE_KEY)
      if (storedFx === 'full' || storedFx === 'quiet') {
        setFxPreference(storedFx)
      }
      if (storedPalette === 'midnight' || storedPalette === 'maintenance') {
        setPaletteState(storedPalette)
      }
    } catch {
      // Preferences remain session-only when storage is unavailable.
    }

    return () => media.removeEventListener('change', syncMotion)
  }, [])

  const fxMode: FxMode = osReducedMotion ? 'quiet' : fxPreference

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('fx-quiet', fxMode === 'quiet')
    root.dataset.palette = palette
    return () => {
      root.classList.remove('fx-quiet')
      delete root.dataset.palette
    }
  }, [fxMode, palette])

  const setFxMode = useCallback((mode: FxMode) => {
    setFxPreference(mode)
    try {
      localStorage.setItem(FX_KEY, mode)
    } catch {
      // Keep the preference for the current session.
    }
  }, [])

  const setPalette = useCallback((nextPalette: Palette) => {
    setPaletteState(nextPalette)
    try {
      localStorage.setItem(PALETTE_KEY, nextPalette)
    } catch {
      // Keep the preference for the current session.
    }
  }, [])

  const value = useMemo(
    () => ({
      fxMode,
      osReducedMotion,
      palette,
      setFxMode,
      setPalette,
    }),
    [fxMode, osReducedMotion, palette, setFxMode, setPalette],
  )

  return (
    <ThemeContext.Provider value={value}>
      <div
        className={`theme dark ${fxMode === 'quiet' ? 'fx-quiet' : ''} ${
          palette === 'maintenance' ? 'theme-maintenance' : ''
        }`}
      >
        {props.children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
