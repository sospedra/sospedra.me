import { hex } from '../protocol/bytes.ts'
import type { Taxonomy } from '../protocol/evidence.ts'
import { GENESIS_ROOT } from '../protocol/genesis.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import { scenarios } from '../scenarios/index.ts'
import { SPEC_ACCEPTANCE_CLAIM } from '../scenarios/s04-honest-query.ts'
import type {
  Scenario,
  Trace,
  Verdict,
  VerdictKind,
} from '../scenarios/trace.ts'
import { ms, shortHash } from './format.ts'
import { renderTrace } from './trace-view.ts'

type RowState =
  | { status: 'pending' }
  | { status: 'running' }
  | { status: 'done'; trace: Trace; elapsedMs: number }
  | { status: 'error'; message: string; elapsedMs: number }

type RowHandle = { setState(state: RowState): void }

type RowBuild = {
  mainRow: HTMLTableRowElement
  detailRow: HTMLTableRowElement
  handle: RowHandle
}

type RunBarHandle = {
  element: HTMLDivElement
  setProgress(done: number, running: boolean): void
  onRunAll(callback: () => void): void
}

type SweepContext = {
  handles: RowHandle[]
  runBar: RunBarHandle
  generation: number
}

type ChipMeta = { glyph: string; label: string; className: string }

const TAXONOMY_META: Record<Taxonomy, ChipMeta> = {
  PREVENTED_BY_MATH: {
    glyph: '●',
    label: 'PREVENTED_BY_MATH',
    className: 'chip chip--math',
  },
  PROVABLE_ON_RECORD: {
    glyph: '◆',
    label: 'PROVABLE_ON_RECORD',
    className: 'chip chip--record',
  },
  POSSIBLE_UNDER_GOVERNANCE: {
    glyph: '◇',
    label: 'POSSIBLE_UNDER_GOVERNANCE',
    className: 'chip chip--gov',
  },
  LIMITATION: {
    glyph: '◐',
    label: 'LIMITATION',
    className: 'chip chip--limit',
  },
}

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

const ALL_TAXONOMIES: Taxonomy[] = [
  'PREVENTED_BY_MATH',
  'PROVABLE_ON_RECORD',
  'POSSIBLE_UNDER_GOVERNANCE',
  'LIMITATION',
]

const COLUMNS = [
  { key: 'id', label: '#' },
  { key: 'title', label: 'scenario' },
  { key: 'taxonomy', label: 'taxonomy' },
  { key: 'expected', label: 'expected' },
  { key: 'verdict', label: 'verdict' },
  { key: 'time', label: 'time' },
] as const
const COLUMN_COUNT = COLUMNS.length
type Column = (typeof COLUMNS)[number]

let sweepGeneration = 0

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

function glyphBadge(
  className: string,
  glyph: string,
  label: string,
): HTMLSpanElement {
  const glyphSpan = el('span', 'glyph', glyph)
  glyphSpan.setAttribute('aria-hidden', 'true')
  const badge = el('span', className)
  badge.append(glyphSpan, el('span', 'label', label))
  return badge
}

function taxonomyChip(taxonomy: Taxonomy): HTMLSpanElement {
  const meta = TAXONOMY_META[taxonomy]
  return glyphBadge(meta.className, meta.glyph, meta.label)
}

function verdictMatchesExpected(verdict: Verdict, expected: string): boolean {
  return expected.startsWith(verdict.kind)
}

function doneVerdictContent(verdict: Verdict, expected: string): HTMLElement {
  const meta = VERDICT_META[verdict.kind]
  const wrap = el('span', 'verdict-wrap')
  wrap.append(glyphBadge(meta.className, meta.glyph, meta.label))
  if (verdict.error) wrap.append(el('code', 'verdict-detail', verdict.error))
  if (!verdictMatchesExpected(verdict, expected)) {
    wrap.append(glyphBadge('badge badge--mismatch', '≠', 'MISMATCH'))
  }
  return wrap
}

function errorVerdictContent(message: string): HTMLElement {
  const wrap = el('span', 'verdict-wrap')
  wrap.append(glyphBadge('badge badge--error', '!', 'ERROR'))
  wrap.append(el('code', 'verdict-detail', message))
  return wrap
}

