import type { Copy } from './crossword-copy'
import { ToolbarButton } from './crossword-deck-controls'
import tools from './crossword-toolbar.module.css'

type ProofingHandlers = {
  onCheck: () => void
  onOpenHelp: (button: HTMLButtonElement) => void
  onRequestReveal: () => void
  onTogglePencil: () => void
}

export const ProofingTools = ({
  boardLocked,
  copy,
  onCheck,
  onOpenHelp,
  onRequestReveal,
  onTogglePencil,
  pencilMode,
  revealArmed,
  scopeLabel,
}: ProofingHandlers & {
  boardLocked: boolean
  copy: Copy
  pencilMode: boolean
  revealArmed: boolean
  scopeLabel: string
}) => (
  <>
    <ToolbarButton
      label={copy.pencilLabel}
      descriptionId='crossword-pencil-hint'
      className={tools.pencilTool}
      active={pencilMode}
      disabled={boardLocked}
      onClick={onTogglePencil}
    >
      <span className={tools.toolGlyph} aria-hidden='true'>
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
      className={tools.checkTool}
      disabled={boardLocked}
      onClick={onCheck}
    >
      <span className={tools.toolGlyph} aria-hidden='true'>
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
      className={`${tools.revealTool} ${tools.guardTool}`}
      active={revealArmed}
      disabled={boardLocked}
      onClick={onRequestReveal}
    >
      <span className={tools.toolGlyph} aria-hidden='true'>
        <svg viewBox='0 0 16 16' aria-hidden='true'>
          <path d='M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8Z' />
          <circle cx='8' cy='8' r='1.8' />
        </svg>
      </span>
      <span>{revealArmed ? copy.confirmReveal : copy.reveal}</span>
    </ToolbarButton>
    <ToolbarButton label={copy.help} hasPopup onClick={onOpenHelp}>
      <span aria-hidden='true'>?</span>
      <span>{copy.help}</span>
    </ToolbarButton>
  </>
)
