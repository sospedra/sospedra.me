import cn from 'clsx'
import { partition } from 'es-toolkit'
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { ClueColumns, MobileClueRail } from './crossword-clue-rail'
import {
  COPY,
  clueAssist,
  directionLabel,
  publicationDateLabel,
} from './crossword-copy'
import type {
  CrosswordEntry,
  CrosswordLocale,
  CrosswordPuzzle,
} from './crossword-data'
import {
  CrosswordCompletionDialog,
  CrosswordHelpDialog,
} from './crossword-dialogs'
import { createCrosswordState, crosswordReducer } from './crossword-engine'
import {
  entryFor,
  solutionsByCell,
  solvedEntryIdsFor,
  whiteCellIndices,
} from './crossword-entries'
import { gameScopeClasses } from './crossword-game-scope'
import { CrosswordGrid } from './crossword-grid'
import { CrosswordInputProxy } from './crossword-input-proxy'
import { CrosswordMasthead } from './crossword-masthead'
import type { GameSettings } from './crossword-settings'
import { CrosswordToolbar, CrosswordToolbarHints } from './crossword-toolbar'
import css from './crosswords.module.css'
import { useCrosswordKeyboard } from './use-crossword-keyboard'
import { useCrosswordProgress } from './use-crossword-progress'
import { useCrosswordProofing } from './use-crossword-proofing'
import { useCrosswordSelection } from './use-crossword-selection'
import { useCrosswordSound } from './use-crossword-sound'
import { useCrosswordTransport } from './use-crossword-transport'

type DialogName = 'help' | null

/* covers the 640ms solved-word sweep plus its per-cell stagger in crosswords.module.css */
const WORD_SWEEP_MS = 900

