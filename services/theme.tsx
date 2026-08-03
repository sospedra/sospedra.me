'use client'

import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { readLocal, writeLocal } from 'services/storage'

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

// synchronous read for non-react call sites; components read useTheme instead
export const prefersQuietFx = () => {
  if (typeof window === 'undefined') return false
  return (
    document.documentElement.classList.contains('fx-quiet') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

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

    const storedFx = readLocal(FX_KEY)
    if (storedFx === 'full' || storedFx === 'quiet') {
      setFxPreference(storedFx)
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

  const setFxMode = (mode: FxMode) => {
    setFxPreference(mode)
    writeLocal(FX_KEY, mode)
  }

  const value = { fxMode, osReducedMotion, setFxMode }

  return (
    <ThemeContext.Provider value={value}>
      <div className={`theme dark ${fxMode === 'quiet' ? 'fx-quiet' : ''}`}>
        {props.children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