function verdictContent(state: RowState, expected: string): HTMLElement {
  switch (state.status) {
    case 'pending':
      return glyphBadge('badge badge--pending', '○', 'PENDING')
    case 'running':
      return glyphBadge('badge badge--running', '◔', 'RUNNING')
    case 'error':
      return errorVerdictContent(state.message)
    case 'done':
      return doneVerdictContent(state.trace.verdict, expected)
  }
}

function timeCellText(state: RowState): string {
  switch (state.status) {
    case 'pending':
      return '—'
    case 'running':
      return '…'
    case 'done':
      return ms(state.elapsedMs)
    case 'error':
      return ms(state.elapsedMs)
  }
}

type Anchor = { label: string; value: string }

function genesisAnchors(): Anchor[] {
  return [
    { label: 'genesis root', value: hex(GENESIS_ROOT) },
    { label: 'update program v1', value: hex(PROGRAM.updateV1) },
    { label: 'query program v1', value: hex(PROGRAM.queryV1) },
    { label: 'genesis chain hash', value: hex(GENESIS_CHAIN) },
  ]
}

function anchorEntry(anchor: Anchor): HTMLDivElement {
  const dd = el('dd', '', shortHash(anchor.value))
  dd.title = anchor.value
  const entry = el('div', 'anchor')
  entry.append(el('dt', '', anchor.label), dd)
  return entry
}

function buildHeader(): HTMLElement {
  const wordmark = el('div', 'wordmark')
  wordmark.append(
    el('span', 'name', 'VOUCH'),
    el('span', 'expansion', 'Verified Output Under Canonical History'),
  )

  const claimLabel = el('p', 'claim-label', 'spec §1 · acceptance claim')
  const claim = el('pre', 'claim', SPEC_ACCEPTANCE_CLAIM)

  const anchors = el('dl', 'anchors')
  anchors.append(...genesisAnchors().map(anchorEntry))

  const header = el('header', 'masthead')
  header.append(wordmark, claimLabel, claim, anchors)
  return header
}

function legendItem(taxonomy: Taxonomy): HTMLLIElement {
  const item = el('li')
  item.append(taxonomyChip(taxonomy))
  return item
}

function buildLegend(): HTMLElement {
  const legend = el('ul', 'legend')
  legend.append(...ALL_TAXONOMIES.map(legendItem))
  return legend
}

function headerCell(column: Column): HTMLTableCellElement {
  const th = el('th', `col-${column.key}`, column.label)
  th.scope = 'col'
  return th
}

function colElement(column: Column): HTMLTableColElement {
  return el('col', `col-${column.key}`)
}

function buildTable(): {
  wrapper: HTMLDivElement
  tbody: HTMLTableSectionElement
} {
  const colgroup = el('colgroup')
  colgroup.append(...COLUMNS.map(colElement))

  const headRow = el('tr')
  headRow.append(...COLUMNS.map(headerCell))
  const thead = el('thead')
  thead.append(headRow)

  const tbody = el('tbody')

  const table = el('table', 'scenario-table')
  table.append(colgroup, thead, tbody)

  const wrapper = el('div', 'table-scroll')
  wrapper.append(table)

  return { wrapper, tbody }
}

function toggleRow(
  button: HTMLButtonElement,
  detailRow: HTMLTableRowElement,
): void {
  const expanded = button.getAttribute('aria-expanded') === 'true'
  button.setAttribute('aria-expanded', String(!expanded))
  detailRow.hidden = expanded
}

