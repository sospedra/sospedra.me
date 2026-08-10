import cn from 'clsx'
import { range } from 'es-toolkit'
import { type CSSProperties, useEffect, useRef } from 'react'
import DailyCountdownPanel from 'services/daily-countdown-panel'
import Modal from 'services/modal'
import { shareHandled, shareText } from 'services/share'
import { ClueList } from './crossword-clue-rail'
import completionCss from './crossword-completion.module.css'
import type { Copy } from './crossword-copy'
import type {
  CrosswordEntry,
  CrosswordLocale,
  CrosswordPuzzle,
} from './crossword-data'
import css from './crossword-dialogs.module.css'
import { type CrosswordState, formatTime, shareCard } from './crossword-engine'
import cw from './crosswords.module.css'

const CONFETTI_TONES = [
  '#d7653c',
  '#476f8f',
  '#62a996',
  '#e3b84a',
  '#bd4e3b',
  '#f3eedf',
] as const

/* Deterministic scatter: index-hashed values dodge Math.random so every
   render (and any hydration) agrees on the same burst. */
const CONFETTI_PIECES = range(26).map((index) => ({
  id: `piece-${index + 1}`,
  x: (((index * 7) % 13) / 12 - 0.5) * 34,
  peak: -(3.4 + ((index * 53) % 40) / 10),
  fall: 17 + ((index * 29) % 9),
  spin: (index % 2 === 0 ? 1 : -1) * (420 + ((index * 47) % 360)),
  delay: (index * 83) % 340,
  duration: 1500 + ((index * 37) % 700),
  width: 0.3 + ((index * 11) % 4) * 0.05,
  height: 0.55 + ((index * 19) % 5) * 0.07,
  tone: CONFETTI_TONES[index % CONFETTI_TONES.length],
}))

const ConfettiBurst = () => (
  <div
    className={cn(completionCss.confettiBurst, cw.confettiBurst)}
    aria-hidden='true'
  >
    {CONFETTI_PIECES.map((piece) => (
      <span
        key={piece.id}
        className={completionCss.confettiPiece}
        style={
          {
            '--cw-cf-x': `${piece.x}rem`,
            '--cw-cf-peak': `${piece.peak}rem`,
            '--cw-cf-fall': `${piece.fall}rem`,
            '--cw-cf-spin': `${piece.spin}deg`,
            '--cw-cf-delay': `${piece.delay}ms`,
            '--cw-cf-duration': `${piece.duration}ms`,
            '--cw-cf-tone': piece.tone,
            '--cw-cf-w': `${piece.width}rem`,
            '--cw-cf-h': `${piece.height}rem`,
          } as CSSProperties
        }
      />
    ))}
  </div>
)

const DialogHeader = ({
  close,
  closeLabel,
  id,
  title,
}: {
  close: () => void
  closeLabel: string
  id: string
  title: string
}) => (
  <header className={css.dialogHeader}>
    <div>
      <span aria-hidden='true'>CW—15</span>
      <h2 id={id}>{title}</h2>
    </div>
    <button
      type='button'
      className={css.iconButton}
      onClick={close}
      aria-label={closeLabel}
    >
      <span aria-hidden='true'>×</span>
    </button>
  </header>
)

export const CrosswordHelpDialog = ({
  close,
  copy,
  open,
}: {
  close: () => void
  copy: Copy
  open: boolean
}) => (
  <Modal
    open={open}
    close={close}
    labelId='help-title'
    className={cn(css.dialog, css.wideDialog)}
  >
    <DialogHeader
      id='help-title'
      title={copy.helpTitle}
      close={close}
      closeLabel={copy.close}
    />
    <div className={css.dialogBody}>
      <dl className={css.shortcutList}>
        <div>
          <dt>
            <kbd>A–Z</kbd> <kbd>Ñ</kbd>
          </dt>
          <dd>{copy.keyLetters}</dd>
        </div>
        <div>
          <dt>
            <kbd>← ↑ ↓ →</kbd>
          </dt>
          <dd>{copy.keyArrows}</dd>
        </div>
        <div>
          <dt>
            <kbd>Enter</kbd>
          </dt>
          <dd>{copy.keyEnter}</dd>
        </div>
        <div>
          <dt>
            <kbd>Tab</kbd> <kbd>⇧ Tab</kbd>
          </dt>
          <dd>{copy.keyTab}</dd>
        </div>
        <div>
          <dt>
            <kbd>Space</kbd>
          </dt>
          <dd>{copy.keySpace}</dd>
        </div>
        <div>
          <dt>
            <kbd>⌫</kbd> <kbd>Delete</kbd>
          </dt>
          <dd>{copy.keyDelete}</dd>
        </div>
        <div>
          <dt>
            <kbd>⌘/Ctrl Z</kbd>
          </dt>
          <dd>{copy.keyUndo}</dd>
        </div>
        <div>
          <dt>
            <kbd>Esc</kbd>
          </dt>
          <dd>{copy.keyEscape}</dd>
        </div>
      </dl>
      <p>{copy.legendTitle}</p>
      <dl className={css.markLegend}>
        <div>
          <dt aria-hidden='true'>
            <span className={css.legendCell} data-kind='checked'>
              A
            </span>
          </dt>
          <dd>{copy.legendChecked}</dd>
        </div>
        <div>
          <dt aria-hidden='true'>
            <span className={css.legendCell} data-kind='revealed'>
              A
            </span>
          </dt>
          <dd>{copy.legendRevealed}</dd>
        </div>
        <div>
          <dt aria-hidden='true'>
            <span className={css.legendCell} data-kind='incorrect'>
              A
            </span>
          </dt>
          <dd>{copy.legendIncorrect}</dd>
        </div>
      </dl>
      <button type='button' className={css.primaryDialogButton} onClick={close}>
        {copy.close}
      </button>
    </div>
  </Modal>
)

