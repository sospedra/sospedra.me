import type { CheckLog } from '../protocol/verify.ts'
import type {
  Actor,
  Trace,
  TraceObject,
  TraceStep,
  Verdict,
  VerdictKind,
} from '../scenarios/trace.ts'
import { renderObject } from './inspector.ts'

type ChipMeta = { glyph: string; label: string; className: string }

const VERDICT_META: Record<VerdictKind, ChipMeta> = {
  ACCEPT: { glyph: '✓', label: 'ACCEPT', className: 'badge badge--accept' },
  REJECT: { glyph: '✕', label: 'REJECT', className: 'badge badge--reject' },
  EVIDENCE: {
    glyph: '◆',
    label: 'EVIDENCE',
    className: 'badge badge--evidence',
  },
  LIMITATION: {
    glyph: '◐',
    label: 'LIMITATION',
    className: 'badge badge--limitation',
  },
}

const ACTOR_META: Record<Actor, ChipMeta> = {
  author: {
    glyph: '□',
    label: 'AUTHOR',
    className: 'actor-badge actor-badge--author',
  },
  server: {
    glyph: '■',
    label: 'SERVER',
    className: 'actor-badge actor-badge--server',
  },
  client: {
    glyph: '▽',
    label: 'CLIENT',
    className: 'actor-badge actor-badge--client',
  },
  peer: {
    glyph: '⇄',
    label: 'PEER',
    className: 'actor-badge actor-badge--peer',
  },
  attacker: {
    glyph: '▲',
    label: 'ATTACKER',
    className: 'actor-badge actor-badge--attacker',
  },
}

type MarkState = 'pass' | 'fail' | 'skip'

const CHECK_MARK_META: Record<MarkState, ChipMeta> = {
  pass: { glyph: '✓', label: 'pass', className: 'check-mark check-mark--pass' },
  fail: { glyph: '✕', label: 'fail', className: 'check-mark check-mark--fail' },
  skip: {
    glyph: '−',
    label: 'skipped',
    className: 'check-mark check-mark--skip',
  },
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

function glyphChip(meta: ChipMeta): HTMLSpanElement {
  const glyph = el('span', 'glyph', meta.glyph)
  glyph.setAttribute('aria-hidden', 'true')
  const chip = el('span', meta.className)
  chip.append(glyph, el('span', 'label', meta.label))
  return chip
}

function renderActorBadge(actor: Actor): HTMLElement {
  return glyphChip(ACTOR_META[actor])
}

function renderVerdictBanner(verdict: Verdict): HTMLElement {
  const banner = el('div', 'verdict-banner')
  banner.append(glyphChip(VERDICT_META[verdict.kind]))
  if (verdict.error)
    banner.append(el('code', 'verdict-banner-error', verdict.error))
  banner.append(el('p', 'verdict-banner-note', verdict.note))
  return banner
}

function checkMarkState(pass: boolean, skipped: boolean): MarkState {
  if (skipped) return 'skip'
  return pass ? 'pass' : 'fail'
}

function renderCheckMark(
  check: { pass: boolean; error?: string },
  skipped: boolean,
): HTMLElement {
  const state = checkMarkState(check.pass, skipped)
  const mark = glyphChip(CHECK_MARK_META[state])
  if (check.error) mark.append(el('code', 'check-mark-error', check.error))
  return mark
}

function startsNewRound(rounds: CheckLog[][], step: number): boolean {
  const lastEntry = rounds.at(-1)?.at(-1)
  return lastEntry === undefined || step <= lastEntry.step
}

function groupChecksIntoRounds(checks: CheckLog[]): CheckLog[][] {
  const rounds: CheckLog[][] = []
  for (const check of checks) {
    if (startsNewRound(rounds, check.step)) {
      rounds.push([check])
      continue
    }
    rounds.at(-1)?.push(check)
  }
  return rounds
}

function roundOutcomeSuffix(round: CheckLog[]): string {
  const failure = round.find((check) => !check.pass && !check.skipped)
  if (failure) {
    return `failed at step ${failure.step} (${failure.error ?? failure.name})`
  }
  const skipCount = round.filter((check) => check.skipped).length
  if (skipCount === 0) return 'all steps pass'
  return `${round.length - skipCount} of ${round.length} steps pass, ${skipCount} skipped`
}

function roundSummaryText(
  round: CheckLog[],
  index: number,
  total: number,
): string {
  const label = total > 1 ? `round ${index + 1} of ${total}` : 'verifier run'
  return `${label} · ${round.length} steps · ${roundOutcomeSuffix(round)}`
}

function renderChecklistEntry(check: CheckLog): HTMLElement {
  const skipped = check.skipped === true
  const state = checkMarkState(check.pass, skipped)
  const li = el('li', `checklist-entry checklist-entry--${state}`)
  li.append(
    el('span', 'check-step-number', String(check.step).padStart(2, '0')),
    el('span', 'checklist-entry-name', check.name),
    renderCheckMark(check, skipped),
  )
  return li
}

function renderChecklistList(round: CheckLog[]): HTMLElement {
  const list = el('ul', 'checklist-list')
  list.append(...round.map(renderChecklistEntry))
  return list
}

function renderChecklistRound(
  round: CheckLog[],
  index: number,
  total: number,
): HTMLElement {
  const details = el('details', 'checklist-round')
  details.open = true
  details.append(
    el(
      'summary',
      'checklist-round-summary',
      roundSummaryText(round, index, total),
    ),
    renderChecklistList(round),
  )
  return details
}

function renderChecklist(checks: CheckLog[]): HTMLElement {
  const rounds = groupChecksIntoRounds(checks)
  const section = el('section', 'checklist')
  section.append(el('h3', 'panel-heading', 'verifier checklist · spec §17'))
  section.append(
    ...rounds.map((round, index) =>
      renderChecklistRound(round, index, rounds.length),
    ),
  )
  return section
}

function renderStepObjects(objects: TraceObject[]): HTMLElement {
  const wrap = el('div', 'step-objects')
  wrap.append(...objects.map(renderObject))
  return wrap
}

function renderStepBody(step: TraceStep): HTMLElement {
  const body = el('div', 'step-body')
  body.append(el('p', 'step-label', step.label))
  if (step.detail && step.detail !== 'skipped') {
    body.append(el('p', 'step-detail', step.detail))
  }
  if (step.kind === 'check' && step.check) {
    body.append(renderCheckMark(step.check, step.detail === 'skipped'))
  }
  if (step.objects && step.objects.length > 0) {
    body.append(renderStepObjects(step.objects))
  }
  return body
}

function renderTimelineStep(step: TraceStep): HTMLElement {
  const li = el('li', `timeline-step timeline-step--${step.actor}`)
  li.append(renderActorBadge(step.actor), renderStepBody(step))
  return li
}

function renderTimeline(steps: TraceStep[]): HTMLElement {
  const section = el('section', 'timeline')
  section.append(el('h3', 'panel-heading', 'trace timeline'))
  const list = el('ol', 'timeline-list')
  list.append(...steps.map(renderTimelineStep))
  section.append(list)
  return section
}

export function renderTrace(t: Trace): HTMLElement {
  const container = el('div', 'trace')
  container.append(renderVerdictBanner(t.verdict))
  if (t.checks && t.checks.length > 0)
    container.append(renderChecklist(t.checks))
  container.append(renderTimeline(t.steps))
  return container
}
