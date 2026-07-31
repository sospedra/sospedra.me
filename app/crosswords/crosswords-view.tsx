'use client'

import cn from 'clsx'
import Link from 'components/Link'
import Shell from 'components/Shell'
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  playCarriageShift,
  playKeyClick,
  playTypewriterBell,
} from 'service/audio/key-click'
import { useDailyCountdown } from 'service/daily-countdown'
import { useGameInput } from 'service/hotkeys'
import {
  type CrosswordChallengeFile,
  type CrosswordDirection,
  type CrosswordEntry,
  type CrosswordLocale,
  type CrosswordPuzzle,
  editionFromChallenge,
  LEGACY_EDITION,
  puzzleForDate,
} from './crossword-data'
import {
  type CrosswordState,
  createCrosswordState,
  crosswordReducer,
  formatTime,
  restoreCrosswordState,
  serializeCrosswordState,
  shareCard,
} from './crossword-engine'
import css from './crosswords.module.css'

type GameSettings = {
  showTimer: boolean
  skipFilled: boolean
  autoCheck: boolean
  soundLevel: SoundLevel
  solveMode: SolveMode
  largeText: boolean
  highContrast: boolean
}

type SolveMode = 'guided' | 'standard'
type SoundLevel = 0 | 1 | 2 | 3

type DialogName = 'help' | 'complete' | null

type Scope = 'cell' | 'answer' | 'puzzle'

const DEFAULT_SETTINGS: GameSettings = {
  showTimer: true,
  skipFilled: true,
  autoCheck: false,
  soundLevel: 3,
  solveMode: 'standard',
  largeText: false,
  highContrast: false,
}

const SETTINGS_KEY = 'crossword:v1:settings'
const LOCALE_KEY = 'crossword:v1:locale'
const PROGRESS_VERSION = 'v2'
const MOBILE_LAYOUT_MEDIA =
  '(max-width: 52rem), (max-width: 64rem) and (max-height: 36rem)'
const gridRowKeys = (height: number) =>
  Array.from({ length: height }, (_, row) => `row-${row + 1}`)

const COPY = {
  en: {
    brand: 'Crosswords',
    edition: (size: string) => `Daily / ${size}`,
    issue: 'Puzzle No. 208',
    publicationLine: 'Bilingual edition',
    languageEdition: 'English edition',
    price: 'Price · 1½d',
    pageNumber: 'Page 01',
    forecast: 'Ready',
    printedBy: 'Sospedra Studio',
    puzzleDesk: 'Grid · 15 × 15',
    frontPage: 'Daily puzzle',
    leadDeckLabel: 'Crossword',
    engravingCaption: 'The presses never sleep',
    belowFold: 'Clues',
    progressLoading: 'Loading',
    clueProgress: (solved: number, total: number) =>
      `${solved} of ${total} clues solved`,
    allFiled: 'Complete',
    filed: 'Done',
    dailyCrossword: 'Daily crossword',
    tools: 'Crossword tools',
    home: 'Home',
    language: 'Puzzle language',
    english: 'English',
    spanish: 'Español',
    by: 'By',
    inkStatus: 'Ready',
    timer: 'Timer',
    pause: 'Pause',
    resume: 'Resume',
    pausedAnnouncement: 'Puzzle paused.',
    resumedAnnouncement: 'Puzzle resumed.',
    pencil: 'Pencil',
    pencilLabel: 'Pencil mode',
    pencilHint: 'Enter tentative letters in a lighter style.',
    pencilOn: 'Pencil mode on.',
    pencilOff: 'Pencil mode off.',
    check: 'Check',
    checkLabel: 'Check answers',
    checkHint: 'Mark mistakes without changing your letters.',
    reveal: 'Reveal',
    revealLabel: 'Reveal answers',
    revealHint: 'Fill correct letters and mark them as revealed.',
    settings: 'Settings',
    help: 'Help',
    more: 'More',
    across: 'Across',
    down: 'Down',
    gridInstructions:
      'Use letter keys to answer, arrows to move, Enter to change direction, and Escape to leave the grid.',
    row: 'Row',
    column: 'column',
    blank: 'Blank',
    letter: 'Letter',
    intersection: 'Intersects',
    revealed: 'Revealed',
    pencilled: 'Pencil entry',
    checked: 'Checked',
    incorrect: 'Incorrect',
    paused: 'Paused',
    pausedNote: 'The timer has stopped.',
    checkTitle: 'Check your work',
    checkNote: 'Checking marks mistakes but never changes a letter.',
    checkCell: 'Check cell',
    checkAnswer: 'Check answer',
    checkPuzzle: 'Check puzzle',
    revealTitle: 'Reveal letters',
    revealNote:
      'Revealed letters stay marked and will be noted in your result.',
    revealCell: 'Reveal cell',
    revealAnswer: 'Reveal answer',
    revealPuzzle: 'Reveal puzzle',
    cancel: 'Cancel',
    close: 'Close',
    settingsTitle: 'Settings',
    solveMode: 'Solve difficulty',
    solveModeNote:
      'Today’s grid stays the same. Difficulty changes how much help appears beside each clue.',
    guidedMode: 'Guided',
    guidedModeNote: 'Clue and first-letter hint.',
    standardMode: 'Standard',
    standardModeNote: 'Clue only.',
    showTimer: 'Show timer',
    skipFilled: 'Skip filled cells',
    autoCheck: 'Auto-check letters',
    strikeSolvedClues: 'Strike through solved clues',
    keySounds: 'Mechanical keys and typewriter return bell',
    largeText: 'Larger clue text',
    highContrast: 'High-contrast grid',
    assistControl: 'Assist',
    scopeControl: 'Scope',
    soundControl: 'Sound',
    advanceControl: 'Advance',
    proofControl: 'Proof',
    typeControl: 'Type',
    contrastControl: 'Contrast',
    cellScope: 'Cell',
    answerScope: 'Answer',
    puzzleScope: 'Grid',
    soundOff: 'Off',
    soundLow: 'Low',
    soundMedium: 'Medium',
    soundHigh: 'High',
    openCells: 'Open',
    everyCell: 'Every',
    liveProof: 'Live',
    manualProof: 'Manual',
    normalType: 'Normal',
    largeType: 'Large',
    normalContrast: 'Normal',
    highContrastValue: 'High',
    undo: 'Undo',
    redo: 'Redo',
    revealArmed: 'Reveal armed. Activate again to confirm.',
    confirmReveal: 'Confirm',
    revealDisarmed: 'Reveal disarmed.',
    timerShown: 'Timer shown.',
    timerHidden: 'Timer hidden.',
    solved: 'Solved',
    firstLetter: (letter: string) => `starts with ${letter}`,
    helpTitle: 'Keyboard shortcuts',
    keyLetters: 'Enter a letter and move forward',
    keyArrows: 'Move around the grid',
    keyEnter: 'Switch Across and Down',
    keyTab: 'Next or previous clue',
    keySpace: 'Clear and move, or switch direction',
    keyDelete: 'Clear the current cell',
    keyUndo: 'Undo or redo',
    keyEscape: 'Leave the grid',
    completeTitle: 'Crossword complete',
    completeNote: 'Every answer is correct.',
    solvedIn: 'Solved in',
    nextPuzzleIn: 'Next crossword in',
    nextPuzzleReady: 'A new crossword is out. Reload to play.',
    checksUsed: 'Checks used',
    revealsUsed: 'Reveals used',
    copyResult: 'Copy result',
    playAgain: 'Play again',
    restartedAnnouncement: 'Fresh puzzle ready.',
    resultCopied: 'Result copied.',
    notCorrect: 'The grid is full, but one answer is still incorrect.',
    noErrors: 'No errors found in that selection.',
    errorsFound: (count: number) =>
      `${count} ${count === 1 ? 'correction' : 'corrections'} marked.`,
    revealDone: 'The selected letters were revealed.',
    directionChanged: (direction: string) => `${direction} selected.`,
    clueList: 'Clues',
    switchToAcross: 'Show Across clues',
    switchToDown: 'Show Down clues',
    gridLabel: (date: string, size: string) =>
      `English crossword, ${date}, ${size}`,
    inputLabel: 'Crossword letter input',
    begin: 'Start',
    startHint: 'The clock starts when you do.',
    startedAnnouncement: 'Clock running.',
    legendTitle: 'Grid marks',
    legendChecked: 'Green underline: verified correct by Check.',
    legendRevealed: 'Red underline and dot: letter revealed for you.',
    legendIncorrect: 'Red cell: marked wrong by Check.',
  },
  es: {
    brand: 'Crucigrama',
    edition: (size: string) => `Diario / ${size}`,
    issue: 'Crucigrama n.º 208',
    publicationLine: 'Edición bilingüe',
    languageEdition: 'Edición en español',
    price: 'Precio · 1½ p.',
    pageNumber: 'Página 01',
    forecast: 'Listo',
    printedBy: 'Sospedra Studio',
    puzzleDesk: 'Cuadrícula · 15 × 15',
    frontPage: 'Crucigrama diario',
    leadDeckLabel: 'Crucigrama',
    engravingCaption: 'Las prensas nunca duermen',
    belowFold: 'Pistas',
    progressLoading: 'Cargando',
    clueProgress: (solved: number, total: number) =>
      `${solved} de ${total} pistas resueltas`,
    allFiled: 'Completo',
    filed: 'Hecho',
    dailyCrossword: 'Crucigrama diario',
    tools: 'Herramientas del crucigrama',
    home: 'Inicio',
    language: 'Idioma del crucigrama',
    english: 'English',
    spanish: 'Español',
    by: 'Por',
    inkStatus: 'Listo',
    timer: 'Cronómetro',
    pause: 'Pausar',
    resume: 'Continuar',
    pausedAnnouncement: 'Crucigrama en pausa.',
    resumedAnnouncement: 'Crucigrama reanudado.',
    pencil: 'Lápiz',
    pencilLabel: 'Modo lápiz',
    pencilHint: 'Introduce letras provisionales con un estilo más tenue.',
    pencilOn: 'Modo lápiz activado.',
    pencilOff: 'Modo lápiz desactivado.',
    check: 'Comprobar',
    checkLabel: 'Comprobar respuestas',
    checkHint: 'Marca los errores sin cambiar tus letras.',
    reveal: 'Revelar',
    revealLabel: 'Revelar respuestas',
    revealHint: 'Completa las letras correctas y las marca como reveladas.',
    settings: 'Ajustes',
    help: 'Ayuda',
    more: 'Más',
    across: 'Horizontales',
    down: 'Verticales',
    gridInstructions:
      'Usa letras para responder, flechas para moverte, Intro para cambiar de dirección y Escape para salir de la cuadrícula.',
    row: 'Fila',
    column: 'columna',
    blank: 'Vacía',
    letter: 'Letra',
    intersection: 'Cruza con',
    revealed: 'Revelada',
    pencilled: 'Letra a lápiz',
    checked: 'Comprobada',
    incorrect: 'Incorrecta',
    paused: 'En pausa',
    pausedNote: 'El cronómetro se ha detenido.',
    checkTitle: 'Comprobar respuestas',
    checkNote: 'La comprobación marca errores, pero no cambia letras.',
    checkCell: 'Comprobar casilla',
    checkAnswer: 'Comprobar respuesta',
    checkPuzzle: 'Comprobar crucigrama',
    revealTitle: 'Revelar letras',
    revealNote:
      'Las letras reveladas quedan marcadas y constarán en el resultado.',
    revealCell: 'Revelar casilla',
    revealAnswer: 'Revelar respuesta',
    revealPuzzle: 'Revelar crucigrama',
    cancel: 'Cancelar',
    close: 'Cerrar',
    settingsTitle: 'Ajustes',
    solveMode: 'Dificultad',
    solveModeNote:
      'La cuadrícula de hoy no cambia. La dificultad cambia la ayuda que aparece junto a cada pista.',
    guidedMode: 'Guiado',
    guidedModeNote: 'Pista y primera letra.',
    standardMode: 'Estándar',
    standardModeNote: 'Solo la pista.',
    showTimer: 'Mostrar cronómetro',
    skipFilled: 'Saltar casillas llenas',
    autoCheck: 'Comprobar letras automáticamente',
    strikeSolvedClues: 'Tachar las pistas resueltas',
    keySounds: 'Teclas mecánicas y campana de retorno de carro',
    largeText: 'Pistas con texto grande',
    highContrast: 'Cuadrícula de alto contraste',
    assistControl: 'Ayuda',
    scopeControl: 'Alcance',
    soundControl: 'Sonido',
    advanceControl: 'Avance',
    proofControl: 'Prueba',
    typeControl: 'Texto',
    contrastControl: 'Contraste',
    cellScope: 'Casilla',
    answerScope: 'Respuesta',
    puzzleScope: 'Cuadrícula',
    soundOff: 'Apagado',
    soundLow: 'Bajo',
    soundMedium: 'Medio',
    soundHigh: 'Alto',
    openCells: 'Libres',
    everyCell: 'Todas',
    liveProof: 'Directa',
    manualProof: 'Manual',
    normalType: 'Normal',
    largeType: 'Grande',
    normalContrast: 'Normal',
    highContrastValue: 'Alto',
    undo: 'Deshacer',
    redo: 'Rehacer',
    revealArmed: 'Revelar preparado. Activa de nuevo para confirmar.',
    confirmReveal: 'Confirmar',
    revealDisarmed: 'Revelado desactivado.',
    timerShown: 'Cronómetro visible.',
    timerHidden: 'Cronómetro oculto.',
    solved: 'Resuelta',
    firstLetter: (letter: string) => `empieza por ${letter}`,
    helpTitle: 'Atajos de teclado',
    keyLetters: 'Escribir una letra y avanzar',
    keyArrows: 'Moverse por la cuadrícula',
    keyEnter: 'Cambiar entre horizontal y vertical',
    keyTab: 'Pista siguiente o anterior',
    keySpace: 'Borrar y avanzar, o cambiar dirección',
    keyDelete: 'Borrar la casilla actual',
    keyUndo: 'Deshacer o rehacer',
    keyEscape: 'Salir de la cuadrícula',
    completeTitle: 'Crucigrama completado',
    completeNote: 'Todas las respuestas son correctas.',
    solvedIn: 'Resuelto en',
    nextPuzzleIn: 'Próximo crucigrama en',
    nextPuzzleReady: 'Hay un crucigrama nuevo. Recarga para jugar.',
    checksUsed: 'Comprobaciones',
    revealsUsed: 'Letras reveladas',
    copyResult: 'Copiar resultado',
    playAgain: 'Volver a jugar',
    restartedAnnouncement: 'Crucigrama nuevo listo.',
    resultCopied: 'Resultado copiado.',
    notCorrect:
      'La cuadrícula está llena, pero aún hay una respuesta incorrecta.',
    noErrors: 'No se encontraron errores en la selección.',
    errorsFound: (count: number) =>
      `${count} ${count === 1 ? 'corrección marcada' : 'correcciones marcadas'}.`,
    revealDone: 'Se revelaron las letras seleccionadas.',
    directionChanged: (direction: string) => `Dirección ${direction}.`,
    clueList: 'Pistas',
    switchToAcross: 'Mostrar pistas horizontales',
    switchToDown: 'Mostrar pistas verticales',
    gridLabel: (date: string, size: string) =>
      `Crucigrama en español, ${date}, ${size}`,
    inputLabel: 'Entrada de letras del crucigrama',
    begin: 'Empezar',
    startHint: 'El cronómetro empieza contigo.',
    startedAnnouncement: 'Cronómetro en marcha.',
    legendTitle: 'Marcas de la cuadrícula',
    legendChecked: 'Subrayado verde: letra verificada con Comprobar.',
    legendRevealed: 'Subrayado rojo y punto: letra revelada.',
    legendIncorrect: 'Casilla roja: marcada como incorrecta al comprobar.',
  },
} as const