export const CrosswordClueSheet = ({
  acrossEntries,
  activeEntry,
  assistFor,
  close,
  copy,
  downEntries,
  guesses,
  hydrated,
  locale,
  open,
  pick,
  solvedEntryIds,
}: {
  acrossEntries: CrosswordEntry[]
  activeEntry: CrosswordEntry
  assistFor: (entry: CrosswordEntry) => string | null
  close: () => void
  copy: Copy
  downEntries: CrosswordEntry[]
  guesses: string[]
  hydrated: boolean
  locale: CrosswordLocale
  open: boolean
  pick: (entry: CrosswordEntry) => void
  solvedEntryIds: ReadonlySet<string>
}) => {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      bodyRef.current
        ?.querySelector('[data-active="true"]')
        ?.scrollIntoView({ block: 'center' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  return (
    <Modal
      open={open}
      close={close}
      labelId='clue-sheet-title'
      className={cn(css.dialog, css.clueSheet)}
    >
      <DialogHeader
        id='clue-sheet-title'
        title={copy.clueList}
        close={close}
        closeLabel={copy.close}
      />
      <div ref={bodyRef} className={css.clueSheetBody}>
        <ClueList
          heading={copy.across}
          labelId={`sheet-${locale}-across-clues`}
          entries={acrossEntries}
          activeId={activeEntry.id}
          select={pick}
          solvedEntryIds={solvedEntryIds}
          solvedLabel={copy.solved}
          filedLabel={copy.filed}
          strikeSolved
          assistFor={assistFor}
          progressLabel={copy.clueProgress}
          guesses={guesses}
          progressReady={hydrated}
        />
        <ClueList
          heading={copy.down}
          labelId={`sheet-${locale}-down-clues`}
          entries={downEntries}
          activeId={activeEntry.id}
          select={pick}
          solvedEntryIds={solvedEntryIds}
          solvedLabel={copy.solved}
          filedLabel={copy.filed}
          strikeSolved
          assistFor={assistFor}
          progressLabel={copy.clueProgress}
          guesses={guesses}
          progressReady={hydrated}
        />
      </div>
    </Modal>
  )
}

export const CrosswordCompletionDialog = ({
  announce,
  close,
  copy,
  open,
  puzzle,
  restartPuzzle,
  state,
}: {
  announce: (message: string) => void
  close: () => void
  copy: Copy
  open: boolean
  puzzle: CrosswordPuzzle
  restartPuzzle: () => void
  state: CrosswordState
}) => {
  const checksUsed = state.checkedCells.some(Boolean)
  const revealsUsed = state.revealedCells.some(Boolean)

  const shareResult = async () => {
    const card = shareCard(puzzle, state)
    const outcome = await shareText({ text: card })
    if (shareHandled(outcome)) return
    try {
      await navigator.clipboard.writeText(card)
      announce(copy.resultCopied)
    } catch {
      announce(card.replaceAll('\n', '. '))
    }
  }

  return (
    <Modal
      open={open}
      close={close}
      labelId='complete-title'
      className={cn(
        css.dialog,
        css.completionDialog,
        completionCss.completionDialog,
        cw.completionDialog,
      )}
    >
      {open && <ConfettiBurst />}
      <div
        className={cn(completionCss.completionMark, cw.completionMark)}
        aria-hidden='true'
      >
        <span>C</span>
        <span>W</span>
      </div>
      <div className={completionCss.completionBody}>
        <span>{copy.brand}</span>
        <h2 id='complete-title'>{copy.completeTitle}</h2>
        <p>{copy.completeNote}</p>
        <dl className={completionCss.resultStats}>
          <div>
            <dt>{copy.solvedIn}</dt>
            <dd>{formatTime(state.elapsedMs)}</dd>
          </div>
          <div>
            <dt>{copy.checksUsed}</dt>
            <dd>{checksUsed ? '✓' : '—'}</dd>
          </div>
          <div>
            <dt>{copy.revealsUsed}</dt>
            <dd>{revealsUsed ? '✓' : '—'}</dd>
          </div>
        </dl>
        <DailyCountdownPanel
          classes={{
            panel: completionCss.nextPuzzle,
            readout: completionCss.nextPuzzleReadout,
            ready: completionCss.nextPuzzleReady,
            track: completionCss.nextPuzzleTrack,
          }}
          labels={{
            countdown: copy.nextPuzzleIn,
            ready: copy.nextPuzzleReady,
          }}
        />
        <div className={completionCss.completionActions}>
          <button type='button' onClick={restartPuzzle}>
            {copy.playAgain}
          </button>
          <button type='button' data-initial-focus onClick={shareResult}>
            {copy.copyResult}
          </button>
          <button type='button' onClick={close}>
            {copy.close}
          </button>
        </div>
      </div>
    </Modal>
  )
}
