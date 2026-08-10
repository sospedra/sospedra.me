'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDocumentLang } from 'services/locale'
import { getBrowserStorage } from 'services/storage'
import { useViewportHeightVar } from 'services/viewport'
import {
  createGeoGameState,
  type GeoGameState,
  restoreGeoGameState,
} from './game-state'
import css from './geo-game.module.css'
import { type GeoLocale, getGeoMessages } from './geo-messages'
import { GeoSession } from './geo-session'
import shell from './geo-shell.module.css'
import overlays from './mission-overlays.module.css'
import type { DailyGeoChallenge, GeoSettings } from './model'
import {
  loadGeoRun,
  loadGeoSettings,
  removeGeoRun,
  saveGeoSettings,
} from './persistence'
import {
  createSessionNonce,
  type GeoGameMode,
  type PracticeRound,
  practiceChallenge,
} from './run-mode'
import {
  deriveDailyChallenge,
  deriveRunChallenge,
  differentRunNonce,
} from './run-variants'

export type { GeoGameMode } from './run-mode'

export type GeoGameProps = {
  challenge: DailyGeoChallenge
  locale: GeoLocale
  mode?: GeoGameMode
  onLocaleChange: (locale: GeoLocale) => void
  onModeChange: (mode: GeoGameMode) => void
}

export default function GeoGame({
  challenge,
  locale,
  mode = 'daily',
  onLocaleChange,
  onModeChange,
}: GeoGameProps) {
  const copy = getGeoMessages(locale)
  const [settings, setSettings] = useState<GeoSettings | null>(null)
  const [restoredState, setRestoredState] = useState<
    GeoGameState | null | undefined
  >(undefined)
  const [recoveryNotice, setRecoveryNotice] = useState('')
  const [sessionNonce, setSessionNonce] = useState(() =>
    mode === 'practice' ? createSessionNonce() : 0,
  )
  const [practiceRound, setPracticeRound] = useState<PracticeRound>('all')
  const [practiceTimed, setPracticeTimed] = useState(true)
  const officialChallenge = useMemo(
    () => deriveDailyChallenge(challenge),
    [challenge],
  )
  const activeChallenge = useMemo(() => {
    if (mode === 'practice') {
      return deriveRunChallenge(
        practiceChallenge(challenge, practiceRound),
        sessionNonce,
      )
    }
    return officialChallenge
  }, [challenge, mode, officialChallenge, practiceRound, sessionNonce])

  useDocumentLang(locale)
  const softKeyboard = useViewportHeightVar('--geo-viewport-height')

  useEffect(() => {
    const storage = getBrowserStorage()
    const loadedSettings = loadGeoSettings(storage)
    setSettings(loadedSettings.value)

    if (mode === 'practice') {
      setRestoredState(null)
      return
    }

    const loadedRun = loadGeoRun(storage, officialChallenge)
    if (loadedRun.status === 'invalid') {
      removeGeoRun(storage, officialChallenge.publicationDate)
      setRecoveryNotice(copy.storageRecovered)
      setRestoredState(null)
      return
    }
    setRestoredState(
      loadedRun.value
        ? restoreGeoGameState(officialChallenge, loadedRun.value, {
            runKind: 'official',
          })
        : null,
    )
  }, [copy.storageRecovered, mode, officialChallenge])

  const updateSettings = (next: GeoSettings) => {
    setSettings(next)
    saveGeoSettings(getBrowserStorage(), next)
  }

  if (!settings || restoredState === undefined) {
    return (
      <>
        <a className={shell.skipLink} href='#main-content'>
          {copy.skipToGame}
        </a>
        <div id='vbody' className={shell.shell}>
          <main id='main-content' className={css.game}>
            <div className={overlays.overlay}>
              <section className={overlays.countdownPanel} role='status'>
                <span className={overlays.countdownLabel}>{copy.loading}</span>
                <strong className={overlays.countdownNumber}>M</strong>
              </section>
            </div>
          </main>
        </div>
      </>
    )
  }

  const initialState =
    restoredState ??
    createGeoGameState(activeChallenge, {
      runKind: mode === 'practice' ? 'practice' : 'official',
      timed: practiceTimed,
    })

  return (
    <>
      <a className={shell.skipLink} href='#main-content'>
        {copy.skipToGame}
      </a>
      <div id='vbody' className={shell.shell} data-keyboard={softKeyboard}>
        <main id='main-content' tabIndex={-1}>
          <GeoSession
            key={`${sessionNonce}:${activeChallenge.id}:${practiceTimed ? 'timed' : 'untimed'}`}
            copy={copy}
            displayRounds={challenge.rounds}
            initialState={initialState}
            locale={locale}
            mode={mode}
            onLocaleChange={onLocaleChange}
            onModeChange={onModeChange}
            onNewPracticeGame={() => {
              if (mode !== 'practice') return
              const source = practiceChallenge(challenge, practiceRound)
              const randomNonce = createSessionNonce(sessionNonce)
              const nextNonce = differentRunNonce(
                source,
                activeChallenge,
                randomNonce,
              )
              setRestoredState(null)
              setSessionNonce(nextNonce)
            }}
            onPracticeRoundChange={setPracticeRound}
            onPracticeTimedChange={setPracticeTimed}
            practiceRound={practiceRound}
            practiceTimed={practiceTimed}
            settings={settings}
            onSettingsChange={updateSettings}
          />
        </main>
      </div>
      <p className={shell.liveRegion} aria-live='polite'>
        {recoveryNotice}
      </p>
    </>
  )
}
