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

type ThemeContextValue = {
  fxMode: FxMode
  osReducedMotion: boolean
  setFxMode: (mode: FxMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  fxMode: 'full',
  osReducedMotion: false,
  setFxMode: () => {},
})

const FX_KEY = 'midnight-io:fx'

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  const [fxPreference, setFxPreference] = useState<FxMode>('full')
  const [osReducedMotion, setOsReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => setOsReducedMotion(media.matches)
    syncMotion()
    media.addEventListener('change', syncMotion)

    try {
      const storedFx = localStorage.getItem(FX_KEY)
      if (storedFx === 'full' || storedFx === 'quiet') {
        setFxPreference(storedFx)
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
    return () => {
      root.classList.remove('fx-quiet')
    }
  }, [fxMode])

  const setFxMode = useCallback((mode: FxMode) => {
    setFxPreference(mode)
    try {
      localStorage.setItem(FX_KEY, mode)
    } catch {
      // Keep the preference for the current session.
    }
  }, [])

  const value = useMemo(
    () => ({
      fxMode,
      osReducedMotion,
      setFxMode,
    }),
    [fxMode, osReducedMotion, setFxMode],
  )

  return (
    <ThemeContext.Provider value={value}>
      <div className={`theme dark ${fxMode === 'quiet' ? 'fx-quiet' : ''}`}>
        {props.children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