function buildRow(scenario: Scenario): RowBuild {
  const { id, title, taxonomy, expected } = scenario.meta

  const idCell = el('th', 'col-id', String(id).padStart(2, '0'))
  idCell.scope = 'row'

  const button = el('button', 'disclosure', title)
  button.type = 'button'
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-controls', `panel-${id}`)
  button.dataset.scenarioId = String(id)
  const titleCell = el('td', 'col-title')
  titleCell.append(button)

  const taxonomyCell = el('td', 'col-taxonomy')
  taxonomyCell.append(taxonomyChip(taxonomy))

  const expectedCell = el('td', 'col-expected')
  expectedCell.append(el('code', '', expected))

  const verdictCell = el('td', 'col-verdict')
  const timeCell = el('td', 'col-time')

  const mainRow = el('tr', 'scenario-row')
  mainRow.append(
    idCell,
    titleCell,
    taxonomyCell,
    expectedCell,
    verdictCell,
    timeCell,
  )

  const panel = el('div', 'trace-panel')
  panel.id = `panel-${id}`
  panel.dataset.panelId = String(id)
  const detailCell = el('td', 'col-detail')
  detailCell.colSpan = COLUMN_COUNT
  detailCell.append(panel)

  const detailRow = el('tr', 'detail-row')
  detailRow.id = `detail-${id}`
  detailRow.hidden = true
  detailRow.append(detailCell)

  let traceRendered = false
  function ensureTraceRendered(): void {
    if (traceRendered) return
    traceRendered = true
    panel.append(renderTrace(scenario.run()))
  }

  button.addEventListener('click', () => {
    ensureTraceRendered()
    toggleRow(button, detailRow)
  })

  function setState(state: RowState): void {
    mainRow.dataset.status = state.status
    detailRow.dataset.status = state.status
    verdictCell.replaceChildren(verdictContent(state, expected))
    timeCell.textContent = timeCellText(state)
  }
  setState({ status: 'pending' })

  return { mainRow, detailRow, handle: { setState } }
}

function progressText(done: number, total: number, running: boolean): string {
  if (running) return `running · ${done} / ${total} complete`
  return `${done} / ${total} complete`
}

function buildRunBar(total: number): RunBarHandle {
  const button = el('button', 'run-all', 'Run all')
  button.type = 'button'

  const status = el('p', 'progress', progressText(0, total, false))
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')

  const bar = el('div', 'run-bar')
  bar.append(button, status)

  let runAllCallback: () => void = () => {}
  button.addEventListener('click', () => runAllCallback())

  return {
    element: bar,
    setProgress(done, running) {
      status.textContent = progressText(done, total, running)
      bar.setAttribute('aria-busy', String(running))
    },
    onRunAll(callback) {
      runAllCallback = callback
    },
  }
}

function runScenarioAt(index: number, handles: RowHandle[]): void {
  const scenario = scenarios[index]
  const start = performance.now()
  try {
    const trace = scenario.run()
    handles[index].setState({
      status: 'done',
      trace,
      elapsedMs: performance.now() - start,
    })
  } catch (err) {
    handles[index].setState({
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: performance.now() - start,
    })
  }
}

function runStep(index: number, context: SweepContext): void {
  if (context.generation !== sweepGeneration) return
  const { handles, runBar } = context
  if (index >= handles.length) {
    runBar.setProgress(handles.length, false)
    return
  }
  handles[index].setState({ status: 'running' })
  requestAnimationFrame(() => runFrame(index, context))
}

function runFrame(index: number, context: SweepContext): void {
  if (context.generation !== sweepGeneration) return
  runScenarioAt(index, context.handles)
  context.runBar.setProgress(index + 1, true)
  requestAnimationFrame(() => runStep(index + 1, context))
}

function startSweep(handles: RowHandle[], runBar: RunBarHandle): void {
  sweepGeneration += 1
  const context: SweepContext = { handles, runBar, generation: sweepGeneration }
  for (const handle of handles) handle.setState({ status: 'pending' })
  runBar.setProgress(0, true)
  runStep(0, context)
}

export function mount(root: HTMLElement): void {
  root.replaceChildren()

  const header = buildHeader()
  const legend = buildLegend()
  const runBar = buildRunBar(scenarios.length)
  const { wrapper: tableWrapper, tbody } = buildTable()

  const rows = scenarios.map(buildRow)
  tbody.append(...rows.flatMap((row) => [row.mainRow, row.detailRow]))
  const handles = rows.map((row) => row.handle)

  runBar.onRunAll(() => startSweep(handles, runBar))

  const toolbar = el('div', 'toolbar')
  toolbar.append(runBar.element, legend)

  const layout = el('main')
  layout.append(toolbar, tableWrapper)

  root.append(header, layout)

  // double rAF: the pending table must paint once before the first scenario blocks the main thread
  requestAnimationFrame(() =>
    requestAnimationFrame(() => startSweep(handles, runBar)),
  )
}