const normalizeLetter = (value: string) => {
  const preserved = value.toUpperCase().replaceAll('Ñ', '\u0000')
  const normalized = preserved
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('\u0000', 'Ñ')
  return [...normalized].findLast((letter) => /^[A-ZÑ]$/u.test(letter)) ?? ''
}

const directionLabel = (
  direction: CrosswordDirection,
  locale: CrosswordLocale,
) => COPY[locale][direction]

// The grid already shows every answer's length; the only assist worth
// offering is the first letter, and it derives from the fill for free.
const clueAssist = (
  entry: CrosswordEntry,
  mode: SolveMode,
  locale: CrosswordLocale,
) => {
  if (mode !== 'guided') return null
  return COPY[locale].firstLetter(entry.gridAnswer[0])
}

const NextPuzzleCountdown = ({
  copy,
}: {
  copy: (typeof COPY)[CrosswordLocale]
}) => {
  const countdown = useDailyCountdown()
  if (!countdown.label) return null
  if (countdown.ready) {
    return (
      <button
        type='button'
        className={css.nextPuzzleReady}
        onClick={() => window.location.reload()}
      >
        {copy.nextPuzzleReady}
      </button>
    )
  }
  return (
    <div className={css.nextPuzzle}>
      <p className={css.nextPuzzleReadout}>
        <span>{copy.nextPuzzleIn}</span>
        <strong>{countdown.label}</strong>
      </p>
      <span
        className={css.nextPuzzleTrack}
        aria-hidden='true'
        style={
          {
            '--remaining': countdown.remainingFraction ?? 0,
          } as CSSProperties
        }
      >
        <span />
      </span>
    </div>
  )
}

const entryFor = (
  puzzle: CrosswordPuzzle,
  index: number,
  direction: CrosswordDirection,
) => {
  const cell = puzzle.cells[index]
  if (!cell) return null
  const id = cell.entryIds.find((entryId) => entryId.endsWith(direction))
  return puzzle.entries.find((entry) => entry.id === id) ?? null
}

const availableDirection = (
  puzzle: CrosswordPuzzle,
  index: number,
  preferred: CrosswordDirection,
) =>
  entryFor(puzzle, index, preferred)
    ? preferred
    : preferred === 'across'
      ? 'down'
      : 'across'

const firstOpenCell = (entry: CrosswordEntry, guesses: string[]) =>
  entry.cells.find((index) => !guesses[index]) ?? entry.cells[0]

const progressKey = (puzzle: CrosswordPuzzle) =>
  `crossword:${PROGRESS_VERSION}:progress:${puzzle.locale}:${puzzle.publicationDate}`

const Timer = ({
  elapsedMs,
  runStartedAt,
  running,
}: {
  elapsedMs: number
  runStartedAt: number | null
  running: boolean
}) => {
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [running])

  const displayed =
    elapsedMs +
    (running && runStartedAt !== null ? Math.max(0, now - runStartedAt) : 0)
  return <>{formatTime(displayed)}</>
}

