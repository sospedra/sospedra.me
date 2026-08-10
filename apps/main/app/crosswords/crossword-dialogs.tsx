import cn from 'clsx'
import { useEffect, useRef } from 'react'
import { ConfettiBurst } from 'services/celebration'
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
      {open && (
        <ConfettiBurst
          className={cn(completionCss.confettiBurst, cw.confettiBurst)}
        />
      )}
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
