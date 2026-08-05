'use client'

import { useStoreSelector } from 'services/external-store'
import { regimeAt } from '../decor'
import Catalog from './catalog'
import css from './editor.module.css'
import { historyStore, redo, undo } from './history'
import Inspector from './inspector'
import Outliner from './outliner'
import Ruler from './ruler'
import {
  getNode,
  keysStore,
  type SaveState,
  save,
  saveStore,
  selectionStore,
  stageSizeStore,
  type Tab,
  tabStore,
} from './store'

const TABS: { id: Tab; label: string }[] = [
  { id: 'inspect', label: 'INSPECT' },
  { id: 'scene', label: 'SCENE' },
  { id: 'add', label: 'ADD' },
]

const STATUS_TEXT: Partial<Record<SaveState, string>> = {
  saving: 'writing decor.json…',
  saved: 'decor.json saved',
  error: 'save failed',
  prod: 'read-only build · json copied',
}

function Header() {
  const saveState = useStoreSelector(saveStore, (value) => value)
  const history = useStoreSelector(historyStore, (value) => value)
  const message = saveState.message ?? STATUS_TEXT[saveState.state]
  return (
    <>
      <div className={css.header}>
        <span
          className={css.stateDot}
          data-state={saveState.state}
          aria-hidden
        />
        <span className={css.brand}>
          {'bazaar//editor'} <small>r6</small>
        </span>
        <button
          type='button'
          disabled={history.past.length === 0}
          aria-label='undo'
          onClick={undo}
        >
          ↶
        </button>
        <button
          type='button'
          disabled={history.future.length === 0}
          aria-label='redo'
          onClick={redo}
        >
          ↷
        </button>
        <button
          type='button'
          className={css.saveBtn}
          data-dirty={saveState.state === 'dirty' || undefined}
          disabled={saveState.state === 'saving'}
          onClick={() => save()}
        >
          SAVE
        </button>
      </div>
      {message && <div className={css.statusLine}>{message}</div>}
    </>
  )
}

function Tabs() {
  const tab = useStoreSelector(tabStore, (value) => value)
  return (
    <div className={css.tabs} role='tablist'>
      {TABS.map((entry) => (
        <button
          key={entry.id}
          type='button'
          role='tab'
          aria-selected={tab === entry.id}
          className={css.tab}
          data-on={tab === entry.id || undefined}
          onClick={() => tabStore.set(entry.id)}
        >
          {entry.label}
        </button>
      ))}
    </div>
  )
}

const selectionLabel = (
  selection: ReturnType<typeof selectionStore.get>,
): string => {
  if (!selection) return 'nothing selected'
  if (selection.kind === 'chrome') return selection.id
  const node = getNode(selection.id)
  return node ? `${node.id} ${node.ref}` : selection.id
}

function Footer() {
  const size = useStoreSelector(stageSizeStore, (value) => value)
  const selection = useStoreSelector(selectionStore, (value) => value)
  const keys = useStoreSelector(keysStore, (value) => value)
  return (
    <div className={css.footer}>
      <span>
        {regimeAt(size.w).toUpperCase()} {size.w}px
      </span>
      <span className={css.footerSel}>{selectionLabel(selection)}</span>
      <button
        type='button'
        className={css.keysBtn}
        aria-pressed={keys}
        onClick={() => keysStore.set(!keys)}
      >
        ? keys
      </button>
    </div>
  )
}

function KeysPanel() {
  const open = useStoreSelector(keysStore, (value) => value)
  if (!open) return null
  return (
    <div className={css.keysPanel} data-editor-ui=''>
      <b>drag</b> move · <b>corners</b> resize · <b>edges</b> stretch
      <br />
      <b>arrows</b> nudge · <b>⇧</b> ×10 · <b>⌥</b> ×0.1
      <br />
      <b>⌘Z</b> undo · <b>⇧⌘Z</b> redo · <b>⌘S</b> save
      <br />
      <b>⌘D</b> duplicate · <b>⌫</b> delete
      <br />
      <b>F</b> flip · <b>H</b> hide in regime · <b>[ ]</b> z-order
      <br />
      <b>esc</b> deselect / cancel pick
    </div>
  )
}

const TAB_VIEW: Record<Tab, React.ReactNode> = {
  inspect: <Inspector />,
  scene: <Outliner />,
  add: <Catalog />,
}

export default function Dock() {
  const tab = useStoreSelector(tabStore, (value) => value)
  return (
    <>
      <div className={css.dock} data-editor-ui=''>
        <Header />
        <Ruler />
        <Tabs />
        <div className={css.body}>{TAB_VIEW[tab]}</div>
        <Footer />
      </div>
      <KeysPanel />
    </>
  )
}
