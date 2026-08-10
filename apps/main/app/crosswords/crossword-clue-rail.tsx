import cn from 'clsx'
import type { RefObject } from 'react'
import css from './crossword-clue-rail.module.css'
import type { Copy } from './crossword-copy'
import type { CrosswordEntry, CrosswordLocale } from './crossword-data'
import cw from './crosswords.module.css'

export const ClueList = ({
  activeId,
  entries,
  heading,
  labelId,
  listRef,
  select,
  solvedEntryIds,
  solvedLabel,
  filedLabel,
  strikeSolved,
  assistFor,
  guesses,
  progressLabel,
  progressReady,
}: {
  activeId: string
  entries: CrosswordEntry[]
  heading: string
  labelId: string
  listRef?: RefObject<HTMLDivElement | null>
  select: (entry: CrosswordEntry) => void
  solvedEntryIds: ReadonlySet<string>
  solvedLabel: string
  filedLabel: string
  strikeSolved: boolean
  assistFor: (entry: CrosswordEntry) => string | null
  guesses: string[]
  progressLabel: (solved: number, total: number) => string
  progressReady: boolean
}) => {
  const solvedCount = entries.filter((entry) =>
    solvedEntryIds.has(entry.id),
  ).length

  return (
    <section className={css.clueGroup} aria-labelledby={labelId}>
      <div className={css.cluePaper}>
        <header className={css.clueHeading}>
          <h2 id={labelId}>{heading}</h2>
          <span className={css.clueTally}>
            {progressReady && (
              <span className={cw.srOnly}>
                {progressLabel(solvedCount, entries.length)}
              </span>
            )}
            <span aria-hidden='true'>
              {progressReady ? solvedCount : '—'}/{entries.length}
            </span>
          </span>
        </header>
        <div ref={listRef} className={css.clueScroller}>
          <ol className={css.clueList}>
            {entries.map((entry) => {
              const solved = solvedEntryIds.has(entry.id)
              const assist = assistFor(entry)
              const mask = entry.cells
                .map((cellIndex) => guesses[cellIndex] || '·')
                .join('')

              return (
                <li key={entry.id}>
                  <button
                    type='button'
                    className={cn(css.clueButton, cw.clueButton)}
                    data-active={entry.id === activeId}
                    data-solved={solved}
                    data-strike={strikeSolved && solved}
                    aria-current={entry.id === activeId ? 'true' : undefined}
                    data-clue-id={entry.id}
                    onClick={() => select(entry)}
                  >
                    <span className={css.clueNumber}>{entry.number}</span>
                    <span className={css.clueCopy}>
                      {entry.clue ? (
                        <span className={css.clueText}>{entry.clue}</span>
                      ) : (
                        <>
                          <span className={css.clueMask} aria-hidden='true'>
                            {mask}
                          </span>
                          <span className={cw.srOnly}>
                            {entry.length} letters, no clue in this edition
                          </span>
                        </>
                      )}
                      {assist && <span className={css.clueMeta}>{assist}</span>}
                      {solved && (
                        <span className={cw.srOnly}> — {solvedLabel}</span>
                      )}
                    </span>
                    {solved && (
                      <span className={css.proofMark} aria-hidden='true'>
                        <span>✓</span> {filedLabel}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}

type RailProps = {
  acrossEntries: CrosswordEntry[]
  activeEntry: CrosswordEntry
  assistFor: (entry: CrosswordEntry) => string | null
  chooseEntry: (entry: CrosswordEntry, keepNativeKeyboard?: boolean) => void
  copy: Copy
  downEntries: CrosswordEntry[]
  guesses: string[]
  hydrated: boolean
  locale: CrosswordLocale
  solvedEntryIds: ReadonlySet<string>
}

export const ClueColumns = ({
  acrossEntries,
  acrossListRef,
  activeEntry,
  assistFor,
  chooseEntry,
  copy,
  downEntries,
  downListRef,
  guesses,
  hydrated,
  locale,
  solvedEntryIds,
}: RailProps & {
  acrossListRef: RefObject<HTMLDivElement | null>
  downListRef: RefObject<HTMLDivElement | null>
}) => (
  <aside className={css.clueColumns} aria-label={copy.clueList}>
    <ClueList
      heading={copy.across}
      labelId={`desktop-${locale}-across-clues`}
      entries={acrossEntries}
      activeId={activeEntry.id}
      listRef={acrossListRef}
      select={chooseEntry}
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
      labelId={`desktop-${locale}-down-clues`}
      entries={downEntries}
      activeId={activeEntry.id}
      listRef={downListRef}
      select={chooseEntry}
      solvedEntryIds={solvedEntryIds}
      solvedLabel={copy.solved}
      filedLabel={copy.filed}
      strikeSolved
      assistFor={assistFor}
      progressLabel={copy.clueProgress}
      guesses={guesses}
      progressReady={hydrated}
    />
  </aside>
)

export const MobileClueBar = ({
  activeEntry,
  assistFor,
  barRef,
  copy,
  guesses,
  moveToClue,
  openClueSheet,
}: {
  activeEntry: CrosswordEntry
  assistFor: (entry: CrosswordEntry) => string | null
  barRef: RefObject<HTMLButtonElement | null>
  copy: Copy
  guesses: string[]
  moveToClue: (delta: -1 | 1, keepNativeKeyboard?: boolean) => void
  openClueSheet: (button: HTMLButtonElement) => void
}) => {
  const badge = `${activeEntry.number}${
    activeEntry.direction === 'across' ? copy.acrossShort : copy.downShort
  }`
  const assist = assistFor(activeEntry)
  const mask = activeEntry.cells
    .map((cellIndex) => guesses[cellIndex] || '·')
    .join('')

  return (
    <div className={css.clueBar}>
      <button
        type='button'
        className={cn(css.clueStep, cw.headerKey)}
        aria-label={copy.previousClue}
        onClick={() => moveToClue(-1, true)}
      >
        <span aria-hidden='true'>‹</span>
      </button>
      <button
        ref={barRef}
        type='button'
        className={cn(css.clueCurrent, cw.headerKey)}
        aria-haspopup='dialog'
        aria-describedby='crossword-active-clue-text'
        onClick={(event) => openClueSheet(event.currentTarget)}
      >
        <span className={css.clueBarBadge} aria-hidden='true'>
          {badge}
        </span>
        <span
          className={cn(css.clueBarText, !activeEntry.clue && css.clueBarMask)}
          aria-hidden='true'
        >
          {activeEntry.clue ?? mask}
          {assist && <span className={css.clueBarMeta}> — {assist}</span>}
        </span>
        <span className={cw.srOnly}>{copy.clueList}</span>
      </button>
      <button
        type='button'
        className={cn(css.clueStep, cw.headerKey)}
        aria-label={copy.nextClue}
        onClick={() => moveToClue(1, true)}
      >
        <span aria-hidden='true'>›</span>
      </button>
    </div>
  )
}