const CorrectWordSweep = ({
  entry,
  width,
}: {
  entry: CrosswordEntry
  width: number
}) => {
  const firstCell = entry.cells[0]
  const row = Math.floor(firstCell / width)
  const column = firstCell % width

  return (
    <span
      className={css.wordSweep}
      data-direction={entry.direction}
      style={
        {
          '--cw-sweep-column': column,
          '--cw-sweep-length': entry.length,
          '--cw-sweep-row': row,
        } as CSSProperties
      }
      aria-hidden='true'
    >
      <span className={css.sweepRail} />
      <span className={css.sweepHead} />
      <span className={css.sweepRegister} />
    </span>
  )
}

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
const CONFETTI_PIECES = Array.from({ length: 26 }, (_, index) => ({
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
  <div className={css.confettiBurst} aria-hidden='true'>
    {CONFETTI_PIECES.map((piece) => (
      <span
        key={piece.id}
        className={css.confettiPiece}
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

const Modal = ({
  children,
  className,
  close,
  labelId,
  open,
}: {
  children: ReactNode
  className?: string
  close: () => void
  labelId: string
  open: boolean
}) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      window.requestAnimationFrame(() => {
        dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus()
      })
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cn(css.dialog, className)}
      aria-labelledby={labelId}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
    >
      {children}
    </dialog>
  )
}

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

const ClueList = ({
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
              <span className={css.srOnly}>
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
                    className={css.clueButton}
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
                        <span className={css.clueMask} aria-hidden='true'>
                          {mask}
                        </span>
                      )}
                      {assist && <span className={css.clueMeta}>{assist}</span>}
                      {solved && (
                        <span className={css.srOnly}> — {solvedLabel}</span>
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

const ParameterKnob = ({
  label,
  max,
  onChange,
  tone,
  value,
  valueText,
}: {
  label: string
  max: number
  onChange: (value: number) => void
  tone: 'blue' | 'ember' | 'ivory'
  value: number
  valueText: string
}) => {
  const rotation = -132 + (value / Math.max(1, max)) * 264

  return (
    <label className={css.parameterKnob} data-tone={tone}>
      <span className={css.parameterLabel}>{label}</span>
      <span className={css.knobWell}>
        <input
          type='range'
          min={0}
          max={max}
          step={1}
          value={value}
          aria-label={label}
          aria-valuetext={valueText}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span
          className={css.knobDial}
          style={{ '--cw-knob-turn': `${rotation}deg` } as CSSProperties}
          aria-hidden='true'
        >
          <span />
        </span>
      </span>
      <output>{valueText}</output>
    </label>
  )
}

const ParameterSlider = ({
  label,
  max,
  onChange,
  tone,
  value,
  valueText,
}: {
  label: string
  max: number
  onChange: (value: number) => void
  tone: 'blue' | 'ember' | 'ivory'
  value: number
  valueText: string
}) => (
  <label className={css.parameterSlider} data-tone={tone} data-stops={max + 1}>
    <span className={css.parameterLabel}>{label}</span>
    <span className={css.slideWell}>
      <input
        type='range'
        min={0}
        max={max}
        step={1}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className={css.slideTrack} aria-hidden='true'>
        <span
          className={css.slideThumb}
          style={
            {
              '--cw-slide-stop': value / Math.max(1, max),
            } as CSSProperties
          }
        />
      </span>
    </span>
    <output>{valueText}</output>
  </label>
)

const DeckSwitch = ({
  active,
  label,
  offLabel,
  onClick,
  onLabel,
}: {
  active: boolean
  label: string
  offLabel: string
  onClick: () => void
  onLabel: string
}) => (
  <button
    type='button'
    className={css.deckSwitch}
    data-active={active}
    aria-label={`${label}: ${active ? onLabel : offLabel}`}
    aria-pressed={active}
    onClick={onClick}
  >
    <span className={css.switchLegend}>{label}</span>
    <span className={css.switchTrack} aria-hidden='true'>
      <span />
    </span>
    <span className={css.switchValue}>{active ? onLabel : offLabel}</span>
  </button>
)

const ToolbarButton = ({
  active,
  children,
  className,
  descriptionId,
  disabled,
  hasPopup,
  label,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  className?: string
  descriptionId?: string
  disabled?: boolean
  hasPopup?: boolean
  label: string
  onClick: (button: HTMLButtonElement) => void
}) => (
  <button
    type='button'
    className={cn(css.toolButton, className)}
    aria-label={label}
    aria-describedby={descriptionId}
    aria-haspopup={hasPopup ? 'dialog' : undefined}
    aria-pressed={active}
    disabled={disabled}
    onClick={(event) => onClick(event.currentTarget)}
  >
    {children}
  </button>
)

function CrosswordSession({
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
  const [hydrated, setHydrated] = useState(false)
  const [dialog, setDialog] = useState<DialogName>(null)
  const [mobileClueDirection, setMobileClueDirection] =
    useState<CrosswordDirection>('across')
  const [announcement, setAnnouncement] = useState('')
  const [wordSweep, setWordSweep] = useState<{
    entryId: string
    run: number
  } | null>(null)
  const [toolScope, setToolScope] = useState<Scope>('answer')
  const [armedRevealTarget, setArmedRevealTarget] = useState<string | null>(
    null,
  )
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const focusGridRef = useRef(false)
  const touchHandledRef = useRef(false)
  const pointerDownCellRef = useRef<number | null>(null)
  const composingRef = useRef(false)
  const skipInputRef = useRef(false)
  const latestStateRef = useRef(state)
  const fullIncorrectRef = useRef('')
  const announcementNonceRef = useRef(false)
  const sweepRunRef = useRef(0)
  const previousStatusRef = useRef(state.status)
  const acrossListRef = useRef<HTMLDivElement>(null)
  const downListRef = useRef<HTMLDivElement>(null)
  const mobileListRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string) => {
    announcementNonceRef.current = !announcementNonceRef.current
    setAnnouncement(`${message}${announcementNonceRef.current ? '\u200B' : ''}`)
  }, [])

  const bringCellIntoView = useCallback((index: number) => {
    cellRefs.current[index]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  }, [])

  const focusCellAt = useCallback(
    (index: number) => {
      cellRefs.current[index]?.focus({ preventScroll: true })
      bringCellIntoView(index)
    },
    [bringCellIntoView],
  )

  const getAudioContext = useCallback(() => {
    if (settings.soundLevel === 0) return null
    try {
      if (
        !audioContextRef.current ||
        audioContextRef.current.state === 'closed'
      ) {
        audioContextRef.current = new AudioContext()
      }
      const context = audioContextRef.current
      if (context.state === 'suspended') {
        void context.resume().catch(() => {})
      }
      return context
    } catch {
      // Audio is tactile polish; browser restrictions must never block play.
      return null
    }
  }, [settings.soundLevel])

  const clickKey = useCallback(() => {
    const context = getAudioContext()
    if (context) {
      playKeyClick(context, [0, 0.055, 0.09, 0.12][settings.soundLevel])
    }
  }, [getAudioContext, settings.soundLevel])

  const ringTypewriterBell = useCallback(() => {
    const context = getAudioContext()
    if (context) {
      playTypewriterBell(context, [0, 0.08, 0.12, 0.16][settings.soundLevel])
    }
  }, [getAudioContext, settings.soundLevel])

  const shiftCarriage = useCallback(() => {
    const context = getAudioContext()
    if (context) {
      playCarriageShift(context, [0, 0.05, 0.08, 0.11][settings.soundLevel])
    }
  }, [getAudioContext, settings.soundLevel])

  useEffect(
    () => () => {
      const context = audioContextRef.current
      audioContextRef.current = null
      if (context && context.state !== 'closed') {
        void context.close().catch(() => {})
      }
    },
    [],
  )

  const acrossEntries = useMemo(
    () => puzzle.entries.filter((entry) => entry.direction === 'across'),
    [puzzle],
  )
  const downEntries = useMemo(
    () => puzzle.entries.filter((entry) => entry.direction === 'down'),
    [puzzle],
  )
  const orderedEntries = useMemo(
    () => [...acrossEntries, ...downEntries],
    [acrossEntries, downEntries],
  )
  const solvedEntryIds = useMemo(
    () =>
      new Set(
        puzzle.entries
          .filter((entry) =>
            entry.cells.every(
              (index) => state.guesses[index] === puzzle.cells[index]?.solution,
            ),
          )
          .map((entry) => entry.id),
      ),
    [puzzle, state.guesses],
  )
  const assistFor = useCallback(
    (entry: CrosswordEntry) => clueAssist(entry, settings.solveMode, locale),
    [locale, settings.solveMode],
  )
  const activeEntry =
    entryFor(puzzle, state.selectedCell, state.direction) ?? orderedEntries[0]
  const revealTargetKey =
    toolScope === 'cell'
      ? `cell:${state.selectedCell}`
      : toolScope === 'answer'
        ? `answer:${activeEntry.id}`
        : 'puzzle'
  const revealArmed = armedRevealTarget === revealTargetKey
  const sweepEntry = wordSweep
    ? puzzle.entries.find((entry) => entry.id === wordSweep.entryId)
    : undefined
  const selectedEntryCells = useMemo(
    () => new Set(activeEntry.cells),
    [activeEntry],
  )
  const whiteIndices = useMemo(
    () =>
      puzzle.cells.flatMap((cell) =>
        cell.solution === null ? [] : [cell.index],
      ),
    [puzzle],
  )
  const solutions = useMemo(
    () =>
      Object.fromEntries(
        puzzle.cells.flatMap((cell) =>
          cell.solution === null ? [] : [[cell.index, cell.solution]],
        ),
      ),
    [puzzle],
  )

  latestStateRef.current = state

  const closeDialog = useCallback(() => {
    setDialog(null)
    window.requestAnimationFrame(() => openerRef.current?.focus())
  }, [])

  const openDialog = useCallback(
    (name: Exclude<DialogName, null>, opener?: HTMLElement) => {
      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      inputRef.current?.blur()
      openerRef.current = opener ?? activeElement
      setDialog(name)
    },
    [],
  )

  const save = useCallback(
    (current: CrosswordState) => {
      try {
        window.localStorage.setItem(
          progressKey(puzzle),
          JSON.stringify(serializeCrosswordState(current, puzzle.id)),
        )
      } catch {
        // Private browsing and storage quotas must never interrupt play.
      }
    },
    [puzzle],
  )

  const restartPuzzle = useCallback(() => {
    const freshState = createCrosswordState(puzzle)
    latestStateRef.current = freshState
    previousStatusRef.current = freshState.status
    fullIncorrectRef.current = ''
    focusGridRef.current = true
    openerRef.current = null
    setWordSweep(null)
    setArmedRevealTarget(null)
    document.querySelector<HTMLDialogElement>('dialog[open]')?.close()
    setDialog(null)
    dispatch({ type: 'HYDRATE', state: freshState })
    save(freshState)
    announce(copy.restartedAnnouncement)
    window.requestAnimationFrame(() => focusCellAt(freshState.selectedCell))
  }, [announce, copy.restartedAnnouncement, focusCellAt, puzzle, save])

  const startPuzzle = useCallback(() => {
    focusGridRef.current = true
    dispatch({ type: 'START', now: Date.now() })
    announce(copy.startedAnnouncement)
    window.requestAnimationFrame(() =>
      focusCellAt(latestStateRef.current.selectedCell),
    )
  }, [announce, copy.startedAnnouncement, focusCellAt])

  const resumePuzzle = useCallback(() => {
    const mobile = window.matchMedia(MOBILE_LAYOUT_MEDIA).matches
    const selectedCell = latestStateRef.current.selectedCell
    focusGridRef.current = !mobile
    announce(copy.resumedAnnouncement)
    dispatch({ type: 'RESUME', now: Date.now() })
    window.requestAnimationFrame(() => {
      if (mobile) {
        bringCellIntoView(selectedCell)
        inputRef.current?.focus({ preventScroll: true })
      } else {
        focusCellAt(selectedCell)
      }
    })
  }, [announce, bringCellIntoView, copy.resumedAnnouncement, focusCellAt])

  const changeLocale = useCallback(
    (nextLocale: CrosswordLocale) => {
      if (nextLocale === locale) return
      const current = latestStateRef.current
      const persisted =
        current.status === 'playing'
          ? crosswordReducer(current, {
              type: 'PAUSE',
              now: Date.now(),
              automatic: false,
            })
          : current
      save(persisted)
      setLocale(nextLocale)
    },
    [locale, save, setLocale],
  )

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(progressKey(puzzle))
      if (raw) {
        const restored = restoreCrosswordState(JSON.parse(raw), puzzle)
        if (restored) dispatch({ type: 'HYDRATE', state: restored })
      }
    } catch {
      // Invalid or unavailable local storage falls back to a fresh grid.
    } finally {
      setHydrated(true)
    }
  }, [puzzle])

  useEffect(() => {
    if (!hydrated) return
    const timeout = window.setTimeout(() => save(state), 180)
    return () => window.clearTimeout(timeout)
  }, [hydrated, save, state])

  useEffect(() => {
    const flush = () => save(latestStateRef.current)
    const onVisibility = () => {
      if (document.hidden) {
        const current = latestStateRef.current
        if (current.status === 'playing') {
          const action = {
            type: 'PAUSE' as const,
            now: Date.now(),
            automatic: true,
          }
          const pausedState = crosswordReducer(current, action)
          latestStateRef.current = pausedState
          dispatch(action)
          save(pausedState)
        } else {
          save(current)
        }
        return
      }
      if (
        latestStateRef.current.status === 'paused' &&
        latestStateRef.current.autoPaused
      ) {
        dispatch({ type: 'RESUME', now: Date.now() })
      }
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [save])

  useEffect(() => {
    bringCellIntoView(state.selectedCell)
    if (focusGridRef.current) focusCellAt(state.selectedCell)
  }, [bringCellIntoView, focusCellAt, state.selectedCell])

  useEffect(() => {
    setMobileClueDirection(activeEntry.direction)
  }, [activeEntry.direction])

  useEffect(() => {
    if (!wordSweep) return
    const timeout = window.setTimeout(() => setWordSweep(null), 900)
    return () => window.clearTimeout(timeout)
  }, [wordSweep])

  useEffect(() => {
    if (!armedRevealTarget) return
    const timeout = window.setTimeout(() => setArmedRevealTarget(null), 5000)
    const disarm = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setArmedRevealTarget(null)
      announce(copy.revealDisarmed)
    }
    window.addEventListener('keydown', disarm)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('keydown', disarm)
    }
  }, [announce, armedRevealTarget, copy.revealDisarmed])

  useEffect(() => {
    if (armedRevealTarget && armedRevealTarget !== revealTargetKey) {
      setArmedRevealTarget(null)
    }
  }, [armedRevealTarget, revealTargetKey])

  const centerClueInList = useCallback(
    (
      list: HTMLDivElement | null,
      entryId: string,
      behavior: ScrollBehavior = 'smooth',
    ) => {
      const clue = list?.querySelector<HTMLElement>(
        `[data-clue-id="${entryId}"]`,
      )
      if (!list || !clue) return
      const listBounds = list.getBoundingClientRect()
      const clueBounds = clue.getBoundingClientRect()
      const top =
        list.scrollTop +
        clueBounds.top -
        listBounds.top -
        (list.clientHeight - clueBounds.height) / 2
      const reducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('fx-quiet')

      list.scrollTo({
        top: Math.max(0, Math.min(top, list.scrollHeight - list.clientHeight)),
        behavior: reducedMotion ? 'auto' : behavior,
      })
    },
    [],
  )

  useEffect(() => {
    const list =
      activeEntry.direction === 'across'
        ? acrossListRef.current
        : downListRef.current
    const frame = window.requestAnimationFrame(() => {
      centerClueInList(list, activeEntry.id)
      if (mobileClueDirection === activeEntry.direction) {
        centerClueInList(mobileListRef.current, activeEntry.id)
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeEntry, centerClueInList, mobileClueDirection])

  useEffect(() => {
    const mobileLayout = window.matchMedia(MOBILE_LAYOUT_MEDIA)
    const viewport = window.visualViewport
    let frame = 0
    const recenterMobileClue = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (
          mobileLayout.matches &&
          mobileClueDirection === activeEntry.direction
        ) {
          centerClueInList(mobileListRef.current, activeEntry.id, 'auto')
        }
      })
    }

    recenterMobileClue()
    mobileLayout.addEventListener('change', recenterMobileClue)
    viewport?.addEventListener('resize', recenterMobileClue)
    viewport?.addEventListener('scroll', recenterMobileClue)
    window.addEventListener('resize', recenterMobileClue)
    return () => {
      window.cancelAnimationFrame(frame)
      mobileLayout.removeEventListener('change', recenterMobileClue)
      viewport?.removeEventListener('resize', recenterMobileClue)
      viewport?.removeEventListener('scroll', recenterMobileClue)
      window.removeEventListener('resize', recenterMobileClue)
    }
  }, [
    activeEntry.direction,
    activeEntry.id,
    centerClueInList,
    mobileClueDirection,
  ])

  const focusActiveClue = useCallback(() => {
    const mobile = window.matchMedia(MOBILE_LAYOUT_MEDIA).matches
    const list = mobile
      ? mobileListRef.current
      : activeEntry.direction === 'across'
        ? acrossListRef.current
        : downListRef.current
    const clue = list?.querySelector<HTMLButtonElement>(
      `[data-clue-id="${activeEntry.id}"]`,
    )
    clue?.focus({ preventScroll: true })
    centerClueInList(list, activeEntry.id, 'auto')
  }, [activeEntry.direction, activeEntry.id, centerClueInList])

  useEffect(() => {
    const filled = whiteIndices.every((index) => state.guesses[index])
    if (!filled) {
      fullIncorrectRef.current = ''
      return
    }
    const correct = whiteIndices.every(
      (index) => state.guesses[index] === puzzle.cells[index]?.solution,
    )
    if (correct && state.status !== 'complete') {
      dispatch({ type: 'COMPLETE', now: Date.now() })
      return
    }
    if (!correct) {
      const signature = state.guesses.join('')
      if (fullIncorrectRef.current !== signature) {
        fullIncorrectRef.current = signature
        announce(copy.notCorrect)
      }
    }
  }, [
    announce,
    copy.notCorrect,
    puzzle,
    state.guesses,
    state.status,
    whiteIndices,
  ])

  useEffect(() => {
    if (
      state.status === 'complete' &&
      previousStatusRef.current !== 'complete'
    ) {
      save(state)
      openDialog('complete')
    }
    previousStatusRef.current = state.status
  }, [openDialog, save, state])

  const chooseEntry = useCallback(
    (entry: CrosswordEntry, keepNativeKeyboard = false) => {
      const index = firstOpenCell(entry, latestStateRef.current.guesses)
      focusGridRef.current = !keepNativeKeyboard
      dispatch({
        type: 'SELECT',
        index,
        direction: entry.direction,
      })
      window.requestAnimationFrame(() => {
        if (keepNativeKeyboard) {
          bringCellIntoView(index)
          inputRef.current?.focus({ preventScroll: true })
        } else {
          focusCellAt(index)
        }
      })
    },
    [bringCellIntoView, focusCellAt],
  )

  const chooseMobileDirection = useCallback(
    (direction: CrosswordDirection) => {
      const current = latestStateRef.current
      const entries = direction === 'across' ? acrossEntries : downEntries
      const entry =
        entryFor(puzzle, current.selectedCell, direction) ??
        entries.find((candidate) =>
          candidate.cells.some((index) => !current.guesses[index]),
        ) ??
        entries[0]
      if (!entry) return
      setMobileClueDirection(direction)
      chooseEntry(entry, true)
    },
    [acrossEntries, chooseEntry, downEntries, puzzle],
  )

  const moveToClue = useCallback(
    (delta: -1 | 1, keepNativeKeyboard = false) => {
      const found = orderedEntries.findIndex(
        (entry) => entry.id === activeEntry.id,
      )
      const current = found >= 0 ? found : 0
      const next =
        (current + delta + orderedEntries.length) % orderedEntries.length
      shiftCarriage()
      chooseEntry(orderedEntries[next], keepNativeKeyboard)
    },
    [activeEntry.id, chooseEntry, orderedEntries, shiftCarriage],
  )

  const advanceWithinEntry = useCallback(
    (
      index: number,
      delta: -1 | 1,
      skipFilled = settings.skipFilled,
      guesses = latestStateRef.current.guesses,
    ): { index: number; direction: CrosswordDirection } => {
      const entry =
        entryFor(puzzle, index, latestStateRef.current.direction) ?? activeEntry
      const position = entry.cells.indexOf(index)
      const candidates =
        delta === 1
          ? entry.cells.slice(position + 1)
          : entry.cells.slice(0, position).reverse()
      if (skipFilled) {
        const open = candidates.find((cellIndex) => !guesses[cellIndex])
        if (open !== undefined) {
          return { index: open, direction: entry.direction }
        }
      } else {
        const adjacent = candidates[0]
        if (adjacent !== undefined) {
          return { index: adjacent, direction: entry.direction }
        }
      }

      const clueIndex = orderedEntries.findIndex(
        (candidate) => candidate.id === entry.id,
      )
      for (let step = 1; step < orderedEntries.length; step += 1) {
        const nextEntry =
          orderedEntries[
            (clueIndex + step * delta + orderedEntries.length) %
              orderedEntries.length
          ]
        const entryCells =
          delta === 1 ? nextEntry.cells : [...nextEntry.cells].reverse()
        const nextIndex = skipFilled
          ? entryCells.find((cellIndex) => !guesses[cellIndex])
          : entryCells[0]
        if (nextIndex !== undefined) {
          return { index: nextIndex, direction: nextEntry.direction }
        }
      }

      return { index, direction: entry.direction }
    },
    [activeEntry, orderedEntries, puzzle, settings.skipFilled],
  )

  const writeLetter = useCallback(
    (value: string) => {
      if (
        latestStateRef.current.status === 'paused' ||
        latestStateRef.current.status === 'complete'
      ) {
        return
      }
      const letter = normalizeLetter(value)
      if (!letter) return
      const current = latestStateRef.current
      const index = current.selectedCell
      const currentDirection = current.direction
      const projectedGuesses = [...current.guesses]
      projectedGuesses[index] = letter
      const destination = advanceWithinEntry(
        index,
        1,
        settings.skipFilled,
        projectedGuesses,
      )
      focusGridRef.current = document.activeElement !== inputRef.current
      if (current.revealedCells[index]) {
        dispatch({
          type: 'SELECT',
          index: destination.index,
          direction: destination.direction,
        })
        return
      }
      const solvedEntry = puzzle.cells[index]?.entryIds
        .map((entryId) =>
          puzzle.entries.find((candidate) => candidate.id === entryId),
        )
        .find((entry) => {
          if (!entry) return false
          const wasSolved = entry.cells.every(
            (cellIndex) =>
              current.guesses[cellIndex] === puzzle.cells[cellIndex]?.solution,
          )
          const isSolved = entry.cells.every(
            (cellIndex) =>
              projectedGuesses[cellIndex] === puzzle.cells[cellIndex]?.solution,
          )
          return !wasSolved && isSolved
        })
      clickKey()
      dispatch({
        type: 'WRITE',
        index,
        value: letter,
        nextIndex: destination.index,
        checked: settings.autoCheck,
        incorrect:
          settings.autoCheck && letter !== puzzle.cells[index]?.solution,
        now: Date.now(),
      })
      if (destination.direction !== currentDirection) {
        dispatch({ type: 'SET_DIRECTION', direction: destination.direction })
      }
      if (solvedEntry) {
        sweepRunRef.current += 1
        setWordSweep({
          entryId: solvedEntry.id,
          run: sweepRunRef.current,
        })
        ringTypewriterBell()
      }
    },
    [
      advanceWithinEntry,
      clickKey,
      puzzle,
      ringTypewriterBell,
      settings.autoCheck,
      settings.skipFilled,
    ],
  )

  const eraseBackward = useCallback(() => {
    const current = latestStateRef.current
    if (current.status === 'paused' || current.status === 'complete') return
    focusGridRef.current = document.activeElement !== inputRef.current

    const erasable = (index: number) =>
      Boolean(current.guesses[index]) && !current.revealedCells[index]

    // Erase in place when the selected cell holds a letter; otherwise walk
    // one cell back per press, erasing only when the target has one. The
    // walk must not stall on empty or revealed cells.
    const selected = current.selectedCell
    const target = erasable(selected)
      ? { index: selected, direction: current.direction }
      : advanceWithinEntry(selected, -1, false)
    if (!erasable(target.index)) {
      dispatch({
        type: 'SELECT',
        index: target.index,
        direction: target.direction,
      })
      return
    }

    clickKey()
    dispatch({
      type: 'CLEAR',
      index: target.index,
      nextIndex: target.index,
      now: Date.now(),
    })
    if (target.direction !== current.direction) {
      dispatch({ type: 'SET_DIRECTION', direction: target.direction })
    }
  }, [advanceWithinEntry, clickKey])

  const selectCell = useCallback(
    (index: number, nativeKeyboard: boolean, reclick: boolean) => {
      const current = latestStateRef.current
      const cell = puzzle.cells[index]
      if (!cell || cell.solution === null) return
      let direction = availableDirection(puzzle, index, current.direction)

      // Focus fires before click and already moves the selection, so a plain
      // selectedCell comparison would flip direction on every fresh click.
      // Only a click on the cell that was selected at pointerdown toggles.
      if (
        reclick &&
        index === current.selectedCell &&
        cell.entryIds.length > 1
      ) {
        direction = current.direction === 'across' ? 'down' : 'across'
        announce(copy.directionChanged(directionLabel(direction, locale)))
      }
      focusGridRef.current = !nativeKeyboard
      dispatch({ type: 'SELECT', index, direction })
      if (nativeKeyboard) {
        inputRef.current?.focus({ preventScroll: true })
      }
    },
    [announce, copy, locale, puzzle],
  )

  const moveGeometrically = useCallback(
    (rowDelta: number, columnDelta: number) => {
      const current = latestStateRef.current
      const { width, height } = puzzle
      let row = Math.floor(current.selectedCell / width) + rowDelta
      let column = (current.selectedCell % width) + columnDelta
      while (row >= 0 && row < height && column >= 0 && column < width) {
        const index = row * width + column
        if (puzzle.cells[index]?.solution !== null) {
          const requested: CrosswordDirection =
            columnDelta === 0 ? 'down' : 'across'
          const direction = availableDirection(puzzle, index, requested)
          focusGridRef.current = true
          dispatch({ type: 'SELECT', index, direction })
          return
        }
        row += rowDelta
        column += columnDelta
      }
    },
    [puzzle],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.nativeEvent.isComposing || composingRef.current) return
      const current = latestStateRef.current
      const hasCommand = event.metaKey || event.ctrlKey
      const lower = event.key.toLowerCase()

      if (hasCommand && lower === 'z') {
        event.preventDefault()
        dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' })
        return
      }
      if (event.altKey || (hasCommand && !['home', 'end'].includes(lower))) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        moveGeometrically(0, -1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        moveGeometrically(0, 1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveGeometrically(-1, 0)
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveGeometrically(1, 0)
      } else if (event.key === 'Enter') {
        const cell = puzzle.cells[current.selectedCell]
        if (cell && cell.entryIds.length > 1) {
          event.preventDefault()
          const direction = current.direction === 'across' ? 'down' : 'across'
          dispatch({ type: 'SET_DIRECTION', direction })
          announce(copy.directionChanged(directionLabel(direction, locale)))
        }
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        eraseBackward()
      } else if (event.key === 'Delete') {
        event.preventDefault()
        if (current.status === 'paused' || current.status === 'complete') return
        if (
          current.guesses[current.selectedCell] &&
          !current.revealedCells[current.selectedCell]
        ) {
          clickKey()
        }
        dispatch({
          type: 'CLEAR',
          index: current.selectedCell,
          nextIndex: current.selectedCell,
          now: Date.now(),
        })
      } else if (event.key === ' ') {
        event.preventDefault()
        if (current.status === 'paused' || current.status === 'complete') return
        if (!current.guesses[current.selectedCell]) {
          dispatch({ type: 'TOGGLE_DIRECTION' })
        } else {
          const destination = advanceWithinEntry(current.selectedCell, 1)
          if (!current.revealedCells[current.selectedCell]) clickKey()
          dispatch({
            type: 'CLEAR',
            index: current.selectedCell,
            nextIndex: destination.index,
            now: Date.now(),
          })
          if (destination.direction !== current.direction) {
            dispatch({
              type: 'SET_DIRECTION',
              direction: destination.direction,
            })
          }
        }
      } else if (event.key === 'Tab') {
        event.preventDefault()
        focusGridRef.current = true
        moveToClue(event.shiftKey ? -1 : 1)
      } else if (event.key === '[' || event.key === ']') {
        event.preventDefault()
        focusGridRef.current = true
        moveToClue(event.key === '[' ? -1 : 1)
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        const entry =
          entryFor(puzzle, current.selectedCell, current.direction) ??
          activeEntry
        const index = hasCommand
          ? event.key === 'Home'
            ? whiteIndices[0]
            : (whiteIndices.at(-1) ?? current.selectedCell)
          : event.key === 'Home'
            ? entry.cells[0]
            : (entry.cells.at(-1) ?? current.selectedCell)
        focusGridRef.current = true
        dispatch({
          type: 'SELECT',
          index,
          direction: availableDirection(puzzle, index, current.direction),
        })
      } else if (event.key === 'Escape') {
        event.preventDefault()
        focusGridRef.current = false
        focusActiveClue()
      } else if (event.key === '?') {
        event.preventDefault()
        openDialog('help', event.currentTarget)
      } else if (!hasCommand && !event.altKey && event.key.length === 1) {
        // Named keys ('Shift', 'CapsLock', 'Dead', 'F1'…) must never reach
        // the normalizer: it keeps the last A-Z glyph, so SHIFT typed a T.
        const letter = normalizeLetter(event.key)
        if (letter) {
          event.preventDefault()
          writeLetter(letter)
        }
      }
    },
    [
      activeEntry,
      advanceWithinEntry,
      announce,
      clickKey,
      copy,
      eraseBackward,
      focusActiveClue,
      locale,
      moveGeometrically,
      moveToClue,
      openDialog,
      puzzle,
      whiteIndices,
      writeLetter,
    ],
  )

  const indicesFor = useCallback(
    (scope: Scope) => {
      if (scope === 'cell') return [latestStateRef.current.selectedCell]
      if (scope === 'answer') return [...activeEntry.cells]
      return whiteIndices
    },
    [activeEntry.cells, whiteIndices],
  )

  const check = (scope: Scope) => {
    const indices = indicesFor(scope)
    dispatch({ type: 'CHECK', indices, solutions })
    const count = indices.filter(
      (index) =>
        latestStateRef.current.guesses[index] &&
        latestStateRef.current.guesses[index] !== solutions[index],
    ).length
    announce(count > 0 ? copy.errorsFound(count) : copy.noErrors)
  }

  const reveal = (scope: Scope) => {
    dispatch({
      type: 'REVEAL',
      indices: indicesFor(scope),
      solutions,
      now: Date.now(),
    })
    announce(copy.revealDone)
  }

  const requestReveal = () => {
    if (!revealArmed) {
      setArmedRevealTarget(revealTargetKey)
      announce(copy.revealArmed)
      return
    }
    setArmedRevealTarget(null)
    reveal(toolScope)
  }

  const publicationDate = new Intl.DateTimeFormat(
    locale === 'en' ? 'en-US' : 'es-ES',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    },
  ).format(new Date(`${puzzle.publicationDate}T12:00:00Z`))
  const paused = state.status === 'paused'
  const complete = state.status === 'complete'
  const showStart = hydrated && state.status === 'not-started'
  const gridSizeLabel = `${puzzle.width}×${puzzle.height}`

  useEffect(() => {
    if (showStart) {
      document.getElementById('crossword-start-key')?.focus()
    }
  }, [showStart])
  const checksUsed = state.checkedCells.some(Boolean)
  const revealsUsed = state.revealedCells.some(Boolean)
  const filingStatus = !hydrated
    ? copy.progressLoading
    : complete
      ? copy.allFiled
      : copy.clueProgress(solvedEntryIds.size, puzzle.entries.length)

  const shareResult = async () => {
    const card = shareCard(puzzle, state)
    if (navigator.share) {
      try {
        await navigator.share({ text: card })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(card)
      announce(copy.resultCopied)
    } catch {
      announce(card.replaceAll('\n', '. '))
    }
  }

  const solveModes = ['standard', 'guided'] as const
  const scopeValues = ['cell', 'answer', 'puzzle'] as const
  const solveModeLabels = [copy.standardMode, copy.guidedMode] as const
  const scopeLabels = [
    copy.cellScope,
    copy.answerScope,
    copy.puzzleScope,
  ] as const
  const soundLabels = [
    copy.soundOff,
    copy.soundLow,
    copy.soundMedium,
    copy.soundHigh,
  ] as const

  const renderToolbar = (placement: 'desktop' | 'mobile') => (
    <fieldset
      className={cn(
        css.toolbar,
        placement === 'desktop' ? css.desktopToolbar : css.mobileToolbar,
      )}
      data-placement={placement}
    >
      <legend className={css.srOnly}>{copy.tools}</legend>
      <button
        type='button'
        className={css.timerTool}
        aria-pressed={settings.showTimer}
        onClick={() => {
          const showTimer = !settings.showTimer
          setSettings((current) => ({ ...current, showTimer }))
          announce(showTimer ? copy.timerShown : copy.timerHidden)
        }}
      >
        <span>{copy.timer}</span>
        <strong>
          {settings.showTimer ? (
            <Timer
              elapsedMs={state.elapsedMs}
              runStartedAt={state.runStartedAt}
              running={state.status === 'playing'}
            />
          ) : (
            '––:––'
          )}
        </strong>
      </button>

      <div className={css.parameterBank}>
        <ParameterSlider
          label={copy.assistControl}
          max={solveModes.length - 1}
          value={solveModes.indexOf(settings.solveMode)}
          valueText={
            solveModeLabels[solveModes.indexOf(settings.solveMode)] ??
            copy.standardMode
          }
          tone='blue'
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              solveMode: solveModes[value] ?? 'standard',
            }))
          }
        />
        <ParameterSlider
          label={copy.scopeControl}
          max={scopeValues.length - 1}
          value={scopeValues.indexOf(toolScope)}
          valueText={
            scopeLabels[scopeValues.indexOf(toolScope)] ?? copy.answerScope
          }
          tone='ivory'
          onChange={(value) => {
            setArmedRevealTarget(null)
            setToolScope(scopeValues[value] ?? 'answer')
          }}
        />
        <ParameterKnob
          label={copy.soundControl}
          max={soundLabels.length - 1}
          value={settings.soundLevel}
          valueText={soundLabels[settings.soundLevel] ?? copy.soundHigh}
          tone='ember'
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              soundLevel: Math.max(0, Math.min(3, value)) as SoundLevel,
            }))
          }
        />
      </div>

      <div className={css.switchBank}>
        <DeckSwitch
          label={copy.advanceControl}
          active={settings.skipFilled}
          onLabel={copy.openCells}
          offLabel={copy.everyCell}
          onClick={() =>
            setSettings((current) => ({
              ...current,
              skipFilled: !current.skipFilled,
            }))
          }
        />
        <DeckSwitch
          label={copy.proofControl}
          active={settings.autoCheck}
          onLabel={copy.liveProof}
          offLabel={copy.manualProof}
          onClick={() =>
            setSettings((current) => ({
              ...current,
              autoCheck: !current.autoCheck,
            }))
          }
        />
        <DeckSwitch
          label={copy.typeControl}
          active={settings.largeText}
          onLabel={copy.largeType}
          offLabel={copy.normalType}
          onClick={() =>
            setSettings((current) => ({
              ...current,
              largeText: !current.largeText,
            }))
          }
        />
        <DeckSwitch
          label={copy.contrastControl}
          active={settings.highContrast}
          onLabel={copy.highContrastValue}
          offLabel={copy.normalContrast}
          onClick={() =>
            setSettings((current) => ({
              ...current,
              highContrast: !current.highContrast,
            }))
          }
        />
      </div>

      <div className={css.actionBank}>
        <ToolbarButton
          label={complete ? copy.playAgain : paused ? copy.resume : copy.pause}
          className={css.transportTool}
          disabled={state.status === 'not-started'}
          onClick={(button) => {
            if (complete) {
              restartPuzzle()
              return
            }
            openerRef.current = button
            if (paused) {
              resumePuzzle()
            } else {
              announce(copy.pausedAnnouncement)
              dispatch({
                type: 'PAUSE',
                now: Date.now(),
                automatic: false,
              })
            }
          }}
        >
          <span className={css.toolGlyph} aria-hidden='true'>
            {complete ? (
              <svg viewBox='0 0 16 16' aria-hidden='true'>
                <path d='M13.2 8a5.2 5.2 0 1 1-1.5-3.7M13.2 2.6v3h-3' />
              </svg>
            ) : paused ? (
              <svg viewBox='0 0 16 16' aria-hidden='true'>
                <path d='M6 3.9v8.2l6.5-4.1L6 3.9Z' />
              </svg>
            ) : (
              <svg viewBox='0 0 16 16' aria-hidden='true'>
                <path d='M5.6 3.8v8.4M10.4 3.8v8.4' />
              </svg>
            )}
          </span>
          <span>
            {complete ? copy.playAgain : paused ? copy.resume : copy.pause}
          </span>
        </ToolbarButton>
        <ToolbarButton
          label={copy.undo}
          className={css.compactTool}
          disabled={complete || state.undoStack.length === 0}
          onClick={() => dispatch({ type: 'UNDO' })}
        >
          <span aria-hidden='true'>↶</span>
          <span>{copy.undo}</span>
        </ToolbarButton>
        <ToolbarButton
          label={copy.redo}
          className={css.compactTool}
          disabled={complete || state.redoStack.length === 0}
          onClick={() => dispatch({ type: 'REDO' })}
        >
          <span aria-hidden='true'>↷</span>
          <span>{copy.redo}</span>
        </ToolbarButton>
        <ToolbarButton
          label={copy.pencilLabel}
          descriptionId='crossword-pencil-hint'
          className={css.pencilTool}
          active={state.pencilMode}
          disabled={paused || complete}
          onClick={() => {
            announce(state.pencilMode ? copy.pencilOff : copy.pencilOn)
            dispatch({ type: 'TOGGLE_PENCIL' })
          }}
        >
          <span className={css.toolGlyph} aria-hidden='true'>
            <svg viewBox='0 0 16 16' aria-hidden='true'>
              <path d='m3 13 1.2-4L11 2.2 13.8 5 7 11.8 3 13Z' />
              <path d='m9.8 3.4 2.8 2.8M3 13l3.9-1.2' />
            </svg>
          </span>
          <span>{copy.pencil}</span>
        </ToolbarButton>
        <ToolbarButton
          label={`${copy.checkLabel}: ${scopeLabels[scopeValues.indexOf(toolScope)]}`}
          descriptionId='crossword-check-hint'
          className={css.checkTool}
          disabled={paused || complete}
          onClick={() => check(toolScope)}
        >
          <span className={css.toolGlyph} aria-hidden='true'>
            <svg viewBox='0 0 16 16' aria-hidden='true'>
              <circle cx='7' cy='7' r='4.5' />
              <path d='m4.8 7 1.5 1.5 3-3.2M10.5 10.5 14 14' />
            </svg>
          </span>
          <span>{copy.check}</span>
        </ToolbarButton>
        <ToolbarButton
          label={`${copy.revealLabel}: ${scopeLabels[scopeValues.indexOf(toolScope)]}`}
          descriptionId='crossword-reveal-hint'
          className={cn(css.revealTool, css.guardTool)}
          active={revealArmed}
          disabled={paused || complete}
          onClick={requestReveal}
        >
          <span className={css.toolGlyph} aria-hidden='true'>
            <svg viewBox='0 0 16 16' aria-hidden='true'>
              <path d='M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8Z' />
              <circle cx='8' cy='8' r='1.8' />
            </svg>
          </span>
          <span>{revealArmed ? copy.confirmReveal : copy.reveal}</span>
        </ToolbarButton>
        <ToolbarButton
          label={copy.help}
          hasPopup
          className={css.compactTool}
          onClick={(button) => openDialog('help', button)}
        >
          <span aria-hidden='true'>?</span>
          <span>{copy.help}</span>
        </ToolbarButton>
      </div>

      <span className={css.speakerGrille} aria-hidden='true' />
    </fieldset>
  )

  return (
    <div
      className={css.game}
      lang={locale}
      data-large-text={settings.largeText}
      data-high-contrast={settings.highContrast}
      style={{ '--cw-grid-cols': puzzle.width } as CSSProperties}
    >
      <span id='crossword-pencil-hint' hidden>
        {copy.pencilHint}
      </span>
      <span id='crossword-check-hint' hidden>
        {copy.checkHint}
      </span>
      <span id='crossword-reveal-hint' hidden>
        {copy.revealHint}
      </span>
      <span id='crossword-active-clue-text' className={css.srOnly}>
        {activeEntry.number} {directionLabel(activeEntry.direction, locale)}.{' '}
        {activeEntry.clue ?? ''}
        {assistFor(activeEntry) ? ` — ${assistFor(activeEntry)}` : ''}
      </span>
      <header className={css.masthead}>
        <div className={css.headerUtility}>
          <Link url='/' className={css.homeLink} aria-label={copy.home}>
            <span aria-hidden='true'>↩</span>
            <span>{copy.home}</span>
          </Link>
        </div>
        <div className={css.brandBlock}>
          <p>{copy.edition(`${puzzle.width} × ${puzzle.height}`)}</p>
          <h1>
            {copy.brand}
            <span className={css.srOnly}> — {copy.dailyCrossword}</span>
          </h1>
          <span className={css.publicationLine}>
            <time dateTime={puzzle.publicationDate}>{publicationDate}</time>
          </span>
        </div>
        <div className={css.filingProgress}>
          <span aria-hidden='true'>
            {hydrated
              ? `${solvedEntryIds.size} / ${puzzle.entries.length}`
              : '— / —'}
          </span>
          <progress
            max={puzzle.entries.length}
            value={hydrated ? solvedEntryIds.size : undefined}
            aria-label={filingStatus}
          />
        </div>
        {hasSpanish && (
          <fieldset className={css.localeSwitch}>
            <legend className={css.srOnly}>{copy.language}</legend>
            <button
              type='button'
              data-active={locale === 'en'}
              aria-pressed={locale === 'en'}
              aria-label={copy.english}
              onClick={() => changeLocale('en')}
            >
              EN
            </button>
            <button
              type='button'
              data-active={locale === 'es'}
              aria-pressed={locale === 'es'}
              aria-label={copy.spanish}
              onClick={() => changeLocale('es')}
            >
              ES
            </button>
          </fieldset>
        )}
      </header>

      <div className={css.workspace}>
        <article className={css.leadStory} aria-label={copy.dailyCrossword}>
          <section
            className={css.gridRegion}
            aria-label={copy.gridLabel(publicationDate, gridSizeLabel)}
          >
            <p id='crossword-grid-instructions' className={css.srOnly}>
              {copy.gridInstructions}
            </p>
            <div className={css.gridPan}>
              <div className={css.gridSurface}>
                <table
                  className={css.grid}
                  // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the WAI-ARIA grid pattern intentionally upgrades this semantic table to a composite grid
                  role='grid'
                  aria-label={copy.gridLabel(publicationDate, gridSizeLabel)}
                  aria-rowcount={puzzle.height}
                  aria-colcount={puzzle.width}
                  aria-describedby='crossword-grid-instructions'
                  inert={paused || showStart}
                >
                  <tbody>
                    {gridRowKeys(puzzle.height).map((rowKey, row) => (
                      <tr className={css.gridRow} key={rowKey}>
                        {puzzle.cells
                          .slice(row * puzzle.width, (row + 1) * puzzle.width)
                          .map((cell) => {
                            if (cell.solution === null) {
                              return (
                                <td
                                  key={cell.index}
                                  aria-label={`${copy.row} ${cell.row + 1}, ${copy.column} ${cell.column + 1}`}
                                  className={css.block}
                                />
                              )
                            }
                            const selected = state.selectedCell === cell.index
                            const inEntry = selectedEntryCells.has(cell.index)
                            const sweepStep =
                              sweepEntry?.cells.indexOf(cell.index) ?? -1
                            const guess = state.guesses[cell.index]
                            const crossingEntry = cell.entryIds
                              .map((id) =>
                                puzzle.entries.find((entry) => entry.id === id),
                              )
                              .find((entry) => entry?.id !== activeEntry.id)
                            const cellName = [
                              `${copy.row} ${cell.row + 1}, ${copy.column} ${cell.column + 1}.`,
                              cell.number ? `${cell.number}.` : '',
                              guess
                                ? `${copy.letter} ${guess}.`
                                : `${copy.blank}.`,
                              state.pencilCells[cell.index]
                                ? `${copy.pencilled}.`
                                : '',
                              state.incorrectCells[cell.index]
                                ? `${copy.incorrect}.`
                                : state.checkedCells[cell.index]
                                  ? `${copy.checked}.`
                                  : '',
                              state.revealedCells[cell.index]
                                ? `${copy.revealed}.`
                                : '',
                              crossingEntry
                                ? `${copy.intersection} ${crossingEntry.number} ${directionLabel(crossingEntry.direction, locale)}.`
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')

                            return (
                              <td key={cell.index} className={css.cellShell}>
                                <button
                                  ref={(element) => {
                                    cellRefs.current[cell.index] = element
                                  }}
                                  type='button'
                                  className={css.cell}
                                  tabIndex={selected ? 0 : -1}
                                  aria-current={selected ? 'true' : undefined}
                                  aria-label={cellName}
                                  aria-describedby={
                                    selected
                                      ? 'crossword-active-clue-text'
                                      : undefined
                                  }
                                  data-selected={selected}
                                  data-entry={inEntry}
                                  data-sweep={sweepStep >= 0}
                                  data-pencil={state.pencilCells[cell.index]}
                                  data-incorrect={
                                    state.incorrectCells[cell.index]
                                  }
                                  data-revealed={
                                    state.revealedCells[cell.index]
                                  }
                                  data-checked={
                                    state.checkedCells[cell.index] &&
                                    !state.incorrectCells[cell.index]
                                  }
                                  style={
                                    sweepStep >= 0
                                      ? ({
                                          '--cw-sweep-step': sweepStep,
                                        } as CSSProperties)
                                      : undefined
                                  }
                                  onPointerDown={(event: PointerEvent) => {
                                    touchHandledRef.current =
                                      event.pointerType !== 'mouse'
                                    pointerDownCellRef.current =
                                      latestStateRef.current.selectedCell
                                  }}
                                  onPointerCancel={() => {
                                    touchHandledRef.current = false
                                    pointerDownCellRef.current = null
                                  }}
                                  onClick={() => {
                                    const nativeKeyboard =
                                      touchHandledRef.current
                                    touchHandledRef.current = false
                                    const reclick =
                                      pointerDownCellRef.current === cell.index
                                    pointerDownCellRef.current = null
                                    selectCell(
                                      cell.index,
                                      nativeKeyboard,
                                      reclick,
                                    )
                                  }}
                                  onFocus={() => {
                                    if (state.selectedCell !== cell.index) {
                                      dispatch({
                                        type: 'SELECT',
                                        index: cell.index,
                                        direction: availableDirection(
                                          puzzle,
                                          cell.index,
                                          state.direction,
                                        ),
                                      })
                                    }
                                  }}
                                  onKeyDown={handleKeyDown}
                                >
                                  {cell.number && (
                                    <span className={css.cellNumber}>
                                      {cell.number}
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      css.cellLetter,
                                      letterFontClassName,
                                    )}
                                  >
                                    {guess}
                                  </span>
                                  {state.revealedCells[cell.index] && (
                                    <span
                                      className={css.revealMark}
                                      aria-hidden='true'
                                    >
                                      •
                                    </span>
                                  )}
                                </button>
                              </td>
                            )
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sweepEntry && wordSweep && (
                  <CorrectWordSweep
                    key={`${sweepEntry.id}-${wordSweep.run}`}
                    entry={sweepEntry}
                    width={puzzle.width}
                  />
                )}
              </div>
            </div>
            {paused && (
              <div className={css.pauseCurtain}>
                <span aria-hidden='true'>Ⅱ</span>
                <strong>{copy.paused}</strong>
                <p>{copy.pausedNote}</p>
                <button type='button' onClick={resumePuzzle}>
                  {copy.resume}
                </button>
              </div>
            )}
            {showStart && (
              <div className={css.pauseCurtain}>
                <span aria-hidden='true'>
                  <svg viewBox='0 0 16 16' aria-hidden='true'>
                    <path d='M6 3.9v8.2l6.5-4.1L6 3.9Z' />
                  </svg>
                </span>
                <strong>{copy.brand}</strong>
                <button
                  id='crossword-start-key'
                  type='button'
                  onClick={startPuzzle}
                >
                  {copy.begin}
                </button>
                <p>{copy.startHint}</p>
              </div>
            )}
          </section>
        </article>

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
            guesses={state.guesses}
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
            guesses={state.guesses}
            progressReady={hydrated}
          />
        </aside>
      </div>

      {renderToolbar('desktop')}

      <aside className={css.mobileClues} aria-label={copy.clueList}>
        <fieldset className={css.clueTabs}>
          <legend className={css.srOnly}>{copy.clueList}</legend>
          <button
            type='button'
            aria-pressed={mobileClueDirection === 'across'}
            onClick={() => chooseMobileDirection('across')}
          >
            {copy.across}
          </button>
          <button
            type='button'
            aria-pressed={mobileClueDirection === 'down'}
            onClick={() => chooseMobileDirection('down')}
          >
            {copy.down}
          </button>
        </fieldset>
        <div className={css.mobileClueList}>
          <ClueList
            heading={mobileClueDirection === 'across' ? copy.across : copy.down}
            labelId={`mobile-inline-${locale}-${mobileClueDirection}-clues`}
            entries={
              mobileClueDirection === 'across' ? acrossEntries : downEntries
            }
            activeId={activeEntry.id}
            listRef={mobileListRef}
            select={(entry) => chooseEntry(entry, true)}
            solvedEntryIds={solvedEntryIds}
            solvedLabel={copy.solved}
            filedLabel={copy.filed}
            strikeSolved
            assistFor={assistFor}
            progressLabel={copy.clueProgress}
            guesses={state.guesses}
            progressReady={hydrated}
          />
        </div>
      </aside>

      {renderToolbar('mobile')}

      <label className={css.inputProxy}>
        <span>{copy.inputLabel}</span>
        <input
          ref={inputRef}
          type='text'
          inputMode='text'
          autoCapitalize='characters'
          autoComplete='off'
          spellCheck={false}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          onBeforeInput={(event: FormEvent<HTMLInputElement>) => {
            const native = event.nativeEvent as InputEvent
            if (native.inputType === 'deleteContentBackward') {
              event.preventDefault()
              eraseBackward()
            }
          }}
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={(event) => {
            composingRef.current = false
            skipInputRef.current = true
            writeLetter(event.data)
            event.currentTarget.value = ''
          }}
          onInput={(event: FormEvent<HTMLInputElement>) => {
            if (skipInputRef.current) {
              skipInputRef.current = false
              event.currentTarget.value = ''
              return
            }
            if (!composingRef.current) writeLetter(event.currentTarget.value)
            event.currentTarget.value = ''
          }}
        />
      </label>

      <Modal
        open={dialog === 'help'}
        close={closeDialog}
        labelId='help-title'
        className={css.wideDialog}
      >
        <DialogHeader
          id='help-title'
          title={copy.helpTitle}
          close={closeDialog}
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
          <button
            type='button'
            className={css.primaryDialogButton}
            onClick={closeDialog}
          >
            {copy.close}
          </button>
        </div>
      </Modal>

      <Modal
        open={dialog === 'complete'}
        close={closeDialog}
        labelId='complete-title'
        className={css.completionDialog}
      >
        {dialog === 'complete' && <ConfettiBurst />}
        <div className={css.completionMark} aria-hidden='true'>
          <span>C</span>
          <span>W</span>
        </div>
        <div className={css.completionBody}>
          <span>{copy.brand}</span>
          <h2 id='complete-title'>{copy.completeTitle}</h2>
          <p>{copy.completeNote}</p>
          <dl className={css.resultStats}>
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
          <NextPuzzleCountdown copy={copy} />
          <div className={css.completionActions}>
            <button type='button' onClick={restartPuzzle}>
              {copy.playAgain}
            </button>
            <button type='button' data-initial-focus onClick={shareResult}>
              {copy.copyResult}
            </button>
            <button type='button' onClick={closeDialog}>
              {copy.close}
            </button>
          </div>
        </div>
      </Modal>

      <div className={css.srOnly} aria-live='polite' aria-atomic='true'>
        {announcement}
      </div>
    </div>
  )
}

export default function CrosswordsView({
  challenges,
  letterFontClassName,
}: {
  challenges: CrosswordChallengeFile[]
  letterFontClassName: string
}) {
  useGameInput()
  const [locale, setLocaleState] = useState<CrosswordLocale>('en')
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [preferencesReady, setPreferencesReady] = useState(false)
  const [editionDate, setEditionDate] = useState<string | null>(null)

  const editions = useMemo(
    () =>
      [LEGACY_EDITION, ...challenges.map(editionFromChallenge)].toSorted(
        (a, b) => a.en.publicationDate.localeCompare(b.en.publicationDate),
      ),
    [challenges],
  )

  // Editions roll at server (UTC) midnight for everyone; SSR and the first
  // client render both use the latest edition.
  useEffect(() => {
    setEditionDate(new Date().toISOString().slice(0, 10))
  }, [])
  const puzzles = useMemo(
    () => puzzleForDate(editions, editionDate ?? '9999-12-31'),
    [editions, editionDate],
  )

  useEffect(() => {
    try {
      const savedLocale = window.localStorage.getItem(LOCALE_KEY)
      if (savedLocale === 'en' || savedLocale === 'es') {
        setLocaleState(savedLocale)
      }
      const raw = window.localStorage.getItem(SETTINGS_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<GameSettings> & {
          keySounds?: boolean
        }
        setSettings({
          showTimer:
            typeof saved.showTimer === 'boolean'
              ? saved.showTimer
              : DEFAULT_SETTINGS.showTimer,
          skipFilled:
            typeof saved.skipFilled === 'boolean'
              ? saved.skipFilled
              : DEFAULT_SETTINGS.skipFilled,
          autoCheck:
            typeof saved.autoCheck === 'boolean'
              ? saved.autoCheck
              : DEFAULT_SETTINGS.autoCheck,
          soundLevel:
            typeof saved.soundLevel === 'number' &&
            saved.soundLevel >= 0 &&
            saved.soundLevel <= 3
              ? (saved.soundLevel as SoundLevel)
              : saved.keySounds === false
                ? 0
                : DEFAULT_SETTINGS.soundLevel,
          solveMode:
            saved.solveMode === 'guided' || saved.solveMode === 'standard'
              ? saved.solveMode
              : DEFAULT_SETTINGS.solveMode,
          largeText:
            typeof saved.largeText === 'boolean'
              ? saved.largeText
              : DEFAULT_SETTINGS.largeText,
          highContrast:
            typeof saved.highContrast === 'boolean'
              ? saved.highContrast
              : DEFAULT_SETTINGS.highContrast,
        })
      }
    } catch {
      // Preferences remain at safe defaults when storage is unavailable.
    } finally {
      setPreferencesReady(true)
    }
  }, [])

  useEffect(() => {
    const previous = document.documentElement.lang
    document.documentElement.lang = locale
    return () => {
      document.documentElement.lang = previous
    }
  }, [locale])

  useEffect(() => {
    if (!preferencesReady) return
    try {
      window.localStorage.setItem(LOCALE_KEY, locale)
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Preference storage is optional.
    }
  }, [locale, preferencesReady, settings])

  useEffect(() => {
    const viewport = window.visualViewport
    let frame = 0
    const update = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const height = viewport?.height ?? window.innerHeight
        document.documentElement.style.setProperty(
          '--crossword-viewport-height',
          `${height}px`,
        )
      })
    }
    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(frame)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      document.documentElement.style.removeProperty(
        '--crossword-viewport-height',
      )
    }
  }, [])

  const setLocale = (nextLocale: CrosswordLocale) => {
    if (nextLocale === locale) return
    setLocaleState(nextLocale)
  }

  const activeLocale = puzzles.es ? locale : 'en'
  const puzzle = activeLocale === 'es' && puzzles.es ? puzzles.es : puzzles.en

  return (
    <Shell
      canonical='/crosswords'
      shellClassName={css.shell}
      className={css.page}
    >
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
