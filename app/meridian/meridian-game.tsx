'use client'

import GeoGame, { type GeoGameMode } from 'components/geo/GeoGame'
import type { DailyGeoChallenge } from 'lib/geo'
import { readLocal, writeLocal } from 'lib/storage'
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
    const savedLocale = readLocal(MERIDIAN_LOCALE_KEY)
    if (savedLocale === 'en' || savedLocale === 'es') {
      setLocaleState(savedLocale)
    }
  }, [])

  const setLocale = (nextLocale: GeoLocale) => {
    setLocaleState(nextLocale)
    writeLocal(MERIDIAN_LOCALE_KEY, nextLocale)
  }

  return (
    <GeoGame
      key={mode}
      challenge={challenge}
      locale={locale}
      mode={mode}
      onLocaleChange={setLocale}
      onModeChange={setMode}
    />
  )
}
