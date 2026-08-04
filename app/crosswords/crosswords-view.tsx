'use client'

import { useEffect, useState } from 'react'
import { useGameInput } from 'services/hotkeys'
import { useDocumentLang } from 'services/locale'
import Shell from 'services/shell'
import {
  readLocal,
  readLocalJson,
  writeLocal,
  writeLocalJson,
} from 'services/storage'
import { utcDayString } from 'services/time'
import { useViewportHeightVar } from 'services/viewport'
import {
  type CrosswordChallengeFile,
  type CrosswordLocale,
  editionFromChallenge,
  puzzleForDate,
} from './crossword-data'
import { CrosswordSession } from './crossword-session'
import {
  DEFAULT_SETTINGS,
  type GameSettings,
  LOCALE_KEY,
  parseSavedSettings,
  SETTINGS_KEY,
} from './crossword-settings'
import css from './crosswords.module.css'

const LATEST_EDITION_DATE = '9999-12-31'

type ClientTakeover =
  | { phase: 'server' }
  | { phase: 'client'; editionDate: string }

export default function CrosswordsView({
  challenges,
  letterFontClassName,
}: {
  challenges: CrosswordChallengeFile[]
  letterFontClassName: string
}) {
  useGameInput()
  const [locale, setLocale] = useState<CrosswordLocale>('en')
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [takeover, setTakeover] = useState<ClientTakeover>({ phase: 'server' })

  const editions = challenges
    .map(editionFromChallenge)
    .toSorted((a, b) =>
      a.en.publicationDate.localeCompare(b.en.publicationDate),
    )

  useEffect(() => {
    const savedLocale = readLocal(LOCALE_KEY)
    if (savedLocale === 'en' || savedLocale === 'es') {
      setLocale(savedLocale)
    }
    const loaded = readLocalJson(SETTINGS_KEY)
    if (loaded.status === 'ok') setSettings(parseSavedSettings(loaded.value))
    setTakeover({ phase: 'client', editionDate: utcDayString(new Date()) })
  }, [])

  useDocumentLang(locale)
  useViewportHeightVar('--crossword-viewport-height')

  useEffect(() => {
    if (takeover.phase !== 'client') return
    writeLocal(LOCALE_KEY, locale)
    writeLocalJson(SETTINGS_KEY, settings)
  }, [locale, takeover.phase, settings])

  // Editions roll at server (UTC) midnight for everyone; SSR and the first
  // client render both use the latest edition.
  const puzzles = puzzleForDate(
    editions,
    takeover.phase === 'client' ? takeover.editionDate : LATEST_EDITION_DATE,
  )
  if (!puzzles) return null

  const activeLocale = puzzles.es ? locale : 'en'
  const puzzle = activeLocale === 'es' && puzzles.es ? puzzles.es : puzzles.en

  return (
    <Shell shellClassName={css.shell} className={css.page}>
      <CrosswordSession
        key={puzzle.id}
        locale={activeLocale}
        puzzle={puzzle}
        hasSpanish={Boolean(puzzles.es)}
        letterFontClassName={letterFontClassName}
        setLocale={setLocale}
        settings={settings}
        setSettings={setSettings}
      />
    </Shell>
  )
}