export function CrosswordSession({
  locale,
  puzzle,
  hasSpanish,
  letterFontClassName,
  setLocale,
  settings,
  setSettings,
}: {
  locale: CrosswordLocale
  puzzle: CrosswordPuzzle
  hasSpanish: boolean
  letterFontClassName: string
  setLocale: (locale: CrosswordLocale) => void
  settings: GameSettings
  setSettings: (
    value: GameSettings | ((current: GameSettings) => GameSettings),
  ) => void
}) {
  const copy = COPY[locale]
  const [state, dispatch] = useReducer(
    crosswordReducer,
    puzzle,
    createCrosswordState,
  )
  const [dialog, setDialog] = useState<DialogName>(null)
  const [announcement, setAnnouncement] = useState('')
  const [wordSweep, setWordSweep] = useState<{
    entryId: string
    run: number
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const focusGridRef = useRef(false)
  const latestStateRef = useRef(state)
  const announcementNonceRef = useRef(false)
  const sweepRunRef = useRef(0)

  const announce = useCallback((message: string) => {
    announcementNonceRef.current = !announcementNonceRef.current
    setAnnouncement(`${message}${announcementNonceRef.current ? '\u200B' : ''}`)
  }, [])

  const [acrossEntries, downEntries] = partition(
    puzzle.entries,
    (entry) => entry.direction === 'across',
  )
  const orderedEntries = [...acrossEntries, ...downEntries]
  const solvedEntryIds = solvedEntryIdsFor(puzzle, state.guesses)
  const assistFor = useCallback(
    (entry: CrosswordEntry) => clueAssist(entry, settings.solveMode, locale),
    [locale, settings.solveMode],
  )
  const activeEntry =
    entryFor(puzzle, state.selectedCell, state.direction) ?? orderedEntries[0]
  const sweepEntry = wordSweep
    ? puzzle.entries.find((entry) => entry.id === wordSweep.entryId)
    : undefined
  const whiteIndices = useMemo(() => whiteCellIndices(puzzle), [puzzle])
  const solutions = useMemo(() => solutionsByCell(puzzle), [puzzle])
  const paused = state.status === 'paused'
  const complete = state.status === 'complete'
  const boardLocked = paused || complete

  useEffect(() => {
    latestStateRef.current = state
  }, [state])

  const closeDialog = () => {
    setDialog(null)
    window.requestAnimationFrame(() => openerRef.current?.focus())
  }

  const openDialog = (
    name: Exclude<DialogName, null>,
    opener?: HTMLElement,
  ) => {
    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    inputRef.current?.blur()
    openerRef.current = opener ?? activeElement
    setDialog(name)
  }

  const settleBoard = useCallback(
    (guesses: string[]) => {
      const filled = whiteIndices.every((index) => guesses[index])
      if (!filled) return
      const correct = whiteIndices.every(
        (index) => guesses[index] === solutions[index],
      )
      if (correct) {
        inputRef.current?.blur()
        dispatch({ type: 'COMPLETE', now: Date.now() })
        return
      }
      announce(copy.notCorrect)
    },
    [announce, copy.notCorrect, solutions, whiteIndices],
  )

  const { clickKey, ringTypewriterBell, shiftCarriage } = useCrosswordSound(
    settings.soundLevel,
  )

  const {
    acrossListRef,
    bringCellIntoView,
    cellRefs,
    chooseEntry,
    chooseMobileDirection,
    downListRef,
    focusActiveClue,
    focusCellAt,
    mobileListRef,
    moveToClue,
    shortViewport,
  } = useCrosswordSelection({
    acrossEntries,
    activeEntry,
    dispatch,
    downEntries,
    focusGridRef,
    inputRef,
    latestStateRef,
    orderedEntries,
    puzzle,
    selectedCell: state.selectedCell,
    shiftCarriage,
  })

  const { hydrated, save } = useCrosswordProgress({
    dispatch,
    latestStateRef,
    puzzle,
    settleBoard,
    state,
  })

  const {
    changeToolScope,
    check,
    disarmReveal,
    requestReveal,
    revealArmed,
    toolScope,
  } = useCrosswordProofing({
    activeEntry,
    announce,
    copy,
    dispatch,
    latestStateRef,
    selectedCell: state.selectedCell,
    settleBoard,
    solutions,
    whiteIndices,
  })

  const {
    changeLocale,
    completionDismissed,
    dismissCompletion,
    pauseFrom,
    restartPuzzle,
    resumeFrom,
    resumePuzzle,
    startPuzzle,
  } = useCrosswordTransport({
    announce,
    bringCellIntoView,
    copy,
    disarmReveal,
    dispatch,
    focusCellAt,
    focusGridRef,
    inputRef,
    latestStateRef,
    locale,
    openerRef,
    puzzle,
    save,
    setDialog,
    setLocale,
    setWordSweep,
  })

  const {
    composingRef,
    eraseBackward,
    handleKeyDown,
    redoMove,
    selectCell,
    undoMove,
    writeLetter,
  } = useCrosswordKeyboard({
    activeEntry,
    announce,
    boardLocked,
    clickKey,
    copy,
    dispatch,
    focusActiveClue,
    focusGridRef,
    inputRef,
    latestStateRef,
    locale,
    moveToClue,
    openDialog,
    orderedEntries,
    puzzle,
    ringTypewriterBell,
    setWordSweep,
    settings,
    settleBoard,
    sweepRunRef,
    whiteIndices,
  })

  useEffect(() => {
    if (!wordSweep) return
    const timeout = window.setTimeout(() => setWordSweep(null), WORD_SWEEP_MS)
    return () => window.clearTimeout(timeout)
  }, [wordSweep])

  const publicationDate = publicationDateLabel(puzzle.publicationDate, locale)
  const showStart = hydrated && state.status === 'not-started'
  const gridSizeLabel = `${puzzle.width}×${puzzle.height}`

  const toggleTimer = () => {
    const showTimer = !settings.showTimer
    setSettings((current) => ({ ...current, showTimer }))
    announce(showTimer ? copy.timerShown : copy.timerHidden)
  }

  const togglePencil = () => {
    announce(state.pencilMode ? copy.pencilOff : copy.pencilOn)
    dispatch({ type: 'TOGGLE_PENCIL' })
  }

  const toolbarProps = {
    copy,
    onCheck: () => check(toolScope),
    onOpenHelp: (button: HTMLButtonElement) => openDialog('help', button),
    onPauseFrom: pauseFrom,
    onRedo: redoMove,
    onRequestReveal: requestReveal,
    onRestart: restartPuzzle,
    onResumeFrom: resumeFrom,
    onScopeChange: changeToolScope,
    onTogglePencil: togglePencil,
    onToggleTimer: toggleTimer,
    onUndo: undoMove,
    revealArmed,
    setSettings,
    settings,
    state,
    toolScope,
  }

  const completionOpen = complete && !completionDismissed

  const railProps = {
    acrossEntries,
    activeEntry,
    assistFor,
    chooseEntry,
    copy,
    downEntries,
    guesses: state.guesses,
    hydrated,
    locale,
    solvedEntryIds,
  }

  return (
    <div
      className={cn(css.game, gameScopeClasses)}
      lang={locale}
      data-large-text={settings.largeText}
      data-high-contrast={settings.highContrast}
      data-short-viewport={shortViewport || undefined}
      style={{ '--cw-grid-cols': puzzle.width } as CSSProperties}
    >
      <CrosswordToolbarHints copy={copy} />
      <span id='crossword-active-clue-text' className={css.srOnly}>
        {activeEntry.number} {directionLabel(activeEntry.direction, locale)}.{' '}
        {activeEntry.clue ?? ''}
        {assistFor(activeEntry) ? ` — ${assistFor(activeEntry)}` : ''}
      </span>
      <CrosswordMasthead
        changeLocale={changeLocale}
        complete={complete}
        copy={copy}
        hasSpanish={hasSpanish}
        hydrated={hydrated}
        locale={locale}
        publicationDate={publicationDate}
        puzzle={puzzle}
        solvedEntryIds={solvedEntryIds}
      />

      <div className={css.workspace}>
        <CrosswordGrid
          activeEntry={activeEntry}
          cellRefs={cellRefs}
          copy={copy}
          dispatch={dispatch}
          gridSizeLabel={gridSizeLabel}
          latestStateRef={latestStateRef}
          letterFontClassName={letterFontClassName}
          locale={locale}
          onKeyDown={handleKeyDown}
          paused={paused}
          publicationDate={publicationDate}
          puzzle={puzzle}
          resumePuzzle={resumePuzzle}
          selectCell={selectCell}
          showStart={showStart}
          startPuzzle={startPuzzle}
          state={state}
          sweepEntry={sweepEntry}
          wordSweep={wordSweep}
        />

        <ClueColumns
          {...railProps}
          acrossListRef={acrossListRef}
          downListRef={downListRef}
        />
      </div>

      <CrosswordToolbar placement='desktop' {...toolbarProps} />

      <MobileClueRail
        {...railProps}
        chooseMobileDirection={chooseMobileDirection}
        mobileListRef={mobileListRef}
      />

      <CrosswordToolbar placement='mobile' {...toolbarProps} />

      <CrosswordInputProxy
        composingRef={composingRef}
        copy={copy}
        eraseBackward={eraseBackward}
        inputRef={inputRef}
        onKeyDown={handleKeyDown}
        writeLetter={writeLetter}
      />

      <CrosswordHelpDialog
        close={closeDialog}
        copy={copy}
        open={dialog === 'help'}
      />

      <CrosswordCompletionDialog
        announce={announce}
        close={dismissCompletion}
        copy={copy}
        open={completionOpen}
        puzzle={puzzle}
        restartPuzzle={restartPuzzle}
        state={state}
      />

      <div className={css.srOnly} aria-live='polite' aria-atomic='true'>
        {announcement}
      </div>
    </div>
  )
}
