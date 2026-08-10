import cn from 'clsx'
import { useEffect, useState } from 'react'
import type { Copy } from './crossword-copy'
import {
  DeckSwitch,
  ParameterKnob,
  ParameterSlider,
  ToolbarButton,
} from './crossword-deck-controls'
import { type CrosswordState, formatTime } from './crossword-engine'
import knobs from './crossword-parameter-bank.module.css'
import {
  type GameSettings,
  MAX_SOUND_LEVEL,
  SCOPE_VALUES,
  type Scope,
  SOLVE_MODES,
  type SoundLevel,
} from './crossword-settings'
import switches from './crossword-switch-bank.module.css'
import { ProofingTools } from './crossword-tool-tray'
import css from './crossword-toolbar.module.css'
import cw from './crosswords.module.css'

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

const TRANSPORT_GLYPHS = {
  again: (
    <svg viewBox='0 0 16 16' aria-hidden='true'>
      <path d='M13.2 8a5.2 5.2 0 1 1-1.5-3.7M13.2 2.6v3h-3' />
    </svg>
  ),
  pause: (
    <svg viewBox='0 0 16 16' aria-hidden='true'>
      <path d='M5.6 3.8v8.4M10.4 3.8v8.4' />
    </svg>
  ),
  play: (
    <svg viewBox='0 0 16 16' aria-hidden='true'>
      <path d='M6 3.9v8.2l6.5-4.1L6 3.9Z' />
    </svg>
  ),
} as const

export type TransportHandlers = {
  onPauseFrom: (button: HTMLButtonElement) => void
  onRestart: () => void
  onResumeFrom: (button: HTMLButtonElement) => void
}

export const transportFace = (state: CrosswordState, copy: Copy) =>
  ({
    'not-started': { label: copy.pause, glyph: TRANSPORT_GLYPHS.pause },
    playing: { label: copy.pause, glyph: TRANSPORT_GLYPHS.pause },
    paused: { label: copy.resume, glyph: TRANSPORT_GLYPHS.play },
    complete: { label: copy.playAgain, glyph: TRANSPORT_GLYPHS.again },
  })[state.status]

export const transportAct = (
  state: CrosswordState,
  handlers: TransportHandlers,
) => {
  return (button: HTMLButtonElement) => {
    if (state.status === 'complete') return handlers.onRestart()
    if (state.status === 'paused') return handlers.onResumeFrom(button)
    handlers.onPauseFrom(button)
  }
}

const TransportTool = ({
  copy,
  onPauseFrom,
  onRestart,
  onResumeFrom,
  state,
}: TransportHandlers & {
  copy: Copy
  state: CrosswordState
}) => {
  const face = transportFace(state, copy)
  const act = transportAct(state, { onPauseFrom, onRestart, onResumeFrom })

  return (
    <ToolbarButton
      label={face.label}
      className={css.transportTool}
      disabled={state.status === 'not-started'}
      onClick={act}
    >
      <span className={css.toolGlyph} aria-hidden='true'>
        {face.glyph}
      </span>
      <span>{face.label}</span>
    </ToolbarButton>
  )
}

export const CrosswordToolbarHints = ({ copy }: { copy: Copy }) => (
  <>
    <span id='crossword-pencil-hint' hidden>
      {copy.pencilHint}
    </span>
    <span id='crossword-check-hint' hidden>
      {copy.checkHint}
    </span>
    <span id='crossword-reveal-hint' hidden>
      {copy.revealHint}
    </span>
  </>
)

export const CrosswordToolbar = ({
  copy,
  onCheck,
  onOpenHelp,
  onPauseFrom,
  onRedo,
  onRequestReveal,
  onRestart,
  onResumeFrom,
  onScopeChange,
  onTogglePencil,
  onToggleTimer,
  onUndo,
  revealArmed,
  setSettings,
  settings,
  state,
  toolScope,
}: {
  copy: Copy
  onCheck: () => void
  onOpenHelp: (button: HTMLButtonElement) => void
  onPauseFrom: (button: HTMLButtonElement) => void
  onRedo: () => void
  onRequestReveal: () => void
  onRestart: () => void
  onResumeFrom: (button: HTMLButtonElement) => void
  onScopeChange: (scope: Scope) => void
  onTogglePencil: () => void
  onToggleTimer: () => void
  onUndo: () => void
  revealArmed: boolean
  setSettings: (
    value: GameSettings | ((current: GameSettings) => GameSettings),
  ) => void
  settings: GameSettings
  state: CrosswordState
  toolScope: Scope
}) => {
  const paused = state.status === 'paused'
  const complete = state.status === 'complete'
  const boardLocked = paused || complete
  const solveModeLabels = [copy.standardMode, copy.guidedMode] as const
  const scopeLabels = [
    copy.cellScope,
    copy.answerScope,
    copy.puzzleScope,
  ] as const
  const scopeLabel =
    scopeLabels[SCOPE_VALUES.indexOf(toolScope)] ?? copy.answerScope
  const soundLabels = [
    copy.soundOff,
    copy.soundLow,
    copy.soundMedium,
    copy.soundHigh,
  ] as const

  return (
    <fieldset className={cn(css.toolbar, css.desktopToolbar)}>
      <legend className={cw.srOnly}>{copy.tools}</legend>
      <button
        type='button'
        className={cn(css.timerTool, cw.timerTool)}
        aria-pressed={settings.showTimer}
        onClick={onToggleTimer}
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

      <div className={knobs.parameterBank}>
        <ParameterSlider
          label={copy.assistControl}
          max={SOLVE_MODES.length - 1}
          value={SOLVE_MODES.indexOf(settings.solveMode)}
          valueText={
            solveModeLabels[SOLVE_MODES.indexOf(settings.solveMode)] ??
            copy.standardMode
          }
          tone='blue'
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              solveMode: SOLVE_MODES[value] ?? 'standard',
            }))
          }
        />
        <ParameterSlider
          label={copy.scopeControl}
          max={SCOPE_VALUES.length - 1}
          value={SCOPE_VALUES.indexOf(toolScope)}
          valueText={scopeLabel}
          tone='ivory'
          onChange={(value) => onScopeChange(SCOPE_VALUES[value] ?? 'answer')}
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
              soundLevel: Math.max(
                0,
                Math.min(MAX_SOUND_LEVEL, value),
              ) as SoundLevel,
            }))
          }
        />
      </div>

      <div className={switches.switchBank}>
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
        <TransportTool
          copy={copy}
          onPauseFrom={onPauseFrom}
          onRestart={onRestart}
          onResumeFrom={onResumeFrom}
          state={state}
        />
        <ToolbarButton
          label={copy.undo}
          disabled={complete || state.undoStack.length === 0}
          onClick={onUndo}
        >
          <span aria-hidden='true'>↶</span>
          <span>{copy.undo}</span>
        </ToolbarButton>
        <ToolbarButton
          label={copy.redo}
          disabled={complete || state.redoStack.length === 0}
          onClick={onRedo}
        >
          <span aria-hidden='true'>↷</span>
          <span>{copy.redo}</span>
        </ToolbarButton>
        <ProofingTools
          boardLocked={boardLocked}
          copy={copy}
          pencilMode={state.pencilMode}
          revealArmed={revealArmed}
          scopeLabel={scopeLabel}
          onCheck={onCheck}
          onOpenHelp={onOpenHelp}
          onRequestReveal={onRequestReveal}
          onTogglePencil={onTogglePencil}
        />
      </div>

      <span className={css.speakerGrille} aria-hidden='true' />
    </fieldset>
  )
}
