'use client'

import GeoGame, { type GeoGameMode } from 'components/geo/GeoGame'
import type { DailyGeoChallenge } from 'lib/geo'
import type { GeoLocale } from 'messages/geo'
import { useEffect, useState } from 'react'

const MERIDIAN_LOCALE_KEY = 'meridian:locale'

export default function MeridianGame({
  challenge,
}: {
  challenge: DailyGeoChallenge
}) {
  const [locale, setLocaleState] = useState<GeoLocale>('en')
  const [mode, setMode] = useState<GeoGameMode>('daily')

  useEffect(() => {
    try {
      const savedLocale = window.localStorage.getItem(MERIDIAN_LOCALE_KEY)
      if (savedLocale === 'en' || savedLocale === 'es') {
        setLocaleState(savedLocale)
      }
    } catch {
      // Locale persistence is an optional enhancement.
    }
  }, [])

  const setLocale = (nextLocale: GeoLocale) => {
    setLocaleState(nextLocale)
    try {
      window.localStorage.setItem(MERIDIAN_LOCALE_KEY, nextLocale)
    } catch {
      // Locale persistence is an optional enhancement.
    }
  }

  return (
    <GeoGame
      key={mode}
      challenge={challenge}
      locale={locale}
      mode={mode}
      routeKind={mode === 'practice' ? 'practice' : 'today'}
      onLocaleChange={setLocale}
      onModeChange={setMode}
    />
  )
}
