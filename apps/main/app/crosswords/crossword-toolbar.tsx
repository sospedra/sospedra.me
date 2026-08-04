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
  placement,
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
  placement: 'desktop' | 'mobile'
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
    <fieldset
      className={cn(
        css.toolbar,
        placement === 'desktop'
          ? css.desktopToolbar
          : cn(css.mobileToolbar, knobs.mobileToolbar, switches.mobileToolbar),
      )}
      data-placement={placement}
    >
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
        <ToolbarButton
          label={complete ? copy.playAgain : paused ? copy.resume : copy.pause}
          className={css.transportTool}
          disabled={state.status === 'not-started'}
          onClick={(button) => {
            if (complete) {
              onRestart()
              return
            }
            if (paused) {
              onResumeFrom(button)
            } else {
              onPauseFrom(button)
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
          onClick={onUndo}
        >
          <span aria-hidden='true'>↶</span>
          <span>{copy.undo}</span>
        </ToolbarButton>
        <ToolbarButton
          label={copy.redo}
          className={css.compactTool}
          disabled={complete || state.redoStack.length === 0}
          onClick={onRedo}
        >
          <span aria-hidden='true'>↷</span>
          <span>{copy.redo}</span>
        </ToolbarButton>
        <ToolbarButton
          label={copy.pencilLabel}
          descriptionId='crossword-pencil-hint'
          className={css.pencilTool}
          active={state.pencilMode}
          disabled={boardLocked}
          onClick={onTogglePencil}
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
          label={`${copy.checkLabel}: ${scopeLabel}`}
          descriptionId='crossword-check-hint'
          className={css.checkTool}
          disabled={boardLocked}
          onClick={onCheck}
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
          label={`${copy.revealLabel}: ${scopeLabel}`}
          descriptionId='crossword-reveal-hint'
          className={cn(css.revealTool, css.guardTool)}
          active={revealArmed}
          disabled={boardLocked}
          onClick={onRequestReveal}
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
          onClick={onOpenHelp}
        >
          <span aria-hidden='true'>?</span>
          <span>{copy.help}</span>
        </ToolbarButton>
      </div>

      <span className={css.speakerGrille} aria-hidden='true' />
    </fieldset>
  )
}
